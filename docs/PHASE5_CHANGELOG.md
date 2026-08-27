# PHASE 5 — CHANGELOG

Baseline: `76eeac6` (`phase-5-before-commercialization`). All changes additive; protected files untouched (0-diff verified).

## Database
- **NEW** `apps/backend/migrations/011_commercial_foundation.sql` — `subscriptions` + `billing_events`, constraints, indexes, trial backfill. Additive only.

## Backend — new modules
- `src/billing/plans.ts` — canonical BASIC/PRO/STUDIO catalogue (limits/features extracted from client definitions; GHS 0/45/90), legacy tier mapping.
- `src/billing/subscriptionStateMachine.ts` — legal transition table.
- `src/billing/providers/BillingProvider.ts` — provider-neutral interface + normalized events.
- `src/billing/providers/TestBillingProvider.ts` — deterministic test provider (HMAC-SHA512 fixtures).
- `src/billing/providers/PaystackProvider.ts` — Paystack boundary (signature verification, event normalization, checkout init; live use = EXTERNAL CREDENTIAL REQUIRED).
- `src/billing/providers/index.ts` — provider registry.
- `src/repositories/subscriptionRepository.ts` — subscription persistence + `withTransaction` helper.
- `src/services/subscriptionService.ts` — trial creation, transactional transitions + commercial audits.
- `src/services/entitlementService.ts` — entitlement resolver, concurrency-safe customer/staff limit gates, feature gate.
- `src/services/billingService.ts` — checkout initiation (reference ledger), cancellation, full webhook pipeline (idempotency, stale guard, amount integrity).
- `src/routes/billingRoutes.ts` — /billing/plans|subscription|entitlements|checkout|cancel|webhook.

## Backend — modified
- `src/config/env.ts` — optional-env getter; `TRIAL_DAYS`, `TRIAL_PLAN_CODE`, `BILLING_PROVIDER`, `PAYSTACK_SECRET_KEY`, `TEST_BILLING_SECRET` (all SERVER-ONLY).
- `src/config/db.ts` — exported `Queryable` interface (pool/client-agnostic services).
- `src/config/rateLimit.ts` — `billingRateLimit` (120/min), `webhookRateLimit` (600/min, retry-tolerant).
- `src/app.ts` — raw-body capture on the JSON parser (webhook signatures); mounted `/billing`.
- `src/types/express.d.ts` — `Request.rawBody`.
- `src/services/authService.ts` — register now creates the server-authoritative trial subscription for the new workspace.
- `src/routes/customerRoutes.ts` — POST now transactional: workspace lock → entitlement limit gate → insert → sync event (CUSTOMER_LIMIT_REACHED). GET/PUT unchanged.
- `src/routes/settingsRoutes.ts` — POST /workspace-members now transactional with staff limit gate (MEMBER_LIMIT_REACHED). Other member routes unchanged.
- `src/routes/reportRoutes.ts` — low-stock report gated by STUDIO `lowStockAlerts` (FEATURE_NOT_AVAILABLE).

## Backend — tests
- **NEW** `tests/commercial.test.ts` (28 tests) — catalogue, trial lifecycle, entitlement semantics per status, limit + concurrency enforcement, premium feature gate, forgery resistance, tenant isolation, cancellation, legacy fallback.
- **NEW** `tests/billing.test.ts` (18 tests) — checkout, signature security, activation, amount integrity, idempotency (2×/10×/concurrent), out-of-order, lifecycle transitions, illegal transitions, trial upgrade, financial domain separation.
- `tests/db.test.ts` — migration inventory extended with 011 (reflects the real new migration; not a weakening).
- `tests/setup.ts` — truncation list gains `billing_events`, `subscriptions`.

## Web (client)
- **NEW** `src/shared/api/billing.ts` — typed access to /billing endpoints + display-only entitlement cache.
- `src/components/AccountPanel.tsx` — server-resolved plan/status badge ("(cached)" offline), cache refresh on login/sync, cache clear on logout. No authorization logic added client-side.
- `.env.example` (backend) — new Phase 5 variables documented with placeholders.

## Docs (new)
PHASE5_COMMERCIAL_DOMAIN, PHASE5_BILLING_ARCHITECTURE, PHASE5_BILLING_API, PHASE5_BILLING_ENDPOINT_SECURITY, PHASE5_SECURITY_MATRIX, PHASE5_DATABASE_MIGRATION, PHASE5_ENVIRONMENT_MATRIX, PHASE5_OFFLINE_COMMERCIAL_SEMANTICS, PHASE5_CHANGELOG, PHASE5_RISK_REGISTER, PHASE5_FINAL_REPORT. (PHASE5_BASELINE.md preserved unmodified as historical evidence.)

## Explicitly unchanged
DesignStudio.tsx, patternEngine.ts, productionAssistant.ts (protected — 0 diff); canonical types; db/ offline stack, LocalRepository, syncQueue, syncEngine, PWA config; paymentRoutes/invoiceRoutes/materialRoutes financial engines; JWT/refresh/RBAC middleware; migrations 001–010.
