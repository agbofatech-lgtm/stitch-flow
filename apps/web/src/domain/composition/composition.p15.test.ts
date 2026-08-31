import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../../shared/persistence/memoryStore';
import { EntityRepository } from '../../shared/persistence/repository';
import { migrateLocalSchema } from '../../shared/persistence/schema';
import { freezeGarmentSpecification } from '../garment/version';
import { evaluateGarmentSpecification } from '../garment/evaluate';
import { legacyPatternKindCompatibility } from '../garment/taxonomy';
import { evaluateComposition, validateComposition } from './evaluate';
import { canonicalizeGarmentComposition, fingerprintGarmentComposition } from './canonicalize';
import {
  freezeComposition,
  refuseFrozenCompositionMutation,
  historicalCompositionIntact,
} from './version';
import { persistGarmentCompositionVersion } from '../persistence/garmentCompositionVersionStore';
import { freezeGovernedComposition, evaluateGovernedComposition } from '../../application/composition/intelligence';
import { canonicalRequiredComponentRules } from './registry';
import { COMPOSITION_FINGERPRINT_ALGORITHM } from './canonicalize';

function frozenSpec(
  intent: { garmentType?: string; sleeveStyle?: string; collarStyle?: string; fitType?: string },
  id = 'spec-fixed-1'
) {
  return freezeGarmentSpecification({
    intent,
    source: 'manual',
    id,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
}

test('canonical required-component registry is empty', () => {
  assert.equal(canonicalRequiredComponentRules().length, 0);
});

test('known dress records pattern projection without claiming dress is bodice', () => {
  const spec = frozenSpec({ garmentType: 'dress' });
  const evaluated = evaluateComposition({ specificationVersion: spec });
  assert.equal(evaluated.completeness, 'partial');
  assert.equal(evaluated.reason, 'COMPOSITION_PARTIAL');
  assert.equal(evaluated.composition.garmentType, 'dress');
  assert.equal(evaluated.composition.patternProjection?.patternKind, 'bodice');
  assert.equal(evaluated.composition.patternProjection?.notCompositionIdentity, true);
  assert.equal(evaluated.composition.patternProjection?.authority, 'legacy-map');
  const confirmed = evaluated.composition.components.filter((item) => item.status === 'CONFIRMED');
  assert.equal(confirmed.length, 0);
  assert.equal(
    evaluated.composition.components.some((item) => item.componentType === 'BODICE' && item.status === 'CONFIRMED'),
    false
  );
  assert.ok(evaluated.composition.unknownAreas.includes('required-structure'));
  assert.notEqual(evaluated.composition.garmentType, 'bodice');
});

test('unknown ceremonial garment is not coerced to bodice', () => {
  const spec = frozenSpec({ garmentType: 'asymmetric layered ceremonial garment' }, 'spec-unknown');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  assert.equal(evaluated.completeness, 'unknown');
  assert.equal(evaluated.reason, 'COMPOSITION_UNKNOWN');
  assert.equal(evaluated.composition.garmentType, null);
  assert.equal(evaluated.composition.rawGarmentType, 'asymmetric layered ceremonial garment');
  assert.equal(evaluated.composition.patternProjection, undefined);
  assert.equal(
    evaluated.composition.components.some((item) => item.componentType === 'BODICE'),
    false
  );
  const legacy = legacyPatternKindCompatibility('asymmetric layered ceremonial garment');
  assert.equal(legacy.patternKind, 'bodice');
  assert.notEqual(evaluated.composition.garmentType, 'bodice');
});

test('absent garment type composition is unknown, not completed', () => {
  const spec = frozenSpec({}, 'spec-absent');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  assert.equal(evaluated.completeness, 'unknown');
  assert.equal(evaluated.reason, 'COMPOSITION_UNKNOWN');
  assert.equal(evaluated.composition.authorityStatus, 'insufficient');
});

test('specification completeness is not composition completeness', () => {
  const specEval = evaluateGarmentSpecification({ garmentType: 'shirt' });
  assert.equal(specEval.completeness, 'complete');
  const spec = frozenSpec({ garmentType: 'shirt' }, 'spec-shirt');
  const composition = evaluateComposition({ specificationVersion: spec });
  assert.equal(composition.completeness, 'partial');
  assert.notEqual(specEval.completeness, composition.completeness);
});

test('sleeveStyle is evidence not a SleeveComponent', () => {
  const spec = frozenSpec({ garmentType: 'dress', sleeveStyle: 'long' }, 'spec-sleeve');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  assert.equal(
    evaluated.composition.components.some((item) => item.componentType === 'SLEEVE'),
    false
  );
  assert.ok(
    evaluated.evidence.some(
      (item) => item.sourceType === 'SPECIFICATION' && item.note?.includes('sleeveStyle')
    )
  );
});

test('production heuristics are cited and not applied as components', () => {
  const spec = frozenSpec({ garmentType: 'agbada' }, 'spec-agbada');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  assert.ok(
    evaluated.evidence.some(
      (item) => item.sourceType === 'PRODUCTION_ASSISTANT' && item.classification === 'OBSERVATION'
    )
  );
  assert.equal(evaluated.composition.components.length, 0);
  assert.equal(evaluated.composition.relationships.length, 0);
  assert.equal(evaluated.composition.patternProjection?.patternKind, 'kaftan');
  assert.equal(evaluated.composition.patternProjection?.notCompositionIdentity, true);
});

test('unsupported explicit structure remains UNSUPPORTED', () => {
  const spec = frozenSpec({ garmentType: 'custom' }, 'spec-custom');
  const evaluated = evaluateComposition({
    specificationVersion: spec,
    explicitSelections: [
      {
        componentType: 'CUSTOM',
        label: 'Asymmetric layered ceremonial overlay',
        unsupported: true,
      },
    ],
  });
  assert.equal(evaluated.completeness, 'unsupported');
  assert.equal(evaluated.reason, 'COMPOSITION_UNSUPPORTED');
  assert.equal(evaluated.unsupportedComponents.length, 1);
  assert.equal(evaluated.unsupportedComponents[0].status, 'UNSUPPORTED');
  assert.equal(evaluated.unsupportedComponents[0].componentType, 'CUSTOM');
});

test('explicit custom component is CUSTOM not inferred from type', () => {
  const spec = frozenSpec({ garmentType: 'shirt' }, 'spec-custom-ok');
  const evaluated = evaluateComposition({
    specificationVersion: spec,
    explicitSelections: [{ componentType: 'CUSTOM', label: 'Decorative shoulder overlay' }],
  });
  assert.equal(evaluated.knownComponents.length, 1);
  assert.equal(evaluated.knownComponents[0].status, 'CUSTOM');
  assert.equal(evaluated.knownComponents[0].source, 'USER_SELECTION');
  assert.equal(evaluated.composition.authorityStatus, 'explicit');
});

test('every derived observation retains evidence provenance', () => {
  const spec = frozenSpec({ garmentType: 'gown', collarStyle: 'high' }, 'spec-gown');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  for (const component of evaluated.composition.components) {
    assert.ok(component.evidenceIds.length > 0);
  }
  assert.ok(evaluated.evidence.some((item) => item.sourceType === 'SPECIFICATION'));
  assert.ok(evaluated.evidence.some((item) => item.sourceType === 'LEGACY_MAPPING'));
  assert.ok(evaluated.fingerprint.algorithm === 'fnv1a-64');
  assert.equal(evaluated.fingerprint.cryptographic, false);
  assert.equal(COMPOSITION_FINGERPRINT_ALGORITHM, 'fnv1a-64');
});

test('canonicalization is independent of object key insertion order', () => {
  const a = freezeGarmentSpecification({
    intent: { garmentType: 'senator', sleeveStyle: 'short', collarStyle: 'round' },
    id: 'spec-order',
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  const b = freezeGarmentSpecification({
    intent: { collarStyle: 'round', sleeveStyle: 'short', garmentType: 'senator' },
    id: 'spec-order',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const evalA = evaluateComposition({ specificationVersion: a });
  const evalB = evaluateComposition({ specificationVersion: b });
  assert.equal(evalA.fingerprint.value, evalB.fingerprint.value);
  assert.deepEqual(
    canonicalizeGarmentComposition(evalA.composition),
    canonicalizeGarmentComposition(evalB.composition)
  );
});

test('twenty evaluations of the same specification yield one fingerprint', () => {
  const spec = frozenSpec({ garmentType: 'kaftan', collarStyle: 'round' }, 'spec-repeat');
  const fingerprints = new Set<string>();
  const jsons = new Set<string>();
  for (let i = 0; i < 20; i += 1) {
    const evaluated = evaluateComposition({ specificationVersion: spec });
    fingerprints.add(evaluated.fingerprint.value);
    jsons.add(JSON.stringify(canonicalizeGarmentComposition(evaluated.composition)));
    assert.deepEqual(
      evaluated.composition.components.map((item) => item.id),
      evaluateComposition({ specificationVersion: spec }).composition.components.map((item) => item.id)
    );
  }
  assert.equal(fingerprints.size, 1);
  assert.equal(jsons.size, 1);
});

test('createdAt is not part of composition identity', () => {
  const spec = frozenSpec({ garmentType: 'skirt' }, 'spec-skirt');
  const first = freezeComposition({
    specificationVersion: spec,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const second = freezeComposition({
    specificationVersion: spec,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  assert.equal(first.fingerprint.value, second.fingerprint.value);
  assert.notEqual(first.createdAt, second.createdAt);
});

test('live mutation does not change a frozen composition version', () => {
  const spec = frozenSpec({ garmentType: 'trouser' }, 'spec-trouser');
  const frozen = freezeComposition({ specificationVersion: spec });
  assert.equal(frozen.frozen, true);
  assert.equal(frozen.kind, 'GarmentCompositionVersion');
  const liveEval = evaluateComposition({
    specificationVersion: frozenSpec({ garmentType: 'shirt' }, 'spec-other'),
  });
  assert.equal(historicalCompositionIntact(frozen, frozen.composition), true);
  assert.equal(historicalCompositionIntact(frozen, liveEval.composition), false);
  assert.throws(() => refuseFrozenCompositionMutation(frozen, { completeness: 'complete' }), /cannot be patched/);
});

test('validateComposition refuses complete without canonical rules', () => {
  const spec = frozenSpec({ garmentType: 'bodice' }, 'spec-bodice');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  validateComposition(evaluated.composition);
  assert.throws(
    () =>
      validateComposition({
        ...evaluated.composition,
        completeness: 'complete',
      }),
    /cannot be complete/
  );
});

test('unfrozen specification is refused', () => {
  const live = {
    kind: 'GarmentSpecificationVersion',
    frozen: false,
    id: 'not-frozen',
    schemaVersion: 1,
    specification: freezeGarmentSpecification({ intent: { garmentType: 'dress' } }).specification,
    fingerprint: { algorithm: 'fnv1a-64' as const, value: 'x', cryptographic: false as const },
    provenance: { source: 'manual' as const, extractionPath: 'manual' as const, authorityLevel: 'live' as const },
    createdAt: '2026-08-31T00:00:00.000Z',
  };
  assert.throws(
    () => evaluateComposition({ specificationVersion: live as never }),
    /not frozen/
  );
});

test('T2 garment repository create-only composition freeze', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const garment = new EntityRepository(store, 'garment');
  const spec = frozenSpec({ garmentType: 'agbada', sleeveStyle: 'long' }, 'spec-persist');
  const { version, record } = await freezeGovernedComposition(garment, {
    specificationVersion: spec,
  });
  assert.equal(version.composition.garmentType, 'agbada');
  assert.equal(version.specificationVersionId, spec.id);
  const loaded = await garment.get(record.metadata.localId);
  assert.equal((loaded?.payload as { kind: string }).kind, 'GarmentCompositionVersion');
  await persistGarmentCompositionVersion(garment, {
    specificationVersion: frozenSpec({ garmentType: 'skirt' }, 'spec-persist-2'),
  });
  assert.equal((await garment.listActive()).length, 2);
  assert.equal(typeof localStorage, 'undefined');
});

test('application evaluate requires frozen specification', () => {
  const spec = frozenSpec({ garmentType: 'blouse' }, 'spec-app');
  const evaluated = evaluateGovernedComposition(spec);
  assert.equal(evaluated.composition.sourceSpecificationVersionId, spec.id);
  assert.equal(evaluated.completeness, 'partial');
});

test('gown engine projection remains metadata while composition stays partial', () => {
  const spec = frozenSpec({ garmentType: 'gown' }, 'spec-gown-sep');
  const evaluated = evaluateComposition({ specificationVersion: spec });
  assert.equal(legacyPatternKindCompatibility('gown').patternKind, 'bodice');
  assert.equal(evaluated.composition.patternProjection?.patternKind, 'bodice');
  assert.notDeepEqual(
    evaluated.composition.components.map((item) => item.componentType),
    ['BODICE']
  );
  assert.equal(evaluated.completeness, 'partial');
});
