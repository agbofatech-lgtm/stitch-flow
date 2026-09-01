import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../../shared/persistence/memoryStore';
import { createRepositories } from '../../shared/persistence/repository';
import { migrateLocalSchema } from '../../shared/persistence/schema';
import { dualReadById, projectLegacyShopToT2 } from './legacyMirror';
import { SHOP_DATA_PRECEDENCE, SHOP_ENTITY_CLASSIFICATION } from './shopAuthority';
import { finalizeDesignForTrustedTailoring } from '../design/trustedFinalization';

const SAMPLE = {
  bust: 90,
  chest: 90,
  waist: 72,
  hip: 98,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  bustSpan: 11,
  armholeDepth: 22,
  sleeve: 24,
  thigh: 58,
  knee: 42,
  ankle: 28,
  trouserLength: 108,
  skirtLength: 75,
};

async function setup() {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  return { store, repositories: createRepositories(store) };
}

test('SAC-2 does not claim T2 as UI source of truth', () => {
  assert.equal(SHOP_DATA_PRECEDENCE.uiSourceOfTruth, 'appcontext-localstorage');
  assert.equal(SHOP_DATA_PRECEDENCE.t2Role, 'additive-local-mirror');
  assert.equal(SHOP_DATA_PRECEDENCE.remoteSync, 'blocked');
  assert.equal(SHOP_ENTITY_CLASSIFICATION.customersHttp.mirrored, false);
  assert.equal(SHOP_ENTITY_CLASSIFICATION.invoices.mirrored, false);
  assert.equal(SHOP_ENTITY_CLASSIFICATION.trustedArtifacts.class, 'D');
});

test('SAC-2 legacy slice is preserved after projection', async () => {
  const { repositories } = await setup();
  const fabrics = [{ id: 'fab-1', name: 'Wax' }];
  const before = JSON.stringify(fabrics);
  await projectLegacyShopToT2({ fabricRecords: fabrics }, repositories);
  assert.equal(JSON.stringify(fabrics), before);
  const row = await repositories.material.get('fab-1');
  assert.equal((row?.payload as { kind: string }).kind, 'FabricRecord');
});

test('SAC-2 projection is idempotent', async () => {
  const { repositories } = await setup();
  const orders = [{ id: 'ord-1', orderNumber: 'SF-1' }];
  await projectLegacyShopToT2({ orders }, repositories);
  await projectLegacyShopToT2({ orders }, repositories);
  await projectLegacyShopToT2({ orders }, repositories);
  assert.equal((await repositories.order.listActive()).length, 1);
});

test('SAC-2 partial migration leaves unprojected entities absent in T2', async () => {
  const { repositories } = await setup();
  await projectLegacyShopToT2({ fabricRecords: [{ id: 'fab-2' }] }, repositories);
  assert.equal((await repositories.material.listActive()).length, 1);
  assert.equal((await repositories.order.listActive()).length, 0);
});

test('SAC-2 skips corrupt records without failing', async () => {
  const { repositories } = await setup();
  const report = await projectLegacyShopToT2(
    { fabricRecords: [{ name: 'no-id' }, { id: 'fab-3', name: 'Ok' }, null] },
    repositories
  );
  assert.equal(report.skippedCorrupt >= 1, true);
  assert.equal((await repositories.material.listActive()).length, 1);
});

test('SAC-2 restart dump/restore recovers mirrored record', async () => {
  const { store, repositories } = await setup();
  await projectLegacyShopToT2(
    { measurementProfiles: [{ id: 'prof-1', label: 'Default' }] },
    repositories
  );
  const snapshot = await store.dump();
  const restarted = new MemoryStore();
  await restarted.restore(snapshot);
  const row = await restarted.getRecord('measurement', 'prof-1');
  assert.equal((row?.payload as { kind: string }).kind, 'LiveMeasurementProfile');
});

test('SAC-2 frozen trusted payload is not overwritten', async () => {
  const { repositories } = await setup();
  await repositories.production.putLocalCanonical(
    { kind: 'TrustedTailoringExecution', frozen: true, id: 'tte-1', fingerprint: { value: 'abc' } },
    'tte-1'
  );
  await repositories.production.putLocalCanonical(
    { kind: 'TrustedTailoringExecution', frozen: true, id: 'tte-1', fingerprint: { value: 'CHANGED' } },
    'tte-1'
  );
  const row = await repositories.production.get('tte-1');
  assert.equal((row?.payload as { fingerprint: { value: string } }).fingerprint.value, 'abc');
});

test('SAC-2 SAC-1 artifact fingerprint survives T2 dump/restore', async () => {
  const { store, repositories } = await setup();
  const result = await finalizeDesignForTrustedTailoring({
    measurements: { ...SAMPLE },
    garmentType: 'bodice',
    persist: false,
    capturedAt: '2026-09-01T00:00:00.000Z',
    executionId: 'tte-sac2',
  });
  assert.equal(result.status, 'EXECUTED');
  const execution = result.artifact!.execution;
  await repositories.production.putLocalCanonical(
    execution as unknown as Record<string, unknown>,
    execution.id
  );
  const snapshot = await store.dump();
  const restarted = new MemoryStore();
  await restarted.restore(snapshot);
  const row = await restarted.getRecord('production', 'tte-sac2');
  const payload = row?.payload as { result: { fingerprint: { value: string } } };
  assert.equal(payload.result.fingerprint.value, result.artifact!.result.fingerprint.value);
});

test('SAC-2 no runtime does not throw and does not claim projection', async () => {
  const report = await projectLegacyShopToT2({ orders: [{ id: 'x' }] });
  assert.equal(report.skippedNoRuntime, true);
  assert.equal(report.projected, 0);
});

test('SAC-2 dual-read falls back to legacy when T2 runtime is absent', async () => {
  const result = await dualReadById('order', 'ord-legacy', [{ id: 'ord-legacy', orderNumber: 'L1' }]);
  assert.equal(result.source, 'legacy');
  assert.equal((result.payload as { orderNumber: string }).orderNumber, 'L1');
});
