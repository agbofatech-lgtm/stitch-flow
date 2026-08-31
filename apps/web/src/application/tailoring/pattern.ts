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
import { type LengthUnit } from './units';
import { patternProvenance, type TailoringProvenance } from './provenance';
import { governedPatternFromLoose } from './governedAdapter';

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

export function runPatternContract(input: PatternContractInput): PatternContractResult {
  const executed = governedPatternFromLoose({
    kind: input.kind,
    measurements: input.measurements,
    declaredUnit: input.declaredUnit,
    measurementVersionId: input.measurementVersionId,
  });
  return {
    result: executed.result,
    provenance: patternProvenance({
      measurementVersionId: input.measurementVersionId,
    }),
  };
}
