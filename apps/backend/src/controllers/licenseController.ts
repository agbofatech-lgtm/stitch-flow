import { Request, Response } from 'express';
import { licenseService } from '../services/licenseService';

export const licenseController = {
  validate: async (req: Request, res: Response) => {
    const result = await licenseService.validate(
      req.body.licenseKey,
      req.body.deviceFingerprint
    );
    res.json(result);
  },

  deactivateDevice: async (req: Request, res: Response) => {
    await licenseService.deactivateDevice(
      req.params.licenseId,
      req.body.deviceFingerprint,
      req.user?.sub
    );
    res.json({ success: true });
  }
};
