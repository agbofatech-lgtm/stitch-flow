import type { TierCode } from '../types';

export type MonetizedFeature =
  | 'basicReports'
  | 'advancedReports'
  | 'savePattern'
  | 'measurementProfiles'
  | 'productionAssistant'
  | 'fitWarnings'
  | 'fabricStock'
  | 'jobSheetExport';

export const TIER_META: Record<
  TierCode,
  {
    code: TierCode;
    name: string;
    monthlyPrice: number;
    shortLabel: string;
  }
> = {
  BASIC: {
    code: 'BASIC',
    name: 'Basic',
    monthlyPrice: 0,
    shortLabel: 'Free',
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    monthlyPrice: 45,
    shortLabel: 'GHS 45/mo',
  },
  STUDIO: {
    code: 'STUDIO',
    name: 'Studio',
    monthlyPrice: 90,
    shortLabel: 'GHS 90/mo',
  },
};

export const FEATURE_MIN_TIER: Record<MonetizedFeature, TierCode> = {
  basicReports: 'BASIC',
  advancedReports: 'STUDIO',
  savePattern: 'PRO',
  measurementProfiles: 'PRO',
  productionAssistant: 'STUDIO',
  fitWarnings: 'STUDIO',
  fabricStock: 'PRO',
  jobSheetExport: 'PRO',
};

const TIER_ORDER: TierCode[] = ['BASIC', 'PRO', 'STUDIO'];

export function tierIncludesFeature(
  tierCode: TierCode,
  feature: MonetizedFeature
): boolean {
  const currentIndex = TIER_ORDER.indexOf(tierCode);
  const requiredIndex = TIER_ORDER.indexOf(FEATURE_MIN_TIER[feature]);
  return currentIndex >= requiredIndex;
}

export function getRequiredTierForFeature(feature: MonetizedFeature): TierCode {
  return FEATURE_MIN_TIER[feature];
}

export function getTierUpgradeMessage(feature: MonetizedFeature): string {
  const tier = TIER_META[getRequiredTierForFeature(feature)];

  switch (feature) {
    case 'savePattern':
      return `Upgrade to ${tier.name} to save patterns to your library.`;
    case 'measurementProfiles':
      return `Upgrade to ${tier.name} to use customer measurement profiles.`;
    case 'productionAssistant':
      return `Upgrade to ${tier.name} to unlock production assistant outputs.`;
    case 'fitWarnings':
      return `Upgrade to ${tier.name} to unlock fit-risk warnings.`;
    case 'fabricStock':
      return `Upgrade to ${tier.name} to unlock fabric stock intelligence.`;
    case 'jobSheetExport':
      return `Upgrade to ${tier.name} to export job sheets.`;
    case 'advancedReports':
      return `Upgrade to ${tier.name} to unlock advanced production reports.`;
    case 'basicReports':
    default:
      return `Upgrade your plan to unlock this feature.`;
  }
}
