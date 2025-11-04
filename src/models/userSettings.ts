import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || 'your-fallback-encryption-key-32-chars!!';
// Deriva uma chave de 32 bytes de forma determinística
const KEY_BYTES = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest().subarray(0, 32);
const IV_LENGTH = 16;

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  imapEmail: string;
  imapPassword: string;
  imapHost: string;
  imapPort: number;
  useGmailOAuth: boolean;
  smsPhone?: string;
  smsToken?: string;
  created_at: Date;
  updated_at: Date;
}

// Funções auxiliares de criptografia
function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY_BYTES, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text: string): string {
  try {
    // Verifica se o texto já está descriptografado (não tem o formato iv:encrypted)
    if (!text.includes(':')) {
      return text;
    }
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY_BYTES, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // Se falhar na descriptografia, retorna o texto original
    console.warn('Erro ao descriptografar:', error);
    return text;
  }
}

const UserSettingsSchema = new Schema<IUserSettings>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  imapEmail: { type: String, required: true },
  imapPassword: { 
    type: String, 
    required: true,
    set: (value: string) => encrypt(value)
  },
  imapHost: { type: String, required: true },
  imapPort: { type: Number, required: true },
  useGmailOAuth: { type: Boolean, default: false },
  smsPhone: { type: String },
  smsToken: { 
    type: String,
    set: (value: string) => value ? encrypt(value) : value
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

UserSettingsSchema.pre<IUserSettings>('save', function (next) {
  this.updated_at = new Date();
  next();
});

// Métodos de instância para descriptografar dados sensíveis
UserSettingsSchema.methods.getDecryptedPassword = function(): string {
  return decrypt(this.imapPassword);
};

UserSettingsSchema.methods.getDecryptedToken = function(): string | undefined {
  return this.smsToken ? decrypt(this.smsToken) : undefined;
};

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
