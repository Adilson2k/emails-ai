import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Todas as rotas de configurações requerem autenticação
router.use(authMiddleware);

// Rotas de configurações
router.get('/me', settingsController.getMySettings);
router.post('/', settingsController.saveSettings);

export default router;
