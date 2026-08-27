import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';

export type AuthSession = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  license: { id: string; license_key: string };
};

export async function registerUser(
  email: string,
  password = 'password123',
  fullName = 'Test User'
): Promise<AuthSession> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password, fullName, tier: 'free' });

  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    userId: res.body.user.id,
    email,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    license: res.body.license,
  };
}

/** Promotes a user to admin and returns a fresh admin-role session. */
export async function registerAdmin(email: string, password = 'password123'): Promise<AuthSession> {
  const session = await registerUser(email, password, 'Test Admin');
  await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [session.userId]);

  const login = await request(app).post('/auth/login').send({ email, password });
  if (login.status !== 200) {
    throw new Error(`admin login failed: ${login.status}`);
  }

  return { ...session, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}
