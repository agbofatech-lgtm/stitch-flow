# P18 Reliability & Offline Audit

| Scenario | Evidence | Verdict |
|---|---|---|
| T2 MemoryStore create/read | persistence.test.ts 10 pass | PASS (in-memory) |
| Schema migrate | persist tests | PASS |
| Sync queue when remote auth blocked | `RemoteAuthorizationBlockedError` | PASS (queued, not fake success) |
| IndexedDB path | implementation exists | **CONDITIONAL** — not browser-exercised here |
| Offline → online → restart matrix | not executed as a product scenario | **NOT TESTABLE** |
| Crash recovery | UNKNOWN | **UNKNOWN** |
| Duplicate operations | T2 operationId idempotency | **CONDITIONAL** |
| Conflict detection | domain-merge tests | PASS (measurement/order/production) |
| AppContext localStorage | TRANSITIONAL SoT (T10 C1) | **KNOWN CONDITION** |

Reliability: **CONDITIONAL**.
