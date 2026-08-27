/**
 * Phase 5: canonical server-side plan catalogue.
 *
 * THE single authoritative definition of the StitchFlow SaaS plans.
 * Limits and features were EXTRACTED from the pre-existing client
 * definitions (apps/web/src/data/mockData.ts `tiers`,
 * apps/web/src/config/tiers.ts FEATURE_MIN_TIER / TIER_META and
 * apps/web/src/modules/services/tierEnforcement.ts getTierLimits) and
 * normalized here. The client copies remain for UX display only and are
 * no longer authoritative.
 *
 * Price note: the client historically contained two price sets
 * (mockData: 29/79 — legacy; TIER_META: GHS 0/45/90 — the values surfaced
 * in the UI). TIER_META is adopted as canonical. Documented in
 * docs/PHASE5_COMMERCIAL_DOMAIN.md.
 */

export const PLAN_CODES = ['BASIC', 'PRO', 'STUDIO'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export interface PlanLimits {
  /** Maximum active (non-deleted) customers; null = unlimited. */
  customers: number | null;
  /** Maximum workspace staff members (assistants) beyond the owner. */
  staff: number;
}

export interface PlanFeatures {
  basicReports: boolean;
  pdfExport: boolean;
  brandedExport: boolean;
  patternGeneration: boolean;
  savePattern: boolean;
  measurementProfiles: boolean;
  fabricVisualizer: boolean;
  analytics: boolean;
  savedPreviews: boolean;
  materialInventory: boolean;
  jobSheetExport: boolean;
  lowStockAlerts: boolean;
  advancedReports: boolean;
  multiCurrencyReporting: boolean;
  productionAssistant: boolean;
  fitWarnings: boolean;
}

export interface Plan {
  code: PlanCode;
  name: string;
  /** Monthly price in the plan currency (GHS). 0 = free. */
  monthlyPrice: number;
  currency: 'GHS';
  billingInterval: 'monthly';
  limits: PlanLimits;
  features: PlanFeatures;
}

const BASIC_FEATURES: PlanFeatures = {
  basicReports: true,
  pdfExport: false,
  brandedExport: false,
  patternGeneration: false,
  savePattern: false,
  measurementProfiles: false,
  fabricVisualizer: false,
  analytics: false,
  savedPreviews: false,
  materialInventory: false,
  jobSheetExport: false,
  lowStockAlerts: false,
  advancedReports: false,
  multiCurrencyReporting: false,
  productionAssistant: false,
  fitWarnings: false,
};

const PRO_FEATURES: PlanFeatures = {
  ...BASIC_FEATURES,
  pdfExport: true,
  brandedExport: true,
  patternGeneration: true,
  savePattern: true,
  measurementProfiles: true,
  fabricVisualizer: true,
  analytics: true,
  savedPreviews: true,
  materialInventory: true,
  jobSheetExport: true,
};

const STUDIO_FEATURES: PlanFeatures = {
  ...PRO_FEATURES,
  lowStockAlerts: true,
  advancedReports: true,
  multiCurrencyReporting: true,
  productionAssistant: true,
  fitWarnings: true,
};

export const PLAN_CATALOGUE: Record<PlanCode, Plan> = {
  BASIC: {
    code: 'BASIC',
    name: 'Basic',
    monthlyPrice: 0,
    currency: 'GHS',
    billingInterval: 'monthly',
    limits: { customers: 25, staff: 0 },
    features: BASIC_FEATURES,
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    monthlyPrice: 45,
    currency: 'GHS',
    billingInterval: 'monthly',
    limits: { customers: 250, staff: 5 },
    features: PRO_FEATURES,
  },
  STUDIO: {
    code: 'STUDIO',
    name: 'Studio',
    monthlyPrice: 90,
    currency: 'GHS',
    billingInterval: 'monthly',
    limits: { customers: null, staff: 15 },
    features: STUDIO_FEATURES,
  },
};

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === 'string' && (PLAN_CODES as readonly string[]).includes(value);
}

export function getPlan(code: PlanCode): Plan {
  return PLAN_CATALOGUE[code];
}

/** Order used to classify plan changes as upgrade vs downgrade. */
export function comparePlans(a: PlanCode, b: PlanCode): number {
  return PLAN_CODES.indexOf(a) - PLAN_CODES.indexOf(b);
}

/**
 * Compatibility mapping — legacy per-user device-licensing tiers to the
 * commercial plan whose behavior they most closely correspond to.
 * Used ONLY as a defensive fallback for workspaces without a subscription
 * row (should not occur post-migration; documented in Step 24 audit).
 */
export function legacyLicenseTierToPlan(tier: string | null | undefined): PlanCode {
  if (tier === 'pro') return 'PRO';
  if (tier === 'enterprise') return 'STUDIO';
  return 'BASIC';
}
