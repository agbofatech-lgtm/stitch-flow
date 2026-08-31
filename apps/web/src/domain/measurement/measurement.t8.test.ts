import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateStylePattern } from '../../modules/services/patternEngine';
import { requestPattern } from '../pattern/gateway';
import { MemoryStore } from '../../shared/persistence/memoryStore';
import { EntityRepository } from '../../shared/persistence/repository';
import { migrateLocalSchema } from '../../shared/persistence/schema';
import { CM_PER_INCH, convertLength, toCentimetres, fromCentimetres } from './units';
import { createProvenance, isDerivedSource } from './provenance';
import {
  freezeMeasurementVersion,
  historicalVersionIntact,
  refuseFrozenMutation,
} from './version';
import { engineInputFromVersion, validateMeasurementValue } from './contract';
import {
  persistMeasurementVersion,
  rejectFrozenVersionUpdate,
} from '../persistence/measurementVersionStore';

const SAMPLE_CM = {
  bust: 90,
  waist: 72,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  bustSpan: 11,
  armholeDepth: 22,
  skirtLength: 75,
};

test('unit conversion uses named inch constant and round-trips', () => {
  assert.equal(CM_PER_INCH, 2.54);
  assert.equal(toCentimetres(10, 'in'), 25.4);
  assert.equal(fromCentimetres(25.4, 'in'), 10);
  assert.equal(convertLength(90, 'cm', 'cm'), 90);
  assert.throws(() => toCentimetres(10, 'mm' as 'cm'), /unknown length unit/);
  assert.throws(() => toCentimetres(Number.NaN, 'cm'), /not finite/);
});

test('provenance requires source, capturedAt, version, verification', () => {
  const p = createProvenance({ source: 'body-capture', capturedBy: 'member-1', version: 2 });
  assert.equal(p.source, 'body-capture');
  assert.equal(p.capturedBy, 'member-1');
  assert.equal(p.version, 2);
  assert.equal(p.verification, 'unverified');
  assert.ok(p.capturedAt);
  assert.equal(isDerivedSource('derived-formula'), true);
  assert.equal(isDerivedSource('body-capture'), false);
});

test('body/garment/pattern stay separated on freeze; pattern is derived', () => {
  const version = freezeMeasurementVersion({
    blob: SAMPLE_CM,
    patternKind: 'bodice',
    source: 'body-capture',
    customerId: 'c1',
    orderId: 'o1',
  });
  assert.equal(version.kind, 'MeasurementVersion');
  assert.equal(version.frozen, true);
  assert.equal(version.body.class, 'body');
  assert.equal(version.garment.class, 'garment');
  assert.equal(version.body.fields.bust, 90);
  assert.equal(version.garment.fields.skirtLength, 75);
  assert.equal(version.body.fields.skirtLength, undefined);
  assert.equal(version.pattern?.derivedFrom, 'body+garment');
  assert.equal(version.canonicalUnit, 'cm');
});

test('imperial capture converts to centimetres before engine input', () => {
  const version = freezeMeasurementVersion({
    blob: { bust: 35.43307086614173, waist: 28.346456692913385, neck: 14.173228346456693, shoulder: 4.724409448818897, backLength: 15.748031496062993 },
    declaredUnit: 'in',
    patternKind: 'bodice',
    source: 'body-capture',
  });
  const bustCm = version.body.fields.bust;
  assert.ok(Math.abs(bustCm - 90) < 0.001);
  const input = engineInputFromVersion(version);
  assert.ok(Math.abs(input.bust - 90) < 0.001);
});

test('validation rejects unknown fields and non-finite values', () => {
  assert.equal(validateMeasurementValue('bust', 90), 90);
  assert.throws(() => validateMeasurementValue('mysterySpan', 12), /unassignable/);
  assert.throws(() => validateMeasurementValue('bust', Number.NaN), /not a finite number/);
});

test('historical freeze survives a later live profile change', () => {
  const version = freezeMeasurementVersion({
    blob: SAMPLE_CM,
    patternKind: 'skirt',
    source: 'profile',
  });
  const expected = {
    body: { ...version.body.fields },
    garment: { ...version.garment.fields },
  };
  const liveNow = { bust: 100, waist: 80, skirtLength: 90 };
  assert.notEqual(liveNow.bust, version.body.fields.bust);
  assert.equal(historicalVersionIntact(version, expected), true);
  assert.throws(() => refuseFrozenMutation(version, liveNow), /cannot be patched/);
});

test('T8 version persist uses T2 repository, not localStorage', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repo = new EntityRepository(store, 'measurement');
  const created = await persistMeasurementVersion(repo, {
    blob: SAMPLE_CM,
    patternKind: 'skirt',
    customerId: 'c1',
    source: 'body-capture',
  });
  assert.ok(created);
  const loaded = await repo.get(created!.metadata.localId);
  const payload = loaded?.payload as { kind: string; frozen: boolean; body: { fields: { bust: number } } };
  assert.equal(payload.kind, 'MeasurementVersion');
  assert.equal(payload.frozen, true);
  assert.equal(payload.body.fields.bust, 90);
  assert.equal(typeof localStorage, 'undefined');
  await assert.rejects(
    () => rejectFrozenVersionUpdate(repo, created!.metadata.localId, { bust: 120 }),
    /cannot be patched/
  );
});

test('engine input from frozen version matches protected engine via T3 gateway', () => {
  const version = freezeMeasurementVersion({
    blob: SAMPLE_CM,
    patternKind: 'bodice',
    source: 'body-capture',
  });
  const input = engineInputFromVersion(version);
  const direct = generateStylePattern('bodice', input);
  const wrapped = requestPattern({ kind: 'bodice', measurements: input }).result;
  assert.deepEqual(wrapped, direct);
});
