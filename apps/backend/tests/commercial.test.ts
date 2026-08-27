/**
 * Phase 5: commercial foundation — plans, subscriptions, entitlements,
 * trials, server-side enforcement, forgery resistance, tenant isolation
 * and concurrency-safe limits.
 */

import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';
import { PLAN_CATALOGUE } from '../src/billing/plans';

async function setSubscription(
  workspaceId: string,
  patch: {
    planCode?: string;
    status?: string;
    trialEnd?: Date;
    currentPeriodEnd?: Date | null;
  }
) {
  await query(
    `UPDATE subscriptions
     SET plan_code = COALESCE($2, plan_code),
         status = COALESCE($3, status),
         trial_end = COALESCE($4, trial_end),
         current_period_end = $5,
         updated_at = NOW()
     WHERE workspace_id = $1`,
    [
      workspaceId,
      patch.planCode ?? null,
      patch.status ?? null,
      patch.trialEnd ?? null,
      patch.currentPeriodEnd ?? null,
    ]
  );
}

async function seedCustomers(workspaceId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await query(
      `INSERT INTO customers (id, workspace_id, full_name, phone)
       VALUES ($1, $2, $3, $4)`,
      [`seed-${workspaceId}-${i}`, workspaceId, `Seed Customer ${i}`, `02400000${i}`]
    );
  }
}

describe('Phase 5 commercial foundation', () => {
  describe('plan catalogue', () => {
    it('GET /billing/plans exposes exactly BASIC/PRO/STUDIO with limits and features', async () => {
      const res = await request(app).get('/billing/plans');
      expect(res.status).toBe(200);
      const codes = res.body.plans.map((p: { code: string }) => p.code);
      expect(codes.sort()).toEqual(['BASIC', 'PRO', 'STUDIO']);

      const basic = res.body.plans.find((p: { code: string }) => p.code === 'BASIC');
      expect(basic.limits).toEqual({ customers: 25, staff: 0 });
      expect(basic.monthlyPrice).toBe(0);
      expect(basic.currency).toBe('GHS');

      const pro = res.body.plans.find((p: { code: string }) => p.code === 'PRO');
      expect(pro.limits).toEqual({ customers: 250, staff: 5 });
      expect(pro.features.pdfExport).toBe(true);
      expect(pro.features.advancedReports).toBe(false);

      const studio = res.body.plans.find((p: { code: string }) => p.code === 'STUDIO');
      expect(studio.limits).toEqual({ customers: null, staff: 15 });
      expect(studio.features.advancedReports).toBe(true);
    });
  });

  describe('server-authoritative trial', () => {
    it('registration creates a trialing subscription for the new workspace', async () => {
      const session = await registerUser('trial-create@test.dev');
      const res = await asUser(session).get('/billing/subscription');
      expect(res.status).toBe(200);
      expect(res.body.subscription.status).toBe('trialing');
      expect(res.body.subscription.plan).toBe('STUDIO');
      expect(res.body.subscription.trialEnd).toBeTruthy();
      // ~14 days out
      const trialEnd = new Date(res.body.subscription.trialEnd).getTime();
      const expected = Date.now() + 14 * 24 * 60 * 60 * 1000;
      expect(Math.abs(trialEnd - expected)).toBeLessThan(60 * 1000);
    });

    it('writes a SUBSCRIPTION_CREATED audit event', async () => {
      const session = await registerUser('trial-audit@test.dev');
      const result = await query(
        `SELECT * FROM audit_logs WHERE action = 'SUBSCRIPTION_CREATED' AND user_id = $1`,
        [session.userId]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].metadata.workspaceId).toBe(session.workspaceId);
    });

    it('an expired trial falls back to BASIC entitlements (server clock, not client)', async () => {
      const session = await registerUser('trial-expired@test.dev');
      await setSubscription(session.workspaceId, {
        trialEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.subscriptionStatus).toBe('trialing');
      expect(res.body.effectiveStatus).toBe('expired');
      expect(res.body.effectivePlan).toBe('BASIC');
      expect(res.body.limits.customers).toBe(25);
      expect(res.body.features.pdfExport).toBe(false);
    });

    it('active trial grants the trial plan features', async () => {
      const session = await registerUser('trial-active@test.dev');
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectivePlan).toBe('STUDIO');
      expect(res.body.features.productionAssistant).toBe(true);
      expect(res.body.limits.customers).toBeNull();
    });
  });

  describe('entitlement semantics per status', () => {
    let session: AuthSession;
    beforeEach(async () => {
      session = await registerUser(`status-${Date.now()}@test.dev`);
    });

    it('active PRO subscription grants PRO limits/features', async () => {
      await setSubscription(session.workspaceId, { planCode: 'PRO', status: 'active' });
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectivePlan).toBe('PRO');
      expect(res.body.limits).toEqual({ customers: 250, staff: 5 });
      expect(res.body.features.advancedReports).toBe(false);
    });

    it('past_due retains plan features (grace)', async () => {
      await setSubscription(session.workspaceId, { planCode: 'PRO', status: 'past_due' });
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectivePlan).toBe('PRO');
    });

    it('paused falls back to BASIC', async () => {
      await setSubscription(session.workspaceId, { planCode: 'PRO', status: 'paused' });
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectivePlan).toBe('BASIC');
    });

    it('cancelled retains features until current_period_end, then BASIC', async () => {
      await setSubscription(session.workspaceId, {
        planCode: 'PRO',
        status: 'cancelled',
        currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      let res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectivePlan).toBe('PRO');
      expect(res.body.effectiveStatus).toBe('cancelled');

      await setSubscription(session.workspaceId, {
        planCode: 'PRO',
        status: 'cancelled',
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectiveStatus).toBe('expired');
      expect(res.body.effectivePlan).toBe('BASIC');
    });

    it('expired falls back to BASIC', async () => {
      await setSubscription(session.workspaceId, { planCode: 'STUDIO', status: 'expired' });
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.body.effectivePlan).toBe('BASIC');
    });
  });

  describe('server-side limit enforcement', () => {
    it('rejects customer creation past the BASIC limit with CUSTOMER_LIMIT_REACHED', async () => {
      const session = await registerUser('limit-customers@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'BASIC', status: 'active' });
      await seedCustomers(session.workspaceId, PLAN_CATALOGUE.BASIC.limits.customers!);

      const res = await asUser(session)
        .post('/customers')
        .send({ fullName: 'One Too Many', phone: '0244000000' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CUSTOMER_LIMIT_REACHED');
      expect(res.body.error.message).toContain('Upgrade');

      const count = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM customers WHERE workspace_id = $1`,
        [session.workspaceId]
      );
      expect(count.rows[0].n).toBe(25);
    });

    it('allows creation below the limit', async () => {
      const session = await registerUser('limit-below@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'BASIC', status: 'active' });
      await seedCustomers(session.workspaceId, 24);

      const res = await asUser(session)
        .post('/customers')
        .send({ fullName: 'Fits In', phone: '0244000001' });
      expect(res.status).toBe(201);
    });

    it('rejects staff creation past the plan limit with MEMBER_LIMIT_REACHED', async () => {
      const session = await registerUser('limit-staff@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'BASIC', status: 'active' });

      const res = await asUser(session)
        .post('/settings/workspace-members')
        .send({ fullName: 'First Assistant', email: 'a1@test.dev' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBER_LIMIT_REACHED');
    });

    it('unlimited STUDIO customers pass the gate', async () => {
      const session = await registerUser('limit-studio@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'STUDIO', status: 'active' });
      await seedCustomers(session.workspaceId, 30);
      const res = await asUser(session)
        .post('/customers')
        .send({ fullName: 'Unlimited', phone: '0244000002' });
      expect(res.status).toBe(201);
    });
  });

  describe('concurrency-safe limits (Step 13)', () => {
    it('two simultaneous customer creations for the final slot: exactly one succeeds', async () => {
      const session = await registerUser('conc-customers@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'BASIC', status: 'active' });
      await seedCustomers(session.workspaceId, 24); // one slot left

      const [a, b] = await Promise.all([
        asUser(session).post('/customers').send({ fullName: 'Racer A', phone: '0244000003' }),
        asUser(session).post('/customers').send({ fullName: 'Racer B', phone: '0244000004' }),
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 403]);

      const count = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM customers WHERE workspace_id = $1 AND deleted_at IS NULL`,
        [session.workspaceId]
      );
      expect(count.rows[0].n).toBe(25);
    });

    it('two simultaneous staff creations for the final slot: exactly one succeeds', async () => {
      const session = await registerUser('conc-staff@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'PRO', status: 'active' });
      // PRO staff limit = 5; seed 4
      for (let i = 0; i < 4; i++) {
        await query(
          `INSERT INTO workspace_members (id, workspace_id, full_name, email, role)
           VALUES ($1, $2, $3, $4, 'assistant')`,
          [`m-${i}`, session.workspaceId, `Member ${i}`, `m${i}@test.dev`]
        );
      }

      const [a, b] = await Promise.all([
        asUser(session)
          .post('/settings/workspace-members')
          .send({ fullName: 'Racer A', email: 'ra@test.dev' }),
        asUser(session)
          .post('/settings/workspace-members')
          .send({ fullName: 'Racer B', email: 'rb@test.dev' }),
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 403]);

      const count = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM workspace_members WHERE workspace_id = $1`,
        [session.workspaceId]
      );
      expect(count.rows[0].n).toBe(5);
    });
  });

  describe('premium feature enforcement', () => {
    it('BASIC workspace is denied the low-stock premium report (FEATURE_NOT_AVAILABLE)', async () => {
      const session = await registerUser('feature-denied@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'BASIC', status: 'active' });
      const res = await asUser(session).get('/reports/low-stock-materials');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('STUDIO workspace is allowed the low-stock premium report', async () => {
      const session = await registerUser('feature-allowed@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'STUDIO', status: 'active' });
      const res = await asUser(session).get('/reports/low-stock-materials');
      expect(res.status).toBe(200);
    });
  });

  describe('forgery resistance (Steps 35/36)', () => {
    it('client-supplied plan/premium fields are ignored by enforcement', async () => {
      const session = await registerUser('forge-plan@test.dev');
      await setSubscription(session.workspaceId, { planCode: 'BASIC', status: 'active' });
      await seedCustomers(session.workspaceId, 25);

      const res = await asUser(session).post('/customers').send({
        fullName: 'Forged',
        phone: '0244000005',
        plan: 'STUDIO',
        premium: true,
        tier: 'STUDIO',
        subscription: { plan: 'STUDIO', status: 'active' },
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CUSTOMER_LIMIT_REACHED');
    });

    it('forged workspaceId in body/query cannot switch the evaluated workspace', async () => {
      const a = await registerUser('forge-ws-a@test.dev');
      const b = await registerUser('forge-ws-b@test.dev');
      await setSubscription(a.workspaceId, { planCode: 'BASIC', status: 'active' });
      await setSubscription(b.workspaceId, { planCode: 'STUDIO', status: 'active' });
      await seedCustomers(a.workspaceId, 25);

      const res = await asUser(a)
        .post(`/customers?workspaceId=${b.workspaceId}`)
        .send({ fullName: 'Cross', phone: '0244000006', workspaceId: b.workspaceId });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CUSTOMER_LIMIT_REACHED');

      // Nothing landed in workspace B.
      const count = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM customers WHERE workspace_id = $1`,
        [b.workspaceId]
      );
      expect(count.rows[0].n).toBe(0);
    });

    it('checkout rejects unknown plan codes with INVALID_PLAN', async () => {
      const session = await registerUser('forge-checkout@test.dev');
      const res = await asUser(session)
        .post('/billing/checkout')
        .send({ planCode: 'PLATINUM' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PLAN');
    });

    it('checkout rejects the free plan with INVALID_PLAN', async () => {
      const session = await registerUser('forge-basic@test.dev');
      const res = await asUser(session).post('/billing/checkout').send({ planCode: 'BASIC' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PLAN');
    });
  });

  describe('tenant isolation (Step 34)', () => {
    it('workspace A sees only its own subscription and entitlements', async () => {
      const a = await registerUser('iso-a@test.dev');
      const b = await registerUser('iso-b@test.dev');
      await setSubscription(a.workspaceId, { planCode: 'BASIC', status: 'active' });
      await setSubscription(b.workspaceId, { planCode: 'STUDIO', status: 'active' });

      const resA = await asUser(a).get('/billing/entitlements');
      expect(resA.body.effectivePlan).toBe('BASIC');
      const resB = await asUser(b).get('/billing/entitlements');
      expect(resB.body.effectivePlan).toBe('STUDIO');
    });

    it('unauthenticated requests are rejected on all commercial endpoints', async () => {
      for (const [method, path] of [
        ['get', '/billing/subscription'],
        ['get', '/billing/entitlements'],
        ['post', '/billing/checkout'],
        ['post', '/billing/cancel'],
      ] as const) {
        const res =
          method === 'get' ? await request(app).get(path) : await request(app).post(path).send({});
        expect(res.status).toBe(401);
      }
    });

    it('cancel cannot touch another workspace even with forged ids', async () => {
      const a = await registerUser('iso-cancel-a@test.dev');
      const b = await registerUser('iso-cancel-b@test.dev');

      const res = await asUser(a)
        .post('/billing/cancel')
        .send({ workspaceId: b.workspaceId, subscriptionId: 'forged' });
      expect(res.status).toBe(200);
      // A's own subscription cancelled — not B's.
      const bSub = await asUser(b).get('/billing/subscription');
      expect(bSub.body.subscription.status).toBe('trialing');
      const aSub = await asUser(a).get('/billing/subscription');
      expect(aSub.body.subscription.status).toBe('cancelled');
    });
  });

  describe('cancellation flow', () => {
    it('owner can cancel; cancel-at-period-end is recorded with audit', async () => {
      const session = await registerUser('cancel-owner@test.dev');
      const res = await asUser(session).post('/billing/cancel').send({});
      expect(res.status).toBe(200);
      expect(res.body.subscription.status).toBe('cancelled');
      expect(res.body.subscription.cancelAtPeriodEnd).toBe(true);

      const audit = await query(
        `SELECT * FROM audit_logs WHERE action = 'SUBSCRIPTION_CANCELLED' AND user_id = $1`,
        [session.userId]
      );
      expect(audit.rows.length).toBe(1);
    });

    it('double-cancel is rejected with INVALID_SUBSCRIPTION_STATE', async () => {
      const session = await registerUser('cancel-double@test.dev');
      await asUser(session).post('/billing/cancel').send({});
      const res = await asUser(session).post('/billing/cancel').send({});
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_SUBSCRIPTION_STATE');
    });
  });

  describe('legacy licensing compatibility (Step 24)', () => {
    it('workspace without a subscription row falls back to the mapped legacy license tier', async () => {
      const session = await registerUser('legacy-fallback@test.dev');
      // Simulate a pre-migration workspace: remove the subscription.
      await query(`DELETE FROM subscriptions WHERE workspace_id = $1`, [session.workspaceId]);
      // registerUser registers with tier 'free' -> maps to BASIC.
      const res = await asUser(session).get('/billing/entitlements');
      expect(res.status).toBe(200);
      expect(res.body.subscriptionStatus).toBe('none');
      expect(res.body.effectivePlan).toBe('BASIC');
    });
  });
});
