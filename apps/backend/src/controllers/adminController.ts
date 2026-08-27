import { Request, Response } from 'express';
import { adminService } from '../services/adminService';
import { getPagination } from '../utils/pagination';

export const adminController = {
  users: async (req: Request, res: Response) => {
    const { limit, offset } = getPagination(req.query);
    const items = await adminService.listUsers(
      limit,
      offset,
      req.query.status as string | undefined,
      req.query.role as string | undefined
    );
    res.json({ items, limit, offset });
  },

  analytics: async (req: Request, res: Response) => {
    const { limit, offset } = getPagination(req.query);
    const data = await adminService.analytics(limit, offset);
    res.json(data);
  },

  licenses: async (req: Request, res: Response) => {
    const { limit, offset } = getPagination(req.query);
    const items = await adminService.listLicenses(limit, offset);
    res.json({ items, limit, offset });
  },

  updateLicense: async (req: Request, res: Response) => {
    const item = await adminService.updateLicenseTier(
      req.params.id,
      req.body.tier,
      req.body.maxDevices
    );
    res.json(item);
  },

  revokeLicense: async (req: Request, res: Response) => {
    const item = await adminService.revokeLicense(req.params.id);
    res.json(item);
  },

  featureRequests: async (req: Request, res: Response) => {
    const { limit, offset } = getPagination(req.query);
    const items = await adminService.listFeatureRequests(limit, offset);
    res.json({ items, limit, offset });
  },

  auditLogs: async (req: Request, res: Response) => {
    const { limit, offset } = getPagination(req.query);
    const items = await adminService.auditLogs(limit, offset);
    res.json({ items, limit, offset });
  }
};
