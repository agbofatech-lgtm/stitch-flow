import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  executeDeterministicPattern,
  executeDeterministicProductionPlan,
} from './index';
import { freezeMeasurementVersion } from '../../measurement/version';
import { engineInputFromVersion } from '../../measurement/contract';
import type { StylePatternKind } from '../../../modules/services/patternEngine';

type PatternFixture = {
  fixtureId: string;
  computationVersion: string;
  canonicalUnit: string;
  input: { kind: StylePatternKind; measurements: Record<string, number>; declaredUnit: 'cm' };
  expectedFingerprint: { algorithm: string; value: string };
  expectedNormalizedOutput: unknown;
};

type ProductionFixture = {
  fixtureId: string;
  computationVersion: string;
  canonicalUnit: string;
  fabricOutputUnit: string;
  input: { garmentType: 'shirt' | 'trouser' | 'dress'; measurements: Record<string, number>; declaredUnit: 'cm' };
  expectedFingerprint: { algorithm: string; value: string };
  expectedNormalizedOutput: unknown;
  expectedFabricEstimate: { unit: string; mainFabricQty: number };
};

function loadJson<T>(name: string): T {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as T;
}

test('pattern golden fixtures match current governed execution', () => {
  const fixtures = loadJson<PatternFixture[]>('pattern.v1.json');
  assert.equal(fixtures.length, 5);
  for (const fx of fixtures) {
    assert.equal(fx.canonicalUnit, 'cm');
    assert.equal(fx.computationVersion, 'pattern-v1');
    const out = executeDeterministicPattern({
      computationType: 'pattern-geometry',
      kind: fx.input.kind,
      measurements: fx.input.measurements,
      declaredUnit: 'cm',
    });
    assert.deepEqual(out.normalizedOutput, fx.expectedNormalizedOutput, fx.fixtureId);
    assert.equal(out.fingerprint.value, fx.expectedFingerprint.value, fx.fixtureId);
    assert.equal(out.fingerprint.algorithm, 'fnv1a-64');
  }
});

test('production golden fixtures match plan body and fabric yards, not body cm', () => {
  const fixtures = loadJson<ProductionFixture[]>('production.v1.json');
  assert.equal(fixtures.length, 3);
  for (const fx of fixtures) {
    assert.equal(fx.canonicalUnit, 'cm');
    assert.equal(fx.fabricOutputUnit, 'yards');
    const out = executeDeterministicProductionPlan({
      computationType: 'production-plan',
      garmentType: fx.input.garmentType,
      measurements: fx.input.measurements,
      declaredUnit: 'cm',
    });
    assert.deepEqual(out.normalizedOutput, fx.expectedNormalizedOutput, fx.fixtureId);
    assert.equal(out.fingerprint.value, fx.expectedFingerprint.value, fx.fixtureId);
    assert.equal(out.result.fabricEstimate.unit, 'yards');
    assert.equal(out.provenance.canonicalUnit, 'cm');
    assert.notEqual(out.provenance.canonicalUnit, out.result.fabricEstimate.unit);
  }
});

test('measurement-version derived pattern matches freeze then engine wrap', () => {
  const blob = { bust: 90, waist: 72, neck: 36, shoulder: 12, backLength: 40 };
  const version = freezeMeasurementVersion({
    blob,
    patternKind: 'bodice',
    source: 'body-capture',
    id: 'mv-fixture-fixed',
    capturedAt: '2026-08-31T00:00:00.000Z',
  });
  const input = engineInputFromVersion(version);
  const out = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: input,
    declaredUnit: 'cm',
    measurementVersionId: version.id,
  });
  assert.equal(out.provenance.measurementVersionId, 'mv-fixture-fixed');
  assert.equal(out.provenance.canonicalUnit, 'cm');
  const again = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: input,
    declaredUnit: 'cm',
    measurementVersionId: version.id,
  });
  assert.deepEqual(out.normalizedOutput, again.normalizedOutput);
  assert.equal(out.fingerprint.value, again.fingerprint.value);
});
