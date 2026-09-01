# P19.1.5 Decision Dependency Graph

Decisions are not independent. Implementation of a later node without Owner ticks on its parents is forbidden.

```
OD-P19-01 TENANT AUTHORITY
   TENANT ≠ WORKSPACE (recommended B)
        │
        ▼
OD-P19-05 AUTHENTICATION RUNTIME
   WHO ARE YOU?  (recommended: apps/backend custom JWT)
   must not encode tenant/entitlements as law
        │
        ▼
P19.2 IDENTITY + TENANCY          ← LOCKED until 01 + 05
        │
        ├── membership / roles (P19.4)
        │
        ▼
OD-P19-02 PLAN TAXONOMY
   PlanCode ≠ display name ≠ price
        │
        ▼
ENTITLEMENTS (resolver)           ← LOCKED until 02
        │
        ▼
OD-P19-03 PRICING POLICY
   PLAN ≠ PRICE; no amounts here
        │
        ▼
OD-P19-04 PAYMENT STRATEGY
   DEFER provider; paper port only
        │
        ▼
P19.6 BILLING + PAYMENTS          ← LOCKED until 03 + 04
        │
        ▼
P19.7 CONTROL CENTER / P19.9 ACCESS GATE
```

## Parallelism that is safe on paper only

- 01 and 05 may be **decided** in either order; **implement** auth before claiming isolation.
- 02 may be decided before 05, but entitlements still need a tenant to attach to.
- 03 must not run in code before 02 (price without plan identity).
- 04 must not run before 03 (provider without price currency policy).

## Repo-specific edges

- Workspace currently holds `tier` + `billingStatus` → collapsing 01 into A would bake plan onto the wrong entity.
- `checkCanGeneratePattern` already couples plan to engine **access** — entitlement work (after 02) must replace that without touching formulas.
- Empty auth files mean 05 is not “already implemented.”
