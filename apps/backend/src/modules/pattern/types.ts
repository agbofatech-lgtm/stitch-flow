/**
 * Phase 15 — Pattern & Cutting Intelligence domain contracts.
 *
 * ARCHITECTURAL BOUNDARIES:
 * - Phase 15 derives pattern pieces from Phase 14 DesignSpecification.
 * - Phase 15 computes a CUTTING LAYOUT ENVELOPE (geometric max Y + margins).
 * - Phase 15 does NOT calculate final fabric yardage — that is Phase 16.
 * - patternEngine.ts is NEVER modified — wrapped via PatternAdapter only.
 * - The tailor remains authoritative: system validates, never silently corrects.
 * - Layout length is labeled "CUTTING LAYOUT LENGTH" — never "FINAL FABRIC YARDAGE".
 * - Pattern matching geometry is never faked — flagged "manual verification required".
 * - Measurement defaults are never silently applied — always offered explicitly.
 */

// ---------------------------------------------------------------------------
// Pattern Piece
// ---------------------------------------------------------------------------

export type GrainlineDirection = 'lengthwise' | 'crosswise' | 'bias' | 'any';
export type PieceConstraint = 'cut_on_fold' | 'mirror' | 'directional' | 'none';

/** A polygon point in pattern/layout space (cm). */
export interface PatternPoint {
  x: number;
  y: number;
}

/** Bounding box derived from the outline polygon. */
export interface BoundingBox {
  /** Width of the bounding box (cm). */
  widthCm: number;
  /** Height of the bounding box (cm). */
  heightCm: number;
  /** Area for informational display only — NOT used for layout length. */
  areaCm2: number;
}

/**
 * A single pattern piece derived from the pattern engine output.
 * Geometry is in cm. bounding box is always present.
 * outline polygon is present when the engine provides it (all generic drafts).
 */
export interface PatternPiece {
  /** Stable piece ID within this model version. */
  id: string;
  /** Human label, e.g. "Front panel", "Back leg". */
  name: string;
  /** How many times this piece is cut (e.g. 2 = cut two). */
  quantity: number;
  /** Polygon outline in cm (origin = top-left). Empty for bodice control-point pieces. */
  outlineCm: PatternPoint[];
  /** Always present bounding box. */
  boundingBox: BoundingBox;
  /** Seam allowance in cm (from engine, recorded as metadata). */
  seamAllowanceCm: number;
  /** Applied ease in cm for this piece, if any. */
  appliedEaseCm?: number | null;
  /** Grainline direction constraint. */
  grainline: GrainlineDirection;
  /** Mirror / fold / directional constraints. */
  constraints: PieceConstraint[];
  /** Fabric direction required (from FabricProfile). */
  requiresDirectionalFabric: boolean;
  /** Pattern matching required (from FabricProfile). */
  requiresPatternMatching: boolean;
  /** If true, tiler flagged that pattern matching geometry is unavailable. */
  patternMatchingManualVerificationRequired: boolean;
  /** Tailor-visible construction notes for this piece. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// Measurement Completeness Validation
// ---------------------------------------------------------------------------

export type MissingMeasurementSeverity = 'required' | 'recommended' | 'optional';

export interface MissingMeasurement {
  code: string;
  label: string;
  severity: MissingMeasurementSeverity;
  /** Engine default that WOULD be used if the tailor accepts the estimate. */
  engineDefaultCm: number | null;
  /** Explicit hint shown to the tailor. */
  hint: string;
}

export interface MeasurementCompletenessResult {
  complete: boolean;
  missing: MissingMeasurement[];
  /** Codes that have a value but fall outside soft range — informational, not blocking. */
  outOfRangeCodes: string[];
  /** Whether the engine has enough data to run (may use defaults). */
  engineCanRun: boolean;
}

// ---------------------------------------------------------------------------
// Ease Application
// ---------------------------------------------------------------------------

export type EaseArea = 'chest' | 'waist' | 'hip' | 'bicep' | 'sleeve' | 'length';
export type EaseSource = 'design_spec' | 'fit_type' | 'garment_type_default' | 'tailor_override';

export interface AppliedEase {
  area: EaseArea;
  /** cm added to the raw body measurement before engine call. */
  valueCm: number;
  source: EaseSource;
  /** Traceability: which Phase 14 EaseConfiguration id, if applicable. */
  fromDesignSpecId?: string | null;
}

// ---------------------------------------------------------------------------
// Pattern Derivation Context (adapter input → engine call)
// ---------------------------------------------------------------------------

export interface PatternDerivationContext {
  /** Phase 14 DesignSpecification ID. */
  designSpecId: string;
  /** Phase 13 measurement profile ID. */
  measurementProfileId: string;
  /** Measurement profile version number (immutable snapshot reference). */
  measurementProfileVersion: number;
  /** Garment kind passed to the pattern engine. */
  engineKind: string;
  /** Phase 14 category (pre-mapping). */
  garmentCategory: string;
  /** Measurements actually passed to the engine (after ease application). */
  measurementsUsed: Record<string, number>;
  /** Ease applied before engine call. */
  easeApplied: AppliedEase[];
  /** Measurements that used engine defaults (tailor was presented with offer). */
  defaultsAccepted: Array<{ code: string; defaultCm: number }>;
  /** Tailor-accepted overrides (manually entered). */
  tailorOverrides: Array<{ code: string; valueCm: number }>;
  /** Any warnings generated during derivation. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Pattern Model — persisted result
// ---------------------------------------------------------------------------

export type PatternModelStatus =
  | 'draft'
  | 'derived'
  | 'validated'
  | 'ready_for_cutting'
  | 'superseded';

export interface PatternModel {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  name: string;
  version: number;
  /** Immutable reference — which design spec generated this model. */
  designSpecificationId: string;
  /** Immutable reference — measurement snapshot used. */
  measurementProfileId: string;
  measurementProfileVersion: number;
  /** The garment kind derived. */
  garmentCategory: string;
  /** All pattern pieces derived. */
  pieces: PatternPiece[];
  /** Full derivation context (traceability). */
  derivationContext: PatternDerivationContext;
  /** Measurement completeness at derivation time. */
  measurementCompleteness: MeasurementCompletenessResult;
  /** Raw engine kind string passed to patternEngine.ts. */
  engineKind: string;
  status: PatternModelStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cutting Layout — placed pieces
// ---------------------------------------------------------------------------

export interface PlacedPiece {
  /** Reference to PatternPiece.id. */
  pieceId: string;
  /** Which copy this is (1-based, when quantity > 1). */
  copy: number;
  /** X position of top-left corner on layout (cm). */
  xCm: number;
  /** Y position of top-left corner on layout (cm). */
  yCm: number;
  /** Rotation applied (0 or 180 for reversible pieces; 0 for directional). */
  rotationDeg: number;
  /** Whether the piece is flipped (mirror constraint). */
  flipped: boolean;
  /** Effective bounding box width after rotation. */
  effectiveWidthCm: number;
  /** Effective bounding box height after rotation. */
  effectiveHeightCm: number;
}

export type LayoutValidationSeverity = 'error' | 'warning' | 'info';

export interface LayoutValidationIssue {
  severity: LayoutValidationSeverity;
  code: string;
  message: string;
  /** Piece ID(s) involved, if applicable. */
  pieceIds?: string[];
}

/**
 * Cutting Layout.
 *
 * IMPORTANT: layoutEnvelopeCm = max occupied Y + margins.
 * This is a CUTTING LAYOUT LENGTH, NOT final fabric yardage.
 * Phase 16 owns the authoritative fabric consumption calculation.
 */
export interface CuttingLayout {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  /** Parent pattern model. */
  patternModelId: string;
  /** Fabric profile used for constraints (width, directional, matching). */
  fabricProfileId?: string | null;
  /** Fabric width used for layout computation (cm). */
  layoutWidthCm: number;
  /**
   * CUTTING LAYOUT ENVELOPE LENGTH.
   * = max occupied Y position of any placed piece + bottom margin.
   * NOT final fabric yardage. NOT area ÷ width.
   * Phase 16 adds waste, selvedge, and repeat matching to produce yardage.
   */
  layoutEnvelopeCm: number;
  /** Top and bottom margin added to the envelope (cm). */
  marginCm: number;
  /** All placed pieces with positions. */
  placedPieces: PlacedPiece[];
  /** Layout validation results. */
  validationIssues: LayoutValidationIssue[];
  /** Whether the layout passed all error-level checks. */
  isValid: boolean;
  /** Layout algorithm used (always 'greedy_deterministic' in phase 15). */
  algorithm: 'greedy_deterministic';
  /** Algorithm version for reproducibility. */
  algorithmVersion: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cutting Instruction — per piece
// ---------------------------------------------------------------------------

export interface CuttingInstruction {
  pieceId: string;
  pieceName: string;
  quantity: number;
  /** Layout position reference. */
  layoutPosition?: { xCm: number; yCm: number } | null;
  seamAllowanceCm: number;
  grainline: GrainlineDirection;
  constraints: PieceConstraint[];
  /** Step-by-step cutting notes for this piece. */
  steps: string[];
  warnings: string[];
}

export interface CuttingInstructionSet {
  id: string;
  workspaceId: string;
  patternModelId: string;
  cuttingLayoutId?: string | null;
  fabricProfileId?: string | null;
  instructions: CuttingInstruction[];
  /** Preamble shown before the piece-by-piece instructions. */
  preamble: string[];
  /** Post-cutting checks (e.g. mark notches, label pieces). */
  postCuttingChecks: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Traceability Chain
// ---------------------------------------------------------------------------

export interface PatternTraceabilityChain {
  customerId: string;
  measurementProfileId: string;
  measurementProfileVersion: number;
  designSpecificationId: string;
  designSpecificationVersion: number;
  patternModelId: string;
  patternModelVersion: number;
  cuttingLayoutId?: string | null;
  /** ISO timestamps for each transition. */
  measuredAt?: string | null;
  designedAt?: string | null;
  patternDerivedAt?: string | null;
  layoutComputedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Pattern Readiness Report
// ---------------------------------------------------------------------------

export interface PatternReadinessItem {
  key: string;
  label: string;
  satisfied: boolean;
  warning?: string | null;
}

export type PatternReadinessStatus =
  | 'no_design_spec'
  | 'measurements_incomplete'
  | 'measurements_need_defaults'
  | 'ready_for_pattern'
  | 'pattern_derived'
  | 'ready_for_cutting';

export interface PatternReadinessReport {
  status: PatternReadinessStatus;
  items: PatternReadinessItem[];
  canDerivePattern: boolean;
  canComputeLayout: boolean;
  missingMeasurements: MissingMeasurement[];
}

// ---------------------------------------------------------------------------
// Phase 15 → Phase 16 Handoff Contract
// ---------------------------------------------------------------------------

/**
 * What Phase 15 hands to Phase 16.
 * Phase 16 must NOT be implemented until phase-15-complete is certified.
 */
export interface Phase15HandoffData {
  patternModelId: string;
  cuttingLayoutId: string;
  /** CUTTING LAYOUT ENVELOPE — NOT final yardage. */
  layoutEnvelopeCm: number;
  /** Fabric width used for layout. */
  layoutWidthCm: number;
  /** Whether pattern matching is required (Phase 16 adds repeat allowance). */
  hasPatternMatching: boolean;
  /** Pattern repeat distance in cm if known (else null — Phase 16 must verify). */
  patternRepeatCm: number | null;
  /** Whether fabric is directional. */
  isDirectional: boolean;
  /** The placed pieces list (Phase 16 may refine layout). */
  placedPieces: PlacedPiece[];
  traceability: PatternTraceabilityChain;
}
