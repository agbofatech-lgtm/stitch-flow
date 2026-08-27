import { pool, query } from '../config/db';
import { recordSyncChangeTx } from './syncChangeLog';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

/** Entities whose financial/inventory integrity requires the dedicated event endpoints. */
const EVENT_ONLY_ENTITIES = new Set([
  'payment',
  'payments',
  'material_usage',
  'order_material_usages',
  'invoice',
  'invoices',
]);

export type IncomingMutation = {
  clientMutationId: string;
  entity: string;
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type MutationResult = {
  clientMutationId: string;
  status: 'applied' | 'duplicate' | 'rejected';
  code?: string;
  seq?: string;
};

export const syncV2Service = {
  /**
   * Delta pull: deterministic, workspace-scoped, ordered by the monotonic
   * server cursor (sync_changes.seq / BIGSERIAL). Never depends on client
   * clocks or updatedAt.
   */
  async listChanges(workspaceId: string, cursor: string, limitRaw?: string) {
    const limit = Math.min(Math.max(Number(limitRaw) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const after = /^\d+$/.test(cursor) ? cursor : '0';

    const result = await query(
      `SELECT seq, table_name, operation, record_id, payload, occurred_at, client_mutation_id
       FROM sync_changes
       WHERE workspace_id = $1 AND seq > $2
       ORDER BY seq ASC
       LIMIT $3`,
      [workspaceId, after, limit + 1]
    );

    const hasMore = result.rows.length > limit;
    const page = hasMore ? result.rows.slice(0, limit) : result.rows;
    const nextCursor = page.length > 0 ? String(page[page.length - 1].seq) : after;

    return {
      changes: page.map((row: any) => ({
        seq: String(row.seq),
        entity: row.table_name,
        entityId: row.record_id,
        operation: row.operation,
        payload: row.payload,
        occurredAt: row.occurred_at,
        clientMutationId: row.client_mutation_id,
      })),
      nextCursor,
      hasMore,
    };
  },

  /**
   * Idempotent mutation intake. Each mutation is processed in its own
   * transaction: processed_mutations (idempotency ledger) + sync_changes
   * (change log) commit atomically. A replayed clientMutationId is
   * acknowledged as duplicate without producing a second logical event.
   *
   * Financial/inventory entities are rejected here by design — they must go
   * through their dedicated transactional endpoints (POST /payments,
   * POST /materials/usages) which enforce reconciliation and stock rules.
   */
  async ingestMutations(
    workspaceId: string,
    userId: string,
    mutations: IncomingMutation[]
  ): Promise<MutationResult[]> {
    const results: MutationResult[] = [];

    for (const mutation of mutations) {
      if (EVENT_ONLY_ENTITIES.has(mutation.entity)) {
        results.push({
          clientMutationId: mutation.clientMutationId,
          status: 'rejected',
          code: 'USE_EVENT_ENDPOINT',
        });
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existing = await client.query(
          `SELECT result FROM processed_mutations
           WHERE workspace_id = $1 AND client_mutation_id = $2`,
          [workspaceId, mutation.clientMutationId]
        );

        if (existing.rows.length > 0) {
          await client.query('ROLLBACK');
          results.push({
            clientMutationId: mutation.clientMutationId,
            status: 'duplicate',
            seq: existing.rows[0].result?.seq,
          });
          continue;
        }

        const change = await recordSyncChangeTx(client, {
          workspaceId,
          userId,
          entity: mutation.entity,
          entityId: mutation.entityId,
          operation: mutation.operation,
          payload:
            mutation.operation === 'delete'
              ? { ...mutation.payload, deletedAt: mutation.occurredAt }
              : mutation.payload,
          clientMutationId: mutation.clientMutationId,
          occurredAt: mutation.occurredAt,
        });

        await client.query(
          `INSERT INTO processed_mutations
             (workspace_id, client_mutation_id, user_id, entity, entity_id, operation, result)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            workspaceId,
            mutation.clientMutationId,
            userId,
            mutation.entity,
            mutation.entityId,
            mutation.operation,
            JSON.stringify({ seq: change.seq }),
          ]
        );

        await client.query('COMMIT');
        results.push({
          clientMutationId: mutation.clientMutationId,
          status: 'applied',
          seq: String(change.seq),
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    return results;
  },
};
