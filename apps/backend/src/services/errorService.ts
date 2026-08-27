import { query } from '../config/db';
import { fingerprintError, ruleBasedDiagnosticProvider } from '../providers/RuleBasedDiagnosticProvider';

/**
 * Phase 7 — error center + incident lifecycle (Step 30–32).
 * Repeated identical errors share a fingerprint and roll up into ONE
 * incident with an occurrence count.
 */
export const errorService = {
  async record(entry: {
    workspaceId?: string | null;
    userId?: string | null;
    requestId?: string | null;
    errorCode: string;
    route?: string | null;
    feature?: string | null;
    appVersion?: string | null;
    platform?: string | null;
    severity?: 'warning' | 'error' | 'fatal';
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const fingerprint = fingerprintError({
      errorCode: entry.errorCode,
      route: entry.route,
      feature: entry.feature,
      errorType: entry.errorCode,
    });
    await query(
      `INSERT INTO error_records
         (workspace_id, user_id, request_id, error_code, route, feature, app_version, platform, severity, fingerprint, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        entry.workspaceId ?? null, entry.userId ?? null, entry.requestId ?? null,
        entry.errorCode, entry.route ?? null, entry.feature ?? null,
        entry.appVersion ?? null, entry.platform ?? null,
        entry.severity ?? 'error', fingerprint,
        entry.message.slice(0, 500), JSON.stringify(entry.metadata ?? {}),
      ]
    );
    // Roll up into an incident (idempotent upsert).
    await query(
      `INSERT INTO incidents (fingerprint, title, severity, occurrence_count, last_occurrence_at)
       VALUES ($1, $2, $3, 1, NOW())
       ON CONFLICT (fingerprint) DO UPDATE SET
         occurrence_count = incidents.occurrence_count + 1,
         last_occurrence_at = NOW(),
         updated_at = NOW()`,
      [fingerprint, `${entry.errorCode}${entry.route ? ` @ ${entry.route}` : ''}`, entry.severity ?? 'error']
    );
    return fingerprint;
  },

  async listRecent(scope: { workspaceId?: string; limit?: number } = {}) {
    const result = await query(
      `SELECT * FROM error_records
       WHERE ($1::text IS NULL OR workspace_id = $1)
       ORDER BY occurred_at DESC LIMIT $2`,
      [scope.workspaceId ?? null, Math.min(scope.limit ?? 50, 200)]
    );
    return result.rows;
  },

  async listIncidents() {
    const result = await query(
      `SELECT * FROM incidents ORDER BY last_occurrence_at DESC LIMIT 200`
    );
    return result.rows;
  },

  async updateIncidentStatus(
    fingerprint: string,
    status: string,
    actorUserId: string
  ): Promise<{ ok: boolean; status?: string }> {
    const legal = ['NEW', 'INVESTIGATING', 'KNOWN', 'FIXED', 'RELEASED', 'RESOLVED', 'IGNORED'];
    if (!legal.includes(status)) return { ok: false };
    const result = await query(
      `UPDATE incidents SET status = $2, updated_at = NOW() WHERE fingerprint = $1 RETURNING status`,
      [fingerprint, status]
    );
    if (result.rows.length === 0) return { ok: false };
    void actorUserId; // audited by the caller (platform routes)
    return { ok: true, status: result.rows[0].status };
  },

  /**
   * Advisory diagnosis through the registered DiagnosticProvider — defaults
   * to the deterministic rule-based provider. Never mutates anything.
   */
  async diagnose(fingerprint: string) {
    const incident = await query(`SELECT * FROM incidents WHERE fingerprint = $1`, [fingerprint]);
    if (incident.rows.length === 0) return null;
    const recent = await query(
      `SELECT message, occurred_at, metadata FROM error_records
       WHERE fingerprint = $1 ORDER BY occurred_at DESC LIMIT 10`,
      [fingerprint]
    );
    const output = await ruleBasedDiagnosticProvider.analyzeIncident({
      incidentTitle: incident.rows[0].title,
      fingerprint,
      errorCode: incident.rows[0].title.split(' @ ')[0],
      occurrenceCount: incident.rows[0].occurrence_count,
      recentErrors: recent.rows.map((r) => ({
        message: r.message,
        occurredAt: new Date(r.occurred_at).toISOString(),
        metadata: r.metadata,
      })),
    });
    return output;
  },
};
