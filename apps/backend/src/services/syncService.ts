import { ApiError } from '../utils/apiError';
import { syncRepository } from '../repositories/syncRepository';
import { auditLogService } from './auditLogService';

export const syncService = {
  async push(userId: string, changes: any[]) {
    const serialized = JSON.stringify({ changes });
    if (Buffer.byteLength(serialized, 'utf8') > 1024 * 1024) {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Sync payload exceeds 1MB');
    }

    for (const change of changes) {
      const recordId = change.data.id || change.clientId;

      await syncRepository.createSyncChange({
        userId,
        tableName: change.table,
        operation: change.operation,
        recordId,
        clientId: change.clientId,
        data: {
          ...change.data,
          version: change.data.version || 1,
          updatedAt: change.data.updatedAt || new Date().toISOString(),
          deletedAt: change.operation === 'delete' ? new Date().toISOString() : change.data.deletedAt || null
        },
        occurredAt: change.timestamp
      });
    }

    await auditLogService.log({
      userId,
      action: 'sync_push',
      entityType: 'sync',
      metadata: { count: changes.length }
    });

    return { accepted: changes.length };
  },

  async pull(userId: string, since: string, tablesCsv: string) {
    const tables = tablesCsv.split(',').map((t) => t.trim());
    const changes = await syncRepository.pullChanges(userId, tables, since);

    return {
      changes: changes.map((c: any) => ({
        table: c.table_name,
        operation: c.operation,
        data: c.payload,
        timestamp: c.occurred_at
      })),
      timestamp: new Date().toISOString()
    };
  }
};
