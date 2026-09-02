# SER-F5 Floor

The Floor is the operational start of the atelier, not a KPI dashboard.

Regions (spatial, not a card grid):

| Region | Source | Empty truth |
|---|---|---|
| Orientation | Workspace name + place kicker | Always present |
| Active thread | `selectedOrderId` → client/order | “No client selected” + Open client room |
| Work in motion | AppContext orders `in_progress` / `ready` | “No garments in progress” |
| Attention | unresolved `dueAlerts` | “Quiet floor” |
| Begin | Navigation only | Open client room / Measurement table |

Does not use `recentCustomers[0]`, `totalRevenue`, or remote-sync language.
