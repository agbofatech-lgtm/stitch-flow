# SER-F9 Ledger authority

SER-F9 reconstructs presentation. It does not create a commercial engine or a PSP.

## Map

| Concept | Authority | F9 |
|---|---|---|
| Client | AppContext `customers` + workflow | consume |
| Order | AppContext `orders` + `workflow.orderId` / `selectedOrderId` | consume; no first-order fallback |
| Garment | `order.garmentType` / `orderType` | consume if present |
| Order total | `order.totalAmount` + `order.currency` | display as stored; currency not assumed |
| Invoice | AppContext `invoices` filtered by `orderId` | display if present |
| Invoice items | `invoice.items` | display if present |
| Invoice total / paid / balance | stored `totalAmount`, `paidAmount`, `balanceDue` | display stored fields only |
| Payment | AppContext `payments` | display if present |
| Receipt | no separate receipt authority in UI SoT | not invented |
| PSP | none | not implemented |
| Create invoice | no `addInvoice` on AppContext | not offered |
| Record payment | `addPayment` exists | **not exposed** — would look like a payment terminal |
| Production complete | order/stage records | not inferred as paid |

## Removed

- Unmounted HTTP: `fetchInvoices`, `createInvoice`, `createPayment`, `getCustomers`, `fetchOrders`, production-stage transitions on the Orders station
- KPI wall on the Orders station (`totalRevenue`, outstanding totals as dashboard)
- “New Invoice” against unmounted CRUD
