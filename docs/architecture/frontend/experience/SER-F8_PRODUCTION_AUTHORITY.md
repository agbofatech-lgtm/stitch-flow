# SER-F8 production authority

SER-F8 reconstructs presentation. It does not create a second production engine.

## Map

| Concern | Authority | SER-F8 |
|---|---|---|
| Client | AppContext `customers` + workflow | consume |
| Order | AppContext `orders` + `workflow.orderId` / `selectedOrderId` | consume; no `orders[0]` fallback |
| Garment | `order.garmentType` / `orderType` | consume if present |
| Measurements | order snapshot / F6 table | not duplicated |
| Pattern | Pattern Engine | not called |
| Yardage / cutting / sewing | `order.productionPlan` (T3 wrapper already on the order) | display if present |
| Stages | `order.productionStages` + canonical `PRODUCTION_STAGE_SEQUENCE` | display recorded statuses only |
| Stage transitions | unmounted HTTP `/orders/.../production-stages/.../transition`; shop path is `/shop` (F14) | **not executed** |
| Production completion | only if a stage/order status already records it | not invented |
| Trusted finalize | Design Studio SAC-1 | not duplicated |
| Alerts | existing `getOrderAlerts` | display |
| Job sheet | existing `exportOrderJobSheetPdf` | keep |
| Navigation | Atelier shell | Design table / Ledger / Client room |

## What was removed

- `fetchOrders` / `getCustomers` / `API_BASE` production-stage POSTs
- `buildStagesFromStatus` (invented progress from order status)
- `filteredOrders[0]` as a fake selected garment
- KPI tiles (progress %, amount, alert counts as dashboard)
- “Persisted in backend” / “Phase B Notice” / “Workflow Complete”

## Honest gaps

Stage start/complete/skip/reopen remain unavailable on this floor because the only transition implementations are unmounted unauthenticated CRUD or authenticated `/shop`. F8 does not remount them and does not migrate to `/shop`.
