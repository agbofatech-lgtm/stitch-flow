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
  },

  /**
   * Phase 9: password-recovery request. The response is intentionally
   * identical whether or not the identifier matches an account — account
   * existence is never revealed.
   */
  forgotPassword: async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.identifier);
    res.json({
      success: true,
      message: 'If an account matches that email or phone number, a password reset link is on its way.'
    });
  },

  /** Phase 9: complete recovery with the single-use token. */
  resetPassword: async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, message: 'Your password has been reset. You can sign in now.' });
  }
};
