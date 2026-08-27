# Phase 8 — Developer API & API-Key System (Subsystem 1)

Status: **IMPLEMENTED + TESTED** (checkpoint `phase-8-developer-api`). Describes actual implementation only.

## Scope catalogue (`src/security/apiScopes.ts`)

**Enforceable (grantable now, enforced per endpoint):**

| Scope | Endpoint(s) |
|---|---|
| `customers:read` | `GET /api/v1/customers`, `GET /api/v1/customers/:id` |
| `customers:write` | `POST /api/v1/customers` |
| `orders:read` | `GET /api/v1/orders`, `GET /api/v1/orders/:id` (measurement fields excluded) |
| `measurements:read` | `GET /api/v1/orders/:id/measurements` |
| `inventory:read` | `GET /api/v1/inventory/fabrics` |
| `reports:read` | `GET /api/v1/reports/summary` |
| `usage:read` | `GET /api/v1/usage/summary` (key's own workspace only) |
| *(any valid key)* | `GET /api/v1/me` (introspection) |

**Reserved (defined, NOT grantable until their subsystem ships):** `orders:write`, `inventory:write`, `measurements:write`, `webhooks:manage`, `integrations:manage`. Requesting one at creation/re-scope → 400 with the reserved list. A granted scope is therefore always an enforced scope. **No wildcard scope exists.**

## API-key lifecycle (migration 015, `api_keys` — tenant-scoped)

- Format: `sf_live_` + 43 base64url chars (256-bit entropy), generated server-side.
- Storage: **SHA-256 hash only**; raw secret shown exactly once in the 201 response; never returned again, never logged. Prefix (first 16 chars) is the human-visible identifier.
- Lookup: prefix-indexed (`key_prefix UNIQUE`); hash compared with `crypto.timingSafeEqual`.
- States: `active → revoked` (explicit, `revoked_at`/`revoked_by` recorded; double-revoke → 409) and `active → expired` (lazy flip on first use past `expires_at`; precise 401 codes `API_KEY_REVOKED` / `API_KEY_EXPIRED` / `INVALID_API_KEY`).
- `last_used_at` + `request_count`: throttled to one UPDATE per 30 s window per key (no write-per-request amplification).
- Workspace association: every key belongs to exactly one workspace; management routes list/mutate only that workspace's keys (cross-workspace revoke → 404, tested).

## Authentication boundaries (all tested)

| Credential | `/api/v1/*` | `/developers/*` | `/platform/*` | `/portal/*` |
|---|---|---|---|---|
| API key (`X-API-Key` or `Bearer sf_live_…`) | ✅ (scope-checked) | ❌ 401 (not a JWT) | ❌ 401 | ❌ 401 |
| Staff JWT | ❌ 401 (not an sf_live key) | ✅ (+ workspace) | ✅ (+ platform role) | ❌ 401 (audience) |
| Portal token | ❌ 401 | ❌ 401 | ❌ 401 | ✅ |

Feature flag `DEVELOPER_API` gates BOTH routers and fails closed (403 `FEATURE_DISABLED`, 503 if the flag subsystem itself is down). Default OFF; enabled only by platform admin via `/platform/flags` (workspace owners forbidden — tested).

## Writes reuse core business rules (no bypass)

`POST /api/v1/customers` runs inside the same discipline as the first-party route: `entitlementService.enforceCustomerLimit` (plan limits, transactional), `recordSyncChangeTx` (offline clients see the change), `auditLogService.logTx` (atomic audit row, `metadata.source = 'developer_api'`), timeline `CUSTOMER_CREATED` (best-effort). Machine writes are attributed to the **key creator** (falls back to workspace owner) because `sync_changes.user_id` is a NOT NULL user FK — provenance chain: audit → key → staff author.

## Usage metering (no new telemetry system)

Each authenticated `/api/v1` call writes ONE bounded `usage_events` row (`event_name = 'api_request'`, metadata = `{method, path, status}` only — never the key, headers, query or body; verified by test). This reuses the Phase 7 usage pipeline and its redaction/size caps.

## Rate limiting (reused infrastructure)

`developerRateLimit` (60 req / 15 min prod; relaxed in test) covers key creation, using the same `express-rate-limit` setup as all existing limiters — not a second independent limiter. `/api/v1` rides the existing global `apiRateLimit`.

## Test evidence

`tests/phase8-developer-api.test.ts` — **21 tests**: fail-closed flag, platform-only enablement, one-time secret + hash storage + audit, prefix-only listing, invalid/reserved scope rejection, revoke + double-revoke + immediate cut-off, lazy expiry, re-scope + audit, last-used tracking, X-API-Key/Bearer/JWT shapes, invalid-secret uniformity, exact-scope enforcement, tenant isolation (list + direct id → 404), measurement gating, full business-semantics write (entitlements/sync/audit/timeline/metering), management isolation, secret-never-logged.

Full battery: **22/22 suites, 234/234 tests** (213 Phase 7 baseline + 21 new). Backend tsc PASS · web tsc PASS · web lint unchanged (16 pre-existing Phase 1 errors) · production build PASS · protected IP **zero diff**.
