# Shop Data Ownership Decision

**Decision (minimum, evidence-based):** Option C hybrid.

- **Tenant** owns isolation (security/commercial). Every shop record stores `tenantId` from **verified** platform context, never from the body.
- **Workspace** is operational shop scope under that tenant. Header `X-Workspace-Id` is a **hint**; server verifies `workspace.tenantId === ctx.tenant.id`. Default: membership default workspace.

Evidence: P19 tenant model; AppContext `workspaceId` is operational not security.

Who owns Customer/Order/production: **Tenant**, scoped to **Workspace**.  
One tenant may have multiple workspaces (schema). Users may have multiple tenants (`X-Tenant-Id` required).  
Mandatory query scope: `tenantId` AND `workspaceId`.
