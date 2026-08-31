import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  executeDeterministicPattern,
  executeDeterministicProductionPlan,
  canonicalize,
} from './index';

const SAMPLE = {
  bust: 90,
  waist: 72,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  hip: 98,
  chest: 90,
};

test('twenty pattern runs yield one normalized output and one fingerprint', () => {
  const first = executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: 'bodice',
    measurements: SAMPLE,
  });
  for (let i = 0; i < 19; i += 1) {
    const next = executeDeterministicPattern({
      computationType: 'pattern-geometry',
      kind: 'bodice',
      measurements: { backLength: 40, waist: 72, bust: 90, neck: 36, shoulder: 12, hip: 98, chest: 90 },
    });
    assert.deepEqual(next.normalizedOutput, first.normalizedOutput);
    assert.equal(next.fingerprint.value, first.fingerprint.value);
  }
});

test('twenty production runs keep identity while generatedAt may move', () => {
  const stamps = new Set<string | undefined>();
  const first = executeDeterministicProductionPlan({
    computationType: 'production-plan',
    garmentType: 'shirt',
    measurements: SAMPLE,
  });
  stamps.add(first.operationalMetadata.generatedAt);
  for (let i = 0; i < 19; i += 1) {
    const next = executeDeterministicProductionPlan({
      computationType: 'production-plan',
      garmentType: 'shirt',
      measurements: SAMPLE,
    });
    assert.deepEqual(next.normalizedOutput, first.normalizedOutput);
    assert.equal(next.fingerprint.value, first.fingerprint.value);
    stamps.add(next.operationalMetadata.generatedAt);
    assert.equal(JSON.stringify(canonicalize(next.normalizedOutput)).includes('generatedAt'), false);
  }
  assert.ok(first.operationalMetadata.generatedAt);
});
