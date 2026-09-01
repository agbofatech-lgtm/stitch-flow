# P19.10 Commercial / Billing

PLAN ≠ PRICE ≠ SUBSCRIPTION ≠ PAYMENT ≠ ENTITLEMENT — preserved.

Prices: `amountMinor: null`. USD 29/79 and GHS 45/90 remain simulation **UNRESOLVED**.

Provider: `PaymentProviderPort` conceptual; runtime adapter `test` only. Stripe path → `PROVIDER_DEFERRED`.

Webhook: HMAC, eventId idempotency, stale `occurredAt`, unknown type, failed payment does not activate.

Subscription lifecycle: ACTIVE / PAST_DUE / CANCELLED / EXPIRED. Cancel access **IMMEDIATE** (transitional). Period-end **UNRESOLVED**.

`?payment=success` is not authority.
