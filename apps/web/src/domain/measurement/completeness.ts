/**
 * Phase 13 completeness. Required keys are T3 PATTERN_INPUT_FIELDS — not invented.
 * Missing keys are reported. Engine defaults are not applied here (T10 C3).
 */

import { PATTERN_INPUT_FIELDS, type PatternKind } from './fields';
import { projectPatternMeasurements, type SeparatedMeasurements } from './separate';

export type CompletenessReport = {
  kind: PatternKind;
  required: readonly string[];
  present: string[];
  missing: string[];
  complete: boolean;
  filledByEngineDefaults: false;
};

export function assessPatternInputCompleteness(
  separated: SeparatedMeasurements,
  kind: PatternKind
): CompletenessReport {
  const projection = projectPatternMeasurements(separated, kind);
  const required = PATTERN_INPUT_FIELDS[kind];
  const present: string[] = [];
  const missing: string[] = [];
  for (const key of required) {
    if (typeof projection.fields[key] === 'number' && Number.isFinite(projection.fields[key])) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }
  return {
    kind,
    required,
    present,
    missing,
    complete: missing.length === 0,
    filledByEngineDefaults: false,
  };
}

export function assertPatternInputComplete(report: CompletenessReport): void {
  if (!report.complete) {
    throw new Error(
      `STOP: pattern input incomplete for ${report.kind} (missing ${report.missing.join(',')}). Do not apply engine defaults.`
    );
  }
  if (report.filledByEngineDefaults) {
    throw new Error('STOP: completeness must not apply engine defaults');
  }
}
