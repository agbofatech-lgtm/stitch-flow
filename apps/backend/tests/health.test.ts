/**
 * Phase 6 health endpoint tests.
 *
 * Covers the four-endpoint contract (Step 8) plus failure semantics:
 * readiness must NOT report ready when the database is unreachable, and
 * must not leak driver error details; version must match package metadata.
 */
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/config/db';
describe('Phase 6 — health endpoints', () => {
  it('GET /health keeps the legacy contract (status ok + version)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /health/live reports liveness without dependency checks', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  it('GET /health/ready reports ready with database up', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database).toBe('up');
    expect(typeof res.body.checks.latencyMs).toBe('number');
  });

  it('GET /health/version returns authoritative metadata and no secrets', async () => {
    const res = await request(app).get('/health/version');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.node).toMatch(/^v\d+/);
    expect(typeof res.body.uptimeSeconds).toBe('number');
    // Never any credential material on this surface.
    const serialized = JSON.stringify(res.body);
    for (const banned of ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'PAYSTACK']) {
      expect(serialized).not.toContain(banned);
    }
  });

  it('GET /health/version matches backend package.json version (no drift)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json');
    const res = await request(app).get('/health/version');
    expect(res.body.version).toBe(pkg.version);
  });

  describe('database unavailable', () => {
    const originalQuery = pool.query.bind(pool);

    afterEach(() => {
      pool.query = originalQuery;
    });

    it('GET /health/ready returns 503 and does not leak driver internals', async () => {
      pool.query = (async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.9:5432 postgres://secret-host/db');
      }) as typeof pool.query;

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.checks.database).toBe('down');
      // No host/DSN/driver detail may escape the readiness surface.
      expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
      expect(JSON.stringify(res.body)).not.toContain('secret-host');
    });

    it('GET /health and /health/live stay 200 during a DB outage (process vs deps)', async () => {
      pool.query = (async () => {
        throw new Error('db down');
      }) as typeof pool.query;

      expect((await request(app).get('/health/live')).status).toBe(200);
      expect((await request(app).get('/health')).status).toBe(200);
    });
  });
});
