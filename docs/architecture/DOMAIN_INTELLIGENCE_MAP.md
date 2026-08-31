# T0.4 — DOMAIN INTELLIGENCE MAP

**Stage:** T0  
**Date:** 2026-08-31  
**Mission:** Locate what StitchFlow *knows*, as distinct from where it *displays*.

Layer tags: EXPERIENCE · APPLICATION · DOMAIN · INFRASTRUCTURE

---

## 1. CONTEXT MAP (AS-IS)

```
EXPERIENCE
  App.tsx views, Layout, DesignStudio JSX, Dashboard chrome
        │
APPLICATION (mostly inside React)
  AppContext orchestration
  tierEnforcement
  FeatureGate
  productionAlerts
        │
DOMAIN (inside apps/web, not a package)
  patternEngine.ts
  productionAssistant.ts
  measurement field types + merge helpers
  productionStageService.ts (backend, unmounted)
        │
INFRASTRUCTURE
  localStorage adapter (shared/lib/db.ts)
  fetch clients (shared/utils/api.ts)
  pg Pool (unmounted app.ts)
  stub JSON (live server.ts)
```

FACT: domain does **not** have a package boundary. It depends on web types (`../types` / `shared/types`).

---

## 2. MEASUREMENT DOMAIN

| Concern | Location | Layer |
|---|---|---|
| Field vocabulary | `shared/types/index.ts` `GarmentMeasurements`, `BodyMeasurements` | DOMAIN |
| Profile entity | `CustomerMeasurementProfile` | DOMAIN |
| Order freeze | `OrderMeasurementSnapshot` | DOMAIN |
| Merge/alias bust↔chest etc. | `AppContext.tsx`, `DesignStudio.tsx` | APPLICATION mixed into UI |
| Slider ranges | `DesignStudio` `MEASUREMENT_FIELD_MAP` | EXPERIENCE (duplicates engine ranges with drift) |
| Engine validation ranges | `patternEngine.ts` `MEASUREMENT_RANGES` | DOMAIN |
| Persistence | localStorage `stitchflow:studio:measurementProfiles` | INFRASTRUCTURE |
| Server | none | — |
| Unit conversion | **absent** (cm assumed) | GAP |

**FACT:** Body / Garment / Pattern measurements are **not** three systems. They are one blob with aliases.

**PROPOSAL (Phase 13, not T0):** introduce MeasurementProfile vs MeasurementVersion vs PatternMeasurements after T3 vocabulary lock.

---

## 3. GARMENT / DESIGN DOMAIN

| Concern | Location | Layer |
|---|---|---|
| GarmentType union | `shared/types` | DOMAIN |
| DesignInspiration entity | types + AppContext CRUD | MIXED |
| Inspiration “analysis” | `analyzeDesignInspiration` keyword/category | DOMAIN heuristic |
| Visual silhouettes | `buildUpperGarmentShape`, `buildSkirtShape`, `buildTrouserShape` in DesignStudio | EXPERIENCE (not pattern geometry) |
| Pattern library items | AppContext + canvas PNG data URLs | MIXED |
| Canonical GarmentSpecification | **does not exist** as a named contract | GAP (T7 target) |

Design Studio output today (FACT) is a **partial Order patch**: garmentType, garmentMeasurements, measurementSnapshot, productionPlan, inspirationAnalysis, fabric/pattern/profile ids — persisted on the local Order.

---

## 4. PATTERN DOMAIN

| Concern | Location |
|---|---|
| Draft generation | `generateStylePattern` / per-kind generators |
| Scale/SVG helpers | same file; canvas path used more than SVG |
| Persistence of geometry | not stored; regenerated; PNG preview stored for library |
| Backend pattern API | **none** |

Protected. See Protected Asset Registry.

---

## 5. PRODUCTION DOMAIN

Two implementations:

### A. Plan intelligence (frontend)

`generateProductionPlan` → fabricEstimate, cuttingList, sewingChecklist, fitRisks, tailorNotes.

Attached to local `Order.productionPlan`.

### B. Stage state machine (backend)

`productionStageService.ts` — ordered stages, transition guards, event log.

Frontend Orders.tsx also keeps `productionStages[]` on the local order and **additionally** calls HTTP helpers at **wrong paths** (`/orders/:id/stages`).

ProductionBoard calls `/orders/:id/production-stages/:code/transition` which matches **app.ts**, not the live stub.

**FACT:** production domain authority is split and currently neither path is end-to-end.

---

## 6. CUSTOMER / COMMERCIAL RELATIONSHIP

| Concern | Frontend Orders/Studio | Frontend Customers screen |
|---|---|---|
| Entity | AppContext `Customer` with workspaceId, profiles | `ApiCustomer` id/fullName/phone/email/address/notes |
| Persistence | localStorage | GET/POST/PUT `:5000/customers` |
| Identity | UUID `crypto.randomUUID()` | stub `[]`; app.ts `Date.now()` |

**FACT:** two customer populations can exist on one device.

User (authenticated actor): **no UI**. Types exist. Auth services in web import missing `../config/db` and jwt utils.

---

## 7. MATERIALS / FABRIC

| Concern | Location |
|---|---|
| FabricRecord CRUD | AppContext local |
| Usage + stock decrement | AppContext; auto-deduct on cutting start |
| Estimate | productionAssistant |
| HTTP client | `shared/api/materials.ts` **BROKEN** and unused by Materials.tsx |
| Backend routes | materialRoutes against `fabric_records` table **not in migrations/initDb** |

---

## 8. FINANCE

Shop invoices/payments: Invoices.tsx talks HTTP. AppContext also has invoices/payments from seed localStorage **not used by that screen**.

SaaS billing: FeatureGate `window.alert`. Two price tables (`config/tiers.ts` GHS 45/90 vs `FEATURE_COMPARISON` $29/$79). License tables in SQL unused.

---

## 9. VOCABULARY DRIFT ALREADY PRESENT (T3 PREVIEW — FACT)

| Concept | Names in repo |
|---|---|
| Product | StitchFlow, Tailor Studio, TailorPro |
| Customer | Customer, ApiCustomer |
| User | User, WorkspaceMember.user, JWT payload, licenses.user |
| Measurements | BodyMeasurements, GarmentMeasurements, OrderMeasurementSnapshot, StudioMeasurements, ExtendedMeasurements |
| Order money field | totalAmount vs amount vs date vs createdAt |
| Tiers | BASIC/PRO/STUDIO vs free/pro/enterprise |
| Production stages path | `/stages` vs `/production-stages` |
| Invoice status | sent/partial/paid/overdue/void vs pending/partial/paid/overdue |

T0 records drift. T3 will canonicalize. T0 does not rename.

---

## 10. UI / DOMAIN COUPLING (MUST EXTRACT LATER)

| Logic | Stuck in |
|---|---|
| Pattern invocation | DesignStudio |
| Production plan invocation | DesignStudio + AppContext |
| Measurement aliasing | DesignStudio + AppContext |
| Auto fabric deduction | AppContext.updateOrder |
| Stage completeness | Orders.tsx + productionAlerts.ts |
| Canvas garment shapes | DesignStudio |

T3/T7 plan: extract without changing behavior. Not started.

---

## 11. EXECUTABILITY OUTSIDE A SCREEN

| Engine | Callable without React? |
|---|---|
| patternEngine | YES (pure TS) |
| productionAssistant | YES (pure TS, depends on types) |
| DesignStudio canvas builders | NO (file-private functions) |
| productionStageService | YES if pg available |
| Measurement merge | NO (inside AppContext/DesignStudio) |

T3 exit (“conceptually executable outside a specific screen”) is **partially true today** for pattern + production assistant only.

---

**T0.4 complete.**
