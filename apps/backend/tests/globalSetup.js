// Increase timeouts for Windows/Docker environment.
process.env.PG_IDLE_TIMEOUT = '30000';   // 30s idle timeout (default 10s)
process.env.PG_STATEMENT_TIMEOUT = '120000'; // 120s statement timeout (default 60s)

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATA_DIR = '/tmp/stitchflow-embedded-pg';
const PORT = 5541;
const DB_NAME = 'stitchflow_test';

// If DATABASE_URL is already set (e.g., Docker PostgreSQL), skip embedded.
if (process.env.DATABASE_URL) {
  console.log('✅ Using external DATABASE_URL, skipping embedded PostgreSQL.');
  execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'run-migrations.js')], {
    env: process.env,
    stdio: 'inherit',
  });
  // No embedded instance to close; we just run migrations.
  module.exports = async function globalSetup() {
    // nothing to do — migrations already ran
  };
} else {
  // Otherwise, use embedded PostgreSQL.
  const EmbeddedPostgres = require('embedded-postgres').default;
  const DATABASE_URL = `postgresql://postgres:password@127.0.0.1:${PORT}/${DB_NAME}`;

  module.exports = async function globalSetup() {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });

    const pg = new EmbeddedPostgres({
      databaseDir: DATA_DIR,
      user: 'postgres',
      password: 'password',
      port: PORT,
      persistent: false,
    });

    await pg.initialise();
    await pg.start();
    await pg.createDatabase(DB_NAME);

    execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'run-migrations.js')], {
      env: { ...process.env, DATABASE_URL },
      stdio: 'inherit',
    });

    global.__EMBEDDED_PG__ = pg;
  };
}