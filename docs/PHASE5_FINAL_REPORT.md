# STITCHFLOW PHASE 5 v2 FINAL REPORT

Date: 2026-08-27 · Branch: `arena/01a04183-stitch-flow`

## 1. Executive Summary

Phase 5 v2 built the server-authoritative commercial control plane on the untouched Phase 4 production-hardened base: canonical BASIC/PRO/STUDIO plans, workspace-scoped subscriptions with a strict state machine, a server-authoritative trial, a centralized entitlement engine with concurrency-safe limit enforcement, a provider-neutral billing boundary (deterministic test provider + Paystack boundary), a signature-verified idempotent out-of-order-safe webhook pipeline, and a durable billing event ledger. 46 new backend tests (129/129 total) plus the unchanged 41 client tests all pass; protected IP is 0-diff; live Paystack usage remains an explicitly documented EXTERNAL DEPENDENCY for Phase 6.

## 2. Baseline

Baseline commit: `76eeac6` (tag `phase-5-before-commercialization`, remote-verified). Baseline regression re-executed before implementation: web tsc 0 / lint 16 documented protected findings / 41/41 client / backend tsc 0 / 83/83 backend / build PASS / protected-IP smoke PASS — identical to the recorded baseline; no discrepancy.

## 3. Commercial Architecture

Authoritative chain enforced on every commercial decision:
`authenticated user → workspace → membership (re-verified per request) → subscription → plan → entitlements → usage → authorized operation`.
The client displays this state (AccountPanel badge, localStorage display cache); it cannot redefine it — no client-supplied plan/tier/workspace/premium field reaches any authorization path (forgery-tested). Details: docs/PHASE5_COMMERCIAL_DOMAIN.md, PHASE5_BILLING_ARCHITECTURE.md.

## 4. Plan Catalogue

Single server catalogue `apps/backend/src/billing/plans.ts` (limits/features extracted from pre-existing client definitions; prices per client TIER_META, GHS):

- **BASIC** — GHS 0/mo · 25 customers · 0 staff · basic reports only.
- **PRO** — GHS 45/mo · 250 customers · 5 staff · + pdf/branded export, pattern generation/save, measurement profiles, fabric visualizer, analytics, saved previews, material inventory, job-sheet export.
- **STUDIO** — GHS 90/mo · unlimited customers · 15 staff · + low-stock alerts, advanced reports, multi-currency reporting, production assistant, fit warnings.

## 5. Subscription State Machine

States (lowercase in DB): trialing, active, past_due, paused, cancelled, expired. Legal transitions only (`subscriptionStateMachine.ts`); every change goes through `applyTransition` (409 `INVALID_SUBSCRIPTION_STATE` otherwise) with transactional audit. Out-of-order provider events guarded by `last_event_at`. Tested: legal lifecycle chains, illegal `active→expired` rejection, double-cancel rejection, stale-event ignore.

## 6. Trial Lifecycle

Server-side creation at workspace registration (`TRIAL_DAYS=14`, `TRIAL_PLAN_CODE=STUDIO`, documented business configuration); migration backfill for pre-existing workspaces; lazy read-only expiry against the SERVER clock (expired trial ⇒ effective BASIC). Tested: creation, ~14-day end date, audit event, expiry fallback, access during trial, upgrade during trial. Client trial values are cached display only.

## 7. Entitlement Engine

`entitlementService.resolveEntitlements(workspaceId)` → subscriptionPlan/status, effectiveStatus/effectivePlan, limits, features, usage (derived from authoritative tables — deliberately **no** usage_counters table, so counters cannot drift or become a bypass), trial/period metadata. Semantics per status documented (past_due = grace; paused/expired = BASIC; cancelled = until period end). Defensive fallback for subscription-less workspaces maps legacy license tiers (free→BASIC, pro→PRO, enterprise→STUDIO).

## 8. Server-Side Enforcement

- `POST /customers` — transactional: workspace `FOR UPDATE` lock → limit gate → insert → sync event; 403 `CUSTOMER_LIMIT_REACHED`.
- `POST /settings/workspace-members` — same pattern; 403 `MEMBER_LIMIT_REACHED`.
- `GET /reports/low-stock-materials` — 403 `FEATURE_NOT_AVAILABLE` below STUDIO.
- Concurrency: two simultaneous requests for the final slot → exactly one 201 + one 403, exact final counts (tested for customers and staff).
- Client `tierEnforcement.ts` is now UX assistance only (unchanged code, demoted authority — documented).

## 9. Database Migration

Migration number: **011** (`011_commercial_foundation.sql`) — next free number verified.
Tables: `subscriptions`, `billing_events` (+ trial backfill; NO destructive operations).
Indexes: `uq_subscriptions_workspace_live` (partial unique — one live subscription per workspace), `uq_subscriptions_provider_subscription` (partial unique), `idx_subscriptions_workspace`, `idx_billing_events_workspace`, `idx_billing_events_type`.
Constraints: plan/status CHECKs, FKs to workspaces/subscriptions, `billing_events UNIQUE(provider, provider_event_id)`.
Verified by executing the real migration runner against embedded PostgreSQL 18.4 (jest globalSetup) with the full suite passing afterwards; migration inventory test updated to include 011. Existing tables undamaged (all pre-existing suites pass). Guide: docs/PHASE5_DATABASE_MIGRATION.md.

## 10. Billing Provider Architecture

Test Provider: IMPLEMENTED + TESTED — deterministic HMAC-SHA512 fixtures; drives success/failure/cancel/expire/duplicate/out-of-order/invalid-signature/malformed/amount-mismatch scenarios.
Paystack: BOUNDARY IMPLEMENTED (checkout init, signature verification, event normalization for charge.success / invoice.payment_failed / subscription.disable / not_renew; irrelevant types acknowledged). Chosen for Ghana/GHS/mobile-money fit — Stripe not auto-selected.
External dependencies: live `PAYSTACK_SECRET_KEY`, dashboard webhook registration, live payment verification — **EXTERNAL CREDENTIAL REQUIRED / DEFERRED TO PHASE 6**. No live functionality is claimed.

## 11. Webhook Security

Signature verification: **PASS** (missing/forged/tampered-body → 401 + audit; timing-safe compare over RAW body captured by the JSON-parser verify hook).
Idempotency: **PASS** (2×, 10×, concurrent duplicates → exactly one transition; ledger UNIQUE key).
Replay protection: **PASS** (same mechanism — replayed event id is a recorded no-op duplicate).
Out-of-order handling: **PASS** (older event vs `last_event_at` → `ignored_stale`, state preserved).
Also: amount-integrity check vs the server checkout ledger; workspace resolution never trusts unsigned payload fields.

## 12. Tenant Isolation

Result: ZERO cross-tenant commercial leakage in tests — A cannot read/modify B's subscription or entitlements; forged workspace/subscription ids ignored; assistant role blocked from checkout; unauthenticated blocked everywhere; webhook cannot select a workspace. Phase 3/4 isolation suites unchanged and passing.

## 13. Security Verification

Full matrix with per-threat executed tests: docs/PHASE5_SECURITY_MATRIX.md (20 rows, all PASS). Phase 3–4 security regression re-executed via the complete backend suite — no regression. Secret scan executed: placeholders and test fixtures only; nothing sensitive in the frontend bundle.

## 14. Financial Regression

Tailor-side financial engine untouched (`paymentRoutes`/`invoiceRoutes` 0-diff): invoice balance, payment atomicity, duplicate-payment protection, inventory invariants — all pre-existing tests pass. Domain separation additionally proven: webhook processing writes zero rows to `payments`/`invoices`. SaaS money handled in integer minor units (pesewas); no floating-point money arithmetic introduced.

## 15. Offline Regression

Client offline suite 41/41 PASS (unchanged tests). Offline stack (Dexie schema, LocalRepository, syncQueue, syncEngine, PWA SW config) 0-diff. Offline commercial semantics defined and documented: docs/PHASE5_OFFLINE_COMMERCIAL_SEMANTICS.md.

## 16. Compatibility Mapping

Legacy licensing: `licenses` (free/pro/enterprise) remains **device licensing** only — kept, unchanged, not the SaaS entitlement source.
Commercial subscription: workspace-scoped `subscriptions` with BASIC/PRO/STUDIO is authoritative. Fallback mapping free→BASIC / pro→PRO / enterprise→STUDIO applies only to subscription-less workspaces (defensive; tested). Full audit table: PHASE5_COMMERCIAL_DOMAIN.md §15.

## 17. API Changes

New: `GET /billing/plans` (public catalogue), `GET /billing/subscription`, `GET /billing/entitlements`, `POST /billing/checkout` (owner/admin), `POST /billing/cancel` (owner/admin), `POST /billing/webhook` (signature-verified). Changed behavior: `POST /customers`, `POST /settings/workspace-members`, `GET /reports/low-stock-materials` now enforce entitlements (stable error codes; response shapes otherwise unchanged). Contract: docs/PHASE5_BILLING_API.md.

## 18. Files Created (26)

Backend (14): migrations/011_commercial_foundation.sql · src/billing/{plans,subscriptionStateMachine}.ts · src/billing/providers/{BillingProvider,TestBillingProvider,PaystackProvider,index}.ts · src/repositories/subscriptionRepository.ts · src/services/{subscriptionService,entitlementService,billingService}.ts · src/routes/billingRoutes.ts · tests/{commercial,billing}.test.ts
Web (1): src/shared/api/billing.ts
Docs (12): PHASE5_{COMMERCIAL_DOMAIN, BILLING_ARCHITECTURE, BILLING_API, BILLING_ENDPOINT_SECURITY, SECURITY_MATRIX, DATABASE_MIGRATION, ENVIRONMENT_MATRIX, OFFLINE_COMMERCIAL_SEMANTICS, CHANGELOG, RISK_REGISTER, FINAL_REPORT}.md (+ PHASE5_BASELINE.md pre-existing, preserved unmodified)

## 19. Files Modified (13)

apps/backend: .env.example, src/app.ts, src/config/{db,env,rateLimit}.ts, src/routes/{customerRoutes,reportRoutes,settingsRoutes}.ts, src/services/authService.ts, src/types/express.d.ts, tests/{db.test,setup}.ts
apps/web: src/components/AccountPanel.tsx

## 20. Tests

Baseline: 83 backend + 41 client = 124.
New Phase 5: 46 backend (commercial 28, billing 18).
Total: **170** · Passed: **170** · Failed: **0**.
(Backend: 129/129 in 12 suites, executed against real embedded PostgreSQL with migrations 001–011. Client: 41/41 in 5 files. Protected-IP smoke: 13/13 checks PASS.)

## 21. Build

`npm run build` (backend tsc + web vite + PWA generateSW): **PASS**.

## 22. TypeScript

Web `tsc --noEmit`: **0 errors**. Backend `tsc --noEmit`: **0 errors**. No `any`/`@ts-ignore`/`@ts-nocheck` introduced.

## 23. Lint

Web ESLint: 16 findings — identical to the documented Phase 4 protected-file exceptions (DesignStudio.tsx 11, jobSheetExport.ts 5); zero new debt. Backend: 0.

## 24. Performance

Only measured values: full backend suite (including all commercial/billing tests against real Postgres) completes in ~13–20 s; webhook-pipeline tests execute in 30–90 ms each including DB round-trips. No load benchmarks were run and none are claimed. Query shape: entitlement resolution = 3 indexed queries (subscription by workspace + 2 COUNTs); no N+1 introduced.

## 25. External Dependencies

- **Paystack live credentials** (`PAYSTACK_SECRET_KEY`) — EXTERNAL CREDENTIAL REQUIRED; without them the checkout endpoint answers 503 by design.
- **Paystack dashboard webhook registration** — MANUAL PRODUCTION ACTION REQUIRED (Phase 6).
- **Live payment verification** — DEFERRED TO PHASE 6 PRODUCTION VALIDATION.
- Production deployment/infrastructure, real backup/restore drill, real-browser PWA validation — Phase 6 scope (inherited).

## 26. Known Limitations

1. Live Paystack path fixture-tested only (P2-COM-004). 2. Sync-lane reconciliation of over-limit offline creations deferred with rationale (P2-COM-001). 3. Client-rendered premium features are UX-gated when offline (P2-COM-002). 4. No automated past_due/cancelled→expired scheduler; trial/period-end expiry is lazy-evaluated, other expiries are provider/operator-driven (P2-COM-003). 5. Billing upgrade UI beyond the AccountPanel badge is Phase 7 scope (P3-COM-001). 6. Inherited Phase 4 P2/P3 items unchanged.

## 27. Risks

P0: none open. P1: none open. P2: COM-001..004 + inherited R1/R2/SYNC-001/DEP-001 (all documented with rationale). P3: COM-001..004 + inherited MIG-001/MOB-001/LINT-001. Register: docs/PHASE5_RISK_REGISTER.md.

## 28. Phase 6 Readiness

Phase 6 can now verify against real infrastructure: apply migration 011 to a production database (guide provided); configure `BILLING_PROVIDER=paystack` + real secret key; register the webhook URL; run a real Paystack sandbox checkout → observe `charge.success` activate a subscription through the exact pipeline already proven with fixtures; validate trial expiry/limit enforcement with real tenants; execute backup/restore and PWA/Android validation. The commercial contracts (endpoints, error codes, ledger, state machine) are frozen and documented for that validation.

## 29. Git

Branch: `arena/01a04183-stitch-flow` (session-fixed; documented deviation from any prompt-suggested branch names)
HEAD / Commit: see `phase-5-commercial-foundation-complete` tag (final commit "Phase 5 v2: commercial foundation")
Tag: `phase-5-commercial-foundation-complete` (+ intermediate phase-5 work commits), remote-verified via `git ls-remote`
Working tree: clean

## 30. FINAL CERTIFICATION

PASS — PHASE 5 COMMERCIAL FOUNDATION COMPLETE

(Scope note per Step 60/64: this certifies the commercial foundation with all automated evidence above. It does NOT claim production readiness, live payment verification, or deployment — those are Phase 6's mandate.)
