import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';

export type AuthSession = {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  license: { id: string; license_key: string };
  workspaceId: string;
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
    workspaceId: res.body.workspace.id,
  };
}

/** Convenience: supertest request pre-authorized as the given session. */
export function asUser(session: AuthSession) {
  return {
    get: (url: string) =>
      request(app).get(url).set('Authorization', `Bearer ${session.accessToken}`),
    post: (url: string) =>
      request(app).post(url).set('Authorization', `Bearer ${session.accessToken}`),
    put: (url: string) =>
      request(app).put(url).set('Authorization', `Bearer ${session.accessToken}`),
    patch: (url: string) =>
      request(app).patch(url).set('Authorization', `Bearer ${session.accessToken}`),
    delete: (url: string) =>
      request(app).delete(url).set('Authorization', `Bearer ${session.accessToken}`),
  };
}

/** Promotes a user to admin and returns a fresh admin-role session. */
export async function registerAdmin(email: string, password = 'password123'): Promise<AuthSession> {
  const session = await registerUser(email, password, 'Test Admin');
  await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [session.userId]);

  const login = await request(app).post('/auth/login').send({ identifier: email, password });
  if (login.status !== 200) {
    throw new Error(`admin login failed: ${login.status}`);
  }

  return { ...session, accessToken: login.body.accessToken, refreshToken: login.body.refreshToken };
}
