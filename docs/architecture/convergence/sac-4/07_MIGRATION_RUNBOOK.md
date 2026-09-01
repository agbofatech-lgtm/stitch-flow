# Migration runbook

Canonical dir: `apps/backend/migrations/`

## Fresh database

```
createdb stitchflow
set SHOP_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5434/stitchflow
node apps/backend/scripts/run-migrations.js
```

Applies `001_init_extensions.sql` then `007_shop_authority.sql`. Inserts checksum rows into `schema_migrations`.

## Re-run

Safe. Matching checksums skip SQL. Mismatch throws (`Migration checksum mismatch`).

Does **not** apply 002–006.

## Runtime apply

When `SHOP_DATABASE_MODE=postgres`, `createConfiguredShopService()` connects, applies the same ledger, then constructs the postgres repository. Boot throws if the URL is missing or migrate fails. No silent memory fallback.

## Existing production database

None identified. Upgrade path from a populated unknown schema is **untested**. Do not point this runner at an unknown database.

## Local verification instance

Docker `stitchflow-postgres` (`postgres:15`) published at `127.0.0.1:5434`. Do not use 5432/5433 (other products).
