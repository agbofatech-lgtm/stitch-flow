/**
 * Phase 5: server-side entitlement engine.
 *
 * The authoritative chain:
 *   authenticated user -> workspace -> membership -> subscription -> plan
 *   -> entitlements -> usage -> authorized operation
 *
 * The client can display this information; it cannot redefine it.
 *
 * Effective-state semantics (documented in PHASE5_COMMERCIAL_DOMAIN.md):
 *   trialing              -> plan features, unless trial_end < now => BASIC
 *   active                -> plan features
 *   past_due              -> plan features retained (grace) until an
 *                            expired transition arrives
 *   paused                -> BASIC behavior
 *   cancelled             -> plan features until current_period_end,
 *                            afterwards BASIC (cancel-at-period-end model)
 *   expired               -> BASIC (data preserved, BASIC limits apply)
 *   no subscription row   -> defensive fallback: owner's legacy license
 *                            tier mapped free->BASIC, pro->PRO,
 *                            enterprise->STUDIO (post-migration this path
 *                            should not occur; kept for safety)
 */

import type { PoolClient } from 'pg';
import { query, type Queryable } from '../config/db';
import {
  getPlan,
  legacyLicenseTierToPlan,
  type Plan,
  type PlanCode,
} from '../billing/plans';
import {
  subscriptionRepository,
  type SubscriptionRow,
} from '../repositories/subscriptionRepository';
import { ApiError } from '../utils/apiError';

export type EffectiveStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'none';

export interface Entitlements {
  /** Plan actually purchased/held on the subscription record. */
  subscriptionPlan: PlanCode | null;
  /** Raw subscription status as stored. */
  subscriptionStatus: EffectiveStatus;
  /** Status after applying time-based semantics (trial end, period end). */
  effectiveStatus: EffectiveStatus;
  /** The plan whose limits/features are actually in force right now. */
  effectivePlan: PlanCode;
  limits: Plan['limits'];
  features: Plan['features'];
  usage: {
    customers: number;
    staff: number;
  };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

function isTerminalFallback(status: EffectiveStatus): boolean {
  return status === 'paused' || status === 'expired';
}

/** Time-based effective status without writing to the database. */
export function resolveEffectiveStatus(
  sub: SubscriptionRow,
  now: Date = new Date()
): EffectiveStatus {
  if (sub.status === 'trialing' && sub.trial_end && new Date(sub.trial_end) < now) {
    return 'expired';
  }
  if (
    sub.status === 'cancelled' &&
    (!sub.current_period_end || new Date(sub.current_period_end) < now)
  ) {
    return 'expired';
  }
  return sub.status;
}

function effectivePlanFor(sub: SubscriptionRow, effectiveStatus: EffectiveStatus): PlanCode {
  if (isTerminalFallback(effectiveStatus)) return 'BASIC';
  return sub.plan_code;
}

async function countUsage(
  workspaceId: string,
  runner: Queryable
): Promise<{ customers: number; staff: number }> {
  const customers = await runner.query(
    `SELECT COUNT(*)::int AS n FROM customers
     WHERE workspace_id = $1 AND deleted_at IS NULL`,
    [workspaceId]
  );
  const staff = await runner.query(
    `SELECT COUNT(*)::int AS n FROM workspace_members WHERE workspace_id = $1`,
    [workspaceId]
  );
  return {
    customers: (customers.rows[0] as { n: number }).n,
    staff: (staff.rows[0] as { n: number }).n,
  };
}

async function legacyFallbackPlan(
  workspaceId: string,
  runner: Queryable
): Promise<PlanCode> {
  // Compatibility mapping (Step 24): owner's legacy license tier.
  const result = await runner.query(
    `SELECT l.tier
     FROM workspaces w
     JOIN licenses l ON l.user_id = w.owner_user_id
     WHERE w.id = $1
     ORDER BY l.created_at DESC
     LIMIT 1`,
    [workspaceId]
  );
  const tier = (result.rows[0] as { tier?: string } | undefined)?.tier ?? null;
  return legacyLicenseTierToPlan(tier);
}

export const entitlementService = {
  /**
   * Resolve the effective entitlements for a workspace. Pass a PoolClient
   * to evaluate inside an existing transaction (limit enforcement path).
   */
  async resolveEntitlements(
    workspaceId: string,
    client?: Queryable,
    now: Date = new Date()
  ): Promise<Entitlements> {
    const runner = client ?? { query };
    const sub = await subscriptionRepository.findLatestForWorkspace(workspaceId, runner);
    const usage = await countUsage(workspaceId, runner);

    if (!sub) {
      const fallbackPlan = await legacyFallbackPlan(workspaceId, runner);
      const plan = getPlan(fallbackPlan);
      return {
        subscriptionPlan: null,
        subscriptionStatus: 'none',
        effectiveStatus: 'none',
        effectivePlan: fallbackPlan,
        limits: plan.limits,
        features: plan.features,
        usage,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const effectiveStatus = resolveEffectiveStatus(sub, now);
    const effectivePlan = effectivePlanFor(sub, effectiveStatus);
    const plan = getPlan(effectivePlan);

    return {
      subscriptionPlan: sub.plan_code,
      subscriptionStatus: sub.status,
      effectiveStatus,
      effectivePlan,
      limits: plan.limits,
      features: plan.features,
      usage,
      trialEndsAt: sub.trial_end,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  },

  /**
   * Concurrency-safe customer limit gate. MUST be called inside a
   * transaction; takes a per-workspace row lock so two simultaneous
   * creations serialize and the second sees the first's insert.
   */
  async enforceCustomerLimit(client: PoolClient, workspaceId: string): Promise<void> {
    await client.query('SELECT id FROM workspaces WHERE id = $1 FOR UPDATE', [workspaceId]);
    const entitlements = await this.resolveEntitlements(workspaceId, client);
    const limit = entitlements.limits.customers;
    if (limit !== null && entitlements.usage.customers >= limit) {
      throw new ApiError(
        403,
        'CUSTOMER_LIMIT_REACHED',
        `Your ${entitlements.effectivePlan} plan has reached its customer limit (${entitlements.usage.customers}/${limit}). Upgrade to add more customers.`
      );
    }
  },

  /**
   * Concurrency-safe staff/member limit gate. Same locking discipline as
   * enforceCustomerLimit.
   */
  async enforceStaffLimit(client: PoolClient, workspaceId: string): Promise<void> {
    await client.query('SELECT id FROM workspaces WHERE id = $1 FOR UPDATE', [workspaceId]);
    const entitlements = await this.resolveEntitlements(workspaceId, client);
    const limit = entitlements.limits.staff;
    if (entitlements.usage.staff >= limit) {
      throw new ApiError(
        403,
        'MEMBER_LIMIT_REACHED',
        `Your ${entitlements.effectivePlan} plan has reached its staff member limit (${entitlements.usage.staff}/${limit}). Upgrade to add more staff.`
      );
    }
  },

  /** Feature gate for server-visible premium operations. */
  async requireFeature(
    workspaceId: string,
    feature: keyof Plan['features']
  ): Promise<Entitlements> {
    const entitlements = await this.resolveEntitlements(workspaceId);
    if (!entitlements.features[feature]) {
      throw new ApiError(
        403,
        'FEATURE_NOT_AVAILABLE',
        `This feature is not available on your ${entitlements.effectivePlan} plan. Upgrade to unlock it.`
      );
    }
    return entitlements;
  },
};
