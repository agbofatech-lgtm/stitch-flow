# PHASE 3.5 SYNC PROTOCOL (client side of the Phase 3 contract)

## Mutation lanes
STATE (customers, orders, measurement_profiles, fabric metadata, settings, stages):
POST /sync/mutations { mutations: [{ clientMutationId, entity, entityId, operation,
payload, occurredAt }] } -> 207 { results: [{ clientMutationId, status: applied|duplicate|
rejected, code?, seq? }] }. applied/duplicate -> queue item synced; rejected -> failed.

EVENTS (financial/inventory): payments -> POST /payments; material usage ->
POST /materials/usages; both carry clientMutationId. 201 -> synced; 200 {duplicate:true}
-> synced (server already owns it); 400/404/409/422 -> failed (terminal, surfaced);
408/429/5xx/network -> retry with bounded exponential backoff.

## Delta pull
GET /sync/changes?cursor=<seq>&limit=200 -> { changes[], nextCursor, hasMore }; loop while
hasMore. Changes applied strictly in seq order.

## Cursor rule (§11)
nextCursor is written INSIDE the same Dexie transaction that applies the batch. Any
application failure aborts the transaction; the previous cursor stays valid; a retry
re-pulls the identical batch (verified by test).

## Tombstones (§22–§23)
DELETE change -> local row kept with deletedAt (never physically removed by sync).
Anti-resurrection: an update to a locally-tombstoned row is ignored unless the server
payload explicitly carries a deletedAt field (i.e., server-authoritative revival).

## Retry policy (§18)
retryable: network, 408, 429, 5xx -> backoff 2^n s (cap 5 min), max 8 retries -> failed.
non-retryable: 400/403/404/409/422 + 207-rejected -> failed immediately.
401 -> ONE coordinated refresh (serialized) -> retry same request/cmid; refresh failure ->
SyncAuthError: run pauses, items stay pending, nothing is discarded.

## clientMutationId (§14)
Generated once at queue time, stored in the queue row, reused verbatim on every retry and
across restarts. Server processed_mutations/unique indexes make replays no-ops.
