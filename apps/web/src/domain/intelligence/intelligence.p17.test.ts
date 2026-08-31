import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freezeMeasurementVersion } from '../measurement/version';
import { freezeGarmentSpecification } from '../garment/version';
import { freezeComposition } from '../composition/version';
import { freezeTrustedTailoringExecution } from '../tailoring/execution/version';
import { executeTrustedTailoring } from '../tailoring/execution/execute';
import {
  refuseIntelligenceMutationOfMeasurement,
  refuseIntelligenceMutationOfSpecification,
  refuseIntelligenceMutationOfComposition,
  refuseIntelligenceMutationOfExecution,
} from './refuse';
import { buildGovernedIntelligenceContext, assertNoBlockedKeysInContext } from './context';
import { interpretGovernedContext } from './interpreter';
import { validateIntelligenceResult, IntelligenceOutputError } from './validate';
import { requireOwner } from '../ownership';
import { runTailoringIntelligence } from '../../application/intelligence/service';
import { unavailableIntelligenceProvider } from '../../application/intelligence/unavailable';
import { openaiAdapter, claudeAdapter } from '../../application/intelligence/adapters/externalAdapter';
import type { LanguageModelPort } from '../../application/intelligence/provider';
import { executeDeterministicPattern } from '../tailoring/deterministic/execute';
import { engineInputFromVersion } from '../measurement/contract';

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

function chain(opts?: { garmentType?: string; blob?: Record<string, unknown>; ids?: string }) {
  const suffix = opts?.ids || 'p17';
  const measurementVersion = freezeMeasurementVersion({
    blob: opts?.blob || BODY,
    declaredUnit: 'cm',
    patternKind: 'bodice',
    source: 'body-capture',
    id: `mv-${suffix}`,
    capturedAt: '2026-08-31T00:00:00.000Z',
  });
  const specificationVersion = freezeGarmentSpecification({
    intent: { garmentType: opts?.garmentType ?? 'dress', measurementVersionId: measurementVersion.id },
    id: `gsv-${suffix}`,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  const compositionVersion = freezeComposition({
    specificationVersion,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  const execution = freezeTrustedTailoringExecution({
    measurementVersion,
    specificationVersion,
    compositionVersion,
    createdAt: '2026-08-31T00:00:00.000Z',
    id: `tte-${suffix}`,
  });
  return { measurementVersion, specificationVersion, compositionVersion, execution };
}

test('ai-advisory is application-layer and does not unlock 3d or billing', () => {
  assert.equal(requireOwner('ai-advisory').layer, 'APPLICATION');
});

test('intelligence cannot mutate frozen authorities', () => {
  const versions = chain();
  assert.throws(
    () => refuseIntelligenceMutationOfMeasurement(versions.measurementVersion, { bust: 1 }),
    /cannot be patched/
  );
  assert.throws(
    () => refuseIntelligenceMutationOfSpecification(versions.specificationVersion, { garmentType: 'shirt' }),
    /cannot be patched/
  );
  assert.throws(
    () => refuseIntelligenceMutationOfComposition(versions.compositionVersion, { completeness: 'complete' }),
    /cannot be patched/
  );
  assert.throws(
    () => refuseIntelligenceMutationOfExecution(versions.execution, { status: 'unknown' }),
    /cannot be patched/
  );
});

test('explanation classifies facts and does not invent hip authority', async () => {
  const versions = chain({
    blob: { bust: 90, waist: 72, neck: 36, shoulder: 12, backLength: 40 },
    ids: 'nohip',
  });
  const result = await runTailoringIntelligence({ ...versions, operationType: 'observe-measurements' });
  assert.equal(result.provenance.readOnly, true);
  assert.equal(result.provenance.mutatedAuthoritativeData, false);
  assert.ok(result.recommendations.some((item) => item.id === 'rec-review-hip'));
  assert.equal(
    result.recommendations.every((item) => item.requiresHumanApproval && item.authority === 'REQUIRES_HUMAN_REVIEW'),
    true
  );
  assert.equal(JSON.stringify(result).toLowerCase().includes('use 100'), false);
  assert.ok(result.observations.some((item) => item.classification === 'FACT' || item.classification === 'INFERENCE'));
});

test('unknown garment remains unknown in intelligence', async () => {
  const versions = chain({ garmentType: 'ceremonial overlay', ids: 'unk' });
  const result = await runTailoringIntelligence({ ...versions, operationType: 'explain-tailoring' });
  assert.ok(result.uncertainties.some((item) => item.classification === 'UNKNOWN'));
  assert.equal(/coerce unknown types to bodice/i.test(JSON.stringify(result)), true);
  assert.equal(/\bshould be bodice\b/i.test(JSON.stringify(result)), false);
  assert.equal(versions.execution.result.pattern.skipped, true);
});

test('deterministic fingerprints are unchanged by intelligence', async () => {
  const versions = chain({ ids: 'fp' });
  const before = versions.execution.result.fingerprint.value;
  await runTailoringIntelligence({ ...versions, operationType: 'explain-execution' });
  const after = executeTrustedTailoring({
    measurementVersion: versions.measurementVersion,
    specificationVersion: versions.specificationVersion,
    compositionVersion: versions.compositionVersion,
  });
  assert.equal(after.fingerprint.value, before);
  const t10 = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: engineInputFromVersion(versions.measurementVersion),
    declaredUnit: 'cm',
    measurementVersionId: versions.measurementVersion.id,
  });
  assert.equal(after.pattern.fingerprint.value, t10.fingerprint.value);
});

test('deterministic execution succeeds when AI is unavailable', async () => {
  const versions = chain({ ids: 'off' });
  const executed = executeTrustedTailoring({
    measurementVersion: versions.measurementVersion,
    specificationVersion: versions.specificationVersion,
    compositionVersion: versions.compositionVersion,
  });
  assert.equal(executed.status, 'executed');
  const advisory = await runTailoringIntelligence({
    ...versions,
    operationType: 'explain-tailoring',
    provider: unavailableIntelligenceProvider(),
  });
  assert.equal(advisory.availability, 'unavailable');
  assert.equal(executed.fingerprint.value, versions.execution.result.fingerprint.value);
});

test('context omits blocked keys', () => {
  const versions = chain({ ids: 'priv' });
  const context = buildGovernedIntelligenceContext(versions);
  assertNoBlockedKeysInContext(context);
  assert.equal((context.authorityFacts as { customerId?: string }).customerId, undefined);
});

test('malformed structured output is rejected', () => {
  assert.throws(() => validateIntelligenceResult({ summary: 1 }), IntelligenceOutputError);
  assert.throws(
    () =>
      validateIntelligenceResult({
        summary: 'x',
        observations: [],
        recommendations: [],
        uncertainties: [],
        evidence: [],
        confidence: 'YES',
        limitations: [],
        classification: 'FACT',
        humanApproval: 'NOT_APPLICABLE',
        provenance: {},
        availability: 'available',
      }),
    IntelligenceOutputError
  );
});

test('invalid classification is rejected', () => {
  assert.throws(
    () =>
      validateIntelligenceResult({
        summary: 'x',
        observations: [],
        recommendations: [],
        uncertainties: [],
        evidence: [],
        confidence: 'HIGH',
        limitations: [],
        classification: 'TRUTH',
        humanApproval: 'NOT_APPLICABLE',
        provenance: {
          operationId: '1',
          operationType: 'explain-tailoring',
          provider: 'local-governed',
          model: 'x',
          promptId: 'p',
          promptVersion: '1',
          contractVersion: 'tailoring-intelligence-v1',
          inputFingerprint: 'a',
          executionTimestamp: 't',
          readOnly: true,
          mutatedAuthoritativeData: false,
        },
        availability: 'available',
      }),
    /invalid classification/
  );
});

test('provider adapter is swappable and records metadata', async () => {
  const versions = chain({ ids: 'oa' });
  const context = buildGovernedIntelligenceContext(versions);
  const local = interpretGovernedContext({ operationType: 'explain-tailoring', context });
  const port: LanguageModelPort = {
    async complete() {
      return {
        provider: 'openai',
        model: 'test-model',
        text: JSON.stringify({
          summary: local.summary,
          observations: local.observations,
          recommendations: local.recommendations,
          uncertainties: local.uncertainties,
          evidence: local.evidence,
          confidence: local.confidence,
          limitations: local.limitations,
          classification: local.classification,
          humanApproval: local.humanApproval,
        }),
      };
    },
  };
  const result = await runTailoringIntelligence({
    ...versions,
    operationType: 'explain-tailoring',
    provider: openaiAdapter(port, 'test-model'),
  });
  assert.equal(result.provenance.provider, 'openai');
  assert.equal(result.provenance.model, 'test-model');
  assert.equal(result.availability, 'available');
});

test('malformed provider payload fails safe without mutating execution', async () => {
  const versions = chain({ ids: 'bad' });
  const before = versions.execution.result.fingerprint.value;
  const port: LanguageModelPort = {
    async complete() {
      return { provider: 'claude', model: 'x', text: 'not-json' };
    },
  };
  const result = await runTailoringIntelligence({
    ...versions,
    operationType: 'explain-execution',
    provider: claudeAdapter(port),
  });
  assert.equal(result.availability, 'unavailable');
  assert.equal(versions.execution.result.fingerprint.value, before);
});

test('silent provider switch is forbidden', async () => {
  const versions = chain({ ids: 'sw' });
  const port: LanguageModelPort = {
    async complete() {
      return { provider: 'gemini', model: 'sneak', text: '{}' };
    },
  };
  const result = await runTailoringIntelligence({
    ...versions,
    operationType: 'explain-tailoring',
    provider: openaiAdapter(port),
  });
  assert.equal(result.availability, 'unavailable');
  assert.ok(result.limitations.some((item) => item.code === 'PROVIDER_FAILURE'));
});
