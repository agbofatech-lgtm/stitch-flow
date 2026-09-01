# P19.5 Subscription Model

Implemented: `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`.

Not implemented: `TRIALING`, `PAUSED` (extension).

Subscription ≠ payment status. Payment `PAYMENT_CONFIRMED` may activate subscription; `PAYMENT_FAILED` does not.

Cancel and expiry remove entitlements.
