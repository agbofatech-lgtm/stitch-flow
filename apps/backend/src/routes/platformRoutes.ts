import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requirePlatformRole } from '../middleware/requirePlatformRole';
import { validate } from '../middleware/validate';
import { usageService } from '../services/usageService';
import { errorService } from '../services/errorService';
import { featureFlagService, controlPlaneService } from '../services/platformServices';
import { auditLogService } from '../services/auditLogService';
import { webhookService } from '../services/webhookService';
import { platformCustomerService } from '../services/platformCustomerService';
import { auditLogRepository } from '../repositories/auditLogRepository';
import { developerRateLimit } from '../config/rateLimit';
import { createCustomerSchema, customerLifecycleSchema, operatorRoleSchema, auditLogQuerySchema } from '../schemas/platformSchemas';

/**
 * Phase 7 — Developer Control Plane (Step 27–29, 39, 58).
 * PLATFORM roles only; workspace owners/staff are FORBIDDEN here.
 */
export const platformRoutes = Router();
platformRoutes.use(authMiddleware);

platformRoutes.get('/overview', requirePlatformRole('read'), async (_req, res) => {
  const summary = await usageService.platformSummary(30);
  res.json(summary);
});

platformRoutes.get('/workspaces', requirePlatformRole('read'), async (req, res) => {
  res.json(await controlPlaneService.workspacesOverview(Number(req.query.limit ?? 100)));
});

platformRoutes.get('/feature-usage', requirePlatformRole('read'), async (req, res) => {
  res.json(await controlPlaneService.featureUsage(typeof req.query.feature === 'string' ? req.query.feature : undefined));
});

platformRoutes.get('/signals', requirePlatformRole('read'), async (_req, res) => {
  res.json(await usageService.healthSignals());
});

// ---------- Error center ----------
platformRoutes.get('/errors', requirePlatformRole('read'), async (_req, res) => {
  res.json(await errorService.listRecent({ limit: 100 }));
});

platformRoutes.get('/incidents', requirePlatformRole('read'), async (_req, res) => {
  res.json(await errorService.listIncidents());
});

platformRoutes.get('/incidents/:fingerprint/diagnosis', requirePlatformRole('read'), async (req, res) => {
  const diagnosis = await errorService.diagnose(req.params.fingerprint);
  if (!diagnosis) return res.status(404).json({ message: 'Incident not found' });
  res.json(diagnosis);
});

platformRoutes.patch('/incidents/:fingerprint', requirePlatformRole('operate'), async (req, res) => {
  const status = String(req.body?.status ?? '');
  const result = await errorService.updateIncidentStatus(req.params.fingerprint, status, req.user!.sub);
  if (!result.ok) return res.status(400).json({ message: 'Invalid status or unknown incident' });
  void auditLogService
    .log({ action: 'platform.incident_status_changed', entityType: 'incident', entityId: req.params.fingerprint, metadata: { status } })
    .catch(() => undefined);
  res.json(result);
});

// ---------- Webhook dispatch (manual ops trigger until a worker exists) ----------
platformRoutes.post('/webhooks/dispatch', requirePlatformRole('operate'), async (req, res) => {
  try {
    const dispatch = await webhookService.dispatchOutbox();
    const drain = await webhookService.drainOnce();
    // Phase 10: privileged operation — awaited audit with actor + result
    // counts before the operator sees success.
    await auditLogService.log({
      userId: req.user!.sub,
      action: 'platform.webhooks_dispatched',
      entityType: 'webhook_outbox',
      metadata: { dispatch, drain }
    });
    res.json({ dispatch, drain });
  } catch (err) {
    console.error('platform: webhook dispatch failed:', err);
    res.status(500).json({ message: 'Webhook dispatch failed' });
  }
});

// ---------- Feature flags (server-authoritative) ----------
platformRoutes.get('/flags', requirePlatformRole('read'), async (_req, res) => {
  res.json(await featureFlagService.list());
});

platformRoutes.patch('/flags/:key', requirePlatformRole('write'), async (req, res) => {
  try {
    const flag = await featureFlagService.set(req.params.key, req.body?.enabled === true, req.user!.sub);
    // Phase 10: awaited — a privileged mutation must be durably audited
    // before the operator sees a success response.
    await auditLogService.log({
      userId: req.user!.sub,
      action: 'platform.feature_flag_changed',
      entityType: 'feature_flag',
      entityId: flag.flag_key,
      metadata: { enabled: flag.enabled }
    });
    res.json(flag);
  } catch {
    res.status(404).json({ message: 'Unknown feature flag' });
  }
});

// ---------- Phase 10: Developer Control Center — customers ----------
// Reads: any platform role (incl. analyst/support). Mutations: write-level
// (platform_owner/platform_admin) + developer rate limit. Session ops:
// operate-level (support included). Password material is NEVER returned.
platformRoutes.get('/customers', requirePlatformRole('read'), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 25), 1), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    res.json(
      await platformCustomerService.list({
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        limit,
        offset
      })
    );
  } catch (err) {
    next(err);
  }
});

platformRoutes.get('/customers/:id', requirePlatformRole('read'), async (req, res, next) => {
  try {
    res.json(await platformCustomerService.detail(req.params.id));
  } catch (err) {
    next(err);
  }
});

platformRoutes.post(
  '/customers',
  developerRateLimit,
  requirePlatformRole('write'),
  validate(createCustomerSchema),
  async (req, res, next) => {
    try {
      const body = req.body as { email: string; fullName: string; phone?: string; tier?: 'free' | 'pro' | 'enterprise'; sendReset?: boolean };
      const created = await platformCustomerService.create(body, req.user!.sub);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

platformRoutes.post(
  '/customers/:id/suspend',
  developerRateLimit,
  requirePlatformRole('write'),
  validate(customerLifecycleSchema),
  async (req, res, next) => {
    try {
      const reason = (req.body as { reason: string }).reason;
      res.json(await platformCustomerService.suspend(req.params.id, reason, req.user!.sub));
    } catch (err) {
      next(err);
    }
  }
);

platformRoutes.post(
  '/customers/:id/reactivate',
  developerRateLimit,
  requirePlatformRole('write'),
  validate(customerLifecycleSchema),
  async (req, res, next) => {
    try {
      const reason = (req.body as { reason: string }).reason;
      res.json(await platformCustomerService.reactivate(req.params.id, reason, req.user!.sub));
    } catch (err) {
      next(err);
    }
  }
);

platformRoutes.post(
  '/customers/:id/revoke-sessions',
  developerRateLimit,
  requirePlatformRole('operate'),
  async (req, res, next) => {
    try {
      res.json(await platformCustomerService.revokeSessions(req.params.id, req.user!.sub));
    } catch (err) {
      next(err);
    }
  }
);

platformRoutes.post(
  '/customers/:id/send-reset',
  developerRateLimit,
  requirePlatformRole('operate'),
  async (req, res, next) => {
    try {
      res.json(await platformCustomerService.sendPasswordReset(req.params.id, req.user!.sub));
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Phase 10: workspace detail + audit trail + operators ----------
platformRoutes.get('/workspaces/:id', requirePlatformRole('read'), async (req, res, next) => {
  try {
    res.json(await platformCustomerService.workspaceDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

platformRoutes.get('/audit-logs', requirePlatformRole('read'), validate(auditLogQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as { limit?: number; offset?: number; action?: string; entityType?: string; entityId?: string };
    const rows = await auditLogRepository.list(q.limit ?? 50, q.offset ?? 0, {
      action: q.action,
      entityType: q.entityType,
      entityId: q.entityId
    });
    // Never expose raw metadata blobs wholesale in the operator feed — keep
    // the documented fields only (actor/action/target/time/result/metadata
    // summary is already free of secrets by write-side construction).
    res.json(
      rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        metadata: r.metadata,
        created_at: r.created_at
      }))
    );
  } catch (err) {
    next(err);
  }
});

platformRoutes.post(
  '/operators',
  developerRateLimit,
  requirePlatformRole('write'),
  validate(operatorRoleSchema),
  async (req, res, next) => {
    try {
      const body = req.body as { email: string; role: string };
      res.json(await platformCustomerService.setOperatorRole(body.email, body.role, req.user!.sub));
    } catch (err) {
      next(err);
    }
  }
);
