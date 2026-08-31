# P19 Persistence Authority Map

| Store | Holds | Class | Duplicate risk |
|---|---|---|---|
| AppContext / localStorage | Live customers, orders, invoices, workspace | TRANSITIONAL SoT (T10 C1) | YES vs T2 |
| T2 IndexedDB entities | customer, measurement, garment, design, order, production, material, inventory, invoice, payment, user, workspace | INFRASTRUCTURE buckets | YES if treated as SaaS IAM |
| Frozen versions | Measurement/Spec/Composition/Execution | **AUTHORITATIVE tailoring** | must not copy into billing |
| PostgreSQL | paymentRoutes SQL; **core migration file empty** | UNKNOWN / STUB | YES if mounted unfiltered |
| mockData.ts | tiers, members, customers | DEAD/SEED for UI | YES |

**Duplicate persistence risks:** Workspace vs Tenant; shop Payment vs SaaS Payment; three plan vocabularies; live AppContext vs T2 vs SQL.
