# STITCHFLOW PHASE 6 DEPLOYMENT RUNBOOK

Status: **CODE VERIFIED — DEPLOYMENT VERIFICATION PENDING** (no production environment/credentials were available in this session; nothing below is claimed as executed in production).

## Components

| Component | Artifact | Notes |
|---|---|---|
| Backend | `apps/backend` (`tsc` build → `dist/server.js`, Node 22) | Express 4 + pg pool; boots only if schema migrated |
| Web/PWA | `apps/web` (`vite build` → `dist/`) | Served behind HTTPS; SW precache autoUpdate |
| Database | PostgreSQL 16+ (tested through 18.4) | Migrations 001–012 |
| Android | `apps/mobile/android` (Capacitor, webDir ../web/dist) | applicationId com.stitchflow.app, versionName 1.0.0 |

## Backend deploy sequence

1. Provision Postgres; create the database; store the DSN in the platform secret store.
2. Set environment (see PHASE6_ENVIRONMENT_MATRIX.md): NODE_ENV=production, DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET (strong, distinct), CORS_ORIGIN=https://<your-domain> (comma-separated; NO wildcards), MAX_PAYLOAD_SIZE, DB_* tuning, TRIAL_*, BILLING_PROVIDER, PAYSTACK_SECRET_KEY when going live.
3. `npm ci` → `npm --workspace=apps/backend run migrate` → `npm run build` → start (`node apps/backend/dist/server.js`).
4. Gate checks: `GET /health/live` 200 · `GET /health/ready` 200 (database!) · `GET /health/version` shows 1.0.0 + SOURCE_COMMIT.
5. Verify logs are JSON (pino) and request ids appear on responses (`X-Request-Id`).
6. Graceful shutdown: platform SIGTERM → server stops accepting, drains pool, exits 0 (live-verified in CI).

## Web deploy sequence

1. `VITE_API_BASE_URL=https://api.<your-domain> npm --workspace=apps/web run build`.
2. Serve `apps/web/dist` over HTTPS with the same origin policy as CORS_ORIGIN; do not add runtime API caching at the edge (SW precache handles the shell; IndexedDB owns data).
3. PWA update: Workbox autoUpdate — users get the new version on next load; no stale-cache manual intervention required (denylist keeps API paths uncached).

## Android release

1. Build web → copy into the Capacitor project (webDir `../web/dist`).
2. `apps/mobile` — release signing config (operator-held keystore); versionCode bump per release.
3. Network posture: cleartext denied globally; backend MUST be HTTPS.
4. On-device QA checklist: login · offline startup · customer creation · measurements · order creation · camera/gallery · Design Studio · PDF export · offline mutation · reconnect+sync · back navigation · keyboard. → **MANUAL DEVICE VERIFICATION REQUIRED** before store submission.

## Paystack go-live (external)

1. Set BILLING_PROVIDER=paystack + PAYSTACK_SECRET_KEY (SERVER-ONLY). 2. Register the webhook URL (https://api.<domain>/billing/webhook). 3. Execute a real test transaction → verify signature, ledger row, subscription transition in the database. Until all three: **LIVE VERIFICATION REQUIRED**.

## Rollback

- Backend: redeploy previous image; schema is additive-only so old code runs against the newer schema (never the reverse — do not run new migrations before the code that tolerates them is deployed).
- Web: redeploy previous dist; SW autoUpdate refreshes clients on next load.
- Data: PHASE6_BACKUP_RESTORE_RUNBOOK.md disaster sequence.

## First-deploy verification matrix (execute + record)

register · login · refresh · create customer · create order · record payment · sync pull/push · subscription lookup · logout · health×4 · audit rows present · metrics snapshot (admin).
