/**
 * Phase 17 application service.
 * Read-only. AI failure does not affect TrustedTailoringExecution.
 * No automatic provider fallback.
 */

import type { MeasurementVersionRecord } from '../../domain/measurement/version';
import type { GarmentSpecificationVersionRecord } from '../../domain/garment/version';
import type { GarmentCompositionVersionRecord } from '../../domain/composition/version';
import type { TrustedTailoringExecutionRecord } from '../../domain/tailoring/execution/version';
import { executeTrustedTailoring } from '../../domain/tailoring/execution/execute';
import {
  buildGovernedIntelligenceContext,
  assertNoBlockedKeysInContext,
} from '../../domain/intelligence/context';
import { validateIntelligenceResult } from '../../domain/intelligence/validate';
import { assertIntelligenceReadOnly } from '../../domain/intelligence/refuse';
import type { IntelligenceOperationType } from '../../domain/intelligence/taxonomy';
import type { TailoringIntelligenceResult } from '../../domain/intelligence/contract';
import type { TailoringIntelligenceProvider } from './provider';
import { localGovernedIntelligenceProvider } from './localProvider';
import { unavailableIntelligenceProvider } from './unavailable';

export type IntelligenceRunInput = {
  measurementVersion: MeasurementVersionRecord;
  specificationVersion: GarmentSpecificationVersionRecord;
  compositionVersion: GarmentCompositionVersionRecord;
  execution: TrustedTailoringExecutionRecord;
  operationType: IntelligenceOperationType;
  provider?: TailoringIntelligenceProvider;
};

export async function runTailoringIntelligence(
  input: IntelligenceRunInput
): Promise<TailoringIntelligenceResult> {
  const context = buildGovernedIntelligenceContext(input);
  assertNoBlockedKeysInContext(context);
  const provider = input.provider || localGovernedIntelligenceProvider();
  try {
    const raw = await provider.interpret({ operationType: input.operationType, context });
    const result = validateIntelligenceResult(raw);
    assertIntelligenceReadOnly(result);
    return result;
  } catch (err) {
    if (!provider.available || provider.id === 'unavailable') {
      return unavailableIntelligenceProvider().interpret({
        operationType: input.operationType,
        context,
      });
    }
    const unavailable = await unavailableIntelligenceProvider().interpret({
      operationType: input.operationType,
      context,
    });
    unavailable.limitations = [
      ...unavailable.limitations,
      {
        code: 'PROVIDER_FAILURE',
        statement: err instanceof Error ? err.message : 'provider failed',
      },
    ];
    return unavailable;
  }
}

/**
 * Deterministic core remains independently operational.
 * This helper re-executes trusted tailoring and optionally attaches advisory output.
 * Advisory never writes into the execution record.
 */
export function executeTrustedTailoringIgnoringIntelligence(input: {
  measurementVersion: MeasurementVersionRecord;
  specificationVersion: GarmentSpecificationVersionRecord;
  compositionVersion: GarmentCompositionVersionRecord;
}) {
  return executeTrustedTailoring(input);
}
