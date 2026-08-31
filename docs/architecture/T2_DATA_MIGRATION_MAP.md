# T2 Data Migration Map

| Legacy | Target | Method | Status | Retirement |
|---|---|---|---|---|
| `shared/lib/db.ts` localStorage | IndexedDB repositories | **Not auto-migrated** (STOP 12) | TRANSITIONAL | Dual-read later; owner-approved cutover |
| `stitchflow:design-studio:drafts` | design repository | **Not migrated** (Design Studio protected) | TRANSITIONAL | T7 |
| HTTP Customers/Invoices | T1 API | **Not enabled** (STOP 2) | BLOCKED | After auth decision |
| `apps/api` sync_changes SQL | T2 queue | unused | DEFERRED | Do not revive apps/api |
| New T2 IDB | `stitchflow-t2` v1 | created empty | ACTIVE infrastructure | — |

No existing user localStorage was deleted or rewritten by T2.
