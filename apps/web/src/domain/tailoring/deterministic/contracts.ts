import type { LengthUnit } from '../../measurement/units';
import type { StylePatternKind } from '../../../modules/services/patternEngine';
import type { GenerateProductionPlanInput } from '../../../modules/services/productionAssistant';
import type { ComputationVersion } from './versioning';

export type ComputationType = 'pattern-geometry' | 'production-plan';

export type ComputationClassification = 'deterministic' | 'heuristic';

export type CanonicalInput = Record<string, unknown>;

export type ComputationFingerprint = {
  algorithm: 'fnv1a-64';
  value: string;
};

export type ComputationProvenance = {
  computationAuthority: 'domain/tailoring/deterministic';
  engineIdentifier: 'patternEngine' | 'productionAssistant';
  engineIdentity: string;
  engineVersion: 'ENGINE_VERSION_UNKNOWN';
  boundaryIdentifier: 'executeDeterministicPattern' | 'executeDeterministicProductionPlan';
  computationVersion: ComputationVersion;
  inputContractVersion: 'measurement-input-v1';
  configurationIdentity: 'engine-internal-defaults';
  canonicalUnit: 'cm';
  fabricOutputUnit?: 'yards' | 'meters' | 'pieces';
  classification: ComputationClassification;
  deterministicStatus: 'identity-stable' | 'identity-stable-excluding-generatedAt';
  measurementVersionId?: string | null;
};

export type OperationalMetadata = {
  generatedAt?: string;
};

export type DeterministicComputationResult<T> = {
  result: T;
  normalizedOutput: unknown;
  provenance: ComputationProvenance;
  fingerprint: ComputationFingerprint;
  operationalMetadata: OperationalMetadata;
};

export type DeterministicPatternRequest = {
  computationType: 'pattern-geometry';
  kind: StylePatternKind;
  measurements: Record<string, number | undefined>;
  declaredUnit?: LengthUnit;
  measurementVersionId?: string | null;
};

export type DeterministicProductionRequest = GenerateProductionPlanInput & {
  computationType: 'production-plan';
  declaredUnit?: LengthUnit;
  measurementVersionId?: string | null;
};
