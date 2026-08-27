/**
 * Phase 5: subscription lifecycle service.
 *
 * All state changes flow through applyTransition, which enforces the
 * state machine, stamps last_event_at (out-of-order guard) and writes the
 * commercial audit event in the SAME transaction (uses the existing
 * audit_logs table — not a parallel audit system; the insert is issued on
 * the transaction client so a rollback rolls the audit back too).
 */

import type { PoolClient } from 'pg';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { comparePlans, isPlanCode, type PlanCode } from '../billing/plans';
import {
  isLegalTransition,
  type SubscriptionStatus,
} from '../billing/subscriptionStateMachine';
import {
  subscriptionRepository,
  withTransaction,
  type SubscriptionRow,
} from '../repositories/subscriptionRepository';

export type CommercialAuditAction =
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_UPGRADED'
  | 'SUBSCRIPTION_DOWNGRADED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_FAILED'
  | 'BILLING_WEBHOOK_RECEIVED'
  | 'BILLING_WEBHOOK_REJECTED';

export async function writeCommercialAudit(
  client: Pick<PoolClient, 'query'>,
  data: {
    userId?: string | null;
    action: CommercialAuditAction;
    entityType: 'subscription' | 'billing_event';
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      data.userId ?? null,
      data.action,
      data.entityType,
      data.entityId ?? null,
      JSON.stringify(data.metadata ?? {}),
    ]
  );
}

function auditActionForTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
  fromPlan: PlanCode,
  toPlan: PlanCode
): CommercialAuditAction {
  if (to === 'active') {
    if (from === 'active' && fromPlan !== toPlan) {
      return comparePlans(toPlan, fromPlan) > 0
        ? 'SUBSCRIPTION_UPGRADED'
        : 'SUBSCRIPTION_DOWNGRADED';
    }
    return 'SUBSCRIPTION_ACTIVATED';
  }
  if (to === 'past_due') return 'SUBSCRIPTION_PAST_DUE';
  if (to === 'paused') return 'SUBSCRIPTION_PAUSED';
  if (to === 'cancelled') return 'SUBSCRIPTION_CANCELLED';
  return 'SUBSCRIPTION_EXPIRED';
}

export function getTrialConfig(): { days: number; planCode: PlanCode } {
  const days = Number(env.TRIAL_DAYS);
  const planCode = isPlanCode(env.TRIAL_PLAN_CODE) ? env.TRIAL_PLAN_CODE : 'STUDIO';
  return { days: Number.isFinite(days) && days > 0 ? days : 14, planCode };
}

export const subscriptionService = {
  /**
   * Server-authoritative trial creation. Called when a workspace is
   * created (auth register). Trial duration/plan come from documented
   * business configuration (TRIAL_DAYS / TRIAL_PLAN_CODE).
   */
  async createTrialForWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<SubscriptionRow> {
    const { days, planCode } = getTrialConfig();
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + days * 24 * 60 * 60 * 1000);

    return withTransaction(async (client) => {
      const sub = await subscriptionRepository.createTrial(
        { workspaceId, planCode, trialStart, trialEnd },
        client
      );
      await writeCommercialAudit(client, {
        userId,
        action: 'SUBSCRIPTION_CREATED',
        entityType: 'subscription',
        entityId: sub.id,
        metadata: {
          workspaceId,
          planCode,
          status: 'trialing',
          trialEnd: trialEnd.toISOString(),
        },
      });
      return sub;
    });
  },

  /**
   * Validate and persist a subscription state transition inside the
   * caller's transaction. Throws INVALID_SUBSCRIPTION_STATE for illegal
   * transitions. Returns the updated row.
   */
  async applyTransition(
    client: PoolClient,
    sub: SubscriptionRow,
    input: {
      to: SubscriptionStatus;
      planCode?: PlanCode;
      occurredAt: Date;
      provider?: string;
      providerCustomerId?: string | null;
      providerSubscriptionId?: string | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      cancelledAt?: Date | null;
      userId?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<SubscriptionRow> {
    if (!isLegalTransition(sub.status, input.to)) {
      throw new ApiError(
        409,
        'INVALID_SUBSCRIPTION_STATE',
        `Illegal subscription transition ${sub.status} -> ${input.to}`
      );
    }

    const toPlan = input.planCode ?? sub.plan_code;
    const action = auditActionForTransition(sub.status, input.to, sub.plan_code, toPlan);

    const updated = await subscriptionRepository.update(client, sub.id, {
      status: input.to,
      planCode: toPlan,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      cancelledAt: input.cancelledAt,
      lastEventAt: input.occurredAt,
    });

    await writeCommercialAudit(client, {
      userId: input.userId ?? null,
      action,
      entityType: 'subscription',
      entityId: sub.id,
      metadata: {
        workspaceId: sub.workspace_id,
        from: sub.status,
        to: input.to,
        fromPlan: sub.plan_code,
        toPlan,
        occurredAt: input.occurredAt.toISOString(),
        ...(input.metadata ?? {}),
      },
    });

    return updated;
  },
};
