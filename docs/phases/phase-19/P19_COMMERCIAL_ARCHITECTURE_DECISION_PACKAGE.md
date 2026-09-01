# P19.1.5 Commercial Architecture Decision Package

| Field | Value |
|---|---|
| Predecessor P19.1 | `b407ec409159a60597e8d0dc2b960032b247159b` |
| Implementation | **NONE** |
| Owner ticks | **NONE** (agents must not tick) |

Recommendations are **not** implementation authority.

## Owner decision matrix

| Decision | Options | Recommendation | Confidence | Owner action |
|---|---|---|---|---|
| **OD-P19-01** Tenant | A Workspace=Tenant; B Tenant⊃Workspace; C freeze | **B** + 1:1 bootstrap | High (model) / Med (rollout) | Required |
| **OD-P19-05** Auth | A custom on `apps/backend`; B managed IdP; C defer mock | **A** (JWT proves user only) | High (where) / Med (custom vs managed) | Required |
| **OD-P19-02** Plans | A fixed enum; B DB catalog; C hybrid; D defer codes | **C target / D until ticked**; seed BASIC/PRO/STUDIO as *legacy codes*, not marketing | Medium | Required |
| **OD-P19-03** Currency | A single; B multi-currency + launch activation; C provider-controlled | **B**; **no amounts** | High (split) / Med (launch ISO) | Required |
| **OD-P19-04** Provider | A paper port; B name adapter; C defer billing | **DEFER** (A+C). No Paystack/Flutterwave/Stripe selected | High | Required |

## One-line justifications

1. **Tenant:** Glossary already TENANT ≠ WORKSPACE; Workspace mixing `billingStatus` is not identity.
2. **Auth:** Empty backend files + existing JWT env/deps + ADR-009; no IdP in repo; identity ≠ tenant.
3. **Plans:** Two vocabs; application must not `if (plan === "Professional 2026")`; configuration-driven definitions.
4. **Price:** Two fake tables + shop `CurrencyCode` already multi; PLAN ≠ PRICE; STOP if we pick 29 or 45.
5. **Provider:** Zero operational evidence → defer (STOP-P19-1.5-F if named as selected).

## Dependency

`01 → 05 → P19.2 → 02 → entitlements → 03 → 04 → billing`  
See [`P19_DECISION_DEPENDENCY_GRAPH.md`](./P19_DECISION_DEPENDENCY_GRAPH.md).

## Trusted Core

All five recommendations are access-platform only. Audit: [`P19_TRUSTED_CORE_NON_CONTAMINATION_AUDIT.md`](./P19_TRUSTED_CORE_NON_CONTAMINATION_AUDIT.md).

```
P19.1.5 COMMERCIAL ARCHITECTURE DECISION PACKAGE
Predecessor: P19.1 Constitution PASS b407ec409159a60597e8d0dc2b960032b247159b
OD-P19-01 Tenant Authority: RECOMMENDATION READY
OD-P19-05 Authentication Runtime: RECOMMENDATION READY
OD-P19-02 Plan Taxonomy: RECOMMENDATION READY
OD-P19-03 Pricing & Currency: RECOMMENDATION READY
OD-P19-04 Payment Provider: RECOMMENDATION READY (DEFER SELECTION)
Decision Dependencies: PASS
Trusted Core Non-Contamination: PASS (paper)
Implementation: NONE
OWNER DECISIONS: PENDING
P19.2: LOCKED
FINAL STATUS: READY FOR OWNER ARCHITECTURE DECISIONS
```
