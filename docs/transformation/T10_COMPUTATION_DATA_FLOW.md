# T10 Computation Data Flow

**Date:** 2026-08-31  
**Status:** Forensic map. Not an implementation.

## Pattern intelligence

```
LIVE STUDIO MEASUREMENTS (AppContext / DesignStudio state, assumed cm)
  and/or ORDER.measurementSnapshot / garmentMeasurements (TRANSITIONAL)
  and/or T8 MeasurementVersion (cm freeze — not Studio-wired)
        │
        ▼
Normalization (aliases bust↔chest; Studio defaults hip=100, sleeve=24, …)
        │
        ▼
Garment-type → pattern kind (DUPLICATE maps: Studio / T3 / jobSheet / unused garmentLogic)
        │
        ▼
T7 patternAdapter  ──or──  T3 requestPattern (separates blob first)
        │
        ▼
Protected patternEngine.generateStylePattern
        │
        ▼
StylePatternResult (cm geometry)
        │
        ├─ DesignStudio pieces preview (canvas fitScale; UI zoom labelled px/cm)
        ├─ jobSheet SVG (640×460 fit scale)
        └─ T6 summarizePattern (pointCount only)
```

T9 `runPatternContract` can convert inches via T8 then call T7. **FACT:** production callers use identity `generateStylePattern`, not `runPatternContract`.

## Production intelligence

```
Measurement context (same live/snapshot numbers, assumed cm)
+ Garment type (selected or inferred from inspiration keywords)
+ Inspiration text/category
+ Optional FabricRecord.unit
        │
        ▼
T7 productionAdapter  ──or──  T3 requestProductionPlan (flatten separated blob)
        │
        ▼
Protected productionAssistant.generateProductionPlan
        │  estimateFabricRequirement (yards)
        │  buildCuttingList
        │  buildSewingChecklist
        │  buildFitRiskWarnings
        │  generatedAt = new Date()
        ▼
ProductionPlan on Order (AppContext TRANSITIONAL SoT)
        │
        ├─ DesignStudio Production Assistant UI
        ├─ jobSheet fabric/cutting/sewing/fit sections (stored plan, not recomputed)
        └─ fabric stock deduct (AppContext on cutting — TRANSITIONAL; not re-audited as T10 core)
```

T9 `runProductionContract` wraps provenance. **FACT:** UI callers do not use it.

## Measurement intelligence

```
Capture (UI sliders labelled cm; T8 may declare in)
        │
        ▼
T8 toCentimetres (CM_PER_INCH=2.54) IF freeze/runPatternContract
        │
        ▼
T3 separate body vs garment; pattern projection DERIVED
        │
        ▼
Engine input centimetres
```

**FACT:** Design Studio does not call T8 freeze or T8 conversion on slider input.

## Dual paths (unchanged)

- Studio save-to-order vs save-as-garment / pattern library remain distinct (T7 condition).
- Order.measurementSnapshot vs T8 MeasurementVersion remain dual (T8/T9 condition).
- T3 gateway vs T7 adapter vs T9 identity re-export are three call styles onto the same engines.
