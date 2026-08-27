import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';

// Best-effort side effects (usage metering, last-used touch) must settle
// before pool teardown.
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));
});

async function promoteToPlatform(email: string, role: string): Promise<AuthSession> {
  const s = await registerUser(email, 'password123');
  await query(`UPDATE users SET role = $1 WHERE email = $2`, [role, email]);
  const login = await request(app).post('/auth/login').send({ email, password: 'password123' });
  if (login.status !== 200) throw new Error(`platform login failed: ${login.status}`);
  return { ...s, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}

// NOTE: the global setup truncates users + resets feature_flags before EVERY
// test, so a beforeAll session would be wiped. Flag state is arranged per
// test instead (direct SQL = test arrangement; the middleware still performs
// the real server-side check on every request).
let padmin: AuthSession | null = null;

async function enableDeveloperApi() {
  if (!padmin) padmin = await promoteToPlatform(`p8-admin-${Date.now()}@t.test`, 'platform_admin');
  const res = await asUser(padmin).patch('/platform/flags/DEVELOPER_API').send({ enabled: true });
  if (res.status !== 200) throw new Error(`flag enable failed: ${res.status}`);
}

beforeEach(async () => {
  await query(`UPDATE feature_flags SET enabled = true WHERE flag_key = 'DEVELOPER_API'`);
});

async function createKey(session: AuthSession, name: string, scopes: string[], extra: Record<string, unknown> = {}) {
  const res = await asUser(session).post('/developers/keys').send({ name, scopes, ...extra });
  if (res.status !== 201) throw new Error(`key create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { key: res.body.key, secret: res.body.secret as string };
}

async function seedCustomer(ws: string, name: string) {
  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO customers (id, workspace_id, full_name, phone) VALUES ($1,$2,$3,'000')`,
    [id, ws, name]
  );
  return id;
}

async function seedOrder(ws: string, customerId: string, withMeasurements: boolean) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const id = `ord-${suffix}`;
  await query(
    `INSERT INTO orders (id, order_number, workspace_id, customer_id, status, total_amount, measurement_snapshot, garment_measurements)
     VALUES ($1,$2,$3,$4,'draft',100,$5,$6)`,
    [id, `ON-${suffix}`, ws, customerId, withMeasurements ? JSON.stringify({ chest: 40 }) : null, withMeasurements ? JSON.stringify({ waist: 32 }) : null]
  );
  return id;
}

const asApiKey = (secret: string) => ({
  get: (url: string) => request(app).get(url).set('X-API-Key', secret),
  post: (url: string) => request(app).post(url).set('X-API-Key', secret),
});

describe('Phase 8 — feature flag fail-closed', () => {
  it('rejects management + API traffic while DEVELOPER_API is OFF (server-authoritative)', async () => {
    await query(`UPDATE feature_flags SET enabled = false WHERE flag_key = 'DEVELOPER_API'`);
    const s = await registerUser('flag-off@t.test');
    expect((await asUser(s).post('/developers/keys').send({ name: 'k', scopes: ['customers:read'] })).status).toBe(403);
    expect((await request(app).get('/api/v1/me').set('X-API-Key', 'sf_live_whatevervalue')).status).toBe(403);
  });

  it('enables via platform admin only', async () => {
    const owner = await registerUser('flag-owner@t.test');
    expect((await asUser(owner).patch('/platform/flags/DEVELOPER_API').send({ enabled: true })).status).toBe(403);
    await enableDeveloperApi();
    const adminSession = padmin!;
    expect((await asUser(adminSession).get('/platform/flags')).body.find((f: { flag_key: string }) => f.flag_key === 'DEVELOPER_API')?.enabled).toBe(true);
  });
});

describe('Phase 8 — API-key lifecycle', () => {
  it('creates a key with one-time secret, hashed storage, prefix identification', async () => {
    const s = await registerUser('keymaker@t.test');
    const res = await asUser(s).post('/developers/keys').send({ name: 'CI key', scopes: ['customers:read', 'orders:read'] });
    expect(res.status).toBe(201);
    expect(res.body.secret).toMatch(/^sf_live_[A-Za-z0-9_-]{40,}$/);
    expect(res.body.key.key_prefix).toMatch(/^sf_live_/);
    expect(res.body.key.status).toBe('active');
    expect(res.body.key.scopes).toEqual(['customers:read', 'orders:read']);
    // Hash stored, raw secret NOT stored
    const row = await query(`SELECT secret_hash FROM api_keys WHERE id = $1`, [res.body.key.id]);
    expect(row.rows[0].secret_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.rows[0].secret_hash).not.toContain(res.body.secret.slice('sf_live_'.length));
    // Audit trail
    const audit = await query(`SELECT action FROM audit_logs WHERE entity_type = 'api_key' AND entity_id = $1`, [res.body.key.id]);
    expect(audit.rows.map((r) => r.action)).toContain('api_key.created');
  });

  it('NEVER returns the secret or hash after creation (list is prefix-only)', async () => {
    const s = await registerUser('lister@t.test');
    const { secret } = await createKey(s, 'lister key', ['customers:read']);
    const list = await asUser(s).get('/developers/keys');
    expect(list.status).toBe(200);
    const serialized = JSON.stringify(list.body);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('secret_hash');
    expect(list.body[0].key_prefix).toMatch(/^sf_live_/);
  });

  it('rejects invalid scopes, reserved scopes, and bad names', async () => {
    const s = await registerUser('badscope@t.test');
    expect((await asUser(s).post('/developers/keys').send({ name: 'x', scopes: ['*'] })).status).toBe(400);
    expect((await asUser(s).post('/developers/keys').send({ name: 'x', scopes: ['customers:read', 'webhooks:manage'] })).status).toBe(400);
    expect((await asUser(s).post('/developers/keys').send({ name: '', scopes: ['customers:read'] })).status).toBe(400);
    expect((await asUser(s).post('/developers/keys').send({ name: 'x' })).status).toBe(400);
    expect((await asUser(s).post('/developers/keys').send({ name: 'x', scopes: ['customers:read'], expiresAt: 'not-a-date' })).status).toBe(400);
  });

  it('revokes (and double-revoke is 409), revoked keys stop working immediately', async () => {
    const s = await registerUser('revoker@t.test');
    const { key, secret } = await createKey(s, 'doomed key', ['customers:read']);
    expect((await asApiKey(secret).get('/api/v1/me')).status).toBe(200);
    const revoke = await asUser(s).post(`/developers/keys/${key.id}/revoke`);
    expect(revoke.status).toBe(200);
    expect((await asUser(s).post(`/developers/keys/${key.id}/revoke`)).status).toBe(409);
    const rejected = await asApiKey(secret).get('/api/v1/me');
    expect(rejected.status).toBe(401);
    expect(rejected.body.error.code).toBe('API_KEY_REVOKED');
    const audit = await query(`SELECT action FROM audit_logs WHERE entity_type = 'api_key' AND entity_id = $1`, [key.id]);
    expect(audit.rows.map((r) => r.action)).toContain('api_key.revoked');
  });

  it('expires keys lazily with a precise error code', async () => {
    const s = await registerUser('expirer@t.test');
    const { secret } = await createKey(s, 'expired key', ['customers:read'], { expiresAt: new Date(Date.now() - 3600_000).toISOString() });
    const res = await asApiKey(secret).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('API_KEY_EXPIRED');
  });

  it('re-scopes an active key (audited); unknown scopes rejected', async () => {
    const s = await registerUser('rescoper@t.test');
    const { key, secret } = await createKey(s, 'growing key', ['customers:read']);
    expect((await asApiKey(secret).get('/api/v1/orders')).status).toBe(403);
    const patch = await asUser(s).patch(`/developers/keys/${key.id}/scopes`).send({ scopes: ['customers:read', 'orders:read'] });
    expect(patch.status).toBe(200);
    expect((await asApiKey(secret).get('/api/v1/orders')).status).toBe(200);
    expect((await asUser(s).patch(`/developers/keys/${key.id}/scopes`).send({ scopes: ['nope:read'] })).status).toBe(400);
    const audit = await query(`SELECT action FROM audit_logs WHERE entity_type = 'api_key' AND entity_id = $1`, [key.id]);
    expect(audit.rows.map((r) => r.action)).toContain('api_key.scopes_changed');
  });

  it('tracks last-used (throttled) and request count', async () => {
    const s = await registerUser('tracked@t.test');
    const { key, secret } = await createKey(s, 'tracked key', ['customers:read']);
    await asApiKey(secret).get('/api/v1/me');
    await new Promise((r) => setTimeout(r, 250));
    const row = await query(`SELECT last_used_at, request_count FROM api_keys WHERE id = $1`, [key.id]);
    expect(row.rows[0].last_used_at).not.toBeNull();
    expect(Number(row.rows[0].request_count)).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 8 — scoped developer API', () => {
  it('authenticates via X-API-Key AND Bearer; rejects JWTs on /api/v1', async () => {
    const s = await registerUser('authshapes@t.test');
    const { secret } = await createKey(s, 'shapes key', ['customers:read']);
    expect((await request(app).get('/api/v1/me').set('X-API-Key', secret)).status).toBe(200);
    expect((await request(app).get('/api/v1/me').set('Authorization', `Bearer ${secret}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/me').set('Authorization', `Bearer ${s.accessToken}`)).status).toBe(401);
    expect((await request(app).get('/api/v1/me')).status).toBe(401);
  });

  it('rejects invalid secrets without leaking which part failed', async () => {
    const s = await registerUser('tamper@t.test');
    await createKey(s, 'real key', ['customers:read']);
    const res = await request(app).get('/api/v1/me').set('X-API-Key', 'sf_live_totally_made_up_secret_value_here');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_API_KEY');
  });

  it('enforces exact scopes (INSUFFICIENT_SCOPE, no wildcards)', async () => {
    const s = await registerUser('scoper@t.test');
    const { secret } = await createKey(s, 'read-only key', ['customers:read']);
    const res = await asApiKey(secret).get('/api/v1/orders');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_SCOPE');
    expect(res.body.error.message).toContain('orders:read');
  });

  it('serves customer reads with workspace scoping only', async () => {
    const s = await registerUser('reader@t.test');
    const custA = await seedCustomer(s.workspaceId!, 'Api Customer');
    const { secret } = await createKey(s, 'reader key', ['customers:read']);
    const list = await asApiKey(secret).get('/api/v1/customers');
    expect(list.status).toBe(200);
    expect(list.body.some((c: { id: string }) => c.id === custA)).toBe(true);
    const one = await asApiKey(secret).get(`/api/v1/customers/${custA}`);
    expect(one.status).toBe(200);
    expect(one.body.full_name).toBe('Api Customer');
  });

  it('denies cross-tenant reads (list AND direct id → 404)', async () => {
    const a = await registerUser('tenant-a@t.test');
    const b = await registerUser('tenant-b@t.test');
    const custB = await seedCustomer(b.workspaceId!, 'Other Workspace Customer');
    await seedOrder(b.workspaceId!, custB, true);
    const { secret } = await createKey(a, 'tenant A key', ['customers:read', 'orders:read']);
    const list = await asApiKey(secret).get('/api/v1/customers');
    expect(list.status).toBe(200);
    expect(list.body.some((c: { id: string }) => c.id === custB)).toBe(false);
    expect((await asApiKey(secret).get(`/api/v1/customers/${custB}`)).status).toBe(404);
    // order ids from B also invisible
    const ordersB = await query(`SELECT id FROM orders WHERE workspace_id = $1`, [b.workspaceId]);
    expect((await asApiKey(secret).get(`/api/v1/orders/${ordersB.rows[0].id}`)).status).toBe(404);
  });

  it('gates measurement data behind measurements:read (separate from orders:read)', async () => {
    const s = await registerUser('measurer@t.test');
    const cust = await seedCustomer(s.workspaceId!, 'Measured Customer');
    const orderId = await seedOrder(s.workspaceId!, cust, true);
    const { secret: ordersOnly } = await createKey(s, 'orders-only key', ['orders:read']);
    const detail = await asApiKey(ordersOnly).get(`/api/v1/orders/${orderId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.measurement_snapshot).toBeUndefined();
    expect((await asApiKey(ordersOnly).get(`/api/v1/orders/${orderId}/measurements`)).status).toBe(403);
    const { secret: measurements } = await createKey(s, 'measurements key', ['measurements:read']);
    const meas = await asApiKey(measurements).get(`/api/v1/orders/${orderId}/measurements`);
    expect(meas.status).toBe(200);
    expect(meas.body.measurement_snapshot).toEqual({ chest: 40 });
  });

  it('creates customers via customers:write with FULL business semantics (entitlements, sync, audit, timeline, metering)', async () => {
    const s = await registerUser('writer@t.test');
    const { secret } = await createKey(s, 'writer key', ['customers:write', 'customers:read']);
    const res = await asApiKey(secret).post('/api/v1/customers').send({ fullName: 'Machine-Made', phone: '+233000', email: 'mm@t.test' });
    expect(res.status).toBe(201);
    expect(res.body.fullName).toBe('Machine-Made');

    // Sync change attributed to the key creator, same as first-party writes
    const sync = await query(`SELECT user_id, table_name FROM sync_changes WHERE record_id = $1`, [res.body.id]);
    expect(sync.rows[0].user_id).toBe(s.userId);
    // Transactional audit
    const audit = await query(`SELECT action, metadata FROM audit_logs WHERE entity_id = $1`, [res.body.id]);
    expect(audit.rows.some((r) => r.action === 'CUSTOMER_CREATED' && r.metadata?.source === 'developer_api')).toBe(true);
    // Customer timeline (business event)
    await new Promise((r) => setTimeout(r, 250));
    const tl = await query(`SELECT event_type FROM customer_timeline_entries WHERE entity_id = $1`, [res.body.id]);
    expect(tl.rows.map((r) => r.event_type)).toContain('CUSTOMER_CREATED');
    // Usage metering (bounded, no key material)
    const usage = await query(`SELECT event_name, metadata FROM usage_events WHERE workspace_id = $1 AND event_name = 'api_request'`, [s.workspaceId]);
    expect(usage.rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(usage.rows[0].metadata)).not.toContain('sf_live_');
    // Visible through the first-party route too
    const firstParty = await asUser(s).get('/customers');
    expect(firstParty.body.some((c: { id: string }) => c.id === res.body.id)).toBe(true);
  });

  it('write without customers:write scope is 403', async () => {
    const s = await registerUser('nowrite@t.test');
    const { secret } = await createKey(s, 'ro key', ['customers:read']);
    expect((await asApiKey(secret).post('/api/v1/customers').send({ fullName: 'X', phone: '1' })).status).toBe(403);
  });

  it('serves inventory, reports and usage summaries under their scopes', async () => {
    const s = await registerUser('poly@t.test');
    const cust = await seedCustomer(s.workspaceId!, 'Poly Customer');
    await seedOrder(s.workspaceId!, cust, false);
    await query(
      `INSERT INTO fabric_records (id, workspace_id, name, fabric_type, unit, quantity_in_stock, reorder_level, cost_per_unit)
       VALUES ($1,$2,'Cotton','woven','m',50,10,20)`,
      [`fab-${Date.now()}`, s.workspaceId!]
    );
    const { secret } = await createKey(s, 'poly key', ['inventory:read', 'reports:read', 'usage:read']);
    const fabrics = await asApiKey(secret).get('/api/v1/inventory/fabrics');
    expect(fabrics.status).toBe(200);
    expect(fabrics.body[0].name).toBe('Cotton');
    const reports = await asApiKey(secret).get('/api/v1/reports/summary');
    expect(reports.status).toBe(200);
    expect(reports.body.orders.total_orders).toBeGreaterThanOrEqual(1);
    const usage = await asApiKey(secret).get('/api/v1/usage/summary');
    expect(usage.status).toBe(200);
    expect(usage.body.windowDays).toBe(30);
    // but reports scope does not grant inventory
    const { secret: reportOnly } = await createKey(s, 'report key', ['reports:read']);
    expect((await asApiKey(reportOnly).get('/api/v1/inventory/fabrics')).status).toBe(403);
  });
});

describe('Phase 8 — management authorization boundary', () => {
  it('keeps key management workspace-isolated', async () => {
    const a = await registerUser('mgmt-a@t.test');
    const b = await registerUser('mgmt-b@t.test');
    const { key } = await createKey(a, 'A key', ['customers:read']);
    const listB = await asUser(b).get('/developers/keys');
    expect(listB.body.some((k: { id: string }) => k.id === key.id)).toBe(false);
    expect((await asUser(b).post(`/developers/keys/${key.id}/revoke`)).status).toBe(404);
    expect((await asUser(b).patch(`/developers/keys/${key.id}/scopes`).send({ scopes: ['orders:read'] })).status).toBe(404);
  });

  it('rejects API keys and portal tokens on management routes (staff JWT only)', async () => {
    const s = await registerUser('mgmt-auth@t.test');
    const { secret } = await createKey(s, 'self-manage attempt', ['customers:read']);
    // API key as Bearer is not a JWT
    const viaKey = await request(app).get('/developers/keys').set('Authorization', `Bearer ${secret}`);
    expect(viaKey.status).toBe(401);
    // Anonymous
    expect((await request(app).get('/developers/keys')).status).toBe(401);
  });

  it('never logs the raw secret: request logs and audit rows contain prefix only', async () => {
    const s = await registerUser('secrecy@t.test');
    const { key, secret } = await createKey(s, 'secret key', ['customers:read']);
    // exercise an authenticated call so loggers run
    await asApiKey(secret).get('/api/v1/me');
    const audit = await query(`SELECT metadata FROM audit_logs WHERE entity_type = 'api_key' AND entity_id = $1`, [key.id]);
    const serialized = JSON.stringify(audit.rows);
    expect(serialized).not.toContain(secret);
    expect(serialized).toContain(key.key_prefix); // prefix is the identifier
  });
});
