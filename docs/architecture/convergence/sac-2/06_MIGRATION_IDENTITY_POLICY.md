# Migration Identity Policy

Canonical T2 `localId` = legacy `record.id` (string).

Missing/non-string id → skipped (corrupt), not invented.

Re-run uses same id → one record (idempotent).

No `localStorage.clear`. No delete of legacy keys.
