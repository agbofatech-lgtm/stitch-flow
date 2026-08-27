# STITCHFLOW PHASE 6 DATABASE HARDENING

## Migration safety (audited + verified by execution)

- Migrations are ordered SQL files `apps/backend/migrations/001–012`, applied in lexicographic order by `scripts/run-migrations.js`, each inside its own transaction with rollback on failure; applied state tracked in `schema_migrations` (inventory test: `tests/db.test.ts`).
- **No destructive operations in any migration**: verified by reading all 12 files — CREATE TABLE / CREATE INDEX / ALTER TABLE ADD COLUMN / backfill UPDATEs / one column TYPE WIDENING (012: `audit_logs.entity_id` UUID→TEXT, value-preserving) only. No DROP TABLE, no DROP COLUMN, no TRUNCATE, no data deletion.
- Migration 012 (Phase 6) is additive + idempotent (`IF NOT EXISTS`), verified applied against a fresh database in every test run (embedded PostgreSQL 18.4).
- Server boot **verifies** schema before listening (`verifySchema()`) and fails fast with a remediation message if unmigrated — the application never auto-creates or auto-alters schema at runtime.

## Connection reliability (Phase 6)

`apps/backend/src/config/db.ts`:
- Explicit pool limits: `DB_POOL_MAX=10`, `idleTimeoutMillis=30000`, `connectionTimeoutMillis=5000`, `statement_timeout=15000` (all deployment-tunable).
- Pool-level `error` handler: idle-client disconnects are logged + counted (`database.errors` metric) and can no longer crash the process.
- Query failures increment `database.errors`; `/health/ready` distinguishes process-alive (`/health/live` 200) from dependency-down (`/health/ready` 503, sanitized).

## Indexes (verified present + EXPLAIN ANALYZE indexed plans)

High-value access paths (see PHASE6_PERFORMANCE_REPORT.md for measured plans):
- `idx_customers_workspace_id`, `idx_sync_changes_workspace_seq` (workspace + monotonic cursor), `idx_audit_logs_workspace_id` + `idx_audit_logs_request_id` (Phase 6 migration 012)
- Pre-existing (migrations 004/009/010/011): workspace indexes on orders/invoices/payments/fabric_records/sync tables; `uq_payments_workspace_cmid`; `uq_sync_changes_workspace_cmid`; `uq_subscriptions_workspace_live`; `billing_events UNIQUE(provider, provider_event_id)`.

## Integrity invariants (schema-enforced + audited)

- Financial: payments immutable events; invoice/payment atomicity + balance invariants protected transactionally (Phase 3, regression-tested `financial-integrity.test.ts`).
- Inventory: `fabric_records_stock_nonnegative` CHECK + FOR UPDATE row locks + transactional restoration (negative stock insert is rejected by the database — proven in `tests/integrity.test.ts`).
- Tenant scope: NOT NULL workspace_id on business tables + FKs to workspaces (workspace-less rows are not insertable — proven in tests); every query path is workspace-scoped (tenant-isolation suite).
- Sync: BIGSERIAL monotonic `seq` + UNIQUE(workspace_id, client_mutation_id) + processed_mutations ledger; restore path re-bases the sequence past the restored maximum (tested).

## Data Integrity Auditor

`npm --workspace=apps/backend run integrity:check` (read-only, production-safe): financial (negative totals/payments, balance mismatch), inventory (negative stock, missing fabric, cross-tenant usage), tenant (unowned rows), sync (cross-workspace mutation-key reuse), referential (orphan order/invoice/payment/subscription). Exit 0 clean / 1 violations / 2 unable to run. Tested clean-pass, violation detection, and read-only behavior.

## Backup/restore

See PHASE6_BACKUP_RESTORE_RUNBOOK.md. Logical backup (`scripts/db-backup.js`, consistent snapshot, sha256 manifest, lossless numerics) and restore (`scripts/db-restore.js`, checksum gate, single transaction, count verification, sequence rebase) — **end-to-end restore EXECUTED in CI** (7/7 tests) against a second, freshly-migrated database with independent verification of restored state.
