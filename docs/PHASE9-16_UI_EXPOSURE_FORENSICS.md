# StitchFlow — Phase 9–16 UI Exposure & Integration Forensics

**Date:** 2026-08-29 · **Branch:** `arena/01a04eef-stitch-flow` (aligned to certified Phase 16 baseline `9bddf6f`)
**Environment:** Linux sandbox replica — Node v22.22.3, PostgreSQL (port 5434), backend :5000, frontend :5173/5174, migrations 001–021 applied via the official runner.
**Scope:** Forensic integration audit of Phase 9–16 discoverability. Phase 17 NOT started. Protected IP untouched (ZERO DIFF verified pre- and post-repair vs `phase-15-complete`).

---

## A. Executive Verdict

Nothing from Phases 9–16 is "missing from the database" — the missing-sidebar-items theory was wrong in both directions. (1) The **Developer/Control Center surfaces exist and work**, but `admin2@example.com` never actually received platform authorization: platform roles in this codebase are values of the **`users.role` column**, minted into the JWT at login and enforced server-side; the hand-created `platform_roles` table is **read by nothing** (no migration, no repository, no middleware references it), so granting rows in it can never change what the frontend receives — which is exactly why logging out and back in changed nothing. (2) The Developer/Control Center/Settings sidebar entries sit **below the fold** of the scrollable nav at a 768 px laptop viewport (measured live: Developer y=738, Control Center y=800, Settings y=862), so even the unconditional "Developer" item was invisible without scrolling. (3) The four Phase 13–16 intelligence surfaces (Measurement, Design, Pattern & Cutting, Fabric & Production) were **genuinely unreachable**: their only mount point, `CustomerDetail.tsx`, has had **no importer since the Phase 1 scaffold** — every phase stacked its UI into an orphaned component while the reachable Customers screen opens `CustomerOrdersModal` instead. One minimal repair (2 files, +49 lines) wired `CustomerDetail` into the Customers screen as a contextual "Intelligence" action; all four sections now render live against the real backend, verified end-to-end in a browser (including a `201 POST /customers/:id/design-specifications` write).

---

## B. Baseline Verification

| Item | Result |
|---|---|
| Authentic Phase 16 commit `9bddf6f` | ✅ exists; equals `origin/arena/01a04d15-stitch-flow`; message `docs(phase16): align browser certification with stop-loss directive` |
| Phase tags 9→16 | ✅ all intact (`phase-9-auth-certified` … `phase-16-certification-recovery`); phase-17 tags present but untouched/paused |
| Working tree | ✅ clean at start; after repair: exactly 2 modified files (intended) |
| Protected IP vs `phase-15-complete` | ✅ **ZERO DIFF** (verified before and after repair) |
| Environment | ✅ PostgreSQL on 5434, migrations 001–021 via `npm run migrate` (ledger `schema_migrations`), backend :5000 (dev), web :5173 |
| Note | Sandbox clone arrived grafted at scaffold `b576c3e`; after `git fetch --all --tags --prune` the authentic lineage was present and the session branch was aligned to `9bddf6f` (no history rewrite, no tag moves, no force-push) |

## C. Root Cause (exact technical explanation)

1. **Authorization model reality:** platform roles are `users.role` values (`platform_owner|platform_admin|platform_support|platform_analyst` + legacy bootstrap `admin`) — migration `014_phase7_intelligence.sql`. Login (`authService.login`) mints `role: user.role` into the JWT; `requirePlatformRole` reads `req.user.role` (the verified JWT claim); the frontend gate `isPlatformRole(getAuthRole())` decodes the same claim from localStorage. **No code path anywhere queries a `platform_roles` table** — it does not exist in any migration (72-table schema verified live) and appears in zero source files.
2. **Why re-login changed nothing:** the JWT is re-minted from `users.role` on every login. `admin2@example.com` was created via registration (`role='user'`). Rows inserted into a hand-made `platform_roles` table are invisible to this chain — reproduced live: flags ON + phantom grant + login ⇒ JWT `role:"user"`, `/platform/*` ⇒ 403 `FORBIDDEN`, no Control Center nav item.
3. **Sidebar fold:** `Layout.tsx` nav is `overflow-y-auto` inside a fixed-height aside. At 1366×768 the 8 visible items end at Materials (y=614) + the "STUDIO Plan" tier badge — precisely the user's reported list. Developer (y=738), Control Center (y=800), Settings (y=862) require scrolling.
4. **Phase 13–16 orphan:** `CustomerDetail.tsx` (which renders `MeasurementIntelligence`, `DesignIntelligence`, `PatternIntelligenceSection`, `ProductionIntelligenceSection`) has no importer at `phase-13-complete`, `phase-14-complete`, `phase-15-complete`, `8f56413`, `9bddf6f` — or in the Phase 1 scaffold. The reachable card click opens `CustomerOrdersModal`. Frontend tests (142/142) render panels in isolation, so the gap was never caught: *tests pass ≠ feature reachable*.
5. **Feature flags are server-side only** (`feature_flags` table, global scope, seeded OFF, enforced by `requireFeatureFlag` failing closed). They are **not** part of the login/session response — there is no `/me`/`/session` endpoint at all. The Developer console learns a flag is off by receiving `403 FEATURE_DISABLED`. With flags OFF the console renders: *"This capability is currently disabled for the deployment (feature flag OFF). Ask a platform administrator to enable it."* — reproduced live.

## D. Authentication Trace (live evidence)

```
POST /auth/login (admin2@example.com)
→ authService.login → userRepository.findByIdentifier (users table)
→ workspaceRepository.firstMembershipForUser (tenant resolution: workspaceId claim)
→ JWT {sub, email, role: user.role, workspaceId}  ← platform role enters HERE or never
→ response {user, accessToken, refreshToken}      ← no platformRoles, no feature flags (by design)
→ frontend storeAuthTokens(localStorage) + AUTH_CHANGED_EVENT
→ App.tsx route gate → AuthenticatedApp
```
- Login response schema (recorded live): `{ user: {id, email, full_name, role, status…}, accessToken, refreshToken }`. No `/me`, `/session`, `/profile`, `/auth/context`, `/permissions`, `/features` endpoints exist — the JWT claim is the single identity/permission carrier; the app is offline-first.
- Refresh rotates single-use; logout revokes the refresh token server-side and clears both tokens from localStorage (verified live: keys `stitchflow.auth.accessToken/refreshToken` gone, URL → `/login`). Local business data is deliberately preserved (documented Phase 4 policy) — **no stale-permission risk**: the role is always re-derived from the fresh JWT.

## E. Platform Role Trace — `admin2@example.com`

| Step | Evidence | Verdict |
|---|---|---|
| user lookup | registered via `POST /auth/register` → `id ace0108b-…`, `role:'user'` | PASS |
| tenant | workspace `ws-e9554573-…` via first membership → `workspaceId` claim | PASS |
| `platform_roles` lookup | **table does not exist in schema; no code reads any such table** | N/A (phantom) |
| role value reaching JWT | `role: user.role` — grant in phantom table has **zero effect** | **FAIL (as operated)** |
| backend authorization | `requirePlatformRole` checks JWT claim → `/platform/overview` = **403 FORBIDDEN** with `role:'user'` | FAIL (as operated) |
| auth/session API response | `{user, accessToken, refreshToken}` — no platform/flag payload (by design) | N/A |
| frontend context | `getAuthRole()` decodes JWT → `isPlatformRole('user')` = false → Control Center hidden; `/platform` deep-link shows "Platform access required" | FAIL (as operated) |
| navigation gate | gate itself is **correct** — with `users.role='platform_owner'`: JWT carries it, Control Center appears, `/platform/*` = 200 (verified live) | PASS (code) / FAIL (data) |

**Fix (operational, no code change):** `UPDATE users SET role='platform_owner' WHERE email='admin2@example.com';` then sign out/in — verified working. Sanctioned UI path: sign in as bootstrap operator `admin@stitchflow.app` (seeded role `admin` = bootstrap platform owner) → Control Center → **Operators** → grant role (`POST /platform/operators` → `UPDATE users SET role`).

## F. Feature Flag Trace

| Flag | DB (`feature_flags`, global) | Backend resolver | API exposure | Frontend consumer | UI gate |
|---|---|---|---|---|---|
| DEVELOPER_API | row exists, seeded `false`; verified ON in test | `requireFeatureFlag` on `/developers` | implicit (403 when off) | `DeveloperDashboard` (error banner when off) | none needed — "Developer" nav is unconditional |
| WEBHOOK_MANAGEMENT | same | `/webhooks` router-level | implicit | DeveloperDashboard Webhooks tab + ControlCenter WebhooksSection | same |
| USAGE_DASHBOARD | same | usage surfaces | `/usage/summary` etc. | DeveloperDashboard + ControlCenter UsageSection | same |
| DEVELOPER_DASHBOARD | same | (Phase 8 console banner) | implicit | DeveloperDashboard | same |

Flags are **global deployment toggles**, not tenant permissions; they travel as request-time enforcement, not as client payload. Verified live: ON ⇒ `/developers/scopes`, `/developers/keys`, `/webhooks/endpoints`, `/webhooks/deliveries`, `/usage/summary` all 200 for a workspace member; OFF ⇒ console shows the flag-OFF notice. Toggled at runtime via Control Center → Feature Flags (`PATCH /platform/flags/:key`, platform-write role).

## G. Navigation Architecture (intended & actual)

Tailor app = state-driven views (`AppContext.currentView`) with URL sync for `/developer` + `/platform`. Sidebar: Dashboard, Customers, Orders, Production Board, Invoices, Design Studio, Materials, Reports, Developer (unconditional), Control Center (platform-role hint), Settings. **No React Router for business views; deep links exist only for auth/developer/platform families.**

Intended journey (confirmed by cascade copy in the code): **Customers → Intelligence (Measurements → Design Spec → Pattern → Cutting) → Fabric/Production → QC**, with Design Studio reachable from measurement profiles ("Load into Studio") and from design specs (`DesignStudioAdapter`). Phase 15/16 panels deliberately cascade: *"Create a Design Specification in the Design Intelligence section above"* / *"Create one in Design Intelligence, then derive a Pattern in Pattern Intelligence."*

## H. Phase 9–16 Exposure Matrix

| Phase | Capability | Impl. exists | Intended UX location | Route | Auth/role gate | API connected | Manually reachable | Status |
|---|---|---|---|---|---|---|---|---|
| 9 | Identifier login (email/phone), recovery | ✅ | Login/forgot/reset pages | `/login` `/register` `/forgot-password` `/reset-password` | public | ✅ live 200s | ✅ verified | WORKING |
| 9 | Account provisioning, tenants | ✅ | register → license+workspace+trial | API | public | ✅ | ✅ | WORKING |
| 10 | Developer Control Center (9 sections) | ✅ | Sidebar "Control Center" / `/platform` | `/platform` | platform role (JWT claim) | ✅ live 200s | ✅ after `users.role` fix + scroll | AUTHORIZATION BUG (data/ops) — code correct |
| 10 | Operator role management | ✅ | CC → Operators | `POST /platform/operators` | platform-write | ✅ | ✅ | WORKING |
| 8/10 | API Keys (Developer API) | ✅ | Sidebar "Developer" → API Keys / `/developer` | `/developer` | staff JWT + workspace + DEVELOPER_API flag | ✅ live | ✅ (below fold) | WORKING (flag must be ON) |
| 8/10 | Webhook management + deliveries | ✅ | Developer console tab + CC section | same | WEBHOOK_MANAGEMENT flag | ✅ live | ✅ | WORKING (flag) |
| 7/8 | Usage dashboard | ✅ | Developer console + CC Usage | `/usage/summary` | staff + workspace | ✅ live | ✅ | WORKING |
| 11 | Component/motion/overlay design system | ✅ | foundation (no own screen intended) | — | — | — | — | INTENTIONALLY NOT TOP-LEVEL |
| 12 | Public landing experience | ✅ | `/` unauthenticated | `/` | public | n/a | ✅ live render | WORKING |
| 12 | Customer portal foundation (separate audience) | ✅ backend | separate token audience `stitchflow-portal`; read-only login/profile/orders/appointments API | `/portal/*` | portal token | ✅ (backend suites) | no web UI by design | INTENTIONALLY NOT TOP-LEVEL |
| 12 | Customer booking UI | ❌ web | appointments API exists (`/appointments`) | — | — | ✅ backend | ❌ no web/app UI | NOT IMPLEMENTED (UI) |
| 13 | Measurement profiles/history/validation/suggestions | ✅ | **Customer → Intelligence** | view-internal | staff + workspace | ✅ live 200s | ❌ before repair → ✅ after | ROUTING BUG (repaired) |
| 14 | Design Inspiration | ✅ | Customer → Intelligence → Design | view-internal | staff | ✅ | ❌ → ✅ | ROUTING BUG (repaired) |
| 14 | Fabric Profile | ✅ | same | view-internal | staff | ✅ | ❌ → ✅ | ROUTING BUG (repaired) |
| 14 | Design Specification (+ Studio adapter) | ✅ | same → "Open in Design Studio" | view-internal | staff | ✅ live `201` write | ❌ → ✅ | ROUTING BUG (repaired) |
| 15 | Pattern pieces/validation/readiness | ✅ | Customer → Intelligence → Pattern (after spec) | view-internal | staff | ✅ | ❌ → ✅ | ROUTING BUG (repaired) |
| 15 | Cutting layout/instructions/metrics | ✅ | same | view-internal | staff | ✅ | ❌ → ✅ | ROUTING BUG (repaired) |
| 16 | Fabric consumption / purchasing / workflow / QC / readiness | ✅ | Customer → Intelligence → Production (after spec+pattern) | view-internal | staff | ✅ | ❌ → ✅ | ROUTING BUG (repaired) |
| 16 | Production Board (order stages) | ✅ | Sidebar "Production Board" | view | staff | ✅ live (orders + stage transitions) | ✅ | WORKING |
| 16 | Materials (local-first) | ✅ | Sidebar "Materials" | view | — | local store | ✅ | CONTEXTUALLY INTEGRATED |

## I. Defects Found (verified)

1. **ROUTING BUG — `CustomerDetail` orphaned since Phase 1.** Sole mount point of all four Phase 13–16 intelligence sections; zero importers at every tag from scaffold → `9bddf6f` (verified via `git grep` at each tag). Runtime-verified: customer card opened `CustomerOrdersModal`; no intelligence markup in DOM.
2. **AUTHORIZATION (operational, not code) — platform role grant attempted via non-existent `platform_roles` table.** The app's role chain is `users.role` → JWT claim → `requirePlatformRole`/frontend hint. No code defect; the laptop's grant mechanism was invalid. (Bootstrap operator `admin@stitchflow.app` exists for sanctioned grants.)
3. **UX (documented, no code change) — sidebar fold.** At 768 px viewport height, Reports/Developer/Control Center/Settings are below the fold in the scrollable nav (measured live), which amplified the "missing features" perception.
4. Non-defects (checked and cleared): stale auth cache after logout (tokens fully cleared; role always re-derived), frontend/backend DB mismatch (single DATABASE_URL verified), tenant filtering (workspaceId claim correct), feature-flag propagation (server-side by design), customer/tailor separation (portal audience isolation is structural).

## J. Repairs Made

| File | Change |
|---|---|
| `apps/web/src/components/CustomerDetail.tsx` | optional `customer?: { fullName }` display-override prop so API-backed customers (absent from the local-first store) still render; backend id preserved for the `/customers/:id/…` intelligence APIs (+13 lines) |
| `apps/web/src/components/Customers.tsx` | contextual **Intelligence** action on each customer card → full-screen `CustomerDetail` with Back button; no sidebar additions (+38 lines) |

Protected IP: untouched (ZERO DIFF re-verified). One focused commit on `arena/01a04eef-stitch-flow`.

## K. Manual Validation (real-browser journeys, headless Chromium 149, live stack)

- **Journey A (tailor):** login → Dashboard (API `/dashboard/summary` 200) → Customers (API list 200) → **Intelligence** → all four sections render; `GET /measurement-definitions?garmentType=shirt|trouser|kaftan|dress|jacket` 200; `GET /customers/:id/measurement-profiles` 200; spec created via UI (`201 POST …/design-specifications`); cascade messaging correct; Back returns to list.
- **Journey B (platform owner):** with `users.role='platform_owner'` + flags ON: Control Center nav present, `/platform` renders all 9 sections, `/platform/overview|workspaces` 200; Developer console tabs (Overview/Usage/API Keys/Webhooks/Deliveries) all 200. With `role='user'` + flags OFF (laptop "before" state reproduced): 10 nav items (no CC), console shows flag-OFF notice, `/platform` shows "Platform access required".
- **Journey C (customer-facing):** `/` renders Phase 12 public landing (verified); portal APIs use separate audience (structural isolation).
- **Logout/cache:** tokens cleared, back to `/login`, local data preserved by documented policy.

## L. Automated Validation (focused)

- Web: `142/142 PASS`; `tsc -p apps/web` 0 errors; production build PASS (PWA precache 48 entries).
- Backend: `tsc --noEmit` 0 errors; focused suites against isolated test DB: phase8-developer-api + phase8-webhooks + phase10-control-center **67/67 PASS**; phase13–16 suites **146/146 PASS**.
- Laptop's historical 22 statement-timeout failures: not reproduced in the suites gating these surfaces; unrelated to UI exposure (heavy performance/integrity suites under Docker filesystem timing).

## M. Protected IP Verification

`git diff phase-15-complete -- DesignStudio.tsx patternEngine.ts productionAssistant.ts` → **ZERO DIFF** (before repair, and re-verified after repair + tests + build).

## N. Git State

- Branch `arena/01a04eef-stitch-flow` = `9bddf6f` + one repair commit (`fix(web): expose Phase 13-16 intelligence via CustomerDetail`).
- Tags untouched; no force-push; no history rewrite; `phase-17-*` tags untouched.

## O. Phase 17 Readiness Decision

**READY AFTER SPECIFIC LAPTOP TEST** — the two sandbox-side defects are fixed/verified, but the laptop must apply the operational fix and confirm in its own browser:
1. `UPDATE users SET role='platform_owner' WHERE email='admin2@example.com';` (or grant via CC → Operators as `admin@stitchflow.app`), sign out/in;
2. confirm flags `DEVELOPER_API`, `WEBHOOK_MANAGEMENT`, `USAGE_DASHBOARD` are `true` in the **same** database `DATABASE_URL` points at (Control Center → Feature Flags or SQL);
3. scroll the sidebar (or raise window height) to see Developer/Control Center;
4. open Customers → any customer → **Intelligence** → confirm the four sections render with live API data.
