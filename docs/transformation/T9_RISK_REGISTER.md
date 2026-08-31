# T9 Risk Register

| ID | Risk | Evidence | Class | Mitigation |
|---|---|---|---|---|
| T9-R1 | Remaining direct engine callers drift from T3/T7 wrappers | `jobSheetExport.ts` imports patternEngine; AppContext imports productionAssistant | FACT | Equality tests before re-point |
| T9-R2 | Duplicate garment-type maps disagree later | DesignStudio / T3 gateway / unused garmentLogic | FACT maps exist; **UNKNOWN** if all three currently equal (no T9 equality fixture) | Do not merge without fixtures |
| T9-R3 | Yardage treated as body units | Assistant default yards; engine cm | FACT | Keep unit families separate |
| T9-R4 | Job sheet / canvas visual contract unverified | No PDF or pixel tests | UNKNOWN | Fixtures before any visual edit |
| T9-R5 | Alerts invent stage durations | `DEFAULT_STAGE_DURATION_DAYS` in productionAlerts, not in stage service | FACT | Do not promote to stage-engine law |
| T9-R6 | Dual measurement freeze (T8 version vs Order snapshot) | T8 + AppContext | FACT | No silent migration |
| T9-R7 | Dual Studio save paths | T7 owner condition | FACT | Do not consolidate |
| T9-R8 | Dead garmentLogic deleted without mapping | Unused file with overlapping maps | INFERENCE | Do not delete in T9 forensics |
| T9-R9 | Phase 13–16 scope leak | Owner T8 text deferred full calculations | INFERENCE | T9 wrap-only |
| T9-R10 | AI/3D/commercial creep via “intelligence” naming | ADR-004/005/006/007 | FACT lock | STOP |

Unknown behavioral contracts are recorded as **UNKNOWN**. They are not treated as PASS.
