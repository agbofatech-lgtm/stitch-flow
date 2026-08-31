/**
 * Phase 15 immutable garment composition version.
 * Independent of MeasurementVersion and GarmentSpecificationVersion.
 * Create-only. No silent freeze.
 */

import type { CanonicalGarmentComposition } from './contract';
import { evaluateComposition, validateComposition } from './evaluate';
import { fingerprintGarmentComposition } from './canonicalize';
import {
  createCompositionProvenance,
  type CompositionProvenance,
} from './provenance';
import type { GarmentSpecificationVersionRecord } from '../garment/version';
import { assertGarmentSpecificationFrozen } from '../garment/version';
import type { ExplicitStructuralSelection } from './contract';
import { COMPOSITION_SCHEMA_VERSION } from './taxonomy';

export type GarmentCompositionVersionRecord = {
  kind: 'GarmentCompositionVersion';
  frozen: true;
  id: string;
  schemaVersion: typeof COMPOSITION_SCHEMA_VERSION;
  specificationVersionId: string;
  composition: CanonicalGarmentComposition;
  fingerprint: {
    algorithm: 'fnv1a-64';
    value: string;
    cryptographic: false;
  };
  provenance: CompositionProvenance;
  createdAt: string;
};

function newVersionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `gcv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function freezeComposition(input: {
  specificationVersion: GarmentSpecificationVersionRecord;
  explicitSelections?: ExplicitStructuralSelection[];
  id?: string;
  createdAt?: string;
}): GarmentCompositionVersionRecord {
  assertGarmentSpecificationFrozen(input.specificationVersion);
  const evaluated = evaluateComposition({
    specificationVersion: input.specificationVersion,
    explicitSelections: input.explicitSelections,
  });
  validateComposition(evaluated.composition);
  const fingerprint = fingerprintGarmentComposition(evaluated.composition);
  const createdAt = input.createdAt || new Date().toISOString();
  const provenance = createCompositionProvenance({
    ...evaluated.provenance,
    authorityLevel: 'frozen',
  });

  return {
    kind: 'GarmentCompositionVersion',
    frozen: true,
    id: input.id || newVersionId(),
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    specificationVersionId: input.specificationVersion.id,
    composition: evaluated.composition,
    fingerprint,
    provenance,
    createdAt,
  };
}

export function assertCompositionFrozen(record: GarmentCompositionVersionRecord): void {
  if (record.kind !== 'GarmentCompositionVersion' || record.frozen !== true) {
    throw new Error('STOP: garment composition version is not frozen');
  }
}

export function refuseFrozenCompositionMutation(
  frozen: GarmentCompositionVersionRecord,
  patch: Record<string, unknown>
): never {
  assertCompositionFrozen(frozen);
  const keys = Object.keys(patch).join(',') || 'empty patch';
  throw new Error(`STOP: frozen garment composition version ${frozen.id} cannot be patched (${keys})`);
}

export function historicalCompositionIntact(
  frozen: GarmentCompositionVersionRecord,
  expected: CanonicalGarmentComposition
): boolean {
  assertCompositionFrozen(frozen);
  return (
    fingerprintGarmentComposition(frozen.composition).value ===
    fingerprintGarmentComposition(expected).value
  );
}
