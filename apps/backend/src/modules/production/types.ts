/**
 * Phase 16 — Fabric & Production Intelligence domain contracts.
 *
 * ARCHITECTURAL BOUNDARIES:
 * - Phase 16 consumes Phase 15 layoutEnvelopeCm as the geometric base.
 * - Phase 16 is the AUTHORITATIVE Fabric Requirement layer.
 * - Phase 15 outputs "CUTTING LAYOUT LENGTH" (geometry).
 * - Phase 16 outputs "FABRIC REQUIRED" (real-world purchasing quantity).
 * - productionAssistant.ts is NEVER called from Phase 16 — ZERO DIFF.
 * - patternEngine.ts is NEVER called from Phase 16 — ZERO DIFF.
 * - All assumption sources are explicit and visible.
 * - No silent defaults. Tailor is authoritative.
 * - Offline-capable: all core calculations are pure functions.
 * - Pattern matching geometry is NEVER falsely claimed as auto-solved.
 */

// ---------------------------------------------------------------------------
// Allowance source provenance
// ---------------------------------------------------------------------------

export type AllowanceSource =
  | 'fabric_profile'       // From FabricProfile data
  | 'material_default'     // Fabric type lookup default
  | 'system_default'       // Conservative system fallback
  | 'manual_override';     // Tailor explicitly overrode

export type AllowanceConfidence = 'high' | 'medium' | 'low';

// ---------------------------------------------------------------------------
// Fabric width intelligence
// ---------------------------------------------------------------------------

export interface FabricWidthProfile {
  /** Nominal width as stated on fabric / from FabricProfile (cm). */
  nominalWidthCm: number;
  /** Left selvedge trim (cm). */
  leftSelvedgeCm: number;
  /** Right selvedge trim (cm). */
  rightSelvedgeCm: number;
  /** Usable width = nominal − left − right (cm). */
  usableWidthCm: number;
  /** Width tolerance (cm). */
  widthToleranceCm: number;
  /** Source of nominal width. */
  widthSource: AllowanceSource;
  /** Whether usable width can accommodate the layout. */
  isCompatible: boolean;
  /** Layout requires this width minimum. */
  layoutRequiredWidthCm: number;
}

// ---------------------------------------------------------------------------
// Shrinkage allowance
// ---------------------------------------------------------------------------

export interface ShrinkageAllowance {
  /** Shrinkage percentage (e.g. 5 = 5%). */
  percentage: number;
  /** Length added to account for post-wash shrinkage (cm). */
  valueCm: number;
  source: AllowanceSource;
  confidence: AllowanceConfidence;
  /** Fabric type that determined the default (if source = material_default). */
  fabricType?: string | null;
}

// ---------------------------------------------------------------------------
// Pattern matching assessment
// ---------------------------------------------------------------------------

/**
 * Phase 16 pattern matching policy.
 * Phase 15 flagged pattern matching as MANUAL VERIFICATION REQUIRED.
 * Phase 16 applies a conservative allowance — never claims automatic alignment.
 */
export type PatternMatchingVerification =
  | 'not_required'
  | 'manual_required'   // Phase 15 set patternMatchingManualVerificationRequired
  | 'verified';         // Tailor explicitly confirmed (future capability)

export interface PatternMatchingAssessment {
  required: boolean;
  automatedVerification: PatternMatchingVerification;
  /** Conservative allowance percentage applied (e.g. 15 = 15%). */
  allowancePercentage: number;
  /** Length added for pattern repeat matching (cm). */
  allowanceCm: number;
  /** Pattern repeat size if known (from FabricProfile). */
  repeatSizeCm: number | null;
  source: AllowanceSource;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Directional fabric allowance
// ---------------------------------------------------------------------------

export interface DirectionalAllowance {
  required: boolean;
  /** Allowance percentage for reduced rotation flexibility (e.g. 10 = 10%). */
  allowancePercentage: number;
  allowanceCm: number;
  source: AllowanceSource;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Handling waste & safety buffer
// ---------------------------------------------------------------------------

export interface HandlingWasteAllowance {
  /** Percentage for defects, edge damage, recutting (e.g. 3 = 3%). */
  percentage: number;
  valueCm: number;
  source: AllowanceSource;
}

export interface SafetyBuffer {
  /** Conservative production margin percentage (e.g. 5 = 5%). */
  percentage: number;
  valueCm: number;
  source: AllowanceSource;
}

// ---------------------------------------------------------------------------
// Fabric allowance policy
// ---------------------------------------------------------------------------

/**
 * The configurable policy applied during fabric consumption calculation.
 * All fields are visible to the tailor — no hidden values.
 */
export interface FabricAllowancePolicy {
  shrinkagePercent: number;
  patternMatchingPercent: number;
  directionalPercent: number;
  handlingWastePercent: number;
  safetyBufferPercent: number;
  policyVersion: string;
}

export const DEFAULT_ALLOWANCE_POLICY: FabricAllowancePolicy = {
  shrinkagePercent: 3,        // Override per fabric type
  patternMatchingPercent: 15, // When requiresMatching
  directionalPercent: 10,     // When directional
  handlingWastePercent: 3,    // Always applied
  safetyBufferPercent: 5,     // Always applied
  policyVersion: '1.0.0',
};

// ---------------------------------------------------------------------------
// Fabric consumption breakdown — all intermediates visible
// ---------------------------------------------------------------------------

export interface FabricConsumptionBreakdown {
  /** Phase 15 geometric output (base for all calculations). */
  layoutEnvelopeCm: number;
  /** After shrinkage allowance applied. */
  afterShrinkageCm: number;
  shrinkageAllowanceCm: number;
  /** After selvedge adjustment. */
  afterSelvedgeCm: number;
  selvedgeAllowanceCm: number;
  /** After pattern matching allowance. */
  afterPatternMatchingCm: number;
  patternMatchingAllowanceCm: number;
  /** After directional allowance. */
  afterDirectionalCm: number;
  directionalAllowanceCm: number;
  /** After handling waste. */
  afterHandlingWasteCm: number;
  handlingWasteAllowanceCm: number;
  /** After safety buffer. */
  afterSafetyBufferCm: number;
  safetyBufferCm: number;
}

// ---------------------------------------------------------------------------
// Authoritative fabric consumption record
// ---------------------------------------------------------------------------

export type FabricConsumptionConfidence = 'high' | 'medium' | 'low';

export interface FabricConsumption {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  designSpecificationId: string;
  patternModelId?: string | null;
  cuttingLayoutId: string;
  fabricProfileId?: string | null;

  // Source geometry (from Phase 15 — never recalculated here)
  layoutEnvelopeCm: number;
  layoutFabricWidthCm: number;

  // Width intelligence
  widthProfile: FabricWidthProfile;

  // Allowances (each independently visible)
  shrinkage: ShrinkageAllowance;
  patternMatching: PatternMatchingAssessment;
  directional: DirectionalAllowance;
  handlingWaste: HandlingWasteAllowance;
  safetyBuffer: SafetyBuffer;

  // Full intermediate breakdown
  breakdown: FabricConsumptionBreakdown;

  // Final authoritative requirement
  fabricRequiredCm: number;
  fabricRequiredMeters: number;
  fabricRequiredYards: number;

  // Confidence and assumptions
  confidence: FabricConsumptionConfidence;
  assumptions: string[];
  manualVerificationRequired: boolean;
  calculationVersion: string;

  // Stale detection
  isStale: boolean;
  staleReason?: string | null;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Manual override (preserves original value for traceability)
// ---------------------------------------------------------------------------

export interface ManualOverride<T> {
  originalValue: T;
  overrideValue: T;
  reason?: string | null;
  overriddenAt: string;
}

// ---------------------------------------------------------------------------
// Purchase policy
// ---------------------------------------------------------------------------

export interface PurchasePolicy {
  /** Minimum purchase quantity (cm). */
  minimumPurchaseCm?: number;
  /** Purchase must be in multiples of this (cm). e.g. 45.72 = 0.5 yard. */
  purchaseIncrementCm?: number;
  /** Whether to always round up to increment. */
  roundUpRequired: boolean;
  /** Preferred unit for display. */
  displayUnit: 'cm' | 'meter' | 'yard';
}

export const DEFAULT_PURCHASE_POLICY: PurchasePolicy = {
  purchaseIncrementCm: 45.72,  // 0.5 yard
  roundUpRequired: true,
  displayUnit: 'meter',
};

// ---------------------------------------------------------------------------
// Fabric sufficiency / purchasing
// ---------------------------------------------------------------------------

export type FabricSufficiencyStatus =
  | 'sufficient'    // available > required
  | 'insufficient'  // available < required
  | 'exact'         // available ≈ required (within 5%)
  | 'excess'        // available >> required (>50% more)
  | 'unknown';      // inventory unavailable

export interface PurchasingRecommendation {
  id: string;
  fabricConsumptionId: string;
  status: FabricSufficiencyStatus;
  requiredCm: number;
  availableCm?: number | null;
  shortageCm?: number | null;
  excessCm?: number | null;
  /** Raw calculated purchase need (cm). */
  rawPurchaseNeededCm?: number | null;
  /** Rounded up to increment (cm). */
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

// ---------------------------------------------------------------------------
// Roll / bolt utilisation
// ---------------------------------------------------------------------------

export interface FabricRoll {
  widthCm: number;
  lengthCm: number;
  quantityAvailable?: number | null;
}

export interface RollUtilisation {
  /** Whether roll data was available for calculation. */
  applicable: boolean;
  rollsRequired?: number | null;
  totalLengthPurchasedCm?: number | null;
  utilisedPercentage?: number | null;
  remainingCm?: number | null;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Fabric cost estimate (optional)
// ---------------------------------------------------------------------------

export interface FabricCostEstimate {
  applicable: boolean;
  unitPrice?: number | null;
  unit?: 'cm' | 'meter' | 'yard' | null;
  recommendedQuantity?: number | null;
  estimatedTotal?: number | null;
  currency?: string | null;
  assumptions: string[];
}

// ---------------------------------------------------------------------------
// Material requirements
// ---------------------------------------------------------------------------

export type MaterialCategory =
  | 'main_fabric'
  | 'lining'
  | 'interfacing'
  | 'thread'
  | 'button'
  | 'zipper'
  | 'elastic'
  | 'bias_tape'
  | 'hook'
  | 'other';

export type MaterialSource =
  | 'design_specification'
  | 'pattern_requirement'
  | 'garment_default'
  | 'manual';

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

// ---------------------------------------------------------------------------
// Cutting execution plan
// ---------------------------------------------------------------------------

export interface CuttingExecutionStep {
  order: number;
  code: string;
  title: string;
  description: string;
  required: boolean;
  verificationRequired: boolean;
  relatedPatternPieceIds?: string[];
}

// ---------------------------------------------------------------------------
// Production operations
// ---------------------------------------------------------------------------

export type ProductionOperationStatus =
  | 'not_started'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'skipped';

export type ProductionOperationSource =
  | 'workflow_rule'
  | 'design_component'
  | 'manual';

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
  /** IDs of operations that must complete before this one can start. */
  dependencies: string[];
  requiredSkills: string[];
  requiresCustomer: boolean;
  status: ProductionOperationStatus;
  blockingReason?: string | null;
  source: ProductionOperationSource;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Quality control
// ---------------------------------------------------------------------------

export type QualityCheckStatus =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'needs_rework'
  | 'skipped';

export type QualityCheckPhase =
  | 'cutting'
  | 'assembly'
  | 'fitting'
  | 'finishing'
  | 'final';

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

// ---------------------------------------------------------------------------
// Production readiness
// ---------------------------------------------------------------------------

export type ProductionReadinessStatus =
  | 'ready'
  | 'attention_required'
  | 'blocked';

export type BlockerCategory =
  | 'measurement'
  | 'design'
  | 'fabric'
  | 'pattern'
  | 'layout'
  | 'materials'
  | 'workflow'
  | 'quality';

export type BlockerSeverity = 'blocking' | 'warning';

export interface ProductionBlocker {
  code: string;
  category: BlockerCategory;
  severity: BlockerSeverity;
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

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

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
  /** Whether source inputs have changed since this plan was generated. */
  isStale: boolean;
  staleReasons: string[];
}

// ---------------------------------------------------------------------------
// Production plan status
// ---------------------------------------------------------------------------

export type ProductionPlanStatus =
  | 'draft'
  | 'attention_required'
  | 'ready'
  | 'in_production'
  | 'quality_control'
  | 'completed'
  | 'blocked';

// ---------------------------------------------------------------------------
// Canonical Production Plan
// ---------------------------------------------------------------------------

export interface ProductionPlan {
  id: string;
  workspaceId: string;
  customerId: string;
  designSpecificationId: string;
  patternModelId?: string | null;
  cuttingLayoutId: string;

  // Fabric Intelligence
  fabricConsumption: FabricConsumption;
  purchasingRecommendation?: PurchasingRecommendation | null;

  // Materials
  materials: MaterialRequirement[];

  // Cutting
  cuttingExecutionPlan: CuttingExecutionStep[];

  // Production workflow
  operations: ProductionOperation[];
  estimatedTotalTimeMinMinutes: number;
  estimatedTotalTimeExpectedMinutes: number;
  estimatedTotalTimeMaxMinutes: number;

  // Quality
  qualityCheckpoints: QualityCheckpoint[];

  // Readiness
  readiness: ProductionReadiness;

  status: ProductionPlanStatus;
  traceability: ProductionTraceability;
  notes?: string | null;

  createdAt: string;
  updatedAt: string;
}
