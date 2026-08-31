import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateStylePattern } from '../../modules/services/patternEngine';
import { generateProductionPlan } from '../../modules/services/productionAssistant';
import { freezeMeasurementVersion } from '../../domain/measurement/version';
import { engineInputFromVersion } from '../../domain/measurement/contract';
import {
  CM_PER_INCH,
  DEFAULT_FABRIC_QUANTITY_UNIT,
  ENGINE_LENGTH_UNIT,
  METRES_PER_YARD,
  fromYards,
  refuseImplicitBodyToFabricConversion,
  runPatternContract,
  runProductionContract,
  toCentimetres,
  toYards,
} from './index';

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

function stripGeneratedAt(plan: { generatedAt?: unknown }) {
  const { generatedAt: _generatedAt, ...rest } = plan;
  return rest;
}

test('pattern contract matches protected engine and records provenance', () => {
  const wrapped = runPatternContract({ kind: 'bodice', measurements: SAMPLE });
  const direct = generateStylePattern('bodice', SAMPLE);
  assert.deepEqual(wrapped.result, direct);
  assert.equal(wrapped.provenance.sourceEngine, 'patternEngine');
  assert.equal(wrapped.provenance.classification, 'deterministic');
  assert.equal(wrapped.provenance.measurementInputUnit, ENGINE_LENGTH_UNIT);
});

test('pattern contract converts inches with T8 constant before the engine', () => {
  const inches = { bust: 90 / CM_PER_INCH, waist: 72 / CM_PER_INCH, neck: 36 / CM_PER_INCH, shoulder: 12 / CM_PER_INCH, backLength: 40 / CM_PER_INCH };
  const fromInches = runPatternContract({
    kind: 'bodice',
    measurements: inches,
    declaredUnit: 'in',
  });
  const fromCm = generateStylePattern('bodice', {
    bust: toCentimetres(inches.bust, 'in'),
    waist: toCentimetres(inches.waist, 'in'),
    neck: toCentimetres(inches.neck, 'in'),
    shoulder: toCentimetres(inches.shoulder, 'in'),
    backLength: toCentimetres(inches.backLength, 'in'),
  });
  assert.deepEqual(fromInches.result, fromCm);
});

test('production contract matches assistant except generatedAt and records heuristic provenance', () => {
  const input = { garmentType: 'shirt' as const, measurements: SAMPLE };
  const wrapped = runProductionContract(input);
  const direct = generateProductionPlan(input);
  assert.deepEqual(stripGeneratedAt(wrapped.plan), stripGeneratedAt(direct));
  assert.equal(wrapped.provenance.sourceEngine, 'productionAssistant');
  assert.equal(wrapped.provenance.classification, 'heuristic');
  assert.equal(wrapped.provenance.measurementInputUnit, 'cm');
  assert.equal(wrapped.provenance.fabricOutputUnit, DEFAULT_FABRIC_QUANTITY_UNIT);
});

test('production contract refuses non-centimetre measurement inputs', () => {
  assert.throws(
    () =>
      runProductionContract({
        garmentType: 'shirt',
        measurements: SAMPLE,
        measurementInputUnit: 'in' as 'cm',
      }),
    /must be centimetres/
  );
});

test('measurement version id propagates on contracts without changing engine output', () => {
  const version = freezeMeasurementVersion({
    blob: SAMPLE,
    patternKind: 'bodice',
    source: 'body-capture',
  });
  const input = engineInputFromVersion(version);
  const patterned = runPatternContract({
    kind: 'bodice',
    measurements: input,
    measurementVersionId: version.id,
  });
  assert.equal(patterned.provenance.measurementVersionId, version.id);
  assert.deepEqual(patterned.result, generateStylePattern('bodice', input));
});

test('fabric yards conversion uses named constant and is not body-length conversion', () => {
  assert.equal(METRES_PER_YARD, 0.9144);
  assert.equal(toYards(0.9144, 'meters'), 1);
  assert.equal(fromYards(1, 'meters'), 0.9144);
  assert.throws(() => refuseImplicitBodyToFabricConversion(), /not fabric yards/);
});

test('production callers no longer import engines directly', () => {
  const jobSheet = readFileSync(new URL('../../modules/services/jobSheetExport.ts', import.meta.url), 'utf8');
  const appContext = readFileSync(new URL('../../context/AppContext.tsx', import.meta.url), 'utf8');
  const orders = readFileSync(new URL('../../components/Orders.tsx', import.meta.url), 'utf8');
  assert.equal(jobSheet.includes("from './patternEngine'"), false);
  assert.match(jobSheet, /from '\.\.\/\.\.\/application\/tailoring'/);
  assert.equal(appContext.includes('@modules/services/productionAssistant'), false);
  assert.match(appContext, /from '\.\.\/application\/tailoring'/);
  assert.equal(orders.includes('@modules/services/productionAssistant'), false);
  assert.match(orders, /from '\.\.\/application\/tailoring'/);
});

test('garmentLogic remains unused and is not imported by T9 contracts', () => {
  const index = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
  assert.equal(index.includes('garmentLogic'), false);
  const appContext = readFileSync(new URL('../../context/AppContext.tsx', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../../components/DesignStudio.tsx', import.meta.url), 'utf8');
  assert.equal(appContext.includes('garmentLogic'), false);
  assert.equal(studio.includes('garmentLogic'), false);
});
