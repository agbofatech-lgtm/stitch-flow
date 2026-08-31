# T5 Studio Shell Architecture

```
StudioShell
├── WorkspaceNavigation (collapsible rail + mobile tab bar)
├── StudioHeader (context, command, inspector, settings)
├── WorkspaceFrame
│   ├── MainCanvas (existing screens or MeasurementWorkspace)
│   └── InspectorPanel (xl sidebar / mobile Sheet)
└── StudioStatusBar (identity + T2 connectivity)
```

Workspaces: Command Center, Client Studio, Measurements, Design, Production, Business.

Routing: existing `setView` / `currentView`. No new router.

T4 tokens and primitives only. Domain math stays in `apps/web/src/domain`. Measurement snapshots use T2 repositories.
