# T8 Tailoring Data Flow

**Date:** 2026-08-31

```
UI (Design Studio / WorkflowPanel / future capture forms)
        │  no new localStorage
        ▼
Application
  T7 design adapters (engine signatures)
  T6 workflow orchestrate
        ▼
Domain contract (T3 + T8)
  separateLegacyMeasurementBlob
  units → centimetres
  provenance + freeze MeasurementVersion
  projectPatternMeasurements (derived)
        ▼
Repository (T2)
  measurement  → MeasurementSet | MeasurementVersion
  garment      → GarmentSpecification snapshot
        ▼
IndexedDB / MemoryStore + sync queue
        ▼
Platform Authority (T1 unmounted — queue only)
```

Parallel TRANSITIONAL flow (must not be deleted this stage):

```
AppContext saveAppStorage
  measurementProfiles
  order.garmentMeasurements
  order.measurementSnapshot
  studioSession measurements
stitchflow:design-studio:drafts
```

Protected engines are invoked only through T3/T7 wrappers. Geometry is regenerated; versions record **inputs**, not engine point clouds.
