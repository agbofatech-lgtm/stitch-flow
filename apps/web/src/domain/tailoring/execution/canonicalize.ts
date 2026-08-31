/**
 * Phase 16 execution identity. Reuses T10 canonicalize / fnv1a-64.
 * Timestamps and random snapshot ids are excluded.
 */

import { canonicalize, omitAbsent } from '../deterministic/canonicalize';
import { fingerprintCanonicalPayload, FINGERPRINT_ALGORITHM } from '../deterministic/fingerprint';
import type { CanonicalExecutionIdentity } from './contract';

export function executionIdentityPayload(identity: CanonicalExecutionIdentity): Record<string, unknown> {
  return omitAbsent({ ...identity }) as Record<string, unknown>;
}

export function fingerprintExecutionIdentity(identity: CanonicalExecutionIdentity): {
  algorithm: typeof FINGERPRINT_ALGORITHM;
  value: string;
  cryptographic: false;
} {
  return {
    algorithm: FINGERPRINT_ALGORITHM,
    value: fingerprintCanonicalPayload(canonicalize(executionIdentityPayload(identity))),
    cryptographic: false,
  };
}

export function fingerprintMeasurementFields(fields: Record<string, number>): string {
  return fingerprintCanonicalPayload(canonicalize({ ...fields }));
}
