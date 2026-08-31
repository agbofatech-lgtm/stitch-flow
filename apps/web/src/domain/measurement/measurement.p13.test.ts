import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../../shared/persistence/memoryStore';
import { EntityRepository } from '../../shared/persistence/repository';
import { migrateLocalSchema } from '../../shared/persistence/schema';
import { generateStylePattern } from '../../modules/services/patternEngine';
import { classifyMeasurementRecord } from './taxonomy';
import {
  assessPatternInputCompleteness,
  assertPatternInputComplete,
} from './completeness';
import { assessStructuralValidation, observeEnginePlausibility } from './plausibility';
import { freezeMeasurementVersion } from './version';
import { separateLegacyMeasurementBlob } from './separate';
import { hipConflictUnresolved } from '../tailoring/deterministic/configuration';
import { freezeLiveBlobToVersion, rejectLivePatchOnFrozenVersion } from '../../application/measurement/versionAuthority';
import { executeGovernedPatternFromVersion } from '../../application/measurement/t10Integration';
import { requestPattern } from '../pattern/gateway';

const BODICE_COMPLETE = {
  bust: 90,
  waist: 72,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  bustSpan: 11,
  armholeDepth: 22,
};

const SKIRT_COMPLETE = {
  waist: 72,
  hip: 100,
  skirtLength: 75,
};

test('taxonomy distinguishes live profile, frozen version, derived pattern, and measurement set', () => {
  assert.equal(classifyMeasurementRecord({ isLiveProfile: true }).authority, 'live-profile');
  assert.equal(
    classifyMeasurementRecord({ kind: 'MeasurementVersion', frozen: true }).authority,
    'frozen-version'
  );
  assert.equal(classifyMeasurementRecord({ kind: 'MeasurementSet' }).authority, 'measurement-set');
  assert.equal(
    classifyMeasurementRecord({ derivedFrom: 'body+garment' }).authority,
    'derived-pattern'
  );
  assert.equal(
    classifyMeasurementRecord({ draftKey: 'stitchflow:design-studio:drafts' }).sourceOfTruth,
    'legacy'
  );
  assert.equal(classifyMeasurementRecord({ isOrderSnapshot: true }).sourceOfTruth, 'transitional-appcontext');
});

test('completeness uses PATTERN_INPUT_FIELDS and does not fill hip/bust defaults', () => {
  const incomplete = separateLegacyMeasurementBlob({ waist: 72, skirtLength: 75 }, 'skirt');
  const report = assessPatternInputCompleteness(incomplete, 'skirt');
  assert.equal(report.complete, false);
  assert.deepEqual(report.missing, ['hip']);
  assert.equal(report.filledByEngineDefaults, false);
  assert.throws(() => assertPatternInputComplete(report), /Do not apply engine defaults/);

  const trouser = assessPatternInputCompleteness(
    separateLegacyMeasurementBlob({ waist: 72, trouserLength: 108, thigh: 58, knee: 42, ankle: 28 }, 'trouser'),
    'trouser'
  );
  assert.equal(trouser.missing.includes('hip'), true);
  assert.equal(hipConflictUnresolved(), true);
});

test('shirt completeness accepts bust alias for chest without a second vocabulary', () => {
  const separated = separateLegacyMeasurementBlob(
    { bust: 96, neck: 36, shoulder: 12, sleeve: 24, backLength: 40 },
    'shirt'
  );
  const report = assessPatternInputCompleteness(separated, 'shirt');
  assert.equal(report.complete, true);
  assert.equal(report.missing.length, 0);
});

test('validation is not plausibility; engine ranges are observed not copied', () => {
  const ok = assessStructuralValidation(BODICE_COMPLETE);
  assert.equal(ok.status, 'pass');
  const badField = assessStructuralValidation({ mysterySpan: 12 });
  assert.equal(badField.status, 'fail');

  const incomplete = observeEnginePlausibility(separateLegacyMeasurementBlob({ bust: 90 }, 'bodice'), 'bodice');
  assert.equal(incomplete.status, 'incomplete');
  assert.equal(incomplete.authority, 'none');

  const accepted = observeEnginePlausibility(separateLegacyMeasurementBlob(BODICE_COMPLETE, 'bodice'), 'bodice');
  assert.equal(accepted.status, 'engine-accepted');
  assert.equal(accepted.authority, 'pattern-engine-observation');

  const rejected = observeEnginePlausibility(
    separateLegacyMeasurementBlob({ ...BODICE_COMPLETE, bust: 10 }, 'bodice'),
    'bodice'
  );
  assert.equal(rejected.status, 'engine-rejected');
  assert.match(rejected.engineMessage || '', /out of safe range/);
});

test('frozen version authority persists on T2 and refuses live patches', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repo = new EntityRepository(store, 'measurement');
  const { version, record } = await freezeLiveBlobToVersion(repo, {
    blob: BODICE_COMPLETE,
    patternKind: 'bodice',
    profileId: 'profile-1',
    customerId: 'c1',
    source: 'profile',
  });
  assert.equal(version.frozen, true);
  assert.equal(version.kind, 'MeasurementVersion');
  assert.ok(record?.metadata.localId);
  assert.equal(typeof localStorage, 'undefined');
  assert.throws(() => rejectLivePatchOnFrozenVersion(version, { bust: 120 }), /cannot be patched/);
});

test('T10 governed execute from frozen version matches engine and refuses incomplete hip', () => {
  const version = freezeMeasurementVersion({
    blob: BODICE_COMPLETE,
    patternKind: 'bodice',
    source: 'body-capture',
    id: 'mv-p13-bodice',
  });
  const governed = executeGovernedPatternFromVersion(version, 'bodice');
  const direct = generateStylePattern('bodice', BODICE_COMPLETE);
  const wrapped = requestPattern({ kind: 'bodice', measurements: BODICE_COMPLETE }).result;
  assert.deepEqual(governed.result, direct);
  assert.deepEqual(governed.result, wrapped);
  assert.equal(governed.provenance.measurementVersionId, 'mv-p13-bodice');

  const skirtMissingHip = freezeMeasurementVersion({
    blob: { waist: 72, skirtLength: 75 },
    patternKind: 'skirt',
    source: 'profile',
  });
  assert.throws(
    () => executeGovernedPatternFromVersion(skirtMissingHip, 'skirt'),
    /incomplete for skirt \(missing hip\)/
  );
});

test('complete skirt with explicit hip does not reconcile 98/100/102', () => {
  const version = freezeMeasurementVersion({
    blob: SKIRT_COMPLETE,
    patternKind: 'skirt',
    source: 'body-capture',
  });
  const governed = executeGovernedPatternFromVersion(version, 'skirt');
  assert.equal(hipConflictUnresolved(), true);
  const measurements =
    'measurements' in governed.result ? governed.result.measurements : {};
  assert.equal((measurements as { hip?: number }).hip, 100);
});
