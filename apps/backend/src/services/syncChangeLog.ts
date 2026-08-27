import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { query } from '../config/db';

export type SyncChangeInput = {
  workspaceId: string;
  userId: string;
  entity: string;
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientMutationId?: string | null;
  occurredAt?: string | Date;
};

const INSERT_SQL = `
  INSERT INTO sync_changes
    (user_id, workspace_id, table_name, operation, record_id, client_id, payload, occurred_at, client_mutation_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING seq
`;

function params(change: SyncChangeInput) {
  return [
    change.userId,
    change.workspaceId,
    change.entity,
    change.operation,
    change.entityId,
    // client_id is a UUID column (sync v1 heritage); server-originated
    // changes get a generated id when no clientMutationId is supplied.
    change.clientMutationId || crypto.randomUUID(),
    JSON.stringify(change.payload),
    change.occurredAt || new Date(),
    change.clientMutationId || null,
  ];
}

/** Record a change using the shared pool (non-transactional callers). */
export async function recordSyncChange(change: SyncChangeInput) {
  const result = await query<{ seq: string }>(INSERT_SQL, params(change));
  return result.rows[0];
}

/**
 * Record a change inside an open transaction — used by integrity-sensitive
 * mutations (payments, inventory) so the business write and its sync event
 * commit or roll back together.
 */
export async function recordSyncChangeTx(client: PoolClient, change: SyncChangeInput) {
  const result = await client.query<{ seq: string }>(INSERT_SQL, params(change));
  return result.rows[0];
}
