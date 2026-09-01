import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateStylePattern } from '../../modules/services/patternEngine';
import { generateStudioPattern } from './patternAdapter';
import { STUDIO_SAVE_PATHS, assertSavePathsRemainDistinct } from './saveContract';
import { assessTrustedReadiness } from './trustedReadiness';
import { finalizeDesignForTrustedTailoring } from './trustedFinalization';
import { executeDeterministicPattern } from '../../domain/tailoring/deterministic/execute';

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

test('SAC-1 incomplete finalization preserves the working draft and creates no artifact', async () => {
  const draft = { bust: 90, waist: 72 };
  const before = { ...draft };
  const result = await finalizeDesignForTrustedTailoring({
    measurements: draft,
    garmentType: 'bodice',
    persist: false,
  });
  assert.equal(result.status, 'INCOMPLETE');
  assert.equal(result.artifact, null);
  assert.equal(result.draftPreserved, true);
  assert.deepEqual(draft, before);
  assert.equal(result.readiness.filledByEngineDefaults, false);
  assert.ok(result.readiness.missing.some((item) => item.field === 'neck'));
  assert.ok(!result.readiness.missing.some((item) => item.reason.toLowerCase().includes('default 98')));
});

test('SAC-1 completeness does not invent hip or sleeve configuration', () => {
  const readiness = assessTrustedReadiness({
    measurements: { waist: 72, skirtLength: 75 },
    garmentType: 'skirt',
  });
  assert.equal(readiness.ready, false);
  const hip = readiness.missing.find((item) => item.field === 'hip');
  assert.ok(hip);
  assert.equal(hip?.severity, 'blocking');
  assert.ok(!readiness.available.includes('hip'));
  const sleeve = readiness.warnings.find((item) => item.field === 'sleeveStyle');
  assert.ok(sleeve);
  assert.equal(sleeve?.severity, 'advisory');
});

test('SAC-1 complete finalization freezes versions, executes, and records provenance', async () => {
  const draft = { ...SAMPLE };
  const result = await finalizeDesignForTrustedTailoring({
    measurements: draft,
    garmentType: 'shirt',
    persist: false,
    capturedAt: '2026-09-01T00:00:00.000Z',
    measurementVersionId: 'mv-sac1',
    specificationVersionId: 'gsv-sac1',
    compositionVersionId: 'gcv-sac1',
    executionId: 'tte-sac1',
  });
  assert.equal(result.status, 'EXECUTED');
  assert.ok(result.artifact);
  assert.equal(result.artifact?.measurementVersion.frozen, true);
  assert.equal(result.artifact?.specificationVersion.frozen, true);
  assert.equal(result.artifact?.compositionVersion.frozen, true);
  assert.equal(result.artifact?.execution.frozen, true);
  assert.equal(result.artifact?.result.pattern.classification, 'OBSERVED_ENGINE_OUTPUT');
  assert.equal(result.artifact?.result.production.classification, 'HEURISTIC_OUTPUT');
  assert.equal(result.artifact?.cryptographic, false);
  assert.equal(result.artifact?.fingerprintAlgorithm, 'fnv1a-64');
  assert.equal(result.artifact?.execution.provenance.measurementVersionId, 'mv-sac1');
  assert.deepEqual(draft, SAMPLE);
});

test('SAC-1 repeatability: same frozen ids and inputs yield the same execution fingerprint', async () => {
  const input = {
    measurements: { ...SAMPLE },
    garmentType: 'bodice' as const,
    persist: false as const,
    capturedAt: '2026-09-01T00:00:00.000Z',
    measurementVersionId: 'mv-rep',
    specificationVersionId: 'gsv-rep',
    compositionVersionId: 'gcv-rep',
    executionId: 'tte-rep',
  };
  const a = await finalizeDesignForTrustedTailoring(input);
  const b = await finalizeDesignForTrustedTailoring(input);
  assert.equal(a.status, 'EXECUTED');
  assert.equal(b.status, 'EXECUTED');
  assert.equal(a.artifact?.result.fingerprint.value, b.artifact?.result.fingerprint.value);
  assert.equal(
    a.artifact?.result.identity.measurementFingerprint,
    b.artifact?.result.identity.measurementFingerprint
  );
});

test('SAC-1 Path A generation remains the T7 identity re-export', () => {
  assert.deepEqual(generateStudioPattern('bodice', SAMPLE), generateStylePattern('bodice', SAMPLE));
  assertSavePathsRemainDistinct();
  assert.equal(STUDIO_SAVE_PATHS.studioOrderCommit, 'studio-order-commit');
  assert.equal(STUDIO_SAVE_PATHS.contextSessionSave, 'context-studio-session');
});

test('SAC-1 dual-run: complete Path C pattern classification is comparable, not pixel-equal to canvas', async () => {
  const pathA = generateStylePattern('bodice', SAMPLE);
  const pathC = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: SAMPLE,
    declaredUnit: 'cm',
  });
  assert.deepEqual(pathC.result, pathA);
  assert.equal(pathC.provenance.classification, 'deterministic');
  const trusted = await finalizeDesignForTrustedTailoring({
    measurements: { ...SAMPLE },
    garmentType: 'bodice',
    persist: false,
  });
  assert.equal(trusted.status, 'EXECUTED');
  assert.equal(trusted.artifact?.result.pattern.classification, 'OBSERVED_ENGINE_OUTPUT');
  assert.notEqual(trusted.artifact?.result.pattern.classification, pathC.provenance.classification);
});
