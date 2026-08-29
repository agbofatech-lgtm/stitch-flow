# Phase 13 — Stage 0 Forensics

Date: 2026-08-29 · Branch: `arena/01a047e2-stitch-flow`

## Source of truth

| Item | Value |
|---|---|
| Current branch | `arena/01a047e2-stitch-flow` |
| HEAD | `ced8969b79cead18b1b2a2c25ba5d1b3fccc18b3` |
| `phase-12-complete` tag object | `591d178b122c7058186a5853822e0a9141c7960e` → commit `ced8969` |
| Remote branch SHA | `ced8969` (verified via `git ls-remote`) |
| Remote tag SHAs | `phase-12-complete` 591d178, `phase-11-complete` de19d70 (unchanged) |
| Working tree | clean (`git status --short` empty) |
| Next migration number | **018** (existing: 001–017) |

## Protected IP (zero diff vs phase-12-complete)

`git diff phase-12-complete HEAD -- <file>` returned 0 lines for:
- `apps/web/src/components/DesignStudio.tsx`
- `apps/web/src/modules/services/patternEngine.ts`
- `apps/web/src/modules/services/productionAssistant.ts`

## Existing measurement system audit

1. **Server tables:** no canonical measurement tables. `orders` (migration 006)
   carries `measurement_snapshot JSONB`, `garment_measurements JSONB`,
   `selected_measurement_profile_*` TEXT columns. `customers` (006 + tenancy
   009) has no measurement columns.
2. **Legacy profiles:** web type `CustomerMeasurementProfile`
   (`apps/web/src/shared/types/index.ts:294`) — flat `GarmentMeasurements`
   map, embedded on customer records; materialized in Dexie table
   `measurementProfiles` (`apps/web/src/db/database.ts`), synced through the
   sync v2 operation log (`sync_changes` + `processed_mutations`, migrations
   003/010; server is an append-only log, clients materialize state).
3. **API:** developer API exposes order measurement snapshots only
   (`GET /api/v1/orders/:id/measurements`, `measurements:read` scope). No
   customer measurement CRUD API exists.
4. **Tenant pattern:** routes mounted in `app.ts` with
   `authMiddleware, requireWorkspace` (e.g. `/customers`); tenancy via
   `workspace_id TEXT NOT NULL REFERENCES workspaces(id)` (migration 009).
5. **Offline:** single Dexie DB `stitchflow`, schema v1/v2 additive
   (`db/schema.ts`), envelope `{workspaceId, deletedAt, localUpdatedAt}`,
   sync queue with immutable `clientMutationId`, retry/backoff states.

## Phase 13 integration strategy

- **Server-authoritative canonical tables** (migration 018): definitions
  registry (global), profiles, sets, values, observations — TEXT primary keys
  (client-generatable, offline-stable), `workspace_id` FK on every owned row,
  constraints + indexes per §41.
- **REST API** mounted like existing routes
  (`authMiddleware, requireWorkspace`) under
  `/customers/:customerId/measurement-profiles…` with server-side customer
  ownership checks. Existing endpoints untouched.
- **Offline:** Dexie schema v3 adds local cache tables for the canonical
  entities plus a measurement outbox reusing the queue conventions
  (idempotency keys, retry states); drafts persist locally before any network
  call. No new sync engine; sync v2 untouched.
- **Legacy system preserved:** `CustomerMeasurementProfile`, Dexie
  `measurementProfiles`, order snapshots remain functional and unmodified.

## Baseline gates (pre-implementation)

- web `tsc --noEmit`: PASS · backend `tsc --noEmit`: PASS
- vitest: 7 files / 50 tests PASS · build: ✓ 9.8 s
- ESLint: exactly 16 pre-existing errors (0 new)
- jest: running at Stage 0 close (result recorded below)

Jest baseline: PENDING (background run `backend-test-baseline` in progress at
doc authoring time; final value recorded in the Phase 13 report).
