# Authorization Model

JWT proves identity only. Tenant from membership + optional `X-Tenant-Id`. Workspace from default or `X-Workspace-Id` verified against tenant. Body `tenantId`/`workspaceId` ignored.
