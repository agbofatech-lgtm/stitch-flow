# 07 — PostgreSQL Readiness

**Do not run migrations. Do not create a database. Do not modify SQL.**

## Domain vs schema

| Domain | Schema exists in repo? | Migration valid? | Applied? | Runtime used? | Verified? |
|---|---|---|---|---|---|
| Extensions | `001_init_extensions.sql` pgcrypto | yes | **UNKNOWN** (not applied this pass) | no | **NOT VERIFIED** |
| Core users/licenses (nested `migrations/migrations/002`) | yes | older auth schema | UNKNOWN | no (P19 file store) | NOT VERIFIED |
| Top-level `002`–`005` | **EMPTY** | invalid as schema | n/a | no | n/a |
| Sync `003` nested | `sync_changes` | present nested | UNKNOWN | no | NOT VERIFIED |
| Production stages nested `20260322_…` | yes; FK `orders(id)` | **depends on orders table that core 002 empty does not create** | UNKNOWN | only if shop routes + tables | NOT VERIFIED |
| Platform commercial `006` | `platform_*` DDL | yes; header **NOT APPLIED** | **NO** | no — file/memory | NOT VERIFIED |
| Shop `initDb()` | runtime CREATE customers/orders/invoices/payments | not a numbered migration | **never called** by live `server.ts` | no | NOT VERIFIED |
| `scripts/run-migrations.js` | **missing** | package.json `migrate` broken | — | — | FAIL as runner |

`/ready` honestly reports `postgres: not-verified`.

`DATABASE_URL` is declared for `config/db.ts` Pool. Pool is constructed on import of `db.ts`, which happens when shop routers load.

## Together or separately? (RECOMMENDATION)

**Migrate platform and business separately.**

- Platform: `006` + file-store import; tenant ≠ workspace invariants.
- Business: shop tables with `tenantId` after SAC-3 ownership decision; do not use empty 002–005; do not treat nested licenses schema as P19 identity.
- Production stages: only after `orders` exists with compatible id type.

**STOP-F:** **Not triggered as applied conflict** — nothing is applied. **HIGH gap:** duplicate/empty migration folders would conflict *if* someone ran README’s `psql 001–005` path expecting schema.

## Classification

PostgreSQL is **DECLARED**, partially **IMPLEMENTED as files**, **NOT APPLIED**, **NOT VERIFIED**.
