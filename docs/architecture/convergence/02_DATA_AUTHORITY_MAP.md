# 02 — Data Authority Map (SAC-0)

**FACT** unless marked otherwise.

## Entity authority table

| Entity | UI creator | Current SoT | Local persistence | Backend authority | Tenant scoped | Trusted contract | Migration risk |
|---|---|---|---|---|---|---|---|
| Customer (atelier) | AppContext `addCustomer` | AppContext | `stitchflow:data:customers` | none live | `workspaceId` mock only | none | HIGH — split vs HTTP |
| Customer (Clients screen) | Customers.tsx HTTP | HTTP | none | `customerRoutes` unmounted | no tenant column | `ApiCustomer` | HIGH — different population |
| Measurement profile | AppContext / Studio | AppContext | `stitchflow:studio:measurementProfiles` | none | workspaceId on profile | live blob mixed | HIGH if freeze skipped |
| MeasurementVersion | MeasurementWorkspace freeze | T2 `measurement` | IndexedDB/memory | none | UNKNOWN (ids only) | P13 frozen | MEDIUM — not Studio-wired |
| Garment spec (T6) | Workflow projection | ephemeral | optional T2 snapshot | none | no | T6 projection ≠ P14 version | MEDIUM |
| GarmentSpecificationVersion | MeasurementWorkspace / tests | T2 `garment` | IndexedDB | none | UNKNOWN | P14 freeze | MEDIUM |
| Composition / Version | tests + freeze APIs | T2 `garment` | IndexedDB | none | UNKNOWN | P15; empty required-component registry | MEDIUM |
| Order (Orders.tsx) | AppContext | AppContext | `stitchflow:data:orders` | unmounted `orderRoutes` | workspace mock | none | HIGH — vs Production Board HTTP |
| Pattern output | Studio useMemo / Path C | derived | PNG library localStorage | none | n/a | T10 fingerprint only Path C | HIGH if treated as SoT |
| Production plan | Studio / Orders / Path C | on local Order | order JSON | JSON column intended, unmounted | no | T10 strips `generatedAt` | MEDIUM |
| Production stage | Orders local array + HTTP | split | on Order | `productionStageService` unmounted | no | T3 code copy | HIGH — path mismatch |
| Invoice | Invoices.tsx HTTP | HTTP | AppContext seed unused | unmounted | no | shop ≠ SaaS | HIGH split |
| Payment (shop) | Invoices HTTP | HTTP | AppContext unused | `/payments` vs client `/invoices/:id/payments` | no | mismatch | HIGH |
| Material / fabric | AppContext Materials.tsx | AppContext | fabricRecords localStorage | unmounted materials | no | estimate ≠ stock | MEDIUM |
| Design draft | DesignStudio | extra localStorage | `stitchflow:design-studio:drafts` | none | no | T7 draft store | MEDIUM |
| Design Studio state | React + AppContext session | session + drafts | studioSession + drafts | PATCH studio-session unmounted, no caller | no | two save paths | HIGH |
| User / Identity | Control Center register/login | P19 store | file/memory | `/auth` | identity global | JWT `sub` only | LOW for platform; atelier mock separate |
| Tenant | created at register | P19 store | file/memory | platform | self | OD-P19-01 B implemented | LOW |
| Workspace (platform) | bootstrap default | P19 store | file/memory | platform | tenantId | ≠ atelier workspaceId | HIGH mapping |
| Membership | register TENANT_OWNER | P19 store | file/memory | platform | tenant | STAFF unused in UI | MEDIUM |
| Subscription | checkout + webhook | P19 commercial | file/memory | `/platform/billing` | tenant | test adapter | MEDIUM |
| Entitlement | derived | server `can()`; FeatureGate UX | n/a | `/platform/access/check` | tenant | unused by atelier | HIGH if FeatureGate treated as law |
| Audit | platform events | commercialAudit | file/memory | `/control/audit` | tenant | last 100 | LOW |
| Configuration | Control Center PATCH | store.configuration | file/memory | only `disabledCapabilities` mutable | platform | ADR-011 | LOW |

## Why T2 exists but AppContext remains primary (FACT, not “unfinished”)

**EVIDENCE:** `docs/transformation/T2_DATA_AUTHORITY_REPORT.md` explicit non-goal: “AppContext localStorage remains TRANSITIONAL”; “T2 does not mass-migrate (STOP 12)”.

**Dependency chain (FACT):**

1. T1 forbade mounting unauthenticated shop CRUD.
2. T2 therefore implemented repositories + outbox + **blocked** remote transport (`blockedBusinessApiTransport`).
3. Migrating AppContext onto T2 without a remote would move SoT into IndexedDB that cannot ack.
4. Dual-read was documented TRANSITIONAL and left for a later owner-authorized programme.
5. T3+ froze engines and added version stores *on* T2, without replacing AppContext for shop screens.

**INFERENCE:** T2 is an isolation layer waiting for authenticated remote authority (SAC-3), not a failed cutover.

## Persistence inventory

| Mechanism | Status |
|---|---|
| localStorage | **USED LIVE / TRANSITIONAL / AUTHORITATIVE for shop UI** |
| AppContext | **USED LIVE** |
| IndexedDB T2 | **PARTIAL** — started; used by freeze APIs; not shop screens |
| Memory store | **USED** in tests / IDB fallback |
| Sync queue | **IMPLEMENTED / BLOCKED** remote |
| HTTP shop clients | **PARTIAL / DEAD at runtime** (unmounted) |
| File JSON platform | **USED** if `PLATFORM_DATA_PATH` |
| PostgreSQL | **DECLARED / NOT APPLIED / NOT VERIFIED** |
