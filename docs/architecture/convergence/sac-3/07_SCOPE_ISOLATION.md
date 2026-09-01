# Scope Isolation

List/get/update filter `tenantId === ctx.tenant.id && workspaceId === verified workspace`. Cross-tenant id access → 403 SHOP_SCOPE. Foreign workspace header → 403 WORKSPACE_SCOPE.
