import request from 'supertest';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { CAPABILITY } from '../src/platform/commercial/catalog';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';

async function boot() {
  const runtime = createPlatformRuntime(createPlatformStore());
  const app = await createApp({ platform: runtime });
  return { app, runtime };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('P19.6+P19.7 operations and Control Center', () => {
  test('tenant owner cannot access Control Center; operator can list tenants', async () => {
    const { app, runtime } = await boot();
    const tenantUser = await request(app).post('/auth/register').send({
      email: 'owner@t.com',
      password: 'password1',
      displayName: 'Owner',
      tenantName: 'Studio A',
    });
    const denied = await request(app).get('/control/tenants').set(auth(tenantUser.body.accessToken));
    expect(denied.status).toBe(403);
    expect(denied.body.error).toBe('PLATFORM_ADMIN_REQUIRED');

    const operator = await request(app).post('/auth/register').send({
      email: 'ops@agbofa.test',
      password: 'password1',
      displayName: 'Platform Ops',
    });
    runtime.grantPlatformOperator(operator.body.identity.id);
    const token = (
      await request(app)
        .post('/auth/login')
        .send({ email: 'ops@agbofa.test', password: 'password1' })
    ).body.accessToken;

    const list = await request(app).get('/control/tenants').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.tenants.length).toBeGreaterThanOrEqual(2);
    expect(list.body.tenants.every((t: { id: string }) => t.id)).toBe(true);

    const status = await request(app).get('/control/status').set(auth(token));
    expect(status.body.plane).toBe('AGBOFA_PLATFORM_CONTROL_CENTER');
    expect(status.body.tailoringAuthority).toBe(false);
    expect(status.body.billingProvider.status).toBe('DEFERRED');
    expect(status.body.persistence.postgresApplied).toBe(false);
  });

  test('configuration registry is the authority; prices cannot be mutated; kill-switch works', async () => {
    const { app, runtime } = await boot();
    const op = await request(app).post('/auth/register').send({
      email: 'cfg@agbofa.test',
      password: 'password1',
      displayName: 'Cfg',
    });
    runtime.grantPlatformOperator(op.body.identity.id);
    const token = op.body.accessToken;

    const cfg = await request(app).get('/control/configuration').set(auth(token));
    expect(cfg.body.configuration['pricing.amountsAuthoritative'].value).toBe(false);
    expect(cfg.body.configuration['offline.entitlementPolicy'].value).toBe('UNKNOWN');
    expect(cfg.body.configuration['billing.provider'].classification).toBe('DEFERRED');

    const blocked = await request(app)
      .patch('/control/configuration')
      .set(auth(token))
      .send({ 'pricing.amountsAuthoritative': true });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toBe('CONFIG_IMMUTABLE');

    const user = await request(app).post('/auth/register').send({
      email: 'kill@t.com',
      password: 'password1',
      displayName: 'K',
    });
    runtime.store.subscriptions.set('sub-1', {
      id: 'sub-1',
      tenantId: user.body.tenant.id,
      planCode: 'STUDIO',
      status: 'ACTIVE',
      priceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
      expiresAt: null,
    });
    const before = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(before.body.decision.allowed).toBe(true);

    await request(app)
      .patch('/control/configuration')
      .set(auth(token))
      .send({ disabledCapabilities: [CAPABILITY.PATTERN_GENERATION] });
    const after = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(after.body.decision.allowed).toBe(false);
    expect(after.body.decision.reason).toBe('FEATURE_DISABLED');

    const audit = await request(app).get('/control/audit').set(auth(token));
    expect(audit.status).toBe(200);
    expect(audit.body.events.length).toBeGreaterThan(0);
  });

  test('unauthenticated control and billing provider stay deferred', async () => {
    const { app, runtime } = await boot();
    const unauth = await request(app).get('/control/status');
    expect(unauth.status).toBe(401);
    const op = await request(app).post('/auth/register').send({
      email: 'bill@agbofa.test',
      password: 'password1',
      displayName: 'B',
    });
    runtime.grantPlatformOperator(op.body.identity.id);
    const provider = await request(app)
      .get('/control/billing/provider')
      .set(auth(op.body.accessToken));
    expect(provider.body.status).toBe('DEFERRED');
    expect(provider.body.selected).toBeNull();
  });
});
