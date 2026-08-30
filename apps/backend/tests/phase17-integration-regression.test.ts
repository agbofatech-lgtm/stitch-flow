/**
 * Phase 17 Integration Recovery — R3 regression certification.
 *
 * Root cause being guarded: /ai/measurement-review/:profileId validated the
 * id as a bare UUID, while Phase 13 issues `mp-<uuid>` — so the ONLY real
 * product path always failed with 400 "Invalid uuid". The earlier suite
 * (P17-API6) never sent an issued id, which is why it stayed green.
 *
 * These tests exercise the complete cross-phase chain with REAL issued ids:
 *   Phase 13 API issues profile (mp-…)
 *     → Phase 17 route validation
 *     → workspace-scoped profile lookup
 *     → AI context construction
 *     → deterministic fallback (no external provider)
 *     → advisory response.
 */

import request from 'supertest';
import { app } from '../src/app';
import { registerUser, asUser, type AuthSession } from './helpers';
import { providerRegistry } from '../src/providers/contracts';
import { createDeterministicAIProvider } from '../src/modules/ai/providers/DeterministicAIProvider';
import { resetAIRateLimits } from '../src/routes/aiRoutes';

function enableAI(): void {
  providerRegistry.register('ai', createDeterministicAIProvider({ failure: 'none' }));
  process.env.AI_ENABLED = 'true';
}

function disableAI(): void {
  (providerRegistry as unknown as { register: (k: string, v: unknown) => void }).register('ai', null);
  delete process.env.AI_ENABLED;
}

async function createCustomer(session: AuthSession, fullName: string): Promise<string> {
  const res = await request(app)
    .post('/customers')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({ fullName, phone: '+233200000000', email: '', address: '', notes: '' });
  if (res.status !== 201) throw new Error(`customer create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return (res.body.customer?.id ?? res.body.id) as string;
}

/** Create a REAL Phase 13 profile and return its issued `mp-…` id. */
async function issueProfile(session: AuthSession, customerId: string): Promise<string> {
  const res = await request(app)
    .post(`/customers/${customerId}/measurement-profiles`)
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({ name: 'R3 regression fitting' });
  if (res.status !== 201) throw new Error(`profile create failed: ${res.status} ${JSON.stringify(res.body)}`);
  expect(res.body.profile.id).toMatch(/^mp-[0-9a-f-]{36}$/i);
  return res.body.profile.id as string;
}

let user: AuthSession;
let customerId: string;

beforeEach(async () => {
  resetAIRateLimits();
  disableAI();
  user = await registerUser(`r3-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`);
  customerId = await createCustomer(user, 'Ama Serwaa');
});

afterEach(() => {
  disableAI();
});

describe('Phase 17 Integration — R3 canonical measurement profile id contract', () => {
  it('IR-A: canonical issued id (mp-…) is accepted end-to-end and returns an advisory', async () => {
    enableAI();
    const profileId = await issueProfile(user, customerId);

    const res = await asUser(user).post(`/ai/measurement-review/${profileId}`);
    expect(res.status).toBe(200);
    expect(res.body.purpose).toBe('measurement_review');
    expect(Array.isArray(res.body.findings)).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(Array.isArray(res.body.limitations)).toBe(true);
  });

  it('IR-B: malformed id still receives a meaningful validation error', async () => {
    enableAI();
    const res = await asUser(user).post('/ai/measurement-review/not-a-profile-id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // The old blind spot: a syntactically valid bare UUID is ALSO malformed
    // for this domain — it can never be an issued Phase 13 id.
    const bareUuid = await asUser(user).post(
      '/ai/measurement-review/00000000-0000-0000-0000-000000000000'
    );
    expect(bareUuid.status).toBe(400);
    expect(bareUuid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('IR-C: a real id from ANOTHER workspace must not expose data (404, tenant-safe)', async () => {
    enableAI();
    const intruder = await registerUser(`r3x-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`);
    const profileId = await issueProfile(user, customerId); // belongs to `user`'s workspace

    const res = await asUser(intruder).post(`/ai/measurement-review/${profileId}`);
    expect(res.status).toBe(404); // workspace-scoped lookup: no leak, no 403 oracle
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body).not.toContain('Ama');
  });

  it('IR-D: well-formed but unknown id returns the canonical missing-resource response', async () => {
    enableAI();
    const res = await asUser(user).post(
      '/ai/measurement-review/mp-00000000-0000-0000-0000-000000000000'
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('IR-E: deterministic fallback still answers (advisory, degraded, no provider) with a REAL id', async () => {
    // No provider registered (disableAI state) — gateway must degrade, never fail.
    const profileId = await issueProfile(user, customerId);

    const res = await asUser(user).post(`/ai/measurement-review/${profileId}`);
    expect(res.status).toBe(200);
    expect(res.body.purpose).toBe('measurement_review');
    expect(res.body.status).toBe('degraded');
    expect(
      res.body.limitations.some((l: { code?: string }) => l.code === 'ai_no_provider')
    ).toBe(true);
    // Advisory-only: deterministic validation remains the authority.
    expect(res.body).not.toHaveProperty('authoritative');
  });
});
