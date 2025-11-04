import { simpleParser, ParsedMail } from 'mailparser';
import { GeminiService, EmailAnalysis } from './aiService';
import { SMSService } from './smsService';
import { DatabaseService } from './databaseService';

export interface ProcessedEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  content: string;
  analysis: EmailAnalysis;
  smsSent: boolean;
  processedAt: Date;
}

export class EmailProcessor {
  private geminiService: GeminiService;
  private databaseService: DatabaseService;

  constructor() {
    this.geminiService = new GeminiService();
    this.databaseService = new DatabaseService();
  }

  /**
   * Processa um email completo
   */
  async processEmail(emailBuffer: Buffer, emailId: string, userId: string): Promise<ProcessedEmail> {
    try {
      // Parseia o email
      const parsedEmail = await this.parseEmail(emailBuffer);
      
      // Analisa com IA
      const analysis = await this.geminiService.analyzeEmail(
        parsedEmail.subject || 'Sem assunto',
        this.extractTextContent(parsedEmail),
        this.extractFromAddress(parsedEmail)
      );

      // Envia SMS se for importante
      let smsSent = false;
      if (analysis.importance === 'alta') {
        const smsService = new SMSService(userId);
        const smsResult = await smsService.sendEmailAlert(
          this.extractFromAddress(parsedEmail),
          parsedEmail.subject || 'Sem assunto',
          analysis.summary
        );
        smsSent = smsResult.success;
        
        if (!smsResult.success) {
          console.error('Falha ao enviar SMS:', smsResult.error);
        }
      }

      const processedEmail = {
        id: emailId,
        from: this.extractFromAddress(parsedEmail),
        to: this.extractToAddress(parsedEmail),
        subject: parsedEmail.subject || 'Sem assunto',
        date: parsedEmail.date || new Date(),
        content: this.extractTextContent(parsedEmail),
        analysis,
        smsSent,
        processedAt: new Date()
      };

      // Salva no banco de dados
      try {
        await this.databaseService.saveProcessedEmail({
          userId,
          messageId: emailId,
          from: processedEmail.from,
          to: processedEmail.to,
          subject: processedEmail.subject,
          date: processedEmail.date,
          content: processedEmail.content,
          analysis,
          smsSent
        });
      } catch (dbError) {
        console.warn('⚠️ Erro ao salvar no banco de dados:', dbError);
        // Continua o processamento mesmo se falhar ao salvar no BD
      }

      return processedEmail;
    } catch (error) {
      console.error('Erro ao processar email:', error);
      throw error;
    }
  }

  /**
   * Parseia o buffer do email usando mailparser
   */
  private async parseEmail(emailBuffer: Buffer): Promise<ParsedMail> {
    try {
      return await simpleParser(emailBuffer);
    } catch (error) {
      console.error('Erro ao parsear email:', error);
      throw new Error('Falha ao interpretar o email');
    }
  }

  /**
   * Extrai o conteúdo de texto do email parseado
   */
  private extractTextContent(parsedEmail: ParsedMail): string {
    let content = '';

    // Prioriza o texto simples
    if (parsedEmail.text) {
      content = parsedEmail.text;
    } else if (parsedEmail.html) {
      // Remove tags HTML se não houver texto simples
      content = parsedEmail.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Limita o tamanho para análise da IA
    return content.substring(0, 2000);
  }

  /**
   * Extrai o endereço do remetente
   */
  private extractFromAddress(parsedEmail: ParsedMail): string {
    if (!parsedEmail.from) {
      return 'Remetente desconhecido';
    }

    if (Array.isArray(parsedEmail.from)) {
      const firstFrom = parsedEmail.from[0];
      if (firstFrom) {
        return firstFrom.text || firstFrom.value?.[0]?.address || 'Remetente desconhecido';
      }
      return 'Remetente desconhecido';
    }

    return parsedEmail.from.text || parsedEmail.from.value?.[0]?.address || 'Remetente desconhecido';
  }

  /**
   * Extrai o endereço do destinatário
   */
  private extractToAddress(parsedEmail: ParsedMail): string {
    if (!parsedEmail.to) {
      return 'Destinatário desconhecido';
    }

    if (Array.isArray(parsedEmail.to)) {
      const firstTo = parsedEmail.to[0];
      if (firstTo) {
        return firstTo.text || firstTo.value?.[0]?.address || 'Destinatário desconhecido';
      }
      return 'Destinatário desconhecido';
    }

    return parsedEmail.to.text || parsedEmail.to.value?.[0]?.address || 'Destinatário desconhecido';
  }

  /**
   * Verifica se um email deve ser processado
   */
  shouldProcessEmail(from: string, subject: string): boolean {
    // Filtros básicos para evitar spam ou emails desnecessários
    const spamKeywords = ['noreply', 'no-reply', 'donotreply', 'automated'];
    const fromLower = from.toLowerCase();
    
    // Ignora emails de sistemas automáticos (exceto se forem importantes)
    if (spamKeywords.some(keyword => fromLower.includes(keyword))) {
      return false;
    }

    // Ignora emails muito pequenos (provavelmente spam)
    if (subject.length < 3) {
      return false;
    }

    return true;
  }

  /**
   * Cria um resumo do email processado para logs
   */
  createEmailSummary(processedEmail: ProcessedEmail): string {
    return `
📧 EMAIL PROCESSADO
ID: ${processedEmail.id}
De: ${processedEmail.from}
Assunto: ${processedEmail.subject}
Data: ${processedEmail.date.toISOString()}
Importância: ${processedEmail.analysis.importance.toUpperCase()}
Confiança: ${processedEmail.analysis.confidence}%
SMS Enviado: ${processedEmail.smsSent ? '✅' : '❌'}
Resumo: ${processedEmail.analysis.summary}
Palavras-chave: ${processedEmail.analysis.keywords.join(', ')}
    `.trim();
  }

  /**
   * Testa os serviços dependentes
   */
  async testServices(userId?: string): Promise<{ gemini: boolean; sms: boolean }> {
    const geminiTest = await this.geminiService.testConnection();
    const smsService = userId ? new SMSService(userId) : null;
    const smsTest = smsService ? await smsService.isConfigured() : false;
    
    return {
      gemini: geminiTest,
      sms: smsTest
    };
  }
}

export default EmailProcessor;
