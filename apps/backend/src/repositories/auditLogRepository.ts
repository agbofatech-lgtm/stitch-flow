import { query } from '../config/db';

export const auditLogRepository = {
  async create(data: {
    userId?: string | null;
    workspaceId?: string | null;
    requestId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: unknown;
  }) {
    await query(
      `INSERT INTO audit_logs (user_id, workspace_id, request_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId || null,
        data.workspaceId || null,
        data.requestId || null,
        data.action,
        data.entityType,
        data.entityId || null,
        JSON.stringify(data.metadata ?? {}),
      ]
    );
  },

  /**
   * Phase 10: optional filters (action / entity type / entity id) for the
   * Control Center audit view; existing positional callers keep working.
   */
  async list(limit: number, offset: number, filters?: { action?: string; entityType?: string; entityId?: string }) {
    const clauses: string[] = ['deleted_at IS NULL'];
    const args: unknown[] = [];
    if (filters?.action) {
      args.push(filters.action);
      clauses.push(`action = $${args.length}`);
    }
    if (filters?.entityType) {
      args.push(filters.entityType);
      clauses.push(`entity_type = $${args.length}`);
    }
    if (filters?.entityId) {
      args.push(filters.entityId);
      clauses.push(`entity_id = $${args.length}`);
    }
    args.push(limit, offset);
    const result = await query(
      `SELECT * FROM audit_logs WHERE ${clauses.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args
    );
    return result.rows;
  }
};
