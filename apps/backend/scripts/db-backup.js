#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * StitchFlow logical database backup (Phase 6, Step 27/28).
 *
 * Portable, dependency-free logical backup: every table is exported as
 * JSON Lines (row_to_json) inside ONE repeatable-read transaction, so the
 * dump is a consistent point-in-time snapshot even while the database is
 * serving traffic. A manifest records table names, row counts, checksums,
 * and database identification for restore-time verification.
 *
 * Production deployments should additionally use continuous WAL archiving
 * (pg_dump + base backups); this tool provides an application-level,
 * verifiable backup that works EVERYWHERE (including air-gapped installs)
 * — see docs/PHASE6_BACKUP_RESTORE_RUNBOOK.md.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/db-backup.js ./backups/backup-<ts>
 * Exit: 0 ok · 1 backup failed
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

// FK-safe export order (parents before children) — shared canonical list.
const TABLES = require('./db-backup-tables');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const outDir = process.argv[2];
  if (!databaseUrl || !outDir) {
    console.error('Usage: DATABASE_URL=... node scripts/db-backup.js <output-dir>');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();

  const manifest = {
    tool: 'stitchflow-db-backup/1.0',
    createdAt: new Date().toISOString(),
    database: databaseUrl.replace(/\/\/[^@]*@/, '//***@'), // no credentials in manifest
    tables: {},
  };

  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');

    for (const table of TABLES) {
      // row_to_json(...)::text returns the RAW JSON text — NUMERIC values
      // keep their exact decimal representation (e.g. 120.50 stays
      // "120.50" instead of collapsing to 120.5 through JS float parsing).
      // This matters for financial columns: the backup must be lossless.
      const res = await client.query(`SELECT row_to_json(t)::text AS row FROM ${table} t`);
      const lines = res.rows.map((r) => r.row);
      const body = lines.length ? lines.join('\n') + '\n' : '';
      fs.writeFileSync(path.join(outDir, `${table}.jsonl`), body);
      manifest.tables[table] = {
        rows: res.rows.length,
        sha256: crypto.createHash('sha256').update(body).digest('hex'),
      };
      console.log(`  ${table.padEnd(34)} ${res.rows.length} rows`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('backup failed:', err.message);
    client.release();
    await pool.end();
    process.exit(1);
  }

  client.release();
  await pool.end();

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const totalRows = Object.values(manifest.tables).reduce((a, t) => a + t.rows, 0);
  console.log(`\nBACKUP RESULT: OK — ${totalRows} rows, ${TABLES.length} tables → ${outDir}`);
}

main();
