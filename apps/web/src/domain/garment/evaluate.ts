/**
 * Phase 14 specification evaluation.
 * INPUT → ANALYSIS. Does not mutate input. Does not fill defaults.
 */

import {
  buildCanonicalGarmentSpecification,
  type CanonicalGarmentSpecification,
  type GarmentIntentInput,
} from './contract';
import {
  createGarmentProvenance,
  type GarmentSpecificationProvenance,
  type GarmentSpecificationSource,
} from './provenance';

export type GarmentSpecificationCompleteness =
  | 'complete'
  | 'incomplete'
  | 'unknown'
  | 'not_applicable';

export type StructuralValidationStatus = 'valid' | 'invalid';

export type GarmentSpecificationEvaluation = {
  canonical: CanonicalGarmentSpecification;
  completeness: GarmentSpecificationCompleteness;
  identificationRequired: 'garmentType';
  missingRequired: string[];
  optionalAbsent: string[];
  unknownFields: string[];
  unsupportedConcepts: string[];
  validation: StructuralValidationStatus;
  provenance: GarmentSpecificationProvenance;
};

const OPTIONAL_KEYS = [
  'fitType',
  'sleeveStyle',
  'collarStyle',
  'neckline',
  'lengthType',
  'pocketStyle',
  'fabricType',
  'designCategory',
  'notes',
] as const;

export function assessGarmentSpecificationCompleteness(
  canonical: CanonicalGarmentSpecification
): {
  completeness: GarmentSpecificationCompleteness;
  missingRequired: string[];
} {
  if (canonical.garmentTypeStatus === 'absent') {
    return { completeness: 'incomplete', missingRequired: ['garmentType'] };
  }
  if (canonical.garmentTypeStatus === 'unknown') {
    return { completeness: 'unknown', missingRequired: [] };
  }
  return { completeness: 'complete', missingRequired: [] };
}

export function evaluateGarmentSpecification(
  input: GarmentIntentInput,
  meta?: {
    source?: GarmentSpecificationSource;
    extractionPath?: GarmentSpecificationProvenance['extractionPath'];
  }
): GarmentSpecificationEvaluation {
  const canonical = buildCanonicalGarmentSpecification(input);
  const { completeness, missingRequired } = assessGarmentSpecificationCompleteness(canonical);

  const optionalAbsent: string[] = [];
  for (const key of OPTIONAL_KEYS) {
    if (key === 'fitType') {
      if (canonical.fitTypeStatus === 'absent') optionalAbsent.push(key);
      continue;
    }
    if (canonical[key] === undefined) optionalAbsent.push(key);
  }

  const unknownFields: string[] = [];
  if (canonical.garmentTypeStatus === 'unknown') unknownFields.push('garmentType');
  if (canonical.fitTypeStatus === 'unknown') unknownFields.push('fitType');

  const unsupportedConcepts: string[] = [];
  if (canonical.garmentTypeStatus === 'unknown' && canonical.rawGarmentType) {
    unsupportedConcepts.push(`garmentType:${canonical.rawGarmentType}`);
  }
  if (canonical.fitTypeStatus === 'unknown' && canonical.rawFitType) {
    unsupportedConcepts.push(`fitType:${canonical.rawFitType}`);
  }

  const provenance = createGarmentProvenance({
    source: meta?.source || 'manual',
    extractionPath: meta?.extractionPath || 'manual',
    authorityLevel: 'governed',
  });

  return {
    canonical,
    completeness,
    identificationRequired: 'garmentType',
    missingRequired,
    optionalAbsent,
    unknownFields,
    unsupportedConcepts,
    validation: 'valid',
    provenance,
  };
}
