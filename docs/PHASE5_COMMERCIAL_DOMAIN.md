# PHASE 5 — COMMERCIAL DOMAIN SPECIFICATION

Date: 2026-08-27 · Baseline: `76eeac6` (`phase-5-before-commercialization`)
Source of truth: code under `apps/backend/src/billing/`, `apps/backend/src/services/{subscriptionService,entitlementService,billingService}.ts`, migration `apps/backend/migrations/011_commercial_foundation.sql`.

## 1. Plan model

Canonical plan identifiers (server-authoritative): **BASIC, PRO, STUDIO**.

Single catalogue: `apps/backend/src/billing/plans.ts` (`PLAN_CATALOGUE`). No plan decision is hard-coded in route handlers; enforcement resolves entitlements through the catalogue.

Limits and features were **extracted from the pre-existing client definitions** (`apps/web/src/data/mockData.ts` `tiers`, `apps/web/src/config/tiers.ts`, `apps/web/src/modules/services/tierEnforcement.ts`) and normalized:

| | BASIC | PRO | STUDIO |
|---|---|---|---|
| Monthly price (GHS) | 0 | 45 | 90 |
| Customers | 25 | 250 | unlimited |
| Staff members | 0 | 5 | 15 |
| basicReports | ✓ | ✓ | ✓ |
| pdfExport / brandedExport | — | ✓ | ✓ |
| patternGeneration / savePattern | — | ✓ | ✓ |
| measurementProfiles / fabricVisualizer | — | ✓ | ✓ |
| analytics / savedPreviews / materialInventory / jobSheetExport | — | ✓ | ✓ |
| lowStockAlerts / advancedReports / multiCurrencyReporting | — | — | ✓ |
| productionAssistant / fitWarnings | — | — | ✓ |

**Documented discrepancy:** the client historically carried two price sets — `mockData.ts` (29/79, legacy) and `TIER_META` in `config/tiers.ts` (GHS 0/45/90, the values actually surfaced in the UI). `TIER_META` was adopted as canonical. The client copies remain for UX display only and are no longer authoritative.

## 2. Subscription model

Workspace-scoped (`subscriptions.workspace_id` → `workspaces.id`). The workspace is the commercial tenant; a user may belong to multiple workspaces, so **user ≠ subscription owner**. The authenticated user's *verified* workspace membership determines which subscription is evaluated.

Columns (migration 011): `id (UUID)`, `workspace_id`, `plan_code (BASIC|PRO|STUDIO, CHECK)`, `status (CHECK)`, `provider`, `provider_customer_id`, `provider_subscription_id`, `current_period_start/end`, `trial_start/end`, `cancel_at_period_end`, `cancelled_at`, `last_event_at`, `created_at`, `updated_at`.

Constraints:
- at most **one live subscription per workspace**: partial unique index over statuses `trialing/active/past_due/paused`;
- **unique provider mapping**: `(provider, provider_subscription_id)` partial unique — a provider subscription can never be grafted onto a second workspace.

## 3. Subscription states

Stored lowercase (matches existing DB conventions): `trialing`, `active`, `past_due`, `paused`, `cancelled`, `expired`.

## 4. State machine

Implemented in `billing/subscriptionStateMachine.ts`; every persisted change goes through `subscriptionService.applyTransition` which rejects illegal transitions with `INVALID_SUBSCRIPTION_STATE` (409) and writes the audit event in the same transaction.

```
trialing  -> active | cancelled | expired
active    -> active (renewal/plan change) | past_due | paused | cancelled
past_due  -> active | cancelled | expired
paused    -> active | cancelled | expired
cancelled -> active (resume/re-subscribe) | expired
expired   -> active (re-subscribe)
```

Every transition records: trigger (webhook event id / user action), previous state, new state, authority (provider webhook or owner/admin user), timestamp (`occurredAt`), audit event, billing-event ledger row where applicable.

**Out-of-order protection:** `subscriptions.last_event_at` stores the occurred-at of the last applied provider event; any event with `occurredAt <= last_event_at` is recorded as `ignored_stale` and never applied.

## 5. Trial model (server-authoritative)

- Created **server-side** when a workspace is created (`authService.register` → `subscriptionService.createTrialForWorkspace`).
- Business configuration: `TRIAL_DAYS` (default 14), `TRIAL_PLAN_CODE` (default STUDIO — new tailors experience the full product; falls to BASIC at expiry).
- Migration 011 backfills a 14-day STUDIO trial for every pre-existing workspace so no tenant silently loses functionality.
- Expiry is evaluated **lazily and read-only** by the entitlement resolver against the **server clock**: `trialing` with `trial_end < now` behaves as `expired` (no cron required, no write amplification on the read path). Client clock/localStorage manipulation has no effect.

## 6. Entitlement model

`entitlementService.resolveEntitlements(workspaceId)` returns:
`{ subscriptionPlan, subscriptionStatus, effectiveStatus, effectivePlan, limits, features, usage, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd }`.

Effective semantics (Step 11 decisions):

| Status | Behavior |
|---|---|
| trialing (trial_end ≥ now) | full plan features of the trial plan |
| trialing (trial_end < now) | effective `expired` → **BASIC** |
| active | plan features |
| past_due | **plan features retained (grace)** until an `expired` transition arrives from the provider/operator |
| paused | **BASIC** |
| cancelled (period_end ≥ now) | plan features (cancel-at-period-end model) |
| cancelled (period_end < now or none) | effective `expired` → **BASIC** |
| expired | **BASIC** (data preserved; BASIC limits apply to new creations) |
| no subscription row | defensive fallback: owner's legacy license tier mapped (free→BASIC, pro→PRO, enterprise→STUDIO) |

`EXPIRED` deliberately falls back to BASIC rather than a hard lock: the tailor's business data is never held hostage; growth limits and premium features are what lapse.

## 7. Usage model

**No `usage_counters` table.** Usage is derived from the authoritative tables (`customers` where `deleted_at IS NULL`, `workspace_members`) inside the enforcement transaction. Rationale: counters that duplicate authoritative data can drift and become an authorization bypass; deriving them under the same lock that guards insertion is exact by construction. (Step 6 permits this: "Where possible, derive usage from authoritative tables.")

Concurrency: limit checks run in a transaction that first takes `SELECT ... FOR UPDATE` on the `workspaces` row, serializing creations per workspace; two simultaneous requests for the final slot cannot both pass (regression-tested).

## 8. Billing event model

`billing_events` ledger: `provider`, `provider_event_id` (**UNIQUE with provider** — idempotency key), `event_type`, `workspace_id`, `subscription_id`, `status (received|processed|rejected|ignored_stale|failed)`, `payload` (non-secret summary only), `error`, `received_at`, `processed_at`.

Checkout initiations are recorded in the same ledger (`event_type='checkout.initialized'`, `provider_event_id='checkout:<reference>'`) and are the **trusted server-side reference → workspace mapping** used by webhook resolution. No payment secrets are stored.

## 9. Provider model

`BillingProvider` interface (`billing/providers/BillingProvider.ts`): `initializeCheckout`, `verifyWebhookSignature`, `parseWebhookEvent`. Implementations: `TestBillingProvider` (deterministic, HMAC-SHA512, test fixture secret) and `PaystackProvider` (Ghana deployment — **REQUIRES EXTERNAL CREDENTIALS**, see PHASE5_BILLING_ARCHITECTURE.md). Registry: test env → test provider; production → Paystack only when `BILLING_PROVIDER=paystack` and `PAYSTACK_SECRET_KEY` present; otherwise billing endpoints answer `BILLING_PROVIDER_ERROR`.

## 10. Webhook model

See PHASE5_BILLING_ARCHITECTURE.md §4. Pipeline: signature verification (raw body HMAC) → normalization → idempotency gate (`INSERT ... ON CONFLICT DO NOTHING`) → trusted workspace resolution (provider subscription mapping or checkout ledger; never unsigned payload fields) → stale guard → amount integrity check → state-machine transition + ledger update + audit in one transaction → 200 acknowledgment.

## 11–14. Upgrade / downgrade / cancellation / payment failure / expiration

- **Upgrade/downgrade:** checkout for a new plan → `payment.succeeded` webhook applies `active → active` with plan change; audited as `SUBSCRIPTION_UPGRADED` / `SUBSCRIPTION_DOWNGRADED` (order BASIC < PRO < STUDIO).
- **Cancellation:** `POST /billing/cancel` (owner/admin) or provider `subscription.cancelled` → status `cancelled`, `cancel_at_period_end=true`, `cancelled_at` stamped. Entitlements persist until `current_period_end`, then effective BASIC.
- **Payment failure:** `payment.failed` on an `active` subscription → `past_due` (grace: features retained) + `PAYMENT_FAILED` audit. Failure while not active records the audit only.
- **Expiration:** provider/operator `subscription.expired` event → `expired` (legal from `trialing/past_due/paused/cancelled`; from `active` it is rejected as an illegal transition — an active subscription must pass through `past_due` or `cancelled` first). Trial expiry is lazy (see §5).

## 15. Compatibility mapping (legacy licensing)

Audit result (Step 24):

| Reference | Classification | Disposition |
|---|---|---|
| `licenses` table, `licenseService`, `/licenses/validate`, device limits | legacy **device licensing** (per-user) | KEPT unchanged — it governs device count, not SaaS entitlements |
| `licenses.tier free/pro/enterprise` | legacy vocabulary | NOT the commercial model; mapped free→BASIC, pro→PRO, enterprise→STUDIO **only** as a defensive fallback for workspaces without a subscription row (`plans.legacyLicenseTierToPlan`) — should not occur post-migration (011 backfills) |
| client `TierCode BASIC/PRO/STUDIO`, `TIER_META`, `FEATURE_MIN_TIER` | UX vocabulary | Adopted as the canonical server vocabulary; client copies remain display-only |
| client `tierEnforcement.ts` (checkCan*) | UX assistance | No longer authoritative; server enforces. Untouched (works against mock data for UI affordances) |
| `Workspace.billingStatus/trialExpiresAt/overridePlan` (client) | client mock state | Display-only; server trial/status is authoritative |
| `mockData.ts tiers` prices 29/79 | legacy prices | Superseded by catalogue GHS 0/45/90 (documented discrepancy) |

Limitation (documented): legacy `registerUser(tier)` still creates a per-user license for device management; it does not influence workspace entitlements while a subscription row exists.

## 16. Audit requirements

Commercial audit actions (existing `audit_logs` table — no parallel system; transactional inserts via the tx client): `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_PAST_DUE`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_UPGRADED`, `SUBSCRIPTION_DOWNGRADED`, `PAYMENT_VERIFIED`, `PAYMENT_FAILED`, `BILLING_WEBHOOK_RECEIVED`, `BILLING_WEBHOOK_REJECTED`. No secrets/JWTs/keys are ever logged.

## 17. Security requirements

See PHASE5_SECURITY_MATRIX.md. Chain enforced on every commercial decision:
`authenticated user → workspace → membership (re-verified per request) → subscription → plan → entitlements → usage → authorized operation`. The client can display this; it cannot redefine it.
