import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { connectToDatabase, getDatabaseConnectionState } from './config/database';
import { EmailListener } from './services/emailListener';
import { EmailProcessor } from './services/emailProcessor';
import { SMSService } from './services/smsService';
import { GeminiService } from './services/aiService';
import { DatabaseService } from './services/databaseService';
import authRoutes from './routes/auth';
import settingsRoutes from './routes/settings';
import { AuthenticatedRequest } from './types/express';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';


class EmailAlertService {
  private app: Application;
  private emailListener: EmailListener;
  private processor: EmailProcessor;
  private smsService: SMSService;
  private geminiService: GeminiService;
  private databaseService: DatabaseService;

  constructor() {
    this.app = express();
    this.emailListener = new EmailListener();
    this.processor = new EmailProcessor();
    this.smsService = new SMSService();
    this.geminiService = new GeminiService();
    this.databaseService = new DatabaseService();
    
    this.setupMiddlewares();
    this.setupRoutes();
  }

  /**
   * Configura os middlewares da aplicação
   */
  private setupMiddlewares(): void {
// Middlewares de segurança e utilitários
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('dev'));
  }

  /**
   * Configura as rotas da API
   */
  private setupRoutes(): void {
    // ✅ Rota base (root)
  this.app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'API online ✅',
      message: 'Serviço de leitura de emails e envios de SMS ativo',
      endpoints: {
        health: '/health',
        status: '/status',
        docs: '/docs',
      },
    });
  });
    // Rotas de autenticação
    this.app.use(authRoutes);
    
    // Rotas de configurações
    this.app.use('/settings', settingsRoutes);

    // Swagger UI - documentação
    try {
      const swaggerPath = path.resolve(__dirname, 'swagger.json');
      if (fs.existsSync(swaggerPath)) {
        const swaggerSpec = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
        this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
        this.app.get('/docs.json', (_req: Request, res: Response) => res.json(swaggerSpec));
      }
    } catch (err) {
      console.warn('Swagger não pôde ser carregado:', err);
    }

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        services: this.emailListener.getStatus()
      });
    });

    // Status dos serviços
    this.app.get('/status', async (req: Request, res: Response) => {
      try {
        const [imapTest, geminiTest] = await Promise.all([
          this.emailListener.testConnection(),
          this.geminiService.testConnection()
        ]);

        const smsConfigured = await this.smsService.isConfigured();
        const smsNumbers = await this.smsService.getConfiguredNumbers();

        res.json({
          imap: {
            connected: imapTest,
            configured: !!(config.email.user && config.email.pass)
          },
          gemini: {
            connected: geminiTest,
            configured: !!config.gemini.apiKey
          },
          sms: {
            configured: smsConfigured,
            numbers: smsNumbers
          },
          database: {
            connected: getDatabaseConnectionState() === 'Conectado',
            state: getDatabaseConnectionState()
          },
          listener: this.emailListener.getStatus()
        });
      } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar status dos serviços' });
      }
    });

    // Estatísticas da caixa de email
    this.app.get('/stats', async (req: Request, res: Response) => {
      try {
        const stats = await this.emailListener.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
      }
    });

    // Teste de SMS
    this.app.post('/test-sms', async (req: Request, res: Response) => {
      try {
        const result = await this.smsService.sendTestSMS();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar SMS de teste' });
      }
    });

    // Controle do listener
    this.app.post('/listener/start', async (req: Request, res: Response) => {
      try {
        await this.emailListener.start();
        res.json({ message: 'Listener iniciado com sucesso' });
      } catch (error) {
        res.status(500).json({ error: 'Erro ao iniciar listener' });
      }
    });

    this.app.post('/listener/stop', async (req: Request, res: Response) => {
      try {
        await this.emailListener.stop();
        res.json({ message: 'Listener parado com sucesso' });
      } catch (error) {
        res.status(500).json({ error: 'Erro ao parar listener' });
      }
    });

    // Rota para processar email manualmente (para testes)
    this.app.post('/process-email', async (req: Request, res: Response) => {
      try {
        const { subject, content, from } = req.body;
        
        if (!subject || !content || !from) {
          return res.status(400).json({ error: 'Campos obrigatórios: subject, content, from' });
        }

        const analysis = await this.geminiService.analyzeEmail(subject, content, from);
        
        let smsResult = null;
        if (analysis.importance === 'alta') {
          smsResult = await this.smsService.sendEmailAlert(from, subject, analysis.summary);
        }

        return res.json({
          analysis,
          smsSent: smsResult?.success || false,
          smsError: smsResult?.error || null
        });
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao processar email' });
      }
    });

    // Endpoints do banco de dados
    this.app.get('/emails', async (req: Request, res: Response) => {
      try {
        const { importance, from, limit = '50', offset = '0' } = req.query;
        
        const emails = await this.databaseService.getProcessedEmails({
          importance: importance as string,
          from: from as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        });

        res.json(emails);
      } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar emails' });
      }
    });

    this.app.get('/emails/stats', async (req: Request, res: Response) => {
      try {
        const { days = '7' } = req.query;
        const stats = await this.databaseService.getEmailStats(parseInt(days as string));
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
      }
    });

    this.app.get('/emails/general-stats', async (req: Request, res: Response) => {
      try {
        const stats = await this.databaseService.getGeneralStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas gerais' });
      }
    });

// Handler para rotas inexistentes
    this.app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

// Handler de erros
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const message = err.message || 'Erro interno do servidor';
  res.status(500).json({ success: false, error: message });
});
  }

  /**
   * Inicia o serviço
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Iniciando Email Alert Service...');
      
      // Conecta ao banco de dados
      await connectToDatabase();
      console.log(`📊 MongoDB: ${getDatabaseConnectionState()}`);
      
      // Verifica configurações
      this.validateConfiguration();
      
      // Testa serviços
      await this.testServices();
      
      // Inicia o servidor HTTP
      this.app.listen(config.port, () => {
        console.log(`🌐 Servidor rodando na porta ${config.port}`);
        console.log(`📊 Health check: http://localhost:${config.port}/health`);
        console.log(`📈 Status: http://localhost:${config.port}/status`);
      });
      
      // Inicia o listener de emails
      await this.emailListener.start();
      
      console.log('✅ Email Alert Service iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar serviço:', error);
      process.exit(1);
    }
  }

  /**
   * Para o serviço
   */
  async stop(): Promise<void> {
    try {
      console.log('🛑 Parando Email Alert Service...');
      await this.emailListener.stop();
      console.log('✅ Serviço parado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao parar serviço:', error);
    }
  }

  /**
   * Valida as configurações necessárias
   */
  private validateConfiguration(): void {
    const required = [
      { key: 'EMAIL_USER', value: config.email.user },
      { key: 'EMAIL_PASS', value: config.email.pass }
    ];

    const optional = [
      { key: 'GEMINI_API_KEY', value: config.gemini.apiKey },
      { key: 'SIMPLE_SMS_TOKEN', value: config.sms.token }
    ];

    const missing = required.filter(item => 
      !item.value || 
      item.value === 'seuemail@gmail.com' || 
      item.value === 'sua_senha_app'
    );
    
    const missingOptional = optional.filter(item => 
      !item.value || 
      item.value === 'sua_chave_api' || 
      item.value === 'seu_token_sms'
    );
    
    if (missing.length > 0) {
      console.error('❌ Configurações obrigatórias não encontradas:');
      missing.forEach(item => console.error(`   - ${item.key}`));
      throw new Error('Configurações obrigatórias não encontradas');
    }

    if (missingOptional.length > 0) {
      console.warn('⚠️ Configurações opcionais não encontradas:');
      missingOptional.forEach(item => console.warn(`   - ${item.key}`));
    }
  }

  /**
   * Testa todos os serviços
   */
  private async testServices(): Promise<void> {
    console.log('🧪 Testando serviços...');
    
    const [imapTest, geminiTest] = await Promise.all([
      this.emailListener.testConnection(),
      this.geminiService.testConnection()
    ]);

    console.log(`📧 IMAP: ${imapTest ? '✅' : '❌'}`);
    console.log(`🤖 Gemini: ${geminiTest ? '✅' : '❌'}`);
  const smsOk = await this.smsService.isConfigured();
  console.log(`📱 SMS: ${smsOk ? '✅' : '❌'}`);

    // Permite iniciar mesmo se alguns serviços falharem
    if (!imapTest && !geminiTest) {
      console.warn('⚠️ Todos os serviços principais falharam - iniciando em modo limitado');
    } else {
      console.log('✅ Serviços testados com sucesso');
    }
  }
}

// Inicialização do serviço
const service = new EmailAlertService();

// Tratamento de sinais para parada graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, parando serviço...');
  await service.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, parando serviço...');
  await service.stop();
  process.exit(0);
});

// Inicia o serviço
service.start().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

export default EmailAlertService;