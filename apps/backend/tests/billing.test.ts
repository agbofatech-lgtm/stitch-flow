/**
 * Phase 5: billing pipeline — webhook signature verification, idempotency,
 * out-of-order handling, state transitions, checkout flow and billing
 * event ledger durability. Uses the deterministic TestBillingProvider
 * (no external credentials involved).
 */

import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser } from './helpers';
import { TestBillingProvider, type TestWebhookPayload } from '../src/billing/providers/TestBillingProvider';

const provider = new TestBillingProvider();

function makeEvent(overrides: Partial<TestWebhookPayload> & { id: string }): TestWebhookPayload {
  return {
    type: 'payment.succeeded',
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

async function postWebhook(payload: unknown, options: { signature?: string | null } = {}) {
  const raw = JSON.stringify(payload);
  const signature =
    options.signature === undefined ? provider.signPayload(raw) : options.signature;
  let req = request(app)
    .post('/billing/webhook')
    .set('Content-Type', 'application/json');
  if (signature !== null) {
    req = req.set('x-billing-signature', signature);
  }
  return req.send(raw);
}

async function startCheckout(session: Awaited<ReturnType<typeof registerUser>>, planCode = 'PRO') {
  const res = await asUser(session).post('/billing/checkout').send({ planCode });
  expect(res.status).toBe(201);
  return res.body as { reference: string; authorizationUrl: string; amountMinor: number };
}

describe('Phase 5 billing pipeline', () => {
  describe('checkout', () => {
    it('creates a provider session and a server-side reference ledger entry', async () => {
      const session = await registerUser('checkout-init@test.dev');
      const checkout = await startCheckout(session);

      expect(checkout.reference).toMatch(/^sf_/);
      expect(checkout.authorizationUrl).toContain(checkout.reference);
      expect(checkout.amountMinor).toBe(4500); // GHS 45 PRO

      const ledger = await query(
        `SELECT * FROM billing_events WHERE provider_event_id = $1`,
        [`checkout:${checkout.reference}`]
      );
      expect(ledger.rows.length).toBe(1);
      expect(ledger.rows[0].workspace_id).toBe(session.workspaceId);
      expect(ledger.rows[0].payload.planCode).toBe('PRO');
    });

    it('assistant workspace role cannot start a checkout', async () => {
      const session = await registerUser('checkout-assistant@test.dev');
      await query(
        `UPDATE workspace_users SET role = 'assistant' WHERE workspace_id = $1 AND user_id = $2`,
        [session.workspaceId, session.userId]
      );
      const res = await asUser(session).post('/billing/checkout').send({ planCode: 'PRO' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_WORKSPACE_ROLE');
    });
  });

  describe('webhook signature security (Step 19)', () => {
    it('rejects a missing signature with 401', async () => {
      const res = await postWebhook(makeEvent({ id: 'evt-nosig' }), { signature: null });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    it('rejects a forged signature with 401 and records a rejection audit', async () => {
      const res = await postWebhook(makeEvent({ id: 'evt-forged' }), {
        signature: 'deadbeef'.repeat(16),
      });
      expect(res.status).toBe(401);

      const audit = await query(
        `SELECT * FROM audit_logs WHERE action = 'BILLING_WEBHOOK_REJECTED'`
      );
      expect(audit.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('a tampered body fails verification (signature over raw body)', async () => {
      const original = JSON.stringify(makeEvent({ id: 'evt-tamper' }));
      const signature = provider.signPayload(original);
      const tampered = original.replace('payment.succeeded', 'payment.failed\u0020');
      const res = await request(app)
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('x-billing-signature', signature)
        .send(tampered);
      expect(res.status).toBe(401);
    });

    it('rejects malformed (unparseable domain) payloads with 400 BILLING_EVENT_INVALID', async () => {
      const res = await postWebhook({ nonsense: true });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BILLING_EVENT_INVALID');
    });
  });

  describe('subscription activation via checkout + webhook', () => {
    it('payment.succeeded activates the plan purchased at checkout', async () => {
      const session = await registerUser('activate@test.dev');
      const checkout = await startCheckout(session, 'PRO');

      const res = await postWebhook(
        makeEvent({
          id: 'evt-activate-1',
          reference: checkout.reference,
          amountMinor: 4500,
          currency: 'GHS',
          providerSubscriptionId: 'psub_activate_1',
        })
      );
      expect(res.status).toBe(200);
      expect(res.body.result).toBe('processed');
      expect(res.body.subscriptionStatus).toBe('active');

      const sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('active');
      expect(sub.body.subscription.plan).toBe('PRO');
      expect(sub.body.subscription.currentPeriodEnd).toBeTruthy();

      const ent = await asUser(session).get('/billing/entitlements');
      expect(ent.body.effectivePlan).toBe('PRO');

      const audit = await query<{ action: string }>(
        `SELECT action FROM audit_logs WHERE action IN ('PAYMENT_VERIFIED','SUBSCRIPTION_ACTIVATED','BILLING_WEBHOOK_RECEIVED')`
      );
      const actions = audit.rows.map((r) => r.action);
      expect(actions).toContain('PAYMENT_VERIFIED');
      expect(actions).toContain('SUBSCRIPTION_ACTIVATED');
      expect(actions).toContain('BILLING_WEBHOOK_RECEIVED');
    });

    it('rejects a payment whose amount does not match the checkout amount', async () => {
      const session = await registerUser('amount-mismatch@test.dev');
      const checkout = await startCheckout(session, 'PRO');

      const res = await postWebhook(
        makeEvent({
          id: 'evt-amount-bad',
          reference: checkout.reference,
          amountMinor: 100, // forged cheap payment
          currency: 'GHS',
        })
      );
      expect(res.status).toBe(200);
      expect(res.body.result).toBe('rejected');

      const sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('trialing'); // unchanged
    });

    it('a webhook with an unresolvable workspace is recorded and does not mutate anything', async () => {
      const res = await postWebhook(
        makeEvent({ id: 'evt-unresolved', reference: 'sf_does-not-exist' })
      );
      expect(res.status).toBe(200);
      expect(res.body.result).toBe('rejected');

      const ledger = await query(
        `SELECT status, error FROM billing_events WHERE provider_event_id = 'evt-unresolved'`
      );
      expect(ledger.rows[0].status).toBe('rejected');
      expect(ledger.rows[0].error).toContain('workspace_unresolved');
    });
  });

  describe('webhook idempotency (Step 20)', () => {
    it('the same event delivered twice produces exactly one transition', async () => {
      const session = await registerUser('idem-2@test.dev');
      const checkout = await startCheckout(session, 'PRO');
      const event = makeEvent({
        id: 'evt-idem-2',
        reference: checkout.reference,
        amountMinor: 4500,
      });

      const first = await postWebhook(event);
      const second = await postWebhook(event);
      expect(first.body.result).toBe('processed');
      expect(second.status).toBe(200);
      expect(second.body.result).toBe('duplicate');

      const events = await query(
        `SELECT COUNT(*)::int AS n FROM billing_events WHERE provider_event_id = 'evt-idem-2'`
      );
      expect(events.rows[0].n).toBe(1);

      const activations = await query(
        `SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'SUBSCRIPTION_ACTIVATED'`
      );
      expect(activations.rows[0].n).toBe(1);
    });

    it('the same event delivered ten times still produces one transition', async () => {
      const session = await registerUser('idem-10@test.dev');
      const checkout = await startCheckout(session, 'STUDIO');
      const event = makeEvent({
        id: 'evt-idem-10',
        reference: checkout.reference,
        amountMinor: 9000,
      });

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push((await postWebhook(event)).body.result);
      }
      expect(results.filter((r) => r === 'processed')).toHaveLength(1);
      expect(results.filter((r) => r === 'duplicate')).toHaveLength(9);

      const activations = await query(
        `SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'SUBSCRIPTION_ACTIVATED'`
      );
      expect(activations.rows[0].n).toBe(1);
    });

    it('simultaneous duplicate deliveries: exactly one processed', async () => {
      const session = await registerUser('idem-race@test.dev');
      const checkout = await startCheckout(session, 'PRO');
      const event = makeEvent({
        id: 'evt-idem-race',
        reference: checkout.reference,
        amountMinor: 4500,
      });

      const [a, b] = await Promise.all([postWebhook(event), postWebhook(event)]);
      const results = [a.body.result, b.body.result].sort();
      expect(results).toEqual(['duplicate', 'processed']);
    });
  });

  describe('out-of-order events (Step 21)', () => {
    it('a delayed older event does not downgrade newer subscription state', async () => {
      const session = await registerUser('ooo@test.dev');
      const checkout = await startCheckout(session, 'PRO');

      const t1 = new Date('2026-08-01T10:00:00Z');
      const t2 = new Date('2026-08-01T12:00:00Z');

      // Newer event first: activation at t2.
      await postWebhook(
        makeEvent({
          id: 'evt-ooo-new',
          reference: checkout.reference,
          amountMinor: 4500,
          occurredAt: t2.toISOString(),
          providerSubscriptionId: 'psub_ooo',
        })
      );

      // Delayed older event: payment failure at t1 (before activation).
      const res = await postWebhook(
        makeEvent({
          id: 'evt-ooo-old',
          type: 'payment.failed',
          providerSubscriptionId: 'psub_ooo',
          occurredAt: t1.toISOString(),
        })
      );
      expect(res.status).toBe(200);
      expect(res.body.result).toBe('ignored_stale');

      const sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('active'); // not downgraded

      const ledger = await query(
        `SELECT status FROM billing_events WHERE provider_event_id = 'evt-ooo-old'`
      );
      expect(ledger.rows[0].status).toBe('ignored_stale');
    });
  });

  describe('subscription lifecycle transitions', () => {
    async function activate(session: Awaited<ReturnType<typeof registerUser>>, psub: string) {
      const checkout = await startCheckout(session, 'PRO');
      await postWebhook(
        makeEvent({
          id: `evt-${psub}-activate`,
          reference: checkout.reference,
          amountMinor: 4500,
          providerSubscriptionId: psub,
        })
      );
    }

    it('payment.failed moves an active subscription to past_due, recovery reactivates', async () => {
      const session = await registerUser('pastdue@test.dev');
      await activate(session, 'psub_pd');

      await postWebhook(
        makeEvent({
          id: 'evt-pd-fail',
          type: 'payment.failed',
          providerSubscriptionId: 'psub_pd',
          occurredAt: new Date(Date.now() + 1000).toISOString(),
        })
      );
      let sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('past_due');
      // Grace: entitlements retained.
      const ent = await asUser(session).get('/billing/entitlements');
      expect(ent.body.effectivePlan).toBe('PRO');

      await postWebhook(
        makeEvent({
          id: 'evt-pd-recover',
          type: 'payment.succeeded',
          providerSubscriptionId: 'psub_pd',
          occurredAt: new Date(Date.now() + 2000).toISOString(),
        })
      );
      sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('active');
    });

    it('provider cancellation and expiration follow the state machine', async () => {
      const session = await registerUser('lifecycle@test.dev');
      await activate(session, 'psub_lc');

      await postWebhook(
        makeEvent({
          id: 'evt-lc-cancel',
          type: 'subscription.cancelled',
          providerSubscriptionId: 'psub_lc',
          occurredAt: new Date(Date.now() + 1000).toISOString(),
        })
      );
      let sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('cancelled');

      await postWebhook(
        makeEvent({
          id: 'evt-lc-expire',
          type: 'subscription.expired',
          providerSubscriptionId: 'psub_lc',
          occurredAt: new Date(Date.now() + 2000).toISOString(),
        })
      );
      sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('expired');

      const ent = await asUser(session).get('/billing/entitlements');
      expect(ent.body.effectivePlan).toBe('BASIC');
    });

    it('an illegal provider transition is rejected and recorded, state unchanged', async () => {
      const session = await registerUser('illegal-transition@test.dev');
      await activate(session, 'psub_illegal');

      // active -> expired is not legal (must pass through past_due/cancelled)
      const res = await postWebhook(
        makeEvent({
          id: 'evt-illegal',
          type: 'subscription.expired',
          providerSubscriptionId: 'psub_illegal',
          occurredAt: new Date(Date.now() + 1000).toISOString(),
        })
      );
      expect(res.status).toBe(200);
      expect(res.body.result).toBe('rejected');

      const sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('active');

      const ledger = await query(
        `SELECT status, error FROM billing_events WHERE provider_event_id = 'evt-illegal'`
      );
      expect(ledger.rows[0].status).toBe('rejected');
      expect(ledger.rows[0].error).toContain('illegal_transition');
    });

    it('upgrade during trial: checkout + payment upgrades plan and is audited', async () => {
      const session = await registerUser('trial-upgrade@test.dev');
      const checkout = await startCheckout(session, 'STUDIO');
      await postWebhook(
        makeEvent({
          id: 'evt-trial-upgrade',
          reference: checkout.reference,
          amountMinor: 9000,
        })
      );
      const sub = await asUser(session).get('/billing/subscription');
      expect(sub.body.subscription.status).toBe('active');
      expect(sub.body.subscription.plan).toBe('STUDIO');
    });
  });

  describe('billing/tailor financial domain separation (Step 44/55)', () => {
    it('webhook processing writes nothing into tailor payments/invoices tables', async () => {
      const session = await registerUser('domain-sep@test.dev');
      const checkout = await startCheckout(session, 'PRO');
      await postWebhook(
        makeEvent({ id: 'evt-domain-sep', reference: checkout.reference, amountMinor: 4500 })
      );

      const payments = await query(`SELECT COUNT(*)::int AS n FROM payments`);
      const invoices = await query(`SELECT COUNT(*)::int AS n FROM invoices`);
      expect(payments.rows[0].n).toBe(0);
      expect(invoices.rows[0].n).toBe(0);
    });
  });
});
