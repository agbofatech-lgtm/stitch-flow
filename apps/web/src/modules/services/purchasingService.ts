/**
 * Phase 16 — Purchasing Intelligence Service.
 *
 * Determines fabric sufficiency and purchase recommendation.
 * Never invents inventory. Never fabricates costs.
 * All assumptions are explicit and labeled.
 */

import type {
  FabricConsumption,
  PurchasingRecommendation,
  FabricSufficiencyStatus,
  PurchasePolicy,
  RollUtilisation,
  FabricRoll,
} from '../../shared/api/production';

const DEFAULT_POLICY: PurchasePolicy = {
  purchaseIncrementCm: 45.72,  // 0.5 yard
  roundUpRequired: true,
  displayUnit: 'meter',
};

const CM_PER_YARD = 91.44;
const CM_PER_METER = 100;
const EXACT_THRESHOLD = 0.05; // 5% tolerance for "exact"
const EXCESS_THRESHOLD = 0.50; // 50% more than required = "excess"

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function generateId(): string {
  return `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Apply purchase policy rounding (always round UP to increment). */
function applyPurchaseIncrement(
  neededCm: number,
  policy: PurchasePolicy,
): { roundedCm: number; reason: string } {
  if (!policy.roundUpRequired) {
    return { roundedCm: round2(neededCm), reason: 'No rounding applied.' };
  }

  const increment = policy.purchaseIncrementCm ?? 45.72;
  const minimum = policy.minimumPurchaseCm ?? 0;

  let rounded = Math.ceil(neededCm / increment) * increment;
  if (rounded < minimum) rounded = minimum;
  rounded = round2(rounded);

  const incrementYard = round2(increment / CM_PER_YARD);
  const reason = `Rounded up to nearest ${increment} cm (${incrementYard} yard increment).`;
  return { roundedCm: rounded, reason };
}

/**
 * Determine sufficiency status from available vs required.
 * If availableCm is null/undefined → 'unknown'.
 */
export function determineSufficiency(
  requiredCm: number,
  availableCm: number | null | undefined,
): FabricSufficiencyStatus {
  if (availableCm == null || Number.isNaN(availableCm)) return 'unknown';

  const ratio = availableCm / requiredCm;
  if (ratio >= 1 + EXCESS_THRESHOLD) return 'excess';
  if (Math.abs(ratio - 1) <= EXACT_THRESHOLD) return 'exact';
  if (availableCm >= requiredCm) return 'sufficient';
  return 'insufficient';
}

/**
 * Build a purchasing recommendation from a fabric consumption record.
 */
export function buildPurchasingRecommendation(
  consumption: FabricConsumption,
  options: {
    availableFabricCm?: number | null;
    policy?: Partial<PurchasePolicy>;
    unitPricePerMeter?: number | null;
    currency?: string | null;
    roll?: FabricRoll | null;
  } = {},
): PurchasingRecommendation {
  const now = new Date().toISOString();
  const requiredCm = consumption.fabricRequiredCm;
  const availableCm = options.availableFabricCm ?? null;
  const policy: PurchasePolicy = { ...DEFAULT_POLICY, ...options.policy };

  const status = determineSufficiency(requiredCm, availableCm);

  let shortageCm: number | null = null;
  let excessCm: number | null = null;
  let rawPurchaseNeededCm: number | null = null;
  let recommendedPurchaseCm: number | null = null;
  let recommendedPurchaseMeters: number | null = null;
  let recommendedPurchaseYards: number | null = null;
  let purchaseRoundingReason: string | null = null;

  const reasons: string[] = [];
  const assumptions: string[] = [];

  switch (status) {
    case 'insufficient': {
      shortageCm = round2(requiredCm - (availableCm ?? 0));
      rawPurchaseNeededCm = shortageCm;
      const { roundedCm, reason } = applyPurchaseIncrement(rawPurchaseNeededCm, policy);
      recommendedPurchaseCm = roundedCm;
      recommendedPurchaseMeters = round3(roundedCm / CM_PER_METER);
      recommendedPurchaseYards = round3(roundedCm / CM_PER_YARD);
      purchaseRoundingReason = reason;
      reasons.push(`Fabric shortage: ${shortageCm} cm (${round3(shortageCm / CM_PER_METER)} m) more needed.`);
      reasons.push(`Required: ${requiredCm} cm | Available: ${availableCm} cm`);
      break;
    }
    case 'unknown': {
      // No inventory → recommend purchasing full requirement
      rawPurchaseNeededCm = requiredCm;
      const { roundedCm, reason } = applyPurchaseIncrement(requiredCm, policy);
      recommendedPurchaseCm = roundedCm;
      recommendedPurchaseMeters = round3(roundedCm / CM_PER_METER);
      recommendedPurchaseYards = round3(roundedCm / CM_PER_YARD);
      purchaseRoundingReason = reason;
      reasons.push('Inventory quantity unavailable. Recommended purchase based on full fabric requirement.');
      assumptions.push('No inventory data provided. Recommendation assumes full purchase.');
      break;
    }
    case 'sufficient':
    case 'exact': {
      excessCm = availableCm != null ? round2(availableCm - requiredCm) : null;
      reasons.push(`Available fabric is ${status}. No additional purchase required.`);
      if (excessCm != null) {
        reasons.push(`Remaining after use: ~${excessCm} cm (${round3(excessCm / CM_PER_METER)} m).`);
      }
      break;
    }
    case 'excess': {
      excessCm = availableCm != null ? round2(availableCm - requiredCm) : null;
      reasons.push(`Available fabric significantly exceeds requirement.`);
      if (excessCm != null) {
        reasons.push(`Excess: ~${excessCm} cm (${round3(excessCm / CM_PER_METER)} m) remaining.`);
      }
      break;
    }
  }

  // Cost estimate (optional — only if unit price provided)
  let estimatedCost: number | null = null;
  if (options.unitPricePerMeter != null && recommendedPurchaseMeters != null) {
    estimatedCost = round2(options.unitPricePerMeter * recommendedPurchaseMeters);
  } else if (options.unitPricePerMeter == null) {
    assumptions.push('Cost unavailable. Fabric price has not been provided.');
  }

  return {
    id: generateId(),
    fabricConsumptionId: consumption.id,
    status,
    requiredCm,
    availableCm,
    shortageCm,
    excessCm,
    rawPurchaseNeededCm,
    recommendedPurchaseCm,
    recommendedPurchaseMeters,
    recommendedPurchaseYards,
    purchaseRoundingReason,
    purchasePolicy: policy,
    estimatedCost,
    currency: options.currency ?? null,
    reasons,
    assumptions,
    createdAt: now,
  };
}

/**
 * Calculate roll utilisation (only when roll data exists).
 */
export function calculateRollUtilisation(
  requiredCm: number,
  roll: FabricRoll | null | undefined,
): RollUtilisation {
  if (!roll || !roll.lengthCm || roll.lengthCm <= 0) {
    return {
      applicable: false,
      reason: 'Fabric roll length information unavailable.',
    };
  }

  const rollsRequired = Math.ceil(requiredCm / roll.lengthCm);
  const totalLengthPurchasedCm = round2(rollsRequired * roll.lengthCm);
  const utilisedPercentage = round2((requiredCm / totalLengthPurchasedCm) * 100);
  const remainingCm = round2(totalLengthPurchasedCm - requiredCm);

  return {
    applicable: true,
    rollsRequired,
    totalLengthPurchasedCm,
    utilisedPercentage,
    remainingCm,
  };
}
