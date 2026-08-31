# T9 Intelligence Dependency Map

**Date:** 2026-08-31  
**Doctrine:** EXTRACT / WRAP — DO NOT REWRITE.

```
CUSTOMER
   ↓
BODY MEASUREMENTS          T8 version / T3 separate / AppContext TRANSITIONAL
   ↓
GARMENT SPECIFICATION      T6
   ↓
GARMENT MEASUREMENTS
   ↓
PATTERN MEASUREMENTS       derived
   ↓
PATTERN ENGINE             PROTECTED
   ↓
PRODUCTION ASSISTANT       PROTECTED heuristics (fabric, cut, sew, fit)
   ↓
JOB SHEET / ALERTS / STAGES
```

| Consumer | Intelligence used | Classification |
|---|---|---|
| DesignStudio (T7 adapters) | `generateStylePattern`, `generateProductionPlan`, analyze/infer | AUTHORITATIVE wrap of protected engines |
| T3 `requestPattern` / `requestProductionPlan` | engines + measurement separate | AUTHORITATIVE gateway |
| T6 `orchestrate.ts` | T3 + GarmentSpecification + T2 garment repo | AUTHORITATIVE workflow |
| AppContext `saveStudioOutputToOrder` | productionAssistant **direct** | TRANSITIONAL / DUPLICATED path |
| `jobSheetExport.ts` | patternEngine **direct** + Order/plan | PARTIAL / DUPLICATED caller |
| `productionAlerts.ts` | Order completeness + `DEFAULT_STAGE_DURATION_DAYS` | TRANSITIONAL heuristic |
| ProductionBoard | job sheet + alerts | EXPERIENCE |
| `garmentLogic.ts` | garment-type mapping + studio field maps | LEGACY / unused duplicate of Studio + T3 maps |
| Canvas silhouettes | local geometry | EXPERIENCE — not engine |
| Fabric stock deduct | AppContext on cutting start using `productionPlan.fabricEstimate` | TRANSITIONAL |

**FACT:** yardage lives in Production Assistant (`estimateFabricRequirement`), default **yards**, distinct from body-length **cm**.

**FACT:** Design Studio mapping dress/gown/blouse→bodice, senator→shirt, agbada→kaftan is duplicated in T3 `mapGarmentTypeToPatternKind`, DesignStudio local `getPatternKindForGarment`, and unused `garmentLogic.getPatternKindForGarment`.
