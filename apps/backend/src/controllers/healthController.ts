import { Request, Response } from 'express';

export const healthController = {
  check: async (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
};
