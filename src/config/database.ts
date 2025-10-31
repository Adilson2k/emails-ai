import mongoose, { Connection } from 'mongoose';
import { config } from './index';

let connection: Connection | null = null;

export const connectToDatabase = async (uri?: string): Promise<void> => {
  try {
    const mongoUri = uri || config.mongodbUri;
    
    if (!mongoUri) {
      console.warn('⚠️ MONGODB_URI não configurada - Banco de dados desabilitado');
      return;
    }

    console.log(`🔗 Tentando conectar ao MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    connection = mongoose.connection;
    
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    throw error;
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    if (connection) {
      await mongoose.disconnect();
      connection = null;
      console.log('✅ Desconectado do MongoDB');
    }
  } catch (error) {
    console.error('❌ Erro ao desconectar do MongoDB:', error);
  }
};

export const getDatabaseConnectionState = (): string => {
  if (!connection) {
    return 'Não conectado';
  }
  
  switch (connection.readyState) {
    case 0:
      return 'Desconectado';
    case 1:
      return 'Conectado';
    case 2:
      return 'Conectando';
    case 3:
      return 'Desconectando';
    default:
      return 'Estado desconhecido';
  }
};

export const isDatabaseConnected = (): boolean => {
  return connection?.readyState === 1;
};

export default mongoose;
