import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { registerUser } from './helpers';

describe('Authentication', () => {
  describe('registration', () => {
    it('registers a user and returns user, license and tokens', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'ama@example.com',
        password: 'password123',
        fullName: 'Ama Mensah',
        tier: 'free',
      });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('ama@example.com');
      expect(res.body.user.role).toBe('user');
      expect(res.body.license.license_key).toMatch(/^STITCH-/);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('rejects a duplicate email with 409', async () => {
      await registerUser('dup@example.com');
      const res = await request(app).post('/auth/register').send({
        email: 'dup@example.com',
        password: 'password123',
        fullName: 'Dup User',
        tier: 'free',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_IN_USE');
    });

    it('rejects invalid payloads with 400 (validation)', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'not-an-email',
        password: 'short',
        fullName: 'X',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('login', () => {
    it('logs in with valid credentials', async () => {
      await registerUser('login@example.com', 'password123');
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('rejects a wrong password with 401', async () => {
      await registerUser('wrongpw@example.com', 'password123');
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'wrongpw@example.com', password: 'password456' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an unknown email with 401', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('JWT validation on protected routes', () => {
    it('rejects a missing token with 401', async () => {
      const res = await request(app).post('/sync/push').send({ changes: [] });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a malformed token with 401', async () => {
      const res = await request(app)
        .post('/sync/push')
        .set('Authorization', 'Bearer not-a-jwt')
        .send({ changes: [] });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects an expired token with 401', async () => {
      const user = await registerUser('expired@example.com');
      const expired = jwt.sign(
        { sub: user.userId, email: user.email, role: 'user' },
        process.env.JWT_SECRET as string,
        { expiresIn: -10 }
      );

      const res = await request(app)
        .post('/sync/push')
        .set('Authorization', `Bearer ${expired}`)
        .send({ changes: [] });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects a token signed with the wrong secret with 401', async () => {
      const forged = jwt.sign(
        { sub: '00000000-0000-0000-0000-000000000000', email: 'x@example.com', role: 'admin' },
        'attacker-secret',
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${forged}`);

      expect(res.status).toBe(401);
    });
  });

  describe('refresh tokens', () => {
    it('rotates the refresh token and returns a new access token', async () => {
      const user = await registerUser('refresh@example.com');

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.refreshToken).not.toBe(user.refreshToken);
    });

    it('rejects a rotated (already-used) refresh token', async () => {
      const user = await registerUser('rotate@example.com');

      const first = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(first.status).toBe(200);

      const replay = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(replay.status).toBe(401);
      expect(replay.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects an unknown refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'unknown-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('logout / revocation', () => {
    it('revokes the refresh token on logout', async () => {
      const user = await registerUser('logout@example.com');

      const logout = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: user.refreshToken });
      expect(logout.status).toBe(200);

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(res.status).toBe(401);
    });
  });
});
