# 07 — Platform and Commercial Architecture

**Date:** 2026-09-01  
**Phase:** 19 — implemented, conditionally certified, owner acceptance pending, **no checkpoint tag**.  
**Do not claim production SaaS readiness.**

---

## Planes (FACT)

```
AGBOFA CONTROL CENTER     operator plane  /control/*
        │ governs
PLATFORM SERVICES         /auth  /platform
        │ serves
STITCHFLOW ATELIER        does not consume entitlements yet
```

Control Center must not duplicate the tailoring workspace (ADR-007). `tailoringAuthority: false` on `/control/status`.

---

## Distinctions (binding)

```
IDENTITY  ≠  MEMBERSHIP  ≠  ROLE  ≠  PERMISSION  ≠  ENTITLEMENT
TENANT    ≠  WORKSPACE
PAYMENT   ≠  SUBSCRIPTION  ≠  ENTITLEMENT
SHOP PAYMENT  ≠  SAAS BILLING
CHECKOUT  ≠  PAYMENT CONFIRMED
CLIENT FLAG  ≠  ACCESS DECISION
```

JWT is **identity-only** (`sub`, `typ: access`). Tokens **reject** extra claims: `plan`, `billingStatus`, `permissions`, `tenantId`, `role`, `operator`, `isPlatformOperator`, `entitlements`, `capabilities`.

---

## Identity

- Register / login / `GET /auth/me`.
- bcrypt password; email unique; display name required; password ≥ 8.
- Register provisions identity + tenant + default workspace + `TENANT_OWNER` membership.
- Tenant id must differ from workspace id.
- No refresh tokens, no logout route, no password reset, no email verify on this path.
- Client-supplied `role` / `isPlatformOperator` on register is ignored.

## Tenant / workspace / membership

- Tenant = commercial / isolation boundary.
- Workspace = operational unit **inside** a tenant (subordinate).
- Membership roles: `TENANT_OWNER` | `STAFF`.
- Context resolved server-side (`X-Tenant-Id` when multi-membership). Cross-tenant access → `TENANT_ISOLATION`.
- Isolation is in-process Maps, **not** Postgres RLS.

## Plans / prices / capabilities

- Seed codes BASIC / PRO / STUDIO (`classification: legacy-seed`).
- Capability keys are opaque (`PDF_EXPORT`, `PATTERN_GENERATION`, …). Do not authorize with plan display names.
- `amountMinor: null`. USD 29/79 and GHS 45/90 remain **simulation, not catalog law**.
- Pricing: **unresolved**.

## Subscriptions / payments / entitlements

- Checkout (`POST /platform/billing/checkout`) creates `PAYMENT_PENDING`, adapter `test`. Client redirect is not payment authority.
- Entitlement only after HMAC-verified webhook `payment.confirmed`.
- Idempotent on `eventId`; stale `occurredAt` vs watermark → `STALE_EVENT`.
- Non-`test` adapter → `PROVIDER_DEFERRED`.
- `POST /platform/access/check` is server law; client `allowed`/`entitled` discarded.
- Cancel is immediate (`subscription.cancelledAccess`). PAST_DUE is not entitled.
- Shop `/payments` and Invoices.tsx are a **different domain**.

## Control Center

- Operator set: `store.platformOperators`. Grant is **in-process** (`grantPlatformOperator`) — **no HTTP grant** (404 expected).
- Tenant members: `403 PLATFORM_ADMIN_REQUIRED`.
- Mutable configuration: **only** `disabledCapabilities`.
- UI: `apps/web/src/control/ControlCenter.tsx` (PEX). API existed first (P19.11 said “no UI”; later PEX added UI — see drift index).

## FeatureGate

- `apps/web/src/components/FeatureGate.tsx` is **UX_ONLY**. Not commercial authority. Atelier does not call `/platform/access/check`.

---

## Persistence (FACT)

| Mechanism | Status |
|---|---|
| In-memory Maps | Default if `PLATFORM_DATA_PATH` unset |
| JSON file | If `PLATFORM_DATA_PATH` set; atomic tmp+rename, mode `0o600`; `STORE_VERSION = 1` |
| PostgreSQL | **NOT VERIFIED**. `createApp` does not open a pool for platform IAM |
| `migrations/006_platform_commercial.sql` | DDL exists; file header **NOT APPLIED** |
| Top-level `002`–`005` | **EMPTY** |
| Nested `migrations/migrations/002` | Older users/licenses schema; not live |
| `initDb()` | Shop CREATE TABLE helpers; **never called** by live `server.ts` |
| Migrate runner | `scripts/run-migrations.js` **missing** |
| Provider port | Neutral; selected provider **null**; live PSP **DEFERRED** — no Stripe/Paystack/Flutterwave selected in `src` |
| Leftover Paystack JS | Observed in stale `dist/`, not in current `src` platform |

`/ready`: `platformIam: durable-file-or-memory`, `postgres: not-verified`, `billingProvider: deferred`.

---

## P19 status line

Implemented in source. Tests: 26 in `*.p19.test.ts` (identity, commercial, control, persistence, security). Conditionally certified. Owner acceptance pending. Phase 19 tag not created. Phase 20 locked.
