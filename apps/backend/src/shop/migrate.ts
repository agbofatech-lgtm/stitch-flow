import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Pool } from 'pg';

export const SHOP_MIGRATION_FILES = ['001_init_extensions.sql', '007_shop_authority.sql'] as const;

function checksum(sql: string) {
  return createHash('sha256').update(sql).digest('hex');
}

export async function applyShopMigrations(pool: Pool, migrationsDir: string) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await pool.query<{ id: string; checksum: string }>(
    `SELECT id, checksum FROM schema_migrations`
  );
  const byId = new Map(applied.rows.map((row) => [row.id, row.checksum]));

  for (const file of SHOP_MIGRATION_FILES) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const sum = checksum(sql);
    const existing = byId.get(file);
    if (existing) {
      if (existing !== sum) {
        throw new Error(`Migration checksum mismatch: ${file}`);
      }
      continue;
    }
    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)`, [file, sum]);
  }

  return { applied: SHOP_MIGRATION_FILES.slice() };
}

export function defaultMigrationsDir() {
  return join(__dirname, '..', '..', 'migrations');
}
