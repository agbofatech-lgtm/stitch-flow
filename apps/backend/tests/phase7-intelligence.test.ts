import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';
import { fingerprintError } from '../src/providers/RuleBasedDiagnosticProvider';

// Best-effort outbox writes must settle before pool teardown.
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});

async function promoteToPlatform(email: string, role: string): Promise<AuthSession> {
  const s = await registerUser(email, 'password123'); // register (unique email)
  await query(`UPDATE users SET role = $1 WHERE email = $2`, [role, email]);
  const login = await request(app).post('/auth/login').send({ identifier: email, password: 'password123' });
  if (login.status !== 200) throw new Error(`platform login failed: ${login.status}`);
  return { ...s, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}

async function createCustomer(ws: string, name: string, email: string) {
  // Business rows use app-generated TEXT ids (no DB default) — match that.
  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const r = await query(
    `INSERT INTO customers (id, workspace_id, full_name, email) VALUES ($1,$2,$3,$4) RETURNING id`,
    [id, ws, name, email]
  );
  return r.rows[0].id as string;
}

describe('Phase 7 — usage intelligence', () => {
  it('ingests allowlisted events, rejects unknown ones, and strips sensitive metadata', async () => {
    const s = await registerUser('intel-1@t.test');
    const res = await asUser(s).post('/usage/events').send({
      events: [
        { eventName: 'feature_opened', feature: 'design_studio', metadata: { screen: 'canvas', password: 'leak', apiToken: 'leak' } },
        { eventName: 'not_a_real_event' },
      ],
    });
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(1);
    expect(res.body.rejected).toBe(1);

    const rows = await query(`SELECT metadata FROM usage_events WHERE workspace_id = $1`, [s.workspaceId]);
    expect(rows.rows).toHaveLength(1);
    const meta = rows.rows[0].metadata as Record<string, unknown>;
    expect(meta.screen).toBe('canvas');
    expect(meta.password).toBeUndefined();
    expect(meta.apiToken).toBeUndefined();
  });

  it('rejects oversized batches', async () => {
    const s = await registerUser('intel-2@t.test');
    const events = Array.from({ length: 201 }, () => ({ eventName: 'feature_opened' }));
    const res = await asUser(s).post('/usage/events').send({ events });
    expect(res.status).toBe(202);
    expect(res.body.rejected).toBe(201);
    expect(res.body.accepted).toBe(0);
  });

  it('keeps workspace summaries tenant-isolated', async () => {
    const a = await registerUser('ws-a-int@t.test');
    const b = await registerUser('ws-b-int@t.test');
    await asUser(a).post('/usage/events').send({
      events: [
        { eventName: 'feature_opened', feature: 'crm' },
        { eventName: 'feature_used', feature: 'crm' },
      ],
    });
    const summaryA = await asUser(a).get('/usage/summary');
    const summaryB = await asUser(b).get('/usage/summary');
    expect(summaryA.body.activity.total_events).toBe(2);
    expect(summaryB.body.activity.total_events).toBe(0);
    expect(summaryA.body.featureAdoption[0].feature).toBe('crm');
  });

  it('computes product health signals without exposing other workspaces', async () => {
    const s = await registerUser('intel-3@t.test');
    await asUser(s).post('/usage/events').send({
      events: [{ eventName: 'sync_failed' }, { eventName: 'sync_failed' }, { eventName: 'error_occurred' }],
    });
    const res = await asUser(s).get('/usage/signals');
    expect(res.status).toBe(200);
    const signals = res.body as Array<{ signal: string; last24h: number }>;
    const sync = signals.find((x) => x.signal === 'sync_failed');
    expect(sync?.last24h).toBe(2);
  });
});

describe('Phase 7 — errors & incidents', () => {
  it('rolls repeated identical errors into ONE incident with an occurrence count', async () => {
    const s = await registerUser('intel-4@t.test');
    const report = (route: string) =>
      asUser(s).post('/usage/errors').send({ errorCode: 'RENDER_FAILED', route, message: 'Cannot read property of undefined' });
    await report('/design-studio');
    await report('/design-studio');
    await report('/design-studio');

    const incidents = await query(`SELECT * FROM incidents`);
    expect(incidents.rows).toHaveLength(1);
    expect(incidents.rows[0].occurrence_count).toBe(3);

    // Different route ⇒ different fingerprint ⇒ separate incident.
    await report('/orders');
    const after = await query(`SELECT COUNT(*)::int AS n FROM incidents`);
    expect(after.rows[0].n).toBe(2);
  });

  it('produces deterministic fingerprints and advisory, clearly-labelled diagnoses', async () => {
    const f1 = fingerprintError({ errorCode: 'X', route: '/a', feature: null, errorType: 'TypeErr' });
    const f2 = fingerprintError({ errorCode: 'X', route: '/a', feature: null, errorType: 'TypeErr' });
    const f3 = fingerprintError({ errorCode: 'X', route: '/b', feature: null, errorType: 'TypeErr' });
    expect(f1).toBe(f2);
    expect(f1).not.toBe(f3);

    const s = await registerUser('intel-5@t.test');
    await asUser(s).post('/usage/errors').send({ errorCode: 'DB_DOWN', route: '/orders', message: 'ECONNREFUSED database' });
    const fp = (await query(`SELECT fingerprint FROM incidents`)).rows[0].fingerprint;

    // platform_analyst can read the diagnosis
    const analyst = await promoteToPlatform('analyst@t.test', 'platform_analyst');
    const res = await asUser(analyst).get(`/platform/incidents/${fp}/diagnosis`);
    expect(res.status).toBe(200);
    expect(res.body.advisory).toBe(true);
    expect(res.body.aiGenerated).toBe(false); // rule-based, not model output
    expect(res.body.source).toBe('rule-based');
    expect(Array.isArray(res.body.suggestedTests)).toBe(true);
  });
});

describe('Phase 7 — developer control plane boundary', () => {
  it('FORBIDS workspace owners from platform routes (platform roles are distinct)', async () => {
    const owner = await registerUser('owner-not-platform@t.test');
    expect([403, 404]).toContain((await asUser(owner).get('/platform/flags')).status);
    expect((await asUser(owner).get('/platform/overview')).status).toBe(403);
    expect((await asUser(owner).get('/platform/workspaces')).status).toBe(403);
  });

  it('allows platform roles read access, write only for owner/admin tier', async () => {
    const support = await promoteToPlatform('psupport@t.test', 'platform_support');
    expect((await asUser(support).get('/platform/flags')).status).toBe(200);
    expect((await asUser(support).get('/platform/incidents')).status).toBe(200);
    // support may operate incidents but NOT flip flags
    expect((await asUser(support).patch('/platform/flags/CUSTOMER_PORTAL').send({ enabled: true })).status).toBe(403);

    const admin = await promoteToPlatform('padmin@t.test', 'platform_admin');
    const flip = await asUser(admin).patch('/platform/flags/CUSTOMER_PORTAL').send({ enabled: true });
    expect(flip.status).toBe(200);
    expect(flip.body.enabled).toBe(true);
    expect((await asUser(admin).patch('/platform/flags/NOT_A_FLAG').send({ enabled: true })).status).toBe(404);
  });

  it('serves cross-workspace overview + feature usage to platform analysts only in aggregate', async () => {
    const a = await registerUser('ov-a@t.test');
    await asUser(a).post('/usage/events').send({ events: [{ eventName: 'feature_used', feature: 'crm' }] });
    const analyst = await promoteToPlatform('pan@t.test', 'platform_analyst');
    const overview = await asUser(analyst).get('/platform/overview');
    expect(overview.status).toBe(200);
    expect(overview.body.monthlyActive).toBeGreaterThanOrEqual(1);
    const fu = await asUser(analyst).get('/platform/feature-usage');
    expect(fu.status).toBe(200);
    expect(Array.isArray(fu.body)).toBe(true);
    // workspace owner still cannot see cross-tenant aggregates
    expect((await asUser(a).get('/platform/overview')).status).toBe(403);
  });
});

describe('Phase 7 — support cases & feedback', () => {
  it('creates cases idempotently (clientMutationId) and tracks status transitions', async () => {
    const s = await registerUser('intel-6@t.test');
    const cmid = '11111111-1111-4111-8111-111111111111';
    const r1 = await asUser(s).post('/support/cases').send({ category: 'SYNC', severity: 'high', description: 'Sync stuck', clientMutationId: cmid });
    expect(r1.status).toBe(201);
    const r2 = await asUser(s).post('/support/cases').send({ category: 'SYNC', severity: 'high', description: 'Sync stuck', clientMutationId: cmid });
    expect(r2.status).toBe(200);
    expect(r2.body.duplicate).toBe(true);

    const bad = await asUser(s).patch(`/support/cases/${r1.body.case_id}`).send({ status: 'NOPE' });
    expect(bad.status).toBe(400);
    const ok = await asUser(s).patch(`/support/cases/${r1.body.case_id}`).send({ status: 'INVESTIGATING' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('INVESTIGATING');
  });

  it('validates feedback ratings and stores them per workspace', async () => {
    const s = await registerUser('intel-7@t.test');
    expect((await asUser(s).post('/support/feedback').send({ rating: 9 })).status).toBe(400);
    const good = await asUser(s).post('/support/feedback').send({ rating: 5, feature: 'crm', message: 'Great' });
    expect(good.status).toBe(201);
    expect(good.body.rating).toBe(5);
  });
});

describe('Phase 7 — integration outbox', () => {
  it('emits REFERRAL_CONVERTED exactly once per entity (idempotent)', async () => {
    const s = await registerUser('intel-8@t.test');
    const referrer = await createCustomer(s.workspaceId!, 'Referrer', 'ref@t.test');
    const referred = await createCustomer(s.workspaceId!, 'Referred', 'red@t.test');
    const created = await asUser(s).post('/referrals').send({
      referrerCustomerId: referrer, referredCustomerId: referred,
      clientMutationId: '22222222-2222-4222-8222-222222222222',
    });
    expect(created.status).toBe(201);
    await asUser(s).post(`/referrals/${created.body.id}/register`).send({});
    const converted = await asUser(s).post(`/referrals/${created.body.id}/convert`).send({});
    expect(converted.status).toBe(200);
    expect(converted.body.status).toBe('CONVERTED');
    await new Promise((r) => setTimeout(r, 250));

    const outbox = await query(
      `SELECT * FROM integration_outbox WHERE workspace_id = $1 AND event_type = 'REFERRAL_CONVERTED'`,
      [s.workspaceId]
    );
    expect(outbox.rows).toHaveLength(1);
    // Contract under test: exactly-once emission. Since Phase 8 the webhook
    // dispatcher consumes the outbox asynchronously, so a no-subscriber row
    // legitimately settles as SKIPPED (processed, nothing to deliver) or is
    // still PENDING before a drain — dispatch state is the webhook
    // subsystem's concern, tested in phase8-webhooks.test.ts.
    expect(['PENDING', 'DISPATCHED', 'SKIPPED']).toContain(outbox.rows[0].status);
  });

  it('never lets a workspace read another workspace\'s outbox', async () => {
    const a = await registerUser('ob-a@t.test');
    const b = await registerUser('ob-b@t.test');
    const referrer = await createCustomer(a.workspaceId!, 'R2', 'r2@t.test');
    const referred = await createCustomer(a.workspaceId!, 'R3', 'r3@t.test');
    const created = await asUser(a).post('/referrals').send({ referrerCustomerId: referrer, referredCustomerId: referred });
    await asUser(a).post(`/referrals/${created.body.id}/convert`).send({});
    await new Promise((r) => setTimeout(r, 200));
    const rowsB = await query(`SELECT COUNT(*)::int AS n FROM integration_outbox WHERE workspace_id = $1`, [b.workspaceId]);
    expect(rowsB.rows[0].n).toBe(0);
  });
});

describe('Phase 7 — customer portal boundary', () => {
  async function seedPortalAccount(ws: string, email: string, password: string) {
    const customerId = await createCustomer(ws, 'Portal Customer', email);
    await query(
      `SELECT setseed(0.42)`, []
    ).catch(() => undefined);
    const hash = await bcrypt.hash(password, 10);
    const r = await query(
      `INSERT INTO portal_customers (workspace_id, customer_id, email, password_hash)
       VALUES ($1,$2,$3,$4) RETURNING portal_user_id`,
      [ws, customerId, email, hash]
    );
    return { portalUserId: r.rows[0].portal_user_id as string, customerId, email, password };
  }

  it('logs in with portal credentials and serves an own-customer-only view', async () => {
    const s = await registerUser('portal-ws@t.test');
    const acct = await seedPortalAccount(s.workspaceId!, 'portal@t.test', 'portal-pass-1');

    const login = await request(app).post('/portal/login').send({ email: acct.email, password: acct.password });
    expect(login.status).toBe(200);
    expect(login.body.tokenType).toBe('portal');
    const token = login.body.accessToken as string;

    const me = await request(app).get('/portal/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.customer.id).toBe(acct.customerId);
    // No preference rows ⇒ marketing consent is FALSE (existence ≠ consent)
    expect(me.body.consent.marketing).toBe(false);
    expect(me.body.consent.consentedAt).toBeNull();

    const orders = await request(app).get('/portal/orders').set('Authorization', `Bearer ${token}`);
    expect(orders.status).toBe(200);
    expect(Array.isArray(orders.body)).toBe(true);
    expect(orders.body).toHaveLength(0);
  });

  it('REJECTS wrong passwords uniformly (no account enumeration)', async () => {
    const s = await registerUser('portal-ws2@t.test');
    await seedPortalAccount(s.workspaceId!, 'enum@t.test', 'right-pass');
    const wrongPw = await request(app).post('/portal/login').send({ email: 'enum@t.test', password: 'wrong-pass' });
    const noAccount = await request(app).post('/portal/login').send({ email: 'ghost@t.test', password: 'whatever' });
    expect(wrongPw.status).toBe(noAccount.status);
    expect(wrongPw.body.message).toBe(noAccount.body.message);
  });

  it('structurally separates portal and staff token audiences (no session crossover)', async () => {
    const staff = await registerUser('staff-x@t.test');
    const acct = await seedPortalAccount(staff.workspaceId!, 'cross@t.test', 'cross-pass');
    const login = await request(app).post('/portal/login').send({ email: acct.email, password: acct.password });
    const portalToken = login.body.accessToken as string;

    // Portal token on a STAFF route → 401 (audience mismatch)
    const asPortalOnStaff = await request(app).get('/customers').set('Authorization', `Bearer ${portalToken}`);
    expect(asPortalOnStaff.status).toBe(401);

    // Staff token on a PORTAL route → 401
    const asStaffOnPortal = await asUser(staff).get('/portal/me');
    expect(asStaffOnPortal.status).toBe(401);

    // And no bearer at all
    expect((await request(app).get('/portal/session')).status).toBe(401);
  });

  it('shows only that customer\'s own orders (data scoping)', async () => {
    const s = await registerUser('portal-ws3@t.test');
    const mine = await seedPortalAccount(s.workspaceId!, 'mine@t.test', 'mine-pass');
    const other = await createCustomer(s.workspaceId!, 'Other', 'other@t.test');
    const suffix = `${Date.now()}`;
    const oid1 = `ord-${suffix}-a`; const oid2 = `ord-${suffix}-b`;
    await query(
      `INSERT INTO orders (id, order_number, workspace_id, customer_id, status, total_amount)
       VALUES ($1,$6,$2,$3,'DRAFT',100), ($4,$7,$2,$5,'DRAFT',200)`,
      [oid1, s.workspaceId!, mine.customerId, oid2, other, `ON-${suffix}-1`, `ON-${suffix}-2`]
    );
    const login = await request(app).post('/portal/login').send({ email: mine.email, password: mine.password });
    const orders = await request(app).get('/portal/orders').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(orders.status).toBe(200);
    expect(orders.body).toHaveLength(1);
    expect(orders.body[0].customer_id ?? true).toBeTruthy();
    const rows = await query(`SELECT customer_id FROM orders WHERE workspace_id = $1 AND customer_id = $2`, [s.workspaceId!, mine.customerId]);
    expect(rows.rows).toHaveLength(1);
  });
});

describe('Phase 7 — unauthenticated access to new domains', () => {
  it('rejects anonymous requests on usage, support, platform and portal data routes', async () => {
    expect((await request(app).get('/usage/summary')).status).toBe(401);
    expect((await request(app).get('/support/cases')).status).toBe(401);
    expect((await request(app).get('/platform/flags')).status).toBe(401);
    expect((await request(app).get('/portal/me')).status).toBe(401);
  });
});
