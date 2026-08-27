/**
 * Phase 5: client access to the server-authoritative commercial state.
 *
 * IMPORTANT SEMANTICS (docs/PHASE5_OFFLINE_COMMERCIAL_SEMANTICS.md):
 *   - The SERVER decides plan, subscription status, limits and features.
 *   - The values cached here are DISPLAY/UX information only. Nothing in
 *     the client authorizes a sensitive operation from this cache; the
 *     backend re-evaluates entitlements on every enforced request.
 *   - Tampering with the cache (localStorage/DevTools) changes what the
 *     UI shows, never what the server allows.
 */

import { apiGet, apiPost } from '../utils/api';

export interface ServerEntitlements {
  subscriptionPlan: 'BASIC' | 'PRO' | 'STUDIO' | null;
  subscriptionStatus: string;
  effectiveStatus: string;
  effectivePlan: 'BASIC' | 'PRO' | 'STUDIO';
  limits: { customers: number | null; staff: number };
  features: Record<string, boolean>;
  usage: { customers: number; staff: number };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface ServerSubscription {
  plan: 'BASIC' | 'PRO' | 'STUDIO';
  status: string;
  effectiveStatus: string;
  trialStart: string | null;
  trialEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
}

export interface ServerPlan {
  code: 'BASIC' | 'PRO' | 'STUDIO';
  name: string;
  monthlyPrice: number;
  currency: string;
  billingInterval: string;
  limits: { customers: number | null; staff: number };
  features: Record<string, boolean>;
}

const ENTITLEMENTS_CACHE_KEY = 'stitchflow.billing.entitlements';

export async function fetchEntitlements(): Promise<ServerEntitlements> {
  return apiGet<ServerEntitlements>('/billing/entitlements');
}

export async function fetchSubscription(): Promise<ServerSubscription | null> {
  const res = await apiGet<{ subscription: ServerSubscription | null }>('/billing/subscription');
  return res.subscription;
}

export async function fetchPlans(): Promise<ServerPlan[]> {
  const res = await apiGet<{ plans: ServerPlan[] }>('/billing/plans');
  return res.plans;
}

export async function startCheckout(planCode: 'PRO' | 'STUDIO'): Promise<{
  reference: string;
  authorizationUrl: string;
}> {
  return apiPost('/billing/checkout', { planCode });
}

export async function cancelSubscription(): Promise<{ subscription: ServerSubscription }> {
  return apiPost('/billing/cancel', {});
}

export interface CachedEntitlements {
  entitlements: ServerEntitlements;
  fetchedAt: string;
}

/** Refresh + cache for offline display. Failures leave the old cache. */
export async function refreshEntitlementsCache(): Promise<ServerEntitlements | null> {
  try {
    const entitlements = await fetchEntitlements();
    const cached: CachedEntitlements = {
      entitlements,
      fetchedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(cached));
    return entitlements;
  } catch {
    return null;
  }
}

/** Cached display copy (may be stale offline — server remains authoritative). */
export function getCachedEntitlements(): CachedEntitlements | null {
  try {
    const raw = window.localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntitlements;
    if (!parsed || typeof parsed !== 'object' || !parsed.entitlements) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearEntitlementsCache(): void {
  window.localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
}
