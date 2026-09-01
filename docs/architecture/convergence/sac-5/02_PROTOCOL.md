# SAC-5B — Synchronization protocol

## Boundary

```
T2 outbox → POST /shop/sync/operations (JWT + tenant + workspace)
         → ShopSyncService → ShopService/stageMachine → PostgreSQL
Pull: GET /shop/sync/changes?cursor=
```

Existing `/shop` CRUD HTTP contracts stay. Sync is additive.

## Envelope (client → server)

`operationId`, `entityType`, `entityId`, `operationType`, `expectedVersion`, `clientTimestamp`, `payload`, `schemaVersion`.

Server derives tenant/workspace/identity from auth context. Body `tenantId` / `workspaceId` ignored.

`entityType`: `customer` | `order` | `measurement_snapshot` | `production_transition` | `trusted_artifact`

## Identity

Sync **create** uses `entityId` when it is a UUID. Otherwise 400 (no invented id).

Public POST `/shop/customers` still ignores body `id` (SAC-3).

`remoteId` on T2 = accepted `entityId`.

SAC-2 `ShopOrder` projections are **not** pushed (kind discriminator / not enqueued).

## Idempotency

Table `shop_sync_operations` unique `(tenant_id, workspace_id, operation_id)`. Seen operation returns stored ack. Retry after lost response does not duplicate.

## Versions

`shop_customers.version`, `shop_orders.version`. Update/snapshot/transition require `expectedVersion`. Mismatch → 409 `CONFLICT` (no silent overwrite). Artifacts have no update version; append-only + operation ledger.

## Entity policies

| Entity | Policy |
|---|---|
| Customer | version-aware create/update; delete = tombstone `deleted_at` |
| Order | version-aware create/update; no AppContext blob import |
| Measurement snapshot | replace-as-a-whole on version match; **no numeric merge** |
| Production transition | `stageMachine.applyStageAction` only; no JSON stage overwrite; no automatic regression |
| Trusted artifact | create/read only; PUT/PATCH/DELETE remain 405 |

## Ack

`{ operationId, status: acknowledged\|conflict\|rejected, entityId, serverVersion, serverTimestamp, result? }`

## Cursor

`shop_change_log.seq` per tenant+workspace. Never a global cursor.

## Operation lifecycle (T2)

`pending → syncing → acked | failed (retry) | conflict | blocked_auth | quarantined`

- Network: `failed`, keep local record, retry
- 401: `blocked_auth`, pause, keep queue
- 403: `quarantined`, do not tight-loop
- 409: `conflict`

## Write order

Validate → local record → outbox → UI → sync when possible.

## UI

AppContext remains product UI SoT. Facade is opt-in for selected domains. No localStorage deletion.
