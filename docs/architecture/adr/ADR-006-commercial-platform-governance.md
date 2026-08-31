# ADR-006 — Commercial Platform Governance

| Field | Value |
|---|---|
| ADR ID | ADR-006 |
| Title | Commercial Platform Governance |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | Billing, subscriptions, plans, pricing, entitlements |
| Supersession | None |

---

## Context

T0 FACT: entitlements are simulated in `tierEnforcement.ts` / `FeatureGate` (`window.alert`). Two conflicting price tables exist (GHS vs USD). License SQL exists unused. Shop invoices are a different concept from SaaS invoices.

Hardcoding `if (plan === "pro")` in every surface creates divergent commercial truth.

---

## Decision

Commercial policy shall be centralized as a **platform capability**.

StitchFlow **consumes** commercial authority. It does not define commercial authority locally.

```
COMMERCIAL PLATFORM
  Plan Catalog, Pricing, Subscription, Payment State, Usage, Entitlements
                 ▼
            STITCHFLOW
                 ▼
        FEATURE BEHAVIOR
```

Conceptual consumption contract (shape may evolve):

```ts
interface TenantEntitlements {
  tenantId: string;
  plan: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}
```

---

## Product responsibility

Ask: who is the user, which tenant, which plan, which entitlements, which limits — from platform services, not from hardcoded UI tables.

Shop-floor **Invoice** and **Payment** (customer jobs) remain StitchFlow operational domain (ADR-003). They are not SaaS billing.

---

## Prohibited

Hardcoding pricing, feature access, subscription rules, or usage limits inside StitchFlow business components **for new work**.

Existing FeatureGate simulation may remain until Phase 19 **if** it is treated as UX prototype, not authority. New screens must not add a third price table.

STOP-ADR-06.

---

## Enforcement

Entitlement architecture review. Complements ADR-007 and ADR-011.
