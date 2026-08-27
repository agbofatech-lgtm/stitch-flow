import crypto from 'crypto';
import { Router } from 'express';
import { query } from '../config/db';
import { webhookService } from '../services/webhookService';
import { auditLogService } from '../services/auditLogService';
import { requireFeatureFlag } from '../middleware/requireFeatureFlag';
import { developerRateLimit } from '../config/rateLimit';

/**
 * Phase 8 — Webhook management (Subsystem 2).
 * Mounted at /webhooks behind authMiddleware + requireWorkspace: workspace
 * staff manage THEIR OWN endpoints; every query is workspace-scoped and
 * every mutation is audited. API keys / portal tokens are structurally
 * rejected (no JWT). Fails closed behind WEBHOOK_MANAGEMENT (default OFF).
 */
export const webhookRoutes = Router();
webhookRoutes.use(requireFeatureFlag('WEBHOOK_MANAGEMENT'));

const EVENT_PATTERN = /^[A-Z][A-Z0-9_.]*$/;

function validateEventList(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) return null;
  const out: string[] = [];
  for (const e of input) {
    if (typeof e !== 'string') return null;
    if (e === '@all') {
      out.push(e);
      continue;
    }
    if (!EVENT_PATTERN.test(e)) return null;
    if (!out.includes(e)) out.push(e);
  }
  return out;
}

webhookRoutes.post('/endpoints', developerRateLimit, async (req, res) => {
  const ws = req.workspaceId!;
  const url = String(req.body?.url ?? '').trim();
  if (!url) return res.status(400).json({ code: 'INVALID_URL', message: 'url is required' });
  const events = validateEventList(req.body?.subscribedEvents);
  if (!events) {
    return res.status(400).json({ code: 'INVALID_EVENTS', message: 'subscribedEvents must be 1–50 uppercase event types (or "@all")' });
  }
  const maxAttempts = req.body?.maxAttempts === undefined ? undefined : Number(req.body.maxAttempts);
  if (maxAttempts !== undefined && (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10)) {
    return res.status(400).json({ code: 'INVALID_RETRY_POLICY', message: 'maxAttempts must be an integer 1–10' });
  }
  const backoffBaseSeconds = req.body?.backoffBaseSeconds === undefined ? undefined : Number(req.body.backoffBaseSeconds);
  if (backoffBaseSeconds !== undefined && (!Number.isInteger(backoffBaseSeconds) || backoffBaseSeconds < 0 || backoffBaseSeconds > 3600)) {
    return res.status(400).json({ code: 'INVALID_RETRY_POLICY', message: 'backoffBaseSeconds must be an integer 0–3600' });
  }
  try {
    const created = await webhookService.createEndpoint({
      workspaceId: ws,
      createdBy: req.user!.sub,
      url,
      description: req.body?.description,
      subscribedEvents: events,
      maxAttempts,
      backoffBaseSeconds,
    });
    if (!created.ok) {
      return res.status(400).json({ code: created.code, message: 'Webhook destination rejected by security policy' });
    }
    void auditLogService
      .log({
        userId: req.user!.sub,
        workspaceId: ws,
        action: 'webhook_endpoint.created',
        entityType: 'webhook_endpoint',
        entityId: created.endpoint.id as string,
        metadata: { url, subscribedEvents: events },
      })
      .catch(() => undefined);
    // ONE-TIME secret display.
    return res.status(201).json({ endpoint: created.endpoint, secret: created.secret });
  } catch (err) {
    console.error('webhooks: endpoint create failed:', err);
    return res.status(500).json({ message: 'Failed to create webhook endpoint' });
  }
});

webhookRoutes.get('/endpoints', async (req, res) => {
  try {
    res.json(await webhookService.listEndpoints(req.workspaceId!));
  } catch (err) {
    console.error('webhooks: endpoint list failed:', err);
    res.status(500).json({ message: 'Failed to list webhook endpoints' });
  }
});

webhookRoutes.patch('/endpoints/:id', async (req, res) => {
  const ws = req.workspaceId!;
  try {
    const existing = await query(
      `SELECT id, url, status FROM webhook_endpoints WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, ws]
    );
    if (existing.rows.length === 0) return res.status(404).json({ code: 'WEBHOOK_NOT_FOUND', message: 'Webhook endpoint not found' });

    const updates: string[] = [];
    const params: unknown[] = [];
    let n = 0;
    const set = (column: string, value: unknown) => {
      params.push(value);
      updates.push(`${column} = $${++n}`);
    };
    if (req.body?.url !== undefined) {
      const url = String(req.body.url).trim();
      // Re-validate on edit (SSRF policy applies to changes too).
      const { checkWebhookUrl } = await import('../security/webhookUrlPolicy');
      const check = checkWebhookUrl(url);
      if (!check.ok) return res.status(400).json({ code: `UNSAFE_WEBHOOK_URL:${check.reason}`, message: 'Webhook destination rejected by security policy' });
      set('url', url);
    }
    if (req.body?.description !== undefined) set('description', String(req.body.description).slice(0, 300));
    if (req.body?.status !== undefined) {
      const status = String(req.body.status);
      if (!['active', 'disabled'].includes(status)) {
        return res.status(400).json({ code: 'INVALID_STATUS', message: "status must be 'active' or 'disabled'" });
      }
      set('status', status);
    }
    if (req.body?.subscribedEvents !== undefined) {
      const events = validateEventList(req.body.subscribedEvents);
      if (!events) return res.status(400).json({ code: 'INVALID_EVENTS', message: 'subscribedEvents invalid' });
      set('subscribed_events', events);
    }
    if (updates.length === 0) return res.status(400).json({ message: 'No recognized fields to update' });
    set('updated_at', new Date()); // n incremented after values
    const result = await query(
      `UPDATE webhook_endpoints SET ${updates.join(', ')} WHERE id = $${++n} AND workspace_id = $${++n} RETURNING id, url, description, status, subscribed_events`,
      [...params, req.params.id, ws]
    );
    void auditLogService
      .log({
        userId: req.user!.sub,
        workspaceId: ws,
        action: 'webhook_endpoint.updated',
        entityType: 'webhook_endpoint',
        entityId: req.params.id,
        metadata: { fields: Object.keys(req.body ?? {}) },
      })
      .catch(() => undefined);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('webhooks: endpoint update failed:', err);
    return res.status(500).json({ message: 'Failed to update webhook endpoint' });
  }
});

webhookRoutes.delete('/endpoints/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM webhook_endpoints WHERE id = $1 AND workspace_id = $2 RETURNING id`,
      [req.params.id, req.workspaceId!]
    );
    if (result.rows.length === 0) return res.status(404).json({ code: 'WEBHOOK_NOT_FOUND', message: 'Webhook endpoint not found' });
    // Deliveries survive endpoint deletion (FK SET NULL) for audit history.
    void auditLogService
      .log({
        userId: req.user!.sub,
        workspaceId: req.workspaceId!,
        action: 'webhook_endpoint.deleted',
        entityType: 'webhook_endpoint',
        entityId: req.params.id,
      })
      .catch(() => undefined);
    return res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    console.error('webhooks: endpoint delete failed:', err);
    return res.status(500).json({ message: 'Failed to delete webhook endpoint' });
  }
});

webhookRoutes.post('/endpoints/:id/test', async (req, res) => {
  try {
    const ws = req.workspaceId!;
    const ep = await query(`SELECT id, status FROM webhook_endpoints WHERE id = $1 AND workspace_id = $2`, [req.params.id, ws]);
    if (ep.rows.length === 0) return res.status(404).json({ code: 'WEBHOOK_NOT_FOUND', message: 'Webhook endpoint not found' });
    if (ep.rows[0].status !== 'active') return res.status(409).json({ code: 'WEBHOOK_DISABLED', message: 'Endpoint is disabled' });
    // Test event flows through the REAL pipeline (outbox → dispatch → delivery).
    const { outboxService } = await import('../services/platformServices');
    const testId = `test-${crypto.randomUUID()}`;
    await outboxService.record({ workspaceId: ws, eventType: 'webhook.test', entityType: 'webhook_endpoint', entityId: `${req.params.id}:${testId}`, payload: { test: true, endpointId: req.params.id } });
    const dispatch = await webhookService.dispatchOutbox();
    const drain = await webhookService.drainOnce();
    return res.status(202).json({ queued: true, dispatch, drain });
  } catch (err) {
    console.error('webhooks: test event failed:', err);
    return res.status(500).json({ message: 'Failed to send test event' });
  }
});

webhookRoutes.get('/deliveries', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    if (status && !['PENDING', 'DELIVERING', 'DELIVERED', 'RETRYING', 'DEAD_LETTER'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }
    res.json(await webhookService.listDeliveries(req.workspaceId!, status));
  } catch (err) {
    console.error('webhooks: delivery list failed:', err);
    res.status(500).json({ message: 'Failed to list deliveries' });
  }
});

webhookRoutes.get('/dead-letters', async (req, res) => {
  try {
    res.json(await webhookService.listDeliveries(req.workspaceId!, 'DEAD_LETTER'));
  } catch (err) {
    console.error('webhooks: dead-letter list failed:', err);
    res.status(500).json({ message: 'Failed to list dead letters' });
  }
});

webhookRoutes.post('/dead-letters/:id/replay', async (req, res) => {
  try {
    const outcome = await webhookService.replayDeadLetter(req.workspaceId!, req.params.id);
    if (outcome === 'not_found') return res.status(404).json({ code: 'WEBHOOK_NOT_FOUND', message: 'Dead-lettered delivery not found' });
    if (outcome === 'not_dead_letter') return res.status(409).json({ code: 'NOT_DEAD_LETTER', message: 'Delivery is not in DEAD_LETTER state' });
    // Attempt immediate delivery of the replayed attempt (non-fatal).
    const drain = await webhookService.drainOnce();
    void auditLogService
      .log({
        userId: req.user!.sub,
        workspaceId: req.workspaceId!,
        action: 'webhook_dead_letter.replayed',
        entityType: 'webhook_delivery',
        entityId: req.params.id,
      })
      .catch(() => undefined);
    return res.json({ replayed: true, drain });
  } catch (err) {
    console.error('webhooks: replay failed:', err);
    return res.status(500).json({ message: 'Failed to replay dead letter' });
  }
});
