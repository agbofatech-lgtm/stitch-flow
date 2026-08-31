# Measurement Dependency Map

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **UNKNOWN**

## Governed path (Phase 13 + T10) — FACT

```
CUSTOMER (identity)
    │
    ▼
MeasurementProfile (live, TRANSITIONAL AppContext)
    │  separateLegacyMeasurementBlob (T3 body ≠ garment)
    ▼
freezeMeasurementVersion (T8) ──create-only──► T2 MeasurementVersion
    │  completeness: PATTERN_INPUT_FIELDS (no engine defaults)
    │  engineInputFromVersion (cm)
    ▼
T10 governedPatternFromLoose / executeDeterministicPattern
    │
    ▼
PROTECTED Pattern Engine  → PatternOutput (derived geometry, not SoT)
    │
    ▼
T9/T10 production contract → PROTECTED Production Assistant (heuristic)
```

## Parallel TRANSITIONAL / LEGACY paths — FACT (held, not deleted)

```
Profile ──applyMeasurementProfileToOrder──► Order.measurementSnapshot
Studio session / drafts ──T7 identity re-exports──► generateStylePattern / generateProductionPlan
Canvas silhouettes (buildUpperGarmentShape, …) ──EXPERIENCE──► pixels, not manufacturing geometry
```

T10 C1: Studio is not the exclusive governed path.

## Completeness vs engine fill — FACT

If Phase 13 skips completeness, the engine `validateAndRead` fills missing keys from internal defaults (hip 98, chest 96, …). That is engine-owned. Phase 13 must not claim a set complete after those fills.

## Garment type → pattern kind — FACT

| GarmentType (UI) | PatternKind (engine) |
|---|---|
| shirt, senator | shirt |
| trouser | trouser |
| skirt | skirt |
| kaftan, agbada | kaftan |
| dress, gown, blouse, custom, bodice, default | bodice |

UI dress fields include hip + skirtLength; engine bodice path does **not** consume them. Do not invent a dress engine.

## INFERENCE

Without freeze-before-cut, later live edits can diverge from numbers used in a pattern run.

## PROPOSAL

Phase 13 consumes T10; it does not overwrite PatternOutput or create a second computation authority.

## UNKNOWN

Whether historical orders can be reconstructed onto MeasurementVersion (inch snapshots without declared unit).
