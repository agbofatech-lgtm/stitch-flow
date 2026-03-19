import { Request, Response } from 'express';
import { featureRequestService } from '@modules/services/featureRequestService';
import { getPagination } from '@shared/utils/pagination';

export const featureRequestController = {
  create: async (req: Request, res: Response) => {
    const featureRequest = await featureRequestService.create({
      userId: req.user?.sub || null,
      ...req.body
    });
    res.status(201).json(featureRequest);
  },

  list: async (req: Request, res: Response) => {
    const { limit, offset } = getPagination(req.query);
    const items = await featureRequestService.list(limit, offset);
    res.json({ items, limit, offset });
  },

  vote: async (req: Request, res: Response) => {
    await featureRequestService.vote(req.params.id, req.user!.sub);
    res.json({ success: true });
  }
};
