/**
 * Phase 14 canonicalization. Reuses T10 omit-absent + sorted keys.
 * Timestamps are excluded from identity. Does not fill defaults.
 */

import {
  canonicalize,
  canonicalJson,
  omitAbsent,
} from '../tailoring/deterministic/canonicalize';
import { fingerprintCanonicalPayload, FINGERPRINT_ALGORITHM } from '../tailoring/deterministic/fingerprint';
import type { CanonicalGarmentSpecification } from './contract';

export const GARMENT_SPEC_FINGERPRINT_ALGORITHM = FINGERPRINT_ALGORITHM;

/** Identity payload: semantic specification without clock metadata. */
export function garmentSpecificationIdentityPayload(
  spec: CanonicalGarmentSpecification
): Record<string, unknown> {
  return omitAbsent({ ...spec }) as Record<string, unknown>;
}

export function canonicalizeGarmentSpecification(
  spec: CanonicalGarmentSpecification
): Record<string, unknown> {
  return canonicalize(garmentSpecificationIdentityPayload(spec)) as Record<string, unknown>;
}

export function garmentSpecificationCanonicalJson(spec: CanonicalGarmentSpecification): string {
  return canonicalJson(garmentSpecificationIdentityPayload(spec));
}

export function fingerprintGarmentSpecification(spec: CanonicalGarmentSpecification): {
  algorithm: typeof FINGERPRINT_ALGORITHM;
  value: string;
  cryptographic: false;
} {
  return {
    algorithm: FINGERPRINT_ALGORITHM,
    value: fingerprintCanonicalPayload(garmentSpecificationIdentityPayload(spec)),
    cryptographic: false,
  };
}
