# 08 — Offline Sync Readiness

## T2 pipeline (FACT)

```
EntityRepository.create|update|delete
  → IndexedDB/memory record (version++, tombstone on delete)
  → enqueue SyncOperation (operationId idempotent)
  → SyncEngine.processQueue
  → blockedBusinessApiTransport.push → RemoteAuthorizationBlockedError
```

**EVIDENCE:** `shared/persistence/{repository,syncEngine,bootstrap,conflict}.ts`

Startup: `main.tsx` `startDataAuthorityRuntime()` — IDB if available else memory; `migrateLocalSchema`; connectivity probe `GET /health`.

## What works / blocked / missing

| Concern | Status |
|---|---|
| Local T2 persist | **WORKS** (tests + freeze APIs) |
| Outbox | **WORKS** locally |
| Idempotent `operationId` | **WORKS** (create/update short-circuit if op exists) |
| Version on record | **WORKS** (integer increment) |
| Tombstone delete | **WORKS** |
| Conflict detect | **WORKS** (`compareVersions`) |
| Domain merge | **IMPLEMENTED** for measurement/order/production **if** remote payload returned — remote never returns |
| Remote push | **BLOCKED INTENTIONALLY** (T1 unauth CRUD) |
| Shop UI writes T2 | **NO** — AppContext localStorage |
| Service worker | **NO** |
| Mutation IDs on AppContext | **NO** |
| Tenant context offline | **NO** on T2 payloads |
| Deletion of localStorage rows | last-write-wins, no tombstone |

**STOP-G:** **Not triggered.** Sync semantics **are** determined for T2 (blocked transport, policies in `ENTITY_CONFLICT_POLICY`). They are **not** determined for AppContext localStorage (none). Convergence requires SAC-2 before SAC-5.

## Future convergence requirements (RECOMMENDATION)

```
LOCAL WRITE (repository)
  → OUTBOX (existing)
  → IDEMPOTENT MUTATION (existing operationId)
  → AUTHENTICATED API (SAC-3, not unauth flag)
  → CONFLICT POLICY (existing map; fill remote payload)
  → ACKNOWLEDGED SYNC
```

Tenant id must be on the queued payload **before** offline work spans multi-tenant identities (owner decision 06).

Entities still localStorage-only for product UI: customers, orders, invoices seed, fabrics, profiles, drafts, studio session.
