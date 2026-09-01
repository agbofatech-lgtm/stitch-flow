import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app';
import { createPlatformStore } from '../src/platform/store';
import { createPlatformRuntime } from '../src/platform/runtime';
import { createShopService } from '../src/shop/service';
import { createPostgresShopRepository } from '../src/shop/postgresRepository';
import { applyShopMigrations, defaultMigrationsDir } from '../src/shop/migrate';
import { createConfiguredShopService } from '../src/shop/runtime';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'p19-test-jwt-secret';

const PG_URL =
  process.env.SHOP_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5434/stitchflow';

function auth(token: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

describe('SAC-4 shop PostgreSQL persistence', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: PG_URL });
    await pool.query('select 1');
    await applyShopMigrations(pool, defaultMigrationsDir());
  });

  afterAll(async () => {
    await pool.end().catch(() => undefined);
  });

  test('fresh migration is idempotent and ledger matches canonical files', async () => {
    const again = await applyShopMigrations(pool, defaultMigrationsDir());
    expect(again.applied).toEqual([
      '001_init_extensions.sql',
      '007_shop_authority.sql',
      '008_shop_sync.sql',
    ]);
    const tables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'shop_%' ORDER BY tablename`
    );
    expect(tables.rows.map((row) => row.tablename)).toEqual([
      'shop_change_log',
      'shop_customers',
      'shop_orders',
      'shop_sync_operations',
      'shop_trusted_artifacts',
    ]);
    const ledger = await pool.query(`SELECT id FROM schema_migrations ORDER BY id`);
    expect(ledger.rows.map((row) => row.id)).toEqual([
      '001_init_extensions.sql',
      '007_shop_authority.sql',
      '008_shop_sync.sql',
    ]);
  });

  test('postgres mode without a URL fails closed (no memory fallback)', async () => {
    const previousMode = process.env.SHOP_DATABASE_MODE;
    const previousUrl = process.env.SHOP_DATABASE_URL;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.SHOP_DATABASE_MODE = 'postgres';
    delete process.env.SHOP_DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(createConfiguredShopService()).rejects.toThrow(/SHOP_DATABASE_URL|DATABASE_URL/);
    } finally {
      if (previousMode === undefined) delete process.env.SHOP_DATABASE_MODE;
      else process.env.SHOP_DATABASE_MODE = previousMode;
      if (previousUrl === undefined) delete process.env.SHOP_DATABASE_URL;
      else process.env.SHOP_DATABASE_URL = previousUrl;
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  test('shop records, stages, snapshots, and artifacts survive a new pool', async () => {
    await applyShopMigrations(pool, defaultMigrationsDir());
    const runtime = createPlatformRuntime(createPlatformStore());
    const shop = createShopService(createPostgresShopRepository(pool));
    const app = await createApp({ platform: runtime, shop });
    const owner = await request(app).post('/auth/register').send({
      email: `sac4-${Date.now()}@shop.test`,
      password: 'password1',
      displayName: 'SAC4',
      tenantName: 'SAC4 Shop',
    });
    expect(owner.status).toBe(201);
    const token = owner.body.accessToken as string;

    const customer = await request(app)
      .post('/shop/customers')
      .set(auth(token))
      .send({ fullName: 'Persisted Ama', tenantId: 'inject', workspaceId: 'inject-ws', id: 'inject-id' });
    expect(customer.status).toBe(201);
    expect(customer.body.customer.tenantId).toBe(owner.body.tenant.id);
    expect(customer.body.customer.workspaceId).toBe(owner.body.workspace.id);
    expect(customer.body.customer.id).not.toBe('inject-id');

    const order = await request(app)
      .post('/shop/orders')
      .set(auth(token))
      .send({ customerId: customer.body.customer.id });
    expect(order.status).toBe(201);

    const skipCutting = await request(app)
      .post(`/shop/orders/${order.body.order.id}/production-stages/cutting/transition`)
      .set(auth(token))
      .send({ action: 'skip' });
    expect(skipCutting.status).toBe(409);

    const complete = await request(app)
      .post(`/shop/orders/${order.body.order.id}/production-stages/measurement/transition`)
      .set(auth(token))
      .send({ action: 'complete' });
    expect(complete.status).toBe(200);

    const snapshot = await request(app)
      .put(`/shop/orders/${order.body.order.id}/measurement-snapshot`)
      .set(auth(token))
      .send({ snapshot: { chest: 96, source: 'frozen-snapshot' } });
    expect(snapshot.status).toBe(200);

    const artifact = await request(app)
      .post('/shop/trusted-artifacts')
      .set(auth(token))
      .send({
        fingerprint: 'persist-fp',
        payload: { kind: 'TrustedTailoringArtifact', classification: 'frozen', provenance: 'sac-4' },
      });
    expect(artifact.status).toBe(201);
    expect(artifact.body.artifact.frozen).toBe(true);

    const other = await request(app).post('/auth/register').send({
      email: `sac4b-${Date.now()}@shop.test`,
      password: 'password1',
      displayName: 'Other',
      tenantName: 'Other Shop',
    });
    expect(other.status).toBe(201);

    const independentPool = new Pool({ connectionString: PG_URL });
    try {
      const restartedShop = createShopService(createPostgresShopRepository(independentPool));
      const app2 = await createApp({ platform: runtime, shop: restartedShop });

      const unauth = await request(app2).get('/shop/customers');
      expect(unauth.status).toBe(401);
      const bad = await request(app2).get('/shop/customers').set({ Authorization: 'Bearer not-a-jwt' });
      expect(bad.status).toBe(401);
      const legacy = await request(app2).get('/customers');
      expect(legacy.status).toBe(404);

      const loaded = await request(app2)
        .get(`/shop/customers/${customer.body.customer.id}`)
        .set(auth(token));
      expect(loaded.status).toBe(200);
      expect(loaded.body.customer.fullName).toBe('Persisted Ama');
      expect(loaded.body.customer.tenantId).toBe(owner.body.tenant.id);
      expect(loaded.body.customer.workspaceId).toBe(owner.body.workspace.id);

      const loadedOrder = await request(app2)
        .get(`/shop/orders/${order.body.order.id}`)
        .set(auth(token));
      expect(loadedOrder.status).toBe(200);
      expect(loadedOrder.body.order.productionStages[0].status).toBe('completed');
      expect(loadedOrder.body.order.productionStages[1].status).toBe('active');
      expect(loadedOrder.body.order.measurementSnapshot).toEqual({ chest: 96, source: 'frozen-snapshot' });

      const stillInvalid = await request(app2)
        .post(`/shop/orders/${order.body.order.id}/production-stages/sewing/transition`)
        .set(auth(token))
        .send({ action: 'skip' });
      expect(stillInvalid.status).toBe(409);

      const leak = await request(app2)
        .get(`/shop/customers/${customer.body.customer.id}`)
        .set(auth(other.body.accessToken));
      expect(leak.status).toBe(403);

      const leakMutate = await request(app2)
        .put(`/shop/orders/${order.body.order.id}/measurement-snapshot`)
        .set(auth(other.body.accessToken))
        .send({ snapshot: { chest: 1 } });
      expect(leakMutate.status).toBe(403);

      const spoof = await request(app2)
        .get('/shop/customers')
        .set(auth(other.body.accessToken, { 'x-tenant-id': owner.body.tenant.id }));
      expect(spoof.status).toBe(403);

      const ws = await request(app2)
        .get('/shop/customers')
        .set(auth(other.body.accessToken, { 'x-workspace-id': owner.body.workspace.id }));
      expect(ws.status).toBe(403);

      const loadedArtifact = await request(app2)
        .get(`/shop/trusted-artifacts/${artifact.body.artifact.id}`)
        .set(auth(token));
      expect(loadedArtifact.status).toBe(200);
      expect(loadedArtifact.body.artifact.fingerprint).toBe('persist-fp');
      expect(loadedArtifact.body.artifact.payload).toEqual({
        kind: 'TrustedTailoringArtifact',
        classification: 'frozen',
        provenance: 'sac-4',
      });

      const mutate = await request(app2)
        .put(`/shop/trusted-artifacts/${artifact.body.artifact.id}`)
        .set(auth(token))
        .send({ fingerprint: 'nope' });
      expect(mutate.status).toBe(405);

      const patch = await request(app2)
        .patch(`/shop/trusted-artifacts/${artifact.body.artifact.id}`)
        .set(auth(token))
        .send({ fingerprint: 'nope' });
      expect(patch.status).toBe(405);

      const del = await request(app2)
        .delete(`/shop/trusted-artifacts/${artifact.body.artifact.id}`)
        .set(auth(token));
      expect(del.status).toBe(405);

      const foreignArtifact = await request(app2)
        .get(`/shop/trusted-artifacts/${artifact.body.artifact.id}`)
        .set(auth(other.body.accessToken));
      expect(foreignArtifact.status).toBe(403);
    } finally {
      await independentPool.end().catch(() => undefined);
    }
  });

  test('/ready reports verified postgres after a configured boot', async () => {
    const previousMode = process.env.SHOP_DATABASE_MODE;
    const previousUrl = process.env.SHOP_DATABASE_URL;
    process.env.SHOP_DATABASE_MODE = 'postgres';
    process.env.SHOP_DATABASE_URL = PG_URL;
    try {
      const runtime = createPlatformRuntime(createPlatformStore());
      const app = await createApp({ platform: runtime });
      const ready = await request(app).get('/ready');
      expect(ready.status).toBe(200);
      expect(ready.body.database.mode).toBe('postgres');
      expect(ready.body.database.postgres).toBe('verified');
      expect(ready.body.database.migrations).toBe('verified');
      const health = await request(app).get('/health');
      expect(health.status).toBe(200);
    } finally {
      if (previousMode === undefined) delete process.env.SHOP_DATABASE_MODE;
      else process.env.SHOP_DATABASE_MODE = previousMode;
      if (previousUrl === undefined) delete process.env.SHOP_DATABASE_URL;
      else process.env.SHOP_DATABASE_URL = previousUrl;
    }
  });
});
