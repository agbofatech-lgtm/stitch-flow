# PHASE 8 BASELINE — Verified Pre-Work State (2026-08-27)

Recorded BEFORE any Phase 8 implementation, per §7/§8. All values from actual execution in this session.

## Git

| Item | Value |
|---|---|
| Baseline tag | `phase-7-complete` → `6992c86` (remotely verified) |
| Local HEAD | `8e4941b` = phase-7-complete + exactly ONE docs-only commit (PHASE7_FINAL_REPORT recovery addendum; source-identical, verified by `git diff phase-7-complete..HEAD --stat` = 1 doc file, +19/−9) |
| Remote branch | `origin/arena/01a042ac-stitch-flow` = `8e4941b` — local == remote, zero divergence |
| Working tree | CLEAN (0 uncommitted changes) |
| Shallow clone | WAS shallow → repaired with `git fetch --unshallow` (now complete history) |
| Phase 8 checkpoint | `phase-8-pre-work` → `8e4941b`, PUSHED + remotely verified |
| Phase 5/6/7 tags | All intact on remote (verified via `git ls-remote --tags origin`) |

## Protected IP (§3)

Real paths (verified by `find`, matching the Phase 8 prompt):

- `apps/web/src/components/DesignStudio.tsx` (4,118 lines)
- `apps/web/src/modules/services/patternEngine.ts` (678 lines)
- `apps/web/src/modules/services/productionAssistant.ts` (1,312 lines)

`git diff phase-7-complete -- <all three>` = **EMPTY (zero diff)**. Also zero diff vs `d3dfa56` (Phase 7 start).

## Environment

| Item | Value |
|---|---|
| Node | v22.22.3 |
| npm | 10.9.8 |
| OS | Debian GNU/Linux 12 (bookworm), x86_64 |
| Database (tests) | Embedded PostgreSQL via `embedded-postgres` ^18.4.0-beta-17, port 5541, fresh DB per run, real migration runner applied (`tests/globalSetup.js`) |
| Dependencies | Installed with `npm ci` from lockfile (tree stayed clean) |

## Current migration number

Latest applied = `014_phase7_intelligence.sql` (14 migrations, 001–014). **Next = 015** (determined from repo, not assumed).

## Baseline regression battery (actual execution, this session)

| Gate | Result |
|---|---|
| Backend TypeScript (`tsc --noEmit`) | **PASS** |
| Frontend TypeScript (`tsc --noEmit`) | **PASS** |
| Frontend lint (`eslint . --ext .ts,.tsx`) | **FAIL — 16 pre-existing errors** (see below) |
| Backend tests (`jest --runInBand`) | **PASS — 21/21 suites, 213/213 tests, 84.6s** |
| Client tests (`vitest run`) | **PASS — 5 files, 41/41 tests** |
| Production build (`npm run build`, both workspaces) | **PASS** (web: ✓ built in 7.19s; backend tsc emit OK) |
| Protected-IP smoke | **PASS — zero diff** |
| Secret scan | **PASS** — only clearly-fake test fixtures (`password123` etc. in `tests/`); no key/token/live-secret patterns; only `.env.example` files tracked |

### Pre-existing frontend lint finding (NOT a Phase 8 regression)

16 errors, all `@typescript-eslint/no-unused-vars` / `no-explicit-any`:

- 11 in `apps/web/src/components/DesignStudio.tsx` — **protected IP, cannot be modified in Phase 8 under the zero-diff policy**
- 5 in `apps/web/src/modules/services/jobSheetExport.ts` (lines 444–452)

Both files last touched in commit `dfd881c` (**Phase 1**) and byte-identical to `phase-7-complete` — the failures pre-date Phase 7 and are recorded as a carried baseline deficiency. Phase 8 acceptance: **zero NEW lint errors**; the 16 pre-existing ones remain frozen (fixing the 11 protected-IP ones is prohibited; fixing the 5 in jobSheetExport.ts is out of Phase 8 scope unless explicitly authorized, since it is not a Phase 8 file).

Note: frontend lint was not part of the recorded Phase 7 gate set (Phase 7 recorded tsc+jest+build), so this is a newly-recorded baseline fact, not a regression.

## Phase 7 systems present (do not duplicate — extend only)

- Usage intelligence: `usage_events` + `/usage/*` routes + `usageService`
- Error center: `error_records`, `incidents`, `errorService`, `/platform/incidents*`
- Feature flags: `feature_flags` (8 seeded flags, all false), `featureFlagService`
- Integration outbox: `integration_outbox`, `outboxService` (idempotent)
- Platform roles: `platform_owner/admin/support/analyst` + `requirePlatformRole` middleware
- Provider contracts: `src/providers/contracts.ts` + `RuleBasedDiagnosticProvider`
- Customer portal: `portal_customers`, separate JWT audience `stitchflow-portal`
- Audit: `audit_logs` + `auditLogService` (redaction, correlation)
- Sync: `sync_changes`/`processed_mutations`/`clientMutationId` (Phase 5)
- Rate limiting: single global limiter (`apiRateLimit`) + `authRateLimit`

## Gaps Phase 8 must fill (from §4, verified absent in repo)

- Developer API keys / scopes / hashed secrets — **ABSENT** (no api_keys table, no key auth middleware)
- Webhook endpoints / deliveries / signatures / retries — **ABSENT** (outbox has no delivery machinery)
- Integration/provider registry table — **ABSENT** (contracts exist, no registry persistence)
- Quota abstraction (QuotaService) — **ABSENT** (plan limits exist in billing only)
- Usage rollups (hourly/daily/monthly) — **ABSENT** (raw events only)
- Developer dashboard UI — **ABSENT** (no platform/control-plane surface in apps/web)
- Platform alerts / diagnostic snapshots / retention enforcement — **ABSENT**
