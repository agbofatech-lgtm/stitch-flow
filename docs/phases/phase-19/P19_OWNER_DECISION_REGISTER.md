# P19 Owner Decision Register

Owner: **Agbofa Benjamin**. Unticked boxes are not decisions. Agents must not tick these.

These decisions **block P19.2–P19.11 implementation**. Constitution (P19.1) may describe options.

---

## OD-P19-01 — Tenant vs Workspace

**FACT:** Glossary: Tenant = commercial/isolation boundary (not running). Workspace = operational unit inside a tenant (mock). Runtime has `workspaceId` only.

**STOP-P19-C** if isolation is implemented before this decision.

- [ ] **A.** Introduce Tenant as new platform entity; Workspace remains nested (matches glossary)
- [ ] **B.** Temporary 1:1: existing Workspace **is** the Tenant until a parent is added
- [ ] **C.** Freeze tenancy work; commercial waits
- [ ] **Other:** ________________________________

Owner / date: __________________

---

## OD-P19-02 — Plan vocabulary

**FACT:** `TierCode` BASIC/PRO/STUDIO vs `authService` free/pro/enterprise. ADR-003 already flags the synonym collision.

**STOP-P19-E** if a new table or FeatureGate is aligned to one vocabulary in code without this tick.

- [ ] Canonical codes **BASIC / PRO / STUDIO**
- [ ] Canonical codes **FREE / PRO / ENTERPRISE** (or free/pro/enterprise)
- [ ] New vocabulary (write canonical names): __________________
- [ ] Defer — no plan catalog in code

Owner / date: __________________

---

## OD-P19-03 — Pricing currency and amounts

**FACT:** `FEATURE_COMPARISON` USD $0 / $29 / $79. `TIER_META` GHS 0 / 45 / 90. ADR-006: do not add a third table.

**STOP-P19-E**. Do not “pick GHS because Ghana” or “pick USD because FeatureGate” in implementation.

- [ ] GHS is display currency; amounts TBD (do not treat 45/90 as law)
- [ ] USD is display currency; amounts TBD (do not treat 29/79 as law)
- [ ] Multi-currency later; no amounts in product code
- [ ] Other: ________________________________

Owner / date: __________________

---

## OD-P19-04 — Billing provider

**FACT:** No Stripe / Paystack / Flutterwave SDK. Must not select a provider in P19.1.

**STOP-P19-G** if an adapter is added as if it were the domain.

- [ ] Provider-neutral port only; no adapter this phase
- [ ] Authorize named adapter(s): __________________
- [ ] Defer billing runtime entirely

Owner / date: __________________

---

## OD-P19-05 — Authentication runtime

**FACT:** Frontend JWT helpers and `authService` exist; backend `auth.ts` / `authRoutes.ts` are empty; ADR-009 one runtime.

**STOP-P19-B** if a second IdP/server is invented.

- [ ] Complete authentication **on the existing** `apps/backend` runtime (ADR-009)
- [ ] External IdP (name): __________________
- [ ] Defer authentication runtime; keep mock session TRANSITIONAL

Owner / date: __________________
