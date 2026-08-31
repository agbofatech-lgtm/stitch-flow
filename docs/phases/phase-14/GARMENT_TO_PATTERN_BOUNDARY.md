# Garment-to-Pattern Boundary

```
GarmentSpecification (intent)
        │  MUST NOT silently compile unsupported semantics
        ▼
PatternRequirementIntent   — NOT IMPLEMENTED
        │
        ▼
Future Pattern Input Compilation  — PHASE 15+ LOCKED
        │
        ▼
T10 governed pattern input + MeasurementVersion
        │
        ▼
Protected Pattern Engine
```

**FACT today:** Studio and T6 call engines with `patternKind` + measurement map. Inspiration sleeve/collar/fit are **not** pattern-engine arguments.

**SEMANTIC ONLY (must not become geometry in Phase 14):**

- DesignCategory extras (suit, bridal, …)
- collarStyle / sleeveStyle / pocketStyle
- FitType
- canvas silhouette coordinates
- scale labelled px/cm
- PatternType sleeve/collar

**MAY later bind (PROPOSAL):** garmentType → existing `mapGarmentTypeToPatternKind` only.

**MUST NOT:** invent ease, compile visual hemHalf offsets into centimetres, or treat dress as bodice+skirt dual engine run.

T10 C1–C7 remain. Phase 15 concerns stay out (STOP-P14-J).
