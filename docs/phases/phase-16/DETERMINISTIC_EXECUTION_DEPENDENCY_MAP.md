# Deterministic Execution Dependency Map

**FACT**

```
LIVE UI / AppContext / Studio sliders     TRANSITIONAL
        │
        │ explicit freeze (must not be skipped)
        ▼
MeasurementVersion (P13) ──engineInputFromVersion──► cm map
        │
GarmentSpecificationVersion (P14) ── garmentType / style strings
        │
GarmentCompositionVersion (P15) ── patternProjection (OBSERVED, not identity)
        │
        ▼  (not built)
Trusted execution request
        │
        ├─► executeDeterministicPattern ──► generateStylePattern   GOVERNED wrap
        └─► executeDeterministicProductionPlan ──► generateProductionPlan  GOVERNED wrap
```

Direct engine callers still exist (**FACT**, T9): `jobSheetExport.ts` imports patternEngine. Those paths are **LEGACY / TRANSITIONAL**, not the P16 trusted path.
