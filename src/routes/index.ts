import { Application } from 'express';
import authRoutes from './auth';

export default function setupRoutes(app: Application) {
  app.use(authRoutes);
}
