import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireIdentity, requireTenantContext } from '../middleware/auth';
import { requireShopWorkspace } from '../shop/middleware';
import { PlatformError } from '../platform/errors';
import type { ShopService } from '../shop/service';
import type { ProductionStageCode, StageAction } from '../services/productionStageService';

export const shopRoutes = Router();

shopRoutes.use(requireIdentity, requireTenantContext, requireShopWorkspace);

function shopOf(req: Request): ShopService {
  return req.app.locals.shop as ShopService;
}

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof PlatformError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  next(err);
}

shopRoutes.post('/sync/operations', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const ack = await shopOf(req).applySyncOperation(ctx, req.shopWorkspaceId as string, req.body || {});
    res.status(ack.status === 'conflict' ? 409 : 200).json(ack);
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.get('/sync/changes', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    res.json(await shopOf(req).listSyncChanges(ctx, req.shopWorkspaceId as string, cursor));
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.get('/customers', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    res.json({ customers: await shopOf(req).listCustomers(ctx, req.shopWorkspaceId as string) });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.post('/customers', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const customer = await shopOf(req).createCustomer(ctx, req.shopWorkspaceId as string, req.body || {});
    res.status(201).json({ customer });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.get('/customers/:id', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    res.json({ customer: await shopOf(req).getCustomer(ctx, req.shopWorkspaceId as string, req.params.id) });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.get('/orders', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    res.json({ orders: await shopOf(req).listOrders(ctx, req.shopWorkspaceId as string) });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.post('/orders', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const order = await shopOf(req).createOrder(ctx, req.shopWorkspaceId as string, req.body || {});
    res.status(201).json({ order });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.get('/orders/:id', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    res.json({ order: await shopOf(req).getOrder(ctx, req.shopWorkspaceId as string, req.params.id) });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.put('/orders/:id/measurement-snapshot', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const snapshot =
      req.body?.snapshot && typeof req.body.snapshot === 'object' ? req.body.snapshot : req.body || {};
    const order = await shopOf(req).putMeasurementSnapshot(
      ctx,
      req.shopWorkspaceId as string,
      req.params.id,
      snapshot
    );
    res.json({ order });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.post('/orders/:id/production-stages/:code/transition', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const order = await shopOf(req).transitionStage(
      ctx,
      req.shopWorkspaceId as string,
      req.params.id,
      req.params.code as ProductionStageCode,
      String(req.body?.action || '') as StageAction
    );
    res.json({ order });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.post('/trusted-artifacts', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    const artifact = await shopOf(req).appendTrustedArtifact(
      ctx,
      req.shopWorkspaceId as string,
      req.body || {}
    );
    res.status(201).json({ artifact });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.get('/trusted-artifacts/:id', async (req, res, next) => {
  try {
    const ctx = req.platformContext!;
    res.json({
      artifact: await shopOf(req).getTrustedArtifact(ctx, req.shopWorkspaceId as string, req.params.id),
    });
  } catch (err) {
    handle(err, res, next);
  }
});

shopRoutes.put('/trusted-artifacts/:id', (_req, res) => {
  res.status(405).json({
    error: 'ARTIFACT_IMMUTABLE',
    message: 'Trusted artifacts are append-only. Mutation is forbidden.',
  });
});

shopRoutes.patch('/trusted-artifacts/:id', (_req, res) => {
  res.status(405).json({
    error: 'ARTIFACT_IMMUTABLE',
    message: 'Trusted artifacts are append-only. Mutation is forbidden.',
  });
});

shopRoutes.delete('/trusted-artifacts/:id', (_req, res) => {
  res.status(405).json({
    error: 'ARTIFACT_IMMUTABLE',
    message: 'Trusted artifacts are append-only. Deletion is forbidden.',
  });
});
