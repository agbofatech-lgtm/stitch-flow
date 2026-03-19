import { query } from '../config/db';

export const auditLogRepository = {
  async create(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: any;
  }) {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.userId || null, data.action, data.entityType, data.entityId || null, JSON.stringify(data.metadata || {})]
    );
  },

  async list(limit: number, offset: number) {
    const result = await query(
      `SELECT * FROM audit_logs WHERE deleted_at IS NULL
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }
};
