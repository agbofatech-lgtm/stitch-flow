# PHASE 3.5 OFFLINE ARCHITECTURE

USER ACTION -> LocalRepository -> Dexie/IndexedDB (+ syncQueue row, same transaction)
-> immediate success to caller -> syncNow (startup/online/periodic/manual, single-flight)
-> queue drain -> Phase 3 server -> sync_changes -> GET /sync/changes delta
-> applyDeltaBatch (ONE IndexedDB transaction: rows + tombstones + cursor) -> commit.

## Database (single canonical DB `stitchflow`)
Tables: customers, orders, measurementProfiles, invoices, payments, fabrics, materialUsages,
productionStages, settings ([workspaceId+key]), syncMeta, syncQueue. Domain rows = canonical
types + envelope { workspaceId, deletedAt, localUpdatedAt }. Schema versions are additive
(v1 -> v2 tested upgrade); DB name/version history must never be edited retroactively.

## Authority model (§27)
LOCAL: offline UX, pending mutations, temporary state.
SERVER: auth, membership, payments, invoice truth, inventory truth, cursor, idempotency,
conflict resolution. The client never computes authoritative balances or stock.

## Workspace isolation (§44)
Every row carries workspaceId; repository get/list/update/softDelete refuse cross-workspace
access at the data layer (tested), not just in UI filters. Queue and cursor are per-workspace.

## Logout (§45)
clearAuthTokens() removes tokens ONLY. Local data, queue and cursor remain; sync pauses
(skipped, queue preserved — tested). Pending work survives re-authentication.

## Multi-tab (§28)
syncNow is single-flight in-process and wrapped in navigator.locks('stitchflow-sync') when
the browser provides it. IndexedDB transactions serialize concurrent tab writes.

## PWA (§33)
No service worker exists in the repo; the sync system intentionally does not depend on one.
IndexedDB is the durable store. Workbox integration remains future work.

## UI integration status (honest)
UI reads still flow through AppContext (localStorage-backed, local + offline). All UI writes
are mirrored into IndexedDB (debounced bridge), legacy data is migrated idempotently, and
payments now carry idempotency keys. Full read-path cutover of components onto the local
repositories is deliberately deferred (see risk register / known limitations).
