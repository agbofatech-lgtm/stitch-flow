# PHASE 5 — BILLING ENDPOINT SECURITY AUDIT

Per-endpoint disposition (Step 28). "Membership" = `requireWorkspace` re-verifies `workspace_users` on every request; forged JWT workspace claims → 403 NOT_A_MEMBER (Phase 3 control, unchanged).

| Endpoint | AuthN | Workspace scope | Membership | Role | Entitlement | Validation | Rate limit | Audit | Idempotent | Transaction |
|---|---|---|---|---|---|---|---|---|---|---|
| GET /billing/plans | none — **public by design** (catalogue, no tenant data) | n/a | n/a | n/a | n/a | n/a | billing 120/min | n/a | read-only | n/a |
| GET /billing/subscription | JWT | verified | ✔ | any member | n/a | n/a | billing | n/a | read-only | n/a |
| GET /billing/entitlements | JWT | verified | ✔ | any member | n/a | n/a | billing | n/a | read-only | n/a |
| POST /billing/checkout | JWT | verified | ✔ | owner/admin | n/a | planCode strict-validated against catalogue; body workspaceId ignored | billing | ledger row (checkout.initialized) | new reference per call; activation idempotency at webhook | ledger insert transactional |
| POST /billing/cancel | JWT | verified | ✔ | owner/admin | n/a | body ignored entirely | billing | SUBSCRIPTION_CANCELLED | state machine rejects double-cancel (409) | ✔ (lock + transition + audit) |
| POST /billing/webhook | HMAC-SHA512 signature over raw body (timing-safe) | resolved from **trusted server-side mapping only** | n/a (provider, not user) | n/a | n/a | normalized schema validation; amounts integer minor units; unknown types → irrelevant | webhook 600/min (retry-tolerant) | BILLING_WEBHOOK_RECEIVED / REJECTED, PAYMENT_* | UNIQUE(provider, provider_event_id) | ✔ single tx: ledger + transition + audit |
| POST /customers (existing, now gated) | JWT | verified | ✔ | any member | customer limit (lock + count) | pre-existing validation kept | api 2000/5min | sync change (existing) | n/a | ✔ NEW: lock + limit + insert + sync event |
| POST /settings/workspace-members (existing, now gated) | JWT | verified | ✔ | owner/admin (pre-existing) | staff limit (lock + count) | pre-existing validation kept | api | n/a (pre-existing behavior kept) | duplicate-email 409 kept | ✔ NEW: lock + limit + dup-check + insert |
| GET /reports/low-stock-materials (existing, now gated) | JWT | verified | ✔ | any member | FEATURE_NOT_AVAILABLE unless `lowStockAlerts` | n/a | api | n/a | read-only | n/a |

Checks performed:
- No commercial route is accidentally public: only `/billing/plans` (deliberate, documented) and `/billing/webhook` (signature-authenticated) lack JWT; verified by tests (`unauthenticated requests are rejected on all commercial endpoints`).
- No endpoint accepts a client-supplied workspaceId/plan/subscriptionId as authority (forgery tests in `commercial.test.ts`).
- Webhook cannot choose a workspace: resolution only via `provider_subscription_id` mapping or the server-written checkout ledger; unresolvable events are recorded `rejected` and mutate nothing (tested).
- Provider internals and secrets never appear in responses or logs.
