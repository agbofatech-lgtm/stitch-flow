# PHASE 5 — BILLING API CONTRACT

All error responses use the existing envelope:
`{"error":{"code":"...","message":"...","requestId":"..."}}` (requestId present outside test env).

## GET /billing/plans
- Auth: **none — PUBLIC BY DESIGN** (marketing catalogue; contains no tenant data or secrets). Rate limit: billing (120/min prod).
- Response 200: `{ plans: [{ code, name, monthlyPrice, currency, billingInterval, limits:{customers,staff}, features:{...} }] }` — exactly BASIC/PRO/STUDIO.

## GET /billing/subscription
- Auth: JWT + verified workspace membership. Rate limit: billing.
- Response 200: `{ subscription: { plan, status, effectiveStatus, trialStart, trialEnd, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, cancelledAt } | null }`.
- Provider internals (`provider_customer_id`, `provider_subscription_id`) are **not** exposed.
- Errors: 401 UNAUTHORIZED, 403 NO_WORKSPACE / NOT_A_MEMBER.

## GET /billing/entitlements
- Auth: JWT + verified workspace membership. Rate limit: billing.
- Response 200: `{ subscriptionPlan, subscriptionStatus, effectiveStatus, effectivePlan, limits:{customers,staff}, features:{...}, usage:{customers,staff}, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd }`.
- Always evaluated server-side against the server clock; the workspace comes from the verified membership only.

## POST /billing/checkout
- Auth: JWT + workspace membership + workspace role **owner|admin**. Rate limit: billing.
- Request: `{ "planCode": "PRO" | "STUDIO" }` — the ONLY client-supplied field; strictly validated.
- Response 201: `{ reference, authorizationUrl, planCode, amountMinor, currency }`.
- Idempotency: each call creates a fresh reference; activation idempotency lives at the webhook.
- Audit/ledger: `checkout.initialized` billing-event row (trusted reference→workspace mapping).
- Errors: 400 INVALID_PLAN (unknown code or BASIC), 401, 403 FORBIDDEN_WORKSPACE_ROLE / NOT_A_MEMBER, 503 BILLING_PROVIDER_ERROR (no provider configured).

## POST /billing/cancel
- Auth: JWT + workspace membership + role **owner|admin**. Rate limit: billing.
- Request: `{}` (any body fields such as workspaceId/subscriptionId are IGNORED — the verified workspace's own subscription is cancelled).
- Behavior: cancel-at-period-end; entitlements persist until `current_period_end`, then BASIC.
- Response 200: `{ subscription: {...} }` (sanitized DTO).
- Audit: `SUBSCRIPTION_CANCELLED` (transactional).
- Errors: 404 SUBSCRIPTION_REQUIRED, 409 INVALID_SUBSCRIPTION_STATE (e.g. double-cancel), 401/403 as above.

## POST /billing/webhook
- Auth: **no JWT** — authenticity = provider HMAC-SHA512 signature over the RAW body (`x-paystack-signature`, or `x-billing-signature` for the test provider). Rate limit: webhook (600/min prod, retry-tolerant).
- Responses:
  - 200 `{ result: 'processed', subscriptionStatus }`
  - 200 `{ result: 'duplicate' }` — same provider event id delivered again
  - 200 `{ result: 'ignored_stale' }` — out-of-order event
  - 200 `{ result: 'irrelevant' }` — non-domain provider event type
  - 200 `{ result: 'rejected', reason }` — unresolvable workspace / illegal transition / amount mismatch (recorded in ledger; 200 so the provider stops retrying an event that can never succeed)
  - 401 INVALID_WEBHOOK_SIGNATURE (audited)
  - 400 BILLING_EVENT_INVALID (malformed payload, audited)
- Idempotency: `billing_events UNIQUE(provider, provider_event_id)`; N deliveries → exactly one effective transition (tested at 2×, 10× and concurrently).

## Stable commercial error codes

`CUSTOMER_LIMIT_REACHED` (403), `MEMBER_LIMIT_REACHED` (403), `FEATURE_NOT_AVAILABLE` (403), `SUBSCRIPTION_REQUIRED` (404), `INVALID_PLAN` (400), `INVALID_SUBSCRIPTION_STATE` (409), `BILLING_PROVIDER_ERROR` (503), `INVALID_WEBHOOK_SIGNATURE` (401), `BILLING_EVENT_INVALID` (400). Duplicate events are intentionally NOT errors (200 `duplicate` result) so provider retries stay cheap; the reserved code `BILLING_EVENT_DUPLICATE` is therefore unused at the HTTP layer.

Enforcement codes also appear on pre-existing endpoints:
- `POST /customers` → 403 CUSTOMER_LIMIT_REACHED (plan limit, concurrency-safe)
- `POST /settings/workspace-members` → 403 MEMBER_LIMIT_REACHED
- `GET /reports/low-stock-materials` → 403 FEATURE_NOT_AVAILABLE (STUDIO `lowStockAlerts`)
