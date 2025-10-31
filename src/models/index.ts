import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailAnalysis {
  importance: 'alta' | 'média' | 'baixa';
  summary: string;
  confidence: number;
  keywords: string[];
}

export interface IProcessedEmail extends Document {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  content: string;
  analysis: IEmailAnalysis;
  smsSent: boolean;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserConfig extends Document {
  userId: string;
  emailSettings: {
    enabled: boolean;
    checkInterval: number;
    maxRetries: number;
  };
  aiSettings: {
    enabled: boolean;
    model: string;
    customPrompt?: string;
  };
  smsSettings: {
    enabled: boolean;
    numbers: string[];
    alertThreshold: 'alta' | 'média' | 'baixa';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailStats extends Document {
  date: Date;
  totalEmails: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  smsSent: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para emails processados
const ProcessedEmailSchema = new Schema<IProcessedEmail>({
  messageId: { type: String, required: true, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: Date, required: true },
  content: { type: String, required: true },
  analysis: {
    importance: { type: String, enum: ['alta', 'média', 'baixa'], required: true },
    summary: { type: String, required: true },
    confidence: { type: Number, required: true },
    keywords: [{ type: String }]
  },
  smsSent: { type: Boolean, default: false },
  processedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Schema para configurações do usuário
const UserConfigSchema = new Schema<IUserConfig>({
  userId: { type: String, required: true, unique: true },
  emailSettings: {
    enabled: { type: Boolean, default: true },
    checkInterval: { type: Number, default: 30000 },
    maxRetries: { type: Number, default: 3 }
  },
  aiSettings: {
    enabled: { type: Boolean, default: true },
    model: { type: String, default: 'gemini-2.5-flash' },
    customPrompt: { type: String }
  },
  smsSettings: {
    enabled: { type: Boolean, default: true },
    numbers: [{ type: String }],
    alertThreshold: { type: String, enum: ['alta', 'média', 'baixa'], default: 'alta' }
  }
}, {
  timestamps: true
});

// Schema para estatísticas diárias
const EmailStatsSchema = new Schema<IEmailStats>({
  date: { type: Date, required: true, unique: true },
  totalEmails: { type: Number, default: 0 },
  highPriority: { type: Number, default: 0 },
  mediumPriority: { type: Number, default: 0 },
  lowPriority: { type: Number, default: 0 },
  smsSent: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Índices para melhor performance
ProcessedEmailSchema.index({ processedAt: -1 });
ProcessedEmailSchema.index({ 'analysis.importance': 1 });
ProcessedEmailSchema.index({ from: 1 });

EmailStatsSchema.index({ date: -1 });

// Modelos
export const ProcessedEmail = mongoose.model<IProcessedEmail>('ProcessedEmail', ProcessedEmailSchema);
export const UserConfig = mongoose.model<IUserConfig>('UserConfig', UserConfigSchema);
export const EmailStats = mongoose.model<IEmailStats>('EmailStats', EmailStatsSchema);

export * from './user';

export default {
  ProcessedEmail,
  UserConfig,
  EmailStats
};
