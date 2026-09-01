# P7 Forensic Gate

HEAD at gate: `f3c28f558c9c6dd4c10e3b3c066c1f2ec9895871`
Ancestry: P3/P4 `4ead15d…` ancestor PASS. Remote synchronized. Tree CLEAN at gate.

Protected hashes UNCHANGED vs T0.

Classification of surfaces:

| Surface | Route/host | Data | Class |
|---|---|---|---|
| Atelier Home | StudioShell command | AppContext orders/customers | CAN_RESTYLE |
| Customers | clients | HTTP customers | CAN_RECOMPOSE |
| Orders | business:orders | AppContext + APIs | CAN_RECOMPOSE |
| Production | production | HTTP orders | CAN_RECOMPOSE |
| Materials | business:materials | AppContext | CAN_RECOMPOSE |
| Invoices | business:invoices | HTTP | CAN_RECOMPOSE |
| Reports | business:reports | AppContext reporting utils | CAN_RESTYLE |
| Settings | settings overlay | settings API + simulateTier | CAN_RECOMPOSE (not billing authority) |
| Measurements | measurements | T2/T8/T13 workspace | CAN_RECOMPOSE chrome only |
| Design Studio | design | DesignStudio.tsx | PROTECTED internals; frame CAN_RESTYLE |
| Control Center | control overlay | /control/* | CAN_RECOMPOSE presentation |
| Dashboard.tsx | unused | n/a | UNKNOWN / dead — do not rebuild |
| Splash | App.tsx | none | CAN_RESTYLE |
| Auth | Control Center operator form only | platformLogin | CAN_RESTYLE |

SAFE: chrome, copy, grouping, focus trap, tokens.
UNSAFE: engines, types, P19 commercial calculation, inventing billing destinations.
