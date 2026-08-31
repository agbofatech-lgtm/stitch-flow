# T2 Offline-First Architecture

```
FEATURE / (future UI)
        ↓
REPOSITORY (EntityRepository)
        ↓
LOCAL STORE  (IndexedDB stitchflow-t2, or MemoryStore in tests)
        ↓
SYNC QUEUE (operations object store)
        ↓
CONNECTIVITY (navigator.onLine + GET /health runtime probe)
        ↓
SYNC ENGINE (foreground worker)
        ↓
REMOTE TRANSPORT
        ↓
T1 AUTHORITATIVE API  (blocked for business CRUD)
```

| Piece | Implementation |
|---|---|
| Local database | IndexedDB `stitchflow-t2` v1 |
| Repository layer | `EntityRepository` + `createRepositories()` |
| Sync queue | `operations` store, survives dump/restore |
| Connectivity | `ConnectivityMonitor` |
| Worker | in-app `SyncEngine.processQueue()` — **not** a service worker |
| Retry | same `operationId` overwrites; no duplicate records |
| Conflict | `compareVersions`; mark `conflict`; no silent overwrite |
| Deletion | tombstone + `syncStatus: deleted` |
| Migration | `migrateLocalSchema` v1 |
| Recovery | `dump` / `restore` |

Service worker: **not introduced** (avoid stale API/asset caches; T1 health must stay honest).
