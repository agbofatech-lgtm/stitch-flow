/**
 * T9 production contract. Delegates to T7 adapter → protected productionAssistant.
 * Measurement inputs remain centimetres. Fabric outputs remain MaterialUnit (default yards).
 * Do not convert body length into fabric quantity.
 */

import {
  analyzeDesignInspiration,
  generateProductionPlan,
  generateStudioProductionPlan,
  inferGarmentTypeFromInspiration,
  type GenerateProductionPlanInput,
} from '../design/productionAdapter';
import type { InspirationAnalysis, ProductionPlan } from '../../shared/types';
import { DEFAULT_FABRIC_QUANTITY_UNIT, ENGINE_LENGTH_UNIT } from './units';
import {
  inspirationProvenance,
  productionPlanProvenance,
  type TailoringProvenance,
} from './provenance';
import { governedProductionFromLoose } from './governedAdapter';

export {
  analyzeDesignInspiration,
  generateProductionPlan,
  generateStudioProductionPlan,
  inferGarmentTypeFromInspiration,
};
export type { GenerateProductionPlanInput };

export type ProductionContractInput = GenerateProductionPlanInput & {
  measurementVersionId?: string | null;
  measurementInputUnit?: typeof ENGINE_LENGTH_UNIT;
};

export type ProductionContractResult = {
  plan: ProductionPlan;
  provenance: TailoringProvenance;
};

export function runProductionContract(input: ProductionContractInput): ProductionContractResult {
  if (input.measurementInputUnit && input.measurementInputUnit !== ENGINE_LENGTH_UNIT) {
    throw new Error('STOP: production contract measurement inputs must be centimetres');
  }
  const plan = generateStudioProductionPlan(input);
  const generatedAt =
    plan.generatedAt instanceof Date ? plan.generatedAt.toISOString() : undefined;
  return {
    plan,
    provenance: productionPlanProvenance({
      fabricOutputUnit: plan.fabricEstimate?.unit || DEFAULT_FABRIC_QUANTITY_UNIT,
      measurementVersionId: input.measurementVersionId,
      generatedAt,
    }),
  };
}

export function runInspirationAnalysis(
  ...args: Parameters<typeof analyzeDesignInspiration>
): { analysis: InspirationAnalysis; provenance: TailoringProvenance } {
  return {
    analysis: analyzeDesignInspiration(...args),
    provenance: inspirationProvenance(),
  };
}
