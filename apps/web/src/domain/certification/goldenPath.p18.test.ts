/**
 * Phase 18 golden-path evidence for the governed authority chain.
 * Does not claim exclusive UI path. Does not rewrite engines.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freezeMeasurementVersion } from '../measurement/version';
import { freezeGarmentSpecification } from '../garment/version';
import { freezeComposition } from '../composition/version';
import { freezeTrustedTailoringExecution } from '../tailoring/execution/version';
import { executeTrustedTailoring } from '../tailoring/execution/execute';
import { runTailoringIntelligence } from '../../application/intelligence/service';
import { refuseIntelligenceMutationOfExecution } from '../intelligence/refuse';

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

test('governed golden path: freeze measurement → spec → composition → execution → advisory', async () => {
  const measurementVersion = freezeMeasurementVersion({
    blob: BODY,
    declaredUnit: 'cm',
    patternKind: 'bodice',
    source: 'body-capture',
    id: 'mv-p18-gold',
    capturedAt: '2026-08-31T00:00:00.000Z',
  });
  const specificationVersion = freezeGarmentSpecification({
    intent: { garmentType: 'dress', measurementVersionId: measurementVersion.id },
    id: 'gsv-p18-gold',
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  const compositionVersion = freezeComposition({
    specificationVersion,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  assert.equal(compositionVersion.specificationVersionId, specificationVersion.id);

  const execution = freezeTrustedTailoringExecution({
    measurementVersion,
    specificationVersion,
    compositionVersion,
    id: 'tte-p18-gold',
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  assert.equal(execution.measurementVersionId, measurementVersion.id);
  assert.equal(execution.specificationVersionId, specificationVersion.id);
  assert.equal(execution.compositionVersionId, compositionVersion.id);
  assert.equal(execution.result.fingerprint.cryptographic, false);
  assert.equal(execution.frozen, true);

  const replay = executeTrustedTailoring({
    measurementVersion,
    specificationVersion,
    compositionVersion,
  });
  assert.equal(replay.fingerprint.value, execution.result.fingerprint.value);

  const advisory = await runTailoringIntelligence({
    measurementVersion,
    specificationVersion,
    compositionVersion,
    execution,
    operationType: 'explain-execution',
  });
  assert.equal(advisory.provenance.readOnly, true);
  assert.equal(advisory.provenance.mutatedAuthoritativeData, false);
  assert.throws(() => refuseIntelligenceMutationOfExecution(execution, { status: 'unknown' }), /cannot be patched/);
});
