import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { createShopService } from '../src/shop/service';
import { createPostgresShopRepository } from '../src/shop/postgresRepository';
import { applyShopMigrations, defaultMigrationsDir } from '../src/shop/migrate';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';

const PG_URL =
  process.env.SHOP_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5434/stitchflow';

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
  return res.body as { accessToken: string; tenant: { id: string }; workspace: { id: string } };
}

describe('SAC-5 shop sync', () => {
  test('idempotent push, conflict, isolation, pull cursor, and artifact immutability (memory)', async () => {
    const runtime = createPlatformRuntime(createPlatformStore());
    const shop = createShopService();
    const app = await createApp({ platform: runtime, shop });
    const owner = await register(app, `sac5-${Date.now()}@shop.test`, 'SAC5');
    const token = owner.accessToken;
    const customerId = '11111111-1111-4111-8111-111111111111';
    const opCreate = '22222222-2222-4222-8222-222222222222';

    const first = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: opCreate,
        entityType: 'customer',
        entityId: customerId,
        operationType: 'create',
        payload: { fullName: 'Ama', tenantId: 'inject', workspaceId: 'inject' },
      });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('acknowledged');
    expect(first.body.entityId).toBe(customerId);
    expect(first.body.result.customer.tenantId).toBe(owner.tenant.id);

    const retry = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: opCreate,
        entityType: 'customer',
        entityId: customerId,
        operationType: 'create',
        payload: { fullName: 'Different' },
      });
    expect(retry.status).toBe(200);
    expect(retry.body.entityId).toBe(customerId);
    expect(retry.body.result.customer.fullName).toBe('Ama');

    const listed = await request(app).get('/shop/customers').set(auth(token));
    expect(listed.body.customers).toHaveLength(1);

    const conflict = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: '33333333-3333-4333-8333-333333333333',
        entityType: 'customer',
        entityId: customerId,
        operationType: 'update',
        expectedVersion: 99,
        payload: { fullName: 'No' },
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toBe('CONFLICT');

    const other = await register(app, `sac5b-${Date.now()}@shop.test`, 'Other');
    const leak = await request(app)
      .post('/shop/sync/operations')
      .set(auth(other.accessToken))
      .send({
        operationId: '44444444-4444-4444-8444-444444444444',
        entityType: 'customer',
        entityId: customerId,
        operationType: 'update',
        expectedVersion: 1,
        payload: { fullName: 'Hijack' },
      });
    expect(leak.status).toBe(403);

    const spoof = await request(app)
      .get('/shop/sync/changes')
      .set(auth(other.accessToken, { 'x-tenant-id': owner.tenant.id }));
    expect(spoof.status).toBe(403);

    const unauth = await request(app).post('/shop/sync/operations').send({ operationId: opCreate });
    expect(unauth.status).toBe(401);

    const pull = await request(app).get('/shop/sync/changes?cursor=0').set(auth(token));
    expect(pull.status).toBe(200);
    expect(pull.body.changes.length).toBeGreaterThan(0);
    expect(pull.body.changes.every((row: { tenantId: string }) => row.tenantId === owner.tenant.id)).toBe(true);

    const artOp = '55555555-5555-4555-8555-555555555555';
    const artId = '66666666-6666-4666-8666-666666666666';
    const artifact = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: artOp,
        entityType: 'trusted_artifact',
        entityId: artId,
        operationType: 'create',
        payload: { fingerprint: 'fp-1', payload: { kind: 'TrustedTailoringArtifact' } },
      });
    expect(artifact.status).toBe(200);
    const artRetry = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: artOp,
        entityType: 'trusted_artifact',
        entityId: artId,
        operationType: 'create',
        payload: { fingerprint: 'fp-changed' },
      });
    expect(artRetry.body.result.artifact.fingerprint).toBe('fp-1');

    const mutate = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: '77777777-7777-4777-8777-777777777777',
        entityType: 'trusted_artifact',
        entityId: artId,
        operationType: 'update',
        payload: { fingerprint: 'nope' },
      });
    expect(mutate.status).toBe(405);

    const orderId = '88888888-8888-4888-8888-888888888888';
    const order = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: '99999999-9999-4999-8999-999999999999',
        entityType: 'order',
        entityId: orderId,
        operationType: 'create',
        payload: { customerId },
      });
    expect(order.status).toBe(200);

    const skip = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        entityType: 'production_transition',
        entityId: orderId,
        operationType: 'transition',
        expectedVersion: 1,
        payload: { stageCode: 'cutting', action: 'skip' },
      });
    expect(skip.status).toBe(409);

    const snap = await request(app)
      .post('/shop/sync/operations')
      .set(auth(token))
      .send({
        operationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        entityType: 'measurement_snapshot',
        entityId: orderId,
        operationType: 'snapshot',
        expectedVersion: 1,
        payload: { snapshot: { chest: 102 } },
      });
    expect(snap.status).toBe(200);
    expect(snap.body.result.order.measurementSnapshot).toEqual({ chest: 102 });
  });

  test('postgres ledger survives retry and rejects cross-tenant pull', async () => {
    const pool = new Pool({ connectionString: PG_URL });
    try {
      await pool.query('select 1');
      await applyShopMigrations(pool, defaultMigrationsDir());
    } catch (err) {
      await pool.end().catch(() => undefined);
      throw err;
    }
    const runtime = createPlatformRuntime(createPlatformStore());
    const shop = createShopService(createPostgresShopRepository(pool));
    const app = await createApp({ platform: runtime, shop });
    const owner = await register(app, `sac5pg-${Date.now()}@shop.test`, 'SAC5PG');
    const customerId = crypto.randomUUID();
    const operationId = crypto.randomUUID();
    const body = {
      operationId,
      entityType: 'customer',
      entityId: customerId,
      operationType: 'create',
      payload: { fullName: 'Kofi' },
    };
    const first = await request(app).post('/shop/sync/operations').set(auth(owner.accessToken)).send(body);
    expect(first.status).toBe(200);
    const second = await request(app).post('/shop/sync/operations').set(auth(owner.accessToken)).send(body);
    expect(second.status).toBe(200);
    expect(second.body.entityId).toBe(customerId);
    const other = await register(app, `sac5pgb-${Date.now()}@shop.test`, 'OtherPG');
    const pull = await request(app)
      .get('/shop/sync/changes?cursor=0')
      .set(auth(other.accessToken));
    expect(pull.status).toBe(200);
    expect(pull.body.changes.some((row: { entityId: string }) => row.entityId === customerId)).toBe(false);
    await pool.end().catch(() => undefined);
  });
});
