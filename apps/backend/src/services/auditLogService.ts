import { auditLogRepository } from '../repositories/auditLogRepository';
import { redactDeep } from '../utils/redact';
import { getRequestContext } from '../config/observability/requestContext';
import type { Queryable } from '../config/db';

/**
 * Audit logging (Phase 6 hardening):
 * - metadata is deep-redacted before persistence so credential material
 *   can never enter the audit trail, even if a future caller passes it;
 * - requestId / workspaceId / actor are auto-filled from the request
 *   context (AsyncLocalStorage) when not supplied explicitly;
 * - `logTx` writes the audit row INSIDE a caller-owned transaction so the
 *   audit record is atomic with the change it describes.
 */
export interface AuditEntry {
  userId?: string | null;
  workspaceId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  metadata?: unknown;
}

function withContext(data: AuditEntry) {
  const ctx = getRequestContext();
  return {
    ...data,
    userId: data.userId ?? ctx.actorId ?? null,
    workspaceId: data.workspaceId ?? ctx.workspaceId ?? null,
    requestId: data.requestId ?? ctx.requestId ?? null,
    metadata: data.metadata === undefined ? {} : redactDeep(data.metadata),
  };
}

export const auditLogService = {
  async log(data: AuditEntry) {
    await auditLogRepository.create(withContext(data));
  },

  /** Audit insert inside a caller-owned transaction (atomic with the change). */
  async logTx(client: Queryable, data: AuditEntry) {
    const entry = withContext(data);
    await client.query(
      `INSERT INTO audit_logs (user_id, workspace_id, request_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.userId,
        entry.workspaceId,
        entry.requestId,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        JSON.stringify(entry.metadata ?? {}),
      ]
    );
  },
};
