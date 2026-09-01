# Security model

Unchanged SAC-3 chain:

```
Bearer JWT → identity → tenant membership → workspace belongs to tenant → scoped repository
```

- Body `tenantId` / `workspaceId` / `id` ignored.
- `X-Tenant-Id` spoof → 403 (membership).
- `X-Workspace-Id` for a foreign workspace → 403 `WORKSPACE_SCOPE`.
- Cross-tenant GET of an existing id → 403 `SHOP_SCOPE` (existence-only unscoped check; row body is not returned).
- Cross-tenant GET of a missing id → 404.
- Cross-tenant mutation → 403.
- Trusted artifacts: POST create, GET scoped read, PUT/PATCH/DELETE 405.

Repository list/get/update always include `tenant_id` and `workspace_id`. Production stage guards remain in process (`stageMachine.ts`), not database triggers.
