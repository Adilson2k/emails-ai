import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_saas_default';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token necessário.' });
    return;
  }
  const token = auth.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    //@ts-ignore
    req.userId = payload.userId;
    next();
    return;
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
    return;
  }
}