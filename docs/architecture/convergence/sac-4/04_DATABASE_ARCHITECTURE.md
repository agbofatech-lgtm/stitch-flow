# Database architecture

```
PLATFORM AUTHORITY     file/memory platform store (P19)
SHOP AUTHORITY         PostgreSQL shop_* when SHOP_DATABASE_MODE=postgres
LOCAL/OFFLINE MIRROR   T2 IndexedDB (unchanged; no remote push)
LEGACY TRANSITIONAL    AppContext + localStorage (unchanged)
```

Configuration:

| Variable | Meaning |
|---|---|
| `SHOP_DATABASE_MODE` | `memory` (default) or `postgres` |
| `SHOP_DATABASE_URL` | Preferred shop connection string |
| `DATABASE_URL` | Fallback connection string if `SHOP_DATABASE_URL` unset |
| `PLATFORM_DATA_PATH` | Platform file store (unchanged) |

`SHOP_DATABASE_MODE=postgres` without a URL throws at boot. That is fail-closed, not a memory fallback.

`/ready.database` reports `{ mode, postgres, migrations }` from the shop runtime that actually started. `postgres: verified` is only set after `SELECT 1` and a successful migration apply.
