# Identity and idempotency

- Public POST `/shop/customers` still ignores body `id` (SAC-3).
- Sync create accepts client UUID `entityId`.
- Non-UUID entityId → 400. No invented ids.
- `shop_sync_operations` unique `(tenant_id, workspace_id, operation_id)`.
- Retry of a seen operation returns the stored ack.
- T2 `remoteId` = accepted entity id.
- SAC-2 `ShopOrder` / live measurement projections are quarantined if they ever appear in the outbox.
