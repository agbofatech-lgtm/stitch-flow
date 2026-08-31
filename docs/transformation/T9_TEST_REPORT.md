# T9 Test Report

**Date:** 2026-08-31

| Command | Result |
|---|---|
| `test:tailoring` | 8 pass / 0 fail |
| `test:domain` | 23 pass / 0 fail |
| `test:design` | 7 pass / 0 fail |
| `test:studio` | 4 pass / 0 fail |
| `test:workflow` | 8 pass / 0 fail |
| `test:experience` | 8 pass / 0 fail |
| `test:persistence` | 10 pass / 0 fail |
| `vite build` | PASS |
| `tsc --noEmit` | FAIL pre-existing (`materials.ts`, `reports.ts`, `src/types.ts`) — not a T9 regression |

## Coverage of this slice

- Pattern / production contracts equal protected engines (generatedAt stripped for plans)
- Inch → centimetre via T8 constant before pattern engine
- Fabric yards conversion is not body-length conversion
- Measurement version id on provenance without changing engine output
- jobSheet / AppContext / Orders no longer import engines directly
- `garmentLogic` unused by T9 contracts, AppContext, Design Studio
