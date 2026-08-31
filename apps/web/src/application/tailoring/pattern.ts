/**
 * T9 pattern contract. Delegates to T7 adapter → protected patternEngine.
 * Does not rewrite formulas.
 */

import {
  generateStudioPattern,
  generateStylePattern,
  PatternValidationError,
  type StylePatternKind,
  type StylePatternResult,
} from '../design/patternAdapter';
import { convertFieldMap, ENGINE_LENGTH_UNIT, type LengthUnit } from './units';
import { patternProvenance, type TailoringProvenance } from './provenance';

export { generateStylePattern, generateStudioPattern, PatternValidationError };
export type { StylePatternKind, StylePatternResult };

export type PatternContractInput = {
  kind: StylePatternKind;
  measurements: Record<string, number | undefined>;
  declaredUnit?: LengthUnit;
  measurementVersionId?: string | null;
};

export type PatternContractResult = {
  result: StylePatternResult;
  provenance: TailoringProvenance;
};

function toEngineMeasurements(
  measurements: Record<string, number | undefined>,
  declaredUnit: LengthUnit
): Record<string, number | undefined> {
  if (declaredUnit === ENGINE_LENGTH_UNIT) return measurements;
  const numeric: Record<string, number> = {};
  for (const [key, value] of Object.entries(measurements)) {
    if (typeof value === 'number') numeric[key] = value;
  }
  return convertFieldMap(numeric, declaredUnit, ENGINE_LENGTH_UNIT);
}

export function runPatternContract(input: PatternContractInput): PatternContractResult {
  const declaredUnit = input.declaredUnit || ENGINE_LENGTH_UNIT;
  const measurements = toEngineMeasurements(input.measurements, declaredUnit);
  const result = generateStudioPattern(input.kind, measurements);
  return {
    result,
    provenance: patternProvenance({
      measurementVersionId: input.measurementVersionId,
    }),
  };
}
