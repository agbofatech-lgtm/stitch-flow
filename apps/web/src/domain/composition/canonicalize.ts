/**
 * Phase 15 canonicalization. Reuses T10 omit-absent + sorted keys.
 * Timestamps and random version ids are excluded from identity.
 */

import {
  canonicalize,
  canonicalJson,
  omitAbsent,
} from '../tailoring/deterministic/canonicalize';
import { fingerprintCanonicalPayload, FINGERPRINT_ALGORITHM } from '../tailoring/deterministic/fingerprint';
import type { CanonicalGarmentComposition, CompositionComponent, CompositionRelationship } from './contract';
import { orderClassIndex } from './taxonomy';

export const COMPOSITION_FINGERPRINT_ALGORITHM = FINGERPRINT_ALGORITHM;

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortCompositionComponents(components: CompositionComponent[]): CompositionComponent[] {
  return [...components].sort((a, b) => {
    const classDelta = orderClassIndex(a.orderClass) - orderClassIndex(b.orderClass);
    if (classDelta !== 0) return classDelta;
    const typeDelta = compareStrings(a.componentType, b.componentType);
    if (typeDelta !== 0) return typeDelta;
    const roleDelta = compareStrings(a.role, b.role);
    if (roleDelta !== 0) return roleDelta;
    return compareStrings(a.id, b.id);
  });
}

export function sortCompositionRelationships(
  relationships: CompositionRelationship[]
): CompositionRelationship[] {
  return [...relationships].sort((a, b) => {
    const typeDelta = compareStrings(a.type, b.type);
    if (typeDelta !== 0) return typeDelta;
    const fromDelta = compareStrings(a.fromComponentId, b.fromComponentId);
    if (fromDelta !== 0) return fromDelta;
    const toDelta = compareStrings(a.toComponentId, b.toComponentId);
    if (toDelta !== 0) return toDelta;
    return compareStrings(a.id, b.id);
  });
}

export function compositionIdentityPayload(
  composition: CanonicalGarmentComposition
): Record<string, unknown> {
  const ordered: CanonicalGarmentComposition = {
    ...composition,
    components: sortCompositionComponents(composition.components),
    relationships: sortCompositionRelationships(composition.relationships),
    evidence: [...composition.evidence].sort((a, b) => compareStrings(a.id, b.id)),
    unknownAreas: [...composition.unknownAreas].sort(compareStrings),
  };
  return omitAbsent({ ...ordered }) as Record<string, unknown>;
}

export function canonicalizeGarmentComposition(
  composition: CanonicalGarmentComposition
): Record<string, unknown> {
  return canonicalize(compositionIdentityPayload(composition)) as Record<string, unknown>;
}

export function garmentCompositionCanonicalJson(composition: CanonicalGarmentComposition): string {
  return canonicalJson(compositionIdentityPayload(composition));
}

export function fingerprintGarmentComposition(composition: CanonicalGarmentComposition): {
  algorithm: typeof FINGERPRINT_ALGORITHM;
  value: string;
  cryptographic: false;
} {
  return {
    algorithm: FINGERPRINT_ALGORITHM,
    value: fingerprintCanonicalPayload(compositionIdentityPayload(composition)),
    cryptographic: false,
  };
}
