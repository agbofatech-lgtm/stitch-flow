/**
 * Phase 6 — Security regression suite.
 *
 * Part A (in-process): injection payloads, malformed inputs, sanitization.
 * Part B (live): boots the REAL server (src/server.ts) in production mode
 * with a restrictive configuration and verifies externally observable
 * behavior: CORS allowlist, security headers, real auth rate-limit
 * thresholds (429 + standard headers), payload limit (413), malformed JSON
 * (400), and health endpoints in production mode.
 */
import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser } from './helpers';

// ---------------------------------------------------------------------------
// Windows environment fix: ensure npx is in PATH for child process spawns
// ---------------------------------------------------------------------------
if (process.platform === 'win32') {
  const nodeBinDir = 'C:\\nvm4w\\nodejs';
  const pathEnv = process.env.PATH || '';
  if (!pathEnv.split(';').includes(nodeBinDir)) {
    process.env.PATH = nodeBinDir + ';' + pathEnv;
  }
}

const PORT = 5598;
const BASE = `http://127.0.0.1:${PORT}`;
const ALLOWED_ORIGIN = 'https://app.stitchflow.example';

// ---------------------------------------------------------------------------
// Part A — injection & malformed input (in-process)
// ---------------------------------------------------------------------------
describe('Phase 6 — input security (in-process)', () => {
  it('SQL injection payloads are stored as inert data, never executed', async () => {
    const session = await registerUser('p6-sqli-' + Date.now() + '@test.local');
    const payload = {
      fullName: "'; DROP TABLE customers; --",
      phone: "1' OR '1'='1'; DROP TABLE audit_logs; --",
    };
    const res = await asUser(session).post('/customers').send(payload);
    expect(res.status).toBe(201);

    const rows = await query(`SELECT COUNT(*)::int AS n FROM customers`);
    expect(rows.rows[0].n).toBeGreaterThanOrEqual(1); // table intact
    const audit = await query(`SELECT COUNT(*)::int AS n FROM audit_logs`);
    expect(audit.rows[0].n).toBeGreaterThanOrEqual(1); // audit table intact

    const listed = await asUser(session).get('/customers');
    const stored = listed.body.find((c: { fullName: string }) => c.fullName === payload.fullName);
    expect(stored).toBeDefined(); // payload round-trips as DATA, not code
  });

  it('XSS payloads do not execute server-side and responses stay application/json', async () => {
    const session = await registerUser('p6-xss-' + Date.now() + '@test.local');
    const res = await asUser(session)
      .post('/customers')
      .send({ fullName: '<script>alert("xss")</script>', phone: '<img src=x onerror=alert(1)>' });
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    // Stored as text — React escapes at render; nothing evaluates here.
    expect(res.body.fullName).toContain('<script>');
  });

  it('invalid UUID path parameters produce 4xx, never 500', async () => {
    const session = await registerUser('p6-uuid-' + Date.now() + '@test.local');
    const res = await asUser(session).get('/customers/definitely-not-a-uuid');
    expect([400, 404]).toContain(res.status);
  });

  it('invalid date and non-finite numeric order fields are rejected with 400 (not 500)', async () => {
    const session = await registerUser('p6-date-' + Date.now() + '@test.local');
    const customer = await asUser(session)
      .post('/customers')
      .send({ fullName: 'Date Test', phone: '+233500000010' });

    const badDate = await asUser(session)
      .post('/orders')
      .send({
        customerId: customer.body.id,
        orderNumber: 'P6-BAD-1',
        orderType: 'custom',
        totalAmount: 10,
        dueDate: 'not-a-date-at-all',
      });
    expect(badDate.status).toBe(400);

    const badAmount = await asUser(session)
      .post('/orders')
      .send({
        customerId: customer.body.id,
        orderNumber: 'P6-BAD-2',
        orderType: 'custom',
        totalAmount: 'ten cedis',
      });
    expect(badAmount.status).toBe(400);
  });

  it('malformed JSON body produces 400 VALIDATION_ERROR (not 500)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": broken json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Part B — live production-mode server
// ---------------------------------------------------------------------------
describe('Phase 6 — production configuration (live server)', () => {
  let server: ChildProcess;
  const waitFor = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeAll(async () => {
    server = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
        CORS_ORIGIN: ALLOWED_ORIGIN,
        MAX_PAYLOAD_SIZE: '32kb',
        LOG_LEVEL: 'warn',
        SHUTDOWN_TIMEOUT_MS: '3000',
      },
      stdio: 'ignore',
      shell: true, // <-- ADDED FOR WINDOWS
    });
    // Wait for the listener.
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`${BASE}/health/live`);
        if (res.ok) break;
      } catch {
        /* not up yet */
      }
      await waitFor(500);
      if (i === 59) throw new Error('production-mode test server failed to start');
    }
  }, 60000);

  afterAll(async () => {
    if (server && !server.killed) {
      server.kill('SIGTERM');
      await waitFor(300);
      server.kill('SIGKILL');
    }
  });

  it('health endpoints respond in production mode', async () => {
    const live = await fetch(`${BASE}/health/live`);
    expect(live.status).toBe(200);
    const ready = await fetch(`${BASE}/health/ready`);
    expect(ready.status).toBe(200);
    const version = await fetch(`${BASE}/health/version`);
    expect((await version.json()).version).toBe('1.0.0');
  });

  it('CORS: only the allowlisted origin is reflected — no wildcard/reflection of arbitrary origins', async () => {
    const allowed = await fetch(`${BASE}/health`, {
      headers: { Origin: ALLOWED_ORIGIN },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);

    const evil = await fetch(`${BASE}/health`, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('security headers (helmet) are present on every response', async () => {
    const res = await fetch(`${BASE}/health`);
    const h = res.headers;
    expect(h.get('x-content-type-options')).toBe('nosniff');
    expect(h.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(h.get('referrer-policy')).toBe('no-referrer');
    expect(h.get('content-security-policy')).toContain("default-src 'self'");
    expect(h.get('strict-transport-security')).toContain('max-age');
    expect(h.get('x-request-id')).toBeTruthy();
    // No credential material in response headers.
    const all = [...h.entries()].map(([k, v]) => `${k}: ${v}`).join('\n');
    for (const banned of ['JWT_SECRET', 'DATABASE_URL', 'PAYSTACK', 'password']) {
      expect(all).not.toContain(banned);
    }
  });

  it('auth rate limit: 6th login attempt within the window is 429 with standard headers', async () => {
    let saw429 = false;
    let lastHeaders: Headers | null = null;
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'rate-limit-probe@test.local', password: 'wrong-password-123' }),
      });
      lastHeaders = res.headers;
      if (res.status === 429) {
        saw429 = true;
        break;
      }
      expect(res.status).toBe(401); // failing logins, not crashes
    }
    expect(saw429).toBe(true);
    expect(lastHeaders!.get('ratelimit-remaining')).toBe('0');
    expect(lastHeaders!.get('retry-after')).toBeTruthy();
  });

  it('oversized payload is rejected with 413 PAYLOAD_TOO_LARGE (limit 32kb in this configuration)', async () => {
    const big = JSON.stringify({ identifier: 'x@y.test', password: 'p'.repeat(64 * 1024) });
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: big,
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('graceful shutdown: SIGTERM closes the listener promptly', async () => {
    const proc = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT + 1),
        CORS_ORIGIN: ALLOWED_ORIGIN,
        LOG_LEVEL: 'warn',
      },
      stdio: 'ignore',
      shell: true, // <-- ADDED FOR WINDOWS
    });
    // wait for start
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT + 1}/health/live`);
        if (res.ok) break;
      } catch {
        /* retry */
      }
      await waitFor(500);
    }
    const start = Date.now();
    const exited = new Promise<number>((resolve) => {
      proc.on('exit', (code) => resolve(Date.now() - start));
    });
    proc.kill('SIGTERM');
    const elapsed = await exited;
    expect(elapsed).toBeLessThan(10000); // well under the 10s hard timeout
  }, 60000);
});