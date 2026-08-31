/**
 * Production plan gateway. EXTRACT — DO NOT REWRITE productionAssistant.ts.
 */

import {
  analyzeDesignInspiration,
  generateProductionPlan,
  inferGarmentTypeFromInspiration,
  type GenerateProductionPlanInput,
} from '../../modules/services/productionAssistant';
import type { ProductionPlan } from '../../shared/types';
import { requireOwner } from '../ownership';
import { flattenSeparated, separateLegacyMeasurementBlob } from '../measurement/separate';

requireOwner('production-plan-heuristics');

export type ProductionPlanRequest = GenerateProductionPlanInput;

export function requestProductionPlan(input: ProductionPlanRequest): ProductionPlan {
  const measurements = input.measurements
    ? flattenSeparated(
        separateLegacyMeasurementBlob(input.measurements as Record<string, unknown>)
      )
    : input.measurements;

  return generateProductionPlan({
    ...input,
    measurements: (measurements as ProductionPlanRequest['measurements']) || input.measurements,
  });
}

export { analyzeDesignInspiration, inferGarmentTypeFromInspiration, generateProductionPlan };
