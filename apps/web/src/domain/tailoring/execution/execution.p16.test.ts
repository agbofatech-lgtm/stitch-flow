import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../../../shared/persistence/memoryStore';
import { EntityRepository } from '../../../shared/persistence/repository';
import { migrateLocalSchema } from '../../../shared/persistence/schema';
import { freezeMeasurementVersion } from '../../measurement/version';
import { freezeGarmentSpecification } from '../../garment/version';
import { freezeComposition } from '../../composition/version';
import { executeTrustedTailoring } from './execute';
import {
  freezeTrustedTailoringExecution,
  refuseFrozenExecutionMutation,
} from './version';
import { persistTrustedTailoringExecution } from '../../persistence/trustedTailoringExecutionStore';
import { freezeGovernedTrustedTailoring } from '../../../application/tailoring/trustedExecution';
import { executeDeterministicPattern } from '../deterministic/execute';
import { engineInputFromVersion } from '../../measurement/contract';
import { HIP_DEFAULT_CONFLICT } from '../deterministic/defaultsInventory';
import { hipConflictUnresolved } from '../deterministic/configuration';

const BODY = {
  bust: 90,
  waist: 72,
  hip: 98,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  chest: 90,
  sleeve: 24,
};

function chain(opts?: {
  garmentType?: string;
  measurementId?: string;
  specId?: string;
  blob?: Record<string, unknown>;
}) {
  const measurementVersion = freezeMeasurementVersion({
    blob: opts?.blob || BODY,
    declaredUnit: 'cm',
    patternKind: 'bodice',
    source: 'body-capture',
    id: opts?.measurementId || 'mv-p16-1',
    capturedAt: '2026-08-31T00:00:00.000Z',
  });
  const specificationVersion = freezeGarmentSpecification({
    intent: {
      garmentType: opts?.garmentType ?? 'dress',
      measurementVersionId: measurementVersion.id,
    },
    id: opts?.specId || 'gsv-p16-1',
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  const compositionVersion = freezeComposition({
    specificationVersion,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  return { measurementVersion, specificationVersion, compositionVersion };
}

test('hip conflict remains unresolved and is not applied by orchestration', () => {
  assert.equal(HIP_DEFAULT_CONFLICT.reconciled, false);
  assert.equal(hipConflictUnresolved(), true);
  const { measurementVersion, specificationVersion, compositionVersion } = chain({
    blob: { bust: 90, waist: 72, neck: 36, shoulder: 12, backLength: 40 },
    measurementId: 'mv-no-hip',
  });
  const result = executeTrustedTailoring({
    measurementVersion,
    specificationVersion,
    compositionVersion,
  });
  assert.equal(result.silentDefaulting, 'absent-at-orchestration');
  assert.equal(result.tailoringAccuracyCertification, 'NOT_CLAIMED');
  const withHip = chain({
    blob: { bust: 90, waist: 72, neck: 36, shoulder: 12, backLength: 40, hip: 102 },
    measurementId: 'mv-with-hip',
    specId: 'gsv-with-hip',
  });
  const filled = executeTrustedTailoring(withHip);
  assert.notEqual(result.identity.measurementFingerprint, filled.identity.measurementFingerprint);
});

test('dress execution uses observed bodice projection without claiming composition identity', () => {
  const versions = chain({ garmentType: 'dress' });
  const result = executeTrustedTailoring(versions);
  assert.equal(result.status, 'executed');
  assert.equal(result.pattern.classification, 'OBSERVED_ENGINE_OUTPUT');
  assert.equal(result.pattern.patternKind, 'bodice');
  assert.equal(result.identity.patternProjectionNotIdentity, true);
  assert.equal(result.identity.garmentType, 'dress');
  assert.equal(result.production.classification, 'HEURISTIC_OUTPUT');
  assert.equal(result.pattern.skipped, undefined);
});

test('unknown ceremonial garment does not execute bodice fallback', () => {
  const versions = chain({
    garmentType: 'asymmetric layered ceremonial garment',
    specId: 'gsv-unknown',
  });
  const result = executeTrustedTailoring(versions);
  assert.equal(result.status, 'unknown');
  assert.equal(result.pattern.skipped, true);
  assert.equal(result.production.skipped, true);
  assert.equal(result.pattern.classification, 'UNKNOWN');
  assert.equal(result.production.classification, 'UNKNOWN');
  assert.equal(result.identity.garmentType, null);
  assert.notEqual(result.identity.patternProjectionKind, 'bodice');
});

test('twenty trusted executions yield one fingerprint', () => {
  const versions = chain({ garmentType: 'shirt', specId: 'gsv-repeat', measurementId: 'mv-repeat' });
  const fingerprints = new Set<string>();
  const first = executeTrustedTailoring(versions);
  for (let i = 0; i < 20; i += 1) {
    const next = executeTrustedTailoring(versions);
    fingerprints.add(next.fingerprint.value);
    assert.deepEqual(next.identity, first.identity);
    assert.equal(next.pattern.fingerprint.value, first.pattern.fingerprint.value);
    assert.equal(next.production.fingerprint.value, first.production.fingerprint.value);
  }
  assert.equal(fingerprints.size, 1);
  assert.equal(first.fingerprint.algorithm, 'fnv1a-64');
  assert.equal(first.fingerprint.cryptographic, false);
});

test('live customer mutation does not change frozen-authority execution', () => {
  const live = { ...BODY };
  const versions = chain({ blob: live, measurementId: 'mv-live', specId: 'gsv-live' });
  const first = executeTrustedTailoring(versions);
  live.bust = 120;
  live.hip = 140;
  const second = executeTrustedTailoring(versions);
  assert.equal(second.fingerprint.value, first.fingerprint.value);
  assert.deepEqual(second.identity, first.identity);
});

test('distinct measurement versions produce distinct executions', () => {
  const a = chain({ measurementId: 'mv-a', specId: 'gsv-a', blob: { ...BODY, bust: 90 } });
  const b = chain({ measurementId: 'mv-b', specId: 'gsv-b', blob: { ...BODY, bust: 110 } });
  const execA = executeTrustedTailoring(a);
  const execB = executeTrustedTailoring(b);
  assert.notEqual(execA.fingerprint.value, execB.fingerprint.value);
  assert.notEqual(execA.identity.measurementFingerprint, execB.identity.measurementFingerprint);
});

test('createdAt is excluded from execution identity', () => {
  const versions = chain({ garmentType: 'skirt', specId: 'gsv-skirt' });
  const first = freezeTrustedTailoringExecution({ ...versions, createdAt: '2026-01-01T00:00:00.000Z' });
  const second = freezeTrustedTailoringExecution({ ...versions, createdAt: '2026-08-31T00:00:00.000Z' });
  assert.equal(first.result.fingerprint.value, second.result.fingerprint.value);
  assert.notEqual(first.createdAt, second.createdAt);
  assert.equal(JSON.stringify(first.result.identity).includes('2026-01-01'), false);
});

test('frozen execution refuses mutation', () => {
  const versions = chain({ garmentType: 'trouser', specId: 'gsv-tr' });
  const frozen = freezeTrustedTailoringExecution(versions);
  assert.equal(frozen.kind, 'TrustedTailoringExecution');
  assert.throws(() => refuseFrozenExecutionMutation(frozen, { status: 'unknown' }), /cannot be patched/);
});

test('unfrozen measurement is refused', () => {
  const versions = chain();
  const live = { ...versions.measurementVersion, frozen: false as const };
  assert.throws(
    () =>
      executeTrustedTailoring({
        ...versions,
        measurementVersion: live as never,
      }),
    /not frozen/
  );
});

test('composition must reference the provided specification version', () => {
  const a = chain({ specId: 'gsv-one' });
  const b = chain({ specId: 'gsv-two', measurementId: 'mv-two' });
  assert.throws(
    () =>
      executeTrustedTailoring({
        measurementVersion: a.measurementVersion,
        specificationVersion: a.specificationVersion,
        compositionVersion: b.compositionVersion,
      }),
    /does not reference/
  );
});

test('pattern output matches T10 governed execution for same projection', () => {
  const versions = chain({ garmentType: 'bodice', specId: 'gsv-bodice' });
  const trusted = executeTrustedTailoring(versions);
  const t10 = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: engineInputFromVersion(versions.measurementVersion),
    declaredUnit: 'cm',
    measurementVersionId: versions.measurementVersion.id,
  });
  assert.equal(trusted.pattern.fingerprint.value, t10.fingerprint.value);
});

test('T2 production repository create-only execution snapshot', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const production = new EntityRepository(store, 'production');
  const versions = chain({ garmentType: 'kaftan', specId: 'gsv-kaf', measurementId: 'mv-kaf' });
  const { version, record } = await freezeGovernedTrustedTailoring(production, versions);
  assert.equal(version.kind, 'TrustedTailoringExecution');
  assert.equal(version.measurementVersionId, versions.measurementVersion.id);
  assert.equal(version.specificationVersionId, versions.specificationVersion.id);
  assert.equal(version.compositionVersionId, versions.compositionVersion.id);
  const loaded = await production.get(record.metadata.localId);
  assert.equal((loaded?.payload as { kind: string }).kind, 'TrustedTailoringExecution');
  await persistTrustedTailoringExecution(production, chain({ specId: 'gsv-kaf-2', measurementId: 'mv-kaf-2' }));
  assert.equal((await production.listActive()).length, 2);
  assert.equal(typeof localStorage, 'undefined');
});

test('configuration provenance is present and hip remains unresolved', () => {
  const versions = chain({ garmentType: 'gown', specId: 'gsv-gown' });
  const result = executeTrustedTailoring(versions);
  assert.equal(result.identity.configurationIdentity, 'engine-internal-defaults');
  assert.ok(result.identity.configurationFingerprint);
  assert.equal(hipConflictUnresolved(), true);
});
