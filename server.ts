import 'dotenv/config';
import EmailAlertService from './src/app';

// Inicializa o Email Alert Service
const service = new EmailAlertService();

// Tratamento de sinais para parada graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, parando serviço...');
  await service.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, parando serviço...');
  await service.stop();
  process.exit(0);
});

// Inicia o serviço
service.start().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});


