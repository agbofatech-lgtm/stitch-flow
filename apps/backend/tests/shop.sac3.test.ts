import request from 'supertest';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { createShopService } from '../src/shop/service';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';

async function harness() {
  const runtime = createPlatformRuntime(createPlatformStore());
  const shop = createShopService();
  const app = await createApp({ platform: runtime, shop });
  return { app, runtime, shop };
}

function auth(token: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function register(app: Awaited<ReturnType<typeof createApp>>, email: string, tenantName: string) {
  const res = await request(app).post('/auth/register').send({
    email,
    password: 'password1',
    displayName: email,
    tenantName,
  });
  return res.body as {
    accessToken: string;
    tenant: { id: string };
    workspace: { id: string };
    identity: { id: string };
  };
}

describe('SAC-3 authenticated shop API', () => {
  test('identity without membership is rejected', async () => {
    const { app, runtime } = await harness();
    const owner = await register(app, 'nomem@shop.test', 'No Mem');
    for (const [id, membership] of [...runtime.store.memberships.entries()]) {
      if (membership.identityId === owner.identity.id) runtime.store.memberships.delete(id);
    }
    const res = await request(app).get('/shop/customers').set(auth(owner.accessToken));
    expect(res.status).toBe(403);
  });

  test('unauthenticated and invalid tokens are rejected', async () => {
    const { app } = await harness();
    const missing = await request(app).get('/shop/customers');
    expect(missing.status).toBe(401);
    const bad = await request(app).get('/shop/customers').set({ Authorization: 'Bearer not-a-jwt' });
    expect(bad.status).toBe(401);
  });

  test('legacy unauthenticated business routes remain unmounted', async () => {
    const { app } = await harness();
    const res = await request(app).get('/customers');
    expect(res.status).toBe(404);
  });

  test('authorized customer and order operations stay in tenant+workspace scope', async () => {
    const { app } = await harness();
    const owner = await register(app, 'a@shop.test', 'Shop A');
    const created = await request(app)
      .post('/shop/customers')
      .set(auth(owner.accessToken))
      .send({ fullName: 'Ama', tenantId: 'injected-tenant', workspaceId: 'injected-ws', id: 'injected-id' });
    expect(created.status).toBe(201);
    expect(created.body.customer.tenantId).toBe(owner.tenant.id);
    expect(created.body.customer.workspaceId).toBe(owner.workspace.id);
    expect(created.body.customer.id).not.toBe('injected-id');

    const order = await request(app)
      .post('/shop/orders')
      .set(auth(owner.accessToken))
      .send({ customerId: created.body.customer.id });
    expect(order.status).toBe(201);
    expect(order.body.order.tenantId).toBe(owner.tenant.id);
    expect(order.body.order.productionStages.length).toBe(9);

    const listed = await request(app).get('/shop/customers').set(auth(owner.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.customers).toHaveLength(1);
  });

  test('cross-tenant read and mutation are rejected; tenant spoofing is rejected', async () => {
    const { app } = await harness();
    const a = await register(app, 'a2@shop.test', 'A');
    const b = await register(app, 'b2@shop.test', 'B');
    const created = await request(app)
      .post('/shop/customers')
      .set(auth(a.accessToken))
      .send({ fullName: 'Secret' });
    const foreign = await request(app)
      .get(`/shop/customers/${created.body.customer.id}`)
      .set(auth(b.accessToken));
    expect(foreign.status).toBe(403);

    const spoof = await request(app)
      .get('/shop/customers')
      .set(auth(b.accessToken, { 'x-tenant-id': a.tenant.id }));
    expect(spoof.status).toBe(403);

    const ws = await request(app)
      .get('/shop/customers')
      .set(auth(b.accessToken, { 'x-workspace-id': a.workspace.id }));
    expect(ws.status).toBe(403);
  });

  test('production stage guards are enforced', async () => {
    const { app } = await harness();
    const owner = await register(app, 'stage@shop.test', 'Stage Shop');
    const customer = await request(app)
      .post('/shop/customers')
      .set(auth(owner.accessToken))
      .send({ fullName: 'Kofi' });
    const order = await request(app)
      .post('/shop/orders')
      .set(auth(owner.accessToken))
      .send({ customerId: customer.body.customer.id });

    const skipCutting = await request(app)
      .post(`/shop/orders/${order.body.order.id}/production-stages/cutting/transition`)
      .set(auth(owner.accessToken))
      .send({ action: 'skip' });
    expect(skipCutting.status).toBe(409);

    const complete = await request(app)
      .post(`/shop/orders/${order.body.order.id}/production-stages/measurement/transition`)
      .set(auth(owner.accessToken))
      .send({ action: 'complete' });
    expect(complete.status).toBe(200);
    expect(complete.body.order.productionStages[0].status).toBe('completed');
    expect(complete.body.order.productionStages[1].status).toBe('active');
  });

  test('trusted artifacts are append-only', async () => {
    const { app } = await harness();
    const owner = await register(app, 'art@shop.test', 'Art Shop');
    const created = await request(app)
      .post('/shop/trusted-artifacts')
      .set(auth(owner.accessToken))
      .send({ fingerprint: 'fnv-test', payload: { kind: 'TrustedTailoringArtifact' } });
    expect(created.status).toBe(201);
    expect(created.body.artifact.frozen).toBe(true);

    const mutate = await request(app)
      .put(`/shop/trusted-artifacts/${created.body.artifact.id}`)
      .set(auth(owner.accessToken))
      .send({ fingerprint: 'changed' });
    expect(mutate.status).toBe(405);

    const got = await request(app)
      .get(`/shop/trusted-artifacts/${created.body.artifact.id}`)
      .set(auth(owner.accessToken));
    expect(got.status).toBe(200);
    expect(got.body.artifact.fingerprint).toBe('fnv-test');
  });
});
