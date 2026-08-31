/**
 * Phase 16 trusted execution pipeline.
 * Consumes frozen P13/P14/P15 versions. Wraps T10. Does not rewrite engines.
 * Does not fill hip/bust defaults. Does not coerce unknown types to bodice.
 */

import { assertVersionFrozen, type MeasurementVersionRecord } from '../../measurement/version';
import { engineInputFromVersion } from '../../measurement/contract';
import {
  assertGarmentSpecificationFrozen,
  type GarmentSpecificationVersionRecord,
} from '../../garment/version';
import {
  assertCompositionFrozen,
  type GarmentCompositionVersionRecord,
} from '../../composition/version';
import { fingerprintGarmentSpecification } from '../../garment/canonicalize';
import { fingerprintGarmentComposition } from '../../composition/canonicalize';
import {
  executeDeterministicPattern,
  executeDeterministicProductionPlan,
} from '../deterministic/execute';
import {
  PATTERN_COMPUTATION_VERSION,
  PRODUCTION_COMPUTATION_VERSION,
  PATTERN_ENGINE_SOURCE_IDENTITY,
  PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
} from '../deterministic/versioning';
import { ENGINE_LENGTH_UNIT } from '../deterministic/units';
import type { PatternKind } from '../../measurement/fields';
import { executionConfigurationReference } from './configuration';
import { fingerprintExecutionIdentity, fingerprintMeasurementFields } from './canonicalize';
import { EXECUTION_CONTRACT_VERSION } from './taxonomy';
import type {
  CanonicalExecutionIdentity,
  ClassifiedExecutionOutput,
  ExecutionProvenance,
  TrustedTailoringExecutionResult,
} from './contract';
import { fingerprintCanonicalPayload, FINGERPRINT_ALGORITHM } from '../deterministic/fingerprint';

export type TrustedExecutionInput = {
  measurementVersion: MeasurementVersionRecord;
  specificationVersion: GarmentSpecificationVersionRecord;
  compositionVersion: GarmentCompositionVersionRecord;
};

function assertChain(input: TrustedExecutionInput): void {
  assertVersionFrozen(input.measurementVersion);
  assertGarmentSpecificationFrozen(input.specificationVersion);
  assertCompositionFrozen(input.compositionVersion);
  if (
    input.compositionVersion.specificationVersionId !== input.specificationVersion.id
  ) {
    throw new Error('STOP: composition version does not reference the provided specification version');
  }
}

export function executeTrustedTailoring(
  input: TrustedExecutionInput
): TrustedTailoringExecutionResult {
  assertChain(input);
  const configuration = executionConfigurationReference();
  const spec = input.specificationVersion.specification;
  const composition = input.compositionVersion.composition;
  const measurements = engineInputFromVersion(input.measurementVersion);

  const measurementFingerprint = fingerprintMeasurementFields(measurements);
  const specificationFingerprint = fingerprintGarmentSpecification(spec).value;
  const compositionFingerprint = fingerprintGarmentComposition(composition).value;

  const projection = composition.patternProjection;
  const knownType = spec.garmentTypeStatus === 'known' && spec.garmentType;

  let pattern: ClassifiedExecutionOutput;
  let patternKind: PatternKind | undefined;

  if (!projection || projection.notCompositionIdentity !== true) {
    pattern = {
      classification: 'UNKNOWN',
      fingerprint: { algorithm: FINGERPRINT_ALGORITHM, value: fingerprintCanonicalPayload({ skipped: true }) },
      computationVersion: PATTERN_COMPUTATION_VERSION,
      skipped: true,
      reason: 'COMPOSITION_PROJECTION_ABSENT',
    };
  } else {
    patternKind = projection.patternKind;
    const executed = executeDeterministicPattern({
      computationType: 'pattern-geometry',
      kind: patternKind,
      measurements,
      declaredUnit: ENGINE_LENGTH_UNIT,
      measurementVersionId: input.measurementVersion.id,
    });
    pattern = {
      classification: 'OBSERVED_ENGINE_OUTPUT',
      fingerprint: executed.fingerprint,
      computationVersion: executed.provenance.computationVersion,
      patternKind,
      reason: 'pattern-projection-not-composition-identity',
    };
  }

  let production: ClassifiedExecutionOutput;
  if (!knownType) {
    production = {
      classification: 'UNKNOWN',
      fingerprint: { algorithm: FINGERPRINT_ALGORITHM, value: fingerprintCanonicalPayload({ skipped: true }) },
      computationVersion: PRODUCTION_COMPUTATION_VERSION,
      skipped: true,
      reason: 'GARMENT_TYPE_UNKNOWN',
    };
  } else {
    const executed = executeDeterministicProductionPlan({
      computationType: 'production-plan',
      garmentType: spec.garmentType!,
      measurements,
      declaredUnit: ENGINE_LENGTH_UNIT,
      measurementVersionId: input.measurementVersion.id,
    });
    production = {
      classification: 'HEURISTIC_OUTPUT',
      fingerprint: executed.fingerprint,
      computationVersion: executed.provenance.computationVersion,
    };
  }

  const inputFingerprint = fingerprintCanonicalPayload({
    measurementVersionId: input.measurementVersion.id,
    specificationVersionId: input.specificationVersion.id,
    compositionVersionId: input.compositionVersion.id,
    measurementFingerprint,
    specificationFingerprint,
    compositionFingerprint,
    configurationFingerprint: configuration.fingerprint.value,
    executionContractVersion: EXECUTION_CONTRACT_VERSION,
  });

  const identity: CanonicalExecutionIdentity = {
    executionContractVersion: EXECUTION_CONTRACT_VERSION,
    measurementVersionId: input.measurementVersion.id,
    specificationVersionId: input.specificationVersion.id,
    compositionVersionId: input.compositionVersion.id,
    configurationIdentity: configuration.identity,
    configurationFingerprint: configuration.fingerprint.value,
    garmentType: spec.garmentType,
    garmentTypeStatus: spec.garmentTypeStatus,
    measurementFingerprint,
    specificationFingerprint,
    compositionFingerprint,
    inputFingerprint,
    patternOutputFingerprint: pattern.skipped ? null : pattern.fingerprint.value,
    productionOutputFingerprint: production.skipped ? null : production.fingerprint.value,
  };
  if (patternKind) {
    identity.patternProjectionKind = patternKind;
    identity.patternProjectionNotIdentity = true;
  }

  let status: TrustedTailoringExecutionResult['status'] = 'executed';
  if (pattern.skipped && production.skipped) status = 'unknown';
  else if (pattern.skipped || production.skipped) status = 'partial';
  if (composition.completeness === 'unsupported') status = 'unsupported';

  const fingerprint = fingerprintExecutionIdentity(identity);

  return {
    status,
    identity,
    pattern,
    production,
    fingerprint,
    silentDefaulting: 'absent-at-orchestration',
    tailoringAccuracyCertification: 'NOT_CLAIMED',
  };
}

export function executionProvenanceFromResult(
  result: TrustedTailoringExecutionResult
): ExecutionProvenance {
  return {
    executionContractVersion: EXECUTION_CONTRACT_VERSION,
    measurementVersionId: result.identity.measurementVersionId,
    specificationVersionId: result.identity.specificationVersionId,
    compositionVersionId: result.identity.compositionVersionId,
    configurationFingerprint: result.identity.configurationFingerprint,
    patternComputationVersion: PATTERN_COMPUTATION_VERSION,
    productionComputationVersion: PRODUCTION_COMPUTATION_VERSION,
    inputFingerprint: result.identity.inputFingerprint,
    outputFingerprint: result.fingerprint.value,
    patternEngineIdentity: PATTERN_ENGINE_SOURCE_IDENTITY,
    productionAssistantIdentity: PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
  };
}
