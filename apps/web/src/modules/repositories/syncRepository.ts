import { query } from '../config/db';

export const syncRepository = {
  async createSyncChange(change: {
    userId: string;
    tableName: string;
    operation: string;
    recordId: string;
    clientId: string;
    data: any;
    occurredAt: string;
  }) {
    await query(
      `INSERT INTO sync_changes (user_id, table_name, operation, record_id, client_id, payload, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        change.userId,
        change.tableName,
        change.operation,
        change.recordId,
        change.clientId,
        JSON.stringify(change.data),
        change.occurredAt
      ]
    );
  },

  async pullChanges(userId: string, tables: string[], since: string) {
    const result = await query(
      `SELECT * FROM sync_changes
       WHERE user_id = $1
         AND table_name = ANY($2)
         AND occurred_at > $3
         AND deleted_at IS NULL
       ORDER BY occurred_at ASC`,
      [userId, tables, since]
    );
    return result.rows;
  }
};
