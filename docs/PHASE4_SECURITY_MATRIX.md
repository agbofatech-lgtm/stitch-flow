# PHASE 4 SECURITY MATRIX
Legend: WS = requireWorkspace (membership re-verified per request) · RL = rate limit · A = audit event · V = validation

| Endpoint | Auth | Workspace scope | Role | Validation | Rate limit | Audit | Tests |
|---|---|---|---|---|---|---|---|
| POST /auth/register | public | n/a | n/a | zod | authRateLimit | user_registered | auth.test, phase4 |
| POST /auth/login | public | n/a | n/a | zod | authRateLimit | user_logged_in | auth.test |
| POST /auth/refresh | refresh token (single-use consume) | n/a | n/a | zod | authRateLimit | — | auth.test, phase4 (concurrent/expired/replay) |
| POST /auth/logout | refresh token | n/a | n/a | zod | authRateLimit | user_logged_out | auth.test |
| GET/POST /admin/* | JWT | n/a | platform admin | pagination caps | apiRateLimit | reads audit_logs | admin.test |
| POST /licenses/validate | public | n/a | n/a | zod | licenseRateLimit | license events | license.test |
| POST /sync/push · GET /sync/pull | JWT | WS (push) | member | zod | syncRateLimit | sync_push | sync.test |
| GET /sync/changes · POST /sync/mutations | JWT | WS | member | zod (cursor regex, uuid cmid, op enum, ≤200 batch) | syncRateLimit | processed_mutations ledger | sync-v2.test |
| /customers CRUD | JWT | WS in every query | member | manual (name/phone/email) | apiRateLimit | change log | api-crud, tenant-isolation |
| /orders CRUD + production-stages | JWT | WS + order-ownership guard | member | manual + stage enums | apiRateLimit | change log | api-crud, tenant-isolation |
| /invoices CRUD | JWT | WS + customer ownership | member | finite/non-negative money (Phase 4) | apiRateLimit | change log | phase4, financial |
| /payments GET/POST | JWT | WS + FOR UPDATE invoice lock | member | amount>0 finite; cmid idempotency | apiRateLimit | payment_created / payment_failed (Phase 4) | financial, phase4 |
| /materials fabrics+usages | JWT | WS (+order anchor) | member | unit match, qty>0, stock CHECK | apiRateLimit | change log/tombstones | financial, tenant-isolation |
| /dashboard, /reports | JWT | WS in every aggregate | member | n/a (reads) | apiRateLimit | — | tenant-isolation |
| /settings + workspace-members | JWT | WS (server-derived; client hint ignored) | **owner/admin for mutations (Phase 4)** | manual | apiRateLimit | — | phase4 role matrix, sync.test |
| GET /health, GET / | public | n/a | n/a | n/a | apiRateLimit | — | api-crud |

Global: helmet, JSON limit, env-driven CORS (production allowlist; wildcard forbidden), sanitized error envelope with requestId, pino-http request logging.
Role model note: assistant = full business read/write within membership; workspace administration (settings, members) = owner/admin. Finer per-flag permissions (can_manage_*) remain data-only — documented P2.
