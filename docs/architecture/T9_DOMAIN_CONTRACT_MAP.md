# T9 Domain / Contract Map

**Date:** 2026-08-31  
**Vocabulary:** `docs/domain/CANONICAL_DOMAIN_VOCABULARY.md` — do not invent parallel names.

| Canonical | Existing contract | T9 note |
|---|---|---|
| Customer | types + AppContext + T2 `customer` | TRANSITIONAL dual population (local vs HTTP stub) |
| BodyMeasurement / GarmentMeasurement | T3 `separate` + T8 version | AUTHORITATIVE for new writes |
| PatternMeasurement | derived projection | Must not become SoT |
| MeasurementVersion | T8 frozen T2 record | Not wired into Studio UI |
| GarmentSpecification | T6 | Handoff; not complete Phase 14 |
| PatternRequest / PatternOutput | T3 gateway | DesignStudio uses T7 adapter, not T3 separate-on-call |
| ProductionPlan | assistant output on Order | Dual save paths (T7) |
| ProductionStage | backend codes + T3 sequence | Frontend `productionStages[]` TRANSITIONAL |
| FabricRecord / MaterialUsage | AppContext | Estimate ≠ stock |
| JobSheet | `jobSheetExport.ts` | Calls `application/tailoring` (T9); PDF layout unchanged; visual PDF UNKNOWN |
| Order | AppContext + T2 `order` repo unused by UI | TRANSITIONAL SoT |

**FORBIDDEN parallels if T9 later implements:** second pattern engine, second yardage formula set, second stage code list, new localStorage measurement store, AI-generated measurements.

T3 ownership (`ownership.ts`) remains binding. Unassignable: `ai-advisory`, `3d-fitting`, `saas-billing`, `agbofa-control-center`.
