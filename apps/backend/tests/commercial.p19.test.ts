import request from 'supertest';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { canonicalWebhookBody } from '../src/platform/commercial/canonical';
import { signBillingPayload } from '../src/platform/commercial/webhook';
import { CAPABILITY } from '../src/platform/commercial/catalog';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';
process.env.BILLING_WEBHOOK_SECRET = 'p19-test-webhook-secret';

async function appWithRuntime() {
  const runtime = createPlatformRuntime(createPlatformStore());
  const app = await createApp({ platform: runtime });
  return { app, runtime };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function register(app: Awaited<ReturnType<typeof createApp>>, email: string) {
  const res = await request(app).post('/auth/register').send({
    email,
    password: 'password1',
    displayName: email,
  });
  expect(res.status).toBe(201);
  return res.body;
}

function signedWebhook(
  eventId: string,
  type: string,
  checkoutId: string,
  occurredAt = '2026-09-01T12:00:00.000Z'
) {
  const body = { eventId, type, checkoutId, occurredAt };
  const raw = canonicalWebhookBody(body);
  return { body, headers: { 'X-Billing-Signature': signBillingPayload(raw) } };
}

describe('P19.4+P19.5 entitlements and billing', () => {
  test('no subscription → capabilities denied; unknown capability denied; unknown plan denied', async () => {
    const { app } = await appWithRuntime();
    const user = await register(app, 'none@t.com');
    const denied = await request(app)
      .post('/platform/access/check')
      .set(auth(user.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(denied.status).toBe(200);
    expect(denied.body.decision.allowed).toBe(false);
    expect(denied.body.decision.reason).toBe('SUBSCRIPTION_REQUIRED');

    const unknown = await request(app)
      .post('/platform/access/check')
      .set(auth(user.accessToken))
      .send({ capability: 'SILENT_ADMIN' });
    expect(unknown.body.decision.allowed).toBe(false);
    expect(unknown.body.decision.reason).toBe('UNKNOWN_CAPABILITY');

    const plan = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.accessToken))
      .send({ planCode: 'ENTERPRISE_SECRET' });
    expect(plan.status).toBe(400);
    expect(plan.body.error).toBe('UNKNOWN_PLAN');
  });

  test('verified webhook activates subscription and entitles plan capabilities, not plan-name ifs', async () => {
    const { app } = await appWithRuntime();
    const user = await register(app, 'pro@t.com');
    const checkout = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.accessToken))
      .send({ planCode: 'PRO' });
    expect(checkout.status).toBe(201);
    expect(checkout.body.note).toMatch(/not payment authority/i);

    const fakeSuccess = await request(app)
      .get('/platform/entitlements')
      .query({ payment: 'success' })
      .set(auth(user.accessToken));
    expect(fakeSuccess.body.entitlements).toEqual([]);

    const hook = signedWebhook('evt-1', 'payment.confirmed', checkout.body.payment.checkoutId);
    const confirmed = await request(app)
      .post('/platform/billing/webhooks/test')
      .set(hook.headers)
      .send(hook.body);
    expect(confirmed.status).toBe(201);
    expect(confirmed.body.subscription.status).toBe('ACTIVE');
    expect(confirmed.body.subscription.tenantId).toBe(user.tenant.id);

    const access = await request(app)
      .post('/platform/access/check')
      .set(auth(user.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(access.body.decision.allowed).toBe(true);
    expect(access.body.decision.reason).toBe('ENTITLED');
    expect(JSON.stringify(access.body)).not.toMatch(/MeasurementVersion|hip|patternEngine/);

    const studioOnly = await request(app)
      .post('/platform/access/check')
      .set(auth(user.accessToken))
      .send({ capability: CAPABILITY.AI_TAILORING_ADVISORY });
    expect(studioOnly.body.decision.allowed).toBe(false);
  });

  test('unverified webhook and failed payment do not activate; duplicate event is idempotent', async () => {
    const { app } = await appWithRuntime();
    const user = await register(app, 'pay@t.com');
    const checkout = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.accessToken))
      .send({ planCode: 'STUDIO' });

    const unsigned = await request(app)
      .post('/platform/billing/webhooks/test')
      .send({
        eventId: 'evt-bad',
        type: 'payment.confirmed',
        checkoutId: checkout.body.payment.checkoutId,
      });
    expect(unsigned.status).toBe(401);
    expect(unsigned.body.error).toBe('WEBHOOK_UNVERIFIED');

    const stripe = signedWebhook('evt-stripe', 'payment.confirmed', checkout.body.payment.checkoutId);
    const deferred = await request(app)
      .post('/platform/billing/webhooks/stripe')
      .set(stripe.headers)
      .send(stripe.body);
    expect(deferred.status).toBe(400);
    expect(deferred.body.error).toBe('PROVIDER_DEFERRED');

    const fail = signedWebhook('evt-fail', 'payment.failed', checkout.body.payment.checkoutId);
    const failed = await request(app)
      .post('/platform/billing/webhooks/test')
      .set(fail.headers)
      .send(fail.body);
    expect(failed.status).toBe(201);
    expect(failed.body.payment.status).toBe('PAYMENT_FAILED');
    const still = await request(app)
      .post('/platform/access/check')
      .set(auth(user.accessToken))
      .send({ capability: CAPABILITY.PATTERN_GENERATION });
    expect(still.body.decision.allowed).toBe(false);

    const checkout2 = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.accessToken))
      .send({ planCode: 'STUDIO' });
    const ok = signedWebhook('evt-ok', 'payment.confirmed', checkout2.body.payment.checkoutId);
    const first = await request(app).post('/platform/billing/webhooks/test').set(ok.headers).send(ok.body);
    const dup = await request(app).post('/platform/billing/webhooks/test').set(ok.headers).send(ok.body);
    expect(first.status).toBe(201);
    expect(dup.status).toBe(200);
    expect(dup.body.duplicate).toBe(true);
    expect(dup.body.subscription.id).toBe(first.body.subscription.id);
  });

  test('cancel and expiry remove capabilities', async () => {
    const { app, runtime } = await appWithRuntime();
    const user = await register(app, 'exp@t.com');
    const checkout = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user.accessToken))
      .send({ planCode: 'PRO' });
    const ok = signedWebhook('evt-exp', 'payment.confirmed', checkout.body.payment.checkoutId);
    await request(app).post('/platform/billing/webhooks/test').set(ok.headers).send(ok.body);

    const cancel = await request(app)
      .post('/platform/billing/subscription/cancel')
      .set(auth(user.accessToken));
    expect(cancel.body.subscription.status).toBe('CANCELLED');
    const after = await request(app)
      .post('/platform/access/check')
      .set(auth(user.accessToken))
      .send({ capability: CAPABILITY.PDF_EXPORT });
    expect(after.body.decision.allowed).toBe(false);
    expect(after.body.decision.reason).toBe('SUBSCRIPTION_CANCELLED');

    const user2 = await register(app, 'exp2@t.com');
    const c2 = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(user2.accessToken))
      .send({ planCode: 'PRO' });
    const ok2 = signedWebhook('evt-exp2', 'payment.confirmed', c2.body.payment.checkoutId);
    await request(app).post('/platform/billing/webhooks/test').set(ok2.headers).send(ok2.body);
    for (const sub of runtime.store.subscriptions.values()) {
      if (sub.tenantId === user2.tenant.id) {
        sub.expiresAt = new Date(Date.now() - 1000).toISOString();
      }
    }
    const expired = await request(app)
      .post('/platform/access/check')
      .set(auth(user2.accessToken))
      .send({ capability: CAPABILITY.PDF_EXPORT });
    expect(expired.body.decision.allowed).toBe(false);
    expect(expired.body.decision.reason).toBe('SUBSCRIPTION_EXPIRED');
  });

  test('tenant A cannot read tenant B payment or subscription; unauthenticated denied', async () => {
    const { app } = await appWithRuntime();
    const a = await register(app, 'ca@t.com');
    const b = await register(app, 'cb@t.com');
    const checkout = await request(app)
      .post('/platform/billing/checkout')
      .set(auth(a.accessToken))
      .send({ planCode: 'BASIC' });
    const isolated = await request(app)
      .get('/platform/billing/payments/' + checkout.body.payment.id)
      .set(auth(b.accessToken));
    expect(isolated.status).toBe(403);
    expect(isolated.body.error).toBe('TENANT_ISOLATION');

    const unauth = await request(app).get('/platform/entitlements');
    expect(unauth.status).toBe(401);
  });
});
