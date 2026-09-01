# Persistence forensic map

Targeted inspection only. SAC-0–3 reports are predecessor evidence.

| Domain | Runtime before SAC-4 | Intended authority | SAC-4 scope |
|---|---|---|---|
| Platform identity | file/memory (`PLATFORM_DATA_PATH`) | platform | **NO** — remains file/memory |
| Tenant | file/memory | platform | **NO** |
| Membership | file/memory | platform | **NO** |
| Commercial records | file/memory; `006_platform_commercial.sql` unapplied | platform | investigate only — **deferred** |
| Shop customers | process memory | PostgreSQL | **YES** |
| Shop orders | process memory | PostgreSQL | **YES** |
| Measurement snapshots | process memory (order JSON) | PostgreSQL | **YES** |
| Production stages | process memory (order JSON) | PostgreSQL | **YES** |
| Trusted artifacts | process memory | PostgreSQL | **YES** |
| AppContext | `localStorage` | transitional UI SoT | **NO migration** |
| T2 | IndexedDB | offline mirror | **NO remote activation** |

Evidence:

- SAC-3 shop store: in-process `Map`s (`createShopStore`).
- Platform persist: `apps/backend/src/platform/persist.ts` + `PLATFORM_DATA_PATH`.
- `apps/backend/src/config/env.ts` still requires `DATABASE_URL` if imported. Shop postgres uses a lazy `pg.Pool` from `SHOP_DATABASE_URL \|\| DATABASE_URL` and does **not** import `config/env.ts` or `config/db.ts` at boot.
- `initDb()` is not on the live `createApp()` path.
- Live local Postgres used for verification: Docker `stitchflow-postgres` (`postgres:15`) on host port **5434**. Ports 5432/5433 belong to other products and were not used.
- Database was empty (`\dt` no relations) before SAC-4 apply — STOP-B not triggered. No production PostgreSQL deployment identified.
