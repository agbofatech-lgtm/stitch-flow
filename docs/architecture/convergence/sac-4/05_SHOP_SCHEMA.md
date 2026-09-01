# Shop schema

Applied by `007_shop_authority.sql`. Every list/get/update query includes `tenant_id` and `workspace_id`.

## `shop_customers`

`id` UUID PK, `tenant_id`, `workspace_id`, `full_name`, `phone`, `email`, `address`, `notes`, `created_at`, `updated_at`. Index `(tenant_id, workspace_id)`.

## `shop_orders`

Authenticated `/shop` representation only. Not the AppContext blob.

`id` UUID PK, `tenant_id`, `workspace_id`, `customer_id` FK, `order_number`, `status`, `garment_type`, `notes`, `measurement_snapshot` JSONB, `production_stages` JSONB, timestamps.

Measurement snapshots remain frozen order JSON (T8/P13 distinction: this is not live editable measurement). Production stage **rules** stay in `stageMachine.ts`; the database stores state, not triggers.

## `shop_trusted_artifacts`

Append-only. `frozen` CHECK (`TRUE`). Fingerprint is not PK. Payload JSONB carries type, classification, provenance, contract/version from SAC-3.

## Isolation

Repository signatures are `getX(scope, id)` / `listX(scope)`. Unscoped `existsX(id)` returns a boolean only, used to preserve the SAC-3 403 `SHOP_SCOPE` vs 404 missing distinction without returning foreign row bodies.
