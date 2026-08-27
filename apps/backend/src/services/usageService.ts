import { query } from '../config/db';

/**
 * Phase 7 — product usage intelligence (Step 23–26). Bounded, tenant-aware,
 * privacy-minimal: metadata is size-capped by the schema and never carries
 * payloads/credentials (validated at ingest).
 */
const ALLOWED_EVENT_NAMES = new Set([
  'feature_opened', 'feature_used', 'workflow_started', 'workflow_completed',
  'workflow_abandoned', 'error_occurred', 'sync_failed', 'sync_completed',
  'export_generated', 'appointment_created', 'customer_created',
  'order_created', 'measurement_created', 'fitting_completed',
  'api_request', // Phase 8 developer-API metering (method/path/status only)
]);
const SENSITIVE_KEY = /password|token|secret|apikey|authorization|databaseurl/i;

function sanitizeMetadata(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k)) continue; // telemetry injection guard (Step 44/49)
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

export const usageService = {
  /**
   * Phase 8 — bounded developer-API metering. Records ONE row per API call
   * with only {method, path, status}; never the key, headers, query or body.
   */
  async recordApiCall(input: {
    workspaceId: string;
    keyPrefix: string;
    method: string;
    path: string;
    status: number;
  }) {
    await query(
      `INSERT INTO usage_events (workspace_id, session_id, event_name, feature, module, metadata)
       VALUES ($1, $2, 'api_request', 'developer_api', 'api', $3)`,
      [
        input.workspaceId,
        input.keyPrefix.slice(0, 64),
        JSON.stringify(sanitizeMetadata({
          method: input.method,
          path: input.path.slice(0, 128),
          status: input.status,
        })),
      ]
    );
  },

  async ingest(workspaceId: string, userId: string, events: Array<Record<string, unknown>>) {
    if (!Array.isArray(events) || events.length === 0) {
      return { accepted: 0, rejected: 1, reason: 'events array required' };
    }
    if (events.length > 200) return { accepted: 0, rejected: events.length, reason: 'batch too large (max 200)' };

    const values: string[] = [];
    const params: unknown[] = [];
    let accepted = 0;
    let rejected = 0;
    let i = 0;

    for (const e of events) {
      const eventName = String(e.eventName ?? '');
      if (!ALLOWED_EVENT_NAMES.has(eventName)) {
        rejected++;
        continue;
      }
      const base = i * 9;
      values.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}::jsonb)`
      );
      params.push(
        workspaceId, userId,
        typeof e.sessionId === 'string' ? e.sessionId.slice(0, 64) : null,
        eventName,
        typeof e.feature === 'string' ? e.feature.slice(0, 64) : null,
        typeof e.module === 'string' ? e.module.slice(0, 64) : null,
        typeof e.appVersion === 'string' ? e.appVersion.slice(0, 16) : null,
        typeof e.platform === 'string' ? e.platform.slice(0, 16) : null,
        JSON.stringify(sanitizeMetadata(e.metadata)),
      );
      accepted++;
      i++;
    }

    if (accepted > 0) {
      await query(
        `INSERT INTO usage_events
           (workspace_id, user_id, session_id, event_name, feature, module, app_version, platform, metadata)
         VALUES ${values.join(',')}`,
        params
      );
    }
    return { accepted, rejected };
  },

  /** Workspace-level aggregation (workspace scope only). */
  async workspaceSummary(workspaceId: string, days = 30) {
    const [active, features, workflows] = await Promise.all([
      query(
        `SELECT
           COUNT(DISTINCT user_id)::int AS active_users,
           COUNT(*)::int AS total_events
         FROM usage_events
         WHERE workspace_id = $1 AND occurred_at > NOW() - ($2::int * INTERVAL '1 day')`,
        [workspaceId, days]
      ),
      query(
        `SELECT feature, COUNT(*)::int AS uses
         FROM usage_events
         WHERE workspace_id = $1 AND feature IS NOT NULL
           AND occurred_at > NOW() - ($2::int * INTERVAL '1 day')
         GROUP BY feature ORDER BY uses DESC LIMIT 20`,
        [workspaceId, days]
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE event_name = 'workflow_started')::int AS started,
           COUNT(*) FILTER (WHERE event_name = 'workflow_completed')::int AS completed,
           COUNT(*) FILTER (WHERE event_name = 'workflow_abandoned')::int AS abandoned,
           COUNT(*) FILTER (WHERE event_name = 'sync_failed')::int AS sync_failed,
           COUNT(*) FILTER (WHERE event_name = 'error_occurred')::int AS errors
         FROM usage_events
         WHERE workspace_id = $1 AND occurred_at > NOW() - ($2::int * INTERVAL '1 day')`,
        [workspaceId, days]
      ),
    ]);
    return {
      windowDays: days,
      activity: active.rows[0],
      featureAdoption: features.rows,
      workflows: workflows.rows[0],
    };
  },

  /** Platform-level aggregation — PLATFORM roles only (route-gated). */
  async platformSummary(days = 30) {
    const [workspaces, dau, wau, mau, features, versions] = await Promise.all([
      query(
        `SELECT COUNT(DISTINCT workspace_id)::int AS active_workspaces
         FROM usage_events WHERE occurred_at > NOW() - ($1::int * INTERVAL '1 day')`,
        [days]
      ),
      query(
        `SELECT COUNT(DISTINCT workspace_id)::int AS dau FROM usage_events
         WHERE occurred_at > NOW() - INTERVAL '1 day'`
      ),
      query(
        `SELECT COUNT(DISTINCT workspace_id)::int AS wau FROM usage_events
         WHERE occurred_at > NOW() - INTERVAL '7 day'`
      ),
      query(
        `SELECT COUNT(DISTINCT workspace_id)::int AS mau FROM usage_events
         WHERE occurred_at > NOW() - INTERVAL '30 day'`
      ),
      query(
        `SELECT feature, COUNT(DISTINCT workspace_id)::int AS workspaces, COUNT(*)::int AS uses
         FROM usage_events WHERE feature IS NOT NULL
           AND occurred_at > NOW() - ($1::int * INTERVAL '1 day')
         GROUP BY feature ORDER BY uses DESC LIMIT 30`,
        [days]
      ),
      query(
        `SELECT app_version, COUNT(*)::int AS events,
                COUNT(*) FILTER (WHERE event_name = 'error_occurred')::int AS errors
         FROM usage_events WHERE app_version IS NOT NULL
           AND occurred_at > NOW() - ($1::int * INTERVAL '1 day')
         GROUP BY app_version ORDER BY events DESC`,
        [days]
      ),
    ]);
    return {
      windowDays: days,
      activeWorkspaces: workspaces.rows[0].active_workspaces,
      dailyActive: dau.rows[0].dau,
      weeklyActive: wau.rows[0].wau,
      monthlyActive: mau.rows[0].mau,
      featureAdoption: features.rows,
      versionHealth: versions.rows,
    };
  },

  /** Product health signals (Step 26) — signals, NOT diagnoses. */
  async healthSignals(workspaceId?: string) {
    const result = await query(
      `SELECT event_name, COUNT(*)::int AS n
       FROM usage_events
       WHERE occurred_at > NOW() - INTERVAL '24 hours'
         AND ($1::text IS NULL OR workspace_id = $1)
         AND event_name IN ('error_occurred','sync_failed','workflow_abandoned')
       GROUP BY event_name`,
      [workspaceId ?? null]
    );
    const map = new Map(result.rows.map((r) => [r.event_name, r.n]));
    const previous = await query(
      `SELECT event_name, COUNT(*)::int AS n
       FROM usage_events
       WHERE occurred_at > NOW() - INTERVAL '48 hours' AND occurred_at <= NOW() - INTERVAL '24 hours'
         AND ($1::text IS NULL OR workspace_id = $1)
         AND event_name IN ('error_occurred','sync_failed','workflow_abandoned')
       GROUP BY event_name`,
      [workspaceId ?? null]
    );
    const prevMap = new Map(previous.rows.map((r) => [r.event_name, r.n]));
    return ['error_occurred', 'sync_failed', 'workflow_abandoned'].map((name) => ({
      signal: name,
      last24h: map.get(name) ?? 0,
      prior24h: prevMap.get(name) ?? 0,
      trend: (map.get(name) ?? 0) > (prevMap.get(name) ?? 0) * 1.5 ? 'rising' : 'stable',
    }));
  },
};
