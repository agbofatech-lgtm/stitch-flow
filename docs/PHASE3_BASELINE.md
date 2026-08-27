# PHASE 3 BASELINE — recorded before any Phase 3 implementation

Date: 2026-08-27
Starting commit: f31f1d7 (tag `phase-2-backend-foundation-complete`, verified on origin)
Branch: arena/01a04183-stitch-flow · Working tree: clean

## Baseline verification (executed)

| Check | Result |
|---|---|
| apps/web type-check | PASS (0 errors) |
| apps/web lint | FAIL — no ESLint config exists anywhere in the repo (pre-existing since original baseline `b576c3e`; the `lint` script references a config that was never committed). Not silently repaired. |
| apps/backend type-check | PASS (0 errors) |
| apps/backend lint (`tsc --noEmit`) | PASS |
| apps/backend tests | 39/39 PASS (6 suites, real embedded PostgreSQL + migrations) |
| Frontend build (`vite build`) | PASS (verified during Phase 2 gate on this same commit) |
| Phase 1 smoke suite | PASS (verified during Phase 2 gate on this same commit) |
| Migration verification | PASS — fresh DB → 7/7 applied → `--verify` 0 pending |

## Repository-truth discrepancies vs the Phase 3 prompt (per §3: repository wins, documented)

1. **No client-side offline sync stack exists in this repository.** The prompt lists as protected: `apps/web/src/db/` (Dexie/IndexedDB), `apps/web/src/modules/repositories/local/`, `apps/web/src/modules/services/syncEngine.ts`. **None of these paths exist.** The frontend persists via localStorage (`apps/web/src/shared/lib/db.ts`). The Dexie/IndexedDB/syncEngine implementation belonged to the lost pre-recovery Arena workspace and was never pushed to GitHub (established in the Phase 0 forensic audit).
   → Phase 3 scope consequence: server-side sync protocol (change log, cursor, delta pull, idempotent mutation intake, tombstones) is implemented and tested end-to-end over HTTP. Client-side engine integration (IndexedDB queue, client cursor persistence) is **INCOMPLETE / future work** and is explicitly reported as such.
2. **Referenced documentation does not exist**: PHASE1_FINAL_REPORT.md, PHASE2_BASELINE.md, PHASE2_CHANGELOG.md, PHASE2_FINAL_REPORT.md. What exists: `docs/PHASE1_REPORT.md` (Phase 1) and the Phase 2 final report (delivered in-session; its content is reflected in the Phase 2 commit message of f31f1d7).
3. `migrations/` and `scripts/` live under `apps/backend/`, not at repo root.

## Existing systems Phase 3 builds on (verified in source)

- Auth: `authService` (register/login/refresh+rotation/logout), bcrypt, JWT access+refresh (`utils/jwt.ts`), `refresh_tokens` table, `authMiddleware`, `requireRole`, zod validation, rate limits.
- Sync v1: `sync_changes` table (user-scoped), `/sync/push` + `/sync/pull` (timestamp-based) — Phase 3 upgrades to workspace-scoped monotonic-cursor delta sync without removing v1.
- Tenancy gaps (from Phase 2 report, re-verified): business tables lack `workspace_id` except `fabric_records`/`workspace_members`; business routes unauthenticated; `workspace_members` has no link to `users`; no `workspaces` table.
- Payments: transactional invoice reconciliation exists (BEGIN/COMMIT in paymentRoutes); no idempotency, no sync-change record.
- Inventory: usage insert and stock deduction are **separate statements** (not atomic) — Phase 3 target.
