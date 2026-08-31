/**
 * T10.3 application adapter. Maps loose caller objects onto governed T10 requests.
 * Does not rewrite Design Studio. Does not change engine formulas.
 */

import {
  assertGovernedLengthUnit,
  assertGovernedPatternKind,
  assertProductionMeasurementUnit,
  governedMeasurementsFromUnknown,
  rejectFabricQuantityOnBodyInput,
} from '../../domain/tailoring/deterministic/inputAuthority';
import {
  executeDeterministicPattern,
  executeDeterministicProductionPlan,
  type DeterministicComputationResult,
} from '../../domain/tailoring/deterministic';
import type { StylePatternKind, StylePatternResult } from '../design/patternAdapter';
import type { GenerateProductionPlanInput } from '../design/productionAdapter';
import type { ProductionPlan } from '../../shared/types';

export function governedPatternFromLoose(input: {
  kind: string;
  measurements: unknown;
  declaredUnit?: string;
  measurementVersionId?: string | null;
}): DeterministicComputationResult<StylePatternResult> {
  assertGovernedPatternKind(input.kind);
  rejectFabricQuantityOnBodyInput('body-length');
  const declaredUnit = assertGovernedLengthUnit(input.declaredUnit);
  const measurements = governedMeasurementsFromUnknown(input.measurements);
  return executeDeterministicPattern({
    computationType: 'pattern-geometry',
    kind: input.kind as StylePatternKind,
    measurements,
    declaredUnit,
    measurementVersionId: input.measurementVersionId,
  });
}

export function governedProductionFromLoose(
  input: GenerateProductionPlanInput & {
    declaredUnit?: string;
    measurementVersionId?: string | null;
  }
): DeterministicComputationResult<ProductionPlan> {
  assertProductionMeasurementUnit(input.declaredUnit);
  const measurements = input.measurements
    ? governedMeasurementsFromUnknown(input.measurements)
    : undefined;
  return executeDeterministicProductionPlan({
    computationType: 'production-plan',
    garmentType: input.garmentType,
    measurements,
    inspiration: input.inspiration,
    analysis: input.analysis,
    selectedFabric: input.selectedFabric,
    declaredUnit: input.declaredUnit === 'cm' || !input.declaredUnit ? 'cm' : undefined,
    measurementVersionId: input.measurementVersionId,
  });
}
