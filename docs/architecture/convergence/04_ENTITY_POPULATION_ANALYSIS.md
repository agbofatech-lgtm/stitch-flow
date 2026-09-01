# 04 — Entity Population Analysis

Do not merge. Classify duplicates.

## Customers

| | Population A | Population B |
|---|---|---|
| What | AppContext `Customer` (`shared/types`) | HTTP `ApiCustomer` |
| Creation | `addCustomer` UUID localStorage | POST `/customers` (unmounted) |
| Read | Orders, Studio, Reports, MeasurementWorkspace | Customers.tsx, ProductionBoard |
| Persist | `stitchflow:data:customers` | intended SQL `customers` |
| Relationship | `workspaceId`, measurementProfileIds | id/fullName/phone/email only |
| Kind | **Runtime split populations** | **Runtime split** (B empty/error by default) |
| Migration difficulty | HIGH | dual-read + identity map |
| Data-loss risk | HIGH if HTTP overwrite of local UUID set | HIGH if local discarded |
| Convergence recommendation | Treat A as shop SoT until SAC-2 dual-read; B is transport shape not a second entity (ADR-003). Owner must forbid silent merge. |

## Orders

| | A | B |
|---|---|---|
| | AppContext orders | HTTP GET `/orders` (Production Board) |
| Kind | **Runtime split** | B unmounted → empty |
| Relationship | Full studio/productionPlan JSON | Narrow SQL row if mounted |
| Recommendation | A remains SoT; B must not become SoT until contracts match |

## Invoices / payments

| | A | B |
|---|---|---|
| | AppContext seed localStorage (unused by Invoices screen) | Invoices.tsx HTTP |
| Kind | **Dead local vs live HTTP client** | HTTP dead at default runtime |
| Extra | Client `/invoices/:id/payments` vs backend `/payments` | **contract mismatch** |
| Recommendation | Do not copy seed into HTTP; fix contract in SAC-3 |

## Production stages

| | A | B | C |
|---|---|---|---|
| | `Order.productionStages[]` local | Orders HTTP `/orders/:id/stages` **wrong path** | Board HTTP `/production-stages` + backend service |
| Kind | **Runtime split + dead path + unmounted authority** | | |
| Recommendation | Canonical codes from `productionStageService` / T3 copy; retire wrong path; do not invent UI codes |

## Measurements

| | A | B |
|---|---|---|
| | Live `CustomerMeasurementProfile.measurements` blob | Frozen `MeasurementVersion` in T2 |
| Kind | **Different representations** (live vs frozen) — correct T8 design | |
| Recommendation | Do not merge; Studio save should *create* B from A (SAC-1) |

## Design drafts

| | A | B |
|---|---|---|
| | `stitchflow:design-studio:drafts` | AppContext `studioSession` |
| Kind | **Different persistence domains** (T7 extra key vs session) | |
| Recommendation | Keep distinct until owner ADR; T2 garment repo unused for drafts (T7 deferred) |
