# T9 Data-Flow / Authority Assessment

**Date:** 2026-08-31

```
UI (Studio / ProductionBoard / WorkflowPanel)
        │
Application (T7 adapters, T9 tailoring contracts, AppContext TRANSITIONAL, jobSheet, alerts)
        │
Domain (T3 gateways, T8 measurement version, T6 specification)
        │
T2 repository (IndexedDB / MemoryStore + queue)
        │
Platform API (T1; business CRUD unmounted by default)
```

| Data | Authority today | Target |
|---|---|---|
| Live studio measurements | AppContext + drafts LEGACY | Eventually T8 version freeze — **not T9 forensic work** |
| Frozen measurement | T8 T2 `MeasurementVersion` **and** Order.measurementSnapshot TRANSITIONAL | Dual until migration ADR |
| Pattern geometry | Regenerated; not stored | Keep derived |
| Production plan | Order.productionPlan local | Derived; regenerate |
| Fabric estimate | Assistant heuristic | Protected; wrap |
| Fabric stock | AppContext | T2 inventory unused by UI |
| Stage state | local `productionStages` vs unmounted backend | Do not invent third machine |

**FACT:** T2 is not the running UI SoT. Claiming offline-first as complete would be false.

**FACT:** Dual Studio save paths remain distinct (T7 owner condition).
