import { ProcessedEmail, UserConfig, EmailStats, IProcessedEmail, IUserConfig, IEmailStats } from '../models';
import { EmailAnalysis } from '../services/aiService';

export class DatabaseService {
  /**
   * Salva um email processado no banco de dados usando upsert para evitar duplicatas
   */
  async saveProcessedEmail(emailData: {
    messageId: string;
    from: string;
    to: string;
    subject: string;
    date: Date;
    content: string;
    analysis: EmailAnalysis;
    smsSent: boolean;
  }): Promise<IProcessedEmail> {
    try {
      // Usa updateOne com upsert: true para evitar erro de chave duplicada
      const email = await ProcessedEmail.findOneAndUpdate(
        { messageId: emailData.messageId },
        {
          $set: {
            messageId: emailData.messageId,
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            date: emailData.date,
            content: emailData.content,
            analysis: emailData.analysis,
            smsSent: emailData.smsSent,
            processedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
      
      // Atualiza estatísticas diárias
      await this.updateDailyStats(emailData.analysis.importance, emailData.smsSent);
      
      return email;
    } catch (error) {
      console.error('❌ Erro ao salvar email processado:', error);
      throw error;
    }
  }

  /**
   * Busca emails processados com filtros
   */
  async getProcessedEmails(filters: {
    importance?: string;
    from?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<IProcessedEmail[]> {
    try {
      const query: any = {};
      
      if (filters.importance) {
        query['analysis.importance'] = filters.importance;
      }
      
      if (filters.from) {
        query.from = { $regex: filters.from, $options: 'i' };
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.processedAt = {};
        if (filters.dateFrom) query.processedAt.$gte = filters.dateFrom;
        if (filters.dateTo) query.processedAt.$lte = filters.dateTo;
      }

      const emails = await ProcessedEmail
        .find(query)
        .sort({ processedAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.offset || 0);

      return emails;
    } catch (error) {
      console.error('❌ Erro ao buscar emails processados:', error);
      throw error;
    }
  }

  /**
   * Busca estatísticas de emails
   */
  async getEmailStats(days: number = 7): Promise<IEmailStats[]> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const stats = await EmailStats
        .find({ date: { $gte: dateFrom } })
        .sort({ date: -1 });

      return stats;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Atualiza estatísticas diárias
   */
  private async updateDailyStats(importance: string, smsSent: boolean): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const updateData: any = {
        $inc: { totalEmails: 1 }
      };

      switch (importance) {
        case 'alta':
          updateData.$inc.highPriority = 1;
          break;
        case 'média':
          updateData.$inc.mediumPriority = 1;
          break;
        case 'baixa':
          updateData.$inc.lowPriority = 1;
          break;
      }

      if (smsSent) {
        updateData.$inc.smsSent = 1;
      }

      await EmailStats.findOneAndUpdate(
        { date: today },
        updateData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('❌ Erro ao atualizar estatísticas:', error);
    }
  }

  /**
   * Cria ou atualiza configurações do usuário
   */
  async saveUserConfig(userId: string, config: Partial<IUserConfig>): Promise<IUserConfig> {
    try {
      const userConfig = await UserConfig.findOneAndUpdate(
        { userId },
        { ...config, userId },
        { upsert: true, new: true }
      );

      return userConfig;
    } catch (error) {
      console.error('❌ Erro ao salvar configuração do usuário:', error);
      throw error;
    }
  }

  /**
   * Busca configurações do usuário
   */
  async getUserConfig(userId: string): Promise<IUserConfig | null> {
    try {
      const config = await UserConfig.findOne({ userId });
      return config;
    } catch (error) {
      console.error('❌ Erro ao buscar configuração do usuário:', error);
      throw error;
    }
  }

  /**
   * Busca estatísticas gerais
   */
  async getGeneralStats(): Promise<{
    totalEmails: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    smsSent: number;
    uniqueSenders: number;
  }> {
    try {
      const [emailStats, senderStats] = await Promise.all([
        ProcessedEmail.aggregate([
          {
            $group: {
              _id: null,
              totalEmails: { $sum: 1 },
              highPriority: { $sum: { $cond: [{ $eq: ['$analysis.importance', 'alta'] }, 1, 0] } },
              mediumPriority: { $sum: { $cond: [{ $eq: ['$analysis.importance', 'média'] }, 1, 0] } },
              lowPriority: { $sum: { $cond: [{ $eq: ['$analysis.importance', 'baixa'] }, 1, 0] } },
              smsSent: { $sum: { $cond: ['$smsSent', 1, 0] } }
            }
          }
        ]),
        ProcessedEmail.distinct('from')
      ]);

      const stats = emailStats[0] || {
        totalEmails: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        smsSent: 0
      };

      return {
        ...stats,
        uniqueSenders: senderStats.length
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas gerais:', error);
      throw error;
    }
  }

  /**
   * Verifica se um email já foi processado
   */
  async isEmailProcessed(messageId: string): Promise<boolean> {
    try {
      const email = await ProcessedEmail.findOne({ messageId });
      return !!email;
    } catch (error) {
      console.error('❌ Erro ao verificar email processado:', error);
      return false;
    }
  }
}

export default DatabaseService;
