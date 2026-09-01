# Migration inventory

Canonical directory: `apps/backend/migrations/`  
Ledger: `schema_migrations`  
Runner: `apps/backend/scripts/run-migrations.js` and `src/shop/migrate.ts`

| File | Class | Action |
|---|---|---|
| `001_init_extensions.sql` | ACTIVE | Applied (`pgcrypto`) |
| `002_create_core_tables.sql` | EMPTY HISTORICAL | Retained, not applied |
| `003_create_sync_tables.sql` | EMPTY HISTORICAL | Retained, not applied |
| `004_create_indexes.sql` | EMPTY HISTORICAL | Retained, not applied |
| `005_seed_admin.sql` | EMPTY HISTORICAL | Retained, not applied |
| `006_platform_commercial.sql` | HISTORICAL UNAPPLIED | Retained; platform deferred |
| `007_shop_authority.sql` | ACTIVE | Applied (shop tables + ledger) |
| `migrations/migrations/` | DUPLICATE HISTORICAL | Not a runner path |
| `initDb()` | OBSOLETE for shop authority | Unused by `createApp()` |

`MANIFEST.json` is the human ledger. Active files are only `001` and `007`. Re-run compares SHA-256 checksums; mismatch throws. SQL is not re-executed when the checksum matches.
