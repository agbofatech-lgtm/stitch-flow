# P18 Security Audit

Do not PASS by assumption.

| Control | Evidence | Verdict |
|---|---|---|
| Unauthenticated business CRUD default off | `createApp()` `mountBusinessRoutes` default false; T1 | **PASS** (default runtime) |
| `/health` `/ready` public | app.ts | FACT — readiness only; `database: not-verified` |
| JWT helpers | `authService.ts` exists | **CONDITIONAL** — live login/logout matrix not run |
| Tenant A→B isolation | types have workspaceId | **UNKNOWN** — no executed isolation test in this phase |
| Direct `/customers` when unmounted | T1 forensic + sync engine block | **PASS** for default app |
| Secrets in repo | `.env.example` placeholders only; no OPENAI keys | **PASS** for scanned names |
| Client-side API keys for AI | none | **PASS** |
| Error leakage / pentest | not performed | **UNKNOWN** |
| CORS `origin: true` | app.ts | **CONDITIONAL** — permissive for dev |

Security certification: **CONDITIONAL**.
