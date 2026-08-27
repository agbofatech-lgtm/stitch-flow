# PHASE 3.5 RECOVERY TESTS (all executed via vitest, 38/38 pass)

Crash/restart:
- queue persists across close/reopen (restart simulation)
- stale 'processing' recovery -> pending with SAME clientMutationId; fresh items untouched
- crash-before-ack replay: server reports duplicate; exactly one logical mutation (§41)
Cursor:
- mid-batch poison -> transaction rollback, zero partial rows, cursor pinned at previous
  value; clean retry applies all with no skips (§42)
- duplicate delta application idempotent (re-pull from old cursor)
- 120-change paginated delta -> batch-by-batch commit, cursor 120
Tombstones:
- delete propagates; stale update cannot resurrect (§23)
Auth:
- 401 -> refresh -> retry (one refresh call); failed refresh pauses run, queue intact;
  logged-out sync skipped, queue + data preserved (§35, §45)
Failure injection:
- network failure -> retryable, no loss; server 409 stock rejection -> terminal failed,
  no infinite retry, remaining queue unaffected
Concurrency/scale:
- 3x concurrent syncNow -> one run, one server submission (§43)
- 61-item queue with one poison item -> 60 synced, 1 failed, none blocked (§49)
Offline:
- offline startup: local data served with zero network (§47)
Backend regression: 69/69 (Phase 2+3 suites) — server contracts unchanged.
