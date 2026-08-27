/**
 * Phase 5: provider-neutral billing boundary.
 *
 * The application couples ONLY to this interface. Implementations:
 *   - TestBillingProvider  — deterministic, credential-free (automated tests)
 *   - PaystackProvider     — Ghana deployment boundary
 *                            (REQUIRES EXTERNAL CREDENTIALS: PAYSTACK_SECRET_KEY)
 *
 * Only operations actually required by the Phase 5 commercial model are
 * declared (Step 16: "Do not blindly implement every method").
 */

import type { PlanCode } from '../plans';

/** Normalized provider event vocabulary (provider adapters map into this). */
export type NormalizedBillingEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'subscription.cancelled'
  | 'subscription.expired'
  | 'subscription.paused'
  | 'subscription.resumed';

export interface NormalizedBillingEvent {
  /** Provider-unique event id — the idempotency key. */
  providerEventId: string;
  type: NormalizedBillingEventType;
  /** When the event occurred at the provider (out-of-order guard input). */
  occurredAt: Date;
  /** Checkout reference (present on payment events initiated by us). */
  reference?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  /** Amount in minor units (pesewas) as reported by the provider. */
  amountMinor?: number;
  currency?: string;
}

export interface CheckoutInit {
  workspaceId: string;
  planCode: PlanCode;
  /** Server-generated checkout reference (maps webhook -> workspace). */
  reference: string;
  customerEmail: string;
  /** Amount in minor units (pesewas). */
  amountMinor: number;
  currency: string;
}

export interface CheckoutSession {
  reference: string;
  /** URL the client is redirected to; test provider returns a stub URL. */
  authorizationUrl: string;
}

export interface BillingProvider {
  readonly name: string;

  /** Begin a checkout for a plan purchase/upgrade. */
  initializeCheckout(input: CheckoutInit): Promise<CheckoutSession>;

  /**
   * Verify the webhook signature against the RAW request body.
   * Must return false (never throw) for bad/missing signatures.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;

  /**
   * Parse + normalize a webhook payload.
   * Returns null when the payload is malformed (rejected with 400);
   * returns 'irrelevant' for well-formed provider events outside the
   * commercial domain (acknowledged with 200 so the provider stops
   * retrying).
   */
  parseWebhookEvent(rawBody: Buffer): NormalizedBillingEvent | 'irrelevant' | null;
}
