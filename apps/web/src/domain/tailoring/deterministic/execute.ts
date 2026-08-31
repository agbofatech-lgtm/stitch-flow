/**
 * T10.1 governed execution. Wraps protected engines. Does not rewrite formulas.
 */

import { generateStylePattern, type StylePatternResult } from '../../../modules/services/patternEngine';
import {
  generateProductionPlan,
  type GenerateProductionPlanInput,
} from '../../../modules/services/productionAssistant';
import type { ProductionPlan } from '../../../shared/types';
import { ENGINE_LENGTH_UNIT, convertFieldMap } from '../../measurement/units';
import { canonicalize, canonicalizeMeasurementMap, canonicalJson } from './canonicalize';
import {
  type DeterministicComputationResult,
  type DeterministicPatternRequest,
  type DeterministicProductionRequest,
  type ComputationProvenance,
} from './contracts';
import { FINGERPRINT_ALGORITHM, fingerprintCanonicalPayload } from './fingerprint';
import { assertCentimetreInput } from './units';
import {
  CONFIGURATION_IDENTITY,
  ENGINE_VERSION_UNKNOWN,
  INPUT_CONTRACT_VERSION,
  PATTERN_COMPUTATION_VERSION,
  PATTERN_ENGINE_SOURCE_IDENTITY,
  PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
  PRODUCTION_COMPUTATION_VERSION,
} from './versioning';

function measurementsToEngine(
  measurements: Record<string, number | undefined>,
  declaredUnit: typeof ENGINE_LENGTH_UNIT | 'in'
): Record<string, number> {
  const canonical = canonicalizeMeasurementMap(measurements);
  if (declaredUnit === ENGINE_LENGTH_UNIT) return canonical;
  return convertFieldMap(canonical, declaredUnit, ENGINE_LENGTH_UNIT);
}

function identityFingerprint(payload: unknown) {
  return {
    algorithm: FINGERPRINT_ALGORITHM,
    value: fingerprintCanonicalPayload(payload),
  };
}

function stripGeneratedAt(plan: ProductionPlan): unknown {
  const { generatedAt: _generatedAt, ...rest } = plan;
  return canonicalize(rest);
}

export function executeDeterministicPattern(
  request: DeterministicPatternRequest
): DeterministicComputationResult<StylePatternResult> {
  const declaredUnit = request.declaredUnit || ENGINE_LENGTH_UNIT;
  const measurements = measurementsToEngine(request.measurements, declaredUnit);
  const canonicalInput = canonicalize({
    kind: request.kind,
    measurements,
  });

  const identity = {
    computationType: 'pattern-geometry' as const,
    computationVersion: PATTERN_COMPUTATION_VERSION,
    inputContractVersion: INPUT_CONTRACT_VERSION,
    engineIdentity: PATTERN_ENGINE_SOURCE_IDENTITY,
    configurationIdentity: CONFIGURATION_IDENTITY,
    canonicalUnit: ENGINE_LENGTH_UNIT,
    canonicalInput,
  };

  const result = generateStylePattern(request.kind, measurements);
  const provenance: ComputationProvenance = {
    computationAuthority: 'domain/tailoring/deterministic',
    engineIdentifier: 'patternEngine',
    engineIdentity: PATTERN_ENGINE_SOURCE_IDENTITY,
    engineVersion: ENGINE_VERSION_UNKNOWN,
    boundaryIdentifier: 'executeDeterministicPattern',
    computationVersion: PATTERN_COMPUTATION_VERSION,
    inputContractVersion: INPUT_CONTRACT_VERSION,
    configurationIdentity: CONFIGURATION_IDENTITY,
    canonicalUnit: ENGINE_LENGTH_UNIT,
    classification: 'deterministic',
    deterministicStatus: 'identity-stable',
    measurementVersionId: request.measurementVersionId ?? null,
  };

  return {
    result,
    normalizedOutput: canonicalize(result),
    provenance,
    fingerprint: identityFingerprint(identity),
    operationalMetadata: {},
  };
}

export function executeDeterministicProductionPlan(
  request: DeterministicProductionRequest
): DeterministicComputationResult<ProductionPlan> {
  assertCentimetreInput(request.declaredUnit);

  const measurements = request.measurements
    ? canonicalizeMeasurementMap(request.measurements as Record<string, number | undefined>)
    : undefined;

  const input: GenerateProductionPlanInput = {
    garmentType: request.garmentType,
    measurements,
    inspiration: request.inspiration,
    analysis: request.analysis,
    selectedFabric: request.selectedFabric,
  };

  const canonicalInput = canonicalize({
    garmentType: input.garmentType ?? null,
    measurements: measurements || {},
    inspiration: input.inspiration
      ? {
          title: input.inspiration.title,
          description: input.inspiration.description,
          category: input.inspiration.category,
          occasion: input.inspiration.occasion,
          collarStyle: input.inspiration.collarStyle,
          sleeveStyle: input.inspiration.sleeveStyle,
          pocketStyle: input.inspiration.pocketStyle,
          embroideryNotes: input.inspiration.embroideryNotes,
          tags: input.inspiration.tags,
          fabricType: input.inspiration.fabricType,
          fitType: input.inspiration.fitType,
          primaryColor: input.inspiration.primaryColor,
          secondaryColor: input.inspiration.secondaryColor,
        }
      : null,
    analysis: input.analysis
      ? {
          suggestedGarmentType: input.analysis.suggestedGarmentType,
          silhouette: input.analysis.silhouette,
          neckline: input.analysis.neckline,
          sleeveStyle: input.analysis.sleeveStyle,
          lengthType: input.analysis.lengthType,
          fitType: input.analysis.fitType,
          recommendedFabricTypes: input.analysis.recommendedFabricTypes,
          complexityLevel: input.analysis.complexityLevel,
        }
      : null,
    selectedFabric: input.selectedFabric
      ? {
          id: input.selectedFabric.id,
          name: input.selectedFabric.name,
          fabricType: input.selectedFabric.fabricType,
          unit: input.selectedFabric.unit,
        }
      : null,
  });

  const identity = {
    computationType: 'production-plan' as const,
    computationVersion: PRODUCTION_COMPUTATION_VERSION,
    inputContractVersion: INPUT_CONTRACT_VERSION,
    engineIdentity: PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
    configurationIdentity: CONFIGURATION_IDENTITY,
    canonicalUnit: ENGINE_LENGTH_UNIT,
    canonicalInput,
  };

  const result = generateProductionPlan(input);
  const generatedAt =
    result.generatedAt instanceof Date ? result.generatedAt.toISOString() : undefined;

  const provenance: ComputationProvenance = {
    computationAuthority: 'domain/tailoring/deterministic',
    engineIdentifier: 'productionAssistant',
    engineIdentity: PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
    engineVersion: ENGINE_VERSION_UNKNOWN,
    boundaryIdentifier: 'executeDeterministicProductionPlan',
    computationVersion: PRODUCTION_COMPUTATION_VERSION,
    inputContractVersion: INPUT_CONTRACT_VERSION,
    configurationIdentity: CONFIGURATION_IDENTITY,
    canonicalUnit: ENGINE_LENGTH_UNIT,
    fabricOutputUnit: result.fabricEstimate?.unit || 'yards',
    classification: 'heuristic',
    deterministicStatus: 'identity-stable-excluding-generatedAt',
    measurementVersionId: request.measurementVersionId ?? null,
  };

  return {
    result,
    normalizedOutput: stripGeneratedAt(result),
    provenance,
    fingerprint: identityFingerprint(identity),
    operationalMetadata: { generatedAt },
  };
}

/** Debug helper: canonical JSON of identity is independently inspectable. */
export function identityJson(payload: unknown): string {
  return canonicalJson(payload);
}
