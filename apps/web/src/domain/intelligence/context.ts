/**
 * Phase 17 governed intelligence context.
 * Distinguishes FACT / deterministic output / observation / unresolved / unknown.
 * Strips customer identity, financials, secrets, UI state.
 */

import type { MeasurementVersionRecord } from '../measurement/version';
import { assertVersionFrozen } from '../measurement/version';
import { engineInputFromVersion } from '../measurement/contract';
import type { GarmentSpecificationVersionRecord } from '../garment/version';
import { assertGarmentSpecificationFrozen } from '../garment/version';
import type { GarmentCompositionVersionRecord } from '../composition/version';
import { assertCompositionFrozen } from '../composition/version';
import type { TrustedTailoringExecutionRecord } from '../tailoring/execution/version';
import { assertTrustedExecutionFrozen } from '../tailoring/execution/version';
import { PATTERN_INPUT_FIELDS, type PatternKind } from '../measurement/fields';
import { HIP_DEFAULT_CONFLICT } from '../tailoring/deterministic/defaultsInventory';
import { fingerprintCanonicalPayload } from '../tailoring/deterministic/fingerprint';
import { canonicalize } from '../tailoring/deterministic/canonicalize';

export const INTELLIGENCE_CONTEXT_VERSION = '1' as const;
export const INTELLIGENCE_CONTEXT_MAX_KEYS = 64;

export type UnresolvedConflict = {
  id: string;
  classification: 'UNKNOWN';
  statement: string;
  values?: ReadonlyArray<string | number>;
};

export type GovernedIntelligenceContext = {
  schemaVersion: typeof INTELLIGENCE_CONTEXT_VERSION;
  authorityFacts: {
    measurementVersionId: string;
    specificationVersionId: string;
    compositionVersionId: string;
    executionId: string;
    garmentType: string | null;
    garmentTypeStatus: string;
    compositionCompleteness: string;
    patternProjectionKind?: PatternKind;
    patternProjectionNotIdentity?: true;
    measurementKeysPresent: string[];
    measurementKeysMissingForProjection: string[];
    measurementValuesCm: Record<string, number>;
  };
  deterministicOutputs: {
    executionStatus: string;
    executionFingerprint: string;
    patternClassification: string;
    productionClassification: string;
    patternSkipped: boolean;
    productionSkipped: boolean;
    silentDefaulting: string;
    tailoringAccuracyCertification: string;
  };
  unresolvedConflicts: UnresolvedConflict[];
  unknowns: string[];
  prohibitedTransmissions: string[];
};

const BLOCKED_CONTEXT_KEYS = [
  'customerId',
  'profileId',
  'capturedBy',
  'password',
  'token',
  'secret',
  'apiKey',
  'JWT',
  'totalAmount',
  'invoice',
  'payment',
] as const;

export function buildGovernedIntelligenceContext(input: {
  measurementVersion: MeasurementVersionRecord;
  specificationVersion: GarmentSpecificationVersionRecord;
  compositionVersion: GarmentCompositionVersionRecord;
  execution: TrustedTailoringExecutionRecord;
}): GovernedIntelligenceContext {
  assertVersionFrozen(input.measurementVersion);
  assertGarmentSpecificationFrozen(input.specificationVersion);
  assertCompositionFrozen(input.compositionVersion);
  assertTrustedExecutionFrozen(input.execution);

  const measurements = engineInputFromVersion(input.measurementVersion);
  const keys = Object.keys(measurements).sort();
  if (keys.length > INTELLIGENCE_CONTEXT_MAX_KEYS) {
    throw new Error('STOP: intelligence context exceeds measurement key budget');
  }

  const projectionKind = input.execution.result.identity.patternProjectionKind;
  const required = projectionKind ? PATTERN_INPUT_FIELDS[projectionKind] : [];
  const missing = required.filter((key) => typeof measurements[key] !== 'number');

  const unknowns: string[] = [];
  if (input.specificationVersion.specification.garmentTypeStatus !== 'known') {
    unknowns.push('garment-identity');
  }
  if (input.compositionVersion.composition.completeness !== 'complete') {
    unknowns.push('required-structure');
  }
  if (missing.length) unknowns.push('projection-measurements');

  const unresolvedConflicts: UnresolvedConflict[] = [
    {
      id: 'hip-98-100-102',
      classification: 'UNKNOWN',
      statement: 'Hip default conflict remains unresolved. Do not pick a winner.',
      values: [...HIP_DEFAULT_CONFLICT.values],
    },
  ];

  return {
    schemaVersion: INTELLIGENCE_CONTEXT_VERSION,
    authorityFacts: {
      measurementVersionId: input.measurementVersion.id,
      specificationVersionId: input.specificationVersion.id,
      compositionVersionId: input.compositionVersion.id,
      executionId: input.execution.id,
      garmentType: input.specificationVersion.specification.garmentType,
      garmentTypeStatus: input.specificationVersion.specification.garmentTypeStatus,
      compositionCompleteness: input.compositionVersion.composition.completeness,
      measurementKeysPresent: keys,
      measurementKeysMissingForProjection: [...missing].sort(),
      measurementValuesCm: measurements,
    },
    deterministicOutputs: {
      executionStatus: input.execution.result.status,
      executionFingerprint: input.execution.result.fingerprint.value,
      patternClassification: input.execution.result.pattern.classification,
      productionClassification: input.execution.result.production.classification,
      patternSkipped: Boolean(input.execution.result.pattern.skipped),
      productionSkipped: Boolean(input.execution.result.production.skipped),
      silentDefaulting: input.execution.result.silentDefaulting,
      tailoringAccuracyCertification: input.execution.result.tailoringAccuracyCertification,
    },
    unresolvedConflicts,
    unknowns,
    prohibitedTransmissions: [...BLOCKED_CONTEXT_KEYS],
  };
}

export function intelligenceContextFingerprint(context: GovernedIntelligenceContext): string {
  return fingerprintCanonicalPayload(canonicalize(context));
}

export function assertNoBlockedKeysInContext(context: GovernedIntelligenceContext): void {
  const payload = {
    authorityFacts: context.authorityFacts,
    deterministicOutputs: context.deterministicOutputs,
    unresolvedConflicts: context.unresolvedConflicts,
    unknowns: context.unknowns,
  };
  const blob = JSON.stringify(payload);
  for (const key of BLOCKED_CONTEXT_KEYS) {
    if (blob.includes(`"${key}"`)) {
      throw new Error(`STOP: intelligence context must not transmit "${key}"`);
    }
  }
}
