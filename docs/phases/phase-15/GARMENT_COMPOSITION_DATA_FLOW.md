# Garment Composition Data Flow

**FACT today:**

```
Studio / Order (LIVE, TRANSITIONAL)
    │
    ├─► P14 adapter/evaluate/freeze ─► GarmentSpecificationVersion (intent)
    │
    ├─► T3 map ─► PatternKind ─► Pattern Engine ─► PatternOutput (derived)
    │
    └─► Production Assistant ─► ProductionPlan.cuttingList (heuristic)
```

There is **no** arrow into a composition graph.

**PROPOSAL (locked):** insert composition **after** frozen specification and **before** Phase 16 execution. Do not feed composition into engines in Phase 15 (Phase 16 LOCKED).
