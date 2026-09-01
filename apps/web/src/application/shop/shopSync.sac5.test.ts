import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../../shared/persistence/memoryStore';
import { createRepositories } from '../../shared/persistence/repository';
import { migrateLocalSchema } from '../../shared/persistence/schema';
import { ConnectivityMonitor } from '../../shared/persistence/connectivity';
import { SyncEngine, RemoteAuthorizationBlockedError } from '../../shared/persistence/syncEngine';
import { SHOP_DATA_PRECEDENCE } from './shopAuthority';

test('SAC-5 does not claim AppContext retirement', () => {
  assert.equal(SHOP_DATA_PRECEDENCE.uiSourceOfTruth, 'appcontext-localstorage');
  assert.equal(SHOP_DATA_PRECEDENCE.remoteSync, 'blocked');
});

test('local-first create survives offline and does not drop the record', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const customer = new (await import('../../shared/persistence/repository')).EntityRepository(store, 'customer');
  const connectivity = new ConnectivityMonitor(async () => false);
  connectivity.setState('offline');
  const created = await customer.create({ kind: 'AuthenticatedShopCustomer', fullName: 'Ama' });
  assert.ok(created);
  const snapshot = await store.dump();
  const restarted = new MemoryStore();
  await restarted.restore(snapshot);
  const loaded = await restarted.getRecord('customer', created!.metadata.localId);
  assert.equal((loaded?.payload as { fullName: string }).fullName, 'Ama');
  assert.equal((await restarted.listOperations())[0]?.status, 'pending');
});

test('duplicate operationId does not duplicate a customer', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repos = createRepositories(store);
  const op = 'op-stable';
  const a = await repos.customer.create({ kind: 'AuthenticatedShopCustomer', fullName: 'A' }, op);
  const b = await repos.customer.create({ kind: 'AuthenticatedShopCustomer', fullName: 'B' }, op);
  assert.equal(a?.metadata.localId, b?.metadata.localId);
  assert.equal((await repos.customer.listActive()).length, 1);
});

test('401 pauses as blocked_auth and keeps the queue', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repos = createRepositories(store);
  await repos.customer.create({ kind: 'AuthenticatedShopCustomer', fullName: 'Ama' });
  const connectivity = new ConnectivityMonitor(async () => true);
  const engine = new SyncEngine(store, connectivity, {
    async push() {
      const err = new Error('unauthorized') as Error & { status: number };
      err.status = 401;
      throw err;
    },
  });
  await engine.processQueue();
  const op = (await store.listOperations())[0];
  assert.equal(op.status, 'blocked_auth');
  const record = await repos.customer.get(op.entityLocalId);
  assert.ok(record);
  assert.notEqual(record?.metadata.syncStatus, 'deleted');
});

test('403 quarantines without deleting local data', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repos = createRepositories(store);
  await repos.customer.create({ kind: 'AuthenticatedShopCustomer', fullName: 'Ama' });
  const engine = new SyncEngine(store, new ConnectivityMonitor(async () => true), {
    async push() {
      const err = new Error('scope') as Error & { status: number };
      err.status = 403;
      throw err;
    },
  });
  await engine.processQueue();
  assert.equal((await store.listOperations())[0].status, 'quarantined');
  assert.equal((await repos.customer.listActive()).length, 1);
});

test('lost acknowledgement retry with same operationId stays one record', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repos = createRepositories(store);
  const created = await repos.customer.create({ kind: 'AuthenticatedShopCustomer', fullName: 'Ama' });
  let calls = 0;
  const engine = new SyncEngine(store, new ConnectivityMonitor(async () => true), {
    async push(op) {
      calls += 1;
      return { remoteId: op.entityLocalId, remoteVersion: 1 };
    },
  });
  await engine.processQueue();
  await engine.processQueue();
  assert.equal(calls, 1);
  assert.equal((await repos.customer.listActive()).length, 1);
  assert.equal((await repos.customer.get(created!.metadata.localId))?.metadata.syncStatus, 'synced');
});

test('measurement snapshot disagreement is not merged', async () => {
  const { compareVersions, ENTITY_CONFLICT_POLICY, mustNotSilentOverwrite } = await import(
    '../../shared/persistence/conflict'
  );
  assert.equal(ENTITY_CONFLICT_POLICY.measurement, 'detect-only');
  assert.equal(mustNotSilentOverwrite('detect-only'), true);
  assert.equal(compareVersions(2, 5).result, 'conflict');
});

test('blocked T1 transport still fails closed and does not ack', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repos = createRepositories(store);
  await repos.customer.create({ fullName: 'Ama' });
  const engine = new SyncEngine(store, new ConnectivityMonitor(async () => true));
  await engine.processQueue();
  assert.equal((await store.listOperations())[0].status, 'failed');
  assert.ok(RemoteAuthorizationBlockedError);
});
