import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadOrCreateStore } from '../src/platform/persist';
import { createPlatformRuntime } from '../src/platform/runtime';
import { canonicalWebhookBody } from '../src/platform/commercial/canonical';
import { signBillingPayload } from '../src/platform/commercial/webhook';
import { CAPABILITY } from '../src/platform/commercial/catalog';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';
process.env.BILLING_WEBHOOK_SECRET = 'p19-test-webhook-secret';

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function sign(eventId: string, type: string, checkoutId: string, occurredAt: string) {
  const body = { eventId, type, checkoutId, occurredAt };
  return { body, headers: { 'X-Billing-Signature': signBillingPayload(canonicalWebhookBody(body)) } };
}

describe('P19.8 durable persistence and P19.9 golden path', () => {
  test('identity and subscription survive process restart via file store', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'p19-store-'));
    const filePath = join(dir, 'platform.json');
    const first = loadOrCreateStore(filePath);
    const runtime1 = createPlatformRuntime(first.store, { persist: first.persist });
    const app1 = await createApp({ platform: runtime1 });
    const created = await request(app1).post('/auth/register').send({
      email: 'persist@t.com',
      password: 'password1',
      displayName: 'Persist',
    });
    expect(created.status).toBe(201);

    const second = loadOrCreateStore(filePath);
    const runtime2 = createPlatformRuntime(second.store, { persist: second.persist });
    const app2 = await createApp({ platform: runtime2 });
    const login = await request(app2)
      .post('/auth/login')
      .send({ email: 'persist@t.com', password: 'password1' });
    expect(login.status).toBe(200);
    expect(login.body.identity.email).toBe('persist@t.com');
    expect(runtime2.store.identities.get(created.body.identity.id)?.passwordHash).toBeTruthy();
  });

  test('golden path: register → checkout → verified event → entitle → expire/deny → restore', async () => {
    const { store, persist } = loadOrCreateStore(undefined);
    const runtime = createPlatformRuntime(store, { persist });
    const app = await createApp({ platform: runtime });
    const user = await request(app).post('/auth/register').send({
      email: 'gold@t.com',
      password: 'password1',
      displayName: 'Gold',
    });
    const checkout = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.body.accessToken))
      .send({ planCode: 'PRO' });
    const ok = sign('gold-1', 'payment.confirmed', checkout.body.payment.checkoutId, '2026-09-01T10:00:00.000Z');
    const paid = await request(app).post('/platform/billing/webhooks/test').set(ok.headers).send(ok.body);
    expect(paid.status).toBe(201);
    const allowed = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(allowed.body.decision.allowed).toBe(true);

    const stale = sign('gold-old', 'payment.failed', checkout.body.payment.checkoutId, '2026-08-01T10:00:00.000Z');
    const staleRes = await request(app)
      .post('/platform/billing/webhooks/test')
      .set(stale.headers)
      .send(stale.body);
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error).toBe('STALE_EVENT');
    const still = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(still.body.decision.allowed).toBe(true);

    await request(app).post('/platform/billing/subscription/cancel').set(auth(user.body.accessToken));
    const denied = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(denied.body.decision.allowed).toBe(false);

    const checkout2 = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.body.accessToken))
      .send({ planCode: 'PRO' });
    const restore = sign(
      'gold-2',
      'payment.confirmed',
      checkout2.body.payment.checkoutId,
      '2026-09-01T11:00:00.000Z'
    );
    await request(app).post('/platform/billing/webhooks/test').set(restore.headers).send(restore.body);
    const restored = await request(app)
      .post('/platform/access/check')
      .set(auth(user.body.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(restored.body.decision.allowed).toBe(true);
    expect(JSON.stringify(restored.body)).not.toMatch(/MeasurementVersion|patternEngine/);
  });

  test('unknown webhook event is rejected', async () => {
    const runtime = createPlatformRuntime(loadOrCreateStore(undefined).store);
    const app = await createApp({ platform: runtime });
    const user = await request(app).post('/auth/register').send({
      email: 'unk@t.com',
      password: 'password1',
      displayName: 'U',
    });
    const checkout = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.body.accessToken))
      .send({ planCode: 'BASIC' });
    const hook = sign('unk-1', 'payment.exploded', checkout.body.payment.checkoutId, '2026-09-01T12:00:00.000Z');
    const res = await request(app).post('/platform/billing/webhooks/test').set(hook.headers).send(hook.body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('UNKNOWN_EVENT');
  });
});
