# STITCHFLOW PHASE 6 ENVIRONMENT MATRIX

Classification of every environment variable used by the backend (`apps/backend/src/config/env.ts`) and client build. Verified by grep of `apps/web/src` + production bundle scan: **no SERVER-ONLY value enters the browser bundle** (scan executed 2026-08-27 against `apps/web/dist`: zero hits for DATABASE_URL / JWT_SECRET / REFRESH_TOKEN_SECRET / PAYSTACK_SECRET / TEST_BILLING_SECRET / API_KEY).

## SERVER-ONLY (must never be VITE_-prefixed, never committed)

| Variable | Purpose | Default / notes |
|---|---|---|
| DATABASE_URL | PostgreSQL DSN | required, no default |
| JWT_SECRET | Access-token signing | required |
| REFRESH_TOKEN_SECRET | Refresh-token signing | required |
| PAYSTACK_SECRET_KEY | Live billing provider secret | empty = unset; live use is an external production dependency |
| TEST_BILLING_SECRET | Test-provider HMAC fixture | test fixture, not a credential |
| BCRYPT_ROUNDS | Password hashing cost | 12 |

## DEPLOYMENT-ONLY (operational tuning; safe defaults)

| Variable | Purpose | Default |
|---|---|---|
| NODE_ENV | environment mode | development |
| PORT | HTTP port | 3000 |
| CORS_ORIGIN | production origin allowlist (comma-separated) | http://localhost:5173 |
| MAX_PAYLOAD_SIZE | JSON body limit | 1mb (code default aligned to documented value in Phase 6) |
| DB_POOL_MAX | pool connections per process | 10 |
| DB_IDLE_TIMEOUT_MS | idle client reap | 30000 |
| DB_CONNECTION_TIMEOUT_MS | acquire timeout | 5000 |
| DB_STATEMENT_TIMEOUT_MS | server-side query timeout | 15000 |
| SHUTDOWN_TIMEOUT_MS | graceful-shutdown hard limit | 10000 |
| LOG_LEVEL | pino level override | env-derived (prod: info) |
| SOURCE_COMMIT / SOURCE_VERSION | release metadata baked by CI | optional |
| REDIS_URL | declared for BullMQ queues | queues are NOT started in-process (verified: queueService imported nowhere at runtime) |
| ACCESS_TOKEN_EXPIRES_IN / REFRESH_TOKEN_EXPIRES_IN | token TTLs | 15m / 7d |
| FREE/PRO/ENTERPRISE_DEVICE_LIMIT | legacy device licensing | 1/2/5 (device licensing only, NOT the SaaS entitlement source) |

## Commercial configuration (SERVER-ONLY)

| Variable | Purpose | Default |
|---|---|---|
| TRIAL_DAYS | server-authoritative trial length | 14 |
| TRIAL_PLAN_CODE | trial plan | STUDIO |
| BILLING_PROVIDER | 'paystack' \| 'none' | none |

## CLIENT-SAFE (only these reach the browser)

| Variable | Purpose |
|---|---|
| VITE_API_BASE_URL | Backend base URL (HTTPS in production) — sole client build input |

No other `VITE_*` variables exist. The client never receives plan/entitlement/limit authority (server-authoritative since Phase 5; forgery-tested).

## Committed files audit

`git ls-files` shows only `.env.example` (placeholders) — no `.env`, no credentials, no secret values tracked. Secret scan of staged Phase 6 diffs: CLEAN.
