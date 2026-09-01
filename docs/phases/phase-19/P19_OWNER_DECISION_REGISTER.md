# P19 Owner Decision Register

Owner: **Agbofa Benjamin**. Agents must **not** tick these boxes. Recommendations are not acceptance.

P19.1.5 package: `P19_COMMERCIAL_ARCHITECTURE_DECISION_PACKAGE.md`.  
P19.2 remains **LOCKED** until at least OD-P19-01 and OD-P19-05 are decided.

---

## OD-P19-01 — Tenant authority

**Question:** What is the canonical isolation boundary?

**Options considered:**  
A. Workspace = Tenant  
B. Tenant └── Workspace (1:1 bootstrap)  
C. Freeze tenancy work  

**Architect recommendation:** **B** — TENANT ≠ WORKSPACE. Bootstrap each current workspace 1:1 under a Tenant. Do not treat `workspaceId` as security.

**Why:** Glossary already splits them. `Workspace` mixing `billingStatus`/`tier` with shop branding is not proof of identity.

**Consequences:** New platform entity later; product data keep `workspaceId` plus tenant scope; isolation must be server-side.

**Security:** Never trust `X-Tenant-ID` / localStorage alone.

**Migration:** No data migration in this stage. Future mapping plan required.

**Trusted Core impact:** NONE (access only).

**Owner decision:**

- [ ] ACCEPT RECOMMENDATION (B)
- [ ] SELECT ALTERNATIVE: A / C / other: ________
- [ ] DEFER

Owner / date: __________________

---

## OD-P19-05 — Authentication runtime

**Question:** What is the authoritative authentication runtime?

**Options considered:**  
A. Complete custom auth on existing `apps/backend` (JWT/bcrypt already declared; routes empty)  
B. Managed IdP (named later) as adapter into that backend  
C. Defer; keep mock AppContext session  

**Architect recommendation:** **A**. JWT answers WHO (`sub`) only. Tenant/role/entitlement resolved after auth. Do not use `apps/api` or web `authService` as a second authority (ADR-009).

**Consequences:** Must actually implement empty `auth.ts` / `authRoutes.ts` in a later authorized slice. Custom JWT has operational security burden.

**Trusted Core impact:** NONE.

**Owner decision:**

- [ ] ACCEPT RECOMMENDATION (A)
- [ ] SELECT ALTERNATIVE: B (IdP name: ________) / C
- [ ] DEFER

Owner / date: __________________

---

## OD-P19-02 — Plan taxonomy

**Question:** Canonical **internal** plan taxonomy? (Not prices, not marketing copy.)

**Options considered:**  
A. Fixed enum BASIC/PRO/STUDIO in app code  
B. Database/Control Center catalog only  
C. Hybrid: opaque PlanCode + configuration-driven PlanDefinition; `can(capability)`  
D. Defer — no new catalog in code  

**Architect recommendation:** **C as target**, **D until this is ticked**. Seed identifiers may map legacy BASIC/PRO/STUDIO; do not promote free/pro/enterprise. Never `if (plan === "Professional 2026")`.

**Consequences:** FeatureGate stays TRANSITIONAL until a resolver exists.

**Trusted Core impact:** NONE if access-only.

**Owner decision:**

- [ ] ACCEPT RECOMMENDATION (C target / D until implementation authorized)
- [ ] SELECT ALTERNATIVE: A / B / other codes: ________
- [ ] DEFER

Owner / date: __________________

---

## OD-P19-03 — Pricing and currency

**Question:** How to represent prices without hardcoding market strategy?

**Options considered:**  
A. Single-currency SaaS  
B. Multi-currency price catalog + launch-market activation  
C. Provider-controlled currency  

**Architect recommendation:** **B**. PLAN ≠ PRICE. **No amounts.** Do not treat USD 29/79 or GHS 45/90 as law. Shop `CurrencyCode` already includes GHS/USD/NGN/GBP.

**Consequences:** Launch ISO code is a sub-decision; amounts remain a later commercial decision.

**Trusted Core impact:** NONE.

**Owner decision:**

- [ ] ACCEPT RECOMMENDATION (B)
- [ ] SELECT ALTERNATIVE: A (ISO: ________) / C
- [ ] Launch display currency if B: [ ] GHS [ ] USD [ ] other: ________
- [ ] DEFER

Owner / date: __________________

**Amounts:** not requested and not recommended.

---

## OD-P19-04 — Payment provider

**Question:** Provider strategy? (No integration.)

**Options considered:**  
A. Provider-neutral port; no adapter  
B. Name Paystack / Flutterwave / Stripe now  
C. Defer billing runtime entirely  

**Architect recommendation:** **DEFER SELECTION (A+C)**. Candidates may be studied later. Repo has **zero** merchant/webhook evidence (STOP-P19-1.5-F if selected now).

**Consequences:** No SDK install; shop Mobile Money label remains shop-floor UX.

**Trusted Core impact:** NONE.

**Owner decision:**

- [ ] ACCEPT RECOMMENDATION (defer provider; paper port only)
- [ ] SELECT ALTERNATIVE: authorize adapter(s): ________
- [ ] DEFER (explicit pause)

Owner / date: __________________
