# Digital atelier world

StitchFlow is one building with two planes.

```
STITCHFLOW
├── ATELIER  (craft world — default)
│     Floor          orientation, work needing a human
│     Client room    the person and their history
│     Measurement table   body / garment / pattern — never blended as one blob
│     Design table   hosts the protected Design Studio
│     Production floor    stages as a living sequence
│     Ledger         orders, materials, invoices, reports as stations, not a second app
└── PLATFORM (Control Center — operator plane)
```

## Why rooms, not “pages” or “modes”

F0 showed state-based **workspaces** (`command`, `clients`, `measurements`, `design`, `production`, `business`) plus overlays (Settings, Control). That grammar is close. It fails when a “workspace” is just a wrapped admin table.

**Constitutional terms (intended):**

| Term | Meaning | Current source analogue |
|---|---|---|
| Plane | Atelier vs Platform | `AtelierShell` `data-plane` |
| Room | A place of work with one primary canvas | `StudioWorkspaceId` |
| Station | A ledger surface inside the Ledger room | `BusinessSurface` |
| Task | The current object (client, order, version) | WorkflowContext — weak today |
| Tools | Actions for this task | header / command |
| Context | Inspector | InspectorPanel |
| Status | Floor truth | StatusBar |

Do **not** invent a Garments or Delivery room. Do **not** promote Settings to a sixth craft room; it remains workspace configuration.

## Hierarchy the UI must make obvious

```
StitchFlow
  → Atelier
      → Room (e.g. Measurement table)
          → Current task (this client / this order)
              → Canvas (primary work)
              → Supporting tools
              → Context (inspector)
              → Actions (primary / secondary)
              → Status (local | queued | unavailable)
```

The **client-and-order thread** is the continuity object. Rooms change; the thread should not reset.

## Shell vs room (binding)

The shell must not be the only cinematic part. A room that only has a PEX `PageHeader` has **not** entered the world.
