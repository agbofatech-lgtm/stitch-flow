import crypto from 'crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { refreshTokenRepository } from '../src/repositories/refreshTokenRepository';
import { signRefreshToken, JWT_ISSUER, JWT_AUDIENCE } from '../src/utils/jwt';
import { registerUser, asUser, type AuthSession } from './helpers';

describe('Phase 4 hardening', () => {
  describe('refresh-token security (§10)', () => {
    it('concurrent refresh with the same token: exactly ONE succeeds (single-use)', async () => {
      const user = await registerUser('conc-refresh@example.com');

      const attempts = await Promise.all([
        request(app).post('/auth/refresh').send({ refreshToken: user.refreshToken }),
        request(app).post('/auth/refresh').send({ refreshToken: user.refreshToken }),
        request(app).post('/auth/refresh').send({ refreshToken: user.refreshToken }),
      ]);

      const successes = attempts.filter((res) => res.status === 200);
      const rejections = attempts.filter((res) => res.status === 401);
      expect(successes).toHaveLength(1);
      expect(rejections).toHaveLength(2);
    });

    it('expired refresh token (valid signature, expired at rest) is rejected', async () => {
      const user = await registerUser('expired-refresh@example.com');
      const token = signRefreshToken({
        sub: user.userId,
        email: user.email,
        role: 'user',
        workspaceId: user.workspaceId,
      });
      // stored as already expired
      await refreshTokenRepository.create(user.userId, token, new Date(Date.now() - 1000));

      const res = await request(app).post('/auth/refresh').send({ refreshToken: token });
      expect(res.status).toBe(401);
    });

    it('logout then refresh with the same token is rejected', async () => {
      const user = await registerUser('logout-refresh@example.com');
      await request(app).post('/auth/logout').send({ refreshToken: user.refreshToken });
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(res.status).toBe(401);
    });

    it('a random unsigned/garbage refresh token is rejected before storage lookup', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'garbage.token.value' });
      expect(res.status).toBe(401);
    });
  });

  describe('workspace role authorization matrix (§11)', () => {
    let owner: AuthSession;
    let assistantToken: string;

    beforeEach(async () => {
      owner = await registerUser('role-owner@example.com');
      const assistant = await registerUser('role-assistant@example.com');
      // existing role model: add assistant membership in owner's workspace
      await query(
        `INSERT INTO workspace_users (workspace_id, user_id, role) VALUES ($1, $2, 'assistant')`,
        [owner.workspaceId, assistant.userId]
      );
      // token scoped to the owner's workspace (membership verified server-side)
      assistantToken = jwt.sign(
        { sub: assistant.userId, email: assistant.email, role: 'user', workspaceId: owner.workspaceId },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );
    });

    it('assistant can READ workspace data but NOT manage members/settings', async () => {
      const read = await request(app)
        .get('/customers')
        .set('Authorization', `Bearer ${assistantToken}`);
      expect(read.status).toBe(200);

      const addMember = await request(app)
        .post('/settings/workspace-members')
        .set('Authorization', `Bearer ${assistantToken}`)
        .send({ fullName: 'Sneaky Add', email: 'x@example.com' });
      expect(addMember.status).toBe(403);
      expect(addMember.body.error.code).toBe('FORBIDDEN_WORKSPACE_ROLE');

      const putSetting = await request(app)
        .put('/settings/branding')
        .set('Authorization', `Bearer ${assistantToken}`)
        .send({ value: { brandColor: '#000' } });
      expect(putSetting.status).toBe(403);
    });

    it('owner CAN manage members and settings', async () => {
      const addMember = await asUser(owner)
        .post('/settings/workspace-members')
        .send({ fullName: 'Legit Member', email: 'legit@example.com' });
      expect(addMember.status).toBe(201);

      const putSetting = await asUser(owner)
        .put('/settings/branding')
        .send({ value: { brandColor: '#0F6E8C' } });
      expect(putSetting.status).toBe(200);
    });

    it('assistant membership grants only that workspace (no privilege on others)', async () => {
      const outsider = await registerUser('role-outsider@example.com');
      const forged = jwt.sign(
        { sub: outsider.userId, email: outsider.email, role: 'user', workspaceId: owner.workspaceId },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );
      const res = await request(app)
        .get('/customers')
        .set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_A_MEMBER');
    });
  });

  describe('input validation hardening (§13)', () => {
    let session: AuthSession;
    let api: ReturnType<typeof asUser>;
    let customerId: string;

    beforeEach(async () => {
      session = await registerUser('validate@example.com');
      api = asUser(session);
      const customer = await api
        .post('/customers')
        .send({ fullName: 'Val Customer', phone: '+233200000040' });
      customerId = customer.body.id;
    });

    it.each([
      ['NaN', 'not-a-number'],
      ['Infinity', 'Infinity'],
      ['negative', -100],
    ])('invoice with %s totalAmount is rejected with 400', async (_label, value) => {
      const res = await api.post('/invoices').send({
        customerId,
        invoiceNumber: 'INV-BAD',
        totalAmount: value,
      });
      expect(res.status).toBe(400);
    });

    it('negative amountPaid is rejected', async () => {
      const res = await api.post('/invoices').send({
        customerId,
        invoiceNumber: 'INV-NEG-PAID',
        totalAmount: 100,
        amountPaid: -5,
      });
      expect(res.status).toBe(400);
    });

    it('negative and zero payment amounts are rejected', async () => {
      const invoice = await api.post('/invoices').send({
        customerId,
        invoiceNumber: 'INV-PAY-VAL',
        totalAmount: 100,
      });
      for (const amount of [-10, 0, 'NaN']) {
        const res = await api.post('/payments').send({
          invoiceId: invoice.body.id,
          customerId,
          amount,
          method: 'Cash',
          referenceCode: `PAY-${crypto.randomUUID().slice(0, 6)}`,
        });
        expect(res.status).toBe(400);
      }
    });
  });

  describe('audit logging (§41)', () => {
    it('payment creation and overpay failure produce audit events', async () => {
      const session = await registerUser('audit-pay@example.com');
      const api = asUser(session);
      const customer = await api
        .post('/customers')
        .send({ fullName: 'Audit Customer', phone: '+233200000050' });
      const invoice = await api.post('/invoices').send({
        customerId: customer.body.id,
        invoiceNumber: 'INV-AUDIT',
        totalAmount: 100,
      });

      const ok = await api.post('/payments').send({
        invoiceId: invoice.body.id,
        customerId: customer.body.id,
        amount: 100,
        method: 'Cash',
        referenceCode: 'PAY-AUDIT-1',
      });
      expect(ok.status).toBe(201);

      const overpay = await api.post('/payments').send({
        invoiceId: invoice.body.id,
        customerId: customer.body.id,
        amount: 500,
        method: 'Cash',
        referenceCode: 'PAY-AUDIT-2',
      });
      expect(overpay.status).toBe(400);

      const events = await query(
        `SELECT action, metadata FROM audit_logs WHERE action IN ('payment_created', 'payment_failed')`
      );
      const actions = events.rows.map((row: any) => row.action);
      expect(actions).toContain('payment_created');
      expect(actions).toContain('payment_failed');
      const created = events.rows.find((row: any) => row.action === 'payment_created');
      expect(created).toBeDefined();
      expect(created!.metadata.workspaceId).toBe(session.workspaceId);
      // audit entries answer WHO/WHAT/WORKSPACE without sensitive payloads
      expect(JSON.stringify(created!.metadata)).not.toMatch(/password|token|secret/i);
    });
  });

  describe('error envelope (§39–§40)', () => {
    it('errors are sanitized and carry no SQL/stack/internal details', async () => {
      const res = await request(app).get('/definitely-not-real');
      expect(res.status).toBe(404);
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/postgres|sql|stack|node_modules|\/home\//i);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
