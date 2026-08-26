import { Pool, type QueryResultRow } from 'pg';
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

export async function testDbConnection() {
  const result = await pool.query<{ now: string }>('select now() as now');
  return result.rows[0];
}
