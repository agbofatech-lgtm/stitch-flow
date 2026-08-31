import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  governedMeasurementsFromUnknown,
  assertNoSilentCoercion,
} from './inputAuthority';
import { governedPatternFromLoose } from '../../../application/tailoring/governedAdapter';

test('governed input refuses string numeric coercion', () => {
  assert.throws(() => assertNoSilentCoercion('90', 'bust'), /silent numeric coercion/);
  assert.throws(
    () => governedMeasurementsFromUnknown({ bust: '90' }),
    /silent numeric coercion/
  );
});

test('governed input refuses unknown measurement fields', () => {
  assert.throws(
    () => governedMeasurementsFromUnknown({ bust: 90, canvasZoom: 8 }),
    /unassignable/
  );
});

test('governed adapter executes without React or canvas', () => {
  const out = governedPatternFromLoose({
    kind: 'bodice',
    measurements: { bust: 90, waist: 72, neck: 36, shoulder: 12, backLength: 40 },
    declaredUnit: 'cm',
  });
  assert.equal(out.provenance.canonicalUnit, 'cm');
  assert.ok(out.fingerprint.value);
});

test('governed adapter rejects unknown pattern kind', () => {
  assert.throws(
    () =>
      governedPatternFromLoose({
        kind: 'tuxedo',
        measurements: { bust: 90 },
      }),
    /unknown pattern kind/
  );
});
