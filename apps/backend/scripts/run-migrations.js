#!/usr/bin/env node
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');

const FILES = ['001_init_extensions.sql', '007_shop_authority.sql', '008_shop_sync.sql'];

async function main() {
  const url = process.env.SHOP_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL or SHOP_DATABASE_URL is required');
    process.exit(1);
  }
  const dir = join(__dirname, '..', 'migrations');
  const pool = new Pool({ connectionString: url });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const applied = await pool.query('SELECT id, checksum FROM schema_migrations');
  const byId = new Map(applied.rows.map((row) => [row.id, row.checksum]));
  for (const file of FILES) {
    const sql = readFileSync(join(dir, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    if (byId.has(file)) {
      if (byId.get(file) !== checksum) {
        throw new Error('Migration checksum mismatch: ' + file);
      }
      continue;
    }
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)', [file, checksum]);
    console.log('applied', file);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
