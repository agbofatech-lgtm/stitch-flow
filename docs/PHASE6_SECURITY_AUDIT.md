# STITCHFLOW PHASE 6 SECURITY AUDIT

Executed evidence, 2026-08-27. Baseline: Phases 3–5 security suites (re-run green in the full battery) + Phase 6 additions below.

## 1. Authentication & JWT lifecycle — VERIFIED (existing suite, re-run)

Expired / malformed / wrong-secret / wrong-issuer / wrong-audience / missing tokens → 401 (`auth.test.ts`). Refresh tokens stored hashed; rotation single-use; concurrent refresh — exactly one succeeds; rotated/revoked/unknown refresh rejected; logout revokes (`auth.test.ts`, `phase4-hardening.test.ts`).

## 2. Authorization / RBAC / tenant isolation — VERIFIED (existing + Phase 6)

Role matrix (assistant read-only vs owner manage) tested; membership re-verified per request (revoked member loses access with a live access token). Tenant isolation suite: cross-workspace read/update/delete/export-block, forged workspace claims fail closed, dashboard/report aggregates scoped. Phase 6 addition: restored-database tenancy containment verified post-restore (backup-restore suite); integrity auditor detects cross-tenant material usage.

## 3. Input hardening — Phase 6 additions (`security-regression.test.ts`, 11/11)

- SQL injection payloads (`'; DROP TABLE ... --`, `' OR '1'='1`) stored as inert data; tables intact.
- XSS payloads round-trip as text with `application/json` responses (React escapes at render).
- Invalid UUID path params → 4xx never 500.
- Invalid dates / non-finite numerics on orders → 400 (NEW server-side guards, Phase 6).
- Malformed JSON → 400 `VALIDATION_ERROR` (error-taxonomy fix, previously 500).
- Oversized body → 413 `PAYLOAD_TOO_LARGE` (previously collapsed to 500; limit default now 1mb, tunable).

## 4. Rate limiting — LIVE-VERIFIED in production mode (Phase 6)

Real server booted with NODE_ENV=production: 6th failed login within the window → 429 with standard `ratelimit-*` + `retry-after` headers. Thresholds (documented, unchanged): auth 5/15min · license 10/min · sync 100/min · API 2000/5min · events 1000/min · billing 120/min · webhook 600/min (lenient by design — signature is the authenticity gate; provider retries never broken).

## 5. CORS & security headers — LIVE-VERIFIED in production mode (Phase 6)

Production CORS = explicit allowlist: only `CORS_ORIGIN` origins reflected; arbitrary origins receive no `access-control-allow-origin`. Helmet headers verified present: CSP (`default-src 'self'`), HSTS, nosniff, SAMEORIGIN frame protection, no-referrer, COOP/CORP. No credential material in any response header.

## 6. Error sanitization — VERIFIED

Error envelope `{error:{code,message},requestId}`; unknown errors → generic `INTERNAL_SERVER_ERROR` message; no SQL/stack/DSN leakage (Phase 4 suite + Phase 6 live checks incl. DB-down readiness path which withholds driver error text).

## 7. Secret handling — VERIFIED

- pino standard `redact` paths + recursive `redactDeep` (nested objects/arrays/Maps/Errors/circular; case-insensitive substring keys) wired into audit persistence; tested.
- Bundle + source scan: zero secret names/values in `apps/web` or `dist`; only `.env.example` tracked.
- Android: `allowBackup=false`, cleartext fully denied, dev LAN IP removed.

## 8. Billing security — VERIFIED (Phase 5 suites re-run)

Forged plan/workspace/entitlement/amount rejected; webhook signature (timing-safe, raw body) missing/forged/tampered → 401 + audit; duplicate/out-of-order events idempotent no-ops; amount integrity vs checkout ledger. Live Paystack operation: **IMPLEMENTED — LIVE VERIFICATION REQUIRED (external credentials)**.

## 9. Audit trail — VERIFIED (Phase 6)

LOGIN/LOGOUT/REGISTER (pre-existing) + CUSTOMER_CREATED/UPDATED, ORDER_CREATED/UPDATED/**STATUS_CHANGED** (with from→to), INVOICE_CREATED, PAYMENT_CREATED (pre-existing), MATERIAL_USED/RESTORED, WORKSPACE_MEMBER_ADDED/REMOVED, subscription/billing events — all with workspace + actor + requestId correlation (migration 012) and redacted metadata. No PASSWORD_CHANGED/DATA_EXPORT endpoints exist in the product (documented N/A).

## 10. Open external verification items (honest classification)

| Item | Classification |
|---|---|
| Production deployment security (TLS termination, real DSN, secret manager) | MANUAL PRODUCTION VERIFICATION REQUIRED |
| Live Paystack (real key, dashboard webhook, real transaction) | EXTERNAL DEPENDENCY |
| Real-device Android QA | MANUAL DEVICE VERIFICATION REQUIRED |
| Penetration test / dependency CVE sweep on production images | VERIFICATION REQUIRED (P3) |
