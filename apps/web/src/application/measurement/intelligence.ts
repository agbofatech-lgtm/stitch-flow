/**
 * Phase 13 Measurement Intelligence application service.
 * Evaluate → freeze (T8/T2) → T10 governed execute.
 * Does not replace AppContext. Does not apply engine defaults. Does not rewrite Studio.
 */

import { separateLegacyMeasurementBlob } from '../../domain/measurement/separate';
import { classifyMeasurementRecord } from '../../domain/measurement/taxonomy';
import { assessGarmentTypeCompleteness } from '../../domain/measurement/completeness';
import {
  assessStructuralValidation,
  observeEnginePlausibility,
} from '../../domain/measurement/plausibility';
import { flattenSeparated } from '../../domain/measurement/separate';
import { assertNotDerivedCapture } from '../../domain/measurement/derived';
import { mapGarmentTypeToPatternKind } from '../../domain/pattern/gateway';
import type { EntityRepository } from '../../shared/persistence/repository';
import type { LengthUnit } from '../../domain/measurement/units';
import type { MeasurementCaptureSource } from '../../domain/measurement/provenance';
import { freezeLiveBlobToVersion } from './versionAuthority';
import { executeGovernedPatternFromVersion } from './t10Integration';
import type { MeasurementVersionRecord } from '../../domain/measurement/version';

export function evaluateMeasurementIntelligence(input: {
  blob: Record<string, unknown>;
  garmentType: string;
  isLiveProfile?: boolean;
}) {
  assertNotDerivedCapture(input.blob);
  const separated = separateLegacyMeasurementBlob(input.blob);
  const taxonomy = classifyMeasurementRecord({ isLiveProfile: input.isLiveProfile ?? true });
  const completeness = assessGarmentTypeCompleteness(separated, input.garmentType);
  const validation = assessStructuralValidation(flattenSeparated(separated));
  const plausibility = observeEnginePlausibility(separated, completeness.patternKind);
  return {
    taxonomy,
    separated,
    completeness,
    validation,
    plausibility,
    patternKind: completeness.patternKind,
  };
}

export async function freezeEvaluatedVersion(
  repository: EntityRepository,
  input: {
    blob: Record<string, unknown>;
    garmentType: string;
    declaredUnit?: LengthUnit;
    customerId?: string | null;
    profileId?: string | null;
    orderId?: string | null;
    source?: MeasurementCaptureSource;
  }
) {
  const evaluated = evaluateMeasurementIntelligence({
    blob: input.blob,
    garmentType: input.garmentType,
  });
  const frozen = await freezeLiveBlobToVersion(repository, {
    blob: input.blob,
    declaredUnit: input.declaredUnit,
    patternKind: evaluated.patternKind,
    customerId: input.customerId,
    profileId: input.profileId,
    orderId: input.orderId,
    source: input.source || 'profile',
  });
  return { evaluated, ...frozen };
}

export function executeGovernedPatternFromVersionForGarment(
  version: MeasurementVersionRecord,
  garmentType: string
) {
  const kind = mapGarmentTypeToPatternKind(garmentType);
  return executeGovernedPatternFromVersion(version, kind);
}
