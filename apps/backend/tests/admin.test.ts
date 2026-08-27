import request from 'supertest';
import { app } from '../src/app';
import { registerUser, registerAdmin } from './helpers';

describe('RBAC / admin authorization', () => {
  it('rejects unauthenticated access to admin routes with 401', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a non-admin role with 403', async () => {
    const user = await registerUser('regular@example.com');
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${user.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows an admin role', async () => {
    const admin = await registerAdmin('boss@example.com');
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('enforces RBAC on every admin surface (licenses, audit logs, analytics)', async () => {
    const user = await registerUser('nosy@example.com');
    const admin = await registerAdmin('auditor@example.com');

    for (const path of ['/admin/licenses', '/admin/audit-logs', '/admin/analytics']) {
      const forbidden = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${user.accessToken}`);
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${admin.accessToken}`);
      expect(allowed.status).toBe(200);
    }
  });

  it('records audit logs for auth activity, visible to admin only', async () => {
    const admin = await registerAdmin('logs@example.com');
    const res = await request(app)
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    const actions = res.body.items.map((item: { action: string }) => item.action);
    expect(actions).toContain('user_registered');
  });
});
