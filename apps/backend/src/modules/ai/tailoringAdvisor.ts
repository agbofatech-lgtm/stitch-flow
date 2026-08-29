/**
 * Phase 17 — TAILORING ADVISOR (Stages 5-9).
 *
 * Adapts the real deterministic Phase 13/14/15/16 engine output into
 * purpose-scoped AI contexts, then routes them through the AI gateway.
 *
 * This is the DETERMINISTIC-FIRST layer:
 *   - It reads engine output. It never recomputes it.
 *   - It never calls a provider directly — only `aiGateway.requestAdvisory`.
 *   - It never mutates anything. Every function is a pure read + advise.
 *
 * Every function here is safe to call when AI is absent: the gateway
 * degrades to a deterministic advisory built from the same evidence.
 */

import type { Pool } from 'pg';
import { requestAdvisory } from './aiGateway';
import {
  buildCustomerExplanationContext,
  buildDesignReviewContext,
  buildFabricReviewContext,
  buildMeasurementReviewContext,
  buildProductionReviewContext,
  designAssertions,
  fabricAssertions,
  measurementAssertions,
  productionAssertions,
  type DesignReviewInput,
  type FabricReviewInput,
  type MeasurementReviewInput,
  type ProductionReviewInput,
} from './contextBuilders';
import type { AIAdvisory } from './types';
import * as profileService from '../measurements/profileService';
import * as productionService from '../production/productionService';
import type { ProductionPlan } from '../production/types';

export interface AdvisorCaller {
  workspaceId: string;
  actorId: string | null;
  requestId: string | null;
}

// ---------------------------------------------------------------------------
// Measurement review (Stage 5)
// ---------------------------------------------------------------------------

/**
 * Explain a measurement profile's deterministic validation results.
 *
 * Reads Phase 13 output via `computeValidation` — the same function the
 * measurement API uses — so the advisory can never disagree with what the
 * measurement workspace displays.
 */
export async function reviewMeasurements(
  caller: AdvisorCaller,
  profileId: string,
): Promise<AIAdvisory> {
  const full = await profileService.getProfileFull(caller.workspaceId, profileId);
  const validation = await profileService.computeValidation(full);

  const garmentSet = full.sets.find((s) => s.category === 'garment' && s.garmentType);
  const garmentType = garmentSet?.garmentType ?? 'body';

  const missing = validation.completeness.flatMap((c) => c.missingDefinitions);
  const present = validation.completeness.flatMap((c) => c.presentDefinitions);

  const input: MeasurementReviewInput = {
    workspaceId: caller.workspaceId,
    customerId: full.profile.customerId,
    garmentType,
    unit: 'cm',
    level1Passed: validation.level1.result === 'PASS',
    valueCount: full.sets.reduce((n, s) => n + s.values.length, 0),
    profileStatus: full.profile.status,
    completeness: validation.completeness.map((c) => ({
      garmentType: c.garmentType,
      state: c.state,
    })),
    missingDefinitions: missing,
    presentDefinitions: present,
    relationalFindings: validation.relational.map((r) => ({
      code: r.code,
      result: r.result,
      message: r.message,
    })),
    anomalies: validation.anomalies.map((a) => ({
      definitionCode: a.definitionCode,
      state: a.state,
      changePercent: a.changePercent,
      explanation: a.explanation,
    })),
  };

  return requestAdvisory(
    {
      purpose: 'measurement_review',
      workspaceId: caller.workspaceId,
      actorId: caller.actorId,
      requestId: caller.requestId,
      context: buildMeasurementReviewContext(input),
    },
    { assertions: measurementAssertions(input) },
  );
}

// ---------------------------------------------------------------------------
// Design review (Stage 6)
// ---------------------------------------------------------------------------

/**
 * Explain design construction considerations.
 *
 * Takes an already-loaded, already-authorised design projection so the
 * advisor never performs its own unscoped database reads.
 */
export async function reviewDesign(
  caller: AdvisorCaller,
  input: Omit<DesignReviewInput, 'workspaceId'>,
): Promise<AIAdvisory> {
  const full: DesignReviewInput = { ...input, workspaceId: caller.workspaceId };
  return requestAdvisory(
    {
      purpose: 'design_review',
      workspaceId: caller.workspaceId,
      actorId: caller.actorId,
      requestId: caller.requestId,
      context: buildDesignReviewContext(full),
    },
    { assertions: designAssertions(full) },
  );
}

// ---------------------------------------------------------------------------
// Fabric review (Stage 7)
// ---------------------------------------------------------------------------

/**
 * Explain WHY a fabric quantity was recommended and what must be verified.
 *
 * The numbers come straight from the Phase 16 `FabricConsumption` record.
 * The advisor never recalculates consumption — it only explains it.
 */
export function fabricInputFromPlan(
  workspaceId: string,
  plan: ProductionPlan,
): FabricReviewInput {
  const fc = plan.fabricConsumption;
  const widthProfile = fc.widthProfile as unknown as {
    isCompatible?: boolean;
    usableWidthCm?: number;
  };

  return {
    workspaceId,
    fabricConsumptionId: fc.id,
    fabricType: null,
    widthCm: fc.layoutFabricWidthCm,
    stretch: null,
    transparency: null,
    isDirectional: Boolean(
      (fc.directional as unknown as { isDirectional?: boolean })?.isDirectional,
    ),
    requiresPatternMatching: Boolean(
      (fc.patternMatching as unknown as { required?: boolean })?.required,
    ),
    patternMatchingVerification:
      (fc.patternMatching as unknown as { verification?: string })?.verification ?? null,
    layoutEnvelopeCm: fc.layoutEnvelopeCm,
    fabricRequiredCm: fc.fabricRequiredCm,
    fabricRequiredMeters: fc.fabricRequiredMeters,
    consumptionBreakdown: fc.breakdown as unknown as Record<string, number>,
    allowanceSources: [
      { allowance: 'shrinkage', source: String((fc.shrinkage as { source?: string })?.source ?? 'unknown') },
      { allowance: 'directional', source: String((fc.directional as { source?: string })?.source ?? 'unknown') },
      { allowance: 'handlingWaste', source: String((fc.handlingWaste as { source?: string })?.source ?? 'unknown') },
      { allowance: 'safetyBuffer', source: String((fc.safetyBuffer as { source?: string })?.source ?? 'unknown') },
    ],
    consumptionConfidence: fc.confidence,
    assumptions: fc.assumptions ?? [],
    manualVerificationRequired: fc.manualVerificationRequired,
    widthCompatible: widthProfile?.isCompatible !== false,
  };
}

export async function reviewFabric(
  caller: AdvisorCaller,
  pool: Pool,
  planId: string,
): Promise<AIAdvisory | null> {
  const plan = await productionService.getProductionPlan(pool, caller.workspaceId, planId);
  if (!plan) return null;

  const input = fabricInputFromPlan(caller.workspaceId, plan);
  return requestAdvisory(
    {
      purpose: 'fabric_review',
      workspaceId: caller.workspaceId,
      actorId: caller.actorId,
      requestId: caller.requestId,
      context: buildFabricReviewContext(input),
    },
    { assertions: fabricAssertions(input) },
  );
}

// ---------------------------------------------------------------------------
// Production review (Stage 8)
// ---------------------------------------------------------------------------

/** Project a Phase 16 production plan into the review input shape. */
export function productionInputFromPlan(
  workspaceId: string,
  plan: ProductionPlan,
): ProductionReviewInput {
  const readiness = plan.readiness;
  const operations = plan.operations ?? [];

  return {
    workspaceId,
    productionPlanId: plan.id,
    overallStatus: readiness?.overallStatus ?? plan.status,
    readinessFlags: {
      designReady: Boolean(readiness?.designReady),
      measurementsReady: Boolean(readiness?.measurementsReady),
      fabricReady: Boolean(readiness?.fabricReady),
      patternReady: Boolean(readiness?.patternReady),
      layoutReady: Boolean(readiness?.layoutReady),
      materialsReady: Boolean(readiness?.materialsReady),
      workflowReady: Boolean(readiness?.workflowReady),
      qualityPlanReady: Boolean(readiness?.qualityPlanReady),
    },
    blockers: (readiness?.blockers ?? []).map((b) => ({
      code: b.code,
      category: b.category,
      severity: b.severity,
      message: b.message,
      resolution: b.resolution,
    })),
    warnings: readiness?.warnings ?? [],
    operationSummary: {
      total: operations.length,
      completed: operations.filter((o) => o.status === 'completed').length,
      blocked: operations.filter((o) => o.status === 'blocked').length,
      inProgress: operations.filter((o) => o.status === 'in_progress').length,
    },
    blockedOperations: operations
      .filter((o) => o.status === 'blocked')
      .map((o) => ({
        code: o.id,
        name: o.name,
        reason: 'Operation is blocked by an unmet dependency or prerequisite.',
      })),
    qualityCheckpoints: (plan.qualityCheckpoints ?? []).map((q) => ({
      code: q.id,
      phase: q.phase,
      status: q.status,
    })),
    materialShortages: (plan.materials ?? [])
      .filter((m) => (m as unknown as { shortfall?: unknown }).shortfall)
      .map((m) => ({
        material: m.name ?? 'material',
        shortfall: String((m as unknown as { shortfall?: unknown }).shortfall),
      })),
  };
}

export async function reviewProduction(
  caller: AdvisorCaller,
  pool: Pool,
  planId: string,
): Promise<AIAdvisory | null> {
  const plan = await productionService.getProductionPlan(pool, caller.workspaceId, planId);
  if (!plan) return null;

  const input = productionInputFromPlan(caller.workspaceId, plan);
  return requestAdvisory(
    {
      purpose: 'production_review',
      workspaceId: caller.workspaceId,
      actorId: caller.actorId,
      requestId: caller.requestId,
      context: buildProductionReviewContext(input),
    },
    { assertions: productionAssertions(input) },
  );
}

// ---------------------------------------------------------------------------
// Customer-friendly explanation (Stage 9)
// ---------------------------------------------------------------------------

/**
 * Translate technical tailoring statements into customer-friendly language.
 *
 * Deterministic fallback: when AI is unavailable, a curated phrasebook still
 * produces plain-language explanations for the most common technical
 * statements, so this feature degrades to useful rather than to nothing.
 */
const PHRASEBOOK: Array<{ match: RegExp; plain: string }> = [
  {
    match: /width.*(incompatible|not compatible)/i,
    plain:
      'The cloth is not wide enough for the way the pieces need to be laid out, so the layout has to be checked before cutting.',
  },
  {
    match: /pattern matching/i,
    plain:
      'The fabric has a pattern that needs to line up across the seams. Matching it by eye takes extra care and usually a little extra cloth.',
  },
  {
    match: /directional/i,
    plain:
      'This fabric has a direction to it, so every piece must be cut facing the same way. That uses slightly more cloth than a plain fabric.',
  },
  {
    match: /shrink/i,
    plain:
      'Some cloth shrinks the first time it is washed, so a little extra is added now to keep the finished garment the right size.',
  },
  {
    match: /(measurement|profile).*(incomplete|missing)/i,
    plain:
      'A few measurements are still needed before the garment can be cut accurately.',
  },
  {
    match: /insufficient fabric|fabric short/i,
    plain: 'There is not quite enough cloth for this garment yet, so a little more is needed.',
  },
];

export function plainLanguageFallback(statements: string[]): string[] {
  return statements.map((s) => {
    const hit = PHRASEBOOK.find((p) => p.match.test(s));
    return hit ? hit.plain : s;
  });
}

export async function explainForCustomer(
  caller: AdvisorCaller,
  subjectId: string,
  topic: string,
  technicalStatements: string[],
  garmentType: string | null = null,
): Promise<AIAdvisory> {
  const context = buildCustomerExplanationContext({
    workspaceId: caller.workspaceId,
    subjectId,
    topic,
    garmentType,
    technicalStatements,
  });

  const advisory = await requestAdvisory({
    purpose: 'customer_explanation',
    workspaceId: caller.workspaceId,
    actorId: caller.actorId,
    requestId: caller.requestId,
    context,
  });

  // When AI is unavailable, supply the deterministic phrasebook translation
  // so the tailor still gets something they can read to the customer.
  if (!advisory.aiGenerated) {
    const plain = plainLanguageFallback(technicalStatements);
    return {
      ...advisory,
      summary:
        plain.length > 0
          ? 'Plain-language explanation produced without AI assistance.'
          : advisory.summary,
      findings: plain.map((text, i) => ({
        code: `plain_${i}`,
        category: 'communication' as const,
        severity: 'info' as const,
        message: text,
        explanation: 'Standard plain-language wording for this tailoring topic.',
        source: 'deterministic' as const,
        evidence: [technicalStatements[i] ?? ''],
        confidence: 'medium' as const,
        requiresHumanVerification: true,
      })),
    };
  }

  return advisory;
}
