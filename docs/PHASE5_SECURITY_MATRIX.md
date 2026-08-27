# PHASE 5 — COMMERCIAL SECURITY MATRIX

All results verified by executed automated tests on 2026-08-27 (backend 129/129 PASS; suites `commercial.test.ts` 28, `billing.test.ts` 18, plus Phases 2–4 suites unchanged). "Test" names the concrete test exercising the control.

| # | Threat | Control | Test (executed) | Result | Status |
|---|---|---|---|---|---|
| 1 | Unauthenticated access to commercial data | JWT + `requireWorkspace` on subscription/entitlements/checkout/cancel | "unauthenticated requests are rejected on all commercial endpoints" | 401 for all four | PASS |
| 2 | Cross-tenant subscription read | subscription resolved only from verified membership workspace | "workspace A sees only its own subscription and entitlements" | A=BASIC, B=STUDIO isolated | PASS |
| 3 | Cross-tenant subscription mutation | cancel operates only on own workspace; body ids ignored | "cancel cannot touch another workspace even with forged ids" | B untouched (trialing) | PASS |
| 4 | Plan forgery (body/query `plan`, `premium`, `tier`, `subscription`) | enforcement reads only server subscription state | "client-supplied plan/premium fields are ignored by enforcement" | CUSTOMER_LIMIT_REACHED still enforced | PASS |
| 5 | Workspace forgery (`workspaceId` in body/query) | `req.workspaceId` from verified membership only | "forged workspaceId in body/query cannot switch the evaluated workspace" | limit enforced on A; 0 rows in B | PASS |
| 6 | Entitlement forgery via localStorage/IndexedDB/DevTools | client cache is display-only; server re-evaluates every enforced request; no client value enters authorization | design + tests 4/5 (server ignores all client-supplied commercial state) | no client input path exists | PASS |
| 7 | Trial forgery / extension (client clock, localStorage) | trial lives in `subscriptions.trial_end`; lazy expiry vs SERVER clock | "an expired trial falls back to BASIC entitlements (server clock, not client)" | effective BASIC despite client state | PASS |
| 8 | Unauthorized upgrade/cancel by assistant | `requireWorkspaceRole('owner','admin')` | "assistant workspace role cannot start a checkout" | 403 FORBIDDEN_WORKSPACE_ROLE | PASS |
| 9 | Webhook forgery (no/false signature) | HMAC-SHA512 over raw body, timing-safe compare | "rejects a missing signature", "rejects a forged signature", "a tampered body fails verification" | 401 + rejection audit | PASS |
| 10 | Webhook replay / duplication | `UNIQUE(provider, provider_event_id)` idempotency gate | 2×, 10×, concurrent duplicate tests | exactly 1 transition, N-1 duplicates | PASS |
| 11 | Out-of-order webhook downgrade | `last_event_at` stale guard | "a delayed older event does not downgrade newer subscription state" | ignored_stale, state preserved | PASS |
| 12 | Forged payment amount | checkout-ledger amount match required | "rejects a payment whose amount does not match the checkout amount" | rejected, subscription unchanged | PASS |
| 13 | Webhook workspace selection by attacker | resolution only via provider mapping / server checkout ledger | "a webhook with an unresolvable workspace is recorded and does not mutate anything" | rejected, no mutation | PASS |
| 14 | Limit bypass via concurrency | per-workspace `FOR UPDATE` lock + in-tx count | "two simultaneous customer/staff creations for the final slot" | exactly [201,403]; counts exact | PASS |
| 15 | Subscription state corruption (illegal transitions) | state machine on every transition | "an illegal provider transition is rejected and recorded", "double-cancel is rejected" | 200 rejected / 409; state unchanged | PASS |
| 16 | Premium feature access on low plan | `entitlementService.requireFeature` server gate | "BASIC workspace is denied the low-stock premium report" | 403 FEATURE_NOT_AVAILABLE | PASS |
| 17 | Secret exposure | server-only env (`PAYSTACK_SECRET_KEY` never VITE_*); repo scan; no secrets in responses/logs | Step 40 scan executed (placeholders + test fixtures only); built frontend bundle contains no secret vars | clean | PASS |
| 18 | Audit integrity | commercial audits written on the transaction client (rollback rolls audit back) | activation test asserts PAYMENT_VERIFIED + SUBSCRIPTION_ACTIVATED + BILLING_WEBHOOK_RECEIVED present; idempotency tests assert exactly 1 activation audit | consistent | PASS |
| 19 | Billing/tailor financial contamination | disjoint tables/services; no shared writes | "webhook processing writes nothing into tailor payments/invoices tables" | 0 rows | PASS |
| 20 | Rate-limit DoS on billing endpoints | `billingRateLimit` 120/min, `webhookRateLimit` 600/min (retry-tolerant) | configuration reviewed; limiter middleware active on all /billing routes | wired | PASS (config-level) |

## Phase 3–4 security regression (Step 54)

Re-executed via the full backend suite (129/129): expired/invalid JWT (auth suite), refresh replay + single-use rotation race, role escalation (admin RBAC suite), forged workspaceId → NOT_A_MEMBER, cross-tenant read/update/delete + IDOR (tenant-isolation suite), input validation (financial-integrity + phase4-hardening suites), rate limiting (test-mode config), secret exposure (scan). **No security regression.**
