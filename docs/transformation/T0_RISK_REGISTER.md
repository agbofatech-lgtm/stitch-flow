# T0.6 — RISK REGISTER

**Stage:** T0  
**Date:** 2026-08-31  
**Rule:** Document only. Do not mitigate by rewriting protected or runtime code in T0.

Severity: CRITICAL · HIGH · MEDIUM · LOW

Likelihood is qualitative from repository structure, not production telemetry.

---

## CRITICAL

| ID | Risk | Evidence | Impact if ignored | T0 handling |
|---|---|---|---|---|
| R1 | Live backend is a stub; real API unmounted | `package.json` → `server.ts`; `app.ts` unused | T1+ integration against fake data; production `npm start` also compiles server.ts | Locked in RUNTIME_TRUTH_MAP. T1 must establish one runtime. |
| R2 | Dual data authority (localStorage vs HTTP) | AppContext persist vs Customers/Invoices/ProductionBoard fetch | Silent divergence of customers/orders; Design pipeline never reaches Production Board | Locked in DATA_AUTHORITY_MAP. T2 required before claiming offline or sync. |
| R3 | Database schema cannot support app.ts routes | empty top-level migrations; initDb unused; missing fabric/settings/invoice_items; stages FK to missing orders | Starting app.ts against migrated DB will 500 | T1 migration reproducibility gate. |
| R4 | No authentication on business API | app.ts has no auth middleware | If T1 mounts app.ts on a public host, data is open | T1 must not expose CRUD without an auth decision. |
| R5 | Types barrel corrupted | `apps/web/src/types.ts` is main.tsx | Typecheck/build may be lying or broken; DesignStudio imports `../types` | UNKNOWN until T1/T4 typecheck baseline. Do not “fix” in T0 (would be implementation). |

---

## HIGH

| ID | Risk | Evidence | Impact | T0 handling |
|---|---|---|---|---|
| R6 | API contract drift | `/stages` vs `/production-stages`; payments paths; dashboard DTO; two Vite env names | Frontend guesses backend | T1 API_CONTRACT_BASELINE |
| R7 | Protected domain trapped in UI | DesignStudio 4k, AppContext 2k | Studio rebuild destroys IP | PROTECTED_ASSET_REGISTRY freeze |
| R8 | materials.ts syntax corruption | truncated fetch URLs / Promise.race debris | Importing it breaks build | Quarantine until T1/T2; Materials screen does not import it |
| R9 | localhost + LAN IP leakage | api.ts default; CORS 192.168.100.4 | Mobile/prod failure; environment leak | T1 config |
| R10 | Timestamp IDs | `Date.now()` in app.ts inserts | collisions | T1/T2 identity policy |
| R11 | Empty files appear as architecture | 0-byte controllers/services in backend | False confidence that auth/sync exists | Recorded as DEAD |
| R12 | CI `npm test` missing at root | workflow vs package.json | Green/red CI meaningless | T1 verification plan |
| R13 | Measurement mixing | aliases in 3 layers | Wrong pattern inputs | Phase 13; do not rename in T0 |
| R14 | Commercial policy hardcoded and conflicting | GHS vs USD prices; alert() billing | Cannot later centralize in Control Center | Defer Phase 19 |

---

## MEDIUM

| ID | Risk | Evidence | Impact | T0 handling |
|---|---|---|---|---|
| R15 | localStorage quota (PNG/data URLs) | inspirations, pattern library | silent data loss (DesignStudio swallows write errors) | T2 persistence boundary |
| R16 | Duplicate Capacitor identities | two capacitor.config.ts | wrong package shipped | T1/mobile later |
| R17 | “AI” labeling on keyword heuristics | productionAssistant + DesignStudio copy | product overclaim; Phase 17 confusion | Record as heuristic |
| R18 | Zod 3 vs 4, Express 4 vs 5, Tailwind 3 vs 4 plugin | package manifests | install/build fragility | Do not upgrade in T0 |
| R19 | jobSheet / PDF logic untested | large TS files | print defects | ADAPT later |
| R20 | Debris files `$3`, `-`, `{` | backend root | tool/git confusion | Delete only after T0 acceptance, not now |

---

## LOW

| ID | Risk | Evidence | Impact |
|---|---|---|---|
| R21 | bak files | `*.bak*` | clutter |
| R22 | Unused components | CustomerDetail, OrderCard, OrderForm, ApiHealthCheck | confusion |
| R23 | garmentLogic.ts unused | zero imports | dead |
| R24 | PWA manifest TailorPro | public/manifest.json | brand drift |

---

## RISKS THAT WOULD STOP T0 (MATRIX STOP CONDITIONS)

| Stop condition | Status |
|---|---|
| Multiple runtimes cannot be reconciled | **NOT TRIGGERED.** Reconciled: npm starts stub; others exist unmounted. Ambiguity is documented, not unknown. |
| Critical domain behavior cannot be located | **NOT TRIGGERED.** Pattern, production assistant, studio, stages located. |
| Database authority is unknown | **NOT TRIGGERED.** Authority is known: DB is **not** product SoT today. |
| Protected code modified accidentally | **NOT TRIGGERED.** T0 wrote docs only. |
| Existing baseline cannot be reproduced | **PARTIAL.** Source baseline is the git commit `b576c3e`. Test/runtime baseline was **not executed** in this lock (U3/U4). This is an unknown, not a hidden failure. |

T0 therefore **does not STOP**. It exits with documented unknowns.

---

## DEFERRED WORK (NOT T0)

- T1 runtime authority (`app.ts` composition, retire stub, health/ready, error contract, migrations)
- T2 data authority / sync
- T3 canonical vocabulary
- T4 experience system
- T5–T7 studio shell / workflows / design extraction
- Phases 13–19
- Git tags `transformation-t0-*` only after owner acceptance

---

**T0.6 complete.**
