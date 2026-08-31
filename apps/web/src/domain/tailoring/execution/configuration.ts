/**
 * Phase 16 execution configuration boundary.
 * Reuses T10 registry. Does not pick a hip winner. Does not apply engine defaults.
 */

import { CONFIGURATION_IDENTITY } from '../deterministic/versioning';
import { hipConflictUnresolved, CONFIGURATION_AUTHORITY_REGISTRY } from '../deterministic/configuration';
import { fingerprintCanonicalPayload, FINGERPRINT_ALGORITHM } from '../deterministic/fingerprint';
import { canonicalize } from '../deterministic/canonicalize';
import type { ExecutionConfigurationReference } from './contract';

export const EXECUTION_CONFIGURATION_REGISTRY_VERSION = 't10-configuration-authority' as const;

export function executionConfigurationReference(): ExecutionConfigurationReference {
  if (!hipConflictUnresolved()) {
    throw new Error('STOP: hip 98/100/102 conflict must remain unresolved');
  }
  const payload = canonicalize({
    identity: CONFIGURATION_IDENTITY,
    registryVersion: EXECUTION_CONFIGURATION_REGISTRY_VERSION,
    hipConflictUnresolved: true,
    registry: CONFIGURATION_AUTHORITY_REGISTRY.map((row) => ({
      field: row.field,
      path: row.path,
      value: row.value,
      classification: row.classification,
      appliedByCore: row.appliedByCore,
    })),
  });
  return {
    identity: CONFIGURATION_IDENTITY,
    registryVersion: EXECUTION_CONFIGURATION_REGISTRY_VERSION,
    hipConflictUnresolved: true,
    fingerprint: {
      algorithm: FINGERPRINT_ALGORITHM,
      value: fingerprintCanonicalPayload(payload),
    },
  };
}
