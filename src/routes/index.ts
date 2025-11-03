import { Application } from 'express';
import authRoutes from './auth';
import settingsRoutes from './settings';

export default function setupRoutes(app: Application) {
  app.use('/auth', authRoutes);
  app.use('/settings', settingsRoutes);
}
