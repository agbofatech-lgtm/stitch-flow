# T9 Caller Migration Report

**Date:** 2026-08-31

## Production (runtime) callers after T9

| File | Engine | Route |
|---|---|---|
| `application/design/patternAdapter.ts` | patternEngine | T7 adapter (kept) |
| `application/design/productionAdapter.ts` | productionAssistant | T7 adapter (kept) |
| `domain/pattern/gateway.ts` | patternEngine | T3 gateway (kept) |
| `domain/production/gateway.ts` | productionAssistant | T3 gateway (kept) |
| `modules/services/jobSheetExport.ts` | patternEngine | **now** `application/tailoring` |
| `context/AppContext.tsx` | productionAssistant | **now** `application/tailoring` |
| `components/Orders.tsx` | productionAssistant | **now** `application/tailoring` |

## Allowed remaining imports

- T3 / T7 adapters
- Equality tests (`domain.test.ts`, `design.test.ts`, `measurement.t8.test.ts`, `tailoring.test.ts`)
- Type-only: `workflow/orchestrate.ts` → `StylePatternResult`

## Not migrated (backup / LEGACY)

- `*.bak*` copies of jobSheetExport / DesignStudio
- `shared/utils/garmentLogic.ts` — unused; LEGACY; not deleted

## PDF / canvas

Job-sheet import path changed. Layout, canvas, and PDF millimetre mapping were **not** redesigned. Visual PDF equivalence: **UNKNOWN**.
