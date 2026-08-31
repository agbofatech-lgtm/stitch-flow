import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateStylePattern } from '../../modules/services/patternEngine';
import { generateProductionPlan } from '../../modules/services/productionAssistant';
import { generateStudioPattern, PatternValidationError } from './patternAdapter';
import { generateStudioProductionPlan } from './productionAdapter';
import {
  STUDIO_DRAFT_STORAGE_KEY,
  getDraftStorageKey,
  isLegacyStudioDraftKey,
} from './draftStore';
import { assertSavePathsRemainDistinct, describeStudioSavePaths } from './saveContract';
import {
  assertNoUiStateInSpecification,
  buildStudioGarmentSpecification,
  serializeGarmentSpecification,
} from './studioSpecification';

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

test('pattern adapter output matches protected engine', () => {
  for (const kind of ['bodice', 'shirt', 'trouser', 'skirt', 'kaftan'] as const) {
    assert.deepEqual(generateStudioPattern(kind, SAMPLE), generateStylePattern(kind, SAMPLE), kind);
  }
});

test('production adapter output matches protected assistant except generatedAt', () => {
  const input = { garmentType: 'shirt' as const, measurements: SAMPLE };
  const direct = generateProductionPlan(input);
  const wrapped = generateStudioProductionPlan(input);
  const { generatedAt: _a, ...directRest } = direct;
  const { generatedAt: _b, ...wrappedRest } = wrapped;
  assert.deepEqual(wrappedRest, directRest);
});

test('PatternValidationError remains the protected engine class', () => {
  assert.equal(PatternValidationError.name, 'PatternValidationError');
});

test('garment specification serializes without UI state', () => {
  const spec = buildStudioGarmentSpecification({
    garmentType: 'dress',
    measurements: SAMPLE,
    customerId: 'c1',
    orderId: 'o1',
    designInspirationId: 'd1',
    fabricRecordId: 'f1',
  });
  assert.equal(spec.patternKind, 'bodice');
  assert.equal(spec.separated.body.fields.bust, 90);
  assert.equal(spec.separated.garment.fields.skirtLength, 75);
  const json = serializeGarmentSpecification(spec);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  assert.equal(parsed.activeTab, undefined);
  assert.equal(parsed.canvasZoom, undefined);
  assertNoUiStateInSpecification(parsed);
  assert.throws(() => assertNoUiStateInSpecification({ selectedTab: 'pattern' }));
});

test('save paths remain distinct operations', () => {
  assertSavePathsRemainDistinct();
  const paths = describeStudioSavePaths();
  assert.equal(paths.length, 2);
  assert.notEqual(paths[0].path, paths[1].path);
});

test('legacy draft key is unchanged and no new key is introduced', () => {
  assert.equal(STUDIO_DRAFT_STORAGE_KEY, 'stitchflow:design-studio:drafts');
  assert.equal(isLegacyStudioDraftKey(STUDIO_DRAFT_STORAGE_KEY), true);
  assert.equal(getDraftStorageKey('abc'), 'order:abc');
  assert.equal(getDraftStorageKey(null), 'draft:unlinked');
});

test('Design Studio no longer imports engines directly', () => {
  const source = readFileSync(new URL('../../components/DesignStudio.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('@modules/services/patternEngine'), false);
  assert.equal(source.includes('@modules/services/productionAssistant'), false);
  assert.match(source, /from '\.\.\/application\/design'/);
  assert.equal(source.includes("localStorage.getItem('stitchflow:design-studio:drafts')"), false);
});
