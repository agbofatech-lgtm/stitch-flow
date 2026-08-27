/**
 * Phase 5: billing provider registry.
 *
 * Selection order:
 *   1. NODE_ENV === 'test'          -> TestBillingProvider (deterministic)
 *   2. BILLING_PROVIDER === 'paystack' AND PAYSTACK_SECRET_KEY present
 *                                   -> PaystackProvider
 *   3. otherwise                    -> null (billing not configured;
 *      checkout/webhook endpoints answer with BILLING_PROVIDER_ERROR /
 *      404 respectively — documented EXTERNAL CREDENTIAL REQUIRED state)
 */

import { env } from '../../config/env';
import type { BillingProvider } from './BillingProvider';
import { TestBillingProvider } from './TestBillingProvider';
import { PaystackProvider } from './PaystackProvider';

let cached: BillingProvider | null | undefined;

export function getBillingProvider(): BillingProvider | null {
  if (cached !== undefined) return cached;

  if (env.NODE_ENV === 'test') {
    cached = new TestBillingProvider();
  } else if (env.BILLING_PROVIDER === 'paystack' && env.PAYSTACK_SECRET_KEY) {
    cached = new PaystackProvider();
  } else {
    cached = null;
  }
  return cached;
}

/** Test hook: reset the cached provider (not used in production paths). */
export function resetBillingProviderCache(): void {
  cached = undefined;
}
