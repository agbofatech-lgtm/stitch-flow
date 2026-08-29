/**
 * Phase 17 — PURPOSE-SCOPED CONTEXT BUILDERS (§15/§22).
 *
 * Raw application objects and raw database rows are NEVER passed to an AI
 * provider. Each builder explicitly selects the fields its purpose needs,
 * pseudonymises the subject, normalises units, and records what it included
 * so every request can answer:
 *
 *   WHY was this data included?  -> allowlist + purpose
 *   WHAT purpose required it?    -> AIContext.purpose
 *   WHO received it?             -> AIProvenance.provider
 *
 * NEVER INCLUDED (regardless of purpose):
 *   password hashes, tokens, API keys, payment credentials, customer names,
 *   phone numbers, email addresses, physical addresses, other tenants' data,
 *   unrelated customer history.
 */

import crypto from 'crypto';
import type { AIContext, AILimitation, AIPurpose } from './types';
import type { DeterministicAssertion } from './deterministicPrecedence';

// ---------------------------------------------------------------------------
// Pseudonymisation
// ---------------------------------------------------------------------------

/**
 * Deterministic, non-reversible subject reference.
 *
 * Salted with the workspace so the same customer id cannot be correlated
 * across tenants, and truncated because we only need a stable label.
 */
export function pseudonymize(workspaceId: string, entityId: string, prefix = 'subject'): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${workspaceId}:${entityId}`)
    .digest('hex')
    .slice(0, 12);
  return `${prefix}#${digest}`;
}

// ---------------------------------------------------------------------------
// Allowlist enforcement
// ---------------------------------------------------------------------------

/**
 * Project an object down to an explicit allowlist.
 *
 * Whitelist-only: a key absent from `allowlist` is unreachable. Undefined
 * and null values are dropped so we never ship empty noise to a provider.
 */
export function applyAllowlist(
  source: Record<string, unknown>,
  allowlist: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowlist) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out;
}

/** Defensive cap so a pathological record cannot produce a huge prompt. */
const MAX_ARRAY_ITEMS = 40;

function cap<T>(items: T[] | undefined | null): T[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, MAX_ARRAY_ITEMS);
}

// ---------------------------------------------------------------------------
// Allowlists per purpose — the contract of what AI may ever see
// ---------------------------------------------------------------------------

export const MEASUREMENT_REVIEW_ALLOWLIST = [
  'garmentType',
  'unit',
  'completeness',
  'missingDefinitions',
  'presentDefinitions',
  'relationalFindings',
  'anomalies',
  'level1Passed',
  'valueCount',
  'profileStatus',
] as const;

export const DESIGN_REVIEW_ALLOWLIST = [
  'garmentType',
  'fitType',
  'components',
  'easeConfiguration',
  'designStatus',
  'readinessItems',
  'readinessSummary',
  'hasInspiration',
  'observationCount',
] as const;

export const FABRIC_REVIEW_ALLOWLIST = [
  'fabricType',
  'widthCm',
  'stretch',
  'transparency',
  'isDirectional',
  'requiresPatternMatching',
  'layoutEnvelopeCm',
  'fabricRequiredCm',
  'fabricRequiredMeters',
  'consumptionBreakdown',
  'allowanceSources',
  'consumptionConfidence',
  'assumptions',
  'manualVerificationRequired',
  'widthCompatible',
] as const;

export const PRODUCTION_REVIEW_ALLOWLIST = [
  'overallStatus',
  'readinessFlags',
  'blockers',
  'warnings',
  'operationSummary',
  'blockedOperations',
  'qualityCheckpoints',
  'materialShortages',
] as const;

export const CUSTOMER_EXPLANATION_ALLOWLIST = [
  'topic',
  'technicalStatements',
  'garmentType',
] as const;

// ---------------------------------------------------------------------------
// Builder inputs — deliberately narrow, derived shapes (never DB rows)
// ---------------------------------------------------------------------------

export interface MeasurementReviewInput {
  workspaceId: string;
  customerId: string;
  garmentType: string;
  unit: string;
  level1Passed: boolean;
  valueCount: number;
  profileStatus: string;
  completeness: Array<{ garmentType: string; state: string }>;
  missingDefinitions: string[];
  presentDefinitions: string[];
  relationalFindings: Array<{ code: string; result: string; message: string }>;
  anomalies: Array<{
    definitionCode: string;
    state: string;
    changePercent: number | null;
    explanation: string;
  }>;
}

/**
 * Build the measurement-review context.
 *
 * Note what is NOT here: the customer's name, contact details, or any raw
 * profile row. Measurement VALUES are also excluded — the deterministic
 * engine has already computed the findings, and the model only needs the
 * findings to explain verification priorities.
 */
export function buildMeasurementReviewContext(input: MeasurementReviewInput): AIContext {
  const limitations: AILimitation[] = [];

  if (input.anomalies.length === 0 && input.missingDefinitions.length === 0) {
    limitations.push({
      code: 'no_history',
      description: 'No historical anomalies or missing measurements were reported for this profile.',
      resolution: 'Record additional measurement versions over time to enable historical comparison.',
    });
  }

  const data = applyAllowlist(
    {
      garmentType: input.garmentType,
      unit: input.unit,
      completeness: cap(input.completeness),
      missingDefinitions: cap(input.missingDefinitions),
      presentDefinitions: cap(input.presentDefinitions),
      relationalFindings: cap(input.relationalFindings.filter((f) => f.result !== 'OK')),
      anomalies: cap(input.anomalies.filter((a) => a.state !== 'NORMAL')),
      level1Passed: input.level1Passed,
      valueCount: input.valueCount,
      profileStatus: input.profileStatus,
    },
    MEASUREMENT_REVIEW_ALLOWLIST,
  );

  return {
    purpose: 'measurement_review',
    workspaceId: input.workspaceId,
    subjectRef: pseudonymize(input.workspaceId, input.customerId, 'customer'),
    data,
    allowlist: [...MEASUREMENT_REVIEW_ALLOWLIST],
    deterministicInputs: ['phase13.validationService'],
    limitations,
  };
}

/**
 * Deterministic assertions for measurement review.
 * L1 failure is blocking; relational warnings and historical flags are not.
 */
export function measurementAssertions(input: MeasurementReviewInput): DeterministicAssertion[] {
  const out: DeterministicAssertion[] = [];

  if (!input.level1Passed) {
    out.push({
      code: 'measurement_l1_failed',
      statement: 'Measurement validation failed: the profile contains invalid values.',
      blocking: true,
      keywords: ['measurement', 'validation', 'value'],
    });
  }

  if (input.missingDefinitions.length > 0) {
    out.push({
      code: 'measurements_incomplete',
      statement: `Measurement profile is incomplete: ${input.missingDefinitions.length} required measurement(s) missing.`,
      blocking: true,
      keywords: ['missing', 'incomplete', 'measurement'],
    });
  }

  for (const f of input.relationalFindings) {
    if (f.result === 'WARNING') {
      out.push({
        code: `relational_${f.code}`,
        statement: f.message,
        blocking: false,
        keywords: ['relational', 'measurement'],
      });
    }
  }

  for (const a of input.anomalies) {
    if (a.state === 'FLAGGED') {
      out.push({
        code: `anomaly_${a.definitionCode}`,
        statement: `${a.definitionCode}: ${a.explanation}`,
        blocking: false,
        keywords: [a.definitionCode, 'anomaly', 'historical'],
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Design review
// ---------------------------------------------------------------------------

export interface DesignReviewInput {
  workspaceId: string;
  designSpecificationId: string;
  garmentType: string;
  fitType: string;
  designStatus: string;
  components: Array<{ type: string; label: string }>;
  easeConfiguration: Array<{ area: string; easeCm: number; source: string }>;
  readinessItems: Array<{ code: string; status: string; message: string }>;
  hasInspiration: boolean;
  observationCount: number;
}

export function buildDesignReviewContext(input: DesignReviewInput): AIContext {
  const limitations: AILimitation[] = [];
  if (!input.hasInspiration) {
    limitations.push({
      code: 'no_inspiration',
      description: 'No inspiration reference is attached to this design.',
      resolution: 'Attach an inspiration reference to give the review more design signal.',
    });
  }

  const notReady = input.readinessItems.filter((r) => r.status !== 'ready');

  const data = applyAllowlist(
    {
      garmentType: input.garmentType,
      fitType: input.fitType,
      components: cap(input.components),
      easeConfiguration: cap(input.easeConfiguration),
      designStatus: input.designStatus,
      readinessItems: cap(notReady),
      readinessSummary: {
        total: input.readinessItems.length,
        notReady: notReady.length,
      },
      hasInspiration: input.hasInspiration,
      observationCount: input.observationCount,
    },
    DESIGN_REVIEW_ALLOWLIST,
  );

  return {
    purpose: 'design_review',
    workspaceId: input.workspaceId,
    subjectRef: pseudonymize(input.workspaceId, input.designSpecificationId, 'design'),
    data,
    allowlist: [...DESIGN_REVIEW_ALLOWLIST],
    deterministicInputs: ['phase14.readinessEngine', 'phase14.designSpecService'],
    limitations,
  };
}

export function designAssertions(input: DesignReviewInput): DeterministicAssertion[] {
  return input.readinessItems
    .filter((r) => r.status !== 'ready')
    .map((r) => ({
      code: `design_${r.code}`,
      statement: r.message,
      blocking: r.status === 'blocked',
      keywords: ['design', 'readiness', r.code],
    }));
}

// ---------------------------------------------------------------------------
// Fabric review
// ---------------------------------------------------------------------------

export interface FabricReviewInput {
  workspaceId: string;
  fabricConsumptionId: string;
  fabricType: string | null;
  widthCm: number | null;
  stretch: string | null;
  transparency: string | null;
  isDirectional: boolean;
  requiresPatternMatching: boolean;
  patternMatchingVerification: string | null;
  layoutEnvelopeCm: number;
  fabricRequiredCm: number;
  fabricRequiredMeters: number;
  consumptionBreakdown: Record<string, number>;
  allowanceSources: Array<{ allowance: string; source: string }>;
  consumptionConfidence: string;
  assumptions: string[];
  manualVerificationRequired: boolean;
  widthCompatible: boolean;
}

export function buildFabricReviewContext(input: FabricReviewInput): AIContext {
  const limitations: AILimitation[] = [];
  if (!input.fabricType) {
    limitations.push({
      code: 'no_fabric_profile',
      description: 'No fabric profile is linked, so fabric-specific properties are unknown.',
      resolution: 'Link a fabric profile to enable fabric-specific review.',
    });
  }

  const data = applyAllowlist(
    {
      fabricType: input.fabricType,
      widthCm: input.widthCm,
      stretch: input.stretch,
      transparency: input.transparency,
      isDirectional: input.isDirectional,
      requiresPatternMatching: input.requiresPatternMatching,
      layoutEnvelopeCm: input.layoutEnvelopeCm,
      fabricRequiredCm: input.fabricRequiredCm,
      fabricRequiredMeters: input.fabricRequiredMeters,
      consumptionBreakdown: input.consumptionBreakdown,
      allowanceSources: cap(input.allowanceSources),
      consumptionConfidence: input.consumptionConfidence,
      assumptions: cap(input.assumptions),
      manualVerificationRequired: input.manualVerificationRequired,
      widthCompatible: input.widthCompatible,
    },
    FABRIC_REVIEW_ALLOWLIST,
  );

  return {
    purpose: 'fabric_review',
    workspaceId: input.workspaceId,
    subjectRef: pseudonymize(input.workspaceId, input.fabricConsumptionId, 'fabric'),
    data,
    allowlist: [...FABRIC_REVIEW_ALLOWLIST],
    deterministicInputs: ['phase16.fabricConsumptionService', 'phase14.fabricService'],
    limitations,
  };
}

export function fabricAssertions(input: FabricReviewInput): DeterministicAssertion[] {
  const out: DeterministicAssertion[] = [];

  if (!input.widthCompatible) {
    out.push({
      code: 'fabric_width_incompatible',
      statement:
        'Fabric width is incompatible with the cutting layout. This must be resolved before cutting.',
      blocking: true,
      keywords: ['width', 'fabric', 'compatible', 'layout', 'fit', 'cut'],
    });
  }

  if (input.requiresPatternMatching) {
    out.push({
      code: 'pattern_matching_required',
      statement:
        'Pattern matching is required and is never auto-solved: the layout must be manually verified.',
      blocking: input.patternMatchingVerification === 'manual_verification_required',
      keywords: ['pattern matching', 'matching', 'verify', 'alignment'],
    });
  }

  if (input.isDirectional) {
    out.push({
      code: 'directional_fabric',
      statement: 'Fabric is directional: all pieces must be cut in a single nap direction.',
      blocking: false,
      keywords: ['directional', 'nap', 'direction'],
    });
  }

  if (input.manualVerificationRequired) {
    out.push({
      code: 'consumption_manual_verification',
      statement: 'The fabric consumption calculation requires manual verification before purchase.',
      blocking: false,
      keywords: ['consumption', 'verify', 'quantity', 'yardage'],
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Production review
// ---------------------------------------------------------------------------

export interface ProductionReviewInput {
  workspaceId: string;
  productionPlanId: string;
  overallStatus: string;
  readinessFlags: Record<string, boolean>;
  blockers: Array<{ code: string; category: string; severity: string; message: string; resolution: string }>;
  warnings: string[];
  operationSummary: { total: number; completed: number; blocked: number; inProgress: number };
  blockedOperations: Array<{ code: string; name: string; reason: string }>;
  qualityCheckpoints: Array<{ code: string; phase: string; status: string }>;
  materialShortages: Array<{ material: string; shortfall: string }>;
}

export function buildProductionReviewContext(input: ProductionReviewInput): AIContext {
  const limitations: AILimitation[] = [];
  if (input.operationSummary.total === 0) {
    limitations.push({
      code: 'no_workflow',
      description: 'No production workflow has been generated for this plan.',
      resolution: 'Generate the production workflow to enable sequencing advice.',
    });
  }

  const data = applyAllowlist(
    {
      overallStatus: input.overallStatus,
      readinessFlags: input.readinessFlags,
      blockers: cap(input.blockers),
      warnings: cap(input.warnings),
      operationSummary: input.operationSummary,
      blockedOperations: cap(input.blockedOperations),
      qualityCheckpoints: cap(input.qualityCheckpoints.filter((q) => q.status !== 'passed')),
      materialShortages: cap(input.materialShortages),
    },
    PRODUCTION_REVIEW_ALLOWLIST,
  );

  return {
    purpose: 'production_review',
    workspaceId: input.workspaceId,
    subjectRef: pseudonymize(input.workspaceId, input.productionPlanId, 'plan'),
    data,
    allowlist: [...PRODUCTION_REVIEW_ALLOWLIST],
    deterministicInputs: [
      'phase16.productionService',
      'phase16.productionWorkflowService',
      'phase16.readiness',
    ],
    limitations,
  };
}

export function productionAssertions(input: ProductionReviewInput): DeterministicAssertion[] {
  return input.blockers.map((b) => ({
    code: `production_${b.code}`,
    statement: b.message,
    blocking: b.severity === 'blocking',
    keywords: [b.category, b.code, 'production'],
  }));
}

// ---------------------------------------------------------------------------
// Customer-friendly explanation
// ---------------------------------------------------------------------------

export interface CustomerExplanationInput {
  workspaceId: string;
  subjectId: string;
  topic: string;
  garmentType: string | null;
  /** Technical statements to translate. Must already be non-sensitive. */
  technicalStatements: string[];
}

/**
 * Build the customer-explanation context.
 *
 * This purpose translates technical tailoring language into plain language.
 * It receives ONLY the statements to translate — never customer identity,
 * never pricing, never internal notes.
 */
export function buildCustomerExplanationContext(input: CustomerExplanationInput): AIContext {
  const data = applyAllowlist(
    {
      topic: input.topic,
      technicalStatements: cap(input.technicalStatements),
      garmentType: input.garmentType,
    },
    CUSTOMER_EXPLANATION_ALLOWLIST,
  );

  return {
    purpose: 'customer_explanation' as AIPurpose,
    workspaceId: input.workspaceId,
    subjectRef: pseudonymize(input.workspaceId, input.subjectId, 'subject'),
    data,
    allowlist: [...CUSTOMER_EXPLANATION_ALLOWLIST],
    deterministicInputs: ['phase17.explanationSource'],
    limitations: [],
  };
}
