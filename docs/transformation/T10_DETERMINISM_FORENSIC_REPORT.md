# T10 Determinism Forensic Report

**Date:** 2026-08-31  
**Classification:** FACT unless marked INFERENCE / UNKNOWN.

## Pattern Engine (`patternEngine.ts`)

| Property | Evidence |
|---|---|
| Pure geometry | No `Date`, `Math.random`, I/O, localStorage |
| Rounding | `round1` = `Math.round(value * 10) / 10` |
| Missing inputs | `MEASUREMENT_RANGES[key].default` or fallback formulas |
| Out of range | throws `PatternValidationError` |
| Input mutation | `asMeasurementMap` spreads into a new object — does not mutate caller object (**FACT**) |
| Display helpers | `scalePatternPoints` default scale 8, offset `{x:50,y:30}` — **no production importers** |

**Classification:** VERIFIED DETERMINISTIC for complete in-range numeric inputs. LIKELY DETERMINISTIC when defaults fill missing keys (defaults are constants).

## Production Assistant (`productionAssistant.ts`)

| Property | Evidence |
|---|---|
| Fabric / cutting / sewing / fit | closed formulas + keyword tables |
| Rounding | `round1` on quantities and confidence |
| Missing measurements | numeric defaults e.g. bust 96, hip 102, backLength 40 |
| Timestamp | `generatedAt: new Date()` — **NON-DETERMINISTIC** |
| Text inference | first keyword match in `GARMENT_KEYWORDS` order |
| Dedup | `Set` insertion order of first occurrence |

**Classification:** LIKELY DETERMINISTIC for plan body given identical inputs if `generatedAt` is ignored. NON-DETERMINISTIC for the full `ProductionPlan` object.

“Use AI Suggestion” in Design Studio calls `inferGarmentTypeFromInspiration` — **FACT:** keyword/category heuristic, not an LLM.

## T8 freeze / T9 envelope

- Freeze IDs: `crypto.randomUUID()` else `Date.now()` + `Math.random()` — identity NON-DETERMINISTIC; payload conversion DETERMINISTIC.
- T9 provenance does not fingerprint outputs. `generatedAt` copied from plan when wrapping.
- Callers do not use envelopes — **FACT**.

## Canvas / PDF

- Front/back silhouette is **local geometry**, not engine output.
- Pieces preview scales engine points to canvas 620×500 with UI `scale` (default 8) labelled `px/cm`.
- Whether 1 engine centimetre equals 1 pre-scale unit is **UNKNOWN**.
- Job-sheet SVG uses a different fit scale (640×460). Visual PDF equivalence remains **UNKNOWN**.
- Job-sheet `Intl.DateTimeFormat('en-GB')` is display formatting, not engine math.

## Tests already proving equality (not T10 fixtures)

T3/T7/T8/T9 suites compare adapter/gateway/contract output to protected engines (plans strip `generatedAt`). That is **adapter identity**, not a certified reproducibility harness.
