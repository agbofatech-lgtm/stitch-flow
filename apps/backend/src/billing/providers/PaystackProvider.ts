/**
 * Phase 5: Paystack integration boundary (Ghana deployment).
 *
 * STATUS: IMPLEMENTED AS A BOUNDARY — REQUIRES EXTERNAL CREDENTIALS.
 * Live checkout initialization and live webhook processing cannot be
 * verified without a real PAYSTACK_SECRET_KEY; that verification is
 * deferred to Phase 6 production validation. Signature verification and
 * payload normalization are exercised in tests with fixture payloads.
 *
 * Security invariants:
 *   - PAYSTACK_SECRET_KEY is SERVER-ONLY (never VITE_*, never committed).
 *   - Webhook authenticity: HMAC-SHA512 of the RAW request body with the
 *     secret key, compared (timing-safe) against x-paystack-signature.
 *   - No unsigned field in a webhook is trusted to select a workspace;
 *     resolution goes through the server-side checkout reference ledger
 *     or the stored provider subscription mapping.
 */

import crypto from 'crypto';
import { env } from '../../config/env';
import type {
  BillingProvider,
  CheckoutInit,
  CheckoutSession,
  NormalizedBillingEvent,
} from './BillingProvider';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/** Paystack event envelope (subset actually consumed). */
interface PaystackWebhookBody {
  event?: string;
  data?: {
    id?: number | string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    created_at?: string;
    customer?: { customer_code?: string; email?: string };
    subscription_code?: string;
    subscription?: { subscription_code?: string };
  };
}

export class PaystackProvider implements BillingProvider {
  readonly name = 'paystack';

  private get secretKey(): string {
    return env.PAYSTACK_SECRET_KEY;
  }

  async initializeCheckout(input: CheckoutInit): Promise<CheckoutSession> {
    // EXTERNAL CREDENTIAL REQUIRED: this call needs a live secret key.
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.customerEmail,
        amount: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        metadata: {
          // Informational only; NEVER trusted for webhook authorization.
          plan_code: input.planCode,
        },
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      status?: boolean;
      data?: { authorization_url?: string; reference?: string };
      message?: string;
    } | null;

    if (!res.ok || !body?.status || !body.data?.authorization_url) {
      throw new Error(
        `Paystack checkout initialization failed (${res.status}): ${body?.message ?? 'unknown error'}`
      );
    }

    return {
      reference: body.data.reference ?? input.reference,
      authorizationUrl: body.data.authorization_url,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !this.secretKey) return false;
    const expected = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: Buffer): NormalizedBillingEvent | 'irrelevant' | null {
    let parsed: PaystackWebhookBody;
    try {
      parsed = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookBody;
    } catch {
      return null;
    }
    if (!parsed || typeof parsed.event !== 'string' || !parsed.data) return null;

    const data = parsed.data;
    const eventIdSource = data.id ?? data.reference;
    if (eventIdSource === undefined || eventIdSource === null) return null;
    const providerEventId = `${parsed.event}:${String(eventIdSource)}`;

    const occurredAtRaw = data.paid_at ?? data.created_at;
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
    if (Number.isNaN(occurredAt.getTime())) return null;

    const common = {
      providerEventId,
      occurredAt,
      reference: typeof data.reference === 'string' ? data.reference : undefined,
      providerCustomerId: data.customer?.customer_code,
      providerSubscriptionId:
        data.subscription_code ?? data.subscription?.subscription_code,
      amountMinor: typeof data.amount === 'number' ? data.amount : undefined,
      currency: typeof data.currency === 'string' ? data.currency : undefined,
    };

    switch (parsed.event) {
      case 'charge.success':
        return { ...common, type: 'payment.succeeded' };
      case 'invoice.payment_failed':
        return { ...common, type: 'payment.failed' };
      case 'subscription.disable':
        return { ...common, type: 'subscription.cancelled' };
      case 'subscription.not_renew':
        return { ...common, type: 'subscription.cancelled' };
      default:
        // Irrelevant Paystack event types are acknowledged (200) so the
        // provider stops retrying; nothing is recorded as a transition.
        return 'irrelevant';
    }
  }
}
