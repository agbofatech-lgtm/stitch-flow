/**
 * TRANSITIONAL UX only (ADR-006). Not commercial authority.
 * Server entitlement/access: GET /platform/entitlements, POST /platform/access/check.
 */
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
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
  const resolvedTitle = title || `${requiredTier.name} capability`;
  const resolvedDescription = description || getTierUpgradeMessage(feature);

  return (
    <div
      role="status"
      className={
        compact
          ? 'rounded-sf-lg border border-dashed border-status-warning/40 bg-status-warning/10 p-4'
          : 'rounded-sf-lg border border-dashed border-line bg-surface-workspace p-8 text-center'
      }
    >
      <div className={compact ? 'flex items-start gap-3' : ''}>
        <div className={compact ? 'rounded-sf bg-surface-elevated p-2 text-status-warning' : 'mx-auto mb-3'}>
          <Lock className={compact ? 'h-4 w-4' : 'mx-auto h-10 w-10 text-ink-muted'} />
        </div>
        <div className={compact ? 'min-w-0 flex-1' : ''}>
          <p className={compact ? 'text-sm font-semibold text-ink-primary' : 'font-display text-heading-sm text-ink-primary'}>
            {resolvedTitle}
          </p>
          <p className={compact ? 'mt-1 text-sm text-ink-muted' : 'mx-auto mt-2 max-w-2xl text-body text-ink-muted'}>
            {resolvedDescription}
          </p>
          <p className="mt-3 text-meta text-ink-muted">
            FeatureGate is UX presentation only. Commercial grant remains server-side. Live billing is not opened from this screen.
          </p>
        </div>
      </div>
    </div>
  );
}
