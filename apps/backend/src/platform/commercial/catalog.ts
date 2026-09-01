import { newId } from '../store';
import type { CapabilityCode, PlanDefinition, PriceDefinition } from './types';

/**
 * Capability keys are opaque. Do not authorize with plan display names.
 * Mapped from existing FeatureGate / tierEnforcement vocabulary (FACT of UI),
 * not promoted as market packaging law.
 */
export const CAPABILITY = {
  PDF_EXPORT: 'PDF_EXPORT',
  PATTERN_GENERATION: 'PATTERN_GENERATION',
  FABRIC_VISUALIZER: 'FABRIC_VISUALIZER',
  SAVED_PREVIEWS: 'SAVED_PREVIEWS',
  ANALYTICS: 'ANALYTICS',
  MATERIAL_INVENTORY: 'MATERIAL_INVENTORY',
  LOW_STOCK_ALERTS: 'LOW_STOCK_ALERTS',
  ADVANCED_REPORTS: 'ADVANCED_REPORTS',
  MULTI_CURRENCY_REPORTING: 'MULTI_CURRENCY_REPORTING',
  BRANDED_EXPORT: 'BRANDED_EXPORT',
  AI_TAILORING_ADVISORY: 'AI_TAILORING_ADVISORY',
  CUSTOMER_LIMIT: 'CUSTOMER_LIMIT',
  ASSISTANT_SEATS: 'ASSISTANT_SEATS',
} as const;

const BASIC_CAPS: CapabilityCode[] = [CAPABILITY.CUSTOMER_LIMIT];
const PRO_CAPS: CapabilityCode[] = [
  CAPABILITY.CUSTOMER_LIMIT,
  CAPABILITY.ASSISTANT_SEATS,
  CAPABILITY.PDF_EXPORT,
  CAPABILITY.PATTERN_GENERATION,
  CAPABILITY.FABRIC_VISUALIZER,
  CAPABILITY.SAVED_PREVIEWS,
  CAPABILITY.ANALYTICS,
  CAPABILITY.MATERIAL_INVENTORY,
  CAPABILITY.BRANDED_EXPORT,
];
const STUDIO_CAPS: CapabilityCode[] = [
  ...PRO_CAPS,
  CAPABILITY.LOW_STOCK_ALERTS,
  CAPABILITY.ADVANCED_REPORTS,
  CAPABILITY.MULTI_CURRENCY_REPORTING,
  CAPABILITY.AI_TAILORING_ADVISORY,
];

/** Legacy seed codes BASIC/PRO/STUDIO — packaging only, not authorization ifs. */
export function seedPlanCatalog(): PlanDefinition[] {
  return [
    {
      code: 'BASIC',
      displayName: 'Basic',
      capabilities: BASIC_CAPS,
      limits: { CUSTOMER_LIMIT: 25, ASSISTANT_SEATS: 0 },
      classification: 'legacy-seed',
    },
    {
      code: 'PRO',
      displayName: 'Pro',
      capabilities: PRO_CAPS,
      limits: { CUSTOMER_LIMIT: 250, ASSISTANT_SEATS: 5 },
      classification: 'legacy-seed',
    },
    {
      code: 'STUDIO',
      displayName: 'Studio',
      capabilities: STUDIO_CAPS,
      limits: { CUSTOMER_LIMIT: null, ASSISTANT_SEATS: 15 },
      classification: 'legacy-seed',
    },
  ];
}

/** Amounts omitted — USD 29/79 and GHS 45/90 remain simulation, not catalog law. */
export function seedPriceCatalog(): PriceDefinition[] {
  return ['BASIC', 'PRO', 'STUDIO'].flatMap((planCode) =>
    (['GHS', 'USD'] as const).map((currency) => ({
      id: newId(),
      planCode,
      currency,
      interval: 'month' as const,
      amountMinor: null,
      classification: 'simulation-not-law' as const,
    }))
  );
}

export function knownCapability(code: string): boolean {
  return Object.values(CAPABILITY).includes(code as (typeof CAPABILITY)[keyof typeof CAPABILITY]);
}
