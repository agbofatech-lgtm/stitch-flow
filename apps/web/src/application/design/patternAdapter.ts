/**
 * T7 Pattern adapter. EXTRACT — DO NOT REWRITE patternEngine.ts.
 * Invokes the protected engine with the same signature Design Studio uses today.
 * T3 `requestPattern` remains the workflow gateway (extra measurement separation).
 */

import {
  generateStylePattern,
  PatternValidationError,
  type StylePatternKind,
  type StylePatternResult,
} from '../../modules/services/patternEngine';

export type { StylePatternKind, StylePatternResult };
export { generateStylePattern, PatternValidationError };

export function generateStudioPattern(
  kind: StylePatternKind,
  measurements: Parameters<typeof generateStylePattern>[1]
): StylePatternResult {
  return generateStylePattern(kind, measurements);
}
