import { query } from '../config/db';
import { ApiError } from '../utils/apiError';
import { scheduleWebhookDrain } from './webhookService';

/** Phase 7 — feature flags (server-authoritative, Step 58). */
export const featureFlagService = {
  async isEnabled(key: string): Promise<boolean> {
    const result = await query(`SELECT enabled FROM feature_flags WHERE flag_key = $1`, [key]);
    return result.rows[0]?.enabled === true;
  },
  async list() {
    const result = await query(`SELECT flag_key, enabled, description, updated_at FROM feature_flags ORDER BY flag_key`);
    return result.rows;
  },
  async set(key: string, enabled: boolean, updatedBy: string) {
    const result = await query(
      `UPDATE feature_flags SET enabled = $2, updated_by = $3, updated_at = NOW()
       WHERE flag_key = $1 RETURNING flag_key, enabled`,
      [key, enabled, updatedBy]
    );
    if (result.rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Unknown feature flag');
    return result.rows[0];
  },
};

/** Phase 7 — integration outbox (Step 37): idempotent event emission. */
export const outboxService = {
  async record(event: {
    workspaceId: string;
    eventType: string;
    entityType?: string | null;
    entityId?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<{ recorded: boolean }> {
    // Idempotent emission: skip if this (workspace, event, entity) was
    // already enqueued. The partial unique index backstops concurrent races
    // (a 23505 there is swallowed as an acceptable best-effort loss).
    const result = await query(
      `INSERT INTO integration_outbox (workspace_id, event_type, entity_type, entity_id, payload)
       SELECT $1,$2,$3,$4,$5
       WHERE NOT EXISTS (
         SELECT 1 FROM integration_outbox
         WHERE workspace_id = $1 AND event_type = $2 AND entity_id IS NOT DISTINCT FROM $4
       )
       RETURNING outbox_id`,
      [event.workspaceId, event.eventType, event.entityType ?? null, event.entityId ?? null, JSON.stringify(event.payload ?? {})]
    );
    const recorded = result.rows.length > 0;
    if (recorded) {
      // Webhook drain is scheduled OFF the response path: business flow is
      // never blocked by webhook delivery (single-flight, unref'd timer).
      scheduleWebhookDrain();
    }
    return { recorded };
  },

  async list(workspaceId: string, status?: string) {
    const result = await query(
      `SELECT * FROM integration_outbox
       WHERE workspace_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY created_at DESC LIMIT 200`,
      [workspaceId, status ?? null]
    );
    return result.rows;
  },
};

/** Phase 7 — developer control-plane overview (Step 28) — PLATFORM roles only. */
export const controlPlaneService = {
  async workspacesOverview(limit = 100) {
    const result = await query(
      `SELECT
         w.id, w.name, w.created_at,
         s.plan_code AS plan, s.status AS subscription_status,
         (SELECT COUNT(*)::int FROM workspace_users wu WHERE wu.workspace_id = w.id) AS members,
         (SELECT COUNT(*)::int FROM customers c WHERE c.workspace_id = w.id AND c.deleted_at IS NULL) AS customers,
         (SELECT COUNT(*)::int FROM orders o WHERE o.workspace_id = w.id AND o.deleted_at IS NULL) AS orders,
         (SELECT MAX(ue.occurred_at) FROM usage_events ue WHERE ue.workspace_id = w.id) AS last_activity,
         (SELECT COUNT(*)::int FROM error_records er WHERE er.workspace_id = w.id AND er.occurred_at > NOW() - INTERVAL '7 days') AS errors_7d,
         (SELECT COUNT(*)::int FROM usage_events ue2 WHERE ue2.workspace_id = w.id AND ue2.event_name = 'sync_failed' AND ue2.occurred_at > NOW() - INTERVAL '7 days') AS sync_failures_7d
       FROM workspaces w
       LEFT JOIN subscriptions s ON s.workspace_id = w.id
          AND s.status IN ('trialing','active','past_due','paused')
       ORDER BY w.created_at DESC LIMIT $1`,
      [Math.min(limit, 200)]
    );
    return result.rows;
  },

  /** Feature usage across workspaces (Step 29). */
  async featureUsage(feature?: string) {
    const result = await query(
      `SELECT feature, COUNT(DISTINCT workspace_id)::int AS workspaces, COUNT(*)::int AS uses
       FROM usage_events
       WHERE feature IS NOT NULL AND ($1::text IS NULL OR feature = $1)
         AND occurred_at > NOW() - INTERVAL '30 days'
       GROUP BY feature ORDER BY uses DESC`,
      [feature ?? null]
    );
    return result.rows;
  },
};
