/**
 * SAC-1 completeness adapter. Uses existing P13–P15 validation law.
 * Does not fill hip/bust defaults. Does not invent fabric width or sleeve configuration.
 */

import { separateLegacyMeasurementBlob } from '../../domain/measurement/separate';
import {
  assessPatternInputCompleteness,
  type CompletenessReport,
} from '../../domain/measurement/completeness';
import { mapGarmentTypeToPatternKind } from '../../domain/pattern/gateway';
import type { PatternKind } from '../../domain/measurement/fields';
import { evaluateGarmentSpecification } from '../../domain/garment/evaluate';
import type { GarmentIntentInput } from '../../domain/garment/contract';

export type TrustedRequirementDomain =
  | 'MEASUREMENTS'
  | 'GARMENT_SPECIFICATION'
  | 'GARMENT_COMPOSITION'
  | 'EXECUTION_REQUIREMENTS';

export type TrustedReadinessIssue = {
  field: string;
  domain: TrustedRequirementDomain;
  reason: string;
  severity: 'blocking' | 'advisory';
};

export type TrustedReadinessResult = {
  ready: boolean;
  missing: TrustedReadinessIssue[];
  warnings: TrustedReadinessIssue[];
  available: string[];
  patternKind: PatternKind;
  garmentTypeStatus: string;
  measurementCompleteness: CompletenessReport;
  filledByEngineDefaults: false;
};

export type TrustedWorkingDesign = {
  measurements: Record<string, unknown>;
  garmentType?: string;
  fitType?: string;
  sleeveStyle?: string;
  collarStyle?: string;
  neckline?: string;
  lengthType?: string;
  pocketStyle?: string;
  fabricType?: string;
  styleNotes?: string;
  customerId?: string | null;
  profileId?: string | null;
  orderId?: string | null;
};

export function intentFromWorkingDesign(design: TrustedWorkingDesign): GarmentIntentInput {
  return {
    garmentType: design.garmentType,
    fitType: design.fitType,
    sleeveStyle: design.sleeveStyle,
    collarStyle: design.collarStyle,
    neckline: design.neckline,
    lengthType: design.lengthType,
    pocketStyle: design.pocketStyle,
    fabricType: design.fabricType,
    styleNotes: design.styleNotes,
    customerId: design.customerId || undefined,
    orderId: design.orderId || undefined,
  };
}

export function assessTrustedReadiness(design: TrustedWorkingDesign): TrustedReadinessResult {
  const patternKind = mapGarmentTypeToPatternKind(design.garmentType || 'bodice');
  const separated = separateLegacyMeasurementBlob(design.measurements, patternKind);
  const measurementCompleteness = assessPatternInputCompleteness(separated, patternKind);
  const specEval = evaluateGarmentSpecification(intentFromWorkingDesign(design), {
    source: 'studio',
    extractionPath: 'studio-adapter',
  });

  const missing: TrustedReadinessIssue[] = [];
  const warnings: TrustedReadinessIssue[] = [];
  const available: string[] = [...measurementCompleteness.present];

  for (const field of measurementCompleteness.missing) {
    missing.push({
      field,
      domain: 'MEASUREMENTS',
      reason: `Required pattern-input field "${field}" is missing for ${measurementCompleteness.kind}. Engine defaults are not applied.`,
      severity: 'blocking',
    });
  }

  if (specEval.completeness === 'incomplete') {
    for (const field of specEval.missingRequired) {
      missing.push({
        field,
        domain: 'GARMENT_SPECIFICATION',
        reason: 'Garment type is required for trusted specification freeze.',
        severity: 'blocking',
      });
    }
  } else if (specEval.completeness === 'unknown') {
    warnings.push({
      field: 'garmentType',
      domain: 'GARMENT_SPECIFICATION',
      reason: 'Garment type is unknown. Trusted execution will not coerce it to bodice. Production plan may be skipped.',
      severity: 'advisory',
    });
  } else {
    available.push('garmentType');
  }

  for (const field of specEval.optionalAbsent) {
    warnings.push({
      field,
      domain: 'GARMENT_SPECIFICATION',
      reason: `Optional specification field "${field}" is absent. Not filled. Not blocking.`,
      severity: 'advisory',
    });
  }

  warnings.push({
    field: 'composition-required-components',
    domain: 'GARMENT_COMPOSITION',
    reason: 'Canonical required-component registry is empty (P15). Composition freeze remains observation-only.',
    severity: 'advisory',
  });

  warnings.push({
    field: 'hip-default-reconciliation',
    domain: 'EXECUTION_REQUIREMENTS',
    reason: 'Hip defaults 98/100/102 remain unresolved (T10 C2). SAC-1 does not reconcile them.',
    severity: 'advisory',
  });

  return {
    ready: missing.length === 0,
    missing,
    warnings,
    available,
    patternKind,
    garmentTypeStatus: specEval.canonical.garmentTypeStatus,
    measurementCompleteness,
    filledByEngineDefaults: false,
  };
}
