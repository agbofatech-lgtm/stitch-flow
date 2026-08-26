import type { ReactNode } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getRequiredTierForFeature,
  getTierUpgradeMessage,
  TIER_META,
  tierIncludesFeature,
  type MonetizedFeature,
} from '../config/tiers';

type FeatureGateProps = {
  feature: MonetizedFeature;
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
  compact?: boolean;
};

function isFeatureAllowed(params: {
  tierCode: ReturnType<typeof useApp>['currentWorkspace']['tier']['code'];
  feature: MonetizedFeature;
  featureAccess: ReturnType<typeof useApp>['featureAccess'];
}) {
  const { tierCode, feature, featureAccess } = params;
  const tierAllowed = tierIncludesFeature(tierCode, feature);

  if (!tierAllowed) return false;

  switch (feature) {
    case 'advancedReports':
      return featureAccess.canViewAdvancedReports.allowed;
    case 'fabricStock':
      return (
        featureAccess.canManageMaterialInventory.allowed ||
        featureAccess.canViewLowStockAlerts?.allowed === true
      );
    case 'jobSheetExport':
      return featureAccess.canExportPdf.allowed;
    case 'savePattern':
      return featureAccess.canGeneratePattern.allowed;
    case 'basicReports':
      return (
        featureAccess.canViewAnalytics.allowed ||
        featureAccess.canViewAdvancedReports.allowed
      );
    case 'measurementProfiles':
    case 'productionAssistant':
    case 'fitWarnings':
    default:
      return true;
  }
}

export function FeatureGate({
  feature,
  children,
  fallback,
  title,
  description,
  compact = false,
}: FeatureGateProps) {
  const { currentWorkspace, featureAccess } = useApp();

  const allowed = isFeatureAllowed({
    tierCode: currentWorkspace.tier.code,
    feature,
    featureAccess,
  });

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredTier = TIER_META[getRequiredTierForFeature(feature)];
  const resolvedTitle = title || `${requiredTier.name} feature`;
  const resolvedDescription = description || getTierUpgradeMessage(feature);

  if (compact) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/80 p-2 text-amber-700">
            <Lock className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{resolvedTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{resolvedDescription}</p>

            <button
              type="button"
              onClick={() =>
                window.alert(
                  `${requiredTier.name} plan • ${requiredTier.shortLabel}\n\nThis opens the upgrade flow in a full billing setup.`
                )
              }
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0F6E8C] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0C5C74]"
            >
              Upgrade to {requiredTier.name}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Lock className="mx-auto mb-3 h-10 w-10 text-slate-400" />
      <h3 className="text-lg font-semibold text-slate-900">{resolvedTitle}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
        {resolvedDescription}
      </p>

      <button
        type="button"
        onClick={() =>
          window.alert(
            `${requiredTier.name} plan • ${requiredTier.shortLabel}\n\nThis opens the upgrade flow in a full billing setup.`
          )
        }
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F6E8C] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0C5C74]"
      >
        Upgrade to {requiredTier.name}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
