# 14 — Owner Decisions Required

Separate **DECIDED** (in accepted records or implemented-and-documented) / **INFERRED** / **UNDECIDED**.

| ID | Question | Status | Notes |
|---|---|---|---|
| OD-P19-01 | Tenant ≠ Workspace isolation | **IMPLEMENTED in code; UNDECIDED on owner tick boxes** | Recommendation B running |
| OD-P19-05 | Auth runtime = custom JWT on apps/backend | **IMPLEMENTED; boxes unticked** | Do not revive apps/api |
| SAC-OD-01 | May SAC-1 add Path C freeze on Studio **save** without changing canvas? | **UNDECIDED** | Recommended default yes |
| SAC-OD-02 | May DesignStudio import switch T7-class (`generateStudioPattern` governed) later? | **UNDECIDED** | Not a rewrite if adapter-only |
| SAC-OD-03 | Keep two Studio save paths distinct? | **DECIDED in T7** (must not silent merge) | Third path needs approval |
| SAC-OD-04 | Shop record owner: Tenant or Workspace? | **UNDECIDED** | STOP-D for implementation |
| SAC-OD-05 | One shop = one tenant 1:1 bootstrap forever, or multi-workspace shops? | **UNDECIDED** | Schema allows many workspaces |
| SAC-OD-06 | Authorize SAC-2 dual-read localStorage → T2? | **UNDECIDED** | T2 STOP 12 |
| SAC-OD-07 | Authorize SAC-3 authenticated shop API (not unauth flag)? | **UNDECIDED** | T1 STOP D |
| SAC-OD-08 | Platform Postgres vs shop Postgres together or separate? | **UNDECIDED** | Recommend separate |
| SAC-OD-09 | Hip 98/100/102 reconciliation | **UNDECIDED** (T10 C2 standing) | Must not fill in SAC-1 |
| SAC-OD-10 | Begin 3D or Phase 20? | **DECIDED locked** until later named programme | |

Agents must not tick owner boxes.
