# P19.8+P19.9 Risk Register (closure)

| ID | Risk | Class | Mitigation |
|---|---|---|---|
| P-R1 | File JSON is not Postgres | FACT | Classified TRANSITIONAL; 006 not applied |
| P-R2 | Password hashes on disk | FACT | File is not KMS; secrets not in audit |
| P-R3 | `PLATFORM_DATA_PATH` unset → memory | FACT | `/ready` reports `memory` |
| P-R4 | Applying 006 onto empty 002–005 | RISK | Do not auto-migrate |
| P-R5 | FeatureGate still UX | FACT | Server `/platform/access/check` is law |
| P-R6 | Test webhook mistaken for PSP certification | RISK | Live PSP = NO |
| P-R7 | Derived entitlements vs stored rows | FACT | Recover via subscription+plan |
| P-R8 | Inherited web tsc failures | LEGACY | Not relabeled PASS |
| P-R9 | Shop CRUD if `mountBusinessRoutes` | RISK | Default unmounted |
| P-R10 | Tracking ref `origin/arena` lag | INFERENCE | Verify with `git ls-remote` |
