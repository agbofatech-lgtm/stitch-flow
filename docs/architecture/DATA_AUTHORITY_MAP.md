# T0.5 — DATA AUTHORITY MAP

**Stage:** T0  
**Date:** 2026-08-31  
**Governing question:** Where does truth live *today*? (Not where it should live after T2.)

Authority tags used here are **descriptive of current repo behavior**, not the T2 target model.

---

## 1. PERSISTENCE MECHANISMS INVENTORY (FACT)

| Mechanism | Present? | Role today |
|---|---|---|
| React memory (`useState` / Context) | Yes | Session + all local domains |
| localStorage | Yes | Canonical for studio/ops in browser |
| sessionStorage | No usage found | — |
| IndexedDB | **No** | — |
| Service worker / Cache API | **No** | — |
| PostgreSQL | Declared; live server does not use | Intended for app.ts / apps/api |
| Redis / BullMQ | Declared | Unused by live server |
| File / object storage | No | Images as data URLs |
| Sync operation log | Table `sync_changes` in SQL; services orphaned | Not running |

---

## 2. LOCALSTORAGE KEYS (FACT)

Namespace `stitchflow`, version `2026-03-15.1` (`shared/lib/storageKeys.ts`):

| Key | Content |
|---|---|
| `stitchflow:meta:version` | storage schema version string |
| `stitchflow:session:currentWorkspaceId` | mock workspace id |
| `stitchflow:session:currentMemberId` | mock member id |
| `stitchflow:session:tierSimulation` | BASIC/PRO/STUDIO |
| `stitchflow:data:customers` | Customer[] |
| `stitchflow:data:orders` | Order[] |
| `stitchflow:data:invoices` | Invoice[] |
| `stitchflow:data:payments` | Payment[] |
| `stitchflow:data:dueAlerts` | DueAlert[] |
| `stitchflow:studio:designInspirations` | DesignInspiration[] (may include data URL images) |
| `stitchflow:studio:fabricRecords` | FabricRecord[] |
| `stitchflow:studio:materialUsages` | OrderMaterialUsage[] |
| `stitchflow:studio:patternLibrary` | PatternLibraryItem[] (PNG data URLs) |
| `stitchflow:studio:measurementProfiles` | CustomerMeasurementProfile[] |
| `stitchflow:studio:session` | selected garment, inspiration, plan, measurements, fabric image, order id |
| `stitchflow:design-studio:drafts` | DesignStudio extra drafts (not in AppContext persist map) |

Seed: `shared/lib/seedData.ts` clones `src/data/mockData.ts` plus starter fabrics.

---

## 3. ENTITY AUTHORITY MATRIX (CURRENT)

| Entity | Local role today | Server role today | Authority today |
|---|---|---|---|
| View / navigation | Memory only | none | Client |
| Workspace / branding | localStorage + Settings also PUTs `/settings/:key` | stub GET `/settings`; app.ts kv `app_settings` unwired to live | **Split / client-primary** |
| Tier / entitlements | simulated localStorage | licenses table unused | **Client simulation** |
| User / auth session | none | unused JWT stack | **Absent** |
| Customer (Customers screen) | none | live GET `[]`; POST missing on live; app.ts would use `customers` | **HTTP stub** |
| Customer (Studio/Orders) | localStorage | unused | **Client** |
| Measurement profiles | localStorage | none | **Client** |
| Design inspirations | localStorage | none | **Client** |
| Design Studio draft | extra localStorage | PATCH `/orders/:id/studio-session` exists on app.ts, **no caller**, live missing | **Client** |
| Pattern geometry | ephemeral / regenerated | none | **Deterministic engine (derived)** |
| Pattern library PNG | localStorage | none | **Client cache of derived+manual** |
| Order (Orders.tsx) | localStorage | app.ts CRUD unmounted; live GET wrong shape | **Client** |
| Order (Production Board / Dashboard) | none | live stub orders | **HTTP stub** |
| Production stages | copied onto local Order; HTTP helpers fire-and-fallback | productionStageService unmounted | **Split / broken** |
| Production plan | stored on local Order JSON | JSON column intended, schema incomplete | **Client derived** |
| Fabric records | localStorage | material routes unmounted; client file broken | **Client** |
| Material usage | localStorage | unmounted | **Client** |
| Invoice / payment (Invoices.tsx) | none | live GET stub wrong shape; POST missing; path `/invoices/:id/payments` ≠ app.ts `/payments` | **HTTP stub** |
| Invoice / payment (AppContext seed) | localStorage unused by Invoices screen | — | **Client orphan** |
| Reports | computed from AppContext | report routes unmounted; client unused | **Client** |
| Feature requests / events / audit | none in UI | apps/api only | **Absent in product** |
| Sync changes | none in UI | table exists | **Absent in product** |
| Subscription / billing | alert() | none | **Absent** |

---

## 4. DATABASE TRUTH (FACT)

Migrations that contain DDL:

- `apps/backend/migrations/migrations/002_create_core_tables.sql` — users, licenses, license_devices, events, feature_requests, votes, audit_logs, refresh_tokens
- `003_create_sync_tables.sql` — sync_changes
- `004` indexes, `005` admin seed
- `20260322_create_order_production_stages.sql` — stages + events **FK to orders(id)**

Documented migrate path (`README.md`) points at `migrations/001...005` **which are empty except 001 extensions**.

`initDb()` would CREATE simplified customers/orders/invoices/payments. **Never called.**

Therefore: **PostgreSQL is not the product source of truth in the running architecture.** It is an incomplete intended infrastructure.

---

## 5. WRITE PATHS

### Local-first write (FACT)

```
UI → AppContext setter → React state → useEffect saveAppStorage → localStorage
```

No ack, no queue, no conflict protocol. Last tab wins if two tabs open (UNKNOWN empirically; standard localStorage behavior INFERENCE).

### HTTP write (FACT)

```
UI → fetch POST/PUT → :5000
```

Live stub has **no writes**. Writes 404/fail. Some clients swallow errors (`try/catch return []`). Customers/Invoices screens surface errors.

---

## 6. OFFLINE BEHAVIOR TODAY (FACT, not aspiration)

| If network down | What happens |
|---|---|
| Design Studio | Continues (local) |
| Orders.tsx | Continues (local); stage API fails soft |
| Materials | Continues |
| Reports | Continues |
| Customers | Fails |
| Invoices | Fails |
| Production Board | Empty/error |
| Dashboard | Zeros for API metrics; local fabrics still show |

There is **no** connectivity detector, operation log, or replay.

**Do not call this offline-first.** It is accidental local-first for some modules and network-hard for others.

---

## 7. CONFLICT POLICY TODAY

**None defined.**

INFERENCE: localStorage last write wins; HTTP has no merge.

T2 must not adopt a single global last-write-wins. Domain-specific policies are required (Matrix T2 rule).

---

## 8. T2 TARGET (PROPOSAL ONLY — NOT IMPLEMENTED)

The Matrix target (repositories, sync engine, operation log, server truth) is **future T2 work**.

T0 lock: current authority is **not** that model.

---

**T0.5 complete.**
