# Architecture Gate Register

**Status:** Active  
**Date:** 2026-08-31  
**Authority:** Master Transformation Phase Matrix + ADR Master Pack

Gates are independent of feature completeness.

| Gate | Question | Failure |
|---|---|---|
| A Forensic Truth | Do we understand the existing system? | STOP |
| B Domain Ownership | Who owns this capability? | STOP |
| C Data Authority | Where does truth live? | STOP |
| D Contract | How do systems communicate? | STOP |
| E Implementation Boundary | Did work stay in scope? | CORRECT OR REVERT |
| F Behavior | Does it work? | STOP |
| G Deterministic Trust | Did protected intelligence remain correct? | IMMEDIATE STOP |
| H Experience Quality | Does this belong to StitchFlow Studio? | REDESIGN |
| I Certification | Is evidence sufficient? | NOT CERTIFIED |
| J Owner Acceptance | Should the programme proceed? | GO / GO WITH CONDITIONS / PAUSE / RETURN / STOP |

## ADR stop conditions (constitutional)

| ID | Trigger |
|---|---|
| STOP-ADR-01 | Protected engine behavior changes unexpectedly |
| STOP-ADR-02 | Two authorities emerge for the same domain |
| STOP-ADR-03 | Feature requires bypassing a domain boundary |
| STOP-ADR-04 | AI requires automatic modification of deterministic data |
| STOP-ADR-05 | 3D requires changing unverified measurement or pattern truth |
| STOP-ADR-06 | Commercial rules hardcoded into product UI |
| STOP-ADR-07 | Platform setting has no declared authority |
| STOP-ADR-08 | Terminology conflicts with Canonical Domain Vocabulary |
| STOP-ADR-09 | Architectural decision made implicitly through implementation |

## Current programme position (FACT from T0)

| Gate | T0 result |
|---|---|
| A | PASS |
| B | PASS as documentation |
| C | PASS as documentation of split authority |
| D | FAIL expected — T1 work |
| E | PASS (docs only) |
| J | **ACCEPTED** (T0 closed). T1 **LOCKED**. |

T0 STATUS: **COMPLETE** — `transformation-t0-baseline-accepted`  
T1 STATUS: **COMPLETE** — `transformation-t1-runtime-authority-complete`  
T2 STATUS: **COMPLETE** — `transformation-t2-data-offline-foundation-complete`  
T3 STATUS: **COMPLETE** — `transformation-t3-domain-boundary-isolation-complete`  
T4 STATUS: **COMPLETE** — `transformation-t4-experience-foundation-complete`  
T5 STATUS: **COMPLETE** — `transformation-t5-studio-shell-complete`  
T6 STATUS: **COMPLETE** — `transformation-t6-workflow-migration-complete`  
T7 STATUS: **AUTHORIZED after T6 checkpoint** — forensics / boundary mapping only; deep extraction not started  
T7+ product phases / AI / 3D / commercial / Control Center: **LOCKED**

T0 final verification: [`docs/transformation/T0_FINAL_VERIFICATION_REPORT.md`](../../transformation/T0_FINAL_VERIFICATION_REPORT.md)  
T0 closure: [`docs/transformation/T0_CLOSURE_RECORD.md`](../../transformation/T0_CLOSURE_RECORD.md)
