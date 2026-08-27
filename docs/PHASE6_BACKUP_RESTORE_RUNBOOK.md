# STITCHFLOW PHASE 6 BACKUP & RESTORE RUNBOOK

## Tooling

| Tool | Command | Notes |
|---|---|---|
| Logical backup | `DATABASE_URL=... node apps/backend/scripts/db-backup.js <dir>` | Consistent point-in-time snapshot (single REPEATABLE READ transaction), 25 tables FK-ordered, per-table sha256 + row counts in manifest, **lossless numerics** (raw JSON text). No credentials in the manifest. |
| Logical restore | `DATABASE_URL=... node apps/backend/scripts/db-restore.js <dir>` | Phase 1 checksum gate (exit 2 on tamper) → single transaction → count verification → `sync_changes` sequence rebase past restored max. Fails = full rollback. |
| Integrity auditor | `npm --workspace=apps/backend run integrity:check` | Read-only post-restore/post-backup verification. |

## EXECUTED HERE (CI evidence, 2026-08-27)

`apps/backend/tests/backup-restore.test.ts` (7/7 PASS) performs the full drill against embedded PostgreSQL 18.4:
production-like seed (workspace, memberships, subscription, billing event, customers, orders with JSONB measurement snapshots, invoices+items, payments, fabric+usage, audit rows, sync_changes, processed_mutations)
→ logical backup → **second, freshly-migrated database** → restore (counts verified vs manifest)
→ integrity checker CLEAN on the restored database
→ **independent direct-SQL verification** (separate connection, not app repositories): migrations inventory (12 incl. 012), tenancy (single-workspace containment, zero cross-tenant rows), measurement JSONB byte-equality, invoice/payment chain, balance invariant, inventory consistency, subscription + billing ledger, audit correlation columns, processed-mutations ledger, sync cursor monotonicity (new seq > restored max)
→ financial totals source vs restored **exact match incl. decimal scale** (120.50 stays 120.50)
→ tampered backup refused by the checksum gate.

## REQUIRED IN PRODUCTION (external — not claimable until executed there)

1. **Schedule**: `db-backup.js` nightly minimum; size is small (JSONL of business tables). Example cron: `0 2 * * * DATABASE_URL=... node .../db-backup.js /backups/$(date +%F)`.
2. **Continuous WAL archiving / `pg_dump`**: use the platform's native mechanism (managed Postgres PITR or `pg_dump -Fc` + WAL-G). The logical tool is the portable application-level layer, not a replacement for PITR. `pg_dump` is NOT available in this CI container — no pg_dump result is claimed.
3. **Encryption at rest**: encrypted volume or client-side encryption of the backup directory; RPO target 24 h (nightly) or lower with WAL.
4. **Access control**: backup directory readable only by the operator role; DSNs via secret manager, never in the manifest (tool redacts).
5. **Retention**: e.g. 7 daily · 4 weekly · 6 monthly (adjust to business need).
6. **Restore drill (quarterly, STAGING FIRST)**: restore into a fresh database → run `integrity:check` → run the backend test suite against it → only then consider the drill passed. Record RTO measured.
7. **Disaster sequence**: provision DB → `npm run migrate` → `db-restore.js <latest-good>` → `integrity:check` → start backend → `/health/ready` 200 → spot-check financial totals.

## RPO / RTO

- RPO: bounded by backup frequency + WAL archiving (24 h with nightly-only logical; near-zero with managed PITR).
- RTO: logical restore of a small-GB database: minutes (CI drill restores in seconds at test scale). Production RTO must be **measured during the first production drill** — not claimed here.
