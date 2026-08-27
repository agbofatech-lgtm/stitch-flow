# PHASE 3.5 CHANGELOG

- deps (apps/web): + dexie@^4 (runtime); + vitest@^2, fake-indexeddb@^6 (dev/test only)
- NEW src/db/: schema.ts (versioned v1->v2, entity->table map, event-lane set), database.ts
  (single canonical StitchFlowDatabase), syncMeta.ts (persistent cursor + diagnostics),
  migrateLocalStorage.ts (idempotent, non-destructive legacy import), appStateBridge.ts
  (debounced UI snapshot mirror)
- NEW src/modules/repositories/local/LocalRepository.ts: base + 8 canonical local repositories
  (customers, orders, measurementProfiles, invoices, payments, fabrics, materialUsages,
  productionStages) — local write + queue in one IndexedDB transaction; workspace boundary
  enforced at repository layer
- NEW src/modules/services/syncQueue.ts: durable queue manager (states, bounded exponential
  backoff, retry exhaustion, FIFO, stale-processing crash recovery)
- NEW src/modules/services/syncEngine.ts: single-flight syncNow (Web Locks cross-tab),
  event-lane routing, 207-contract handling, cursor-transactional delta apply, tombstones +
  anti-resurrection, pagination, 401->coordinated refresh->retry, pause-on-auth-failure
- NEW src/offline/bootstrap.ts: startup migration + controlled sync triggers
  (startup/online/periodic); wired in main.tsx (fail-safe: app runs fully offline)
- CHANGED shared/lib/db.ts: saveAppStorage mirrors snapshots to IndexedDB (fire-and-forget)
- CHANGED shared/utils/api.ts: refreshAuthTokens exported with injectable transport
- CHANGED Invoices.tsx payment modal: sends clientMutationId (idempotent financial submits)
- CHANGED shared/api/payments.ts: PaymentPayload.clientMutationId
- NEW tests/offline/: 4 suites, 38 tests (database 6, repositories+queue 12, engine 17,
  integration 3) on real Dexie over fake-indexeddb
- Backend: UNTOUCHED (69/69 tests still pass). Protected systems: 0-diff vs 8efa680.
