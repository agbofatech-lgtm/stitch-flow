/**
 * Phase 6 observability tests: request correlation, structured metrics,
 * redaction, and audit correlation (workspace + requestId on audit rows).
 *
 * NOTE: tests/setup.ts truncates all tables before EACH test — sessions
 * must be created inside the test that uses them (repo convention).
 */
import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser } from './helpers';
import { redactDeep } from '../src/utils/redact';
import { metrics, metricsSnapshot, resetMetrics } from '../src/config/observability/metrics';

describe('Phase 6 — request correlation (X-Request-Id)', () => {
  it('generates and echoes a request id on every response', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    const id = res.headers['x-request-id'];
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[A-Za-z0-9._-]{8,128}$/);
  });

  it('honors a valid incoming X-Request-Id (correlation passthrough)', async () => {
    const res = await request(app)
      .get('/health')
      .set('X-Request-Id', 'corr-test-1234');
    expect(res.headers['x-request-id']).toBe('corr-test-1234');
  });

  it('replaces hostile / oversized / malformed request ids (never trusted)', async () => {
    for (const bad of [
      // (control characters like \n are rejected by the HTTP layer itself)
      'short', // below min length
      'x'.repeat(200), // above max length
      'drop table--123456', // spaces / sql-ish content
    ]) {
      const res = await request(app).get('/health').set('X-Request-Id', bad);
      expect(res.headers['x-request-id']).not.toBe(bad);
      expect(res.headers['x-request-id']).toMatch(/^[A-Za-z0-9._-]{8,128}$/);
    }
  });

  it('error bodies carry the same requestId as the response header', async () => {
    const res = await request(app).get('/customers'); // unauthenticated -> 401
    expect(res.status).toBe(401);
    const headerId = res.headers['x-request-id'];
    expect(headerId).toBeTruthy();
    expect(res.body.error.requestId).toBe(headerId);
  });
});

describe('Phase 6 — in-process metrics', () => {
  it('counts requests, 4xx, and latency after traffic', async () => {
    resetMetrics();
    await request(app).get('/health');
    await request(app).get('/definitely-not-a-route'); // 404 -> 4xx
    const snap = metricsSnapshot();
    expect(snap.counters['http.requests']).toBeGreaterThanOrEqual(2);
    expect(snap.counters['http.responses']).toBeGreaterThanOrEqual(2);
    expect(snap.counters['http.4xx']).toBeGreaterThanOrEqual(1);
    expect(snap.histograms['http.latency_ms'].count).toBeGreaterThanOrEqual(2);
    expect(snap.histograms['http.latency_ms'].p95).toBeGreaterThanOrEqual(0);
  });

  it('classifies failed logins as auth.failures', async () => {
    resetMetrics();
    await request(app)
      .post('/auth/login')
      .send({ identifier: 'ghost@nowhere.test', password: 'wrong-password' });
    expect(metricsSnapshot().counters['auth.failures']).toBeGreaterThanOrEqual(1);
  });

  it('GET /admin/metrics is denied without authentication', async () => {
    const res = await request(app).get('/admin/metrics');
    expect(res.status).toBe(401);
  });

  it('GET /admin/metrics serves a snapshot to admins', async () => {
    const session = await registerUser('p6-admin-' + Date.now() + '@test.local');
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [session.userId]);
    const login = await request(app)
      .post('/auth/login')
      .send({ identifier: session.email, password: 'password123' });
    const token = login.body.accessToken;

    const res = await request(app)
      .get('/admin/metrics')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.counters).toBeDefined();
    expect(res.body.histograms['http.latency_ms']).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('JWT_SECRET');
  });
});

describe('Phase 6 — recursive redaction (redactDeep)', () => {
  it('redacts sensitive keys in flat objects regardless of case', () => {
    const out = redactDeep({
      password: 'hunter2',
      EMAIL: 'a@b.c',
      Authorization: 'Bearer xyz',
    });
    expect(out.password).toBe('[REDACTED]');
    expect((out as Record<string, unknown>).EMAIL).toBe('a@b.c'); // not sensitive
    expect((out as Record<string, unknown>).Authorization).toBe('[REDACTED]');
  });

  it('redacts inside nested objects and arrays', () => {
    const out = redactDeep({
      user: { name: 'Ama', credentials: { refreshToken: 'rt-1', apiKey: 'k-1' } },
      history: [{ token: 't1' }, { ok: 'safe' }],
    }) as Record<string, any>;
    expect(out.user.name).toBe('Ama');
    expect(out.user.credentials.refreshToken).toBe('[REDACTED]');
    expect(out.user.credentials.apiKey).toBe('[REDACTED]');
    expect(out.history[0].token).toBe('[REDACTED]');
    expect(out.history[1].ok).toBe('safe');
  });

  it('redacts substring key variants (DATABASE_URL, PAYSTACK_SECRET_KEY)', () => {
    const out = redactDeep({
      DATABASE_URL: 'postgres://u:p@h/db',
      PAYSTACK_SECRET_KEY: 'sk_live_x',
      nested: { jwt_secret: 'abc' },
    }) as Record<string, any>;
    expect(out.DATABASE_URL).toBe('[REDACTED]');
    expect(out.PAYSTACK_SECRET_KEY).toBe('[REDACTED]');
    expect(out.nested.jwt_secret).toBe('[REDACTED]');
  });

  it('handles Maps, Errors, and circular references without throwing', () => {
    const circ: Record<string, unknown> = { name: 'x' };
    circ.self = circ;
    const err = new Error('boom');
    (err as Error & { apiKey: string }).apiKey = 'leaky';
    const out = redactDeep({ m: new Map([['token', 'v']]), e: err, c: circ }) as Record<string, any>;
    expect(out.m.get('[REDACTED]')).toBe('v');
    expect(out.m.has('token')).toBe(false);
    expect(out.e.apiKey).toBe('[REDACTED]');
    expect(out.e.message).toBe('boom');
    expect(out.c.self).toBe('[CIRCULAR]');
  });
});

describe('Phase 6 — audit correlation', () => {
  it('customer creation writes an audit row with workspace + request correlation', async () => {
    const session = await registerUser('p6-audit-' + Date.now() + '@test.local');
    const res = await asUser(session)
      .post('/customers')
      .set('X-Request-Id', 'audit-corr-0001')
      .send({ fullName: 'Audit Corr', phone: '+233500000001' });
    expect(res.status).toBe(201);

    const audit = await query(
      `SELECT action, workspace_id, request_id FROM audit_logs
       WHERE action = 'CUSTOMER_CREATED' AND entity_id = $1`,
      [res.body.id]
    );
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0].workspace_id).toBe(session.workspaceId);
    expect(audit.rows[0].request_id).toBe('audit-corr-0001');
  });

  it('customer update writes a CUSTOMER_UPDATED audit row', async () => {
    const session = await registerUser('p6-audit-upd-' + Date.now() + '@test.local');
    const created = await asUser(session)
      .post('/customers')
      .send({ fullName: 'Before', phone: '+233500000003' });
    const res = await asUser(session)
      .put(`/customers/${created.body.id}`)
      .send({ fullName: 'After', phone: '+233500000003' });
    expect(res.status).toBe(200);

    const audit = await query(
      `SELECT action, request_id FROM audit_logs
       WHERE action = 'CUSTOMER_UPDATED' AND entity_id = $1`,
      [created.body.id]
    );
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0].request_id).toBeTruthy();
  });

  it('login audit rows carry request correlation', async () => {
    const session = await registerUser('p6-login-' + Date.now() + '@test.local');
    const res = await request(app)
      .post('/auth/login')
      .set('X-Request-Id', 'login-corr-0002')
      .send({ identifier: session.email, password: 'password123' });
    expect(res.status).toBe(200);

    const audit = await query(
      `SELECT request_id FROM audit_logs
       WHERE action = 'user_logged_in' AND user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [session.userId]
    );
    expect(audit.rows.length).toBeGreaterThanOrEqual(1);
    expect(audit.rows[0].request_id).toBe('login-corr-0002');
  });

  it('order status transitions are audited as ORDER_STATUS_CHANGED', async () => {
    const session = await registerUser('p6-order-' + Date.now() + '@test.local');
    const customer = await asUser(session)
      .post('/customers')
      .send({ fullName: 'Order Client', phone: '+233500000004' });
    const order = await asUser(session)
      .post('/orders')
      .send({
        customerId: customer.body.id,
        orderNumber: 'P6-ORD-1',
        orderType: 'custom',
        totalAmount: 100,
        status: 'draft',
      });
    expect(order.status).toBe(201);

    const updated = await asUser(session)
      .put(`/orders/${order.body.id}`)
      .send({
        customerId: customer.body.id,
        orderNumber: 'P6-ORD-1',
        orderType: 'custom',
        totalAmount: 100,
        status: 'confirmed',
      });
    expect(updated.status).toBe(200);

    const audit = await query(
      `SELECT action, metadata FROM audit_logs
       WHERE entity_id = $1 AND action IN ('ORDER_CREATED', 'ORDER_STATUS_CHANGED')
       ORDER BY created_at ASC`,
      [order.body.id]
    );
    const actions = audit.rows.map((r) => r.action);
    expect(actions).toContain('ORDER_CREATED');
    expect(actions).toContain('ORDER_STATUS_CHANGED');
    const transition = audit.rows.find((r) => r.action === 'ORDER_STATUS_CHANGED');
    expect(transition).toBeDefined();
    expect(transition!.metadata).toMatchObject({ from: 'draft', to: 'confirmed' });
  });

  it('audit metadata is redacted before persistence (defense in depth)', async () => {
    const session = await registerUser('p6-redact-' + Date.now() + '@test.local');
    await asUser(session)
      .post('/customers')
      .send({ fullName: 'Meta Redact', phone: '+233500000002', password: 'sneaky' });

    const rows = await query(
      `SELECT metadata FROM audit_logs WHERE action = 'CUSTOMER_CREATED' ORDER BY created_at DESC LIMIT 1`
    );
    expect(rows.rows.length).toBe(1);
    expect(JSON.stringify(rows.rows[0].metadata)).not.toContain('sneaky');
  });
});

describe('Phase 6 — metrics registry internals', () => {
  it('histogram percentiles behave on a known distribution', () => {
    resetMetrics();
    for (let i = 1; i <= 100; i++) metrics.latency.observe(i);
    const summary = metricsSnapshot().histograms['http.latency_ms'];
    expect(summary.count).toBe(100);
    expect(summary.min).toBe(1);
    expect(summary.max).toBe(100);
    expect(summary.p50).toBe(50);
    expect(summary.p95).toBe(95);
    expect(summary.p99).toBe(99);
    resetMetrics();
  });
});
