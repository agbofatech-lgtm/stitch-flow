import crypto from 'crypto';
import { pool, query } from '../config/db';
import { env } from '../config/env';
import { checkWebhookUrl } from '../security/webhookUrlPolicy';
import { encryptSecret, decryptSecret } from '../utils/secretBox';

/**
 * Phase 8 — Webhook delivery engine (Subsystem 2).
 *
 * Builds ON integration_outbox (Phase 7): the outbox stays the durable
 * event queue; this service drains it into per-endpoint deliveries.
 *
 * Guarantees:
 * - one delivery row per attempt (delivery_key idempotency)
 * - bounded exponential backoff, per-endpoint configurable
 * - permanent HTTP failures (4xx except 429) dead-letter immediately
 * - business transactions NEVER block on webhook delivery (drain is
 *   scheduled off the response path; single-flight + unref'd timer)
 * - claim path uses FOR UPDATE SKIP LOCKED (safe under concurrency)
 */

const WEBHOOK_SECRET_PREFIX = 'whsec_';
const DEFAULT_MAX_ATTEMPTS = 8;

export function generateWebhookSecret(): { secret: string; prefix: string } {
  const secret = `${WEBHOOK_SECRET_PREFIX}${crypto.randomBytes(24).toString('base64url')}`;
  return { secret, prefix: secret.slice(0, WEBHOOK_SECRET_PREFIX.length + 8) };
}

// ---------- Signature ----------
export function signWebhookPayload(secret: string, body: string, timestampSec = Math.floor(Date.now() / 1000)): string {
  const mac = crypto.createHmac('sha256', secret).update(`${timestampSec}.${body}`).digest('hex');
  return `t=${timestampSec},v1=${mac}`;
}

export type SignatureVerification =
  | { ok: true; timestamp: number }
  | { ok: false; code: 'WEBHOOK_SIGNATURE_INVALID' | 'WEBHOOK_REPLAY_REJECTED'; reason: string };

/** Receiver-side verification (exported for tests + receiver documentation). */
export function verifyWebhookSignature(
  secret: string,
  header: string,
  body: string,
  options: { toleranceSec?: number; now?: number } = {}
): SignatureVerification {
  const tolerance = options.toleranceSec ?? 300;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const m = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(String(header ?? ''));
  if (!m) return { ok: false, code: 'WEBHOOK_SIGNATURE_INVALID', reason: 'malformed signature header' };
  const t = Number(m[1]);
  if (Math.abs(now - t) > tolerance) {
    return { ok: false, code: 'WEBHOOK_REPLAY_REJECTED', reason: `timestamp ${t} outside ±${tolerance}s of ${now}` };
  }
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(m[2], 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 'WEBHOOK_SIGNATURE_INVALID', reason: 'HMAC mismatch' };
  }
  return { ok: true, timestamp: t };
}

// ---------- Delivery classification ----------
/** Caller handles 2xx before classifying; only failure classes land here. */
function classifyResponse(status: number | null, networkError: boolean): 'transient' | 'permanent' {
  if (networkError) return 'transient'; // timeout, DNS, connection refused
  if (status === null) return 'transient';
  if (status === 429 || status >= 500) return 'transient';
  return 'permanent'; // other 4xx: retrying will not change the outcome
}

type OutboxRow = {
  outbox_id: string;
  workspace_id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
};

type EndpointRow = {
  id: string;
  workspace_id: string;
  url: string;
  status: string;
  subscribed_events: string[];
  secret_encrypted: string;
  max_attempts: number;
  backoff_base_seconds: number;
};

type DeliveryRow = {
  id: string;
  delivery_key: string;
  workspace_id: string;
  endpoint_id: string | null;
  outbox_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  attempt: number;
  status: string;
};

export const webhookService = {
  // ---------- Outbox → deliveries ----------
  /**
   * Drain PENDING outbox rows into per-endpoint delivery rows (idempotent).
   * Returns how many outbox rows were dispatched/skipped.
   */
  async dispatchOutbox(limit = 50): Promise<{ dispatched: number; skipped: number; enqueued: number }> {
    const client = await pool.connect();
    let dispatched = 0;
    let skipped = 0;
    let enqueued = 0;
    try {
      await client.query('BEGIN');
      const outboxResult = await client.query<OutboxRow>(
        `SELECT outbox_id, workspace_id, event_type, entity_type, entity_id, payload
         FROM integration_outbox
         WHERE status = 'PENDING'
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit]
      );
      for (const event of outboxResult.rows) {
        const endpoints = await client.query<EndpointRow>(
          `SELECT id, workspace_id, url, status, subscribed_events, secret_encrypted, max_attempts, backoff_base_seconds
           FROM webhook_endpoints
           WHERE workspace_id = $1 AND status = 'active'
             AND (subscribed_events @> ARRAY[$2]::text[] OR '@all' = ANY(subscribed_events))`,
          [event.workspace_id, event.event_type]
        );
        if (endpoints.rows.length === 0) {
          await client.query(
            `UPDATE integration_outbox SET status = 'SKIPPED', processed_at = NOW(), attempts = attempts + 1 WHERE outbox_id = $1`,
            [event.outbox_id]
          );
          skipped++;
          continue;
        }
        for (const ep of endpoints.rows) {
          const key = `${event.outbox_id}:${ep.id}:1`;
          const inserted = await client.query(
            `INSERT INTO webhook_deliveries (delivery_key, workspace_id, endpoint_id, outbox_id, event_type, payload, attempt, status)
             VALUES ($1,$2,$3,$4,$5,$6,1,'PENDING')
             ON CONFLICT (delivery_key) DO NOTHING
             RETURNING id`,
            [key, event.workspace_id, ep.id, event.outbox_id, event.event_type, JSON.stringify(event.payload ?? {})]
          );
          if (inserted.rows.length > 0) enqueued++;
        }
        await client.query(
          `UPDATE integration_outbox SET status = 'DISPATCHED', processed_at = NOW(), attempts = attempts + 1 WHERE outbox_id = $1`,
          [event.outbox_id]
        );
        dispatched++;
      }
      await client.query('COMMIT');
      return { dispatched, skipped, enqueued };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  },

  // ---------- Delivery attempts ----------
  /** Deliver all due attempts (PENDING whose backoff elapsed + stale DELIVERING recovery). */
  async drainOnce(limit = 20): Promise<{ delivered: number; retried: number; deadLettered: number; claimed: number }> {
    const timeoutMs = Number(process.env.WEBHOOK_DELIVERY_TIMEOUT_MS ?? env.WEBHOOK_DELIVERY_TIMEOUT_MS ?? 10000);
    const client = await pool.connect();
    let claimed: DeliveryRow[] = [];
    try {
      await client.query('BEGIN');
      const due = await client.query<DeliveryRow>(
        `SELECT d.id, d.delivery_key, d.workspace_id, d.endpoint_id, d.outbox_id, d.event_type, d.payload, d.attempt, d.status
         FROM webhook_deliveries d
         WHERE (d.status = 'PENDING' AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW()))
            OR (d.status = 'DELIVERING' AND d.updated_at < NOW() - ($2 * INTERVAL '2 milliseconds'))
         ORDER BY d.created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit, timeoutMs]
      );
      // claim: mark DELIVERING so other workers skip them
      const ids = due.rows.map((r) => r.id);
      if (ids.length > 0) {
        await client.query(`UPDATE webhook_deliveries SET status = 'DELIVERING', updated_at = NOW() WHERE id = ANY($1)`, [ids]);
      }
      await client.query('COMMIT');
      claimed = due.rows;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
      throw err;
    }
    client.release();

    let delivered = 0;
    let retried = 0;
    let deadLettered = 0;
    for (const d of claimed) {
      const outcome = await webhookService.attemptDelivery(d, timeoutMs);
      if (outcome === 'DELIVERED') delivered++;
      else if (outcome === 'RETRYING') retried++;
      else deadLettered++;
    }
    return { delivered, retried, deadLettered, claimed: claimed.length };
  },

  /** Perform ONE delivery attempt and record the outcome. */
  async attemptDelivery(d: DeliveryRow, timeoutMs: number): Promise<'DELIVERED' | 'RETRYING' | 'DEAD_LETTER'> {
    if (!d.endpoint_id) {
      await query(
        `UPDATE webhook_deliveries SET status = 'DEAD_LETTER', failure_reason = 'ENDPOINT_DELETED', updated_at = NOW() WHERE id = $1`,
        [d.id]
      );
      return 'DEAD_LETTER';
    }
    const epResult = await query<EndpointRow>(
      `SELECT id, workspace_id, url, status, subscribed_events, secret_encrypted, max_attempts, backoff_base_seconds
       FROM webhook_endpoints WHERE id = $1 AND workspace_id = $2`,
      [d.endpoint_id, d.workspace_id]
    );
    const ep = epResult.rows[0];
    if (!ep) {
      await query(
        `UPDATE webhook_deliveries SET status = 'DEAD_LETTER', failure_reason = 'ENDPOINT_NOT_FOUND', updated_at = NOW() WHERE id = $1`,
        [d.id]
      );
      return 'DEAD_LETTER';
    }
    if (ep.status !== 'active') {
      await query(
        `UPDATE webhook_deliveries SET status = 'DEAD_LETTER', failure_reason = 'WEBHOOK_DISABLED', next_retry_at = NULL, updated_at = NOW() WHERE id = $1`,
        [d.id]
      );
      return 'DEAD_LETTER';
    }
    // SSRF re-validation on EVERY attempt (registration check is not enough).
    const urlCheck = checkWebhookUrl(ep.url);
    if (!urlCheck.ok) {
      await query(
        `UPDATE webhook_deliveries SET status = 'DEAD_LETTER', failure_reason = $2, next_retry_at = NULL, updated_at = NOW() WHERE id = $1`,
        [d.id, `UNSAFE_DESTINATION:${urlCheck.reason}`]
      );
      return 'DEAD_LETTER';
    }

    const body = JSON.stringify({
      id: d.outbox_id,
      eventType: d.event_type,
      workspaceId: d.workspace_id,
      payload: d.payload ?? {},
      occurredAt: new Date().toISOString(),
    });
    let secret: string;
    try {
      secret = decryptSecret(ep.secret_encrypted);
    } catch {
      await query(
        `UPDATE webhook_deliveries SET status = 'DEAD_LETTER', failure_reason = 'SECRET_UNREADABLE', updated_at = NOW() WHERE id = $1`,
        [d.id]
      );
      return 'DEAD_LETTER';
    }
    const signature = signWebhookPayload(secret, body);
    const started = Date.now();
    let responseStatus: number | null = null;
    let networkError: string | null = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'StitchFlow-Webhooks/1.0',
            'X-StitchFlow-Signature': signature,
            'X-StitchFlow-Event': d.event_type,
            'X-StitchFlow-Delivery': d.id,
            'X-StitchFlow-Workspace': d.workspace_id,
          },
          body,
          signal: controller.signal,
        });
        responseStatus = response.status;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      // Node fetch aborts throw DOMException (not instanceof Error).
      const name = (err as { name?: string } | null)?.name;
      networkError = name === 'AbortError' ? `timeout after ${timeoutMs}ms` : err instanceof Error ? err.message : 'network error';
    }
    const elapsed = Date.now() - started;

    if (responseStatus !== null && responseStatus >= 200 && responseStatus < 300) {
      await query(
        `UPDATE webhook_deliveries
         SET status = 'DELIVERED', response_status = $2, response_time_ms = $3, delivered_at = NOW(),
             next_retry_at = NULL, failure_reason = NULL, updated_at = NOW()
         WHERE id = $1`,
        [d.id, responseStatus, elapsed]
      );
      await query(
        `UPDATE webhook_endpoints SET last_delivery_at = NOW(), failure_count = 0, updated_at = NOW() WHERE id = $1`,
        [d.endpoint_id]
      );
      return 'DELIVERED';
    }

    const kind = networkError !== null ? 'transient' : classifyResponse(responseStatus, false);
    const reason = networkError ?? `HTTP ${responseStatus}`;
    const maxAttempts = ep.max_attempts ?? DEFAULT_MAX_ATTEMPTS;

    if (kind === 'permanent' || d.attempt >= maxAttempts) {
      await query(
        `UPDATE webhook_deliveries
         SET status = 'DEAD_LETTER', response_status = $2, response_time_ms = $3, failure_reason = $4,
             next_retry_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [d.id, responseStatus, elapsed, `${kind === 'permanent' ? 'permanent' : 'attempts-exhausted'}: ${reason}`]
      );
      await query(
        `UPDATE webhook_endpoints SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = $1`,
        [d.endpoint_id]
      );
      return 'DEAD_LETTER';
    }

    // Transient: schedule the next attempt as a NEW row (history preserved).
    const backoffMs = ep.backoff_base_seconds * 1000 * Math.pow(2, d.attempt - 1);
    await query(
      `UPDATE webhook_deliveries
       SET status = 'RETRYING', response_status = $2, response_time_ms = $3, failure_reason = $4, updated_at = NOW()
       WHERE id = $1`,
      [d.id, responseStatus, elapsed, reason]
    );
    const nextKey = `${d.outbox_id ?? 'na'}:${d.endpoint_id}:${d.attempt + 1}`;
    await query(
      `INSERT INTO webhook_deliveries (delivery_key, workspace_id, endpoint_id, outbox_id, event_type, payload, attempt, status, next_retry_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8)
       ON CONFLICT (delivery_key) DO NOTHING`,
      [nextKey, d.workspace_id, d.endpoint_id, d.outbox_id, d.event_type, JSON.stringify(d.payload ?? {}), d.attempt + 1, backoffMs > 0 ? new Date(Date.now() + backoffMs) : null]
    );
    await query(
      `UPDATE webhook_endpoints SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = $1`,
      [d.endpoint_id]
    );
    return 'RETRYING';
  },

  /** Authorized replay of a dead-lettered delivery: NEW attempt row, history untouched. */
  async replayDeadLetter(workspaceId: string, deliveryId: string): Promise<'queued' | 'not_found' | 'not_dead_letter'> {
    const existing = await query<DeliveryRow & { max_attempts: number }>(
      `SELECT d.*, 0 AS max_attempts FROM webhook_deliveries d WHERE d.id = $1 AND d.workspace_id = $2`,
      [deliveryId, workspaceId]
    );
    const row = existing.rows[0];
    if (!row) return 'not_found';
    if (row.status !== 'DEAD_LETTER') return 'not_dead_letter';
    if (!row.endpoint_id) return 'not_found'; // endpoint deleted — nothing to replay to
    const nextAttempt = row.attempt + 1;
    const key = `${row.outbox_id ?? 'replay'}:${row.endpoint_id}:${nextAttempt}`;
    const insert = await query(
      `INSERT INTO webhook_deliveries (delivery_key, workspace_id, endpoint_id, outbox_id, event_type, payload, attempt, status, next_retry_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',NULL)
       ON CONFLICT (delivery_key) DO NOTHING
       RETURNING id`,
      [key, workspaceId, row.endpoint_id, row.outbox_id, row.event_type, JSON.stringify(row.payload ?? {}), nextAttempt]
    );
    if (insert.rows.length === 0) {
      // Replay already queued — idempotent success.
      return 'queued';
    }
    return 'queued';
  },

  // ---------- Endpoint management ----------
  async createEndpoint(input: {
    workspaceId: string;
    createdBy: string;
    url: string;
    description?: string;
    subscribedEvents: string[];
    maxAttempts?: number;
    backoffBaseSeconds?: number;
  }): Promise<{ ok: true; endpoint: Record<string, unknown>; secret: string } | { ok: false; code: string }> {
    const check = checkWebhookUrl(input.url);
    if (!check.ok) return { ok: false, code: `UNSAFE_WEBHOOK_URL:${check.reason}` };
    const { secret, prefix } = generateWebhookSecret();
    const result = await query(
      `INSERT INTO webhook_endpoints
         (workspace_id, created_by, url, description, status, subscribed_events, secret_prefix, secret_encrypted, max_attempts, backoff_base_seconds)
       VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9)
       RETURNING id, workspace_id, url, description, status, subscribed_events, secret_prefix,
                 max_attempts, backoff_base_seconds, failure_count, last_delivery_at, created_at`,
      [
        input.workspaceId, input.createdBy, input.url, String(input.description ?? '').slice(0, 300),
        input.subscribedEvents, prefix, encryptSecret(secret),
        input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, input.backoffBaseSeconds ?? 30,
      ]
    );
    return { ok: true, endpoint: result.rows[0], secret };
  },

  async listEndpoints(workspaceId: string) {
    const result = await query(
      `SELECT e.id, e.workspace_id, e.url, e.description, e.status, e.subscribed_events, e.secret_prefix,
              e.max_attempts, e.backoff_base_seconds, e.failure_count, e.last_delivery_at, e.created_at, e.updated_at,
              (SELECT COUNT(*)::int FROM webhook_deliveries d WHERE d.endpoint_id = e.id) AS total_deliveries,
              (SELECT COUNT(*)::int FROM webhook_deliveries d WHERE d.endpoint_id = e.id AND d.status = 'DELIVERED') AS delivered_count,
              (SELECT COUNT(*)::int FROM webhook_deliveries d WHERE d.endpoint_id = e.id AND d.status = 'DEAD_LETTER') AS dead_letter_count
       FROM webhook_endpoints e WHERE e.workspace_id = $1 ORDER BY e.created_at DESC`,
      [workspaceId]
    );
    return result.rows;
  },

  async listDeliveries(workspaceId: string, status?: string, limit = 100) {
    const result = await query(
      `SELECT d.id, d.delivery_key, d.workspace_id, d.endpoint_id, d.outbox_id, d.event_type, d.attempt,
              d.status, d.response_status, d.response_time_ms, d.next_retry_at, d.delivered_at, d.failure_reason, d.created_at
       FROM webhook_deliveries d
       WHERE d.workspace_id = $1 AND ($2::text IS NULL OR d.status = $2)
       ORDER BY d.created_at DESC LIMIT $3`,
      [workspaceId, status ?? null, Math.min(limit, 200)]
    );
    return result.rows;
  },
};

// ---------- Non-blocking drain scheduling ----------
let drainScheduled = false;
export function scheduleWebhookDrain(delayMs = 100): void {
  if (drainScheduled) return; // single-flight
  drainScheduled = true;
  const timer = setTimeout(async () => {
    drainScheduled = false;
    try {
      await webhookService.dispatchOutbox();
      await webhookService.drainOnce();
    } catch {
      // Webhook failure must never bubble into business flows.
    }
  }, delayMs);
  if (typeof timer.unref === 'function') timer.unref(); // never hold the process open
}
