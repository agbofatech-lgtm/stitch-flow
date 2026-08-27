import { query } from '../config/db';
import { logger } from '../config/logger';
import { redactDeep } from '../utils/redact';

/**
 * Customer timeline (Phase 7, Step 10): durable business events per
 * customer. Deliberately SEPARATE from audit_logs (who-did-what for
 * compliance), usage_events (product analytics) and the integration outbox
 * (external automation) — four event classes, four stores.
 *
 * Recording is best-effort AFTER business success: a timeline failure must
 * never fail or delay a business transaction (analytics is subordinate).
 */
export const VALID_TIMELINE_EVENTS = new Set([
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'MEASUREMENT_UPDATED',
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_COMPLETED',
  'FITTING_CREATED',
  'FITTING_COMPLETED',
  'PAYMENT_RECORDED',
  'REFERRAL_CREATED',
  'REFERRAL_CONVERTED',
  'CUSTOMER_MESSAGE_SENT',
  'CUSTOMER_MESSAGE_RECEIVED',
  'CUSTOMER_FEEDBACK_SUBMITTED',
]);

export const timelineService = {
  async record(entry: {
    workspaceId: string;
    customerId: string;
    eventType: string;
    actorUserId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!VALID_TIMELINE_EVENTS.has(entry.eventType)) {
      logger.warn({ eventType: entry.eventType }, 'timeline: unknown event type ignored');
      return;
    }
    try {
      await query(
        `INSERT INTO customer_timeline_entries
           (workspace_id, customer_id, event_type, actor_user_id, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.workspaceId,
          entry.customerId,
          entry.eventType,
          entry.actorUserId ?? null,
          entry.entityType ?? null,
          entry.entityId ?? null,
          JSON.stringify(entry.metadata ? redactDeep(entry.metadata) : {}),
        ]
      );
    } catch (err) {
      // Subordinate to business operations: log, never throw (Step 55).
      logger.warn(
        { err: err instanceof Error ? err.message : err, customerId: entry.customerId },
        'timeline: recording failed (non-fatal)'
      );
    }
  },

  async list(workspaceId: string, customerId: string, limit = 100, before?: string) {
    const capped = Math.min(Math.max(limit, 1), 200);
    const result = await query(
      `SELECT id, event_type, actor_user_id, entity_type, entity_id, metadata, occurred_at
       FROM customer_timeline_entries
       WHERE workspace_id = $1 AND customer_id = $2
         AND ($3::timestamptz IS NULL OR occurred_at < $3::timestamptz)
       ORDER BY occurred_at DESC
       LIMIT $4`,
      [workspaceId, customerId, before ?? null, capped]
    );
    return result.rows;
  },
};
