# P13 Measurement Authority Verification

Legend: **FACT** / **INFERENCE** / **UNKNOWN**

## Intended chain — verified

```
LIVE MEASUREMENT PROFILE (AppContext, mutable, TRANSITIONAL)
        │  structural validation (finite, known field)
        ▼
COMPLETENESS EVALUATION (PATTERN_INPUT_FIELDS; no engine defaults)
        │  freezeMeasurementVersion / freezeLiveBlobToVersion
        ▼
IMMUTABLE MEASUREMENT VERSION (T2 create-only, refuseFrozenMutation)
        │  engineInputFromVersion + completeness STOP if missing
        ▼
T10 GOVERNED DETERMINISTIC INPUT (governedPatternFromLoose)
        ▼
DERIVED PATTERN OUTPUT (not capture; assertNotDerivedCapture)
```

| Check | Result | Evidence |
|---|---|---|
| A Live profile editable | **PASS** | AppContext `measurementProfiles`; taxonomy `live-profile` |
| B Frozen version immutable | **PASS** | `refuseFrozenMutation`; T2 create-only; tests |
| C Pattern input derived from authoritative data | **PASS** on governed path | `engineInputFromVersion` from frozen body+garment |
| D Pattern output not captured | **PASS** | `derived.ts`; freeze STOPs `quarterBust` |
| E No second SoT introduced by P13 | **PASS** | No new localStorage key; AppContext not replaced |

**FACT:** AppContext remains a **pre-existing TRANSITIONAL** UI store. T2 is authoritative for new domain writes. That dualism predates Phase 13 (T2/T8). Phase 13 did not add a third owner.

**FACT:** Workflow `freezeMeasurementsOnOrder` still writes `Order.measurementSnapshot` (TRANSITIONAL). Trusted freeze is a separate T2 MeasurementVersion action.

**INFERENCE:** Cut-time truth on the governed path is the frozen version when one exists.
