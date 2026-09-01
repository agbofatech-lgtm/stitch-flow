# 06 — Identity / Tenancy / Business Boundary

## Implemented chain (FACT)

```
USER (human)
  → IDENTITY     /auth/register|login|me    JWT { sub, typ: access }
  → MEMBERSHIP   tenant-scoped role TENANT_OWNER | STAFF
  → TENANT       isolation + commercial account
  → WORKSPACE    operational unit, tenantId required, id ≠ tenant id
  → (shop data)  NOT YET LINKED
```

**EVIDENCE:** `platform/types.ts`, `runtime.ts` register/login/`resolveContext`, `middleware/auth.ts`.

## Answers from existing architecture

| Question | Status | Answer |
|---|---|---|
| Is Tenant the same as Workspace? | **FACT implemented** | **No.** Register creates different UUIDs; collision throws. `P19_TENANT_AUTHORITY_MODEL.md` |
| Is one tailoring shop one tenant? | **INFERENCE / OWNER DECISION** | Bootstrap is 1 tenant → 1 default workspace. Schema **allows** many workspaces per tenant. Whether a “shop” is tenant or workspace is **not** bound to AppContext `workspaceId`. |
| Can one tenant contain multiple shops? | **FACT schema allows** many `TenantWorkspace` per tenant. **OWNER DECISION** whether that is a shop. |
| Can one user belong to multiple tenants? | **FACT yes** — `X-Tenant-Id` required when multiple active memberships. |
| What should own Customer records? | **OWNER DECISION REQUIRED** | Today: AppContext `workspaceId` (mock). Platform isolation is **Tenant**. Product field is not security (P19 workspace model). |
| What should own Order records? | **OWNER DECISION REQUIRED** | Same as Customer; keep together. |
| What should own Measurements? | **OWNER DECISION REQUIRED** | Live profiles sit on Customer; frozen versions have optional customerId/orderId, no tenantId. |

## Owner register vs code

`P19_OWNER_DECISION_REGISTER.md` OD-P19-01 recommendation **B** (Tenant └── Workspace) is **implemented in platform runtime**. Checkboxes remain **unticked**. Treat as **implemented pending owner tick**, not as license to invent a third model.

OD-P19-05 recommendation **A** (custom JWT on `apps/backend`) is **implemented**. `apps/api` is not authority.

## Must not invent

Do not introduce `ClientUser` / `Account` / collapsing tenant=workspace. Do not treat Control Center operator as a shop tailor.

Frontend `currentWorkspaceId` localStorage is **not** security authority (FACT, P19 workspace model).
