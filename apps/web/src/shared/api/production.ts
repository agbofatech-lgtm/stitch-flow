/**
 * Phase 16 — Fabric & Production Intelligence API client + domain types.
 *
 * CRITICAL BOUNDARIES:
 * - layoutEnvelopeCm (Phase 15) = CUTTING LAYOUT LENGTH (geometry)
 * - fabricRequiredCm (Phase 16) = AUTHORITATIVE FABRIC REQUIREMENT (real-world)
 * - productionAssistant.ts is NEVER called — ZERO DIFF
 * - patternEngine.ts is NEVER called — ZERO DIFF
 * - All assumption sources are visible
 * - Pattern matching never claimed as auto-solved
 */

import { apiGet, apiPost, apiPatch } from '../utils/api';

// ---------------------------------------------------------------------------
// Re-exported domain types (mirror backend types.ts)
// ---------------------------------------------------------------------------

export type AllowanceSource =
  | 'fabric_profile'
  | 'material_default'
  | 'system_default'
  | 'manual_override';

export type AllowanceConfidence = 'high' | 'medium' | 'low';

export interface FabricWidthProfile {
  nominalWidthCm: number;
  leftSelvedgeCm: number;
  rightSelvedgeCm: number;
  usableWidthCm: number;
  widthToleranceCm: number;
  widthSource: AllowanceSource;
  isCompatible: boolean;
  layoutRequiredWidthCm: number;
}

export interface ShrinkageAllowance {
  percentage: number;
  valueCm: number;
  source: AllowanceSource;
  confidence: AllowanceConfidence;
  fabricType?: string | null;
}

export type PatternMatchingVerification = 'not_required' | 'manual_required' | 'verified';

export interface PatternMatchingAssessment {
  required: boolean;
  automatedVerification: PatternMatchingVerification;
  allowancePercentage: number;
  allowanceCm: number;
  repeatSizeCm: number | null;
  source: AllowanceSource;
  notes: string[];
}

export interface DirectionalAllowance {
  required: boolean;
  allowancePercentage: number;
  allowanceCm: number;
  source: AllowanceSource;
  notes: string[];
}

export interface HandlingWasteAllowance {
  percentage: number;
  valueCm: number;
  source: AllowanceSource;
}

export interface SafetyBuffer {
  percentage: number;
  valueCm: number;
  source: AllowanceSource;
}

export interface FabricConsumptionBreakdown {
  layoutEnvelopeCm: number;
  afterShrinkageCm: number;
  shrinkageAllowanceCm: number;
  afterSelvedgeCm: number;
  selvedgeAllowanceCm: number;
  afterPatternMatchingCm: number;
  patternMatchingAllowanceCm: number;
  afterDirectionalCm: number;
  directionalAllowanceCm: number;
  afterHandlingWasteCm: number;
  handlingWasteAllowanceCm: number;
  afterSafetyBufferCm: number;
  safetyBufferCm: number;
}

export type FabricConsumptionConfidence = 'high' | 'medium' | 'low';

export interface FabricConsumption {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  designSpecificationId: string;
  patternModelId?: string | null;
  cuttingLayoutId: string;
  fabricProfileId?: string | null;
  layoutEnvelopeCm: number;
  layoutFabricWidthCm: number;
  widthProfile: FabricWidthProfile;
  shrinkage: ShrinkageAllowance;
  patternMatching: PatternMatchingAssessment;
  directional: DirectionalAllowance;
  handlingWaste: HandlingWasteAllowance;
  safetyBuffer: SafetyBuffer;
  breakdown: FabricConsumptionBreakdown;
  fabricRequiredCm: number;
  fabricRequiredMeters: number;
  fabricRequiredYards: number;
  confidence: FabricConsumptionConfidence;
  assumptions: string[];
  manualVerificationRequired: boolean;
  calculationVersion: string;
  isStale: boolean;
  staleReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePolicy {
  minimumPurchaseCm?: number;
  purchaseIncrementCm?: number;
  roundUpRequired: boolean;
  displayUnit: 'cm' | 'meter' | 'yard';
}

export type FabricSufficiencyStatus =
  | 'sufficient'
  | 'insufficient'
  | 'exact'
  | 'excess'
  | 'unknown';

export interface PurchasingRecommendation {
  id: string;
  fabricConsumptionId: string;
  status: FabricSufficiencyStatus;
  requiredCm: number;
  availableCm?: number | null;
  shortageCm?: number | null;
  excessCm?: number | null;
  rawPurchaseNeededCm?: number | null;
  recommendedPurchaseCm?: number | null;
  recommendedPurchaseMeters?: number | null;
  recommendedPurchaseYards?: number | null;
  purchaseRoundingReason?: string | null;
  purchasePolicy: PurchasePolicy;
  estimatedCost?: number | null;
  currency?: string | null;
  reasons: string[];
  assumptions: string[];
  createdAt: string;
}

export interface FabricRoll {
  widthCm: number;
  lengthCm: number;
  quantityAvailable?: number | null;
}

export interface RollUtilisation {
  applicable: boolean;
  rollsRequired?: number | null;
  totalLengthPurchasedCm?: number | null;
  utilisedPercentage?: number | null;
  remainingCm?: number | null;
  reason?: string | null;
}

export interface FabricCostEstimate {
  applicable: boolean;
  unitPrice?: number | null;
  unit?: 'cm' | 'meter' | 'yard' | null;
  recommendedQuantity?: number | null;
  estimatedTotal?: number | null;
  currency?: string | null;
  assumptions: string[];
}

export type MaterialCategory =
  | 'main_fabric' | 'lining' | 'interfacing' | 'thread'
  | 'button' | 'zipper' | 'elastic' | 'bias_tape' | 'hook' | 'other';

export type MaterialSource =
  | 'design_specification' | 'pattern_requirement' | 'garment_default' | 'manual';

export interface MaterialRequirement {
  id: string;
  productionPlanId?: string | null;
  category: MaterialCategory;
  name: string;
  quantity: number;
  unit: string;
  source: MaterialSource;
  confidence: AllowanceConfidence;
  required: boolean;
  notes?: string | null;
}

export interface CuttingExecutionStep {
  order: number;
  code: string;
  title: string;
  description: string;
  required: boolean;
  verificationRequired: boolean;
  relatedPatternPieceIds?: string[];
}

export type ProductionOperationStatus =
  | 'not_started' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface ProductionTimeEstimate {
  minimumMinutes: number;
  expectedMinutes: number;
  maximumMinutes: number;
  confidence: AllowanceConfidence;
  factors: string[];
}

export interface ProductionOperation {
  id: string;
  productionPlanId: string;
  code: string;
  name: string;
  description: string;
  order: number;
  timeEstimate: ProductionTimeEstimate;
  dependencies: string[];
  requiredSkills: string[];
  requiresCustomer: boolean;
  status: ProductionOperationStatus;
  blockingReason?: string | null;
  source: 'workflow_rule' | 'design_component' | 'manual';
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export type QualityCheckStatus =
  | 'pending' | 'passed' | 'failed' | 'needs_rework' | 'skipped';

export type QualityCheckPhase =
  | 'cutting' | 'assembly' | 'fitting' | 'finishing' | 'final';

export interface QualityCheckpoint {
  id: string;
  productionPlanId: string;
  operationId?: string | null;
  phase: QualityCheckPhase;
  code: string;
  name: string;
  description: string;
  required: boolean;
  status: QualityCheckStatus;
  failureReason?: string | null;
  notes?: string | null;
  checkedBy?: string | null;
  checkedAt?: string | null;
}

export type ProductionReadinessStatus = 'ready' | 'attention_required' | 'blocked';

export interface ProductionBlocker {
  code: string;
  category: 'measurement' | 'design' | 'fabric' | 'pattern' | 'layout' | 'materials' | 'workflow' | 'quality';
  severity: 'blocking' | 'warning';
  message: string;
  resolution: string;
}

export interface ProductionReadiness {
  overallStatus: ProductionReadinessStatus;
  designReady: boolean;
  measurementsReady: boolean;
  fabricReady: boolean;
  patternReady: boolean;
  layoutReady: boolean;
  materialsReady: boolean;
  workflowReady: boolean;
  qualityPlanReady: boolean;
  blockers: ProductionBlocker[];
  warnings: string[];
  calculatedAt: string;
}

export interface ProductionTraceability {
  designSpecificationId: string;
  designSpecificationVersion?: number | null;
  measurementProfileId?: string | null;
  measurementProfileVersion?: number | null;
  fabricProfileId?: string | null;
  patternModelId?: string | null;
  patternModelVersion?: number | null;
  cuttingLayoutId: string;
  cuttingLayoutAlgorithmVersion?: string | null;
  fabricCalculationVersion: string;
  generatedAt: string;
  isStale: boolean;
  staleReasons: string[];
}

export type ProductionPlanStatus =
  | 'draft' | 'attention_required' | 'ready' | 'in_production'
  | 'quality_control' | 'completed' | 'blocked';

export interface ProductionPlan {
  id: string;
  workspaceId: string;
  customerId: string;
  designSpecificationId: string;
  patternModelId?: string | null;
  cuttingLayoutId: string;
  fabricConsumption: FabricConsumption;
  purchasingRecommendation?: PurchasingRecommendation | null;
  materials: MaterialRequirement[];
  cuttingExecutionPlan: CuttingExecutionStep[];
  operations: ProductionOperation[];
  estimatedTotalTimeMinMinutes: number;
  estimatedTotalTimeExpectedMinutes: number;
  estimatedTotalTimeMaxMinutes: number;
  qualityCheckpoints: QualityCheckpoint[];
  readiness: ProductionReadiness;
  status: ProductionPlanStatus;
  traceability: ProductionTraceability;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Generate plan input
// ---------------------------------------------------------------------------

export interface GenerateProductionPlanInput {
  customerId: string;
  designSpecificationId: string;
  cuttingLayoutId: string;
  patternModelId?: string;
  fabricProfileId?: string;
  /** Available fabric quantity from customer (cm). */
  availableFabricCm?: number;
  /** Tailor override for shrinkage %. */
  shrinkageOverridePercent?: number;
  /** Tailor override for safety buffer %. */
  safetyBufferOverridePercent?: number;
  /** Nominal fabric width if not from FabricProfile (cm). */
  nominalWidthCm?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

const ppBase = () => `/production-plans`;

export async function listProductionPlans(customerId: string): Promise<ProductionPlan[]> {
  const d = await apiGet<{ productionPlans: ProductionPlan[] }>(
    `${ppBase()}?customerId=${customerId}`,
  );
  return d.productionPlans;
}

export async function getProductionPlan(id: string): Promise<ProductionPlan> {
  const d = await apiGet<{ productionPlan: ProductionPlan }>(`${ppBase()}/${id}`);
  return d.productionPlan;
}

export async function generateProductionPlan(
  input: GenerateProductionPlanInput,
): Promise<ProductionPlan> {
  const d = await apiPost<{ productionPlan: ProductionPlan }>(ppBase(), input);
  return d.productionPlan;
}

export async function updateOperationStatus(
  planId: string,
  operationId: string,
  status: ProductionOperationStatus,
  notes?: string,
): Promise<ProductionPlan> {
  const d = await apiPatch<{ productionPlan: ProductionPlan }>(
    `${ppBase()}/${planId}/operations/${operationId}`,
    { status, notes },
  );
  return d.productionPlan;
}

export async function updateQualityCheckpoint(
  planId: string,
  checkpointId: string,
  status: QualityCheckStatus,
  failureReason?: string,
  notes?: string,
): Promise<ProductionPlan> {
  const d = await apiPatch<{ productionPlan: ProductionPlan }>(
    `${ppBase()}/${planId}/quality/${checkpointId}`,
    { status, failureReason, notes },
  );
  return d.productionPlan;
}

export async function getFabricConsumption(planId: string): Promise<FabricConsumption> {
  const d = await apiGet<{ fabricConsumption: FabricConsumption }>(
    `${ppBase()}/${planId}/fabric-consumption`,
  );
  return d.fabricConsumption;
}

export async function getPurchasingRecommendation(
  planId: string,
): Promise<PurchasingRecommendation> {
  const d = await apiGet<{ recommendation: PurchasingRecommendation }>(
    `${ppBase()}/${planId}/purchasing`,
  );
  return d.recommendation;
}

export async function getProductionReadiness(planId: string): Promise<ProductionReadiness> {
  const d = await apiGet<{ readiness: ProductionReadiness }>(`${ppBase()}/${planId}/readiness`);
  return d.readiness;
}

export async function getProductionTraceability(
  planId: string,
): Promise<ProductionTraceability> {
  const d = await apiGet<{ traceability: ProductionTraceability }>(
    `${ppBase()}/${planId}/traceability`,
  );
  return d.traceability;
}
