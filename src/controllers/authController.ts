import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { AuthenticatedRequest } from '../types/express';

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_saas_default';
const JWT_EXPIRATION = process.env.JWT_EXPIRES_IN || '7d';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone_number, plan } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Dados obrigatórios não enviados.' });
      return;
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(409).json({ error: 'E-mail de usuário já cadastrado.' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      phone_number,
      plan: plan || 'gratuito',
    });
    res.status(201).json({ message: 'Usuário criado com sucesso.' });
    return;
  } catch (err) {
    res.status(500).json({ error: 'Erro no registro.' });
    return;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios.' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }
    const passOk = await bcrypt.compare(password, user.password);
    if (!passOk) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }
    if (!JWT_SECRET) {
      res.status(500).json({ error: 'JWT secret não configurado.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRATION as jwt.SignOptions['expiresIn'] }
    );
    res.json({ token });
    return;
  } catch (err) {
    res.status(500).json({ error: 'Erro ao logar.' });
    return;
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  const user = await User.findById(userId).select('-password');
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }
  res.json(user);
  return;
};
