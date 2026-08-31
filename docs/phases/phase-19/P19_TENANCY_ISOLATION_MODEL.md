# P19 Tenancy Isolation Model (paper)

Status: **PAPER** — P19.3 **LOCKED** (OD-P19-01 / STOP-P19-C).

## Intended layers (PROPOSAL)

```
Tenant Context
  → Authenticated request
  → Authorization
  → Tenant-scoped query
  → Database enforcement
```

Never trust as **sole** isolation: `X-Tenant-ID`, browser `workspaceId`, localStorage tenant.

## Glossary (already canonical)

- **Tenant** — commercial / isolation boundary (platform).
- **Workspace** — operational workspace **inside** a tenant (StitchFlow).

Runtime has not instantiated Tenant. Isolation is **APPLICATION mock**. Cross-tenant leak risk exists if unfiltered SQL routes are mounted.

## Isolation claims forbidden until demonstrated

- “We are multi-tenant because types have workspaceId”
- RLS exists (FACT: not found)
- Tenant A cannot read Tenant B (UNKNOWN / not tested — P18-C-016)

## Required proofs later (not now)

Cross-tenant read/write/update/delete denied; membership server-side; admin bypass explicit and audited; tenant context not spoofable.
