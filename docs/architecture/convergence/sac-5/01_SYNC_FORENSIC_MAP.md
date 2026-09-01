# SAC-5A — Sync forensic map

Inspected T2 (`apps/web/src/shared/persistence/*`), SAC-2 shop mirror, SAC-3/4 `/shop`.

## Where data lives today

| Entity | IndexedDB/T2 | localStorage/AppContext | PostgreSQL `/shop` |
|---|---|---|---|
| Customers | T2 `customer` unused by SAC-2 (class C, not mirrored) | AppContext customers (`crypto.randomUUID()`) | `shop_customers` |
| Orders | T2 `order` = SAC-2 `ShopOrder` **projection, no outbox** | AppContext orders | `shop_orders` (narrow `/shop` shape, not AppContext blob) |
| Live measurements | T2 `measurement` = live profiles | AppContext profiles | **not** a `/shop` table |
| Measurement snapshots | not a T2 entity | inside AppContext order | `shop_orders.measurement_snapshot` JSONB |
| Production stages | T2 `production` used for SAC-1 trusted executions, **not** stages | inside AppContext order | `shop_orders.production_stages` JSONB |
| Trusted artifacts | T2 `production` payload `TrustedTailoringExecution` (append-only read helper) | session/finalize path | `shop_trusted_artifacts` |

## Outbox (actual shape)

`SyncOperation` in `types.ts`:

`operationId`, `entity`, `entityLocalId`, `operationType` (`create\|update\|delete`), `payload`, `expectedVersion`, `createdAt`, `attemptCount`, `status` (`pending\|syncing\|acked\|failed\|conflict`), `lastError?`

Stores: IndexedDB `records` / `operations` / `meta`. Tombstones: `metadata.tombstone`. Connectivity: `ConnectivityMonitor` + `/health` probe.

`EntityRepository.create/update/remove` enqueue. **`putLocalCanonical` does not enqueue** (SAC-2). Bootstrap transport is `blockedBusinessApiTransport` → `RemoteAuthorizationBlockedError`. Queue is marked `failed`, not discarded.

## Identity

| Path | ID authority |
|---|---|
| AppContext new customer/order | client `crypto.randomUUID()` |
| T2 `create()` | client UUID (`localId`) |
| T2 SAC-2 mirror | `localId` = legacy `record.id` |
| `/shop` POST (SAC-3/4) | **server** `randomUUID()`; body `id` ignored |
| T2 metadata | `localId` + optional `remoteId` (mapping anticipated) |

STOP-A risk if `/shop` create keeps ignoring client ids. SAC-5 sync must accept a client UUID **on the sync envelope only**, without changing public POST `/shop/customers` ignore-body-id behaviour.

## Conflict code already present

`ENTITY_CONFLICT_POLICY` currently sets measurement/order/production to `domain-merge`. SAC-5 **forbids** averaging/merging tailoring numbers. Shop sync will use detect-only / state-machine apply. Generic T2 merge helpers remain but are not the shop-sync path.

## Transport forbidden paths (confirmed unused)

No IndexedDB→Postgres. No frontend DB credentials. Sync does not call `/customers`. `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` remains false.
