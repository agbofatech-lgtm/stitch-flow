import { Request, Response } from 'express';
import { eventService } from '../services/eventService';

export const eventController = {
  ingest: async (req: Request, res: Response) => {
    await eventService.ingest(req.body.events, req.user?.sub);
    res.status(202).json({ accepted: req.body.events.length });
  }
};
