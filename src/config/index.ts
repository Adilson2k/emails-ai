import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Configurações do servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configurações do MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/emails-ai',
  
  // Configurações de segurança
  jwtSecret: process.env.JWT_SECRET || '51024f980ebfe423bb5cef35d26bd4dc750a8c770e6ef7b6c81c25a987a9357e',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Configurações de Email (IMAP)
  email: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    host: process.env.EMAIL_HOST || 'imap.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '993'),
    secure: true,
    tls: {
      rejectUnauthorized: false
    }
  },
  
  // Configurações do Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || ''
  },
  
  // Configurações do Simple SMS
  sms: {
    token: process.env.SIMPLE_SMS_TOKEN || '',
    numbers: process.env.SMS_NUMBERS?.split(',') || [],
    endpoint: 'https://interoperability.simplesms.ao/v1/send-sms'
  }
};

export default config;
