import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authMiddleware as requireAuth } from '../middlewares/auth';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/me', requireAuth, getMe);

export default router;
