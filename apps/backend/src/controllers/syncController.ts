import { Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { syncV2Service } from '../services/syncV2Service';

export const syncController = {
  push: async (req: Request, res: Response) => {
    const result = await syncService.push(req.user!.sub, req.workspaceId!, req.body.changes);
    res.status(202).json(result);
  },

  changes: async (req: Request, res: Response) => {
    const result = await syncV2Service.listChanges(
      req.workspaceId!,
      String(req.query.cursor ?? '0'),
      req.query.limit === undefined ? undefined : String(req.query.limit)
    );
    res.json(result);
  },

  mutations: async (req: Request, res: Response) => {
    const results = await syncV2Service.ingestMutations(
      req.workspaceId!,
      req.user!.sub,
      req.body.mutations
    );
    res.status(207).json({ results });
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
