# PHASE 5 — DATABASE MIGRATION GUIDE (011_commercial_foundation)

## What migration 011 does

Creates `subscriptions` and `billing_events`, their constraints/indexes, and backfills a 14-day STUDIO trial subscription for every workspace that has none. **Purely additive**: no DROP, no TRUNCATE, no ALTER of existing tables, no data rewritten. Existing tables (customers, orders, invoices, payments, inventory, workspaces, memberships, audit, sync) are untouched.

Constraints created:
- `subscriptions.plan_code CHECK (BASIC|PRO|STUDIO)`; `status CHECK (trialing|active|past_due|paused|cancelled|expired)`
- `uq_subscriptions_workspace_live` — one non-terminal subscription per workspace (partial unique)
- `uq_subscriptions_provider_subscription` — `(provider, provider_subscription_id)` partial unique (prevents cross-workspace provider grafting)
- `billing_events UNIQUE(provider, provider_event_id)` — webhook idempotency key
- FKs: `subscriptions.workspace_id`→workspaces (CASCADE), `billing_events.workspace_id`→workspaces, `billing_events.subscription_id`→subscriptions
- Indexes: `idx_subscriptions_workspace`, `idx_billing_events_workspace`, `idx_billing_events_type`

## Procedure

### Development / staging
```bash
cd apps/backend
npm run migrate            # runner records 011 in schema_migrations (own transaction)
node scripts/run-migrations.js --verify
```

### Production
1. **Backup first (required):** `pg_dump -Fc "$DATABASE_URL" > backup-pre-011-$(date +%F).dump` (see docs/PHASE4_BACKUP_RECOVERY.md).
2. Apply: `npm run migrate` (per-migration transaction: 011 applies atomically or not at all).
3. Verify (see below).
4. Deploy the Phase 5 backend build (server `verifySchema` fail-fast remains active).

### Verification (executed in this phase against embedded PostgreSQL 18.4)
```sql
SELECT name FROM schema_migrations ORDER BY name;            -- ends with 011_commercial_foundation.sql
SELECT COUNT(*) FROM workspaces w
 WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.workspace_id = w.id);  -- 0
\d subscriptions   \d billing_events                          -- constraints/indexes present
```
Then run the application test suite against the migrated DB — done: 129/129 PASS (jest globalSetup runs this exact runner). Existing-table integrity verified by the pre-existing suites (api-crud, financial-integrity, sync, tenant-isolation) all passing post-migration.

## Rollback considerations

The migration is additive, so rollback is `DROP TABLE billing_events; DROP TABLE subscriptions; DELETE FROM schema_migrations WHERE name='011_commercial_foundation.sql';` — acceptable ONLY if no commercial data has been written yet; after real billing activity, restore from the pre-migration backup instead (billing history must never be silently discarded). No automated down-migration is provided (consistent with migrations 001–010).

## Notes
- Backfill trial timestamps are set at migration execution time (existing tenants get a fresh 14-day STUDIO trial — a deliberate, generous business decision, documented in PHASE5_COMMERCIAL_DOMAIN.md §5).
- P3-MIG-001 (no advisory lock around the runner — run one migrator at a time) is inherited from Phase 4, unchanged.
- A production restore test cannot be executed from this sandbox and is NOT claimed (Phase 6 scope).
