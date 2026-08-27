import crypto from 'crypto';
import request from 'supertest';
import { app } from '../src/app';
import { registerUser } from './helpers';

function change(table: string, id: string, payload: Record<string, unknown> = {}) {
  return {
    table,
    operation: 'insert',
    clientId: crypto.randomUUID(),
    data: { id, ...payload },
    timestamp: new Date().toISOString(),
  };
}

describe('Sync + tenant/user isolation', () => {
  it('pushes changes and pulls them back for the same user', async () => {
    const userA = await registerUser('sync-a@example.com');

    const push = await request(app)
      .post('/sync/push')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ changes: [change('customers', 'c-1', { fullName: 'Efua' }), change('orders', 'o-1')] });

    expect(push.status).toBe(202);
    expect(push.body.accepted).toBe(2);

    const pull = await request(app)
      .get('/sync/pull')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .query({ since: '1970-01-01T00:00:00.000Z', tables: 'customers,orders' });

    expect(pull.status).toBe(200);
    expect(pull.body.changes).toHaveLength(2);
    expect(pull.body.changes.map((c: { table: string }) => c.table).sort()).toEqual([
      'customers',
      'orders',
    ]);
  });

  it("does NOT leak user A's changes to user B (cross-boundary rejection)", async () => {
    const userA = await registerUser('iso-a@example.com');
    const userB = await registerUser('iso-b@example.com');

    await request(app)
      .post('/sync/push')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ changes: [change('customers', 'c-secret', { fullName: 'Private Customer' })] });

    const pullAsB = await request(app)
      .get('/sync/pull')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .query({ since: '1970-01-01T00:00:00.000Z', tables: 'customers' });

    expect(pullAsB.status).toBe(200);
    expect(pullAsB.body.changes).toHaveLength(0);

    const pullAsA = await request(app)
      .get('/sync/pull')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .query({ since: '1970-01-01T00:00:00.000Z', tables: 'customers' });

    expect(pullAsA.body.changes).toHaveLength(1);
  });

  it('rejects unauthenticated sync operations', async () => {
    const push = await request(app).post('/sync/push').send({ changes: [] });
    expect(push.status).toBe(401);

    const pull = await request(app)
      .get('/sync/pull')
      .query({ since: '1970-01-01T00:00:00.000Z', tables: 'customers' });
    expect(pull.status).toBe(401);
  });

  it('scopes workspace members to their workspace', async () => {
    const create = await request(app).post('/settings/workspace-members').send({
      workspaceId: 'workspace-a',
      fullName: 'Assistant A',
      email: 'assistant-a@example.com',
      role: 'assistant',
    });
    expect(create.status).toBe(201);

    const inA = await request(app).get('/settings/workspace-members?workspaceId=workspace-a');
    expect(inA.status).toBe(200);
    expect(inA.body).toHaveLength(1);

    const inB = await request(app).get('/settings/workspace-members?workspaceId=workspace-b');
    expect(inB.status).toBe(200);
    expect(inB.body).toHaveLength(0);
  });
});
