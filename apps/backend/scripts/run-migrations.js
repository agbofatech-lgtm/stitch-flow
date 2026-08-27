#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * StitchFlow migration runner.
 *
 * Applies the SQL files in apps/backend/migrations (lexicographic order),
 * tracking applied migrations in `schema_migrations`. Each migration runs in
 * its own transaction; a failure rolls back that migration and aborts.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/run-migrations.js          # apply pending
 *   DATABASE_URL=postgres://... node scripts/run-migrations.js --verify # report only
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const verifyOnly = process.argv.includes('--verify');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const appliedResult = await pool.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.name));

    const pending = files.filter((file) => !applied.has(file));

    console.log(`Migrations: ${files.length} total, ${applied.size} applied, ${pending.length} pending`);

    if (verifyOnly) {
      for (const file of files) {
        console.log(`  ${applied.has(file) ? 'APPLIED' : 'PENDING'}  ${file}`);
      }
      process.exit(pending.length === 0 ? 0 : 2);
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  APPLIED  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAILED   ${file}`);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log('Migration run complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
