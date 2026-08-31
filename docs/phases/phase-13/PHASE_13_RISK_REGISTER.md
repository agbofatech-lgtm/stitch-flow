# Phase 13 Risk Register

| ID | Class | Statement | Mitigation |
|---|---|---|---|
| P13-R1 | FACT | Engine defaults fill missing measurements | Completeness gate before T10 execute |
| P13-R2 | FACT | Hip 98/100/102 unresolved | Do not reconcile (T10 C3 / STOP-P13-D analogue) |
| P13-R3 | FACT | Dual SoT: AppContext vs T2 | Do not migrate AppContext; no new localStorage |
| P13-R4 | FACT | Studio still T7 identity re-exports | Do not claim exclusive governed Studio path (T10 C1) |
| P13-R5 | FACT | UI slider ranges ≠ engine ranges | Do not copy either table into domain |
| P13-R6 | FACT | Dress UI fields ≠ bodice engine inputs | Completeness is PatternKind, not Studio field map |
| P13-R7 | INFERENCE | Live edit vs cut-time drift | Freeze MeasurementVersion; refuse patch |
| P13-R8 | UNKNOWN | Historical inch snapshots | Do not guess unit |
| P13-R9 | UNKNOWN | Canvas px/cm label in Studio (`scale` “px/cm”) | Experience only; T10 C4 |
| P13-R10 | FACT | Copying MEASUREMENT_RANGES would be a second formula authority | Observe PatternValidationError only |
| P13-R11 | FACT | Legacy `phase-13-complete` tag exists from an earlier programme | Do not move or recreate |
| P13-R12 | FACT | tsc pre-existing FAIL | Not a Phase 13 regression |

No STOP-P13-A–F currently triggered.
