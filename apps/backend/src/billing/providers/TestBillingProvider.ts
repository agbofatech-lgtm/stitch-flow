/**
 * Phase 5: deterministic test billing provider.
 *
 * Enables complete automated coverage of the billing pipeline without any
 * external credentials: signature scheme mirrors Paystack's
 * (HMAC-SHA512 of the raw body), secret comes from TEST_BILLING_SECRET
 * (a test fixture value, NOT a production credential).
 */

import crypto from 'crypto';
import { env } from '../../config/env';
import type {
  BillingProvider,
  CheckoutInit,
  CheckoutSession,
  NormalizedBillingEvent,
  NormalizedBillingEventType,
} from './BillingProvider';

const EVENT_TYPES: readonly NormalizedBillingEventType[] = [
  'payment.succeeded',
  'payment.failed',
  'subscription.cancelled',
  'subscription.expired',
  'subscription.paused',
  'subscription.resumed',
];

export interface TestWebhookPayload {
  id: string;
  type: NormalizedBillingEventType;
  occurredAt: string;
  reference?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  amountMinor?: number;
  currency?: string;
}

export class TestBillingProvider implements BillingProvider {
  readonly name = 'test';

  private get secret(): string {
    return env.TEST_BILLING_SECRET;
  }

  async initializeCheckout(input: CheckoutInit): Promise<CheckoutSession> {
    return {
      reference: input.reference,
      authorizationUrl: `https://billing.test/checkout/${input.reference}`,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = this.signPayload(rawBody);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: Buffer): NormalizedBillingEvent | 'irrelevant' | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Partial<TestWebhookPayload>;
    if (typeof p.id !== 'string' || !p.id) return null;
    if (typeof p.type !== 'string' || !EVENT_TYPES.includes(p.type as NormalizedBillingEventType)) {
      return null;
    }
    const occurredAt = typeof p.occurredAt === 'string' ? new Date(p.occurredAt) : null;
    if (!occurredAt || Number.isNaN(occurredAt.getTime())) return null;

    return {
      providerEventId: p.id,
      type: p.type as NormalizedBillingEventType,
      occurredAt,
      reference: typeof p.reference === 'string' ? p.reference : undefined,
      providerCustomerId:
        typeof p.providerCustomerId === 'string' ? p.providerCustomerId : undefined,
      providerSubscriptionId:
        typeof p.providerSubscriptionId === 'string' ? p.providerSubscriptionId : undefined,
      amountMinor: typeof p.amountMinor === 'number' ? p.amountMinor : undefined,
      currency: typeof p.currency === 'string' ? p.currency : undefined,
    };
  }

  /** Test helper: produce the signature a "provider" would send. */
  signPayload(rawBody: Buffer | string): string {
    return crypto.createHmac('sha512', this.secret).update(rawBody).digest('hex');
  }
}
