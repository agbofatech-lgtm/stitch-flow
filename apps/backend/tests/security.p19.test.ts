import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { loadOrCreateStore, readStore } from '../src/platform/persist';
import { CAPABILITY } from '../src/platform/commercial/catalog';
import { PlatformError } from '../src/platform/errors';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('P19.10 security hardening', () => {
  test('register/login ignore client operator/role fields; no HTTP grant of platform admin', async () => {
    const runtime = createPlatformRuntime(createPlatformStore());
    const app = await createApp({ platform: runtime });
    const res = await request(app).post('/auth/register').send({
      email: 'forge@t.com',
      password: 'password1',
      displayName: 'Forge',
      role: 'PLATFORM_ADMIN',
      isPlatformOperator: true,
      operator: true,
    });
    expect(res.status).toBe(201);
    expect(runtime.isPlatformOperator(res.body.identity.id)).toBe(false);
    const denied = await request(app).get('/control/status').set(auth(res.body.accessToken));
    expect(denied.status).toBe(403);
    const grant = await request(app)
      .post('/control/operators')
      .set(auth(res.body.accessToken))
      .send({ identityId: res.body.identity.id });
    expect(grant.status).toBe(404);
  });

  test('JWT extra commercial/operator claims are malformed', async () => {
    const runtime = createPlatformRuntime(createPlatformStore());
    const app = await createApp({ platform: runtime });
    const created = await runtime.register({
      email: 'jwt@t.com',
      password: 'password1',
      displayName: 'J',
    });
    const forged = jwt.sign(
      { sub: created.identity.id, typ: 'access', role: 'PLATFORM_ADMIN' },
      'p19-test-jwt-secret',
      { issuer: 'stitchflow-platform' }
    );
    const res = await request(app).get('/auth/me').set(auth(forged));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('MALFORMED_TOKEN');
  });

  test('client entitled/allowed flags do not grant access', async () => {
    const runtime = createPlatformRuntime(createPlatformStore());
    const app = await createApp({ platform: runtime });
    const user = await request(app).post('/auth/register').send({
      email: 'ui@t.com',
      password: 'password1',
      displayName: 'UI',
    });
    const check = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({
        capability: CAPABILITY.PATTERN_GENERATION,
        allowed: true,
        entitled: true,
        decision: { allowed: true, reason: 'ENTITLED' },
      });
    expect(check.status).toBe(200);
    expect(check.body.decision.allowed).toBe(false);
    expect(check.body.decision.reason).toBe('SUBSCRIPTION_REQUIRED');
  });

  test('unmounted shop payment routes do not exist and cannot grant SaaS entitlements', async () => {
    const runtime = createPlatformRuntime(createPlatformStore());
    const app = await createApp({ platform: runtime });
    const user = await request(app).post('/auth/register').send({
      email: 'shop@t.com',
      password: 'password1',
      displayName: 'Shop',
    });
    const shop = await request(app).post('/payments').set(auth(user.body.accessToken)).send({
      amount: 29,
      status: 'paid',
    });
    expect(shop.status).toBe(404);
    const access = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(access.body.decision.allowed).toBe(false);
  });

  test('corrupt durable store fails closed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p19-corrupt-'));
    const filePath = join(dir, 'platform.json');
    writeFileSync(filePath, '{not-json', 'utf8');
    expect(() => readStore(filePath)).toThrow(PlatformError);
    try {
      readStore(filePath);
    } catch (err) {
      expect((err as PlatformError).code).toBe('STORE_CORRUPT');
    }
    writeFileSync(filePath, JSON.stringify({ version: 99, identities: [] }), 'utf8');
    expect(() => loadOrCreateStore(filePath)).toThrow(PlatformError);
  });

  test('login and register are audited without password material', async () => {
    const runtime = createPlatformRuntime(createPlatformStore());
    const app = await createApp({ platform: runtime });
    await request(app).post('/auth/register').send({
      email: 'aud@t.com',
      password: 'password1',
      displayName: 'Aud',
    });
    await request(app).post('/auth/login').send({ email: 'aud@t.com', password: 'password1' });
    const sources = runtime.store.commercialAudit.map((e) => e.source);
    expect(sources).toContain('identity');
    expect(JSON.stringify(runtime.store.commercialAudit)).not.toMatch(/password1/);
  });
});
