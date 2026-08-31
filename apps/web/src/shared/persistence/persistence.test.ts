import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from './memoryStore';
import { EntityRepository } from './repository';
import { ConnectivityMonitor } from './connectivity';
import { SyncEngine, RemoteAuthorizationBlockedError } from './syncEngine';
import { compareVersions } from './conflict';
import { migrateLocalSchema, SCHEMA_MIGRATIONS } from './schema';
import { T2_SCHEMA_VERSION } from './types';
import type { SyncOperation } from './types';

let store: MemoryStore;
let measurement: EntityRepository;
let connectivity: ConnectivityMonitor;

beforeEach(async () => {
  store = new MemoryStore();
  await migrateLocalSchema(store);
  measurement = new EntityRepository(store, 'measurement');
  connectivity = new ConnectivityMonitor(async () => true);
});

test('schema version is 1', async () => {
  assert.equal(await store.getSchemaVersion(), T2_SCHEMA_VERSION);
  assert.equal(SCHEMA_MIGRATIONS[0].version, 1);
});

test('create/read/update/list/tombstone delete', async () => {
  const created = await measurement.create({ bust: 92 });
  assert.ok(created);
  const loaded = await measurement.get(created!.metadata.localId);
  assert.equal((loaded?.payload as { bust: number }).bust, 92);

  await measurement.update(created!.metadata.localId, { bust: 94 });
  const updated = await measurement.get(created!.metadata.localId);
  assert.equal((updated?.payload as { bust: number }).bust, 94);
  assert.equal(updated?.metadata.version, 2);
  assert.equal(updated?.metadata.syncStatus, 'pending');

  const listed = await measurement.listActive();
  assert.equal(listed.length, 1);

  await measurement.remove(created!.metadata.localId);
  const tomb = await measurement.get(created!.metadata.localId);
  assert.equal(tomb?.metadata.tombstone, true);
  assert.equal((await measurement.listActive()).length, 0);
});

test('offline create stays pending and survives restart dump/restore', async () => {
  connectivity.setState('offline');
  const created = await measurement.create({ waist: 70 });
  const ops = await store.listOperations();
  assert.equal(ops[0]?.status, 'pending');

  const snapshot = await store.dump();
  const restarted = new MemoryStore();
  await restarted.restore(snapshot);
  const again = await restarted.getRecord('measurement', created!.metadata.localId);
  assert.equal((again?.payload as { waist: number }).waist, 70);
  assert.equal((await restarted.listOperations())[0]?.status, 'pending');
});

test('duplicate operationId does not create a second record', async () => {
  const opId = 'op-dup-1';
  const first = await measurement.create({ hip: 100 }, opId);
  const second = await measurement.create({ hip: 101 }, opId);
  assert.equal(first?.metadata.localId, second?.metadata.localId);
  assert.equal((await measurement.listActive()).length, 1);
});

test('sync to blocked T1 API leaves queue failed, not acked, not duplicated', async () => {
  await measurement.create({ neck: 36 });
  const engine = new SyncEngine(store, connectivity);
  await engine.processQueue();
  const ops = await store.listOperations();
  assert.equal(ops.length, 1);
  assert.equal(ops[0].status, 'failed');
  assert.match(ops[0].lastError || '', /CRUD is not mounted/);
  await engine.processQueue();
  assert.equal((await store.listOperations()).length, 1);
});

test('conflict is detected and not silently overwritten', async () => {
  const check = compareVersions(3, 5);
  assert.equal(check.result, 'conflict');

  const created = await measurement.create({ shoulder: 12 });
  const engine = new SyncEngine(store, connectivity, {
    async push() {
      return { remoteVersion: 99 };
    },
  });
  await engine.processQueue();
  const record = await measurement.get(created!.metadata.localId);
  assert.equal(record?.metadata.syncStatus, 'conflict');
  const op = (await store.listOperations())[0];
  assert.equal(op.status, 'conflict');
});

test('ack transport marks synced', async () => {
  const created = await measurement.create({ backLength: 40 });
  const engine = new SyncEngine(store, connectivity, {
    async push() {
      return { remoteId: 'remote-1', remoteVersion: 1 };
    },
  });
  await engine.processQueue();
  const record = await measurement.get(created!.metadata.localId);
  assert.equal(record?.metadata.syncStatus, 'synced');
  assert.equal(record?.metadata.remoteId, 'remote-1');
});

test('connectivity distinguishes probe failure from browser offline', async () => {
  const failed = new ConnectivityMonitor(async () => {
    throw new Error('unreachable');
  });
  assert.equal(await failed.refresh(), 'failed');

  const degraded = new ConnectivityMonitor(async () => false);
  assert.equal(await degraded.refresh(), 'degraded');
});

test('RemoteAuthorizationBlockedError name is stable', () => {
  const err = new RemoteAuthorizationBlockedError('blocked');
  assert.equal(err.name, 'RemoteAuthorizationBlockedError');
});

test('retry of the same SyncOperation object does not insert extra operations', async () => {
  const op: SyncOperation = {
    operationId: 'stable-1',
    entity: 'order',
    entityLocalId: 'x',
    operationType: 'create',
    payload: { n: 1 },
    expectedVersion: 1,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    status: 'pending',
  };
  await store.putOperation(op);
  await store.putOperation({ ...op, attemptCount: 1, status: 'failed' });
  assert.equal((await store.listOperations()).length, 1);
});
