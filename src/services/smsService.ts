import axios, { AxiosResponse } from 'axios';
import { config } from '../config';

export interface SMSMessage {
  numbers: string[];
  message: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private token: string;
  private endpoint: string;
  private defaultNumbers: string[];

  constructor() {
    this.token = config.sms.token;
    this.endpoint = config.sms.endpoint;
    this.defaultNumbers = config.sms.numbers;
    
    if (!this.token || this.token === 'seu_token_sms') {
      console.warn('⚠️ SIMPLE_SMS_TOKEN não configurada - SMS desabilitado');
    }
    
    if (this.defaultNumbers.length === 0 || this.defaultNumbers.includes('926111111')) {
      console.warn('⚠️ Nenhum número de SMS configurado');
    }
  }

  /**
   * Envia SMS usando a API do Simple SMS Angola
   */
  async sendSMS(message: string, numbers?: string[]): Promise<SMSResponse> {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'SIMPLE_SMS_TOKEN não configurada'
        };
      }

      const targetNumbers = numbers || this.defaultNumbers;
      
      if (targetNumbers.length === 0) {
        return {
          success: false,
          error: 'Nenhum número de destino especificado'
        };
      }

      const payload: SMSMessage = {
        numbers: targetNumbers,
        message: message.substring(0, 160) // Limita a 160 caracteres para SMS
      };

      const response: AxiosResponse = await axios.post(
        this.endpoint,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );

      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          messageId: response.data?.messageId || response.data?.id || 'unknown'
        };
      } else {
        return {
          success: false,
          error: `Erro HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      console.error('Erro ao enviar SMS:', error);
      
      if (error.response) {
        // Erro da API
        return {
          success: false,
          error: `Erro da API: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`
        };
      } else if (error.request) {
        // Erro de rede
        return {
          success: false,
          error: 'Erro de conexão com a API do SMS'
        };
      } else {
        // Outros erros
        return {
          success: false,
          error: error.message || 'Erro desconhecido ao enviar SMS'
        };
      }
    }
  }

  /**
   * Envia notificação de email importante
   */
  async sendEmailAlert(from: string, subject: string, summary: string): Promise<SMSResponse> {
    const message = `📧 EMAIL IMPORTANTE\nDe: ${from}\nAssunto: ${subject}\nResumo: ${summary}`;
    return this.sendSMS(message);
  }

  /**
   * Envia SMS de teste
   */
  async sendTestSMS(): Promise<SMSResponse> {
    const message = '🧪 Teste do Email Alert Service - Sistema funcionando corretamente!';
    return this.sendSMS(message);
  }

  /**
   * Valida se o serviço está configurado corretamente
   */
  isConfigured(): boolean {
    return !!(this.token && this.endpoint && this.defaultNumbers.length > 0);
  }

  /**
   * Retorna os números configurados
   */
  getConfiguredNumbers(): string[] {
    return [...this.defaultNumbers];
  }

  /**
   * Adiciona um novo número à lista padrão
   */
  addNumber(number: string): void {
    if (!this.defaultNumbers.includes(number)) {
      this.defaultNumbers.push(number);
    }
  }

  /**
   * Remove um número da lista padrão
   */
  removeNumber(number: string): void {
    const index = this.defaultNumbers.indexOf(number);
    if (index > -1) {
      this.defaultNumbers.splice(index, 1);
    }
  }
}

export default SMSService;