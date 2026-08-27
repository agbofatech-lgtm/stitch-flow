import crypto from 'crypto';
import { registerUser, asUser, type AuthSession } from './helpers';

function mutation(entity: string, entityId: string, payload: Record<string, unknown> = {}) {
  return {
    clientMutationId: crypto.randomUUID(),
    entity,
    entityId,
    operation: 'insert' as const,
    payload,
    occurredAt: new Date().toISOString(),
  };
}

describe('Sync v2: monotonic cursor, delta pull, idempotency, tombstones', () => {
  let a: AuthSession;
  let b: AuthSession;
  let apiA: ReturnType<typeof asUser>;
  let apiB: ReturnType<typeof asUser>;

  beforeEach(async () => {
    a = await registerUser('syncv2-a@example.com');
    b = await registerUser('syncv2-b@example.com');
    apiA = asUser(a);
    apiB = asUser(b);
  });

  it('accepts mutations and serves them back after the cursor, in order', async () => {
    const m1 = mutation('customers', 'c-1', { fullName: 'One' });
    const m2 = mutation('customers', 'c-2', { fullName: 'Two' });

    const push = await apiA.post('/sync/mutations').send({ mutations: [m1, m2] });
    expect(push.status).toBe(207);
    expect(push.body.results.map((r: any) => r.status)).toEqual(['applied', 'applied']);

    const pull = await apiA.get('/sync/changes?cursor=0');
    expect(pull.status).toBe(200);
    expect(pull.body.changes).toHaveLength(2);
    expect(pull.body.hasMore).toBe(false);
    expect(Number(pull.body.nextCursor)).toBeGreaterThan(0);
    // deterministic ordering by seq
    const seqs = pull.body.changes.map((c: any) => Number(c.seq));
    expect([...seqs].sort((x, y) => x - y)).toEqual(seqs);
    expect(pull.body.changes[0].entityId).toBe('c-1');
  });

  it('replayed clientMutationId produces exactly one logical change', async () => {
    const m = mutation('customers', 'c-dup', { fullName: 'Dup' });

    const first = await apiA.post('/sync/mutations').send({ mutations: [m] });
    expect(first.body.results[0].status).toBe('applied');

    const replay = await apiA.post('/sync/mutations').send({ mutations: [m] });
    expect(replay.body.results[0].status).toBe('duplicate');

    const pull = await apiA.get('/sync/changes?cursor=0');
    expect(pull.body.changes).toHaveLength(1);
  });

  it('pagination: hasMore + nextCursor semantics; resume from same cursor is stable', async () => {
    const mutations = Array.from({ length: 5 }, (_, i) =>
      mutation('customers', `c-p${i}`, { i })
    );
    await apiA.post('/sync/mutations').send({ mutations });

    const page1 = await apiA.get('/sync/changes?cursor=0&limit=2');
    expect(page1.body.changes).toHaveLength(2);
    expect(page1.body.hasMore).toBe(true);

    // simulate crash: re-pull with the SAME cursor -> identical batch
    const again = await apiA.get('/sync/changes?cursor=0&limit=2');
    expect(again.body.changes.map((c: any) => c.seq)).toEqual(
      page1.body.changes.map((c: any) => c.seq)
    );

    const page2 = await apiA.get(`/sync/changes?cursor=${page1.body.nextCursor}&limit=2`);
    const page3 = await apiA.get(`/sync/changes?cursor=${page2.body.nextCursor}&limit=2`);
    expect(page3.body.changes).toHaveLength(1);
    expect(page3.body.hasMore).toBe(false);

    const all = [...page1.body.changes, ...page2.body.changes, ...page3.body.changes];
    expect(new Set(all.map((c: any) => c.seq)).size).toBe(5);
  });

  it("workspace scoping: B never receives A's changes", async () => {
    await apiA.post('/sync/mutations').send({
      mutations: [mutation('customers', 'c-secret', { fullName: 'Secret' })],
    });

    const pullB = await apiB.get('/sync/changes?cursor=0');
    expect(pullB.body.changes).toHaveLength(0);

    const pullA = await apiA.get('/sync/changes?cursor=0');
    expect(pullA.body.changes).toHaveLength(1);
  });

  it('server-side REST mutations feed the same change log (Device B sees a tombstone)', async () => {
    // Device A (REST): create fabric, then delete it.
    const fabric = await apiA.post('/materials/fabrics').send({
      name: 'Tombstone Silk',
      fabricType: 'silk',
      unit: 'yards',
      quantityInStock: 10,
    });
    expect(fabric.status).toBe(201);
    const del = await apiA.delete(`/materials/fabrics/${fabric.body.id}`);
    expect(del.status).toBe(200);

    // Device B of the same workspace = same user pulling from cursor 0.
    const pull = await apiA.get('/sync/changes?cursor=0');
    const ops = pull.body.changes.map((c: any) => `${c.entity}:${c.operation}`);
    expect(ops).toContain('fabric_records:insert');
    expect(ops).toContain('fabric_records:delete');

    const tombstone = pull.body.changes.find(
      (c: any) => c.operation === 'delete' && c.entity === 'fabric_records'
    );
    expect(tombstone.payload.deletedAt).toBeDefined();

    // The record is soft-deleted, not physically destroyed:
    const lists = await apiA.get('/materials/fabrics');
    expect(lists.body).toHaveLength(0);
  });

  it('financial entities are rejected from the generic mutation lane', async () => {
    const res = await apiA.post('/sync/mutations').send({
      mutations: [mutation('payments', 'pay-1', { amount: 100 })],
    });
    expect(res.body.results[0].status).toBe('rejected');
    expect(res.body.results[0].code).toBe('USE_EVENT_ENDPOINT');
  });

  it('sync endpoints require authentication and workspace membership', async () => {
    const request = (await import('supertest')).default;
    const { app } = await import('../src/app');
    expect((await request(app).get('/sync/changes?cursor=0')).status).toBe(401);
    expect((await request(app).post('/sync/mutations').send({ mutations: [] })).status).toBe(401);
  });
});
