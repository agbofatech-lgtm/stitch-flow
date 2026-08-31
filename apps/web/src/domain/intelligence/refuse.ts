/**
 * Phase 17 mutation refusal.
 * Intelligence must not patch frozen authorities.
 */

import { refuseFrozenMutation, type MeasurementVersionRecord } from '../measurement/version';
import {
  refuseFrozenGarmentSpecificationMutation,
  type GarmentSpecificationVersionRecord,
} from '../garment/version';
import {
  refuseFrozenCompositionMutation,
  type GarmentCompositionVersionRecord,
} from '../composition/version';
import {
  refuseFrozenExecutionMutation,
  type TrustedTailoringExecutionRecord,
} from '../tailoring/execution/version';

export function refuseIntelligenceMutationOfMeasurement(
  frozen: MeasurementVersionRecord,
  patch: Record<string, unknown>
): never {
  return refuseFrozenMutation(frozen, patch);
}

export function refuseIntelligenceMutationOfSpecification(
  frozen: GarmentSpecificationVersionRecord,
  patch: Record<string, unknown>
): never {
  return refuseFrozenGarmentSpecificationMutation(frozen, patch);
}

export function refuseIntelligenceMutationOfComposition(
  frozen: GarmentCompositionVersionRecord,
  patch: Record<string, unknown>
): never {
  return refuseFrozenCompositionMutation(frozen, patch);
}

export function refuseIntelligenceMutationOfExecution(
  frozen: TrustedTailoringExecutionRecord,
  patch: Record<string, unknown>
): never {
  return refuseFrozenExecutionMutation(frozen, patch);
}

export function assertIntelligenceReadOnly(result: { provenance: { mutatedAuthoritativeData: boolean; readOnly: boolean } }): void {
  if (result.provenance.mutatedAuthoritativeData !== false || result.provenance.readOnly !== true) {
    throw new Error('STOP: intelligence result is not read-only');
  }
}
