/**
 * SAC-1 trusted finalization orchestrator.
 * Explicit action only. Does not rewrite engines or Design Studio canvas generation.
 * Does not silently default missing measurements.
 */

import { freezeMeasurementVersion, type MeasurementVersionRecord } from '../../domain/measurement/version';
import { freezeGarmentSpecification, type GarmentSpecificationVersionRecord } from '../../domain/garment/version';
import { freezeComposition, type GarmentCompositionVersionRecord } from '../../domain/composition/version';
import {
  executeTrustedTailoring,
  type TrustedTailoringExecutionResult,
} from '../../domain/tailoring/execution/execute';
import {
  freezeTrustedTailoringExecution,
  type TrustedTailoringExecutionRecord,
} from '../../domain/tailoring/execution/version';
import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import {
  assessTrustedReadiness,
  intentFromWorkingDesign,
  type TrustedReadinessResult,
  type TrustedWorkingDesign,
} from './trustedReadiness';

export type TrustedFinalizationPhase =
  | 'DRAFT'
  | 'FINALIZATION_REQUESTED'
  | 'VALIDATING'
  | 'INCOMPLETE'
  | 'READY_TO_FREEZE'
  | 'FREEZING'
  | 'TRUSTED_EXECUTION'
  | 'EXECUTED';

export type TrustedTailoringArtifact = {
  kind: 'TrustedTailoringArtifact';
  workingDesignUnchanged: true;
  measurementVersion: MeasurementVersionRecord;
  specificationVersion: GarmentSpecificationVersionRecord;
  compositionVersion: GarmentCompositionVersionRecord;
  execution: TrustedTailoringExecutionRecord;
  result: TrustedTailoringExecutionResult;
  persistence: 't2' | 'session';
  fingerprintAlgorithm: 'fnv1a-64';
  cryptographic: false;
};

export type TrustedFinalizationResult =
  | {
      status: 'INCOMPLETE';
      phase: 'INCOMPLETE';
      readiness: TrustedReadinessResult;
      artifact: null;
      draftPreserved: true;
    }
  | {
      status: 'EXECUTED';
      phase: 'EXECUTED';
      readiness: TrustedReadinessResult;
      artifact: TrustedTailoringArtifact;
      draftPreserved: true;
    };

export type TrustedFinalizationInput = TrustedWorkingDesign & {
  declaredUnit?: 'cm' | 'in';
  persist?: boolean;
  capturedAt?: string;
  measurementVersionId?: string;
  specificationVersionId?: string;
  compositionVersionId?: string;
  executionId?: string;
};

function cloneWorkingMeasurements(source: Record<string, unknown>): Record<string, unknown> {
  return { ...source };
}

async function persistIfPossible(input: {
  persist: boolean;
  measurementVersion: MeasurementVersionRecord;
  specificationVersion: GarmentSpecificationVersionRecord;
  compositionVersion: GarmentCompositionVersionRecord;
  execution: TrustedTailoringExecutionRecord;
}): Promise<'t2' | 'session'> {
  if (!input.persist) return 'session';
  const runtime = getDataAuthorityRuntime();
  if (!runtime) return 'session';
  try {
    await runtime.repositories.measurement.create(
      input.measurementVersion as unknown as Record<string, unknown>
    );
    await runtime.repositories.garment.create(
      input.specificationVersion as unknown as Record<string, unknown>
    );
    await runtime.repositories.garment.create(
      input.compositionVersion as unknown as Record<string, unknown>
    );
    await runtime.repositories.production.create(
      input.execution as unknown as Record<string, unknown>
    );
    return 't2';
  } catch {
    return 'session';
  }
}

/**
 * Explicit trusted finalization. Never mutates the working design object.
 * Incomplete input returns structured readiness and creates no artifact.
 */
export async function finalizeDesignForTrustedTailoring(
  input: TrustedFinalizationInput
): Promise<TrustedFinalizationResult> {
  const workingCopy = cloneWorkingMeasurements(input.measurements);
  const design: TrustedWorkingDesign = { ...input, measurements: workingCopy };
  const readiness = assessTrustedReadiness(design);

  if (!readiness.ready) {
    return {
      status: 'INCOMPLETE',
      phase: 'INCOMPLETE',
      readiness,
      artifact: null,
      draftPreserved: true,
    };
  }

  const measurementVersion = freezeMeasurementVersion({
    blob: workingCopy,
    declaredUnit: input.declaredUnit || 'cm',
    patternKind: readiness.patternKind,
    customerId: input.customerId,
    profileId: input.profileId,
    orderId: input.orderId,
    source: 'studio-session',
    id: input.measurementVersionId,
    capturedAt: input.capturedAt,
  });

  const specificationVersion = freezeGarmentSpecification({
    intent: {
      ...intentFromWorkingDesign(design),
      measurementVersionId: measurementVersion.id,
    },
    source: 'studio',
    extractionPath: 'studio-adapter',
    id: input.specificationVersionId,
    createdAt: input.capturedAt,
  });

  const compositionVersion = freezeComposition({
    specificationVersion,
    id: input.compositionVersionId,
    createdAt: input.capturedAt,
  });

  const executionInput = {
    measurementVersion,
    specificationVersion,
    compositionVersion,
  };
  const result = executeTrustedTailoring(executionInput);
  const execution = freezeTrustedTailoringExecution({
    ...executionInput,
    id: input.executionId,
    createdAt: input.capturedAt,
  });

  const persistence = await persistIfPossible({
    persist: input.persist !== false,
    measurementVersion,
    specificationVersion,
    compositionVersion,
    execution,
  });

  return {
    status: 'EXECUTED',
    phase: 'EXECUTED',
    readiness,
    artifact: {
      kind: 'TrustedTailoringArtifact',
      workingDesignUnchanged: true,
      measurementVersion,
      specificationVersion,
      compositionVersion,
      execution,
      result,
      persistence,
      fingerprintAlgorithm: 'fnv1a-64',
      cryptographic: false,
    },
    draftPreserved: true,
  };
}
