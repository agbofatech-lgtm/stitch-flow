# PHASE 3.5 BASELINE — Client Offline Foundation Recovery

Date: 2026-08-27 · Starting checkpoint: `8efa680` (tag `phase-3-sync-security-complete`, verified locally + on origin) · Working tree clean.

Branch note: this Arena session is fixed to `arena/01a04183-stitch-flow` (platform constraint —
no other branches may be created/pushed). This satisfies §2's intent: work is NOT on `main`
(`main` remains `b576c3e`), and pushed tags provide the mandated recovery checkpoints.

## Forensic findings (repository truth)

1. **Existing client persistence:** localStorage only — `src/shared/lib/db.ts` (StorageLike wrapper + memory fallback), `storageKeys.ts`, `serializers.ts` (Date revival), `seedData.ts`. AppContext (2,001 lines) loads once via `initializeAppStorage()` and write-behinds via `saveAppStorage()`.
2. **Existing API client:** `src/shared/utils/api.ts` — API_BASE, token storage (localStorage), Authorization injection, serialized 401→refresh→retry (Phase 3).
3. **Existing auth client:** `src/shared/api/auth.ts` — register/login/logout with token store (Phase 3). No login UI.
4. **Existing business repositories (client):** NONE. `src/modules/repositories/` does not exist (backend repos were relocated in Phase 1). Data flows: components → shared/api clients (REST, graceful-fallback) and AppContext (localStorage).
5. **Existing service layer:** `modules/services/` = patternEngine, productionAssistant, jobSheetExport, tierEnforcement (all protected/frontend-domain; no sync).
6. **PWA/service worker:** `public/manifest.json` + icons only. NO service worker, NO Workbox. Core sync therefore must not depend on SW (§33 satisfied by design).
7. **IndexedDB references:** none in source. `package.json` has no dexie. No IDB abstraction of any kind.
8. **localStorage usage:** app domain data (shared/lib/db.ts keys) + auth tokens (`stitchflow.auth.*`).
9. **Sync-related client code:** none (matches Phase 3 report — client sync stack was lost with the pre-recovery workspace and never pushed).
10. **Server synchronization contract (read from apps/backend source, not guessed):**
    - `GET /sync/changes?cursor=<seq>&limit=<n>` (auth + workspace) → `{ changes: [{ seq, entity, entityId, operation, payload, occurredAt, clientMutationId }], nextCursor, hasMore }`, deterministic seq order.
    - `POST /sync/mutations` `{ mutations: [{ clientMutationId(uuid), entity, entityId, operation: insert|update|delete, payload, occurredAt(ISO) }] }` → 207 `{ results: [{ clientMutationId, status: applied|duplicate|rejected, code?, seq? }] }`. Financial entities → `rejected/USE_EVENT_ENDPOINT`.
    - Payments event lane: `POST /payments` (+`clientMutationId`) → 201, or 200 `{duplicate:true}` on replay; 400 overpay; 404 tenancy.
    - Inventory event lane: `POST /materials/usages` (+`clientMutationId`) → 201 / 200 duplicate / 409 insufficient stock / 404.
    - Idempotency: server `processed_mutations` + partial unique indexes. Tombstones: server soft-deletes + DELETE change entries.
11. **Missing components (to build):** Dexie database + versioned schema; local repositories; durable sync queue (states, retry, stale-processing recovery); sync engine (single-flight, cursor-transactional delta apply, tombstones, auth-aware); sync metadata; localStorage migration; client test infrastructure (none exists — vitest + fake-indexeddb will be added as devDependencies).
12. **Recovery plan:** build subsystems in checkpoint order (§57): Dexie foundation → local repositories → sync queue → client sync engine → offline integration bridge → tests/docs. Integration strategy: AppContext/UI remain untouched in shape; Dexie becomes the durable local store + queue feeding the Phase 3 server protocol; the localStorage layer is migrated idempotently and kept as legacy fallback (non-destructive). Financial/inventory mutations route through their event endpoints with client-generated `clientMutationId`; state entities through `/sync/mutations`.

No material discrepancy with the expected Phase 3 state → proceeding.
