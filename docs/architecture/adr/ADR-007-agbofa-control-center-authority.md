# ADR-007 — AGBOFA Platform Control Center Authority

| Field | Value |
|---|---|
| ADR ID | ADR-007 |
| Title | AGBOFA Platform Control Center Authority |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | Platform administration and cross-product governance |
| Supersession | None |

---

## Governance decision

AGBOFA Platform Control Center shall be the central administrative authority for major platform configuration and operations.

It is **not** a giant settings page. It is the platform governance and operational command layer.

```
AGBOFA CONTROL CENTER
          │ Governs
          ▼
PLATFORM SERVICES
          │ Serves
          ▼
STITCHFLOW
```

The Control Center shall **not** duplicate StitchFlow’s tailoring workspace.

---

## Authority domains

**Commercial:** plans, pricing, subscriptions, billing, revenue, entitlements, usage  

**Platform:** tenants, users, roles, feature flags, integrations, API access  

**Governance:** audit logs, policies, security, configuration, operational controls  

**Intelligence governance (future):** AI provider configuration, model policies, usage limits, enablement, safety boundaries  

---

## Context (T0 FACT)

No Control Center application exists in this repository. StitchFlow Settings is a product workspace screen, mixed local + stub API.

---

## Constraints

Do not implement Control Center inside StitchFlow Studio as a side quest (T5/T6). Do not scatter tenant admin across web and mobile.

STOP-ADR-07 if a platform setting has no declared authority.

New operational configuration must declare: code vs configuration (ADR-011), and which layer owns it (this ADR vs StitchFlow workspace settings).

---

## Enforcement

Control Center governance reviews at Phase 19 / platform expansion. Not a T1 deliverable.
