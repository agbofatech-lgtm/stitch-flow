/**
 * Phase 5: billing service — checkout initiation + webhook processing.
 *
 * Webhook pipeline (Step 19):
 *   receive -> verify signature -> parse/normalize -> idempotency insert
 *   -> resolve workspace via TRUSTED server-side mapping -> stale guard
 *   -> validate semantics -> transactional state transition -> ledger
 *   -> acknowledge.
 *
 * Guarantees:
 *   - Idempotency: billing_events UNIQUE(provider, provider_event_id);
 *     the INSERT ... ON CONFLICT DO NOTHING is the atomic gate, so N
 *     duplicate deliveries produce exactly one effective transition.
 *   - Out-of-order safety: events whose occurredAt <= subscriptions.
 *     last_event_at are recorded as ignored_stale and never applied.
 *   - Workspace resolution NEVER trusts unsigned payload fields: it uses
 *     the stored provider subscription mapping or the server-side
 *     checkout reference ledger (billing_events checkout.initialized rows
 *     written by US at checkout time).
 *   - Transitions + ledger update + audit commit in ONE transaction.
 */

import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { ApiError } from '../utils/apiError';
import { logger } from '../config/logger';
import { getPlan, isPlanCode, type PlanCode } from '../billing/plans';
import type { NormalizedBillingEvent } from '../billing/providers/BillingProvider';
import { getBillingProvider } from '../billing/providers';
import {
  subscriptionRepository,
  withTransaction,
  type SubscriptionRow,
} from '../repositories/subscriptionRepository';
import { isLegalTransition } from '../billing/subscriptionStateMachine';
import { subscriptionService, writeCommercialAudit } from './subscriptionService';
import { auditLogService } from './auditLogService';

const CHECKOUT_EVENT_TYPE = 'checkout.initialized';

export type WebhookOutcome =
  | { result: 'processed'; subscriptionStatus: string }
  | { result: 'duplicate' }
  | { result: 'ignored_stale' }
  | { result: 'irrelevant' }
  | { result: 'rejected'; reason: string };

type CheckoutLedgerPayload = {
  planCode: PlanCode;
  amountMinor: number;
  currency: string;
  userId: string;
};

export const billingService = {
  /**
   * Initialize a checkout for a paid plan. Records the server-side
   * reference -> workspace mapping in the billing event ledger BEFORE
   * contacting the provider, so the later webhook can be resolved without
   * trusting any client- or webhook-supplied workspace id.
   */
  async initiateCheckout(input: {
    workspaceId: string;
    userId: string;
    userEmail: string;
    planCode: string;
  }) {
    const provider = getBillingProvider();
    if (!provider) {
      throw new ApiError(
        503,
        'BILLING_PROVIDER_ERROR',
        'Billing is not configured on this server'
      );
    }

    if (!isPlanCode(input.planCode)) {
      throw new ApiError(400, 'INVALID_PLAN', 'Unknown plan code');
    }
    const plan = getPlan(input.planCode);
    if (plan.monthlyPrice <= 0) {
      throw new ApiError(
        400,
        'INVALID_PLAN',
        'The BASIC plan is free and cannot be purchased'
      );
    }

    const reference = `sf_${crypto.randomUUID()}`;
    const amountMinor = Math.round(plan.monthlyPrice * 100);
    const payload: CheckoutLedgerPayload = {
      planCode: plan.code,
      amountMinor,
      currency: plan.currency,
      userId: input.userId,
    };

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO billing_events
           (provider, provider_event_id, event_type, workspace_id, status, payload, processed_at)
         VALUES ($1, $2, $3, $4, 'processed', $5, NOW())`,
        [
          provider.name,
          `checkout:${reference}`,
          CHECKOUT_EVENT_TYPE,
          input.workspaceId,
          JSON.stringify(payload),
        ]
      );
    });

    const session = await provider.initializeCheckout({
      workspaceId: input.workspaceId,
      planCode: plan.code,
      reference,
      customerEmail: input.userEmail,
      amountMinor,
      currency: plan.currency,
    });

    return {
      reference: session.reference,
      authorizationUrl: session.authorizationUrl,
      planCode: plan.code,
      amountMinor,
      currency: plan.currency,
    };
  },

  /**
   * Owner/admin-initiated cancellation (cancel-at-period-end model:
   * entitlements persist until current_period_end, then fall to BASIC).
   */
  async cancelSubscription(workspaceId: string, userId: string) {
    return withTransaction(async (client) => {
      const sub = await subscriptionRepository.lockLatestForWorkspace(client, workspaceId);
      if (!sub) {
        throw new ApiError(404, 'SUBSCRIPTION_REQUIRED', 'No subscription found');
      }
      if (!isLegalTransition(sub.status, 'cancelled')) {
        throw new ApiError(
          409,
          'INVALID_SUBSCRIPTION_STATE',
          `Subscription cannot be cancelled from status ${sub.status}`
        );
      }
      const now = new Date();
      const updated = await subscriptionService.applyTransition(client, sub, {
        to: 'cancelled',
        occurredAt: now,
        cancelAtPeriodEnd: true,
        cancelledAt: now,
        userId,
        metadata: { initiatedBy: 'user' },
      });
      return updated;
    });
  },

  /**
   * Process a provider webhook delivery. Throws ApiError only for
   * signature failures (401) and malformed payloads (400); all other
   * outcomes acknowledge with 200 and are recorded in the ledger.
   */
  async processWebhook(rawBody: Buffer, signature: string | undefined): Promise<WebhookOutcome> {
    const provider = getBillingProvider();
    if (!provider) {
      throw new ApiError(404, 'BILLING_PROVIDER_ERROR', 'Billing is not configured');
    }

    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      await auditLogService.log({
        action: 'BILLING_WEBHOOK_REJECTED',
        entityType: 'billing_event',
        metadata: { provider: provider.name, reason: 'invalid_signature' },
      });
      throw new ApiError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature is invalid');
    }

    const event = provider.parseWebhookEvent(rawBody);
    if (event === 'irrelevant') {
      return { result: 'irrelevant' };
    }
    if (!event) {
      await auditLogService.log({
        action: 'BILLING_WEBHOOK_REJECTED',
        entityType: 'billing_event',
        metadata: { provider: provider.name, reason: 'malformed_event' },
      });
      throw new ApiError(400, 'BILLING_EVENT_INVALID', 'Webhook payload is malformed');
    }

    return withTransaction(async (client) => {
      // --- Idempotency gate -------------------------------------------
      const inserted = await client.query(
        `INSERT INTO billing_events (provider, provider_event_id, event_type, status, payload)
         VALUES ($1, $2, $3, 'received', $4)
         ON CONFLICT (provider, provider_event_id) DO NOTHING
         RETURNING id`,
        [
          provider.name,
          event.providerEventId,
          event.type,
          JSON.stringify({
            occurredAt: event.occurredAt.toISOString(),
            reference: event.reference ?? null,
            amountMinor: event.amountMinor ?? null,
            currency: event.currency ?? null,
          }),
        ]
      );
      if (inserted.rows.length === 0) {
        return { result: 'duplicate' } as const;
      }
      const billingEventId = (inserted.rows[0] as { id: string }).id;

      const reject = async (reason: string): Promise<WebhookOutcome> => {
        await client.query(
          `UPDATE billing_events SET status = 'rejected', error = $2, processed_at = NOW()
           WHERE id = $1`,
          [billingEventId, reason]
        );
        await writeCommercialAudit(client, {
          action: 'BILLING_WEBHOOK_REJECTED',
          entityType: 'billing_event',
          entityId: billingEventId,
          metadata: { provider: provider.name, eventType: event.type, reason },
        });
        return { result: 'rejected', reason };
      };

      // --- Trusted workspace resolution -------------------------------
      const resolution = await resolveWorkspaceForEvent(client, provider.name, event);
      if (!resolution) {
        return reject('workspace_unresolved');
      }
      const { workspaceId, checkout } = resolution;

      const sub = await subscriptionRepository.lockLatestForWorkspace(client, workspaceId);
      if (!sub) {
        return reject('subscription_not_found');
      }

      // --- Out-of-order guard ------------------------------------------
      if (sub.last_event_at && event.occurredAt <= new Date(sub.last_event_at)) {
        await client.query(
          `UPDATE billing_events
           SET status = 'ignored_stale', workspace_id = $2, subscription_id = $3, processed_at = NOW()
           WHERE id = $1`,
          [billingEventId, workspaceId, sub.id]
        );
        return { result: 'ignored_stale' } as const;
      }

      // --- Amount integrity (checkout-linked payments) ------------------
      if (
        event.type === 'payment.succeeded' &&
        checkout &&
        typeof event.amountMinor === 'number' &&
        event.amountMinor !== checkout.amountMinor
      ) {
        return reject(
          `amount_mismatch expected=${checkout.amountMinor} received=${event.amountMinor}`
        );
      }

      // --- Apply the transition -----------------------------------------
      const outcome = await applyEventTransition(client, sub, event, checkout, provider.name);
      if (outcome.kind === 'rejected') {
        return reject(outcome.reason);
      }

      await client.query(
        `UPDATE billing_events
         SET status = 'processed', workspace_id = $2, subscription_id = $3, processed_at = NOW()
         WHERE id = $1`,
        [billingEventId, workspaceId, sub.id]
      );
      await writeCommercialAudit(client, {
        action: 'BILLING_WEBHOOK_RECEIVED',
        entityType: 'billing_event',
        entityId: billingEventId,
        metadata: {
          provider: provider.name,
          eventId: event.providerEventId,
          eventType: event.type,
          workspaceId,
          subscriptionId: sub.id,
        },
      });

      logger.info(
        {
          provider: provider.name,
          eventId: event.providerEventId,
          eventType: event.type,
          workspaceId,
          subscriptionId: sub.id,
          status: outcome.status,
        },
        'billing webhook processed'
      );

      return { result: 'processed', subscriptionStatus: outcome.status } as const;
    });
  },
};

async function resolveWorkspaceForEvent(
  client: PoolClient,
  providerName: string,
  event: NormalizedBillingEvent
): Promise<{ workspaceId: string; checkout: CheckoutLedgerPayload | null } | null> {
  // 1. Stored provider subscription mapping (set by us on activation).
  if (event.providerSubscriptionId) {
    const sub = await subscriptionRepository.findByProviderSubscriptionId(
      providerName,
      event.providerSubscriptionId,
      client
    );
    if (sub) return { workspaceId: sub.workspace_id, checkout: null };
  }

  // 2. Server-side checkout reference ledger (written at checkout init).
  if (event.reference) {
    const result = await client.query(
      `SELECT workspace_id, payload FROM billing_events
       WHERE provider = $1 AND provider_event_id = $2 AND event_type = $3`,
      [providerName, `checkout:${event.reference}`, CHECKOUT_EVENT_TYPE]
    );
    const row = result.rows[0] as
      | { workspace_id: string | null; payload: CheckoutLedgerPayload }
      | undefined;
    if (row?.workspace_id) {
      return { workspaceId: row.workspace_id, checkout: row.payload };
    }
  }

  return null;
}

async function applyEventTransition(
  client: PoolClient,
  sub: SubscriptionRow,
  event: NormalizedBillingEvent,
  checkout: CheckoutLedgerPayload | null,
  providerName: string
): Promise<{ kind: 'applied' | 'noop'; status: string } | { kind: 'rejected'; reason: string }> {
  const occurredAt = event.occurredAt;

  switch (event.type) {
    case 'payment.succeeded': {
      if (!isLegalTransition(sub.status, 'active')) {
        return { kind: 'rejected', reason: `illegal_transition ${sub.status}->active` };
      }
      const periodEnd = addOneMonth(occurredAt);
      const updated = await subscriptionService.applyTransition(client, sub, {
        to: 'active',
        planCode: checkout?.planCode,
        occurredAt,
        provider: providerName,
        providerCustomerId: event.providerCustomerId ?? sub.provider_customer_id,
        providerSubscriptionId: event.providerSubscriptionId ?? sub.provider_subscription_id,
        currentPeriodStart: occurredAt,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        userId: checkout?.userId ?? null,
        metadata: { via: 'webhook', eventId: event.providerEventId },
      });
      await writeCommercialAudit(client, {
        userId: checkout?.userId ?? null,
        action: 'PAYMENT_VERIFIED',
        entityType: 'subscription',
        entityId: sub.id,
        metadata: {
          workspaceId: sub.workspace_id,
          eventId: event.providerEventId,
          amountMinor: event.amountMinor ?? null,
          currency: event.currency ?? null,
        },
      });
      return { kind: 'applied', status: updated.status };
    }

    case 'payment.failed': {
      await writeCommercialAudit(client, {
        action: 'PAYMENT_FAILED',
        entityType: 'subscription',
        entityId: sub.id,
        metadata: { workspaceId: sub.workspace_id, eventId: event.providerEventId },
      });
      if (sub.status === 'active') {
        const updated = await subscriptionService.applyTransition(client, sub, {
          to: 'past_due',
          occurredAt,
          metadata: { via: 'webhook', eventId: event.providerEventId },
        });
        return { kind: 'applied', status: updated.status };
      }
      // Failure while not active (e.g. trialing) records the payment
      // failure but performs no state transition.
      return { kind: 'noop', status: sub.status };
    }

    case 'subscription.cancelled': {
      if (sub.status === 'cancelled' || sub.status === 'expired') {
        return { kind: 'noop', status: sub.status };
      }
      if (!isLegalTransition(sub.status, 'cancelled')) {
        return { kind: 'rejected', reason: `illegal_transition ${sub.status}->cancelled` };
      }
      const updated = await subscriptionService.applyTransition(client, sub, {
        to: 'cancelled',
        occurredAt,
        cancelAtPeriodEnd: true,
        cancelledAt: occurredAt,
        metadata: { via: 'webhook', eventId: event.providerEventId },
      });
      return { kind: 'applied', status: updated.status };
    }

    case 'subscription.expired': {
      if (sub.status === 'expired') {
        return { kind: 'noop', status: sub.status };
      }
      if (!isLegalTransition(sub.status, 'expired')) {
        return { kind: 'rejected', reason: `illegal_transition ${sub.status}->expired` };
      }
      const updated = await subscriptionService.applyTransition(client, sub, {
        to: 'expired',
        occurredAt,
        metadata: { via: 'webhook', eventId: event.providerEventId },
      });
      return { kind: 'applied', status: updated.status };
    }

    case 'subscription.paused': {
      if (!isLegalTransition(sub.status, 'paused')) {
        return { kind: 'rejected', reason: `illegal_transition ${sub.status}->paused` };
      }
      const updated = await subscriptionService.applyTransition(client, sub, {
        to: 'paused',
        occurredAt,
        metadata: { via: 'webhook', eventId: event.providerEventId },
      });
      return { kind: 'applied', status: updated.status };
    }

    case 'subscription.resumed': {
      if (!isLegalTransition(sub.status, 'active')) {
        return { kind: 'rejected', reason: `illegal_transition ${sub.status}->active` };
      }
      const updated = await subscriptionService.applyTransition(client, sub, {
        to: 'active',
        occurredAt,
        metadata: { via: 'webhook', eventId: event.providerEventId },
      });
      return { kind: 'applied', status: updated.status };
    }
  }
}

function addOneMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}
