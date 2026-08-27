/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const EmbeddedPostgres = require('embedded-postgres').default;

const DATA_DIR = '/tmp/stitchflow-embedded-pg';
const PORT = 5541;
const DB_NAME = 'stitchflow_test';
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

  // Run the real migration runner against the fresh database — this is the
  // Phase 2 "fresh database -> migrations -> correct schema" verification.
  execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'run-migrations.js')], {
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });

  global.__EMBEDDED_PG__ = pg;
};
