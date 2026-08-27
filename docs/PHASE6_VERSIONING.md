# STITCHFLOW PHASE 6 VERSIONING

## Authoritative version: **1.0.0**

Single source of truth: `apps/backend/package.json` `version` (kept in lockstep with the root `package.json` and `apps/web/package.json` — all 1.0.0).

## Resolution chain (implemented in `apps/backend/src/config/version.ts`)

- `GET /health/version` and `GET /health` report `versionInfo.version`, read from package metadata at first use — the hardcoded string that previously lived in `healthController.ts` is gone; drift between API surface and package metadata is now structurally impossible (test: `health.test.ts` asserts equality with `package.json`).
- Optional `SOURCE_VERSION` (override, release tooling only) and `SOURCE_COMMIT` (git sha baked by CI) are echoed when present. Both DEPLOYMENT-ONLY, never secrets.
- Server startup logs version + commit + port + environment (one authoritative line).

## Surface inventory (drift eliminated in Phase 6)

| Surface | Value | Source |
|---|---|---|
| Backend package / root package / web package | 1.0.0 | package.json (all three) |
| GET /health, /health/version | 1.0.0 | version.ts → package.json |
| PWA cache version | build-manifest revisioned | vite-plugin-pwa precache manifest (per-build revision hashes; no hand-maintained version string) |
| Android versionName | **1.0.0** (was "1.0" — fixed in Phase 6) | apps/mobile/android/app/build.gradle, versionCode 1 |
| Android applicationId | com.stitchflow.app (unchanged, protected) | build.gradle + capacitor configs |

## Upgrade strategy

MAJOR.MINOR.PATCH (semver):
- PATCH: bug fixes, no migration → bump PATCH, deploy, `/health/version` reflects it immediately.
- MINOR: additive migrations (013+) → run `npm run migrate` (each migration transactional; new code tolerates both states where feasible), then roll the backend, then the web build.
- MAJOR: destructive/renamed schema or API contract changes — requires a migration guide + explicit backup/restore drill before rollout (see PHASE6_BACKUP_RESTORE_RUNBOOK.md).
- Android: bump versionCode monotonically + versionName to match the release; applicationId never changes.
