import { Router, type Request } from 'express';
import { requireIdentity, requirePlatformOperator } from '../middleware/auth';
import { PlatformError, type PlatformRuntime } from '../platform/runtime';

export const controlRoutes = Router();

function runtimeOf(req: Request): PlatformRuntime {
  return req.app.locals.platform as PlatformRuntime;
}

controlRoutes.get('/status', requireIdentity, requirePlatformOperator, (req, res) => {
  res.json({
    plane: 'AGBOFA_PLATFORM_CONTROL_CENTER',
    persistence: { driver: 'memory', classification: 'TRANSITIONAL', postgresApplied: false },
    billingProvider: { selected: null, status: 'DEFERRED' },
    operatorId: req.platformIdentityId,
    tailoringAuthority: false,
  });
});

controlRoutes.get('/tenants', requireIdentity, requirePlatformOperator, (req, res) => {
  res.json({ tenants: runtimeOf(req).listTenantsForControl() });
});

controlRoutes.get('/tenants/:id', requireIdentity, requirePlatformOperator, (req, res) => {
  const row = runtimeOf(req)
    .listTenantsForControl()
    .find((t) => t.id === req.params.id);
  if (!row) {
    res.status(404).json({ error: 'TENANT_MISSING', message: 'Tenant not found' });
    return;
  }
  res.json({ tenant: row });
});

controlRoutes.get('/configuration', requireIdentity, requirePlatformOperator, (req, res) => {
  res.json({ configuration: runtimeOf(req).getConfiguration() });
});

controlRoutes.patch('/configuration', requireIdentity, requirePlatformOperator, (req, res, next) => {
  try {
    const configuration = runtimeOf(req).patchConfiguration(
      req.body && typeof req.body === 'object' ? req.body : {},
      req.platformIdentityId as string
    );
    res.json({ configuration });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});

controlRoutes.get('/audit', requireIdentity, requirePlatformOperator, (req, res) => {
  const events = runtimeOf(req).store.commercialAudit.slice(-100);
  res.json({ events });
});

controlRoutes.get('/billing/provider', requireIdentity, requirePlatformOperator, (req, res) => {
  res.json({
    selected: null,
    status: 'DEFERRED',
    adapters: ['test'],
    note: 'P19.8 required for a live PSP. Shop payments are not SaaS billing.',
  });
});
