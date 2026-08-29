/**
 * Phase 15 — Pattern & Cutting Intelligence API client + domain types.
 *
 * ARCHITECTURAL NOTES:
 * - All types mirror apps/backend/src/modules/pattern/types.ts
 * - Layout envelope = max occupied Y + margins — NOT area ÷ width.
 * - "CUTTING LAYOUT LENGTH" is the correct label — never "FINAL FABRIC YARDAGE".
 * - Phase 16 owns authoritative fabric consumption / yardage.
 * - patternEngine.ts is wrapped externally — never modified.
 */

import { apiGet, apiPost, apiPatch } from '../utils/api';

// ---------------------------------------------------------------------------
// Re-export shared types (mirrors backend contract)
// ---------------------------------------------------------------------------

export type GrainlineDirection = 'lengthwise' | 'crosswise' | 'bias' | 'any';
export type PieceConstraint = 'cut_on_fold' | 'mirror' | 'directional' | 'none';

export interface PatternPoint {
  x: number;
  y: number;
}

export interface BoundingBox {
  widthCm: number;
  heightCm: number;
  areaCm2: number;
}

export interface PatternPiece {
  id: string;
  name: string;
  quantity: number;
  outlineCm: PatternPoint[];
  boundingBox: BoundingBox;
  seamAllowanceCm: number;
  appliedEaseCm?: number | null;
  grainline: GrainlineDirection;
  constraints: PieceConstraint[];
  requiresDirectionalFabric: boolean;
  requiresPatternMatching: boolean;
  patternMatchingManualVerificationRequired: boolean;
  notes: string[];
}

export type MissingMeasurementSeverity = 'required' | 'recommended' | 'optional';

export interface MissingMeasurement {
  code: string;
  label: string;
  severity: MissingMeasurementSeverity;
  engineDefaultCm: number | null;
  hint: string;
}

export interface MeasurementCompletenessResult {
  complete: boolean;
  missing: MissingMeasurement[];
  outOfRangeCodes: string[];
  engineCanRun: boolean;
}

export type EaseArea = 'chest' | 'waist' | 'hip' | 'bicep' | 'sleeve' | 'length';
export type EaseSource = 'design_spec' | 'fit_type' | 'garment_type_default' | 'tailor_override';

export interface AppliedEase {
  area: EaseArea;
  valueCm: number;
  source: EaseSource;
  fromDesignSpecId?: string | null;
}

export interface PatternDerivationContext {
  designSpecId: string;
  measurementProfileId: string;
  measurementProfileVersion: number;
  engineKind: string;
  garmentCategory: string;
  measurementsUsed: Record<string, number>;
  easeApplied: AppliedEase[];
  defaultsAccepted: Array<{ code: string; defaultCm: number }>;
  tailorOverrides: Array<{ code: string; valueCm: number }>;
  warnings: string[];
}

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
  designSpecificationId: string;
  measurementProfileId: string;
  measurementProfileVersion: number;
  garmentCategory: string;
  pieces: PatternPiece[];
  derivationContext: PatternDerivationContext;
  measurementCompleteness: MeasurementCompletenessResult;
  engineKind: string;
  status: PatternModelStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlacedPiece {
  pieceId: string;
  copy: number;
  xCm: number;
  yCm: number;
  rotationDeg: number;
  flipped: boolean;
  effectiveWidthCm: number;
  effectiveHeightCm: number;
}

export type LayoutValidationSeverity = 'error' | 'warning' | 'info';

export interface LayoutValidationIssue {
  severity: LayoutValidationSeverity;
  code: string;
  message: string;
  pieceIds?: string[];
}

/**
 * CuttingLayout — the output of the greedy deterministic nesting algorithm.
 *
 * layoutEnvelopeCm = max occupied Y + marginCm.
 * This is the CUTTING LAYOUT LENGTH — NOT final fabric yardage.
 * Phase 16 adds selvedge waste, repeat matching allowance, and buffers.
 */
export interface CuttingLayout {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  patternModelId: string;
  fabricProfileId?: string | null;
  layoutWidthCm: number;
  /** CUTTING LAYOUT ENVELOPE — geometric max Y + margins. NOT final yardage. */
  layoutEnvelopeCm: number;
  marginCm: number;
  placedPieces: PlacedPiece[];
  validationIssues: LayoutValidationIssue[];
  isValid: boolean;
  algorithm: 'greedy_deterministic';
  algorithmVersion: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CuttingInstruction {
  pieceId: string;
  pieceName: string;
  quantity: number;
  layoutPosition?: { xCm: number; yCm: number } | null;
  seamAllowanceCm: number;
  grainline: GrainlineDirection;
  constraints: PieceConstraint[];
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
  preamble: string[];
  postCuttingChecks: string[];
  createdAt: string;
}

export type PatternReadinessStatus =
  | 'no_design_spec'
  | 'measurements_incomplete'
  | 'measurements_need_defaults'
  | 'ready_for_pattern'
  | 'pattern_derived'
  | 'ready_for_cutting';

export interface PatternReadinessItem {
  key: string;
  label: string;
  satisfied: boolean;
  warning?: string | null;
}

export interface PatternReadinessReport {
  status: PatternReadinessStatus;
  items: PatternReadinessItem[];
  canDerivePattern: boolean;
  canComputeLayout: boolean;
  missingMeasurements: MissingMeasurement[];
}

export interface PatternTraceabilityChain {
  customerId: string;
  measurementProfileId: string;
  measurementProfileVersion: number;
  designSpecificationId: string;
  designSpecificationVersion: number;
  patternModelId: string;
  patternModelVersion: number;
  cuttingLayoutId?: string | null;
  measuredAt?: string | null;
  designedAt?: string | null;
  patternDerivedAt?: string | null;
  layoutComputedAt?: string | null;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const pmBase = (customerId: string) =>
  `/customers/${customerId}/pattern-models`;

const clBase = (customerId: string) =>
  `/customers/${customerId}/cutting-layouts`;

// Pattern Models
export async function listPatternModels(customerId: string): Promise<PatternModel[]> {
  const d = await apiGet<{ patternModels: PatternModel[] }>(pmBase(customerId));
  return d.patternModels;
}

export async function getPatternModel(
  customerId: string,
  id: string,
): Promise<PatternModel> {
  const d = await apiGet<{ patternModel: PatternModel }>(`${pmBase(customerId)}/${id}`);
  return d.patternModel;
}

export async function derivePatternModel(
  customerId: string,
  data: {
    designSpecificationId: string;
    name?: string;
    /** Measurements accepted as defaults (tailor confirmed). */
    defaultsAccepted?: Array<{ code: string; defaultCm: number }>;
    /** Tailor manual overrides. */
    tailorOverrides?: Array<{ code: string; valueCm: number }>;
    notes?: string;
  },
): Promise<PatternModel> {
  const d = await apiPost<{ patternModel: PatternModel }>(pmBase(customerId), data);
  return d.patternModel;
}

export async function updatePatternModel(
  customerId: string,
  id: string,
  data: Partial<Pick<PatternModel, 'name' | 'status' | 'notes'>>,
): Promise<PatternModel> {
  const d = await apiPatch<{ patternModel: PatternModel }>(
    `${pmBase(customerId)}/${id}`,
    data,
  );
  return d.patternModel;
}

export async function getPatternReadiness(
  customerId: string,
  designSpecId: string,
): Promise<PatternReadinessReport> {
  const d = await apiGet<{ readiness: PatternReadinessReport }>(
    `${pmBase(customerId)}/readiness/${designSpecId}`,
  );
  return d.readiness;
}

// Cutting Layouts
export async function listCuttingLayouts(customerId: string): Promise<CuttingLayout[]> {
  const d = await apiGet<{ cuttingLayouts: CuttingLayout[] }>(clBase(customerId));
  return d.cuttingLayouts;
}

export async function getCuttingLayout(
  customerId: string,
  id: string,
): Promise<CuttingLayout> {
  const d = await apiGet<{ cuttingLayout: CuttingLayout }>(`${clBase(customerId)}/${id}`);
  return d.cuttingLayout;
}

export async function computeCuttingLayout(
  customerId: string,
  data: {
    patternModelId: string;
    fabricProfileId?: string;
    /** Fabric width in cm (from FabricProfile). */
    layoutWidthCm: number;
    marginCm?: number;
    notes?: string;
  },
): Promise<CuttingLayout> {
  const d = await apiPost<{ cuttingLayout: CuttingLayout }>(clBase(customerId), data);
  return d.cuttingLayout;
}

// Cutting Instructions
export async function getCuttingInstructions(
  customerId: string,
  patternModelId: string,
  cuttingLayoutId?: string,
): Promise<CuttingInstructionSet> {
  const qs = cuttingLayoutId ? `?cuttingLayoutId=${cuttingLayoutId}` : '';
  const d = await apiGet<{ instructionSet: CuttingInstructionSet }>(
    `${pmBase(customerId)}/${patternModelId}/cutting-instructions${qs}`,
  );
  return d.instructionSet;
}

// Traceability
export async function getTraceabilityChain(
  customerId: string,
  patternModelId: string,
): Promise<PatternTraceabilityChain> {
  const d = await apiGet<{ traceability: PatternTraceabilityChain }>(
    `${pmBase(customerId)}/${patternModelId}/traceability`,
  );
  return d.traceability;
}
