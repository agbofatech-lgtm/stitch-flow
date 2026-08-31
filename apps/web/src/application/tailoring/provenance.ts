/**
 * T9 tailoring-output provenance. Metadata wrapper — does not alter engine payloads.
 */

export type TailoringSourceEngine = 'patternEngine' | 'productionAssistant';

export type TailoringCalculationKind =
  | 'pattern-geometry'
  | 'production-plan'
  | 'inspiration-analysis'
  | 'garment-type-inference';

export type TailoringClassification = 'deterministic' | 'heuristic';

export type TailoringProvenance = {
  sourceEngine: TailoringSourceEngine;
  calculationKind: TailoringCalculationKind;
  classification: TailoringClassification;
  measurementInputUnit: 'cm';
  fabricOutputUnit?: 'yards' | 'meters' | 'pieces';
  measurementVersionId?: string | null;
  generatedAt?: string;
};

export function patternProvenance(input?: {
  measurementVersionId?: string | null;
  generatedAt?: string;
}): TailoringProvenance {
  return {
    sourceEngine: 'patternEngine',
    calculationKind: 'pattern-geometry',
    classification: 'deterministic',
    measurementInputUnit: 'cm',
    measurementVersionId: input?.measurementVersionId ?? null,
    generatedAt: input?.generatedAt,
  };
}

export function productionPlanProvenance(input?: {
  fabricOutputUnit?: TailoringProvenance['fabricOutputUnit'];
  measurementVersionId?: string | null;
  generatedAt?: string;
}): TailoringProvenance {
  return {
    sourceEngine: 'productionAssistant',
    calculationKind: 'production-plan',
    classification: 'heuristic',
    measurementInputUnit: 'cm',
    fabricOutputUnit: input?.fabricOutputUnit,
    measurementVersionId: input?.measurementVersionId ?? null,
    generatedAt: input?.generatedAt,
  };
}

export function inspirationProvenance(): TailoringProvenance {
  return {
    sourceEngine: 'productionAssistant',
    calculationKind: 'inspiration-analysis',
    classification: 'heuristic',
    measurementInputUnit: 'cm',
  };
}
