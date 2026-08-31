# T9 Protected-Asset Impact Assessment

**Date:** 2026-08-31

| Asset | T9 forensic contact | Allowed later (if owner authorizes implementation) | Forbidden |
|---|---|---|---|
| Pattern Engine | jobSheet still imports it; T3/T7 wrap it | Re-point remaining callers through existing wrappers | Formula / range / ease change |
| Production Assistant | AppContext + Studio + T3 | Wrap `estimateFabricRequirement` without edit | Heuristic coefficient change; calling it “AI model” |
| Design Studio | Hosted; T7 import extraction only | Import/persistence extraction only | Canvas/UI/formula redesign |
| productionStageService | Stage code source | Copy codes as T3 already did | Invent UI stage codes; rewrite transitions |
| shared/types | Measurement blobs | Additive mapping only | Mass rename |
| jobSheetExport | Adjacent ADAPT | Adapter import; PDF fixtures first | Silent layout rewrite |
| garmentLogic | Unused duplicate | Map then retire only with ADR | Silent delete in T9 forensics |
| AppContext persist | TRANSITIONAL | No new keys | New localStorage |

T0 SHA-256 for engines/types/stage service **must remain**. DesignStudio hash already changed in T7 (`5059c0db…`).
