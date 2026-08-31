/**
 * Pattern domain gateway. EXTRACT — DO NOT REWRITE the protected engine.
 * All geometry is delegated to patternEngine.ts.
 */

import {
  generateStylePattern,
  PatternValidationError,
  type StylePatternKind,
  type StylePatternResult,
} from '../../modules/services/patternEngine';
import { requireOwner } from '../ownership';
import {
  projectPatternMeasurements,
  separateLegacyMeasurementBlob,
  type SeparatedMeasurements,
} from '../measurement/separate';
import type { PatternKind } from '../measurement/fields';

requireOwner('pattern-draft-generation');

export type PatternRequest = {
  kind: StylePatternKind;
  measurements: Record<string, unknown>;
};

export type PatternOutput = {
  kind: StylePatternKind;
  result: StylePatternResult;
};

/**
 * FACT from Protected Asset Registry: Design Studio maps extra garment types
 * onto implemented engine kinds. Extracted here so Studio is not rewritten.
 */
export function mapGarmentTypeToPatternKind(garmentType: string): PatternKind {
  switch (garmentType) {
    case 'shirt':
    case 'senator':
      return 'shirt';
    case 'trouser':
      return 'trouser';
    case 'skirt':
      return 'skirt';
    case 'kaftan':
    case 'agbada':
      return 'kaftan';
    case 'dress':
    case 'gown':
    case 'blouse':
    case 'custom':
    case 'bodice':
      return 'bodice';
    default:
      return 'bodice';
  }
}

export function requestPattern(request: PatternRequest): PatternOutput {
  const separated = separateLegacyMeasurementBlob(request.measurements, request.kind);
  const engineInput = {
    ...separated.body.fields,
    ...separated.garment.fields,
  };
  const result = generateStylePattern(request.kind, engineInput);
  return { kind: request.kind, result };
}

export function requestPatternFromSeparated(
  kind: PatternKind,
  separated: SeparatedMeasurements
): PatternOutput {
  const projection = projectPatternMeasurements(separated, kind);
  const result = generateStylePattern(kind, {
    ...separated.body.fields,
    ...separated.garment.fields,
    ...projection.fields,
  });
  return { kind, result };
}

export { PatternValidationError, generateStylePattern };
