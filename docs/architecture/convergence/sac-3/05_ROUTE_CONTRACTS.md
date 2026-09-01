# Route Contracts

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/shop/customers` | list/create |
| GET | `/shop/customers/:id` | scoped get |
| GET/POST | `/shop/orders` | list/create |
| GET | `/shop/orders/:id` | scoped get |
| PUT | `/shop/orders/:id/measurement-snapshot` | live snapshot, not MeasurementVersion |
| POST | `/shop/orders/:id/production-stages/:code/transition` | guarded actions |
| POST/GET | `/shop/trusted-artifacts` | append / get |
| PUT/PATCH | `/shop/trusted-artifacts/:id` | **405 immutable** |

Deferred: invoices, materials, reports, dashboard, payments.
