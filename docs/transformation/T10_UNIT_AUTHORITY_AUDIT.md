# T10 Unit Authority Audit

**Date:** 2026-08-31  
**Rule:** T10 must not reimplement T8. BODY cm ≠ FABRIC yards.

| Family | Canonical | Conversion | Where |
|---|---|---|---|
| Body / garment length | centimetres | T8 `CM_PER_INCH = 2.54` | `domain/measurement/units.ts`; T9 re-export |
| Pattern engine | centimetres | none inside engine | ranges labelled `cm`; `seamAllowanceCm: 1.5` |
| Fabric quantity | default yards | T9 `METRES_PER_YARD = 0.9144` (unused by engines) | assistant `DEFAULT_FABRIC_UNIT = 'yards'`; if selected fabric unit is `pieces`, falls back to yards |
| Canvas | pixels | UI zoom `scale` labelled `px/cm` | DesignStudio; mapping **UNKNOWN** |
| PDF / job-sheet preview | pixels | fit-to-box | **UNKNOWN** visual |

## FACT

- Pattern Engine never converts inches. T8 conversion happens **in front of** the engine, and only if freeze/`runPatternContract` is used.
- Design Studio measurement fields are labelled `unit: 'cm'`. Sliders feed numbers straight into `generateStylePattern`.
- `estimateFabricRequirement` divides body centimetres by constants to produce a **yardage** number. That is a heuristic formula, not a unit-family conversion. T9 forbids treating the two families as equivalent.
- Production contract refuses `measurementInputUnit !== 'cm'`. UI never passes that field.

## GARMENT MEASUREMENTS

Studio and T3 treat garment fields (skirtLength, trouserLength, …) as the same centimetre family as body fields. **FACT** of current code. Semantic split is T3 class (`body` vs `garment`), not a different unit.

## Implicit default drift (FACT)

| Source | hip default | bust/chest default |
|---|---|---|
| Pattern engine ranges | 98 | bust 90 / chest 96 |
| Job sheet `getPatternMeasurements` | 100 | 90 |
| DesignStudio `buildInitialMeasurements` | 100 | from body |
| Assistant fabric estimate fallback | 102 | 96 |
| Canvas `buildGarmentRenderShape` | 102 | 96 |

Same missing key can yield different numbers depending on path. Not a conversion bug; a **default-table duplication**.

## INFERENCE

Live UI numbers are intended as centimetres because labels and engine ranges say so.

## UNKNOWN

Whether any stored Order snapshot was ever captured in inches without T8 conversion. No repository evidence of an inch capture UI.
