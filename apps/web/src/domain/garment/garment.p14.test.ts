import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../../shared/persistence/memoryStore';
import { EntityRepository } from '../../shared/persistence/repository';
import { migrateLocalSchema } from '../../shared/persistence/schema';
import { classifyGarmentType, legacyPatternKindCompatibility } from './taxonomy';
import { buildCanonicalGarmentSpecification } from './contract';
import { evaluateGarmentSpecification } from './evaluate';
import { canonicalizeGarmentSpecification, fingerprintGarmentSpecification } from './canonicalize';
import {
  freezeGarmentSpecification,
  refuseFrozenGarmentSpecificationMutation,
  historicalGarmentSpecificationIntact,
} from './version';
import { persistGarmentSpecificationVersion } from '../persistence/garmentSpecificationVersionStore';
import { extractStudioGarmentIntent, evaluateStudioGarmentIntent, studioDraftsRemainTransitional } from '../../application/garment/studioAdapter';
import { freezeGovernedGarmentSpecification } from '../../application/garment/intelligence';
import { buildGarmentSpecification } from './specification';

test('existing T6 projection is not automatic authority', () => {
  const projection = buildGarmentSpecification({
    order: { id: 'o1', garmentType: 'dress' } as never,
  });
  assert.equal(projection.patternKind, 'bodice');
  assert.notEqual((projection as { kind?: string }).kind, 'GarmentSpecificationVersion');
  const evaluated = evaluateGarmentSpecification({ garmentType: 'dress' });
  assert.equal(evaluated.provenance.authorityLevel, 'governed');
  assert.notEqual(evaluated.canonical, projection as never);
});

test('known classifications remain stable', () => {
  assert.equal(classifyGarmentType('dress').status, 'known');
  assert.equal(classifyGarmentType('dress').known, 'dress');
  assert.equal(classifyGarmentType('agbada').known, 'agbada');
});

test('unknown garment type is explicit and is not P14-mapped to bodice', () => {
  const classified = classifyGarmentType('tuxedo');
  assert.equal(classified.status, 'unknown');
  assert.equal(classified.known, null);
  const evaluated = evaluateGarmentSpecification({ garmentType: 'tuxedo' });
  assert.equal(evaluated.completeness, 'unknown');
  assert.equal(evaluated.canonical.garmentType, null);
  assert.equal(evaluated.canonical.rawGarmentType, 'tuxedo');
  const legacy = legacyPatternKindCompatibility('tuxedo');
  assert.equal(legacy.patternKind, 'bodice');
  assert.equal(legacy.authority, 'legacy-map');
  assert.notEqual(evaluated.canonical.garmentType, 'bodice');
});

test('absent garment type is incomplete, not silently completed', () => {
  const evaluated = evaluateGarmentSpecification({});
  assert.equal(evaluated.completeness, 'incomplete');
  assert.deepEqual(evaluated.missingRequired, ['garmentType']);
  assert.equal(evaluated.canonical.garmentType, null);
});

test('complete identification does not require optional style details', () => {
  const evaluated = evaluateGarmentSpecification({ garmentType: 'shirt' });
  assert.equal(evaluated.completeness, 'complete');
  assert.ok(evaluated.optionalAbsent.includes('sleeveStyle'));
  assert.equal(evaluated.canonical.sleeveStyle, undefined);
});

test('optional detail absence is not filled with UI defaults', () => {
  const spec = buildCanonicalGarmentSpecification({ garmentType: 'dress' });
  assert.equal(spec.fitType, undefined);
  assert.equal(spec.sleeveStyle, undefined);
  assert.equal((spec as { hip?: number }).hip, undefined);
});

test('measurements cannot masquerade as garment specification', () => {
  assert.throws(
    () => buildCanonicalGarmentSpecification({ garmentType: 'skirt', hip: 100 } as never),
    /Phase 13/
  );
  assert.throws(
    () => buildCanonicalGarmentSpecification({ garmentType: 'bodice', quarterBust: 22.5 } as never),
    /derived pattern output/
  );
});

test('UI state cannot enter the specification contract', () => {
  assert.throws(
    () => buildCanonicalGarmentSpecification({ garmentType: 'dress', previewMode: 'front' } as never),
    /UI state/
  );
});

test('invalid structural text is rejected', () => {
  assert.throws(
    () => buildCanonicalGarmentSpecification({ garmentType: 'shirt', sleeveStyle: 12 as never }),
    /text fields must be strings/
  );
});

test('unknown fit type remains unknown', () => {
  const evaluated = evaluateGarmentSpecification({ garmentType: 'shirt', fitType: 'athletic' });
  assert.equal(evaluated.completeness, 'complete');
  assert.ok(evaluated.unknownFields.includes('fitType'));
  assert.equal(evaluated.canonical.fitType, undefined);
  assert.equal(evaluated.canonical.rawFitType, 'athletic');
});

test('studio adapter ignores measurements and UI chrome', () => {
  const intent = extractStudioGarmentIntent({
    garmentType: 'gown',
    fitType: 'tailored',
    sleeveStyle: 'Long Sleeve',
    bust: 90,
    hip: 102,
    previewMode: 'front',
    scale: 8,
    activeTab: 'pattern',
  });
  assert.equal(intent.garmentType, 'gown');
  assert.equal(intent.fitType, 'tailored');
  assert.equal((intent as { bust?: number }).bust, undefined);
  assert.equal((intent as { previewMode?: string }).previewMode, undefined);
  const evaluated = evaluateStudioGarmentIntent({
    garmentType: 'gown',
    bust: 90,
    previewMode: 'front',
  });
  assert.equal(evaluated.completeness, 'complete');
  assert.equal(evaluated.canonical.garmentType, 'gown');
  assert.equal(studioDraftsRemainTransitional(), 'stitchflow:design-studio:drafts');
});

test('canonicalization is independent of object key insertion order', () => {
  const a = buildCanonicalGarmentSpecification({
    garmentType: 'senator',
    fitType: 'regular',
    sleeveStyle: 'short',
  });
  const b = buildCanonicalGarmentSpecification({
    sleeveStyle: 'short',
    fitType: 'regular',
    garmentType: 'senator',
  });
  assert.equal(
    fingerprintGarmentSpecification(a).value,
    fingerprintGarmentSpecification(b).value
  );
  assert.deepEqual(canonicalizeGarmentSpecification(a), canonicalizeGarmentSpecification(b));
});

test('twenty evaluations of equivalent intent yield one fingerprint', () => {
  const fingerprints = new Set<string>();
  for (let i = 0; i < 20; i += 1) {
    const spec = buildCanonicalGarmentSpecification({
      garmentType: 'kaftan',
      collarStyle: 'round',
    });
    fingerprints.add(fingerprintGarmentSpecification(spec).value);
  }
  assert.equal(fingerprints.size, 1);
});

test('fingerprint is labelled non-cryptographic fnv1a-64', () => {
  const fp = fingerprintGarmentSpecification(
    buildCanonicalGarmentSpecification({ garmentType: 'blouse' })
  );
  assert.equal(fp.algorithm, 'fnv1a-64');
  assert.equal(fp.cryptographic, false);
});

test('live mutation does not change a frozen version', () => {
  const frozen = freezeGarmentSpecification({
    intent: { garmentType: 'trouser', fitType: 'slim' },
    source: 'manual',
  });
  assert.equal(frozen.frozen, true);
  assert.equal(frozen.kind, 'GarmentSpecificationVersion');
  const live = { garmentType: 'shirt' };
  assert.equal(
    historicalGarmentSpecificationIntact(
      frozen,
      buildCanonicalGarmentSpecification({ garmentType: 'trouser', fitType: 'slim' })
    ),
    true
  );
  assert.equal(
    historicalGarmentSpecificationIntact(frozen, buildCanonicalGarmentSpecification(live)),
    false
  );
  assert.throws(() => refuseFrozenGarmentSpecificationMutation(frozen, live), /cannot be patched/);
});

test('createdAt is not part of specification identity', () => {
  const first = freezeGarmentSpecification({
    intent: { garmentType: 'skirt' },
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const second = freezeGarmentSpecification({
    intent: { garmentType: 'skirt' },
    createdAt: '2026-08-31T00:00:00.000Z',
  });
  assert.equal(first.fingerprint.value, second.fingerprint.value);
  assert.notEqual(first.createdAt, second.createdAt);
});

test('T2 garment repository create-only freeze', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const garment = new EntityRepository(store, 'garment');
  const { version, record } = await freezeGovernedGarmentSpecification(garment, {
    intent: { garmentType: 'agbada', styleNotes: 'ceremonial' },
    source: 'studio',
  });
  assert.equal(version.specification.garmentType, 'agbada');
  const loaded = await garment.get(record.metadata.localId);
  assert.equal((loaded?.payload as { kind: string }).kind, 'GarmentSpecificationVersion');
  await persistGarmentSpecificationVersion(garment, {
    intent: { garmentType: 'bodice' },
  });
  assert.equal((await garment.listActive()).length, 2);
});
