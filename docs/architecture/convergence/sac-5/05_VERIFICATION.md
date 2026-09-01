# Verification

| Axis | Result | Evidence |
|---|---|---|
| Forensic protocol map | PASS | `01_SYNC_FORENSIC_MAP.md` |
| Local durability | PASS | T2 dump/restore + offline create tests |
| Outbox durability | PASS | pending survives restart |
| Idempotency | PASS | same operationId → one customer / one artifact |
| Authenticated transport | PASS | `/shop/sync/operations` JWT |
| Tenant isolation | PASS | cross-tenant 403; pull scoped |
| Workspace isolation | PASS | foreign workspace header 403 |
| Push | PASS | memory + postgres |
| Pull | PASS | cursor scoped; other tenant cannot see rows |
| Conflict handling | PASS | version mismatch 409; no measurement merge |
| Tombstones | PASS | T2 tombstone + server `deleted_at` |
| Trusted artifacts | PASS | retry same ack; update 405 |
| Production transitions | PASS | invalid skip 409 STAGE_GUARD |
| Restart recovery | PASS | local queue + postgres retry |
| Offline recovery | PASS | record remains if push fails |
| Protected assets | PASS | hashes unchanged |
| Regression | PASS | SAC-1 6, SAC-2 10, SAC-3 7, SAC-4 4 |
| Frontend screens | not migrated | AppContext remains UI SoT (Level 1) |
