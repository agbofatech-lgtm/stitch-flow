# 12 — Convergence Risk Register

Severity and class are separate.

| ID | Risk | Severity | Class |
|---|---|---|---|
| R01 | Path A vs Path C input shaping changes geometry if redirected naively | HIGH | ARCHITECTURAL GAP |
| R02 | Completeness assert breaks live canvas (partial measurements) | HIGH | TRANSITIONAL CONDITION |
| R03 | Dual save paths silently merged | HIGH | TRANSITIONAL CONDITION |
| R04 | Customer population merge data loss | CRITICAL | ARCHITECTURAL GAP |
| R05 | `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true` used as “fix” | CRITICAL | BLOCKER if done |
| R06 | Shop data owned by mock workspaceId vs tenant | HIGH | OWNER DECISION / GAP |
| R07 | Postgres empty 002–005 run as if schema | HIGH | DOCUMENTATION DRIFT |
| R08 | `src` ≠ `dist` production start | CRITICAL | INHERITED DEFECT |
| R09 | FeatureGate treated as API authorization | HIGH | TRANSITIONAL CONDITION |
| R10 | T2 cutover without dual-read | CRITICAL | BLOCKER if done |
| R11 | 3D as measurement authority | CRITICAL | FUTURE PROGRAMME / STOP-H |
| R12 | Hip 98/100/102 filled during convergence | HIGH | TRANSITIONAL CONDITION |
| R13 | types.ts corruption hides contract errors | MEDIUM | INHERITED DEFECT |
| R14 | Stage HTTP path mismatch | MEDIUM | INHERITED DEFECT |
| R15 | Nested stitch-flow/ used as authority | MEDIUM | TECHNICAL DEBT |
| R16 | Offline entitlements | MEDIUM | UNKNOWN |
| R17 | Protected formula change to “make T10 match Studio” | CRITICAL | BLOCKER if done |
| R18 | P19 owner boxes unticked while code implements B | MEDIUM | DOCUMENTATION DRIFT |
| R19 | Web tsc fail inherited | MEDIUM | INHERITED DEFECT |
| R20 | File store vs future Postgres dual platform SoT | HIGH | ARCHITECTURAL GAP |
