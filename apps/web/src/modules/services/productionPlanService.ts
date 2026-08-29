/**
 * Phase 16 — Production Plan Service (orchestrator).
 *
 * Orchestrates all Phase 16 engines into a canonical ProductionPlan:
 * 1. Fabric consumption (from Phase 15 layoutEnvelopeCm)
 * 2. Purchasing recommendation
 * 3. Material requirements
 * 4. Cutting execution plan
 * 5. Production workflow (operations + dependencies)
 * 6. Quality control checkpoints
 * 7. Production readiness assessment
 *
 * Persists to Dexie v6 (offline-first).
 * productionAssistant.ts NEVER called — ZERO DIFF.
 * patternEngine.ts NEVER called — ZERO DIFF.
 */

import { db } from '../../db/database';
import { calculateFabricConsumption, saveFabricConsumptionLocally } from './fabricConsumptionService';
import { buildPurchasingRecommendation } from './purchasingService';
import { deriveMaterialRequirements } from './materialRequirementService';
import { generateProductionWorkflow } from './productionWorkflowService';
import type { FabricConsumption, ProductionPlan, ProductionReadiness, ProductionBlocker, ProductionTraceability } from '../../shared/api/production';
import type { CuttingLayout } from '../../shared/api/pattern';
import type { PatternModel } from '../../shared/api/pattern';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';

const CALC_VERSION = '1.0.0';

function generateId(): string {
  return `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Production Readiness Engine
// ---------------------------------------------------------------------------

export function computeProductionReadiness(opts: {
  hasDesignSpec: boolean;
  designSpecStatus: string | null;
  hasMeasurementProfile: boolean;
  hasFabricProfile: boolean;
  fabricWidthCompatible: boolean;
  hasFabricConsumption: boolean;
  hasPatternModel: boolean;
  layoutIsValid: boolean;
  materialsIdentified: boolean;
  workflowGenerated: boolean;
  qualityPlanGenerated: boolean;
}): ProductionReadiness {
  const now = new Date().toISOString();
  const blockers: ProductionBlocker[] = [];
  const warnings: string[] = [];

  const {
    hasDesignSpec, designSpecStatus, hasMeasurementProfile,
    hasFabricProfile, fabricWidthCompatible, hasFabricConsumption,
    hasPatternModel, layoutIsValid, materialsIdentified,
    workflowGenerated, qualityPlanGenerated,
  } = opts;

  const designReady = hasDesignSpec &&
    ['validated', 'ready_for_pattern', 'ready_for_design', 'ready_for_cutting'].includes(designSpecStatus ?? '');
  const measurementsReady = hasMeasurementProfile;
  const fabricReady = hasFabricProfile && fabricWidthCompatible && hasFabricConsumption;
  const patternReady = hasPatternModel;
  const layoutReady = layoutIsValid;
  const materialsReady = materialsIdentified;
  const workflowReady = workflowGenerated;
  const qualityPlanReady = qualityPlanGenerated;

  // Blockers (blocking = must be resolved)
  if (!hasPatternModel) {
    blockers.push({
      code: 'PATTERN_NOT_DERIVED', category: 'pattern', severity: 'blocking',
      message: 'Pattern model has not been derived.',
      resolution: 'Derive pattern in Phase 15 Pattern Intelligence before generating production plan.',
    });
  }
  if (!layoutIsValid) {
    blockers.push({
      code: 'LAYOUT_INVALID', category: 'layout', severity: 'blocking',
      message: 'Cutting layout has validation errors.',
      resolution: 'Resolve layout validation errors in Phase 15 Cutting Layout before proceeding.',
    });
  }
  if (!hasFabricConsumption) {
    blockers.push({
      code: 'FABRIC_CONSUMPTION_MISSING', category: 'fabric', severity: 'blocking',
      message: 'Fabric consumption has not been calculated.',
      resolution: 'Generate production plan to calculate fabric requirement.',
    });
  }
  if (!fabricWidthCompatible && hasFabricProfile) {
    blockers.push({
      code: 'FABRIC_WIDTH_INCOMPATIBLE', category: 'fabric', severity: 'blocking',
      message: 'Fabric usable width cannot accommodate the cutting layout.',
      resolution: 'Select wider fabric, regenerate cutting layout for narrower fabric, or modify garment design.',
    });
  }

  // Warnings (attention_required — can proceed but tailor should review)
  if (!designReady) {
    warnings.push('Design specification is not in validated status.');
    blockers.push({
      code: 'DESIGN_NOT_VALIDATED', category: 'design', severity: 'warning',
      message: 'Design specification should be in validated or ready_for_pattern status.',
      resolution: 'Validate design specification in Phase 14 Design Intelligence.',
    });
  }
  if (!hasMeasurementProfile) {
    warnings.push('No measurement profile linked to design specification.');
    blockers.push({
      code: 'MEASUREMENTS_NOT_VALIDATED', category: 'measurement', severity: 'warning',
      message: 'No validated measurement profile available.',
      resolution: 'Create and validate measurement profile in Phase 13 Measurement Intelligence.',
    });
  }
  if (!hasFabricProfile) {
    warnings.push('No fabric profile linked. Fabric calculations use conservative system defaults.');
    blockers.push({
      code: 'FABRIC_PROFILE_MISSING', category: 'fabric', severity: 'warning',
      message: 'Fabric profile not available. Consumption calculated with system defaults.',
      resolution: 'Complete Fabric Profile in Phase 14 Design Intelligence for accurate calculations.',
    });
  }
  if (!materialsIdentified) {
    warnings.push('Material requirements have not been fully identified.');
  }
  if (!workflowGenerated) {
    warnings.push('Production workflow has not been generated.');
  }

  // Determine overall status
  const hasBlocking = blockers.some((b) => b.severity === 'blocking');
  const hasWarnings = blockers.some((b) => b.severity === 'warning') || warnings.length > 0;

  let overallStatus: ProductionReadiness['overallStatus'];
  if (hasBlocking) overallStatus = 'blocked';
  else if (hasWarnings) overallStatus = 'attention_required';
  else overallStatus = 'ready';

  return {
    overallStatus,
    designReady,
    measurementsReady,
    fabricReady,
    patternReady,
    layoutReady,
    materialsReady,
    workflowReady,
    qualityPlanReady,
    blockers,
    warnings,
    calculatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Traceability builder
// ---------------------------------------------------------------------------

function buildTraceability(
  spec: DesignSpecification,
  model: PatternModel | null,
  layout: CuttingLayout,
  fabricProfile: FabricProfile | null,
): ProductionTraceability {
  return {
    designSpecificationId: spec.id,
    designSpecificationVersion: spec.version,
    measurementProfileId: spec.measurementProfileId ?? null,
    measurementProfileVersion: spec.measurementContext
      ? (spec.measurementContext as { profileVersion?: number }).profileVersion ?? null
      : null,
    fabricProfileId: fabricProfile?.id ?? null,
    patternModelId: model?.id ?? null,
    patternModelVersion: model?.version ?? null,
    cuttingLayoutId: layout.id,
    cuttingLayoutAlgorithmVersion: layout.algorithmVersion,
    fabricCalculationVersion: CALC_VERSION,
    generatedAt: new Date().toISOString(),
    isStale: false,
    staleReasons: [],
  };
}

// ---------------------------------------------------------------------------
// Main production plan generator
// ---------------------------------------------------------------------------

export interface GeneratePlanInput {
  customerId: string;
  workspaceId: string;
  designSpec: DesignSpecification;
  patternModel: PatternModel | null;
  cuttingLayout: CuttingLayout;
  fabricProfile?: FabricProfile | null;
  availableFabricCm?: number | null;
  shrinkageOverridePercent?: number | null;
  safetyBufferOverridePercent?: number | null;
  nominalWidthCm?: number | null;
  notes?: string;
}

export async function generateProductionPlan(input: GeneratePlanInput): Promise<ProductionPlan> {
  const now = new Date().toISOString();
  const planId = generateId();

  // 1. Fabric consumption (Phase 16 authoritative calculation)
  const consumption = calculateFabricConsumption({
    customerId: input.customerId,
    workspaceId: input.workspaceId,
    designSpecificationId: input.designSpec.id,
    patternModelId: input.patternModel?.id ?? null,
    cuttingLayout: input.cuttingLayout,
    fabricProfile: input.fabricProfile ?? null,
    nominalWidthCmOverride: input.nominalWidthCm ?? null,
    shrinkageOverridePercent: input.shrinkageOverridePercent ?? null,
    safetyBufferOverridePercent: input.safetyBufferOverridePercent ?? null,
  });

  // 2. Purchasing recommendation
  const purchasingRecommendation = buildPurchasingRecommendation(consumption, {
    availableFabricCm: input.availableFabricCm ?? null,
  });

  // 3. Material requirements
  const garmentCategory = input.designSpec.garment?.category ?? 'custom';
  const materials = input.patternModel
    ? deriveMaterialRequirements(planId, garmentCategory, input.designSpec, input.patternModel)
    : [];

  // 4. Cutting execution plan + workflow + QC
  const workflow = generateProductionWorkflow(
    planId,
    garmentCategory,
    input.cuttingLayout,
    consumption,
  );

  // 5. Production readiness
  const readiness = computeProductionReadiness({
    hasDesignSpec: true,
    designSpecStatus: input.designSpec.status,
    hasMeasurementProfile: !!input.designSpec.measurementProfileId,
    hasFabricProfile: !!(input.fabricProfile),
    fabricWidthCompatible: consumption.widthProfile.isCompatible,
    hasFabricConsumption: true,
    hasPatternModel: !!input.patternModel,
    layoutIsValid: input.cuttingLayout.isValid,
    materialsIdentified: materials.length > 0,
    workflowGenerated: workflow.operations.length > 0,
    qualityPlanGenerated: workflow.qualityCheckpoints.length > 0,
  });

  // 6. Traceability
  const traceability = buildTraceability(
    input.designSpec,
    input.patternModel,
    input.cuttingLayout,
    input.fabricProfile ?? null,
  );

  // 7. Determine plan status
  let planStatus: ProductionPlan['status'];
  switch (readiness.overallStatus) {
    case 'blocked': planStatus = 'blocked'; break;
    case 'attention_required': planStatus = 'attention_required'; break;
    default: planStatus = 'draft'; break;
  }

  const plan: ProductionPlan = {
    id: planId,
    workspaceId: input.workspaceId,
    customerId: input.customerId,
    designSpecificationId: input.designSpec.id,
    patternModelId: input.patternModel?.id ?? null,
    cuttingLayoutId: input.cuttingLayout.id,
    fabricConsumption: consumption,
    purchasingRecommendation,
    materials,
    cuttingExecutionPlan: workflow.cuttingExecutionPlan,
    operations: workflow.operations,
    estimatedTotalTimeMinMinutes: workflow.estimatedTotalTimeMinMinutes,
    estimatedTotalTimeExpectedMinutes: workflow.estimatedTotalTimeExpectedMinutes,
    estimatedTotalTimeMaxMinutes: workflow.estimatedTotalTimeMaxMinutes,
    qualityCheckpoints: workflow.qualityCheckpoints,
    readiness,
    status: planStatus,
    traceability,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // 8. Persist offline-first
  await saveFabricConsumptionLocally(consumption);
  await db.productionPlansV16.put({
    ...plan,
    workspaceId: input.workspaceId,
    deletedAt: null,
    localUpdatedAt: now,
  });

  return plan;
}

/** Load production plan from Dexie. */
export async function loadProductionPlan(
  id: string,
  workspaceId: string,
): Promise<ProductionPlan | null> {
  const row = await db.productionPlansV16
    .where('[workspaceId+id]')
    .equals([workspaceId, id])
    .first();
  return row ? (row as unknown as ProductionPlan) : null;
}

/** List production plans for a customer. */
export async function listLocalProductionPlans(
  customerId: string,
  workspaceId: string,
): Promise<ProductionPlan[]> {
  const rows = await db.productionPlansV16
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();
  return (rows as unknown as Array<ProductionPlan & { deletedAt?: string | null }>)
    .filter((r) => r.customerId === customerId && !r.deletedAt);
}

/** Mark a production plan as stale when inputs change. */
export async function markPlanStale(
  id: string,
  workspaceId: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.productionPlansV16
    .where('[workspaceId+id]')
    .equals([workspaceId, id])
    .modify({
      status: 'attention_required',
      updatedAt: now,
      localUpdatedAt: now,
      'traceability.isStale': true,
      'traceability.staleReasons': [reason],
    });
}
