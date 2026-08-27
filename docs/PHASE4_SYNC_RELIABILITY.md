# PHASE 4 SYNC RELIABILITY
(consolidates PHASE3_5_SYNC_PROTOCOL/OFFLINE_ARCHITECTURE; re-verified this phase)

Lifecycle: local write+queue (one IndexedDB tx) → syncNow (single-flight, Web Locks cross-tab) → queue drain (event lanes: payments→/payments, usages→/materials/usages; state→/sync/mutations 207) → delta pull (seq cursor, ≤200/page) → applyDeltaBatch (rows+tombstones+cursor in ONE tx) → commit.
Queue states pending/processing/synced/failed; bounded backoff 2^n s cap 5min, 8 retries; stale-processing (>2min) recovery preserves clientMutationId; terminal 4xx isolate (poison mutation cannot block the queue — tested with 60+1).
Retry classification: network/408/429/5xx retryable; 400/403/404/409/422/207-rejected terminal. 401 → ONE coordinated refresh → single retry; failed refresh pauses run, queue intact.
Cursor: advances only inside the committed batch transaction; mid-batch failure → rollback, cursor pinned, identical re-pull (tested). Duplicate deltas idempotent.
Tombstones: deletes stored as deletedAt locally; stale updates cannot resurrect unless server payload explicitly carries deletedAt. Multi-device delete propagation tested.
Conflict model: state entities = server-ordered change log (seq); financial/inventory = immutable idempotent events, transactional server reconciliation — never client LWW, no client clock dependence (cursor is server-generated BIGSERIAL; timestamps are informational only). Delete precedence: tombstone wins over stale update.
Crash/restart: queue+cursor+tombstones persist in IndexedDB (close/reopen tested); same-cmid replay after crash acknowledged as duplicate server-side.
Offline payment UX (Phase 4): server-confirmed vs SAVED LOCALLY/PENDING SYNC distinguished in the payment modal; HTTP rejections never converted to queued retries.
Known limitations: UI read path still AppContext-backed (R1, deferred with role definition: AppContext = in-memory UI store; IndexedDB = durable mirror + sync substrate); /sync/mutations logs state changes without server-side materialization (inherited design, revisit with read-path cutover); browser-level multi-tab e2e not testable in this environment (single-flight + locks + server idempotency verified at unit/integration level).
