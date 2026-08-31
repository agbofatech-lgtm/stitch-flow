# T6 Workflow Architecture

```
StudioShell (T5)
├── Workspaces (unchanged ids)
├── Inspector
│   ├── WorkflowPanel  ← T6 orchestration UI
│   └── WorkspaceInspector (T5 context)
└── MeasurementWorkspace freeze → applyMeasurementProfileToOrder
```

```
AppContext customers/profiles/orders  (TRANSITIONAL)
        │
        ▼
GarmentSpecification (domain/garment)
        │
        ├── requestPattern (T3)
        ├── requestProductionPlan (T3)
        └── T2 garment repository snapshot
```

Session workflow selection is in-memory (`WorkflowProvider`). It is not a persistence authority.

Protected engines remain EXTRACT-only. Design Studio remains hosted.
