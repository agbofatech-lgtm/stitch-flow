/**
 * Phase 9 — Commercial Identity, Customer Onboarding & Authentication.
 *
 * Covers: Ghana phone normalization, identifier-based login (email OR phone),
 * identity uniqueness (case-insensitive email, cross-format phone),
 * suspended-account blocking (login + refresh), secure password recovery
 * (single-use, expiring, enumeration-proof, session-revoking), refresh-token
 * single-use under concurrency, and audit hygiene (no secrets recorded).
 *
 * NOTE: tests/setup.ts truncates tables before EVERY test — each `it` below
 * is fully self-contained by design.
 */
import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser } from './helpers';
import { normalizePhone } from '../src/utils/phone';
import { setEmailTransportForTests, type PasswordResetMail } from '../src/services/emailService';

afterAll(() => setEmailTransportForTests(null));

describe('Phase 9 — phone normalization (unit)', () => {
  const cases: Array<[string, string | null]> = [
    ['0241234567', '+233241234567'],
    ['+233241234567', '+233241234567'],
    ['233241234567', '+233241234567'],
    ['241234567', '+233241234567'],
    ['00233241234567', '+233241234567'],
    ['020 123 4567', '+233201234567'],
    ['050-123-4567', '+233501234567'],
    ['054 123 4567', '+233541234567'],
    ['0551234567', '+233551234567'],
    ['0591234567', '+233591234567'],
    ['+2250701234567', '+2250701234567'], // valid non-Ghana E.164 passes through
    // invalid input — never blindly prefixed
    ['02412345', null], // too short
    ['0141234567', null], // 1X is not a mobile prefix
    ['12345', null],
    ['not-a-phone', null],
    ['', null],
    ['+0331234567', null] // E.164 cannot start with 0
  ];
  it.each(cases)('normalizes %p', (input, expected) => {
    const r = normalizePhone(input);
    if (expected === null) {
      expect(r.ok).toBe(false);
    } else {
      expect(r).toEqual({ ok: true, e164: expected });
    }
  });
});

describe('Phase 9 — registration identity', () => {
  it('stores the phone in canonical E.164', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'phone-owner@p9.test',
      password: 'password123',
      fullName: 'Phone Owner',
      tier: 'free',
      phone: '0241234567'
    });
    expect(res.status).toBe(201);
    expect(res.body.user.phone).toBe('+233241234567');
    const row = await query(`SELECT phone FROM users WHERE email = 'phone-owner@p9.test'`);
    expect(row.rows[0].phone).toBe('+233241234567');
  });

  it('rejects a duplicate phone submitted in a different format (409 PHONE_IN_USE)', async () => {
    const first = await request(app).post('/auth/register').send({
      email: 'phone-owner@p9.test',
      password: 'password123',
      fullName: 'Phone Owner',
      tier: 'free',
      phone: '0241234567'
    });
    expect(first.status).toBe(201);

    const res = await request(app).post('/auth/register').send({
      email: 'phone-dup@p9.test',
      password: 'password123',
      fullName: 'Phone Dup',
      tier: 'free',
      phone: '+233 24 123 4567' // same identity as 0241234567
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_IN_USE');
  });

  it('rejects an invalid phone with 400 INVALID_PHONE_NUMBER', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'bad-phone@p9.test',
      password: 'password123',
      fullName: 'Bad Phone',
      tier: 'free',
      phone: '01234'
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PHONE_NUMBER');
  });

  it('rejects a case-insensitive duplicate email (409 EMAIL_IN_USE)', async () => {
    await registerUser('case-owner@p9.test');
    const res = await request(app).post('/auth/register').send({
      email: 'CASE-OWNER@P9.TEST',
      password: 'password123',
      fullName: 'Case Dup',
      tier: 'free'
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('registration still provisions exactly one workspace + owner membership', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'provision@p9.test',
      password: 'password123',
      fullName: 'Pro Vision',
      tier: 'free',
      phone: '0551112223'
    });
    expect(res.status).toBe(201);
    const ws = res.body.workspace;
    expect(ws.id).toMatch(/^ws-/);
    const members = await query(
      `SELECT role FROM workspace_users WHERE workspace_id = $1`,
      [ws.id]
    );
    expect(members.rows).toHaveLength(1);
    expect(members.rows[0].role).toBe('owner');
    const wsCount = await query(`SELECT COUNT(*)::int AS n FROM workspaces WHERE owner_user_id = $1`, [
      res.body.user.id
    ]);
    expect(wsCount.rows[0].n).toBe(1);
  });
});

describe('Phase 9 — identifier login', () => {
  async function registerDualIdentity() {
    const reg = await request(app).post('/auth/register').send({
      email: 'dual-identity@p9.test',
      password: 'password123',
      fullName: 'Dual Identity',
      tier: 'free',
      phone: '0541234567'
    });
    expect(reg.status).toBe(201);
    return reg.body;
  }

  it('logs in with email (exact case)', async () => {
    await registerDualIdentity();
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'dual-identity@p9.test', password: 'password123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('logs in with email (different case — identity is case-insensitive)', async () => {
    await registerDualIdentity();
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'DUAL-IDENTITY@P9.TEST', password: 'password123' });
    expect(res.status).toBe(200);
  });

  it.each(['0541234567', '+233541234567', '233541234567', '054 123 4567'])(
    'logs in with phone representation %p',
    async (identifier) => {
      await registerDualIdentity();
      const res = await request(app)
        .post('/auth/login')
        .send({ identifier, password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('dual-identity@p9.test');
    }
  );

  it('invalid phone format is indistinguishable from a wrong password (401)', async () => {
    await registerDualIdentity();
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: '01234', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('wrong password via phone is 401', async () => {
    await registerDualIdentity();
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: '0541234567', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

describe('Phase 9 — suspended accounts', () => {
  it('blocks suspended users on email login, phone login AND refresh', async () => {
    await request(app).post('/auth/register').send({
      email: 'suspended@p9.test',
      password: 'password123',
      fullName: 'Suspended User',
      tier: 'free',
      phone: '0209876543'
    });
    const pre = await request(app)
      .post('/auth/login')
      .send({ identifier: 'suspended@p9.test', password: 'password123' });
    expect(pre.status).toBe(200);
    const refreshBefore = pre.body.refreshToken as string;

    await query(`UPDATE users SET status = 'suspended' WHERE email = 'suspended@p9.test'`);

    const emailLogin = await request(app)
      .post('/auth/login')
      .send({ identifier: 'suspended@p9.test', password: 'password123' });
    expect(emailLogin.status).toBe(403);
    expect(emailLogin.body.error.code).toBe('ACCOUNT_INACTIVE');

    const phoneLogin = await request(app)
      .post('/auth/login')
      .send({ identifier: '+233209876543', password: 'password123' });
    expect(phoneLogin.status).toBe(403);

    const refresh = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: refreshBefore });
    expect(refresh.status).toBe(401);
  });
});

describe('Phase 9 — password recovery', () => {
  let captured: PasswordResetMail[] = [];

  beforeEach(() => {
    captured = [];
    setEmailTransportForTests({
      name: 'test-capture',
      async send(mail) {
        captured.push(mail);
        return true;
      }
    });
  });

  function tokenFromLink(link: string): string {
    return new URL(link).searchParams.get('token')!;
  }

  it('full recovery flow: request → link → reset → new password works, old sessions revoked', async () => {
    const session = await registerUser('recover-me@p9.test', 'oldpassword1', 'Recover Me');

    const reqRes = await request(app)
      .post('/auth/forgot-password')
      .send({ identifier: 'recover-me@p9.test' });
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);
    expect(captured).toHaveLength(1);

    const token = tokenFromLink(captured[0].resetLink);
    expect(token).toMatch(/^[0-9a-f]{64}$/); // 256-bit hex secret

    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'newpassword9' });
    expect(resetRes.status).toBe(200);

    // new password works; old password no longer does
    const withNew = await request(app)
      .post('/auth/login')
      .send({ identifier: 'recover-me@p9.test', password: 'newpassword9' });
    expect(withNew.status).toBe(200);
    const withOld = await request(app)
      .post('/auth/login')
      .send({ identifier: 'recover-me@p9.test', password: 'oldpassword1' });
    expect(withOld.status).toBe(401);

    // the pre-reset refresh token was revoked by the reset
    const stale = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken });
    expect(stale.status).toBe(401);
  });

  it('reset tokens are single-use', async () => {
    await registerUser('recover-me@p9.test', 'oldpassword1', 'Recover Me');
    await request(app).post('/auth/forgot-password').send({ identifier: 'recover-me@p9.test' });
    const token = tokenFromLink(captured[0].resetLink);

    const first = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'anotherpass1' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'yetanother1' });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('expired reset tokens are rejected', async () => {
    await registerUser('recover-me@p9.test', 'oldpassword1', 'Recover Me');
    await request(app).post('/auth/forgot-password').send({ identifier: 'recover-me@p9.test' });
    const token = tokenFromLink(captured[0].resetLink);
    await query(`UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute'`);

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'doesnotmatter1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('unknown identifier: identical response, no email sent (enumeration-proof)', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ identifier: 'nobody-here@p9.test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(captured).toHaveLength(0);
  });

  it('only the token HASH is stored; audit trail carries no secret', async () => {
    await registerUser('recover-me@p9.test', 'oldpassword1', 'Recover Me');
    await request(app).post('/auth/forgot-password').send({ identifier: 'recover-me@p9.test' });
    const token = tokenFromLink(captured[0].resetLink);

    const rows = await query(`SELECT token_hash FROM password_reset_tokens ORDER BY created_at DESC LIMIT 1`);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].token_hash).not.toBe(token);
    expect(rows.rows[0].token_hash).toHaveLength(64);

    const audit = await query(
      `SELECT metadata::text AS m FROM audit_logs WHERE action = 'password_reset_requested'`
    );
    expect(audit.rows.length).toBeGreaterThan(0);
    for (const row of audit.rows) {
      expect(row.m).not.toContain(token);
      expect(row.m).not.toContain('reset-password?token=');
    }
  });
});

describe('Phase 9 — refresh single-use under concurrency', () => {
  it('two simultaneous refreshes with the same token: exactly one succeeds', async () => {
    const session = await registerUser('race@p9.test');
    const results = await Promise.all([
      request(app).post('/auth/refresh').send({ refreshToken: session.refreshToken }),
      request(app).post('/auth/refresh').send({ refreshToken: session.refreshToken })
    ]);
    const ok = results.filter((r) => r.status === 200);
    const rejected = results.filter((r) => r.status === 401);
    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
