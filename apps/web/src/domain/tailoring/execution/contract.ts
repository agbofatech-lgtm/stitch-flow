/**
 * Phase 16 trusted deterministic execution contract.
 * Orchestration only. Does not rewrite engines or invent composition.
 */

import type { ComputationFingerprint } from '../deterministic/contracts';
import type { PatternKind } from '../../measurement/fields';
import {
  EXECUTION_CONTRACT_VERSION,
  type ExecutionOutputClassification,
  type ExecutionStatus,
} from './taxonomy';

export type FrozenVersionReference = {
  id: string;
  kind: 'MeasurementVersion' | 'GarmentSpecificationVersion' | 'GarmentCompositionVersion';
  frozen: true;
};

export type ExecutionConfigurationReference = {
  identity: 'engine-internal-defaults';
  registryVersion: 't10-configuration-authority';
  hipConflictUnresolved: true;
  fingerprint: ComputationFingerprint;
};

export type DeterministicTailoringExecutionRequest = {
  measurementVersion: FrozenVersionReference & { kind: 'MeasurementVersion' };
  specificationVersion: FrozenVersionReference & { kind: 'GarmentSpecificationVersion' };
  compositionVersion: FrozenVersionReference & { kind: 'GarmentCompositionVersion' };
  configuration: ExecutionConfigurationReference;
  executionVersion: typeof EXECUTION_CONTRACT_VERSION;
};

export type ClassifiedExecutionOutput = {
  classification: ExecutionOutputClassification;
  fingerprint: ComputationFingerprint;
  computationVersion: string;
  skipped?: boolean;
  reason?: string;
  patternKind?: PatternKind;
};

export type CanonicalExecutionIdentity = {
  executionContractVersion: typeof EXECUTION_CONTRACT_VERSION;
  measurementVersionId: string;
  specificationVersionId: string;
  compositionVersionId: string;
  configurationIdentity: ExecutionConfigurationReference['identity'];
  configurationFingerprint: string;
  patternProjectionKind?: PatternKind;
  patternProjectionNotIdentity?: true;
  garmentType: string | null;
  garmentTypeStatus: string;
  measurementFingerprint: string;
  specificationFingerprint: string;
  compositionFingerprint: string;
  inputFingerprint: string;
  patternOutputFingerprint: string | null;
  productionOutputFingerprint: string | null;
};

export type TrustedTailoringExecutionResult = {
  status: ExecutionStatus;
  identity: CanonicalExecutionIdentity;
  pattern: ClassifiedExecutionOutput;
  production: ClassifiedExecutionOutput;
  fingerprint: ComputationFingerprint & { cryptographic: false };
  silentDefaulting: 'absent-at-orchestration';
  tailoringAccuracyCertification: 'NOT_CLAIMED';
};

export type ExecutionProvenance = {
  executionContractVersion: typeof EXECUTION_CONTRACT_VERSION;
  measurementVersionId: string;
  specificationVersionId: string;
  compositionVersionId: string;
  configurationFingerprint: string;
  patternComputationVersion: string;
  productionComputationVersion: string;
  inputFingerprint: string;
  outputFingerprint: string;
  patternEngineIdentity: string;
  productionAssistantIdentity: string;
};
