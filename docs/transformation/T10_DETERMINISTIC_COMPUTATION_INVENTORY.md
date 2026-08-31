# T10 Deterministic Computation Inventory

**Date:** 2026-08-31  
**Scope:** T10.0 forensics. Repository evidence only. No invented computations.

Baseline: T9 tag `transformation-t9-tailoring-intelligence-boundary-complete` → `8ad25a23c03bc0b35db3d39d1d440dcd3758ed34`.

| ID | Computation | Inputs | Units | Engine | Output | Consumer | Authority |
|---|---|---|---|---|---|---|---|
| TC-001 | Pattern geometry | `StylePatternKind` + measurement map | claimed cm | `patternEngine.generateStylePattern` | `StylePatternResult` (points/outline, cm-labelled numbers) | DesignStudio (T7), T3 `requestPattern`, T6 `runPatternFromSpecification`, jobSheet preview, T9 re-export | AUTHORITATIVE geometry |
| TC-002 | Pattern display scale / SVG helpers | engine points + scale/offset | px vs cm **UNKNOWN** | `scalePatternPoints`, `generateBodiceSvgPath`, `generateDartPath`, `generateGuideLines` | pixel/SVG strings | **no production importers found** | UNUSED helpers |
| TC-003 | Canvas silhouette | Studio measurements + garment type + preview mode | UI `scale` labelled `px/cm` | local DesignStudio functions, **not** Pattern Engine | canvas pixels | DesignStudio front/back preview | EXPERIENCE |
| TC-004 | Job-sheet pattern preview SVG | Order snapshot + implicit defaults | assumed cm; pixels 640×460 | TC-001 then local SVG scale | data URL | `exportOrderJobSheetPdf` | EXPERIENCE / UNKNOWN visual |
| TC-005 | Garment-type → pattern kind map | garment type string | n/a | duplicated maps | `bodice\|shirt\|trouser\|skirt\|kaftan` | DesignStudio, T3 gateway, jobSheet, unused `garmentLogic` | DUPLICATE FACT maps |
| TC-006 | Inspiration analysis | `DesignInspiration` text/category + optional garment type | n/a | `analyzeDesignInspiration` | `InspirationAnalysis` | Studio, AppContext, Orders via T7/T9 re-export | HEURISTIC |
| TC-007 | Garment-type inference | inspiration + fallback | n/a | `inferGarmentTypeFromInspiration` | `GarmentType` | Studio “Use AI Suggestion”, AppContext, generateProductionPlan | HEURISTIC (keyword) |
| TC-008 | Fabric quantity estimate | garment type + measurements + analysis + selected fabric | body cm in; fabric **yards** (or fabric.unit except pieces) out | `estimateFabricRequirement` | `FabricRequirementEstimate` | via TC-009 | HEURISTIC |
| TC-009 | Production plan | garment, measurements, inspiration, analysis, fabric | cm in; yards out; `generatedAt: new Date()` | `generateProductionPlan` | `ProductionPlan` | Studio, AppContext, Orders, T3/T6, T9 re-export | HEURISTIC + NON-DETERMINISTIC timestamp |
| TC-010 | Cutting list / sewing checklist / fit-risk / tailor notes | garment + analysis + measurements | n/a / cm for fit | same assistant file | arrays on plan | TC-009 consumers | HEURISTIC |
| TC-011 | T8 length conversion | number + `cm\|in` | `CM_PER_INCH = 2.54` | `domain/measurement/units` | centimetres | freeze + T9 `runPatternContract` only | AUTHORITATIVE conversion |
| TC-012 | T8 measurement freeze | blob + declared unit | canonical cm | `freezeMeasurementVersion` | `MeasurementVersion` | T8 tests / T2 store; **not wired into Studio UI** | AUTHORITATIVE freeze; ID uses `crypto.randomUUID` / `Date.now`+`Math.random` |
| TC-013 | T3 measurement separate / pattern projection | legacy blob | cm assumed | `separateLegacyMeasurementBlob` / `projectPatternMeasurements` | body vs garment vs derived pattern | T3 gateways, T6 spec, T8 freeze | AUTHORITATIVE vocabulary |
| TC-014 | T6 garment specification | order/profile/customer | cm assumed | `buildGarmentSpecification` | `GarmentSpecification` | workflow panel | AUTHORITATIVE handoff |
| TC-015 | T9 result envelope | same as TC-001/TC-009 | cm / yards | `runPatternContract` / `runProductionContract` | result + `TailoringProvenance` | **tests only** | WRAPPER unused by UI callers |
| TC-016 | Stage duration / overdue alerts | stage code + dates | days | `DEFAULT_STAGE_DURATION_DAYS` + `Date.now()` | alerts | ProductionBoard, OrderCard | TRANSITIONAL heuristic |
| TC-017 | `garmentLogic.ts` | garment type / measurements | cm labels | unused duplicate maps | n/a | **no importers** | LEGACY unused |

---

## COMPUTATION ID: TC-001

**NAME:** Pattern Calculation  
**INPUTS:** `kind: StylePatternKind`; `Partial<ExtendedMeasurements>` (bust/chest/waist/hip/neck/shoulder/backLength/sleeve/bustSpan/armholeDepth/thigh/knee/ankle/trouserLength/skirtLength).  
**UNIT AUTHORITY:** Engine error strings and ranges are centimetres. Callers do not pass a unit field.  
**EXECUTION PATH:** Application → T7 `generateStudioPattern` / T9 re-export `generateStylePattern` / T3 `requestPattern` → `patternEngine`.  
**ENGINE:** Protected Pattern Engine.  
**OUTPUT:** Bodice `{points, controlPoints, measurements}` or generic `{kind, points, outline, measurements, guides, notes, pieceNotes, notchPoints, seamAllowanceCm: 1.5}`.  
**CONSUMERS:** DesignStudio `useMemo`; jobSheet `buildPatternPreviewDataUrl`; T3/T6; equality tests.  
**DETERMINISM STATUS:** VERIFIED for geometry given the same numeric inputs (pure functions, `round1` to 0.1, no Date/random). PARTIAL if missing keys: implicit `MEASUREMENT_RANGES.default` and fallback formulas apply.  
**REPRODUCIBILITY STATUS:** Equality tests exist (T3/T7/T8/T9). Fixture certification for T10 **NOT YET TESTED**.

---

## COMPUTATION ID: TC-009

**NAME:** Production Plan  
**INPUTS:** `garmentType?`, `measurements?`, `inspiration?`, `analysis?`, `selectedFabric?`.  
**UNIT AUTHORITY:** Measurement numbers treated as centimetres in formulas (`bust / 220` etc. producing yards). Output `unit` default `'yards'`. BODY cm ≠ FABRIC yards.  
**EXECUTION PATH:** Application → T7 `generateStudioProductionPlan` / T9 `generateProductionPlan` re-export / T3 `requestProductionPlan` → assistant.  
**ENGINE:** Protected Production Assistant.  
**OUTPUT:** `{garmentType, fabricEstimate, cuttingList, sewingChecklist, fitRisks, tailorNotes, generatedAt}`.  
**CONSUMERS:** DesignStudio, AppContext `generateProductionPlanForStudio` / save paths, Orders, T6, job sheet displays stored plan.  
**DETERMINISM STATUS:** PARTIAL — payload except `generatedAt` is heuristic-stable (`round1`). `generatedAt: new Date()` is NON-DETERMINISTIC. Keyword inference is order-dependent but stable for identical strings.  
**REPRODUCIBILITY STATUS:** Tests strip `generatedAt`. Full envelope including timestamp **NOT CERTIFIED**.
