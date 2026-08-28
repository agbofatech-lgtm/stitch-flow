/**
 * Phase 10 — Developer Control Center (platform operations).
 *
 * Covers: platform/workspace role boundary (workspace owners are NEVER
 * platform operators), customer listing/search/detail hygiene (no credential
 * material), platform-side customer creation through the SHARED provisioning
 * pipeline (no duplicate logic, no tokens to the operator, audited), suspend/
 * reactivate lifecycle (server-authoritative, immediate effect, audited),
 * session revocation, password-reset support action, cross-workspace
 * visibility, operator role grants, audit-trail access, and feature-flag
 * authorization.
 *
 * NOTE: tests/setup.ts truncates tables before EVERY test — each `it` below
 * is fully self-contained by design.
 */
import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';
import { setEmailTransportForTests, type PasswordResetMail } from '../src/services/emailService';

afterAll(() => setEmailTransportForTests(null));

/**
 * Platform roles live in users.role and are minted into the JWT at login, so
 * a fresh login is REQUIRED after the role change — this mirrors production
 * (a role grant takes effect at the operator's next login/refresh).
 */
async function makePlatform(role: string, email: string): Promise<AuthSession> {
  const session = await registerUser(email, 'password123', 'Platform Op');
  await query(`UPDATE users SET role = $1 WHERE id = $2`, [role, session.userId]);
  const login = await request(app).post('/auth/login').send({ identifier: email, password: 'password123' });
  if (login.status !== 200) throw new Error(`platform login failed: ${login.status}`);
  return { ...session, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}

function captureEmails(): PasswordResetMail[] {
  const captured: PasswordResetMail[] = [];
  setEmailTransportForTests({
    name: 'test-capture',
    async send(mail) {
      captured.push(mail);
      return true;
    }
  });
  return captured;
}

describe('Phase 10 — platform/workspace role boundary', () => {
  it('denies a workspace owner every Control Center surface (403)', async () => {
    const owner = await registerUser('ws-owner@p10.test');
    const u = asUser(owner);
    expect((await u.get('/platform/customers')).status).toBe(403);
    expect((await u.get('/platform/audit-logs')).status).toBe(403);
    expect(
      (await u.post('/platform/customers').send({ email: 'x@p10.test', fullName: 'Nope' })).status
    ).toBe(403);
    expect((await u.post('/platform/customers/00000000-0000-0000-0000-000000000000/suspend').send({ reason: 'nope' })).status).toBe(403);
    expect((await u.post('/platform/customers/00000000-0000-0000-0000-000000000000/revoke-sessions')).status).toBe(403);
    expect((await u.post('/platform/operators').send({ email: owner.email, role: 'platform_owner' })).status).toBe(403);
    expect((await u.patch('/platform/flags/DEVELOPER_DASHBOARD').send({ enabled: true })).status).toBe(403);
  });

  it('requires authentication (401 without a token)', async () => {
    expect((await request(app).get('/platform/customers')).status).toBe(401);
  });

  it('lets platform_analyst read but never write', async () => {
    const analyst = await makePlatform('platform_analyst', 'analyst@p10.test');
    const a = asUser(analyst);
    expect((await a.get('/platform/customers')).status).toBe(200);
    expect((await a.get('/platform/audit-logs')).status).toBe(200);
    expect((await a.post('/platform/customers').send({ email: 'x@p10.test', fullName: 'Nope' })).status).toBe(403);
    expect((await a.post('/platform/customers/00000000-0000-0000-0000-000000000000/suspend').send({ reason: 'nope' })).status).toBe(403);
    expect((await a.patch('/platform/flags/DEVELOPER_DASHBOARD').send({ enabled: true })).status).toBe(403);
  });

  it('lets platform_support operate sessions but not write lifecycle changes', async () => {
    const support = await makePlatform('platform_support', 'support@p10.test');
    const customer = await registerUser('cust-s@p10.test');
    const s = asUser(support);
    const revoke = await s.post(`/platform/customers/${customer.userId}/revoke-sessions`);
    expect(revoke.status).toBe(200);
    expect(revoke.body).toEqual({ id: customer.userId, sessionsRevoked: true });
    expect(
      (await s.post(`/platform/customers/${customer.userId}/suspend`).send({ reason: 'not allowed' })).status
    ).toBe(403);
  });

  it('lets platform_owner perform write operations', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const created = await asUser(op)
      .post('/platform/customers')
      .send({ email: 'made-by-owner@p10.test', fullName: 'Owner Made', sendReset: false });
    expect(created.status).toBe(201);
    const suspended = await asUser(op)
      .post(`/platform/customers/${created.body.user.id}/suspend`)
      .send({ reason: 'owner authority check' });
    expect(suspended.status).toBe(200);
    expect(suspended.body.status).toBe('suspended');
  });
});

describe('Phase 10 — platform customer creation', () => {
  it('provisions exactly once through the shared pipeline and issues no tokens to the operator', async () => {
    const captured = captureEmails();
    const op = await makePlatform('platform_admin', 'admin@p10.test');
    const res = await asUser(op)
      .post('/platform/customers')
      .send({ email: 'NEW.Customer@P10.test', fullName: 'New Customer', phone: '0241230001', sendReset: true });
    expect(res.status).toBe(201);

    // Operator never receives credential material.
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    // User row: lowercased email, E.164 phone, active, plain user role.
    const user = await query(`SELECT id, email, phone, role, status FROM users WHERE email = 'new.customer@p10.test'`);
    expect(user.rowCount).toBe(1);
    expect(user.rows[0].phone).toBe('+233241230001');
    expect(user.rows[0].role).toBe('user');
    expect(user.rows[0].status).toBe('active');

    // Workspace + owner membership + trial subscription — provisioned once.
    const ws = await query(
      `SELECT w.id FROM workspaces w JOIN workspace_users wu ON wu.workspace_id = w.id
       WHERE wu.user_id = $1 AND wu.role = 'owner'`,
      [user.rows[0].id]
    );
    expect(ws.rowCount).toBe(1);
    const trial = await query(
      `SELECT status FROM subscriptions WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [ws.rows[0].id]
    );
    expect(trial.rows[0].status).toBe('trialing');
    const licenses = await query(`SELECT id FROM licenses WHERE user_id = $1`, [user.rows[0].id]);
    expect(licenses.rowCount).toBe(1);

    // No sessions exist for the new customer (no tokens were issued).
    const tokens = await query(`SELECT id FROM refresh_tokens WHERE user_id = $1`, [user.rows[0].id]);
    expect(tokens.rowCount).toBe(0);

    // Onboarding uses the existing recovery flow.
    expect(captured.some((m) => m.to === 'new.customer@p10.test' && /reset-password\?token=/.test(m.resetLink))).toBe(true);
  });

  it('rejects duplicate emails (409) without orphaning workspaces', async () => {
    const op = await makePlatform('platform_admin', 'admin@p10.test');
    await asUser(op).post('/platform/customers').send({ email: 'dupe@p10.test', fullName: 'First', sendReset: false });
    const before = await query(`SELECT COUNT(*)::int AS n FROM workspaces`);
    const res = await asUser(op)
      .post('/platform/customers')
      .send({ email: 'DUPE@p10.test', fullName: 'Second', sendReset: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
    const after = await query(`SELECT COUNT(*)::int AS n FROM workspaces`);
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('validates input (400) before touching the database', async () => {
    const op = await makePlatform('platform_admin', 'admin@p10.test');
    const res = await asUser(op).post('/platform/customers').send({ fullName: 'No Email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('audits platform.customer_created with the acting operator as actor', async () => {
    const op = await makePlatform('platform_admin', 'admin@p10.test');
    const res = await asUser(op)
      .post('/platform/customers')
      .send({ email: 'audited@p10.test', fullName: 'Audited One', sendReset: false });
    const audit = await query(
      `SELECT user_id, entity_id, metadata FROM audit_logs WHERE action = 'platform.customer_created'`
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].user_id).toBe(op.userId);
    expect(audit.rows[0].entity_id).toBe(res.body.user.id);
    expect(JSON.stringify(audit.rows[0].metadata)).not.toMatch(/password/i);
  });
});

describe('Phase 10 — customer listing, search and detail hygiene', () => {
  it('lists customers with search (name/email/phone/workspace) and status filter', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    await registerUser('alpha@p10.test');
    await registerUser('beta@p10.test');
    const phoneUser = await registerUser('gamma@p10.test');
    await query(`UPDATE users SET phone = '+233245550001' WHERE id = $1`, [phoneUser.userId]);
    const suspendedUser = await registerUser('delta@p10.test');
    await query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [suspendedUser.userId]);

    const list = await asUser(op).get('/platform/customers?limit=100');
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(5); // 4 customers + operator
    expect(list.body.total).toBe(list.body.items.length);

    const byName = await asUser(op).get('/platform/customers?search=alpha');
    expect(byName.body.items.map((r: { email: string }) => r.email)).toContain('alpha@p10.test');

    // Local-format phone search finds the E.164-stored number.
    const byPhone = await asUser(op).get('/platform/customers?search=0245550001');
    expect(byPhone.body.items.map((r: { email: string }) => r.email)).toContain('gamma@p10.test');

    const suspended = await asUser(op).get('/platform/customers?status=suspended');
    expect(suspended.body.items.every((r: { status: string }) => r.status === 'suspended')).toBe(true);
    expect(suspended.body.items.map((r: { email: string }) => r.email)).toContain('delta@p10.test');

    // Pagination bounds.
    const page = await asUser(op).get('/platform/customers?limit=1&offset=0');
    expect(page.body.items.length).toBe(1);
    expect(page.body.total).toBeGreaterThan(1);
  });

  it('never exposes credential material in list or detail payloads', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const customer = await registerUser('hygiene@p10.test');
    const list = await asUser(op).get('/platform/customers');
    expect(list.text).not.toMatch(/password_hash/);
    const detail = await asUser(op).get(`/platform/customers/${customer.userId}`);
    expect(detail.status).toBe(200);
    expect(detail.text).not.toMatch(/password/i);
    expect(detail.text).not.toMatch(/secret_hash/);
    expect(detail.text).not.toMatch(/\$2[aby]\$/); // bcrypt hash shape
    expect(detail.body.user.status).toBe('active');
    expect(detail.body.workspace.id).toBe(customer.workspaceId);
  });

  it('returns 404 for an unknown customer', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const res = await asUser(op).get('/platform/customers/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('Phase 10 — suspension / reactivation lifecycle', () => {
  it('suspends server-authoritatively: login denied, sessions dead, audited', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const customer = await registerUser('lifecycle@p10.test');

    const res = await asUser(op)
      .post(`/platform/customers/${customer.userId}/suspend`)
      .send({ reason: 'chargeback investigation' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');

    const db = await query(`SELECT status FROM users WHERE id = $1`, [customer.userId]);
    expect(db.rows[0].status).toBe('suspended');

    // Login blocked immediately (Phase 9 ACCOUNT_INACTIVE path).
    const login = await request(app)
      .post('/auth/login')
      .send({ identifier: 'lifecycle@p10.test', password: 'password123' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_INACTIVE');

    // Existing refresh token is revoked — no zombie sessions.
    const refresh = await request(app).post('/auth/refresh').send({ refreshToken: customer.refreshToken });
    expect(refresh.status).toBe(401);

    const audit = await query(
      `SELECT user_id, metadata FROM audit_logs WHERE action = 'platform.customer_suspended' AND entity_id = $1`,
      [customer.userId]
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].user_id).toBe(op.userId);
    expect(audit.rows[0].metadata.reason).toBe('chargeback investigation');
  });

  it('rejects double suspend (409) and unknown customers (404)', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const customer = await registerUser('double@p10.test');
    await asUser(op).post(`/platform/customers/${customer.userId}/suspend`).send({ reason: 'first' });
    const second = await asUser(op)
      .post(`/platform/customers/${customer.userId}/suspend`)
      .send({ reason: 'again' });
    expect(second.status).toBe(409);
    const missing = await asUser(op)
      .post('/platform/customers/00000000-0000-0000-0000-000000000000/suspend')
      .send({ reason: 'ghost' });
    expect(missing.status).toBe(404);
  });

  it('reactivates: login restored, audited, double reactivate 409', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    await registerUser('revive@p10.test');
    const id = (await query(`SELECT id FROM users WHERE email = 'revive@p10.test'`)).rows[0].id;
    await asUser(op).post(`/platform/customers/${id}/suspend`).send({ reason: 'temp' });

    const res = await asUser(op)
      .post(`/platform/customers/${id}/reactivate`)
      .send({ reason: 'resolved with customer' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');

    const login = await request(app)
      .post('/auth/login')
      .send({ identifier: 'revive@p10.test', password: 'password123' });
    expect(login.status).toBe(200);

    const again = await asUser(op).post(`/platform/customers/${id}/reactivate`).send({ reason: 'twice' });
    expect(again.status).toBe(409);

    const audit = await query(
      `SELECT user_id, metadata FROM audit_logs WHERE action = 'platform.customer_reactivated' AND entity_id = $1`,
      [id]
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].metadata.reason).toBe('resolved with customer');
  });

  it('revokes sessions independently of account status', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const customer = await registerUser('sessions@p10.test');

    const res = await asUser(op).post(`/platform/customers/${customer.userId}/revoke-sessions`);
    expect(res.status).toBe(200);

    // Refresh is dead...
    const refresh = await request(app).post('/auth/refresh').send({ refreshToken: customer.refreshToken });
    expect(refresh.status).toBe(401);
    // ...but the account itself still signs in (status untouched).
    const login = await request(app)
      .post('/auth/login')
      .send({ identifier: 'sessions@p10.test', password: 'password123' });
    expect(login.status).toBe(200);
    const db = await query(`SELECT status FROM users WHERE id = $1`, [customer.userId]);
    expect(db.rows[0].status).toBe('active');

    const audit = await query(
      `SELECT user_id FROM audit_logs WHERE action = 'platform.sessions_revoked' AND entity_id = $1`,
      [customer.userId]
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].user_id).toBe(op.userId);
  });

  it('sends a password reset without revealing any secret', async () => {
    const captured = captureEmails();
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const customer = await registerUser('resetme@p10.test');
    const res = await asUser(op).post(`/platform/customers/${customer.userId}/send-reset`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: customer.userId, resetRequested: true });
    expect(captured.some((m) => m.to === 'resetme@p10.test' && /reset-password\?token=/.test(m.resetLink))).toBe(true);
    expect(res.text).not.toMatch(/resetToken|token=/i);
    const audit = await query(
      `SELECT id FROM audit_logs WHERE action = 'platform.password_reset_sent' AND entity_id = $1`,
      [customer.userId]
    );
    expect(audit.rowCount).toBe(1);
  });
});

describe('Phase 10 — cross-workspace visibility and operators', () => {
  it('shows workspace detail to platform operators but not to its own owner', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    const customer = await registerUser('tenant@p10.test');

    const detail = await asUser(op).get(`/platform/workspaces/${customer.workspaceId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.workspace.id).toBe(customer.workspaceId);
    expect(detail.body.owner.email).toBe('tenant@p10.test');
    expect(detail.body.members.length).toBe(1);
    expect(detail.body.stats).toBeTruthy();

    const self = await asUser(customer).get(`/platform/workspaces/${customer.workspaceId}`);
    expect(self.status).toBe(403); // workspace owner ≠ platform operator
  });

  it('grants operator roles (audited); the grantee gains only that level', async () => {
    const owner = await makePlatform('platform_owner', 'owner@p10.test');
    const staff = await registerUser('staff@p10.test');
    const customer = await registerUser('target@p10.test');

    const grant = await asUser(owner)
      .post('/platform/operators')
      .send({ email: 'STAFF@p10.test', role: 'platform_support' });
    expect(grant.status).toBe(200);
    expect(grant.body.role).toBe('platform_support');

    const audit = await query(
      `SELECT user_id, metadata FROM audit_logs WHERE action = 'platform.operator_role_changed'`
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].user_id).toBe(owner.userId);
    expect(audit.rows[0].metadata.targetEmail).toBe('staff@p10.test');

    // Role claim is minted at login — after re-login the grantee can operate
    // (session revocation) but NOT write (suspension).
    const login = await request(app).post('/auth/login').send({ identifier: 'staff@p10.test', password: 'password123' });
    const supportSession = { ...staff, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
    expect((await asUser(supportSession).post(`/platform/customers/${customer.userId}/revoke-sessions`)).status).toBe(200);
    expect(
      (await asUser(supportSession).post(`/platform/customers/${customer.userId}/suspend`).send({ reason: 'nope' })).status
    ).toBe(403);
  });

  it('refuses self-role-change (400) and unknown emails (404)', async () => {
    const owner = await makePlatform('platform_owner', 'owner@p10.test');
    const self = await asUser(owner)
      .post('/platform/operators')
      .send({ email: 'owner@p10.test', role: 'platform_analyst' });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('CANNOT_CHANGE_OWN_ROLE');

    const ghost = await asUser(owner)
      .post('/platform/operators')
      .send({ email: 'ghost@p10.test', role: 'platform_admin' });
    expect(ghost.status).toBe(404);
  });

  it('rejects invalid role values (400) via schema validation', async () => {
    const owner = await makePlatform('platform_owner', 'owner@p10.test');
    const res = await asUser(owner)
      .post('/platform/operators')
      .send({ email: 'someone@p10.test', role: 'platform_god' });
    expect(res.status).toBe(400);
  });
});

describe('Phase 10 — webhook operations', () => {
  it('operate role can dispatch the outbox and the run is audited; analyst cannot', async () => {
    const support = await makePlatform('platform_support', 'support@p10.test');
    const res = await asUser(support).post('/platform/webhooks/dispatch');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dispatch');
    expect(res.body).toHaveProperty('drain');

    const audit = await query(
      `SELECT user_id, metadata FROM audit_logs WHERE action = 'platform.webhooks_dispatched'`
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].user_id).toBe(support.userId);

    const analyst = await makePlatform('platform_analyst', 'analyst@p10.test');
    expect((await asUser(analyst).post('/platform/webhooks/dispatch')).status).toBe(403);
  });
});

describe('Phase 10 — audit trail access and flag authorization', () => {
  it('exposes the audit trail to readers with action filtering', async () => {
    const op = await makePlatform('platform_owner', 'owner@p10.test');
    await asUser(op).post('/platform/customers').send({ email: 'trail@p10.test', fullName: 'Trail', sendReset: false });

    const all = await asUser(op).get('/platform/audit-logs?limit=50');
    expect(all.status).toBe(200);
    expect(all.body.length).toBeGreaterThan(0);
    expect(all.body[0]).toHaveProperty('action');
    expect(all.body[0]).toHaveProperty('created_at');
    expect(all.text).not.toMatch(/password/i);

    const filtered = await asUser(op).get('/platform/audit-logs?action=platform.customer_created');
    expect(filtered.body.length).toBe(1);
    expect(filtered.body[0].action).toBe('platform.customer_created');

    const analyst = await makePlatform('platform_analyst', 'analyst@p10.test');
    expect((await asUser(analyst).get('/platform/audit-logs')).status).toBe(200);
  });

  it('feature-flag mutation stays write-level and audited', async () => {
    const owner = await makePlatform('platform_owner', 'owner@p10.test');
    const res = await asUser(owner).patch('/platform/flags/DEVELOPER_DASHBOARD').send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);

    const audit = await query(
      `SELECT user_id, entity_id, metadata FROM audit_logs WHERE action = 'platform.feature_flag_changed'`
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0].user_id).toBe(owner.userId);
    expect(audit.rows[0].entity_id).toBe('DEVELOPER_DASHBOARD');

    const analyst = await makePlatform('platform_analyst', 'analyst@p10.test');
    expect((await asUser(analyst).patch('/platform/flags/DEVELOPER_DASHBOARD').send({ enabled: false })).status).toBe(403);
  });
});
