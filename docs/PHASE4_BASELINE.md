# PHASE 4 BASELINE — recorded before production hardening

1. **Git checkpoint:** `521235f` (= tag `phase-3.5-client-offline-foundation-complete`, verified on origin). Tree clean.
2. **Branch:** `arena/01a04183-stitch-flow` (session-fixed; documented deviation — no new branch; `main` untouched at `b576c3e`).
3. **Remote:** github.com/agbofatech-lgtm/stitch-flow.
4. **Architecture:** React/Vite PWA (localStorage AppContext + IndexedDB offline foundation) ↔ Express/PostgreSQL backend with workspace tenancy + sync change log. Monorepo: apps/web, apps/backend, apps/mobile (Capacitor scaffold), apps/api (orphan reference tree).
5. **Authentication:** JWT HS256 (iss/aud pinned), bcrypt, refresh rotation + revocation, sha256-hashed refresh at rest, login/register/refresh/logout routes, zod validation, rate limits. No login UI (client API exists).
6. **Authorization:** platform RBAC (`requireRole('admin')` on /admin); workspace membership re-verified per request (`requireWorkspace`). Workspace-level role (owner/admin/assistant) exists in `workspace_users` but is NOT yet enforced per-route (all members equal on business routes) — Phase 4 item.
7. **Multi-tenancy:** all business tables carry NOT NULL+FK `workspace_id`; every business query scoped; client-supplied workspace ids never authorize; HTTP cross-tenant matrix tested.
8. **Server sync:** `sync_changes` (workspace, seq BIGSERIAL cursor, client_mutation_id), `processed_mutations` ledger, GET /sync/changes (paginated), POST /sync/mutations (207, event-lane rejection), v1 push/pull retained.
9. **Client sync:** single-flight engine, event-lane routing, cursor-transactional delta apply, tombstones + anti-resurrection, 401→coordinated refresh→retry, pause-preserving queue. 38/38 tests.
10. **Dexie/IndexedDB:** single canonical DB, schema v1→v2 tested, syncMeta cursor, migration from localStorage (idempotent/non-destructive).
11. **Local repositories:** 8 canonical, atomic write+queue, repository-level workspace boundary.
12. **Sync queue:** pending/processing/synced/failed, bounded backoff (cap 5min, 8 retries), stale-processing recovery, FIFO.
13. **Financial:** POST /payments transactional (FOR UPDATE + reconciliation + sync events in one tx), cmid idempotent, immutable events, concurrent payments preserved. Client modal sends cmid. NO payment audit-log event yet. Invoice POST/PUT accept non-finite totals (`Number(x)` without isFinite guard) — Phase 4 item.
14. **Inventory:** usage+stock atomic (FOR UPDATE + CHECK≥0), cmid idempotent, tombstoned deletes restore stock.
15. **PWA/SW:** manifest+icons only; NO service worker (documented since 3.5) — Phase 4 item.
16. **DB/migrations:** runner with schema_migrations tracking, per-migration transactions, --verify; migrations 001–010; startup schema verification (no runtime DDL).
17. **API security:** helmet, JSON limit 10mb, zod on platform routes, sanitized errors, rate limits on auth/license/sync/events. CORS = `origin:true` (permissive; preview-env necessity) — Phase 4: environment-driven. No global business-route limiter.
18. **Environment:** getEnv validation, secrets required in prod (no fallbacks for JWT secrets/DB URL), `.env.example` placeholders only, no `.env` committed.
19. **Observability:** pino + pino-http (request logs w/ ids), silent in tests; error responses lack correlation id — Phase 4 item.
20. **Audit logging:** audit_logs table; events for register/login/logout/sync push/license ops; admin-only read. Missing: PAYMENT_CREATE — Phase 4 item.
21. **Test baseline:** backend 69/69 (9 suites); client offline 38/38 (4 suites); Phase 1 smoke PASS.
22. **Build baseline:** web/backend/root builds PASS; tsc 0/0.
23. **Security surface:** no secrets in repo/bundle (grep-verified); parameterized SQL; hashed refresh; forged-claim tests. Concurrent refresh not single-use (both racers may rotate) — Phase 4 item. ESLint not configured (since original repo) — Phase 4 decision required.
24. **Performance surface:** unbounded list endpoints (customers/orders/invoices/payments/fabrics return full sets); sync paginated; dataset sizes small (tailoring shops); measured client perf in 3.5 docs.
25. **Known limitations carried in:** R1 UI read path (AppContext), R2 offline payment UX, R3 no SW, no login UI; apps/api orphan; mobile config mismatches.
26. **Proposed Phase 4 remediation:** (a) auth: single-use concurrent-safe refresh consumption + expired-refresh tests; (b) authz: enforce owner/admin-only workspace-member & settings mutations (existing role model, no invented roles) + matrix tests; (c) validation: finite/negative guards on invoice money fields + tests; (d) financial: PAYMENT_CREATE/PAYMENT_FAILURE audit events + tests; (e) API: env-driven CORS (prod allowlist), lenient general API rate limit, requestId in error envelope; (f) R2: payment modal offline queue fallback (engine-tested helper) + pending-sync messaging; (g) login/logout/account panel in Settings (wires existing auth client; safe logout messaging); (h) PWA: vite-plugin-pwa (generateSW, autoUpdate, API excluded from caching, no mutation caching) + build-level verification — browser-level offline reload testing NOT possible in this environment and will be reported as partial; (i) ESLint: establish config, report exact findings honestly; (j) docs: migration guide, backup/recovery, retention, security matrix, sync reliability, risk register; (k) dependency audit with reasoned dispositions; (l) R1: formal disposition (AppContext = in-memory UI store over durable IndexedDB mirror; full cutover deferred with rationale).

**Documentation discrepancy (per §5):** PHASE1_BASELINE/CHANGELOG/FINAL_REPORT and PHASE2_* files do not exist; Phase 1 report is docs/PHASE1_REPORT.md; Phase 2's report was delivered in-session and encoded in commit f31f1d7's message. Not fabricated here.
