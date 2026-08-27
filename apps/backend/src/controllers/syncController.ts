import { Request, Response } from 'express';
import { syncService } from '../services/syncService';

export const syncController = {
  push: async (req: Request, res: Response) => {
    const result = await syncService.push(req.user!.sub, req.body.changes);
    res.status(202).json(result);
  },

  pull: async (req: Request, res: Response) => {
    const result = await syncService.pull(
      req.user!.sub,
      String(req.query.since),
      String(req.query.tables)
    );
    res.json(result);
  }
};
