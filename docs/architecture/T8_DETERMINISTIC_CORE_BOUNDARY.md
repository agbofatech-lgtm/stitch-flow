# T8 Deterministic Core Boundary

**Date:** 2026-08-31

```
CAPTURED (body / garment lengths)
        ↓  explicit unit conversion to cm
SEPARATED (T3 field classes)
        ↓  projectPatternMeasurements
PATTERN INPUT MAP (derived)
        ↓  T3 requestPattern / T7 generateStudioPattern
PATTERN ENGINE (PROTECTED formulas)
        ↓
PATTERN OUTPUT (derived geometry — not SoT)
        ↓  T3 requestProductionPlan / T7 generateStudioProductionPlan
PRODUCTION ASSISTANT (PROTECTED heuristics)
```

Inside the protected engines (FACT, do not copy into UI):

- Pattern ease constants and `MEASUREMENT_RANGES` defaults
- Shirt/trouser/skirt/kaftan construction formulas
- Production fabric estimate coefficients and keyword analysis

T8 may **observe, wrap, test, and contract** these. T8 must not rewrite them.

UI canvas silhouettes are **outside** this core (experience-not-domain).

Magic numbers that appear in new T8 code must be named (e.g. `CM_PER_INCH = 2.54`). Engine internals stay in the engine.
