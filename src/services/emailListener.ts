import { ImapFlow } from 'imapflow';
import { config } from '../config';
import { EmailProcessor, ProcessedEmail } from './emailProcessor';

export interface EmailListenerConfig {
  mailbox: string;
  checkInterval: number; // em milissegundos
  maxRetries: number;
}

export class EmailListener {
  private client: ImapFlow;
  private processor: EmailProcessor;
  private config: EmailListenerConfig;
  private isRunning: boolean = false;
  private retryCount: number = 0;
  private checkInterval?: NodeJS.Timeout;

  constructor(listenerConfig: EmailListenerConfig = {
    mailbox: 'INBOX',
    checkInterval: 30000, // 30 segundos
    maxRetries: 3
  }) {
    this.config = listenerConfig;
    this.processor = new EmailProcessor();
    
    if (!config.email.user || !config.email.pass || 
        config.email.user === 'seuemail@gmail.com' || 
        config.email.pass === 'sua_senha_app') {
      console.warn('⚠️ Credenciais de email não configuradas - IMAP desabilitado');
      this.client = null as any;
    } else {
      this.client = new ImapFlow({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        logger: false // Desabilita logs verbosos do IMAP
      });
    }
  }

  /**
   * Inicia o listener de emails
   */
  async start(): Promise<void> {
    try {
      console.log('🔄 Iniciando listener de emails...');
      
      if (!this.client) {
        console.warn('⚠️ IMAP não configurado - listener não iniciado');
        return;
      }
      
      // Conecta ao servidor IMAP
      await this.client.connect();
      console.log('✅ Conectado ao servidor IMAP');

      // Seleciona a caixa de entrada
      const lock = await this.client.getMailboxLock(this.config.mailbox);
      console.log(`📁 Caixa de entrada selecionada: ${this.config.mailbox}`);

      this.isRunning = true;
      this.retryCount = 0;

      // Inicia verificação periódica
      this.startPeriodicCheck();

      // Escuta novos emails em tempo real (comentado temporariamente devido a problemas de tipos)
      // this.client.on('mailboxExists', async (update: any) => {
      //   if (update.path === this.config.mailbox) {
      //     await this.checkForNewEmails();
      //   }
      // });

      console.log('🎯 Listener de emails iniciado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao iniciar listener de emails:', error);
      await this.handleConnectionError();
    }
  }

  /**
   * Para o listener de emails
   */
  async stop(): Promise<void> {
    try {
      console.log('🛑 Parando listener de emails...');
      
      this.isRunning = false;
      
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }

      if (this.client && this.client.authenticated) {
        await this.client.logout();
      }
      
      console.log('✅ Listener de emails parado');
    } catch (error) {
      console.error('❌ Erro ao parar listener de emails:', error);
    }
  }

  /**
   * Inicia verificação periódica de novos emails
   */
  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.checkForNewEmails();
      }
    }, this.config.checkInterval);
  }

  /**
   * Verifica novos emails na caixa de entrada
   */
  private async checkForNewEmails(): Promise<void> {
    try {
      if (!this.client) {
        return;
      }
      
      if (!this.client.authenticated) {
        await this.reconnect();
        return;
      }

      // Busca emails não lidos
      const messages = await this.client.search({
        seen: false,
        since: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
      });

      if (!messages || messages.length === 0) {
        return;
      }

      console.log(`📬 ${messages.length} novo(s) email(s) encontrado(s)`);

      // Processa cada email
      for (const messageId of messages) {
        await this.processEmailById(messageId);
      }

      this.retryCount = 0; // Reset contador de tentativas
    } catch (error) {
      console.error('❌ Erro ao verificar novos emails:', error);
      await this.handleConnectionError();
    }
  }

  /**
   * Processa um email específico por ID
   */
  private async processEmailById(messageId: number): Promise<void> {
    try {
      // Busca o email completo
      const message = await this.client.download(messageId.toString());
      
      if (!message) {
        console.warn(`⚠️ Email ${messageId} não encontrado`);
        return;
      }

      // Converte o stream para Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of message.content) {
        chunks.push(Buffer.from(chunk));
      }
      const emailBuffer = Buffer.concat(chunks);

      // Processa o email
      const processedEmail = await this.processor.processEmail(
        emailBuffer,
        messageId.toString()
      );

      // Marca como lido
      await this.client.messageFlagsAdd(messageId, ['\\Seen'], { uid: true });

      // Log do processamento
      console.log(this.processor.createEmailSummary(processedEmail));

    } catch (error) {
      console.error(`❌ Erro ao processar email ${messageId}:`, error);
    }
  }

  /**
   * Reconecta ao servidor IMAP
   */
  private async reconnect(): Promise<void> {
    try {
      console.log('🔄 Tentando reconectar ao servidor IMAP...');
      
      if (!this.client) {
        console.warn('⚠️ IMAP não configurado - reconexão cancelada');
        return;
      }
      
      if (this.client.authenticated) {
        await this.client.logout();
      }

      await this.client.connect();
      console.log('✅ Reconectado ao servidor IMAP');
      
      this.retryCount = 0;
    } catch (error) {
      console.error('❌ Erro ao reconectar:', error);
      await this.handleConnectionError();
    }
  }

  /**
   * Trata erros de conexão
   */
  private async handleConnectionError(): Promise<void> {
    this.retryCount++;
    
    if (this.retryCount >= this.config.maxRetries) {
      console.error('❌ Máximo de tentativas de reconexão atingido. Parando listener.');
      this.isRunning = false;
      return;
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Backoff exponencial
    console.log(`⏳ Tentativa ${this.retryCount}/${this.config.maxRetries} em ${retryDelay}ms`);
    
    setTimeout(async () => {
      if (this.isRunning) {
        await this.reconnect();
      }
    }, retryDelay);
  }

  /**
   * Testa a conexão IMAP
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      // Cria uma nova instância para teste
      const testClient = new ImapFlow({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        logger: false
      });
      
      await testClient.connect();
      await testClient.logout();
      return true;
    } catch (error) {
      console.error('❌ Teste de conexão IMAP falhou:', error);
      return false;
    }
  }

  /**
   * Retorna o status do listener
   */
  getStatus(): { running: boolean; connected: boolean; retryCount: number } {
    return {
      running: this.isRunning,
      connected: this.client ? Boolean(this.client.authenticated) : false,
      retryCount: this.retryCount
    };
  }

  /**
   * Retorna estatísticas básicas
   */
  async getStats(): Promise<{ totalMessages: number; unreadMessages: number }> {
    try {
      if (!this.client || !this.client.authenticated) {
        return { totalMessages: 0, unreadMessages: 0 };
      }

      const lock = await this.client.getMailboxLock(this.config.mailbox);
      const status = await this.client.status(this.config.mailbox, { messages: true, unseen: true });
      
      return {
        totalMessages: status.messages || 0,
        unreadMessages: status.unseen || 0
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { totalMessages: 0, unreadMessages: 0 };
    }
  }
}

export default EmailListener;