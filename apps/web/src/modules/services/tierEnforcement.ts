/**
 * Tier Enforcement Service
 *
 * Enforces Basic vs Pro vs Studio plan restrictions at both UI and logic level.
 * This is the data contract layer - not just visual hiding.
 */

import type {
  AppPermissionAction,
  FeatureAccess,
  TierCode,
  TierFeatureComparisonPlan,
  Workspace,
  WorkspaceMember,
} from '../../types';
import { customers, tiers, workspaceMembers } from '@data/mockData';

export interface TierLimits {
  maxCustomers: number | null;
  maxAssistants: number;
  allowPdfExport: boolean;
  allowPatternGeneration: boolean;
  allowFabricVisualizer: boolean;
  allowAnalytics: boolean;
  allowBrandedExport: boolean;
  allowSavedPreviews: boolean;
  allowMaterialInventory: boolean;
  allowLowStockAlerts: boolean;
  allowAdvancedReports: boolean;
  allowMultiCurrencyReporting: boolean;
}

export interface TierCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentUsage?: number;
  limit?: number | null;
}

export interface TierEvaluationOptions {
  tierCode?: TierCode;
  customerCount?: number;
  assistantCount?: number;
}

/**
 * Resolve active tier for a workspace.
 * Priority:
 * 1. Explicit simulation / override passed from UI
 * 2. Active workspace override plan
 * 3. Workspace tier
 */
export function resolveWorkspaceTierCode(
  workspace: Workspace,
  simulatedTier?: TierCode
): TierCode {
  if (simulatedTier) return simulatedTier;

  const now = new Date();

  if (workspace.overridePlan) {
    if (!workspace.overrideExpiresAt) return workspace.overridePlan;
    if (new Date(workspace.overrideExpiresAt) >= now) {
      return workspace.overridePlan;
    }
  }

  return workspace.tier?.code || 'BASIC';
}

/**
 * Get tier limits for a given tier code
 */
export function getTierLimits(tierCode: TierCode): TierLimits {
  const tier = tiers.find((t) => t.code === tierCode);

  if (!tier) {
    return {
      maxCustomers: 25,
      maxAssistants: 0,
      allowPdfExport: false,
      allowPatternGeneration: false,
      allowFabricVisualizer: false,
      allowAnalytics: false,
      allowBrandedExport: false,
      allowSavedPreviews: false,
      allowMaterialInventory: false,
      allowLowStockAlerts: false,
      allowAdvancedReports: false,
      allowMultiCurrencyReporting: false,
    };
  }

  const isPro = tier.code === 'PRO';
  const isStudio = tier.code === 'STUDIO';

  return {
    maxCustomers: tier.maxCustomers,
    maxAssistants: tier.maxAssistants,
    allowPdfExport: tier.allowPdfExport,
    allowPatternGeneration: tier.allowPatternGeneration,
    allowFabricVisualizer: tier.allowFabricVisualizer,
    allowAnalytics: isPro || isStudio,
    allowBrandedExport: isPro || isStudio,
    allowSavedPreviews: isPro || isStudio,
    allowMaterialInventory: isPro || isStudio,
    allowLowStockAlerts: isStudio,
    allowAdvancedReports: isStudio,
    allowMultiCurrencyReporting: isStudio,
  };
}

function getResolvedTierLimits(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierLimits {
  const tierCode = options?.tierCode || resolveWorkspaceTierCode(workspace);
  return getTierLimits(tierCode);
}

function getCustomerUsage(
  workspace: Workspace,
  options?: TierEvaluationOptions
): number {
  if (typeof options?.customerCount === 'number') {
    return options.customerCount;
  }

  return customers.filter((c) => c.workspaceId === workspace.id).length;
}

function getAssistantUsage(
  workspace: Workspace,
  options?: TierEvaluationOptions
): number {
  if (typeof options?.assistantCount === 'number') {
    return options.assistantCount;
  }

  return workspaceMembers.filter(
    (m) => m.workspaceId === workspace.id && m.role === 'assistant'
  ).length;
}

/**
 * Check if workspace can add more customers
 */
export function checkCanCreateCustomer(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);
  const currentCount = getCustomerUsage(workspace, options);

  if (limits.maxCustomers === null) {
    return {
      allowed: true,
      currentUsage: currentCount,
      limit: null,
    };
  }

  if (currentCount >= limits.maxCustomers) {
    return {
      allowed: false,
      reason: `Customer limit reached (${currentCount}/${limits.maxCustomers})`,
      upgradeRequired: true,
      currentUsage: currentCount,
      limit: limits.maxCustomers,
    };
  }

  return {
    allowed: true,
    currentUsage: currentCount,
    limit: limits.maxCustomers,
  };
}

/**
 * Check if workspace can invite assistants
 */
export function checkCanInviteAssistant(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);
  const currentAssistants = getAssistantUsage(workspace, options);

  if (limits.maxAssistants === 0) {
    return {
      allowed: false,
      reason: 'Assistant seats are not available on Basic plan',
      upgradeRequired: true,
      currentUsage: currentAssistants,
      limit: 0,
    };
  }

  if (currentAssistants >= limits.maxAssistants) {
    return {
      allowed: false,
      reason: `Assistant limit reached (${currentAssistants}/${limits.maxAssistants})`,
      upgradeRequired: true,
      currentUsage: currentAssistants,
      limit: limits.maxAssistants,
    };
  }

  return {
    allowed: true,
    currentUsage: currentAssistants,
    limit: limits.maxAssistants,
  };
}

/**
 * Check if user can export PDF
 */
export function checkCanExportPdf(
  workspace: Workspace,
  member: WorkspaceMember,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowPdfExport) {
    return {
      allowed: false,
      reason: 'PDF export is not available on Basic plan',
      upgradeRequired: true,
    };
  }

  if (!member.canExportPdf && member.role !== 'owner') {
    return {
      allowed: false,
      reason: 'PDF export permission not granted',
    };
  }

  return { allowed: true };
}

/**
 * Check if pattern generation is available
 */
export function checkCanGeneratePattern(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowPatternGeneration) {
    return {
      allowed: false,
      reason: 'Pattern generation requires Pro plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if fabric visualizer is available
 */
export function checkCanUseFabricVisualizer(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowFabricVisualizer) {
    return {
      allowed: false,
      reason: 'Fabric visualizer requires Pro plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if analytics is available
 */
export function checkCanViewAnalytics(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowAnalytics) {
    return {
      allowed: false,
      reason: 'Analytics requires Pro plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if preview can be saved
 */
export function checkCanSavePreview(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowSavedPreviews) {
    return {
      allowed: false,
      reason: 'Saved previews require Pro plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if branded export is available
 */
export function checkCanBrandExport(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowBrandedExport) {
    return {
      allowed: false,
      reason: 'Branded exports require Pro plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if material inventory is available
 */
export function checkCanManageMaterialInventory(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowMaterialInventory) {
    return {
      allowed: false,
      reason: 'Material inventory requires Pro plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if low stock alerts are available
 */
export function checkCanViewLowStockAlerts(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowLowStockAlerts) {
    return {
      allowed: false,
      reason: 'Low stock alerts require Studio plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if advanced reports are available
 */
export function checkCanViewAdvancedReports(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowAdvancedReports) {
    return {
      allowed: false,
      reason: 'Advanced reports require Studio plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Check if multi-currency reporting is available
 */
export function checkCanUseMultiCurrencyReporting(
  workspace: Workspace,
  options?: TierEvaluationOptions
): TierCheckResult {
  const limits = getResolvedTierLimits(workspace, options);

  if (!limits.allowMultiCurrencyReporting) {
    return {
      allowed: false,
      reason: 'Multi-currency reporting requires Studio plan',
      upgradeRequired: true,
    };
  }

  return { allowed: true };
}

/**
 * Get all feature access for a workspace/member combination
 */
export function getFeatureAccess(
  workspace: Workspace,
  member: WorkspaceMember,
  options?: TierEvaluationOptions
): FeatureAccess {
  return {
    canCreateCustomer: checkCanCreateCustomer(workspace, options),
    canInviteAssistant: checkCanInviteAssistant(workspace, options),
    canExportPdf: checkCanExportPdf(workspace, member, options),
    canGeneratePattern: checkCanGeneratePattern(workspace, options),
    canUseFabricVisualizer: checkCanUseFabricVisualizer(workspace, options),
    canViewAnalytics: checkCanViewAnalytics(workspace, options),
    canSavePreview: checkCanSavePreview(workspace, options),
    canBrandExport: checkCanBrandExport(workspace, options),
    canManageMaterialInventory: checkCanManageMaterialInventory(workspace, options),
    canViewLowStockAlerts: checkCanViewLowStockAlerts(workspace, options),
    canViewAdvancedReports: checkCanViewAdvancedReports(workspace, options),
    canUseMultiCurrencyReporting: checkCanUseMultiCurrencyReporting(
      workspace,
      options
    ),
  };
}

/**
 * Role-based permission check
 */
export function checkRolePermission(
  member: WorkspaceMember,
  action: AppPermissionAction
): boolean {
  if (member.role === 'owner') {
    return true;
  }

  switch (action) {
    case 'manage_billing':
    case 'manage_assistants':
      return false;

    case 'manage_customers':
      return member.canManageCustomers;

    case 'manage_orders':
      return member.canManageOrders;

    case 'manage_payments':
      return member.canManagePayments;

    case 'manage_materials':
    case 'manage_designs':
      return member.canManageOrders;

    case 'view_reports':
      return true;

    default:
      return false;
  }
}

/**
 * API-level enforcement helper
 */
export function enforceFeatureAccess<T>(
  check: TierCheckResult,
  action: () => T
): T | { error: string; upgradeRequired: boolean } {
  if (!check.allowed) {
    return {
      error: check.reason || 'Feature not available',
      upgradeRequired: check.upgradeRequired || false,
    };
  }

  return action();
}

type TierFeatureComparisonWithPrice = TierFeatureComparisonPlan & {
  price: string;
};

export const FEATURE_COMPARISON: Record<TierCode, TierFeatureComparisonWithPrice> = {
  BASIC: {
    code: 'BASIC',
    name: 'Basic',
    price: '$0/month',
    features: [
      { key: 'customers', name: 'Up to 25 customers', included: true },
      { key: 'orders', name: 'Basic order management', included: true },
      { key: 'invoices', name: 'Invoice generation', included: true },
      { key: 'payments', name: 'Payment tracking', included: true },
      { key: 'assistants', name: 'Assistant seats', included: false },
      { key: 'pdf', name: 'PDF export', included: false },
      { key: 'patterns', name: 'Pattern generation', included: false },
      { key: 'fabric', name: 'Fabric visualizer', included: false },
      { key: 'previews', name: 'Saved previews', included: false },
      { key: 'analytics', name: 'Analytics dashboard', included: false },
      { key: 'materials', name: 'Material inventory', included: false },
      { key: 'low_stock', name: 'Low stock alerts', included: false },
      { key: 'advanced_reports', name: 'Advanced reports', included: false },
      { key: 'multi_currency', name: 'Multi-currency reporting', included: false },
    ],
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    price: '$29/month',
    features: [
      { key: 'customers', name: 'More customers / high limits', included: true },
      { key: 'orders', name: 'Full order management', included: true },
      { key: 'invoices', name: 'Invoice generation', included: true },
      { key: 'payments', name: 'Payment tracking', included: true },
      { key: 'assistants', name: 'Assistant seats', included: true },
      { key: 'pdf', name: 'PDF export', included: true },
      { key: 'patterns', name: 'Pattern generation', included: true },
      { key: 'fabric', name: 'Fabric visualizer', included: true },
      { key: 'previews', name: 'Saved previews', included: true },
      { key: 'analytics', name: 'Analytics dashboard', included: true },
      { key: 'materials', name: 'Material inventory', included: true },
      { key: 'low_stock', name: 'Low stock alerts', included: false },
      { key: 'advanced_reports', name: 'Advanced reports', included: false },
      { key: 'multi_currency', name: 'Multi-currency reporting', included: false },
    ],
  },
  STUDIO: {
    code: 'STUDIO',
    name: 'Studio',
    price: '$79/month',
    features: [
      { key: 'customers', name: 'Unlimited customers', included: true },
      { key: 'orders', name: 'Advanced order workflow', included: true },
      { key: 'invoices', name: 'Invoice generation', included: true },
      { key: 'payments', name: 'Payment tracking', included: true },
      { key: 'assistants', name: 'More assistant seats', included: true },
      { key: 'pdf', name: 'PDF export', included: true },
      { key: 'patterns', name: 'Pattern generation', included: true },
      { key: 'fabric', name: 'Fabric visualizer', included: true },
      { key: 'previews', name: 'Saved previews', included: true },
      { key: 'analytics', name: 'Analytics dashboard', included: true },
      { key: 'materials', name: 'Material inventory', included: true },
      { key: 'low_stock', name: 'Low stock alerts', included: true },
      { key: 'advanced_reports', name: 'Advanced reports', included: true },
      { key: 'multi_currency', name: 'Multi-currency reporting', included: true },
      { key: 'studio_tools', name: 'Studio-grade business tools', included: true },
    ],
  },
} as const;

