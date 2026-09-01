/**
 * TRANSITIONAL UX only (ADR-006). Not commercial authority.
 * Server entitlement/access: GET /platform/entitlements, POST /platform/access/check.
 */
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
      <div className="rounded-sf-lg border border-dashed border-status-warning/40 bg-status-warning/10 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-sf bg-surface-elevated p-2 text-status-warning">
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
              className="sf-focus-ring mt-3 inline-flex items-center gap-2 rounded-sf bg-action-primary px-3 py-2 text-sm font-medium text-ink-inverse transition hover:bg-action-hover"
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
    <div className="rounded-sf-lg border border-dashed border-line bg-surface-workspace p-8 text-center">
      <Lock className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
      <h3 className="font-display text-heading-sm text-ink-primary">{resolvedTitle}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-body text-ink-muted">
        {resolvedDescription}
      </p>

      <button
        type="button"
        onClick={() =>
          window.alert(
            `${requiredTier.name} plan • ${requiredTier.shortLabel}\n\nThis opens the upgrade flow in a full billing setup.`
          )
        }
        className="sf-focus-ring mt-4 inline-flex items-center gap-2 rounded-sf bg-action-primary px-4 py-2.5 text-sm font-medium text-ink-inverse transition hover:bg-action-hover"
      >
        Upgrade to {requiredTier.name}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
