# Persistence decision

## A. Platform persistence

**Option A.** Platform remains file/memory (`PLATFORM_DATA_PATH`).

Phase 19 is conditionally certified on that store. `006_platform_commercial.sql` is historical unapplied SQL, not a live schema. Auto-migrating platform into PostgreSQL in SAC-4 would create a second identity authority without a cutover programme.

PLATFORM: Postgres authority = **NO**.

## B. Shop persistence

SAC-3 memory stores are replaced behind `ShopRepository`.

```
Route → ShopService → ShopRepository
  ├── memory adapter (default / tests)
  └── postgres adapter (SHOP_DATABASE_MODE=postgres)
```

SQL is not in Express handlers. Default remains memory. `SHOP_DATABASE_MODE=postgres` requires `DATABASE_URL` or `SHOP_DATABASE_URL` and **does not silent-fallback** to memory.

## C. Schema separation

Single database, `shop_*` tables in `public`. Platform identity tables are not created. Commercial `006` is not applied. No 3D tables.

Logical namespaces by table prefix, not a second database.

## D. ID strategy

- Server `randomUUID()` for shop records.
- Body `id` / `tenantId` / `workspaceId` ignored.
- Fingerprint is a column, never the primary key.
- SAC-2 local IDs are not imported.

## E. Versioned tailoring artifacts

Append-only row: `id`, `tenant_id`, `workspace_id`, `order_id`, `frozen=TRUE` CHECK, `fingerprint`, `payload` JSONB (type / classification / provenance / contract live in payload as SAC-3), `created_at`.

PUT / PATCH / DELETE → 405. No UPDATE API.
