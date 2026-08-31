# Computation Path Inventory

| Path | Boundary | Class |
|---|---|---|
| `executeDeterministicPattern` | T10 → patternEngine | **GOVERNED** |
| `executeDeterministicProductionPlan` | T10 → productionAssistant | **GOVERNED** (heuristic classification) |
| `governedPatternFromLoose` / `runPatternContract` | T9/T10 application | **GOVERNED** (loose maps; version optional) |
| `requestPattern` / `requestProductionPlan` | T3 gateway | **GOVERNED wrap / TRANSITIONAL input** |
| DesignStudio T7 adapters | application/design | **TRANSITIONAL** Studio path |
| `jobSheetExport.ts` → patternEngine | service | **LEGACY DIRECT** |
| AppContext live measurements | UI | **TRANSITIONAL** — not trusted input |
| P16 trusted pipeline | — | **ABSENT** |
