/**
 * Phase 5: subscription state machine.
 *
 * Statuses (lowercase in DB, matching existing conventions):
 *   trialing, active, past_due, paused, cancelled, expired
 *
 * Only the transitions enumerated here are legal. Anything else is
 * rejected with INVALID_SUBSCRIPTION_STATE. Same-state "transitions"
 * (active -> active) are legal only where listed (renewal / plan change).
 */

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return (
    typeof value === 'string' &&
    (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Legal transitions. Key = current status, value = statuses reachable
 * from it.
 *
 *  trialing  -> active   (checkout / payment success)
 *  trialing  -> cancelled (user cancels during trial)
 *  trialing  -> expired  (trial period ends)
 *  active    -> active   (renewal or plan change)
 *  active    -> past_due (payment failure)
 *  active    -> paused   (provider/ops pause)
 *  active    -> cancelled (user cancels)
 *  past_due  -> active   (payment recovered)
 *  past_due  -> cancelled
 *  past_due  -> expired  (grace exhausted)
 *  paused    -> active   (resume)
 *  paused    -> cancelled
 *  paused    -> expired
 *  cancelled -> active   (resume / re-subscribe before period end)
 *  cancelled -> expired  (period end)
 *  expired   -> active   (re-subscribe)
 */
const LEGAL_TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  trialing: ['active', 'cancelled', 'expired'],
  active: ['active', 'past_due', 'paused', 'cancelled'],
  past_due: ['active', 'cancelled', 'expired'],
  paused: ['active', 'cancelled', 'expired'],
  cancelled: ['active', 'expired'],
  expired: ['active'],
};

export function isLegalTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus
): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}
