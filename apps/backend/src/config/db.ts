import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params);
}

/**
 * Minimal query surface satisfied by both the shared pool wrapper and a
 * checked-out PoolClient — lets services run inside or outside an open
 * transaction (Phase 5).
 */
export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
}

export async function testDbConnection() {
  const result = await pool.query<{ now: string }>('select now() as now');
  return result.rows[0];
}
