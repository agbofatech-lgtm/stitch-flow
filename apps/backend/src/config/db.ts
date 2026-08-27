import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { env } from './env';
import { logger } from './logger';
import { metrics } from './observability/metrics';

/**
 * Production connection pool (Phase 6 hardening).
 *
 * Explicit limits and timeouts so a sick database degrades the service
 * predictably instead of pinning unbounded sockets/memory:
 * - max connections per process
 * - connectionTimeoutMillis: acquiring a client fails fast
 * - idleTimeoutMillis: idle clients are reaped
 * - statement_timeout: runaway queries are killed server-side
 * - pool 'error' handler: an idle-client disconnect must never crash the
 *   process (unhandled 'error' on the pool is fatal in Node).
 */
const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // Idle client error — log and keep serving; the pool replaces the client.
  metrics.databaseErrors.inc();
  logger.error({ err: err.message, requestId: undefined }, 'database pool idle-client error');
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  try {
    return await pool.query<T>(text, params);
  } catch (err) {
    metrics.databaseErrors.inc();
    throw err;
  }
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
