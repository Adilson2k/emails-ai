import { Response } from 'express';
import { UserSettings, IUserSettings } from '../models/userSettings';
import { handleResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types/express';
import { emailListenerRegistry } from '../services/registry';

export const settingsController = {
  /**
   * Obtém as configurações do usuário autenticado
   */
  async getMySettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      const settings = await UserSettings.findOne({ userId });
      
      if (!settings) {
        return handleResponse(res, 404, {
          message: 'Configurações não encontradas. Por favor, configure suas credenciais IMAP e SMS primeiro.',
          setup_required: true
        });
      }

      return handleResponse(res, 200, { settings });
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return handleResponse(res, 500, { message: 'Erro interno ao buscar configurações' });
    }
  },

  /**
   * Salva ou atualiza as configurações do usuário
   */
  async saveSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        imapEmail,
        imapPassword,
        imapHost,
        imapPort,
        useGmailOAuth,
        smsPhone,
        smsToken
      } = req.body;

      // Validações básicas
      if (!imapEmail || !imapPassword || !imapHost || !imapPort) {
        return handleResponse(res, 400, {
          message: 'Campos obrigatórios: imapEmail, imapPassword, imapHost, imapPort'
        });
      }

      // Atualiza ou cria novas configurações
      const settings = await UserSettings.findOneAndUpdate(
        { userId },
        {
          userId,
          imapEmail,
          imapPassword,
          imapHost,
          imapPort,
          useGmailOAuth,
          smsPhone,
          smsToken
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );

      // Auto-start listener após salvar as configurações
      if (userId) {
        try {
          await emailListenerRegistry.startForUser(userId);
        } catch (e) {
          console.warn('Falha ao iniciar listener automaticamente para o usuário:', e);
        }
      }

      return handleResponse(res, 200, {
        message: 'Configurações salvas com sucesso',
        settings
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return handleResponse(res, 500, { message: 'Erro interno ao salvar configurações' });
    }
  }
};
