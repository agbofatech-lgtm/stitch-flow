import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const authController = {
  register: async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  },

  login: async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.json(result);
  },

  refresh: async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  },

  logout: async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    res.json({ success: true });
  }
};
