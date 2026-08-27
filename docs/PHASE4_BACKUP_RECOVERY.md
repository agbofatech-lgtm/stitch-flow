# PHASE 4 BACKUP / RECOVERY
PostgreSQL: nightly `pg_dump -Fc` minimum (hourly WAL archiving/PITR recommended for commercial use); retention 30 daily + 12 monthly; store off-host encrypted.
Restore: provision empty DB → `pg_restore -d …` → `node scripts/run-migrations.js --verify` (expect all applied; if dump predates newer code, runner applies the delta) → start app (verifySchema gates) → smoke: /health, login, one workspace read.
Restore verification (quarterly drill): restore latest dump to a scratch DB, run backend test suite pointing DATABASE_URL at it minus destructive suites, verify row counts vs source.
Recovery objectives (recommendation): RPO ≤ 24h with dumps (≤5min with WAL), RTO ≤ 1h.
Sync recovery: clients are rebuildable from the server (delta from cursor 0); after a server restore to time T, clients with cursors > max(seq) must reset cursor to 0 and re-pull (server cursor regression detection is future work — documented P2); pending client mutations replay safely via clientMutationId idempotency.
Retention (documented policy, no destructive cleanup implemented): sync_changes ≥ 180 days AND never below any active client cursor; processed_mutations ≥ 90 days (must cover max offline period); refresh_tokens: purge expired+revoked > 30 days; audit_logs ≥ 1 year (compliance-driven; never deleted merely for storage); soft-deleted business rows ≥ 90 days before any physical cleanup, and only with a migration-reviewed job.
Audit-log recovery: included in pg_dump; ordinary users have no write path to audit_logs (admin-read-only API).
Operational checklist: backup verified? migrations --verify clean? verifySchema passes? /health 200? auth round-trip? sample tenant read? sync/changes serving?
