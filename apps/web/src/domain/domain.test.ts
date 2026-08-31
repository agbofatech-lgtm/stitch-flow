import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateStylePattern } from '../modules/services/patternEngine';
import { generateProductionPlan } from '../modules/services/productionAssistant';
import {
  BODY_MEASUREMENT_FIELDS,
  GARMENT_MEASUREMENT_FIELDS,
  classifyMeasurementField,
} from './measurement/fields';
import { separateLegacyMeasurementBlob } from './measurement/separate';
import { requestPattern, mapGarmentTypeToPatternKind } from './pattern/gateway';
import { requestProductionPlan } from './production/gateway';
import {
  mergeMeasurementPayloads,
  mergeOrderPayloads,
  mergeProductionPayloads,
} from './conflict/merge';
import { DomainUnassignableError, requireOwner } from './ownership';
import { MemoryStore } from '../shared/persistence/memoryStore';
import { EntityRepository } from '../shared/persistence/repository';
import { migrateLocalSchema } from '../shared/persistence/schema';
import { persistSeparatedMeasurements } from './persistence/measurementStore';
import { SyncEngine } from '../shared/persistence/syncEngine';
import { ConnectivityMonitor } from '../shared/persistence/connectivity';
import { ENTITY_CONFLICT_POLICY } from '../shared/persistence/conflict';

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

function stripGeneratedAt(plan: { generatedAt?: unknown }) {
  const { generatedAt: _generatedAt, ...rest } = plan;
  return rest;
}

test('body and garment field sets are disjoint', () => {
  const overlap = BODY_MEASUREMENT_FIELDS.filter((field) =>
    (GARMENT_MEASUREMENT_FIELDS as readonly string[]).includes(field)
  );
  assert.deepEqual(overlap, []);
  assert.equal(classifyMeasurementField('bust'), 'body');
  assert.equal(classifyMeasurementField('trouserLength'), 'garment');
  assert.equal(classifyMeasurementField('notes'), 'garment');
});

test('legacy blob separates body vs garment vs pattern projection', () => {
  const separated = separateLegacyMeasurementBlob(
    { bust: 92, chest: 92, trouserLength: 110, notes: 'ease at seat' },
    'trouser'
  );
  assert.equal(separated.body.class, 'body');
  assert.equal(separated.garment.class, 'garment');
  assert.equal(separated.body.fields.bust, 92);
  assert.equal(separated.garment.fields.trouserLength, 110);
  assert.equal(separated.body.fields.trouserLength, undefined);
  assert.equal(separated.garment.fields.bust, undefined);
  assert.equal(separated.pattern?.class, 'pattern');
  assert.equal(separated.pattern?.derivedFrom, 'body+garment');
  assert.equal(separated.pattern?.fields.trouserLength, 110);
});

test('unassignable measurement field stops rather than guessing', () => {
  assert.throws(
    () => separateLegacyMeasurementBlob({ mysterySpan: 12 }),
    /unassignable/
  );
});

test('alias chest maps to body bust without creating a parallel system', () => {
  const separated = separateLegacyMeasurementBlob({ chest: 96 }, 'bodice');
  assert.equal(separated.body.fields.bust, 96);
  assert.equal(separated.body.fields.chest, 96);
});

test('pattern gateway output matches protected engine (no drift)', () => {
  for (const kind of ['bodice', 'shirt', 'trouser', 'skirt', 'kaftan'] as const) {
    const direct = generateStylePattern(kind, SAMPLE);
    const wrapped = requestPattern({ kind, measurements: SAMPLE }).result;
    assert.deepEqual(wrapped, direct, kind);
  }
});

test('garment-type mapping is the documented Design Studio FACT', () => {
  assert.equal(mapGarmentTypeToPatternKind('dress'), 'bodice');
  assert.equal(mapGarmentTypeToPatternKind('senator'), 'shirt');
  assert.equal(mapGarmentTypeToPatternKind('agbada'), 'kaftan');
});

test('production gateway output matches protected assistant except generatedAt', () => {
  const input = { garmentType: 'shirt' as const, measurements: SAMPLE };
  const direct = generateProductionPlan(input);
  const wrapped = requestProductionPlan(input);
  assert.deepEqual(stripGeneratedAt(wrapped), stripGeneratedAt(direct));
});

test('measurement merge fills missing fields and conflicts on disagreement', () => {
  const merged = mergeMeasurementPayloads({ bust: 90, waist: 70 }, { hip: 100, waist: 70 });
  assert.equal(merged.status, 'merged');
  assert.equal(merged.value.bust, 90);
  assert.equal(merged.value.hip, 100);

  const conflicted = mergeMeasurementPayloads({ bust: 90 }, { bust: 100 });
  assert.equal(conflicted.status, 'conflict');
  assert.equal(conflicted.conflicts[0].path, 'body.bust');
  assert.equal(conflicted.value.bust, 90);
});

test('order merge advances linear status and refuses money overwrite', () => {
  const advanced = mergeOrderPayloads(
    { id: 'o1', customerId: 'c1', orderNumber: 'SF-1', status: 'draft', totalAmount: 200 },
    { id: 'o1', customerId: 'c1', orderNumber: 'SF-1', status: 'in_progress', totalAmount: 200 }
  );
  assert.equal(advanced.status, 'merged');
  assert.equal(advanced.value.status, 'in_progress');

  const money = mergeOrderPayloads(
    { id: 'o1', totalAmount: 200 },
    { id: 'o1', totalAmount: 250 }
  );
  assert.equal(money.status, 'conflict');
  assert.ok(money.conflicts.some((item) => item.path === 'totalAmount'));
  assert.equal(money.value.totalAmount, 200);
});

test('production merge advances completed stages and conflicts skip vs complete', () => {
  const advanced = mergeProductionPayloads(
    {
      stages: [
        { code: 'measurement', status: 'completed' },
        { code: 'cutting', status: 'pending' },
      ],
    },
    {
      stages: [
        { code: 'measurement', status: 'completed' },
        { code: 'cutting', status: 'completed' },
      ],
    }
  );
  assert.equal(advanced.status, 'merged');
  const cutting = (advanced.value.stages as Array<{ code: string; status: string }>).find(
    (s) => s.code === 'cutting'
  );
  assert.equal(cutting?.status, 'completed');

  const skipped = mergeProductionPayloads(
    { stages: [{ code: 'embroidery', status: 'skipped' }] },
    { stages: [{ code: 'embroidery', status: 'completed' }] }
  );
  assert.equal(skipped.status, 'conflict');
});

test('locked capabilities are unassignable', () => {
  assert.throws(() => requireOwner('3d-fitting'), DomainUnassignableError);
  assert.throws(() => requireOwner('saas-billing'), DomainUnassignableError);
  assert.equal(requireOwner('pattern-draft-generation').owner, 'pattern-engine');
  assert.equal(requireOwner('ai-advisory').owner, 'intelligence-application');
  assert.equal(requireOwner('ai-advisory').layer, 'APPLICATION');
});

test('T3 measurement persist uses T2 repository, not localStorage', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repo = new EntityRepository(store, 'measurement');
  const created = await persistSeparatedMeasurements(repo, {
    blob: { bust: 88, skirtLength: 80 },
    patternKind: 'skirt',
  });
  assert.ok(created);
  const loaded = await repo.get(created!.metadata.localId);
  const payload = loaded?.payload as {
    kind: string;
    body: { fields: Record<string, number> };
    garment: { fields: Record<string, number> };
  };
  assert.equal(payload.kind, 'MeasurementSet');
  assert.equal(payload.body.fields.bust, 88);
  assert.equal(payload.garment.fields.skirtLength, 80);
  assert.equal(typeof localStorage, 'undefined');
});

test('T3 domain-merge policy is live for measurement/order/production', () => {
  assert.equal(ENTITY_CONFLICT_POLICY.measurement, 'domain-merge');
  assert.equal(ENTITY_CONFLICT_POLICY.order, 'domain-merge');
  assert.equal(ENTITY_CONFLICT_POLICY.production, 'domain-merge');
});

test('sync engine applies domain merge when remote payload is complementary', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repo = new EntityRepository(store, 'measurement');
  const created = await repo.create({ bust: 90 });
  const connectivity = new ConnectivityMonitor(async () => true);
  const engine = new SyncEngine(store, connectivity, {
    async push() {
      return { remoteVersion: 99, remotePayload: { hip: 100, bust: 90 } };
    },
  });
  await engine.processQueue();
  const record = await repo.get(created!.metadata.localId);
  assert.equal(record?.metadata.syncStatus, 'synced');
  assert.equal((record?.payload as { hip: number }).hip, 100);
});

test('sync engine still refuses silent overwrite on measurement disagreement', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repo = new EntityRepository(store, 'measurement');
  const created = await repo.create({ bust: 90 });
  const connectivity = new ConnectivityMonitor(async () => true);
  const engine = new SyncEngine(store, connectivity, {
    async push() {
      return { remoteVersion: 99, remotePayload: { bust: 120 } };
    },
  });
  await engine.processQueue();
  const record = await repo.get(created!.metadata.localId);
  assert.equal(record?.metadata.syncStatus, 'conflict');
  assert.equal((record?.payload as { bust: number }).bust, 90);
});
