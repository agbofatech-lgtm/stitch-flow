# P19 Workspace Relationship Model

```
Tenant (isolation / commercial)
  └── Workspace (operational context)
```

Bootstrap: 1 Tenant → 1 Default Workspace. Schema allows many workspaces per tenant (`tenantId` on workspace).

| Existing `workspaceId` (AppContext / types) | **TRANSITIONAL / LEGACY** product field |
| Platform `TenantWorkspace.id` | **IMPLEMENTED** platform operational unit |

They are **not** automatically mapped. No destructive migration.

Frontend localStorage `currentWorkspaceId` remains **not** security authority.
