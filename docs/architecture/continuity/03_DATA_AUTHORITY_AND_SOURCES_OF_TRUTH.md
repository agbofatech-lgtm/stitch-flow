# 03 — Data Authority and Sources of Truth

**Date:** 2026-09-01  
**Question:** Where does truth live *today*? Not the T2 target model.

No fixes in this document. Dual-SoT hazards are named, not resolved.

Persistence mechanisms present: React memory, `localStorage` (namespace `stitchflow`, version `2026-03-15.1`), T2 IndexedDB (`stitchflow-t2`) or memory, platform JSON file or memory, PostgreSQL declared but not live SoT, Redis/BullMQ declared unused by live `createApp`.

T2 runtime **starts** in `main.tsx`. Shop UI **does not** use it as SoT.

---

## Source-of-truth matrix

| Entity | Client SoT today | Server SoT today | Persistence | Sync | Authority status | Known split |
|---|---|---|---|---|---|---|
| **Customer (Orders / Studio / Reports)** | AppContext `customers[]` | unused | `stitchflow:data:customers` | none | **Client / TRANSITIONAL** | Yes — second HTTP population |
| **Customer (Clients screen)** | HTTP `ApiCustomer` | shop `customers` table **if** CRUD mounted | fetch `:5000/customers` | none | **HTTP / UNMOUNTED default** | Dual shape vs AppContext Customer |
| **Orders (Orders.tsx)** | AppContext | unmounted `orderRoutes` | `stitchflow:data:orders` | T2 queue exists, blocked | **Client / TRANSITIONAL** | Production Board uses HTTP orders |
| **Orders (Production Board)** | HTTP GET `/orders` | unmounted | none locally | — | **HTTP stub-empty default** | Different screen, different SoT |
| **Measurement profiles (live)** | AppContext | none | `stitchflow:studio:measurementProfiles` | none | **Client** | Mixed body/garment blob |
| **MeasurementVersion** | T2 `measurement` repo when frozen from MeasurementWorkspace | none | IndexedDB/memory | queue only | **Governed / not Studio-wired** | Live profile ≠ frozen version |
| **Garment specification (T6 live)** | Workflow projection from order/profile | none | ephemeral + optional T2 garment repo snapshot | blocked | **Derived / TRANSITIONAL** | Dual Studio save paths |
| **GarmentSpecificationVersion** | T2 on explicit freeze | none | IndexedDB/memory | queue only | **Governed** | Not Design Studio |
| **Composition / CompositionVersion** | T2 on explicit freeze | none | IndexedDB/memory | queue only | **Governed** | Empty required-component registry (P15) |
| **Pattern output** | Derived from Pattern Engine; library PNG in localStorage | none | ephemeral geometry; `stitchflow:studio:patternLibrary` | none | **Derived (not SoT)** | Governed path fingerprints; Studio does not |
| **Production plan** | Heuristic on local `Order.productionPlan` | JSON column intended, schema incomplete | order localStorage | none | **Client derived** | `generatedAt` excluded only on T10 identity |
| **Materials / fabric** | AppContext | unmounted `/materials/fabrics` | `stitchflow:studio:fabricRecords` | none | **Client** | HTTP client exists, screen unused |
| **Invoices (Invoices.tsx)** | HTTP | unmounted `/invoices` | none on that screen | — | **HTTP / UNMOUNTED** | AppContext invoices unused by screen |
| **Payments (shop)** | HTTP on Invoices screen; AppContext seed unused | unmounted `/payments` | mixed | — | **Split** | ≠ SaaS billing |
| **Production stages** | local `Order.productionStages` + HTTP helpers | `productionStageService` via unmounted order routes | local copy | broken | **Split / broken** | Orders uses `/stages`; board uses `/production-stages` |
| **Identity** | Control Center token in component state | platform store identities | file/memory | n/a | **Server (P19)** | AppContext mock User unused for P19 |
| **Tenant** | Control Center after login | platform tenants | file/memory | n/a | **Server (P19)** | ≠ workspace |
| **Membership** | not in atelier UI | platform memberships | file/memory | n/a | **Server (P19)** | Roles `TENANT_OWNER` \| `STAFF` |
| **Plans** | FeatureGate / `tiers.ts` simulation | `catalog.ts` BASIC/PRO/STUDIO seed | in-store catalog | n/a | **Server catalog is law for `/platform/*`; UI is UX_ONLY** | Dual price folklore GHS vs USD |
| **Entitlements** | `tierEnforcement` / FeatureGate | `decideAccess` / `POST /platform/access/check` | derived from subscription | n/a | **Server for platform; UX_ONLY for atelier** | Atelier does not call access/check |
| **SaaS subscriptions** | none in atelier | platform subscriptions after webhook | file/memory | n/a | **Server / CONDITIONAL** | Checkout ≠ entitlement |
| **SaaS payments** | Control Center billing plane (provider deferred) | `saas_payments` in store | file/memory | n/a | **Test adapter only** | ≠ shop Invoice/Payment |
| **Platform configuration** | Control Center `/control/configuration` | store.configuration; only `disabledCapabilities` mutable | file/memory | n/a | **Server / operator** | Settings UI is product workspace, not Control Center |
| **Workspace (atelier mock)** | AppContext + mockData | P19 workspace is a tenant subordinate | localStorage session ids | n/a | **Split planes** | Atelier workspace ≠ P19 TenantWorkspace until joined |

---

## Dual-SoT hazards (FACT)

1. **Two customer populations** on one device: AppContext UUID customers vs HTTP `ApiCustomer`.
2. **Two order populations**: Orders.tsx local vs Production Board HTTP.
3. **Two invoice populations**: Invoices.tsx HTTP vs AppContext seed.
4. **Two entitlement systems**: FeatureGate simulation vs server `can()`.
5. **Two workspace concepts**: mock atelier workspace vs P19 tenant/workspace.
6. **Two production-stage HTTP paths**, plus a local array, plus an unmounted backend engine.
7. **Live measurements vs frozen MeasurementVersion** — Studio writes the live blob.
8. **T2 started but not product SoT** — repositories exist; AppContext still writes localStorage.

Conflict policy on localStorage: none (last write wins). T2 defines per-entity policies; shop UI does not use them. HTTP has no merge.

---

## Offline today (FACT, not ADR-002)

Design Studio, Orders, Materials, Reports continue without network. Customers, Invoices, Production Board, Control Center do not. There is no service worker. T2 connectivity monitor exists; shop screens do not treat it as SoT.

Do not call this offline-first.
