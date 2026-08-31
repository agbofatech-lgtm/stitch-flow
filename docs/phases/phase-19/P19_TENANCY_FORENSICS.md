# P19 Tenancy Forensics

**Who is the tenant?** **UNKNOWN / UNDECIDED.** Candidates: Workspace (present), Organization (absent), Account (absent), Business (UI language only).

| Layer | Evidence | Isolation |
|---|---|---|
| Types | `workspaceId` on Customer, Order, Invoice, Payment, profiles, fabrics | field exists |
| Frontend | `currentWorkspace` in AppContext; mock single workspace | **APPLICATION mock** |
| API | settingsRoutes default `'default-workspace'`; paymentRoutes `SELECT * FROM payments` **no workspace filter** in first lines | **LEAK RISK if mounted** |
| Middleware | `auth.ts` empty | **ABSENT** |
| DB | `002_create_core_tables.sql` **empty file** | **ABSENT / UNKNOWN** |
| RLS | not found | **ABSENT** |
| P18 | tenant isolation not live-tested | **UNKNOWN** |

```
TENANCY AUTHORITY: PARTIAL (Workspace concept) / not established as verified tenant
TENANT ISOLATION: APPLICATION mock only
CROSS-TENANT LEAK RISK: YES if unauthenticated business routes mounted; UNKNOWN in product UI
```

Do not claim multi-tenancy because `workspaceId` exists.
