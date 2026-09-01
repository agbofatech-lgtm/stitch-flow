import { Router } from 'express';
import { requireIdentity, requireTenantContext } from '../middleware/auth';
import { PlatformError, type PlatformRuntime } from '../platform/runtime';

export const platformRoutes = Router();

platformRoutes.get('/context', requireIdentity, requireTenantContext, (req, res) => {
  const ctx = req.platformContext;
  if (!ctx) {
    res.status(401).json({ error: 'MISSING_CONTEXT', message: 'Tenant context missing' });
    return;
  }
  res.json({
    identity: ctx.identity,
    tenant: ctx.tenant,
    workspace: ctx.workspace,
    membership: {
      id: ctx.membership.id,
      role: ctx.membership.role,
      status: ctx.membership.status,
      tenantId: ctx.membership.tenantId,
    },
    notes: {
      tenantEqualsWorkspace: ctx.tenant.id === ctx.workspace.id,
      entitlementEvaluated: false,
    },
  });
});

platformRoutes.post(
  '/records',
  requireIdentity,
  requireTenantContext,
  (req, res, next) => {
    try {
      const runtime = req.app.locals.platform as PlatformRuntime;
      const ctx = req.platformContext;
      if (!ctx) {
        res.status(401).json({ error: 'MISSING_CONTEXT', message: 'Tenant context missing' });
        return;
      }
      const record = runtime.createRecord(ctx, {
        kind: String(req.body?.kind || 'note'),
        payload: req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {},
      });
      res.status(201).json({ record });
    } catch (err) {
      if (err instanceof PlatformError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      next(err);
    }
  }
);

platformRoutes.get(
  '/records/:id',
  requireIdentity,
  requireTenantContext,
  (req, res, next) => {
    try {
      const runtime = req.app.locals.platform as PlatformRuntime;
      const ctx = req.platformContext;
      if (!ctx) {
        res.status(401).json({ error: 'MISSING_CONTEXT', message: 'Tenant context missing' });
        return;
      }
      const record = runtime.assertTenantRecord(ctx, req.params.id);
      res.json({ record });
    } catch (err) {
      if (err instanceof PlatformError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      next(err);
    }
  }
);
