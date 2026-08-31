import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { generateStylePattern } from '../../../modules/services/patternEngine';
import { generateProductionPlan } from '../../../modules/services/productionAssistant';
import {
  canonicalize,
  canonicalJson,
  executeDeterministicPattern,
  executeDeterministicProductionPlan,
  fingerprintCanonicalPayload,
  refuseImplicitBodyToFabricConversion,
  assertSameUnitFamily,
  CM_PER_INCH,
  toCentimetres,
  HIP_DEFAULT_CONFLICT,
  PATTERN_ENGINE_SOURCE_IDENTITY,
  PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
} from './index';
import { toCentimetres as t8ToCm } from '../../measurement/units';

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

function fileSha256(relFromRepo: string) {
  const abs = new URL(`../../../../../${relFromRepo}`, import.meta.url);
  const buf = readFileSync(abs);
  return createHash('sha256').update(buf).digest('hex');
}

test('canonicalization is independent of object key insertion order', () => {
  const a = { waist: 72, bust: 90, neck: 36 };
  const b = { neck: 36, bust: 90, waist: 72 };
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.equal(fingerprintCanonicalPayload(a), fingerprintCanonicalPayload(b));
});

test('undefined and null optional fields do not change canonical identity', () => {
  const full = { bust: 90, hip: undefined as number | undefined };
  const omitted = { bust: 90 };
  assert.equal(canonicalJson(full), canonicalJson(omitted));
  assert.equal(canonicalJson({ bust: 90, hip: null }), canonicalJson({ bust: 90 }));
});

test('non-finite numbers are rejected', () => {
  assert.throws(() => canonicalize({ bust: Number.NaN }), /not canonical/);
});

test('pattern wrap matches protected engine and is repeatable', () => {
  const first = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: SAMPLE,
  });
  const second = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: { backLength: SAMPLE.backLength, ...SAMPLE },
  });
  const direct = generateStylePattern('bodice', SAMPLE);
  assert.deepEqual(first.result, direct);
  assert.deepEqual(first.normalizedOutput, second.normalizedOutput);
  assert.equal(first.fingerprint.value, second.fingerprint.value);
  assert.equal(first.provenance.classification, 'deterministic');
  assert.equal(first.provenance.canonicalUnit, 'cm');
});

test('inch declaration converts with T8 constant before the engine', () => {
  const inches = {
    bust: 90 / CM_PER_INCH,
    waist: 72 / CM_PER_INCH,
    neck: 36 / CM_PER_INCH,
    shoulder: 12 / CM_PER_INCH,
    backLength: 40 / CM_PER_INCH,
  };
  const wrapped = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: inches,
    declaredUnit: 'in',
  });
  const cm = {
    bust: t8ToCm(inches.bust, 'in'),
    waist: t8ToCm(inches.waist, 'in'),
    neck: t8ToCm(inches.neck, 'in'),
    shoulder: t8ToCm(inches.shoulder, 'in'),
    backLength: t8ToCm(inches.backLength, 'in'),
  };
  assert.deepEqual(wrapped.result, generateStylePattern('bodice', cm));
  assert.equal(toCentimetres(1, 'in'), 2.54);
});

test('production wrap matches assistant except generatedAt; fingerprint ignores clock', () => {
  const input = {
    computationType: 'production-plan' as const,
    garmentType: 'shirt' as const,
    measurements: SAMPLE,
  };
  const a = executeDeterministicProductionPlan(input);
  const b = executeDeterministicProductionPlan(input);
  const direct = generateProductionPlan({ garmentType: 'shirt', measurements: SAMPLE });
  const strip = (plan: { generatedAt?: unknown }) => {
    const { generatedAt: _g, ...rest } = plan;
    return rest;
  };
  assert.deepEqual(strip(a.result), strip(direct));
  assert.deepEqual(a.normalizedOutput, b.normalizedOutput);
  assert.equal(a.fingerprint.value, b.fingerprint.value);
  assert.equal(a.provenance.deterministicStatus, 'identity-stable-excluding-generatedAt');
  assert.ok(a.operationalMetadata.generatedAt);
  assert.equal(JSON.stringify(a.normalizedOutput).includes('generatedAt'), false);
});

test('production contract refuses non-centimetre measurement inputs', () => {
  assert.throws(
    () =>
      executeDeterministicProductionPlan({
        computationType: 'production-plan',
        garmentType: 'shirt',
        measurements: SAMPLE,
        declaredUnit: 'in',
      }),
    /must be centimetres/
  );
});

test('body length and fabric quantity families cannot mix', () => {
  assert.throws(() => refuseImplicitBodyToFabricConversion(), /not fabric yards/);
  assert.throws(() => assertSameUnitFamily('body-length', 'fabric-quantity'), /not fabric yards/);
});

test('different pattern kinds produce different fingerprints', () => {
  const bodice = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: SAMPLE,
  });
  const shirt = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'shirt',
    measurements: SAMPLE,
  });
  assert.notEqual(bodice.fingerprint.value, shirt.fingerprint.value);
});

test('hip default conflict remains unreconciled', () => {
  assert.deepEqual(HIP_DEFAULT_CONFLICT.values, [98, 100, 102]);
  assert.equal(HIP_DEFAULT_CONFLICT.reconciled, false);
});

test('engine source identity matches protected T0 hashes', () => {
  const pattern = fileSha256('apps/web/src/modules/services/patternEngine.ts');
  const assistant = fileSha256('apps/web/src/modules/services/productionAssistant.ts');
  assert.equal(PATTERN_ENGINE_SOURCE_IDENTITY, `sha256:${pattern}`);
  assert.equal(PRODUCTION_ASSISTANT_SOURCE_IDENTITY, `sha256:${assistant}`);
});
