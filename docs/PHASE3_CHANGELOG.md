# PHASE 3 CHANGELOG

## Tenancy classification (Step 7 audit result)

| Class | Tables |
|---|---|
| SYSTEM | schema_migrations |
| USER/PLATFORM | users, refresh_tokens, audit_logs, events, licenses, license_devices, feature_requests, feature_request_votes |
| WORKSPACE-OWNED (direct `workspace_id`) | customers, orders, invoices, payments, fabric_records, app_settings (composite key), workspace_members, sync_changes |
| DERIVED (scoped via parent FK) | invoice_items→invoices, order_material_usages→orders, order_production_stages(+events)→orders |
| NEW | workspaces, workspace_users (auth membership), processed_mutations (idempotency ledger) |

Backfill: legacy rows → `'default-workspace'` (pre-existing app convention, not invented ownership); then NOT NULL + FK enforced. No data discarded.

## Migrations added (008–010)
- **008_create_workspaces.sql** — workspaces, workspace_users (role CHECK owner/admin/assistant, UNIQUE membership), legacy-anchor seed, indexes.
- **009_add_workspace_tenancy.sql** — workspace_id + FK + index + `deleted_at` on customers/orders/invoices; payments workspace + `client_mutation_id` (partial UNIQUE per workspace); fabric_records NOT NULL + FK + `deleted_at` + `quantity_in_stock >= 0` CHECK; usages `deleted_at` + `client_mutation_id` UNIQUE; app_settings composite PK (workspace_id, key); workspace_members FK + optional users link.
- **010_sync_v2.sql** — sync_changes: workspace_id (FK), client_mutation_id (partial UNIQUE per workspace), `seq BIGSERIAL` monotonic cursor (UNIQUE + (workspace, seq) index); processed_mutations table with UNIQUE (workspace_id, client_mutation_id).

## Backend changes
- **JWT hardening** (`utils/jwt.ts`): HS256 pinned; `issuer`/`audience` enforced on sign and verify; `workspaceId` claim; refresh `jti`; `hashToken` (sha256).
- **Refresh tokens** (`refreshTokenRepository`): stored hashed; lookup filters expiry; rotation + revocation unchanged from Phase 2 but now replay-safe at rest.
- **Membership enforcement** (`middleware/workspace.ts`): JWT workspace claim re-verified against `workspace_users` per request (revocation-safe); attaches `req.workspaceId`/`req.workspaceRole`.
- **authService**: registration creates a workspace + owner membership; login/refresh resolve the user's membership into the token.
- **All business routes authenticated + tenant-scoped** (`app.ts` chains `authMiddleware, requireWorkspace`); every SELECT/INSERT/UPDATE/DELETE in customers/orders/invoices/payments/materials/dashboard/reports/settings routes carries `workspace_id` predicates or a validated parent-ownership join; `workspace_members` endpoints now derive the workspace from the authenticated identity (client hint no longer authorizes).
- **Sync v2**: `GET /sync/changes?cursor&limit` (deterministic seq order, pagination, `changes/nextCursor/hasMore`); `POST /sync/mutations` (per-mutation transaction, processed_mutations dedupe, duplicate acknowledgement, financial entities rejected with `USE_EVENT_ENDPOINT`); REST business mutations feed the same log via `recordSyncChange(Tx)`; v1 push/pull retained (now workspace-stamped).
- **Payments**: immutable events + clientMutationId idempotency (replay returns original with `duplicate: true`); workspace-scoped `FOR UPDATE` invoice lock; payment insert + invoice reconciliation + payment & invoice sync events in ONE transaction.
- **Inventory**: usage insert + stock deduction + sync events in ONE transaction with `FOR UPDATE` fabric lock and DB CHECK backstop; over-usage → 409; usage delete = soft delete + stock restore + tombstone, transactional; fabric delete = soft delete + tombstone.
- **Conflict classification** (Step 30): customers/orders/settings/design metadata → state (LWW-eligible) via change log; payments/invoice financial state/material usage → immutable events + transactional reconciliation, never LWW.

## Frontend changes (minimal, Step 17)
- `shared/utils/api.ts`: token storage (localStorage), Authorization header injection, serialized 401→refresh→retry-once; refresh failure preserves local work and degrades to offline mode (existing graceful fallbacks).
- `shared/api/auth.ts`: register/login/logout client (stores/rotates/clears tokens).
- Raw-fetch modules (`materials.ts`, `reports.ts`, ProductionBoard stage calls) now send auth headers.
- No UI redesign; protected systems untouched (verified 0-diff vs f31f1d7).

## Test updates
- Phase 2 suites updated ONLY where Phase 3 intentionally changed behavior (business routes now require auth; register returns workspace; db schema tests reflect migrations 008–010). No test was weakened; assertions were strengthened (e.g., 401 matrix for unauthenticated business access).
- New suites: `tenant-isolation.test.ts` (cross-tenant read/update/delete matrix over HTTP + forged-workspace-claim rejection), `sync-v2.test.ts` (cursor, ordering, pagination, crash-resume, duplicate mutation, tombstone, workspace scoping), `financial-integrity.test.ts` (duplicate/concurrent payments, invoice math, rollback purity, atomic inventory, oversell race, tombstone restore).
