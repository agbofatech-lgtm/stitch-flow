/**
 * T7 Production adapter. EXTRACT — DO NOT REWRITE productionAssistant.ts.
 * Same function signatures Design Studio already calls.
 */

import {
  analyzeDesignInspiration,
  generateProductionPlan,
  inferGarmentTypeFromInspiration,
  type GenerateProductionPlanInput,
} from '../../modules/services/productionAssistant';
import type { ProductionPlan } from '../../shared/types';

export {
  analyzeDesignInspiration,
  generateProductionPlan,
  inferGarmentTypeFromInspiration,
};
export type { GenerateProductionPlanInput };

export function generateStudioProductionPlan(input: GenerateProductionPlanInput): ProductionPlan {
  return generateProductionPlan(input);
}
