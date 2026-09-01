import { Router, type Request } from 'express';
import { requireIdentity, requireTenantContext } from '../middleware/auth';
import { PlatformError, type PlatformRuntime } from '../platform/runtime';
import { canonicalWebhookBody } from '../platform/commercial/canonical';

export const commercialRoutes = Router();

function runtimeOf(req: Request): PlatformRuntime {
  return req.app.locals.platform as PlatformRuntime;
}

commercialRoutes.get('/plans', requireIdentity, requireTenantContext, (req, res) => {
  res.json({ plans: runtimeOf(req).commercial.listPlans() });
});

commercialRoutes.get('/entitlements', requireIdentity, requireTenantContext, (req, res) => {
  const ctx = req.platformContext!;
  res.json({
    tenantId: ctx.tenant.id,
    entitlements: runtimeOf(req).commercial.deriveEntitlements(ctx.tenant.id),
    subscription: runtimeOf(req).commercial.getSubscription(ctx),
  });
});

commercialRoutes.post('/access/check', requireIdentity, requireTenantContext, (req, res) => {
  const ctx = req.platformContext!;
  const capability = String(req.body?.capability || '');
  res.json({
    decision: runtimeOf(req).commercial.decideAccess(ctx.tenant.id, capability),
  });
});

commercialRoutes.post('/billing/checkout', requireIdentity, requireTenantContext, (req, res, next) => {
  try {
    const payment = runtimeOf(req).commercial.createCheckout(
      req.platformContext!,
      String(req.body?.planCode || '')
    );
    res.status(201).json({
      payment,
      note: 'Client redirects are not payment authority. Await verified webhook.',
    });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});

commercialRoutes.get('/billing/payments/:id', requireIdentity, requireTenantContext, (req, res, next) => {
  try {
    const payment = runtimeOf(req).commercial.getPayment(req.platformContext!, req.params.id);
    res.json({ payment });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});

commercialRoutes.get('/billing/subscription', requireIdentity, requireTenantContext, (req, res) => {
  res.json({ subscription: runtimeOf(req).commercial.getSubscription(req.platformContext!) });
});

commercialRoutes.post(
  '/billing/subscription/cancel',
  requireIdentity,
  requireTenantContext,
  (req, res, next) => {
    try {
      const subscription = runtimeOf(req).commercial.cancelSubscription(req.platformContext!);
      res.json({ subscription });
    } catch (err) {
      if (err instanceof PlatformError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      next(err);
    }
  }
);

commercialRoutes.post('/billing/webhooks/:adapter', (req, res, next) => {
  try {
    const eventId = String(req.body?.eventId || '');
    const type = String(req.body?.type || '');
    const checkoutId = String(req.body?.checkoutId || '');
    const rawBody = canonicalWebhookBody({ eventId, type, checkoutId });
    const signature = req.headers['x-billing-signature'];
    const result = runtimeOf(req).commercial.handleTestWebhook({
      adapter: String(req.params.adapter || ''),
      rawBody,
      signature: typeof signature === 'string' ? signature : undefined,
      eventId,
      type,
      checkoutId,
    });
    res.status(result.duplicate ? 200 : 201).json({
      duplicate: result.duplicate,
      payment: result.payment,
      subscription: result.subscription,
    });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});
