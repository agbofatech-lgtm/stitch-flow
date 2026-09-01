import { createHmac, timingSafeEqual } from 'crypto';

export function getBillingWebhookSecret(): string {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === 'test') {
    return secret && secret !== '' ? secret : 'p19-test-webhook-secret';
  }
  if (!secret) {
    throw new Error('Missing required environment variable: BILLING_WEBHOOK_SECRET');
  }
  return secret;
}

export function signBillingPayload(payload: string): string {
  return createHmac('sha256', getBillingWebhookSecret()).update(payload).digest('hex');
}

export function verifyBillingSignature(payload: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = signBillingPayload(payload);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
