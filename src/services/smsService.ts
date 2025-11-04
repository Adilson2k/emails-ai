import axios, { AxiosResponse } from 'axios';
import { UserSettings } from '../models/userSettings';
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
  private userId?: string;
  private endpoint: string;

  constructor(userId?: string) {
    this.userId = userId;
    this.endpoint = config.sms.endpoint;
  }

  private async getUserSettings() {
    if (!this.userId) return null;
    return await UserSettings.findOne({ userId: this.userId });
  }

  private async resolveTokenAndNumbers(): Promise<{ token?: string; numbers: string[] }> {
    const settings = await this.getUserSettings();
    if (settings && settings.smsToken) {
      const numbers = settings.smsPhone ? [settings.smsPhone] : [];
      const decryptedToken = (settings as any).getDecryptedToken();
      return { token: decryptedToken, numbers };
    }

    // Fallback para config
    return { token: config.sms.token || undefined, numbers: config.sms.numbers || [] };
  }

  async sendSMS(message: string, numbers?: string[]): Promise<SMSResponse> {
    try {
      const { token, numbers: defaultNumbers } = await this.resolveTokenAndNumbers();

      const targetNumbers = numbers && numbers.length ? numbers : defaultNumbers;

      if (!token) {
        return { success: false, error: 'Token de SMS não configurado' };
      }

      if (!targetNumbers || targetNumbers.length === 0) {
        return { success: false, error: 'Nenhum número de destino configurado' };
      }

      const payload: SMSMessage = {
        numbers: targetNumbers,
        message: message.substring(0, 160)
      };

      const response: AxiosResponse = await axios.post(
        this.endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.status === 200 || response.status === 201) {
        return { success: true, messageId: response.data?.messageId || response.data?.id || 'unknown' };
      }

      return { success: false, error: `Erro HTTP ${response.status}: ${response.statusText}` };
    } catch (error: any) {
      console.error('Erro ao enviar SMS:', error);
      if (error.response) {
        return { success: false, error: `Erro da API: ${error.response.status} - ${error.response.data?.message || error.response.statusText}` };
      }
      if (error.request) {
        return { success: false, error: 'Erro de conexão com a API do SMS' };
      }
      return { success: false, error: error.message || 'Erro desconhecido ao enviar SMS' };
    }
  }

  async sendEmailAlert(from: string, subject: string, summary: string): Promise<SMSResponse> {
    const message = `📧 EMAIL IMPORTANTE\nDe: ${from}\nAssunto: ${subject}\nResumo: ${summary}`;
    return this.sendSMS(message);
  }

  async sendTestSMS(): Promise<SMSResponse> {
    const message = '🧪 Teste do Email Alert Service - Sistema funcionando corretamente!';
    return this.sendSMS(message);
  }

  async isConfigured(): Promise<boolean> {
    const { token, numbers } = await this.resolveTokenAndNumbers();
    return !!(token && numbers && numbers.length > 0);
  }

  async getConfiguredNumbers(): Promise<string[]> {
    const { numbers } = await this.resolveTokenAndNumbers();
    return numbers;
  }
}

export default SMSService;