# T2 Data Authority Contract

| Entity | Authority (target) | Local role | Remote role | Sync mode | Conflict policy | Lifecycle |
|---|---|---|---|---|---|---|
| Customer | Platform DB | local-first cache via repository | T1 CRUD unmounted | queue only | detect-only | create→pending→failed until auth |
| Measurement | Platform + local-first | local-first | none authorized | queue only | **domain-deferred** | T3 defines merge |
| Garment / Design drafts | Platform + local-first drafts | local-first | none | queue only | detect-only / deferred | draft→pending |
| Order | Platform DB | controlled offline ops | unmounted | queue only | **domain-deferred** | T3 |
| Production | Platform DB | eventual | unmounted | queue only | **domain-deferred** | T3 |
| Material / Inventory | Platform DB | cache | unmounted | queue only | detect-only | |
| Invoice / Payment | Platform / ops | local cache allowed | unmounted; **no billing** | queue only | detect-only | commercial Phase 19 locked |
| User / Workspace | Platform | ephemeral/mock today | absent | n/a | server-authoritative | identity not redesigned |
| Reports | derived | ephemeral | unmounted | none | n/a | |

CURRENT FACT ≠ this table as running SoT. AppContext localStorage remains **TRANSITIONAL**.

UI must not grow new `localStorage.setItem` for domain records. New code uses repositories.
