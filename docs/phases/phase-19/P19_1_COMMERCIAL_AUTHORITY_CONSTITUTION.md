# P19.1 — Commercial Authority Constitution

| Field | Value |
|---|---|
| Slice | **P19.1 COMPLETE as constitution** |
| Implementation slices P19.2–P19.11 | **LOCKED** — Owner decisions required |
| Date | 2026-08-31 |
| Predecessor | P18 `6c838a11911aaa947c0fd2eacd694de1ba5bae5e` |
| Stage 0 evidence | `491cf70ca784f302b8a28b1c96ec8d805dc25ba5` |
| Laws | ADR-001, ADR-003, ADR-006, ADR-007, ADR-009, ADR-011 |
| Classification | FACT / INFERENCE / PROPOSAL / UNKNOWN / OWNER DECISION / LEGACY |

This slice **does not** add billing SDKs, subscription tables, entitlement engines, Control Center UI, or Trusted Core changes.

---

## 1. Mission (binding)

StitchFlow may become an operable commercial platform **only** if commercial systems wrap **access** around Trusted Tailoring Intelligence and never enter deterministic computation.

```
AGBOFA CONTROL CENTER  (ABSENT — ADR-007 target)
          │ governs
PLATFORM CONTROL PLANE  (ABSENT)
          │ identity / tenancy / commercial
ACCESS DECISION
          ▼
STITCHFLOW PRODUCT
          ▼
TRUSTED CORE (P13–P16) + AI ADVISORY (P17)
```

**FACT:** Control plane and SaaS billing are absent. Product UI simulates plans.

---

## 2. Non-contamination constitution (binding now)

Commercial MAY decide: who, whether entitled, how metered, which plan, when expired, whether suspended.

Commercial MUST NOT decide: measurement calculation, specification interpretation, composition derivation, pattern formulas, production intelligence, hip defaults, garment-type coercion, mutation of deterministic outputs.

**Allowed**

```
if (!can(tenant, capability)) return ACCESS_DENIED;
return executeTrustedTailoring(...);
```

**Forbidden**

```
if (plan === "PRO") pattern.hip = 100;
```

Firewall detail: [`P19_COMMERCIAL_CORE_FIREWALL.md`](./P19_COMMERCIAL_CORE_FIREWALL.md).

---

## 3. Distinctions that are law (not UI cleanup)

| Must not collapse | FACT in repo today |
|---|---|
| Identity ≠ Membership ≠ Role ≠ Permission ≠ Entitlement | Client booleans mix several |
| Tenant ≠ Workspace | Glossary: Tenant commercial/isolation; Workspace operational inside tenant. Runtime: Workspace only |
| Plan ≠ Entitlement | `plan === 'PRO'` and FeatureGate used as both |
| Subscription ≠ Payment | Subscription **ABSENT**; shop Payment exists |
| Shop Invoice ≠ SaaS Invoice | Same word, different domains (ADR-003 / ADR-006) |
| Shop Payment ≠ platform billing | ADR-006 |
| FeatureGate ≠ commercial authority | ADR-006 |
| Settings ≠ Control Center | ADR-007 |
| JWT helper ≠ authentication runtime | `auth.ts` / `authRoutes.ts` empty |
| `workspaceId` ≠ verified isolation | P18-C-016 |
| Frontend auth state ≠ security authority | AppContext mock |

**PAYMENT ≠ SUBSCRIPTION ≠ ENTITLEMENT**

---

## 4. Canonical platform graph (PROPOSAL — matches glossary, not runtime)

```
Platform
 └── Tenant                 isolation + commercial account  [ABSENT]
      ├── Workspace         operational shop grouping       [PARTIAL mock]
      │    ├── Membership
      │    ├── Users
      │    └── Product data (customers, jobs, shop invoices)
      ├── Subscription      SaaS enrollment                 [ABSENT]
      │    └── Plan → Entitlements
      └── BillingAccount    SaaS money                      [ABSENT]
```

**OWNER DECISION OD-P19-01** required before Slice B isolation code: confirm Tenant ⊃ Workspace (glossary) vs 1:1 promote Workspace as Tenant. See [`P19_OWNER_DECISION_REGISTER.md`](./P19_OWNER_DECISION_REGISTER.md).

---

## 5. Conflicts that Stage 0 forbids silently resolving

| ID | Conflict | Classification | Action |
|---|---|---|---|
| OD-P19-01 | Tenant vs Workspace runtime mapping | OWNER DECISION | STOP-P19-C for isolation implementation |
| OD-P19-02 | BASIC/PRO/STUDIO vs free/pro/enterprise | OWNER DECISION | STOP-P19-E |
| OD-P19-03 | USD $0/$29/$79 vs GHS 0/45/90 | OWNER DECISION | STOP-P19-E |
| OD-P19-04 | Billing provider | UNKNOWN / must not pick | STOP-P19-G if assumed |
| OD-P19-05 | Identity provider / session store | UNKNOWN | STOP-P19-B if guessed in code |

Constitution **records** conflicts. It does **not** pick winners.

---

## 6. What is established without Owner (because ADRs already bind)

1. StitchFlow **consumes** commercial authority; it does not own it (ADR-006).
2. Shop Invoice/Payment remain operational domain (ADR-003/006).
3. Control Center is the future admin plane; not Settings (ADR-007).
4. One backend runtime (ADR-009) — do not add a second commercial server.
5. New work must not add a third price table (ADR-006).
6. FeatureGate remains TRANSITIONAL UX until replaced by a server-authoritative entitlement resolver.
7. Protected tailoring assets must remain unmodified (ADR-001 / P19 STOP-J).
8. Application asks `can(tenant, capability)` — **PROPOSAL** for future code, not a license to hardcode `plan === "PRO"` in new screens.

---

## 7. Slice lock after P19.1

| Slice | Status after this constitution |
|---|---|
| P19.0 Forensics | COMPLETE |
| P19.1 Constitution | COMPLETE (this document) |
| P19.2 Identity & Authentication | **LOCKED** — OD-P19-05 / STOP-P19-B |
| P19.3 Multi-tenant isolation | **LOCKED** — OD-P19-01 / STOP-P19-C |
| P19.4 Roles & authorization | **LOCKED** — depends on 19.2–19.3 |
| P19.5 Plans & entitlements | **LOCKED** — OD-P19-02, OD-P19-03 / STOP-P19-E |
| P19.6 Billing boundary | **LOCKED** — OD-P19-04 / STOP-P19-G |
| P19.7 Control Center | **LOCKED** — ADR-007 target; not a Settings rewrite |
| P19.8 Operations & audit | **LOCKED** |
| P19.9 Product access integration | **LOCKED** |
| P19.10–12 Verification / tag / acceptance | **NOT STARTED** — no P19 tag |

Architecture models for later slices are **paper authority**, not runtime.

```
P19.1 COMMERCIAL AUTHORITY CONSTITUTION: COMPLETE
P19.2–P19.11 IMPLEMENTATION: LOCKED
OWNER DECISIONS: REQUIRED (OD-P19-01 … OD-P19-05)
TRUSTED CORE: UNTOUCHED
PHASE 19 TAG: NOT CREATED
```
