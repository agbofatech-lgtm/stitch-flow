# P19.10 Persistence

| Claim | Class |
|---|---|
| File JSON durability + restart | FACT / PASS (transitional) |
| Atomic write | FACT |
| Corrupt snapshot fail-closed | FACT |
| Postgres wired at runtime | **NOT VERIFIED** |
| 006 applied | **NO** |
| Production database certified | **NO** |

`PLATFORM_DATA_PATH` unset → memory. Set → file.

Entitlements remain **derived** from subscription+plan.

Audit is append-only in the snapshot; not a WORM store. Immutable audit **NOT CLAIMED**.
