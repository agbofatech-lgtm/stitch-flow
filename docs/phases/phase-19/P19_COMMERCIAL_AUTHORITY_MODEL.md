# P19 Commercial Authority Model

Status: **CONSTITUTIONAL MODEL** — not implemented. Consumes ADR-006.

## Layers

| Layer | Owns | Must not own |
|---|---|---|
| AGBOFA Control Center | Plan catalog versions, tenant lifecycle, admin actions | Pattern formulas, frozen versions |
| Commercial platform services | Subscription, billing port, entitlement grants | Shop job money, tailoring math |
| Access decision | Combine permission ∧ entitlement | Computation |
| StitchFlow product | Shop operations, UX, Trusted Core invocation | Price tables (new), tenant spoofing |
| Trusted Core P13–P16 | Measurement/spec/composition/execution | Plan, tenant billing |
| P17 advisory | Recommendations | Autonomy, commercial mutation |

## Consumption contract (PROPOSAL — shape may evolve; ADR-006)

```ts
interface AccessDecision {
  tenantId: string;
  actorId: string;
  capability: string;
  permitted: boolean;   // membership + role + permission
  entitled: boolean;    // subscription + plan + grant
  allowed: boolean;     // permitted && entitled && tenantActive
  reason?: string;
}
```

Product code should ask `allowed` for a **capability key**, not `plan === "PRO"`.

Capability keys are **not** frozen in this slice (would invent a catalog). Existing `MonetizedFeature` strings are LEGACY / TRANSITIONAL.

## Current vs target

| Concern | Current authority | Target authority |
|---|---|---|
| Identity | Mock User | Platform identity (OD-P19-05) |
| Tenant | Absent | Platform tenant (OD-P19-01) |
| Workspace | AppContext mock | Product unit under tenant |
| Plan | Conflicting constants | Control Center catalog (OD-P19-02/03) |
| Entitlement | FeatureGate | Server resolver |
| SaaS billing | Absent | Billing port (OD-P19-04) |
| Shop Invoice | Operational domain | Unchanged domain |
