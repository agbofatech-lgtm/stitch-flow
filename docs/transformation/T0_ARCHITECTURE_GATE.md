# T0 ARCHITECTURE GATE AND STOP/GO REGISTER

**Transformation stage:** T0 — Architectural Truth Lock  
**Date:** 2026-08-31  
**Current checkpoint:** `T0 CLOSED` — Owner accepted; tag `transformation-t0-baseline-accepted`  
**T1:** **LOCKED** (separate authorization required)  
**Objective:** Establish a verified understanding of what StitchFlow actually is before transformation changes begin.

---

## GATE T0-A — REPOSITORY TRUTH

| Item | Status | Evidence |
|---|---|---|
| Runtime identified | **PASS** | `docs/architecture/RUNTIME_TRUTH_MAP.md` |
| Entry points verified | **PASS** | web `main.tsx`; backend `server.ts` via npm; `app.ts` unmounted; `apps/api` unpackaged |
| Protected assets classified | **PASS** | `docs/architecture/PROTECTED_ASSET_REGISTRY.md` |
| Persistence mapped | **PASS** | `docs/architecture/DATA_AUTHORITY_MAP.md` |
| Domain engines mapped | **PASS** | `docs/architecture/DOMAIN_INTELLIGENCE_MAP.md` |
| Test baseline recorded | **PASS with limitation** | No frontend tests; backend JS tests exist unexecuted; root `npm test` missing |
| Unknowns documented | **PASS** | U1–U7 in T0_REPOSITORY_TRUTH_REPORT |

**GATE T0-A RESULT: PASS** (test execution is an unknown, not a hidden pass)

---

## CROSS-PHASE GATES (T0 APPLICABILITY)

| Gate | Result | Notes |
|---|---|---|
| A — FORENSIC TRUTH | **PASS** | Repository inspected; runtimes identified; assets classified |
| B — DOMAIN OWNERSHIP | **PASS as documentation** | Owners identified as-is (mostly UI). Canonical ownership is T3. |
| C — DATA AUTHORITY | **PASS as documentation** | Split authority is explicit. T2 not started. |
| D — CONTRACT | **FAIL (expected)** | Contracts are drifted. Formalization is T1. T0 must not fake PASS. |
| E — IMPLEMENTATION BOUNDARY | **PASS** | Docs only; protected assets untouched |
| F — BEHAVIOR | **N/A** | No implementation |
| G — DETERMINISTIC TRUST | **N/A / UNPROVEN** | Engines located; no regression harness |
| H — EXPERIENCE QUALITY | **N/A** | No UI work |
| I — CERTIFICATION | **PASS as T0 investigation** | Deliverables T0.1–T0.6 exist |
| J — OWNER ACCEPTANCE | **ACCEPTED** | T0 baseline accepted. T1 remains LOCKED. |

---

## T0 EXIT CRITERIA

| Question | Answer |
|---|---|
| What exists? | SPA + stub API + unmounted CRUD + orphan auth/sync + Capacitor wrapper |
| What runs? | Vite :5173 and `server.ts` :5000 under npm scripts |
| What owns data? | Split: localStorage vs HTTP stub; Postgres not product SoT |
| What must not break? | Pattern Engine, Production Assistant, Design Studio, measurement vocabulary, stage rules |
| What remains uncertain? | Production host, live DB, typecheck/test execution, mobile packaging, commercial policy |

---

## KNOWN RISKS

See `docs/transformation/T0_RISK_REGISTER.md`. Critical: R1 stub authority, R2 dual SoT, R3 schema, R4 unauthenticated CRUD, R5 corrupted types.

## DEFERRED WORK

All T1–T7 implementation. No Design Studio extraction. No AI. No 3D. No billing. No deletion of legacy files.

## PROTECTED ASSET STATUS

Unmodified. Freeze in effect.

---

## RECOMMENDED DECISION

**GO WITH CONDITIONS**

Conditions:

1. Owner accepts this T0 pack as the locked truth (including that the **running** backend is the stub).
2. T1 is the next authorized stage. T4–T7 and Phases 13–19 are **not** authorized.
3. T1 must not rewrite Pattern Engine, Production Assistant, or Design Studio.
4. T1 must not expose `app.ts` CRUD publicly without an authentication decision.
5. Git tags `transformation-t0-forensics-complete` and `transformation-t0-truth-locked` may be applied **only after owner YES**.
6. Unknowns U1–U7 remain open; U3/U4 (typecheck/test) should be executed as the first T1 forensic step, still without redesign.

Not GO (unconditional): contracts and runtime authority are **not** product-ready — that is T1’s job.

Not STOP: runtimes were reconciled; domain located; DB authority known (absent); protected code unmodified.

Not PAUSE unless owner needs time to read.

---

## OWNER DECISION

```
T0 BASELINE ACCEPTED: YES
PROCEED TO T1 BY THIS DOCUMENT: NO
T1 STATUS: LOCKED (separate authorization required)

Owner: Owner (instruction STITCHFLOW — T0 FINAL ACCEPTANCE, TAGGING & CLOSURE)
Date: 2026-08-31
Notes: Tag transformation-t0-baseline-accepted. Implementation not started.
```

**CHECKPOINT TAG:** `transformation-t0-baseline-accepted`

---

## DELIVERABLE INDEX

| ID | Path |
|---|---|
| Matrix (operational copy) | `docs/transformation/MASTER_TRANSFORMATION_PHASE_MATRIX.md` |
| T0.1 | `docs/transformation/T0_REPOSITORY_TRUTH_REPORT.md` |
| T0.2 | `docs/architecture/PROTECTED_ASSET_REGISTRY.md` |
| T0.3 | `docs/architecture/RUNTIME_TRUTH_MAP.md` |
| T0.4 | `docs/architecture/DOMAIN_INTELLIGENCE_MAP.md` |
| T0.5 | `docs/architecture/DATA_AUTHORITY_MAP.md` |
| T0.6 | `docs/transformation/T0_RISK_REGISTER.md` |
| Gate | this file |
| Supporting forensic narrative | `docs/STITCHFLOW_FORENSIC_ARCHITECTURE_AUDIT.md` |
| ADR Master Pack | `docs/transformation/STITCHFLOW_ADR_MASTER_PACK.md` |
| Canonical vocabulary | `docs/domain/CANONICAL_DOMAIN_VOCABULARY.md` |
| T0 final verification | `docs/transformation/T0_FINAL_VERIFICATION_REPORT.md` |
| Baseline owner acceptance | `docs/transformation/T0_BASELINE_OWNER_ACCEPTANCE.md` (**ACCEPTED**) |
| T0 closure record | `docs/transformation/T0_CLOSURE_RECORD.md` |
