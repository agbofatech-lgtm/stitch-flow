/**
 * Phase 13 validation vs plausibility.
 * Validation = known field + finite number (T8).
 * Plausibility vs engine ranges is observed from the protected engine — ranges are not copied.
 */

import { PatternValidationError, requestPattern } from '../pattern/gateway';
import { validateMeasurementValue } from './contract';
import type { PatternKind } from './fields';
import { assessPatternInputCompleteness } from './completeness';
import type { SeparatedMeasurements } from './separate';
import { flattenSeparated } from './separate';

export type ValidationReport = {
  status: 'pass' | 'fail';
  errors: string[];
};

export type PlausibilityReport = {
  status: 'not-assessed' | 'incomplete' | 'engine-accepted' | 'engine-rejected';
  authority: 'none' | 'pattern-engine-observation';
  engineMessage?: string;
};

export function assessStructuralValidation(fields: Record<string, unknown>): ValidationReport {
  const errors: string[] = [];
  for (const [key, raw] of Object.entries(fields)) {
    if (key === 'notes') continue;
    if (typeof raw !== 'number') continue;
    try {
      validateMeasurementValue(key, raw);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return { status: errors.length === 0 ? 'pass' : 'fail', errors };
}

/**
 * Observe engine range/required behaviour without copying MEASUREMENT_RANGES.
 * Incomplete sets are not sent — that would trigger engine defaults (STOP-P13-D).
 */
export function observeEnginePlausibility(
  separated: SeparatedMeasurements,
  kind: PatternKind
): PlausibilityReport {
  const completeness = assessPatternInputCompleteness(separated, kind);
  if (!completeness.complete) {
    return { status: 'incomplete', authority: 'none' };
  }
  const blob = flattenSeparated(separated);
  try {
    requestPattern({ kind, measurements: blob });
    return { status: 'engine-accepted', authority: 'pattern-engine-observation' };
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return {
        status: 'engine-rejected',
        authority: 'pattern-engine-observation',
        engineMessage: err.message,
      };
    }
    throw err;
  }
}
