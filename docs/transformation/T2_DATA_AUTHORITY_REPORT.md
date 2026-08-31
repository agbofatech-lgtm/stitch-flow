# T2 Data Authority Report

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T2.0 baseline | **VERIFIED** — T1 tag `transformation-t1-runtime-authority-complete` → `c22712e` |
| Implementation | `apps/web/src/shared/persistence/` |
| UI rewrite | **none** (AppContext localStorage remains TRANSITIONAL) |

---

## T2.0 Baseline

| Item | Value |
|---|---|
| Branch | `arena/01a05677-stitch-flow` |
| T0 tag | `transformation-t0-baseline-accepted` = `ce3d45b` |
| T1 implementation | `746943213c7a563bb1125b9c63ca2ec12ce487d2` |
| T1 verification | `083687cc731ca75ac86e22898a6f71d218e0bb63` |
| T1 checkpoint | `transformation-t1-runtime-authority-complete` |
| Protected hashes | match T0 registry |

**BASELINE VERIFIED.**

---

## T2.1 Forensics (FACT)

| Mechanism | Present? | Role today |
|---|---|---|
| localStorage | Yes | AppContext via `shared/lib/db.ts`; Design Studio drafts extra key |
| sessionStorage | No | — |
| IndexedDB | **T2 added** `stitchflow-t2` | New local-first store. Not yet the AppContext SoT |
| API persist | Clients exist; T1 CRUD **unmounted** | 404 |
| React state | AppContext | Session + hydrate from localStorage |
| Service worker | No | T2 uses in-app sync engine, not SW |
| navigator.onLine | Not previously used | T2 probe = T1 `/health` runtime check |

---

## Inventory (current vs T2 target)

| Entity | Current storage | Writer | Remote | T2 local store | Remote sync | Conflict |
|---|---|---|---|---|---|---|
| Customer | localStorage + HTTP stub screens | AppContext / Customers.tsx | T1 404 | repository `customer` | **blocked** (auth) | detect-only |
| Measurement | localStorage profiles | AppContext / Studio | none | repository `measurement` | blocked | **domain-deferred** |
| Garment / Design | localStorage + drafts | AppContext / DesignStudio | none | repositories | blocked | deferred / detect-only |
| Order | localStorage + HTTP screens | split | T1 404 | repository `order` | blocked | **domain-deferred** |
| Production | local + unmounted stages | split | T1 404 | repository `production` | blocked | **domain-deferred** |
| Material / Inventory | localStorage | AppContext | broken client | repositories | blocked | detect-only |
| Invoice / Payment | HTTP screens + unused seed | Invoices.tsx | T1 404 | repositories | blocked | detect-only |
| User / Workspace | mock session | AppContext | absent | repositories | blocked | server-authoritative (unused) |

**FACT:** AppContext still writes localStorage. T2 does **not** mass-migrate (STOP 12). Dual-read path is documented TRANSITIONAL.

---

## What T2 implemented

- Repository interfaces over a `LocalStore`
- Memory store (tests) + IndexedDB store (browser)
- Schema version 1 + migrate helper
- Sync metadata + durable operation queue
- Idempotent `operationId`
- Connectivity monitor (browser online **plus** T1 `/health` probe)
- Sync worker (foreground `SyncEngine`) that **does not** call unauthenticated CRUD
- Conflict detection without silent overwrite
- Tombstones instead of physical delete-before-sync
- Legacy localStorage adapter (read/map only)

---

## Explicit non-goals (honoured)

No Design Studio edit, no Pattern Engine edit, no T1 CRUD mount, no SW, no T3 extraction, no commercial platform.
