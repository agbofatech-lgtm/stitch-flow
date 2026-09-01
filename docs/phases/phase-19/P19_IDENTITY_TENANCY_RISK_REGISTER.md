# P19.2+P19.3 Risk Register

| ID | Risk | Class | Mitigation |
|---|---|---|---|
| IT-R1 | In-memory IAM lost on restart | TRANSITIONAL | Documented; Postgres not claimed |
| IT-R2 | AppContext workspace still looks like tenant | Duplicate authority | Classified; no silent merge |
| IT-R3 | Unmounted shop SQL unfiltered if mounted | Leak | Keep `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=false` |
| IT-R4 | JWT secret `replace_me` in example | Ops | Env name only; tests use dedicated secret |
| IT-R5 | Entitlement skipped = all features open | STOP-L | Entitlement not evaluated; product FeatureGate still UI |
| IT-R6 | Treating this as security certification | Overclaim | Explicitly not pentest/SOC2 |
| IT-R7 | Client X-Tenant-Id spoof | Isolation | Membership check; tests |
| IT-R8 | Filling empty auth with license/device model | Vocab conflict | Not copied |
| IT-R9 | Adding tenantId to frozen versions | Core contamination | Not done |
| IT-R10 | Jest ignore empty tests hides them | Harness | Documented exclusion |
