# OD-P19-01 — Tenant Authority Options

**QUESTION:** What is the canonical tenant and isolation boundary?

## FACT

- Glossary (ADR-003): **Tenant** = commercial/isolation boundary (not running). **Workspace** = operational unit **inside** a tenant (mock).
- Runtime: `Workspace` only. Product rows use `workspaceId`. No `tenantId`.
- `Workspace` **mixes** commercial fields (`tierId`, `tier`, `billingStatus`, `trialExpiresAt`, `overridePlan`) with shop branding (`name`, `logoUrl`, `brandColor`, `defaultCurrency`).
- Membership is `WorkspaceMember`, not tenant membership.
- Isolation not live-tested (P18-C-016). Client `workspaceId` / localStorage cannot be sole isolation.

Evidence does **not** prove Tenant ≡ Workspace. Mixing billing onto Workspace is a smell, not identity.

## OPTIONS

### A — WORKSPACE = TENANT

Treat existing `Workspace.id` as the isolation and commercial account.

- **Pros:** Least mapping; matches current types; one mock workspace today.
- **Cons:** Collapses glossary; commercial account = shop branding; later multi-shop tenants require a breaking split; `workspaceId` from the browser remains easy to confuse as security.
- **Migration:** Relabel in docs only; high chance of permanent dual meaning.
- **Trusted Core:** NONE if access-only.

### B — TENANT └── WORKSPACE (recommended)

Introduce Tenant as commercial/isolation unit. Workspace remains operational grouping. Bootstrap **1:1**: each current workspace maps to exactly one tenant until a second workspace exists.

- **Pros:** Matches glossary; can peel billing off Workspace later; isolation key ≠ shop id; Control Center tenants map cleanly.
- **Cons:** New entity with no runtime yet; every query later needs tenant context **and** workspace; migration plan required before data moves.
- **Migration:** Do not rewrite AppContext in this stage. Future: `tenantId` on commercial records; product data may keep `workspaceId` **plus** tenant scope.
- **Security:** Isolation must be server-side tenant membership, not `X-Tenant-ID`.
- **Trusted Core:** NONE.

### C — Freeze tenancy / no commercial isolation yet

- **Pros:** No false multi-tenancy claim.
- **Cons:** Blocks P19.2–P19.3; SaaS still not operable.
- **Trusted Core:** NONE.

## RECOMMENDATION

**B**, with explicit 1:1 bootstrap (not a silent A). TENANT ≠ WORKSPACE.

**Confidence:** High on distinction; Medium on when to instantiate Tenant in data.

**OWNER DECISION REQUIRED:** YES
