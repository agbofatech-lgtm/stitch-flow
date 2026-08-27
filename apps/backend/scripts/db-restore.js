#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * StitchFlow logical database restore (Phase 6, Step 28).
 *
 * Restores a backup produced by scripts/db-backup.js into a FRESHLY
 * MIGRATED database (run scripts/run-migrations.js first — the restore
 * never creates schema, it only restores data, so schema ownership stays
 * with the migrations).
 *
 * Safety properties:
 * - Verifies every table file's sha256 against the manifest first.
 * - Restores inside ONE transaction: any failure rolls back completely.
 * - Resets the sync_changes sequence past the restored maximum so the
 *   monotonic cursor can never regress or collide after a restore.
 * - Verifies restored row counts against the manifest before committing.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/db-restore.js <backup-dir>
 * Exit: 0 ok · 1 restore failed · 2 manifest/checksum mismatch
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const TABLES = require('./db-backup-tables');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const backupDir = process.argv[2];
  if (!databaseUrl || !backupDir) {
    console.error('Usage: DATABASE_URL=... node scripts/db-restore.js <backup-dir>');
    process.exit(1);
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`no manifest at ${manifestPath}`);
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Phase 1: verify checksums (fail before touching the database).
  for (const table of TABLES) {
    const entry = manifest.tables[table];
    if (!entry) {
      console.error(`manifest missing table: ${table}`);
      process.exit(2);
    }
    const file = path.join(backupDir, `${table}.jsonl`);
    if (!fs.existsSync(file)) {
      console.error(`backup file missing: ${file}`);
      process.exit(2);
    }
    const body = fs.readFileSync(file, 'utf8');
    const sha = crypto.createHash('sha256').update(body).digest('hex');
    if (sha !== entry.sha256) {
      console.error(`checksum mismatch for ${table} — backup corrupt`);
      process.exit(2);
    }
  }
  console.log('checksum verification: OK');

  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear any seeded rows so the restore is the sole source of truth.
    await client.query(`TRUNCATE TABLE ${TABLES.join(', ')} CASCADE`);

    // Phase 2: load data (FK-safe order).
    for (const table of TABLES) {
      const file = path.join(backupDir, `${table}.jsonl`);
      const lines = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((l) => l.trim().length > 0);
      if (lines.length === 0) continue;

      const BATCH = 500;
      for (let i = 0; i < lines.length; i += BATCH) {
        const batch = lines.slice(i, i + BATCH);
        await client.query(
          `INSERT INTO ${table} SELECT (json_populate_recordset(null::${table}, $1)).*`,
          [`[${batch.join(',')}]`]
        );
      }
      console.log(`  ${table.padEnd(34)} ${lines.length} rows restored`);
    }

    // Phase 3: sequences must continue PAST the restored maximum
    // (sync cursor monotonicity is a hard system invariant).
    await client.query(
      `SELECT setval(pg_get_serial_sequence('sync_changes','seq'),
                      GREATEST(COALESCE((SELECT MAX(seq) FROM sync_changes), 0) + 1, 1), false)`
    );

    // Phase 4: verify counts before committing.
    for (const table of TABLES) {
      const expected = manifest.tables[table].rows;
      const res = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
      if (res.rows[0].n !== expected) {
        throw new Error(
          `row-count mismatch for ${table}: restored ${res.rows[0].n}, expected ${expected}`
        );
      }
    }

    await client.query('COMMIT');
    console.log('\nRESTORE RESULT: OK — counts verified against manifest');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('restore failed (rolled back):', err.message);
    client.release();
    await pool.end();
    process.exit(1);
  }

  client.release();
  await pool.end();
}

main();
