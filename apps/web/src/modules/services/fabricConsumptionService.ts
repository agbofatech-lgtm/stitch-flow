/**
 * Phase 16 — Fabric Consumption Service.
 *
 * The authoritative fabric requirement engine.
 *
 * CRITICAL INVARIANTS:
 * - Input: Phase 15 layoutEnvelopeCm (CUTTING LAYOUT LENGTH — geometry)
 * - Output: fabricRequiredCm (AUTHORITATIVE FABRIC REQUIREMENT — real-world)
 * - These are DIFFERENT quantities. This service bridges the gap.
 * - Layout envelope is the baseline — NEVER replaced with area÷width.
 * - Every allowance is independently visible.
 * - No silent defaults — all sources are labeled.
 * - Pattern matching: NEVER claimed as auto-solved.
 * - Offline-capable: all calculations are pure functions.
 * - productionAssistant.ts is NEVER called — ZERO DIFF.
 * - patternEngine.ts is NEVER called — ZERO DIFF.
 */

import type {
  FabricConsumption,
  FabricConsumptionBreakdown,
  FabricWidthProfile,
  ShrinkageAllowance,
  PatternMatchingAssessment,
  DirectionalAllowance,
  HandlingWasteAllowance,
  SafetyBuffer,
  AllowanceSource,
  FabricConsumptionConfidence,
} from '../../shared/api/production';
import type { FabricProfile } from '../../shared/api/design';
import type { CuttingLayout } from '../../shared/api/pattern';
import { db } from '../../db/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALC_VERSION = '1.0.0';

// Unit conversions — exact, no floating-point ambiguity
const CM_PER_METER = 100;
const CM_PER_YARD = 91.44;

// Default selvedge allowances
const DEFAULT_LEFT_SELVEDGE_CM = 1.5;
const DEFAULT_RIGHT_SELVEDGE_CM = 1.5;
const DEFAULT_WIDTH_TOLERANCE_CM = 0.5;

// ---------------------------------------------------------------------------
// Shrinkage defaults by fabric type
// ---------------------------------------------------------------------------

const SHRINKAGE_BY_FABRIC_TYPE: Record<string, number> = {
  cotton: 5,
  linen: 4,
  silk: 2,
  wool: 6,
  denim: 7,
  jersey: 5,
  chiffon: 2,
  velvet: 3,
  ankara: 3,
  wax_print: 3,
  kente: 2,
  brocade: 2,
  satin: 2,
  lace: 2,
};

const DEFAULT_SHRINKAGE_PERCENT = 3;  // system_default (conservative)

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function applyPercent(base: number, pct: number): number {
  return round2(base * (1 + pct / 100));
}

function generateId(): string {
  return `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Width intelligence
// ---------------------------------------------------------------------------

export interface WidthInput {
  /** From FabricProfile.width.valueCm or explicit override (cm). */
  nominalWidthCm: number;
  /** Required by layout (CuttingLayout.layoutWidthCm). */
  layoutRequiredWidthCm: number;
  leftSelvedgeCm?: number;
  rightSelvedgeCm?: number;
  widthSource?: AllowanceSource;
}

export function buildWidthProfile(input: WidthInput): FabricWidthProfile {
  const leftSelvedge = input.leftSelvedgeCm ?? DEFAULT_LEFT_SELVEDGE_CM;
  const rightSelvedge = input.rightSelvedgeCm ?? DEFAULT_RIGHT_SELVEDGE_CM;
  const usable = round2(input.nominalWidthCm - leftSelvedge - rightSelvedge);
  const isCompatible = usable >= input.layoutRequiredWidthCm - 0.5; // tolerance

  return {
    nominalWidthCm: input.nominalWidthCm,
    leftSelvedgeCm: leftSelvedge,
    rightSelvedgeCm: rightSelvedge,
    usableWidthCm: Math.max(0, usable),
    widthToleranceCm: DEFAULT_WIDTH_TOLERANCE_CM,
    widthSource: input.widthSource ?? 'system_default',
    isCompatible,
    layoutRequiredWidthCm: input.layoutRequiredWidthCm,
  };
}

// ---------------------------------------------------------------------------
// Shrinkage
// ---------------------------------------------------------------------------

export function buildShrinkageAllowance(
  baseLength: number,
  fabricType: string | null | undefined,
  overridePercent?: number | null,
): ShrinkageAllowance {
  let source: AllowanceSource;
  let confidence: ShrinkageAllowance['confidence'];
  let percentage: number;

  if (overridePercent != null) {
    percentage = overridePercent;
    source = 'manual_override';
    confidence = 'high';
  } else if (fabricType && SHRINKAGE_BY_FABRIC_TYPE[fabricType] !== undefined) {
    percentage = SHRINKAGE_BY_FABRIC_TYPE[fabricType];
    source = 'material_default';
    confidence = 'medium';
  } else {
    percentage = DEFAULT_SHRINKAGE_PERCENT;
    source = 'system_default';
    confidence = 'low';
  }

  const valueCm = round2(baseLength * (percentage / 100));
  return { percentage, valueCm, source, confidence, fabricType: fabricType ?? null };
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

export function buildPatternMatchingAssessment(
  baseLength: number,
  required: boolean,
  repeatSizeCm: number | null,
  overridePercent?: number | null,
): PatternMatchingAssessment {
  if (!required) {
    return {
      required: false,
      automatedVerification: 'not_required',
      allowancePercentage: 0,
      allowanceCm: 0,
      repeatSizeCm: null,
      source: 'system_default',
      notes: [],
    };
  }

  const percentage = overridePercent ?? 15; // conservative: 15% when matching required
  const allowanceCm = round2(baseLength * (percentage / 100));

  return {
    required: true,
    automatedVerification: 'manual_required',
    allowancePercentage: percentage,
    allowanceCm,
    repeatSizeCm,
    source: overridePercent != null ? 'manual_override' : 'system_default',
    notes: [
      'PATTERN MATCHING REVIEW REQUIRED: Automated repeat alignment is not guaranteed by the current layout engine.',
      'A conservative fabric allowance has been applied.',
      'Tailor verification required before cutting.',
      ...(repeatSizeCm ? [`Pattern repeat: ${repeatSizeCm} cm`] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Directional allowance
// ---------------------------------------------------------------------------

export function buildDirectionalAllowance(
  baseLength: number,
  required: boolean,
  overridePercent?: number | null,
): DirectionalAllowance {
  if (!required) {
    return {
      required: false,
      allowancePercentage: 0,
      allowanceCm: 0,
      source: 'system_default',
      notes: [],
    };
  }

  const percentage = overridePercent ?? 10; // 10% for directional fabrics
  const allowanceCm = round2(baseLength * (percentage / 100));

  return {
    required: true,
    allowancePercentage: percentage,
    allowanceCm,
    source: overridePercent != null ? 'manual_override' : 'system_default',
    notes: [
      'DIRECTIONAL FABRIC DETECTED: All pattern pieces must preserve the approved grain/direction orientation.',
      `Additional fabric allowance applied: ${percentage}%.`,
      'Reason: Rotation flexibility is reduced.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Handling waste & safety buffer
// ---------------------------------------------------------------------------

export function buildHandlingWaste(
  baseLength: number,
  overridePercent?: number | null,
): HandlingWasteAllowance {
  const percentage = overridePercent ?? 3;
  return {
    percentage,
    valueCm: round2(baseLength * (percentage / 100)),
    source: overridePercent != null ? 'manual_override' : 'system_default',
  };
}

export function buildSafetyBuffer(
  baseLength: number,
  overridePercent?: number | null,
): SafetyBuffer {
  const percentage = overridePercent ?? 5;
  return {
    percentage,
    valueCm: round2(baseLength * (percentage / 100)),
    source: overridePercent != null ? 'manual_override' : 'system_default',
  };
}

// ---------------------------------------------------------------------------
// Main calculation pipeline
// ---------------------------------------------------------------------------

export interface FabricConsumptionInput {
  customerId?: string | null;
  workspaceId: string;
  designSpecificationId: string;
  patternModelId?: string | null;
  cuttingLayout: CuttingLayout;
  fabricProfile?: FabricProfile | null;
  /** Explicit nominal width override (cm) — if not from FabricProfile. */
  nominalWidthCmOverride?: number | null;
  /** Tailor override for shrinkage %. */
  shrinkageOverridePercent?: number | null;
  /** Tailor override for safety buffer %. */
  safetyBufferOverridePercent?: number | null;
  /** Tailor override for handling waste %. */
  handlingWasteOverridePercent?: number | null;
  /** Tailor override for pattern matching %. */
  patternMatchingOverridePercent?: number | null;
  /** Tailor override for directional %. */
  directionalOverridePercent?: number | null;
}

/**
 * The canonical Phase 16 fabric consumption calculation.
 *
 * Pipeline:
 *   L0 = layoutEnvelopeCm (Phase 15 geometry — CUTTING LAYOUT LENGTH)
 *   L1 = L0 + shrinkageAllowance
 *   L2 = L1 + selvedgeAdjustment (from usable width delta — if any width is lost, length may increase)
 *   L3 = L2 + patternMatchingAllowance
 *   L4 = L3 + directionalAllowance
 *   L5 = L4 + handlingWasteAllowance
 *   L6 = L5 + safetyBuffer
 *   FINAL = L6 = fabricRequiredCm
 *
 * Note: selvedge adjustment accounts for if usable width < layout width,
 * the calculation is BLOCKED (not compensated by extra length — that's wrong).
 */
export function calculateFabricConsumption(
  input: FabricConsumptionInput,
): FabricConsumption {
  const { cuttingLayout, fabricProfile } = input;
  const now = new Date().toISOString();

  // Phase 15 geometric base — THE STARTING POINT, never replaced
  const L0 = cuttingLayout.layoutEnvelopeCm;

  // Fabric type for shrinkage lookup
  const fabricType = fabricProfile?.fabricType ?? null;

  // Nominal width resolution (priority: fabricProfile > explicit override > layoutWidthCm)
  const nominalWidthCm = input.nominalWidthCmOverride
    ?? (fabricProfile?.width?.value != null && fabricProfile?.width?.unit === 'cm'
      ? fabricProfile.width.value
      : cuttingLayout.layoutWidthCm + DEFAULT_LEFT_SELVEDGE_CM + DEFAULT_RIGHT_SELVEDGE_CM);

  const widthSource: AllowanceSource = fabricProfile?.width?.value != null
    ? 'fabric_profile'
    : input.nominalWidthCmOverride != null
    ? 'manual_override'
    : 'system_default';

  // Width intelligence
  const widthProfile = buildWidthProfile({
    nominalWidthCm,
    layoutRequiredWidthCm: cuttingLayout.layoutWidthCm,
    widthSource,
  });

  // Selvedge adjustment to length: if usable < required, fabric is BLOCKED.
  // We do NOT compensate by adding more length (that's wrong).
  // The selvedge adjustment is only a minor cm correction for the usable-vs-nominal delta:
  // if usable width > required width, the excess can actually help slightly.
  // We apply a conservative 0 adjustment for now (width issues are a blocker, not a length fix).
  const selvedgeAdjustmentCm = 0; // Width incompatibility → BLOCKED, not lengthened

  // Step 1: Shrinkage (applied to base layout length)
  const shrinkage = buildShrinkageAllowance(
    L0,
    fabricType,
    input.shrinkageOverridePercent,
  );
  const L1 = round2(L0 + shrinkage.valueCm);

  // Step 2: Selvedge (informational adjustment)
  const L2 = round2(L1 + selvedgeAdjustmentCm);

  // Step 3: Pattern matching
  const patternMatchingRequired = fabricProfile?.properties?.requiresMatching ?? false;
  const repeatSizeCm = fabricProfile?.properties?.patternRepeatSizeCm ?? null;
  const patternMatching = buildPatternMatchingAssessment(
    L2,
    patternMatchingRequired,
    repeatSizeCm,
    input.patternMatchingOverridePercent,
  );
  const L3 = round2(L2 + patternMatching.allowanceCm);

  // Step 4: Directional
  const directionalRequired = fabricProfile?.properties?.directional ?? false;
  const directional = buildDirectionalAllowance(
    L3,
    directionalRequired,
    input.directionalOverridePercent,
  );
  const L4 = round2(L3 + directional.allowanceCm);

  // Step 5: Handling waste
  const handlingWaste = buildHandlingWaste(L4, input.handlingWasteOverridePercent);
  const L5 = round2(L4 + handlingWaste.valueCm);

  // Step 6: Safety buffer
  const safetyBuffer = buildSafetyBuffer(L5, input.safetyBufferOverridePercent);
  const L6 = round2(L5 + safetyBuffer.valueCm);

  const fabricRequiredCm = L6;
  const fabricRequiredMeters = round2(fabricRequiredCm / CM_PER_METER);
  const fabricRequiredYards = round2(fabricRequiredCm / CM_PER_YARD);

  // Build full breakdown (every intermediate visible)
  const breakdown: FabricConsumptionBreakdown = {
    layoutEnvelopeCm: L0,
    afterShrinkageCm: L1,
    shrinkageAllowanceCm: shrinkage.valueCm,
    afterSelvedgeCm: L2,
    selvedgeAllowanceCm: selvedgeAdjustmentCm,
    afterPatternMatchingCm: L3,
    patternMatchingAllowanceCm: patternMatching.allowanceCm,
    afterDirectionalCm: L4,
    directionalAllowanceCm: directional.allowanceCm,
    afterHandlingWasteCm: L5,
    handlingWasteAllowanceCm: handlingWaste.valueCm,
    afterSafetyBufferCm: L6,
    safetyBufferCm: safetyBuffer.valueCm,
  };

  // Confidence: high only if all values from profile or manual; medium if some defaults; low if all defaults
  const sourceCount = [
    shrinkage.source,
    patternMatching.source,
    directional.source,
    handlingWaste.source,
    safetyBuffer.source,
  ];
  const highCount = sourceCount.filter((s) => s === 'fabric_profile' || s === 'manual_override').length;
  const confidence: FabricConsumptionConfidence =
    highCount >= 4 ? 'high' : highCount >= 2 ? 'medium' : 'low';

  // Build assumptions list
  const assumptions: string[] = [];
  if (shrinkage.source !== 'manual_override') {
    assumptions.push(`Shrinkage ${shrinkage.percentage}% — Source: ${shrinkage.source}${fabricType ? ` (${fabricType})` : ''} — Confidence: ${shrinkage.confidence}`);
  }
  if (patternMatchingRequired) {
    assumptions.push(`Pattern matching allowance ${patternMatching.allowancePercentage}% — Source: ${patternMatching.source} — MANUAL VERIFICATION REQUIRED`);
  }
  if (directionalRequired) {
    assumptions.push(`Directional fabric allowance ${directional.allowancePercentage}% — Source: ${directional.source}`);
  }
  if (handlingWaste.source !== 'manual_override') {
    assumptions.push(`Handling waste ${handlingWaste.percentage}% — Source: ${handlingWaste.source}`);
  }
  if (safetyBuffer.source !== 'manual_override') {
    assumptions.push(`Safety buffer ${safetyBuffer.percentage}% — Source: ${safetyBuffer.source}`);
  }
  if (!widthProfile.isCompatible) {
    assumptions.push(`WARNING: Fabric usable width (${widthProfile.usableWidthCm} cm) < layout required (${cuttingLayout.layoutWidthCm} cm). PRODUCTION BLOCKED on width.`);
  }

  const manualVerificationRequired =
    patternMatchingRequired ||
    !widthProfile.isCompatible ||
    confidence === 'low';

  return {
    id: generateId(),
    workspaceId: input.workspaceId,
    customerId: input.customerId ?? null,
    designSpecificationId: input.designSpecificationId,
    patternModelId: input.patternModelId ?? null,
    cuttingLayoutId: cuttingLayout.id,
    fabricProfileId: fabricProfile?.id ?? null,
    layoutEnvelopeCm: L0,
    layoutFabricWidthCm: cuttingLayout.layoutWidthCm,
    widthProfile,
    shrinkage,
    patternMatching,
    directional,
    handlingWaste,
    safetyBuffer,
    breakdown,
    fabricRequiredCm,
    fabricRequiredMeters,
    fabricRequiredYards,
    confidence,
    assumptions,
    manualVerificationRequired,
    calculationVersion: CALC_VERSION,
    isStale: false,
    staleReason: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Unit conversion helpers
// ---------------------------------------------------------------------------

export function cmToMeters(cm: number): number {
  return round2(cm / CM_PER_METER);
}

export function cmToYards(cm: number): number {
  return round2(cm / CM_PER_YARD);
}

export function metersToCm(meters: number): number {
  return round2(meters * CM_PER_METER);
}

export function yardsToCm(yards: number): number {
  return round2(yards * CM_PER_YARD);
}

// ---------------------------------------------------------------------------
// Offline persistence
// ---------------------------------------------------------------------------

export async function saveFabricConsumptionLocally(
  consumption: FabricConsumption,
): Promise<void> {
  const now = new Date().toISOString();
  await db.fabricConsumptionsV16.put({
    ...consumption,
    workspaceId: consumption.workspaceId,
    deletedAt: null,
    localUpdatedAt: now,
  });
}

export async function loadFabricConsumptionLocally(
  id: string,
  workspaceId: string,
): Promise<FabricConsumption | null> {
  const row = await db.fabricConsumptionsV16
    .where('[workspaceId+id]')
    .equals([workspaceId, id])
    .first();
  return row ? (row as unknown as FabricConsumption) : null;
}

export async function loadFabricConsumptionForLayout(
  cuttingLayoutId: string,
  workspaceId: string,
): Promise<FabricConsumption | null> {
  const rows = await db.fabricConsumptionsV16
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();
  const matching = (rows as unknown as FabricConsumption[]).find(
    (r) => r.cuttingLayoutId === cuttingLayoutId,
  );
  return matching ?? null;
}
