# STITCHFLOW PHASE 6 BASELINE

Date: 2026-08-27 · Auditor: Phase 6 agent (new session) · Method: direct repository + Git inspection; all values below are **measured**, none copied from prior reports without re-verification.

## 1. Git State (measured)

| Item | Value |
|---|---|
| Branch | `arena/01a042ac-stitch-flow` |
| Baseline commit | `d37718234a04b86aef0a1656aaf177a45525d502` (`Phase 5 v2: commercial foundation`) |
| Phase 5 completion tag | `phase-5-commercial-foundation-complete` → `d377182` — remote-verified via `git ls-remote` |
| Phase 5 baseline tag | `phase-5-before-commercialization` → `76eeac6` — remote-verified |
| Phase 6 checkpoint tag | `phase-6-before-production-hardening` → `d377182` (created by Phase 6, pushed, remote-verified) |
| Working tree at audit | clean |
| Note | Session branch fast-forwarded from `main` (`b576c3e`) to `d377182`; no history rewritten, no force-push. Phase 5 work lived on prior session branch `arena/01a04183-stitch-flow`; `main` itself is still at the initial commit. |

## 2. Toolchain (measured in this environment)

| Component | Version |
|---|---|
| Node | v22.22.3 |
| npm | 10.9.8 |
| TypeScript (web+backend) | 5.9.3 (installed; manifests declare ^5.6.2) |
| React | 18.3.1 (declared ^18.2.0) |
| Vite | 7.3.6 |
| Express (backend workspace) | 4.22.2 (declared ^4.19.2) |
| pg | 8.20.0 |
| pino / pino-http | 9.14.0 / 10.5.0 |
| helmet | 7.2.0 |
| express-rate-limit | 7.5.1 |
| zod (backend) | 3.25.76 (web declares ^4.3.6 — client-only schemas) |
| Dexie | 4.4.5 |
| vitest | 2.1.9 |
| embedded-postgres (test DB) | 18.4.0-beta.17 → PostgreSQL 18.4 |
| vite-plugin-pwa / workbox-build | 1.3.0 / 7.4.1 |

## 3. Phase 5 Regression — re-executed, not trusted (measured)

| Gate | Command | Result |
|---|---|---|
| Web TypeScript | `npm --workspace=apps/web run type-check` | **0 errors** |
| Backend TypeScript (lint) | `npm --workspace=apps/backend run lint` (`tsc --noEmit`) | **0 errors** |
| Web ESLint | `npm --workspace=apps/web run lint` | **16 errors — exactly the documented protected findings** (file-count verified: 16 problems, 16 errors, 0 warnings) |
| Backend tests | `npm --workspace=apps/backend test` | **129/129 PASS** (12 suites) |
| Client tests | `npm --workspace=apps/web run test` | **41/41 PASS** (5 suites) |
| Protected-IP smoke | `npx tsx scripts/phase1-smoke.ts` | **13/13 PASS** (bodice/shirt/trouser/skirt/kaftan, production assistant, alerts, reporting, persistence, currency) |
| Production build | `npm run build` | **PASS** (web precache 17 entries / 2634.51 KiB, `dist/sw.js` generated; backend `tsc` build PASS) |

Total verified baseline test count: **170/170** — matches the Phase 5 report. No regression found.

## 4. Architecture Snapshot (as inspected)

- **Monorepo**: npm workspaces `apps/backend` (Express 4 + TS + pg + pino), `apps/web` (React 18 + Vite 7 + Dexie 4). Legacy dirs `apps/api/src`, `apps/mobile`, root `capacitor.config.ts` (stale "Tailor Studio" config — see risk register).
- **Database**: PostgreSQL; schema owned by ordered SQL migrations `apps/backend/migrations/001–011` applied by `scripts/run-migrations.js` (records in `schema_migrations`); server boot runs `verifySchema()` (required-tables check) and fails fast if unmigrated. Tests run the **real migration runner** against embedded PostgreSQL 18.4.
- **Latest migration**: `011_commercial_foundation.sql` (subscriptions, billing_events, trial backfill, partial uniques).
- **Health**: single `GET /health` returning `{status:'ok', timestamp, version:'1.0.0'}` — version is a hardcoded string; no liveness/readiness split; **no database readiness probe**.
- **Graceful shutdown**: **absent** — `server.ts` has no SIGTERM/SIGINT handling, no pool drain, no server.close.
- **DB pool**: `new Pool({connectionString})` only — no max/idle/connectionTimeout, no pool `error` event handler.
- **Request correlation**: pino-http auto-generates `req.id`; errorHandler echoes it as `requestId` in error bodies. **`X-Request-Id` is neither accepted nor echoed in response headers.**
- **Logging**: pino JSON logs + pino-http request logs; level env-driven; **no redaction configured**.
- **Errors**: `ApiError(status, code, message)`; errorHandler sanitizes to `{error:{code,message},requestId}`; unknown errors → `INTERNAL_SERVER_ERROR` + generic message. Stable codes audited: UNAUTHORIZED, INVALID_TOKEN, INVALID_CREDENTIALS, INVALID_REFRESH_TOKEN, ACCOUNT_INACTIVE, EMAIL_IN_USE, FORBIDDEN, FORBIDDEN_WORKSPACE_ROLE, NOT_A_MEMBER, NO_WORKSPACE, NOT_FOUND, VALIDATION_ERROR, PAYLOAD_TOO_LARGE, CUSTOMER_LIMIT_REACHED, MEMBER_LIMIT_REACHED, FEATURE_NOT_AVAILABLE, SUBSCRIPTION_REQUIRED, INVALID_PLAN, INVALID_SUBSCRIPTION_STATE, INVALID_WEBHOOK_SIGNATURE, BILLING_EVENT_INVALID, BILLING_PROVIDER_ERROR, INTERNAL_SERVER_ERROR.
- **Rate limiting** (express-rate-limit, test-relaxed): auth 5/15min; license 10/min; sync 100/min; general API 2000/5min; events 1000/min; billing 120/min; webhook 600/min (lenient by design — signature is the gate).
- **Security middleware**: helmet() defaults; CORS — production = explicit comma-separated allowlist, dev/test permissive; JSON body limit `MAX_PAYLOAD_SIZE` (default 10mb in code; .env.example documents 1mb) with raw-body capture for webhook signature verification.
- **Auth**: JWT access (15m) + rotating refresh tokens (7d) with replay protection; bcrypt; RBAC via requireRole/requireWorkspaceRole; tenant scoping via requireWorkspace → `req.workspaceId` → scoped SQL.
- **Commercial**: BASIC/PRO/STUDIO catalogue (GHS 0/45/90), subscription state machine (trialing/active/past_due/paused/cancelled/expired), server-side 14-day STUDIO trial, entitlement engine, concurrency-safe limits, provider-neutral billing (TestBillingProvider + Paystack boundary, HMAC signature verify, idempotent out-of-order-safe webhooks, billing_events ledger).
- **Offline client**: Dexie/IndexedDB repositories, syncQueue, syncEngine, delta sync via `sync_changes`/`processed_mutations`/tombstones with monotonic cursors and `client_mutation_id` idempotency; localStorage migration bridge.
- **PWA**: vite-plugin-pwa `generateSW`, `registerType: 'autoUpdate'`, precache app shell only (no runtime caching of API, never mutation traffic), navigation fallback denylist for API paths; SW registration fail-safe in `main.tsx`.
- **Android**: `apps/mobile/android` — applicationId `com.stitchflow.app`, namespace `com.stitchflow.app`, versionCode 1, **versionName "1.0" (drift)**; `usesCleartextTraffic="true"` + `network_security_config.xml` permitting cleartext to **hardcoded dev LAN IP `10.64.37.239`** (Phase 6 hardening target); `apps/mobile/capacitor.config.ts` uses `androidScheme: 'http'` + `cleartext: true` (dev-era settings); webDir `../web/dist`.
- **Deployment**: `docker/docker-compose.yml` (api + postgres 16 + redis), `docker/backend.Dockerfile`, CI stubs at `.github/workflows/ci-cd.yml` + `apps/backend/.github/workflows/ci-cd.yml`. No production deployment target credentials in this environment.
- **Environment variables**: `.env.example` (root) + `apps/backend/.env.example` (incl. Phase 5 commercial block). Server-only secrets: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PAYSTACK_SECRET_KEY`, `TEST_BILLING_SECRET`.

## 5. Phase 6 Gap Analysis (audit conclusions → scope)

1. Health: add `/health/live`, `/health/ready` (DB probe), `/health/version` (single authoritative version source).
2. Versioning: eliminate drift (healthController hardcode vs package.json vs Android versionName "1.0").
3. Graceful shutdown: implement full SIGTERM/SIGINT sequence + pool drain + timeout.
4. DB pool hardening: limits, timeouts, pool error handler, failure observability.
5. Request correlation: accept/emit `X-Request-Id`.
6. Logging redaction: pino redact + recursive redaction utility + tests.
7. Metrics: in-process counters/histograms (requests, latency, 4xx/5xx, auth/sync/payment/webhook/db failures) with admin-gated snapshot endpoint.
8. Android security: remove dev LAN IP cleartext config; production-safe defaults.
9. Data integrity auditor: read-only invariant checker (financial, inventory, tenant, sync, referential).
10. Backup/restore: executable logical backup/restore verification (embedded PG) + production `pg_dump` runbook.
11. Performance baseline: measured numbers only (health/API latency, query plans, bundle, sync batch).
12. Extension architecture: documented event vocabulary + AIProvider/n8n boundaries — **no provider SDKs, no new runtime dependencies**.
13. Documentation set: PHASE6_* runbooks, matrices, release checklist, final report.

## 6. Non-Goals (protected / out of scope)

- No changes to patternEngine.ts, DesignStudio.tsx, productionAssistant.ts (verified 0-diff through Phase 5; re-verified by smoke test this session).
- No replacement of Dexie/IndexedDB/sync architecture.
- No changes to financial arithmetic, payment atomicity, inventory invariants.
- No new billing architecture; plan prices GHS 0/45/90 unchanged.
- No live Paystack operation claimed without production credentials.
- No Phase 7–11 features; no OpenAI/Gemini/Claude/n8n runtime dependencies.
