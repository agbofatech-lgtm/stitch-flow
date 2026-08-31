# T1 Architecture Gate (Forensic)

| Field | Value |
|---|---|
| Stage | T1 — Runtime & Backend Authority |
| Gate type | **Forensic / pre-implementation** |
| Date | 2026-08-31 |
| T0 baseline | tag `transformation-t0-baseline-accepted` = `ce3d45bdb057296819822a0ce9c4d5b594b9cb5b` |
| Implementation | **NOT AUTHORIZED** |

This gate does **not** close T1. It only records whether forensics are sufficient to ask the Owner for implementation authorization.

---

## Forensic checklist

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| T1-F1 | Repository baseline verified | **PASS** | HEAD + tag = `ce3d45b`; tree clean at T1.0 |
| T1-F2 | Runtime candidates identified | **PASS** | `server.ts`, `app.ts`, `apps/api`, `proxy-server.js`, Docker CMD |
| T1-F3 | Actual runtime verified | **PASS WITH CONDITIONS** | npm scripts + source prove stub starts. Process **not** spawned this pass (same method as T0) |
| T1-F4 | Backend authority determined | **PASS** | **Current:** stub `server.ts`. **Target (proposal):** `app.ts` composed by `server.ts` |
| T1-F5 | Database role determined | **PASS** | Referenced, not product SoT, not used by live process |
| T1-F6 | API mounting determined | **PASS** | Stub GETs live; `app.ts` unmounted; `apps/api` unmounted; path drifts listed |
| T1-F7 | Environment configuration understood | **PASS** | Names documented; PORT 5000 vs 3000 conflict; dual Vite vars |
| T1-F8 | Protected dependencies identified | **PASS** | Only `productionStageService` if `app.ts` mounts; engines/Studio untouched |
| T1-F9 | Target runtime contract documented | **PASS** | `T1_RUNTIME_AUTHORITY_CONTRACT.md` **PROPOSED** |
| T1-F10 | Risks documented | **PASS** | T1-R1–R9 + T0 R1–R4 |

**Forensic gate result: PASS WITH CONDITIONS**

Conditions:

1. Live process not spawned this session — script-level FACT only.
2. Implementation still requires Owner `AUTHORIZE T1 IMPLEMENTATION`.
3. Composing `app.ts` without `DATABASE_URL` / schema is expected to fail handlers (not a hidden pass).
4. T1 must not expose unauthenticated CRUD on a public host (T0 R4).
5. Postgres is not declared product SoT.

---

## Cross-programme gates (T1 forensic applicability)

| Gate | Result | Notes |
|---|---|---|
| A Forensic Truth | PASS | Candidates and scripts identified |
| B Domain Ownership | N/A for T1 runtime | Protected stage service: consume, do not rewrite |
| C Data Authority | PASS as documentation | Unchanged from T0 split |
| D Contract | FAIL expected | Drift remains; T1 boot does not require full contract rewrite |
| E Implementation Boundary | PASS | Docs only this pass |
| J Owner Acceptance | **PENDING** | Implementation authorization |

---

## Stop conditions (this pass)

| ID | Result |
|---|---|
| T1-STOP-01 | Not triggered |
| T1-STOP-02 | Not triggered (hashes match T0) |
| T1-STOP-03 | Not triggered — ambiguity **documented** (current vs target) |
| T1-STOP-12 | **In force** — no implementation without Owner phrase `AUTHORIZE T1 IMPLEMENTATION` |

---

## Owner decision block (unsigned)

```
AUTHORIZE T1 IMPLEMENTATION?
YES / NO / YES WITH CONDITIONS

I accept the proposed contract:
  server.ts = entrypoint listen
  app.ts    = authoritative application object
  apps/api  = preserve / isolate / defer
  PORT default 5000 unless I specify otherwise
  no new auth platform
  no product-SoT claim for Postgres
  no T2–T7 work

Owner:
Date:
Conditions:
```

Until this block is YES, T1 implementation remains **LOCKED**.

---

## Deliverables (forensic)

| Doc | Path |
|---|---|
| Forensic report | `docs/transformation/T1_RUNTIME_FORENSIC_REPORT.md` |
| Runtime contract | `docs/transformation/T1_RUNTIME_AUTHORITY_CONTRACT.md` |
| This gate | `docs/transformation/T1_ARCHITECTURE_GATE.md` |

Not created (implementation not started): `T1_IMPLEMENTATION_RECORD.md`, `T1_CLOSURE_RECORD.md`.

Checkpoint tag `transformation-t1-complete`: **not** created.

---

```
T1 Stage 0/Forensics: COMPLETE
T1 Implementation: NOT STARTED
Owner Authorization Required: YES
T2 STATUS: LOCKED
```
