import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { signAccessToken } from '../src/platform/tokens';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';

async function appWithRuntime() {
  const runtime = createPlatformRuntime(createPlatformStore());
  const app = await createApp({ platform: runtime });
  return { app, runtime };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('P19.2+P19.3 identity, authentication, tenancy', () => {
  test('register provisions identity, distinct tenant, default workspace, owner membership', async () => {
    const { app } = await appWithRuntime();
    const res = await request(app).post('/auth/register').send({
      email: 'owner@example.com',
      password: 'password1',
      displayName: 'Owner One',
      tenantName: 'Studio One',
    });
    expect(res.status).toBe(201);
    expect(res.body.identity.email).toBe('owner@example.com');
    expect(res.body.identity.passwordHash).toBeUndefined();
    expect(res.body.tenant.id).toBeTruthy();
    expect(res.body.workspace.id).toBeTruthy();
    expect(res.body.tenant.id).not.toBe(res.body.workspace.id);
    expect(res.body.workspace.tenantId).toBe(res.body.tenant.id);
    expect(res.body.accessToken).toBeTruthy();

    const decoded = jwt.decode(res.body.accessToken) as jwt.JwtPayload;
    expect(decoded.sub).toBe(res.body.identity.id);
    expect(decoded.typ).toBe('access');
    expect(decoded.plan).toBeUndefined();
    expect(decoded.billingStatus).toBeUndefined();
    expect(decoded.permissions).toBeUndefined();
    expect(decoded.tenantId).toBeUndefined();
  });

  test('login accepts valid credentials and rejects invalid', async () => {
    const { app } = await appWithRuntime();
    await request(app).post('/auth/register').send({
      email: 'a@example.com',
      password: 'password1',
      displayName: 'A',
    });
    const ok = await request(app)
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'password1' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();

    const bad = await request(app)
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'wrongpass' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('INVALID_CREDENTIALS');
  });

  test('missing, malformed, invalid, and expired tokens are rejected', async () => {
    const { app, runtime } = await appWithRuntime();
    const created = await runtime.register({
      email: 'tok@example.com',
      password: 'password1',
      displayName: 'Tok',
    });

    const missing = await request(app).get('/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body.error).toBe('MISSING_TOKEN');

    const malformed = await request(app)
      .get('/auth/me')
      .set({ Authorization: 'Bearer not-a-jwt' });
    expect(malformed.status).toBe(401);
    expect(malformed.body.error).toBe('MALFORMED_TOKEN');

    const invalid = await request(app)
      .get('/auth/me')
      .set({ Authorization: 'Bearer ' + jwt.sign({ sub: created.identity.id, typ: 'access' }, 'other-secret') });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error).toBe('INVALID_TOKEN');

    const expiredJwt = signAccessToken(created.identity.id, '1ms');
    await new Promise((r) => setTimeout(r, 25));
    const expired = await request(app).get('/auth/me').set(auth(expiredJwt));
    expect(expired.status).toBe(401);
    expect(expired.body.error).toBe('EXPIRED_TOKEN');
  });

  test('valid token resolves identity; inactive identity is rejected', async () => {
    const { app, runtime } = await appWithRuntime();
    const created = await runtime.register({
      email: 'live@example.com',
      password: 'password1',
      displayName: 'Live',
    });
    const me = await request(app).get('/auth/me').set(auth(created.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.identity.id).toBe(created.identity.id);

    const stored = runtime.store.identities.get(created.identity.id);
    if (stored) stored.status = 'inactive';
    const dead = await request(app).get('/auth/me').set(auth(created.accessToken));
    expect(dead.status).toBe(403);
    expect(dead.body.error).toBe('IDENTITY_INACTIVE');
  });

  test('tenant context is server-resolved; workspace is subordinate and ids differ', async () => {
    const { app } = await appWithRuntime();
    const created = await request(app).post('/auth/register').send({
      email: 'ctx@example.com',
      password: 'password1',
      displayName: 'Ctx',
    });
    const ctx = await request(app)
      .get('/platform/context')
      .set(auth(created.body.accessToken));
    expect(ctx.status).toBe(200);
    expect(ctx.body.tenant.id).toBe(created.body.tenant.id);
    expect(ctx.body.workspace.tenantId).toBe(ctx.body.tenant.id);
    expect(ctx.body.notes.tenantEqualsWorkspace).toBe(false);
    expect(ctx.body.notes.entitlementEvaluated).toBe(true);
    expect(ctx.body.membership.role).toBe('TENANT_OWNER');
  });

  test('suspended membership cannot obtain tenant context', async () => {
    const { app, runtime } = await appWithRuntime();
    const created = await runtime.register({
      email: 'sus@example.com',
      password: 'password1',
      displayName: 'Sus',
    });
    for (const m of runtime.store.memberships.values()) {
      if (m.identityId === created.identity.id) m.status = 'suspended';
    }
    const ctx = await request(app)
      .get('/platform/context')
      .set(auth(created.accessToken));
    expect(ctx.status).toBe(403);
    expect(ctx.body.error).toBe('MEMBERSHIP_SUSPENDED');
  });

  test('cross-tenant read and X-Tenant-Id injection are denied', async () => {
    const { app } = await appWithRuntime();
    const a = await request(app).post('/auth/register').send({
      email: 'a@t.com',
      password: 'password1',
      displayName: 'A',
      tenantName: 'Tenant A',
    });
    const b = await request(app).post('/auth/register').send({
      email: 'b@t.com',
      password: 'password1',
      displayName: 'B',
      tenantName: 'Tenant B',
    });

    const created = await request(app)
      .post('/platform/records')
      .set(auth(a.body.accessToken))
      .send({ kind: 'note', payload: { secret: 'alpha' } });
    expect(created.status).toBe(201);
    const recordId = created.body.record.id;

    const own = await request(app)
      .get('/platform/records/' + recordId)
      .set(auth(a.body.accessToken));
    expect(own.status).toBe(200);
    expect(own.body.record.payload.secret).toBe('alpha');

    const cross = await request(app)
      .get('/platform/records/' + recordId)
      .set(auth(b.body.accessToken));
    expect(cross.status).toBe(403);
    expect(cross.body.error).toBe('TENANT_ISOLATION');

    const spoof = await request(app)
      .get('/platform/records/' + recordId)
      .set({ ...auth(b.body.accessToken), 'X-Tenant-Id': a.body.tenant.id });
    expect(spoof.status).toBe(403);
    expect(spoof.body.error).toBe('TENANT_ISOLATION');
  });

  test('cross-tenant mutation is denied', async () => {
    const { app, runtime } = await appWithRuntime();
    const a = await runtime.register({
      email: 'muta@t.com',
      password: 'password1',
      displayName: 'A',
    });
    const b = await runtime.register({
      email: 'mutb@t.com',
      password: 'password1',
      displayName: 'B',
    });
    const ctxA = runtime.resolveContext(a.identity.id);
    const record = runtime.createRecord(ctxA, { kind: 'note', payload: { n: 1 } });
    const ctxB = runtime.resolveContext(b.identity.id);
    expect(() => runtime.assertTenantRecord(ctxB, record.id)).toThrow(/not visible/);
  });

  test('missing tenant context fails safely on platform records', async () => {
    const { app } = await appWithRuntime();
    const res = await request(app).get('/platform/records/nope');
    expect(res.status).toBe(401);
  });
});
