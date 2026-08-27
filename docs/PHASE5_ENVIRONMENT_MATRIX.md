# PHASE 5 — ENVIRONMENT VARIABLE MATRIX

Classification of every variable used by the codebase (Step 39). Scan executed 2026-08-27: no real credentials exist anywhere in the repository — `.env.example` files hold placeholders only; test fixtures (`tests/env.ts`) use obvious dummy values; the built frontend bundle contains no server variables.

## CLIENT-SAFE (VITE_* — compiled into the public bundle)

| Variable | Purpose | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | backend origin for the PWA | default fallback `http://localhost:5000` in `shared/utils/api.ts` |

No other `VITE_*` variables exist. **Rule enforced:** no secret may ever be added under `VITE_*` (it would ship to every browser).

## SERVER-ONLY (backend process env; never sent to clients, never logged)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection |
| `JWT_SECRET` | yes | — | access-token HMAC |
| `REFRESH_TOKEN_SECRET` | yes | — | refresh-token HMAC |
| `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | no | 15m / 7d | token lifetimes |
| `BCRYPT_ROUNDS` | no | 12 | password hashing |
| `FREE/PRO/ENTERPRISE_DEVICE_LIMIT` | no | 1/2/5 | legacy device licensing |
| `TRIAL_DAYS` **(new)** | no | 14 | server-authoritative trial length |
| `TRIAL_PLAN_CODE` **(new)** | no | STUDIO | plan granted during trial |
| `BILLING_PROVIDER` **(new)** | no | none | `paystack` \| `none` (tests always use the test provider) |
| `PAYSTACK_SECRET_KEY` **(new)** | for live billing | empty | **EXTERNAL CREDENTIAL — never VITE_, never committed, never logged** |
| `TEST_BILLING_SECRET` **(new)** | no | fixture default | deterministic test-provider signing (not a credential) |
| `REDIS_URL` | no | redis://redis:6379 | reserved (unused at runtime) |

## DEPLOYMENT-ONLY

| Variable | Purpose |
|---|---|
| `NODE_ENV` | environment mode (drives CORS/limits/provider selection) |
| `PORT` | listen port (default 3000) |
| `CORS_ORIGIN` | production allowlist (comma-separated) |
| `MAX_PAYLOAD_SIZE` | JSON body cap |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed admin bootstrap (change in production — known Phase 2 note) |
| `RENDER_EXTERNAL_URL` | hosting hint (docs/example only) |

## Verification performed
- `grep` scan for `PAYSTACK_SECRET_KEY|sk_live|sk_test|password|secret|token|apiKey` across the repo: only variable *names*, placeholders and test fixtures found; zero real values.
- Frontend source and `apps/web/dist` build output contain no server variables.
- `.env` files are git-ignored; only `.env.example` files (placeholders) are committed.
