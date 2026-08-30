# Phase 18 — Pre-Stage 13 Capability Reconciliation Audit

**Read-only forensic audit. Baseline `96e4848` (Stage 12 accepted). Zero production-code changes.**
Evidence classes: VERIFIED · INFERRED · PROPOSED · UNRESOLVED (+ BLOCKED where applicable).

---

## PART A — Mandate & Boundaries

Audit purpose: determine whether Phase 18 (Stages 5–12) preserved, integrated, deferred, duplicated, orphaned, or lost the meaningful capabilities that existed in the repository before/alongside modernization. **Read-only**: no screen redesigns, no feature work, no migrations, no refactors, no domain/backend/schema/auth changes, no a11y/perf remediation, no Stage 13/14/Phase 19+ work. Discover → trace → verify → classify → reconcile → document → STOP.

## PART B — Baseline Verification (run, not assumed)

| Check | Result |
|---|---|
| Branch | `arena/01a04eef-stitch-flow` ✓ |
| HEAD | `96e4848` = remote tip (fetch verified) ✓ |
| Tree | clean (0 modified) ✓ |
| Tests | **307/307 (20 files)** ✓ matches Stage 12 |
| TypeScript | **0 errors** ✓ |
| Build | **PASS** ✓ |
| Precache | **116 entries / 6411.36 KiB** ✓ matches Stage 12 |
| Warnings | pre-existing only: React `act()` deprecation noise, one `fetchPriority` DOM-prop warning (Stage 11 landing, cosmetic — React wants lowercase), chunk-size advisory. No new warnings. |

## PART C — Historical Navigation Inventory (legacy destinations)

Dashboard · Customers · Orders · Production Board · Invoices · Design Studio · Materials · Reports · Developer · Settings (all verified as legacy components in `apps/web/src/components/`).

## PART D — Current Navigation Inventory

Stage 6 shell (`shell/navigation.ts`): PRIMARY = Home · Customers · Orders · Production · Finance; SECONDARY = Materials · Reports · Design Studio · Settings; conditional = Developer (unconditional today) · Platform Control Center (platform role claim). View switcher (`AuthenticatedApp.tsx`) maps: dashboard→HomeView · customers→CustomersView · orders→**Orders (legacy)** · production-board→ProductionView · invoices→FinanceView · design-studio→DesignStudio · materials→**Materials (legacy)** · reports→**Reports (legacy)** · settings→**Settings (legacy)** · developer→**DeveloperDashboard (legacy)** · platform→ControlCenter.

## PART E — Navigation Reconciliation Matrix (mandatory)

| Legacy item | Legacy component | Current equivalent | Discoverable | Functional | Authorization | Classification |
|---|---|---|---|---|---|---|
| Dashboard | `Dashboard.tsx` (940 ln) | HomeView (Stage 7, server `/dashboard` APIs) | Yes (Home) | Yes | auth | **INTEGRATED**; legacy file retained unreferenced (Stage 7 documented deferral) |
| Customers | `Customers.tsx` | CustomersView + reused CustomerDetail/AddCustomerModal | Yes | Yes (list/search/create via API) | auth | **INTEGRATED**; edit modal orphaned (Part M) |
| Orders | `Orders.tsx` | **itself — active** (local-store order CRUD + Stage 8 addOrder path) | Yes | Yes | auth | **PRESERVED (legacy-active)** |
| Production Board | `ProductionBoard.tsx` (1,285 ln) | ProductionView (Stage 10, canonical API stages) | Yes | Yes | auth | **INTEGRATED**; legacy file retained unreferenced (Stage 10 documented) |
| Invoices | `Invoices.tsx` (list) | FinanceView (Stage 10; **InvoiceModal reused**) | Yes | Yes | auth | **INTEGRATED**; legacy list retained unreferenced |
| Design Studio | `DesignStudio.tsx` (protected) | itself | Yes (nav + contextual entries) | Yes | auth | **PRESERVED** |
| Materials | `Materials.tsx` | itself — active | Yes (sidebar + More) | Yes (local store) | auth (device-local) | **PRESERVED (legacy-active)** — see Part K |
| Reports | `Reports.tsx` (2,041 ln) | itself — active | Yes (sidebar + More) | Yes (computes) — **inputs seeded on first run** | auth + client tier gate | **PRESERVED with P1 integrity finding** (Parts F–H) |
| Developer | `DeveloperDashboard.tsx` | itself — active | Yes (unconditional nav) | UI loads; all APIs **fail closed** (flag off) | auth + requireWorkspace + `DEVELOPER_API` flag (server) | **PRESERVED**; visibility model UNRESOLVED (carried, Stage 6 §20) |
| Settings | `Settings.tsx` | itself — active | Yes (sidebar + More) | Yes | auth; server mutations owner/admin | **PRESERVED (legacy-active)** |

No legacy destination is unreachable at the navigation level; nothing was silently removed.

## PART F — Reports & Business Intelligence Forensics

`Reports.tsx` is a **substantial, real module** (2,041 lines), NOT a placeholder. Verified inventory:

- **Executive Intelligence** (free tier): Revenue This Month, Revenue This Week, Unpaid Balance Total, Overdue Amount, Paid Invoices This Month, unpaid/overdue counts, Top Customer, Repeat Customer Count, Top Order Type + share, Completion Rate, Active Workflow Orders, Overdue Orders, Average Customer Order Value.
- **Production Intelligence** (free): orders-in-range KPIs, stage distribution (`buildOrdersByStage`), open/ready-for-delivery/overdue counts, average turnaround days, delivered-vs-range. **Studio-gated**: material consumption by garment type, bottleneck view (`getBottleneckView`).
- **Financial Intelligence**: revenue-by-month (6-mo) and revenue-by-week (7-day) trends, Paid vs Unpaid totals, overdue-invoice trend (6-mo), completion trend, overdue-orders trend.
- **Customer Intelligence**: top-5 customers by spend, repeat customers (≥2 orders), customers with pending balances, per-customer AOV.
- **Material Intelligence**: most-used materials, usage cost, slow-moving (active, zero usage), inactive materials, low-stock (≤ reorder level), total usage cost.
- **Order Intelligence**: best-selling order types (count + revenue), workflow distribution (status counts).
- **Studio Insights** (tier-gated): customer base, orders logged, materials tracked, usage records + derived revenue-health/operations-risk/inventory-exposure tiles.
- Date-range presets incl. custom range for production analytics (`resolveReportingDateRange`).

**Data source (critical)**: everything computes from **AppContext local persisted state** (`persisted.payments/invoices/orders/customers/fabricRecords/materialUsages` — localStorage + IndexedDB mirror). The Reports UI makes **zero API calls**. The backend's own aggregates live at `GET /reports/summary` (SQL SUM/COUNT over payments/invoices/orders) — **no web client calls it** (VERIFIED zero importers).

## PART G — Analytics Metric Provenance Register (meaningful metrics)

| Metric | Calculation (verified) | Inputs | Source | Window | Empty behavior | Class |
|---|---|---|---|---|---|---|
| Revenue This Month | Σ `payment.amount` where status=captured AND paidAt in current calendar month | local payments | local store | calendar month | GHS 0.00 | VERIFIED |
| Revenue This Week | same, paidAt ≥ Monday 00:00 | local payments | local store | ISO week | GHS 0.00 | VERIFIED |
| Paid vs Unpaid | Σ totalAmount(status=paid) / Σ balanceDue(sent,partial,overdue) | local invoices | local store | all-time | GHS 0.00 | VERIFIED |
| Overdue amount/count | status=overdue → Σ balanceDue | local invoices | local store | all-time | 0 / none | VERIFIED |
| Completion rate | delivered ÷ ALL orders × 100 | local orders | local store | all-time | 0% | VERIFIED (**semantic note**: denominator includes cancelled/draft — see Part U/§22) |
| Repeat customer | ordersCount ≥ 2 (any status) | local orders | local store | all-time | — | VERIFIED (semantic note: not "≥2 paid") |
| Top customer / spend | Σ payments joined via order.customerId | payments+orders | local store | all-time | "No customer insights yet" | VERIFIED |
| Top order type + % | count by `orderType`, share = count/total | local orders | local store | all-time | — | VERIFIED |
| Turnaround days | avg(delivered−createdAt) | local orders | local store | selected range | "No completed stage timing yet" | VERIFIED |
| Bottleneck | stage with max mean stage-dwell (`getBottleneckView`) | local orders | local store | selected range | "No bottleneck data yet" | VERIFIED |
| Stage distribution | orders bucketed by canonical stage (`buildOrdersByStage`) | local orders | local store | selected range | "No production stage data" | VERIFIED |
| Overdue orders | dueDate < now AND status ∉ {delivered,cancelled} | local orders | local store | range | 0 | VERIFIED |
| Material consumption | Σ `quantityUsed` by garment type | usages+orders+fabrics | local store | range | "No material consumption yet" | VERIFIED |
| Usage cost / exposure | quantityUsed × fabric.costPerUnit | usages+fabrics | local store | all-time | GHS 0 | VERIFIED |
| Low stock / slow-moving / inactive | quantityInStock ≤ reorderLevel; zero usage & active; isActive=false | fabricRecords | local store | current | lists empty | VERIFIED |
| Offline behavior | whole module reads the device store — works offline; **never claims live server truth** | — | local | — | — | VERIFIED |
| Authorization | visible to any authenticated workspace member (both roles); "advanced" sections behind **client-side tier simulation gate** (`FeatureGate advancedReports` = tierIncludesFeature + `featureAccess.canViewAdvancedReports`, computed client-side from tierSimulation demo state) | — | — | — | — | VERIFIED (client-visibility only — no server secret exists to protect: data is local) |

## PART H — Analytics Truth Register

| Metric family | Runtime | Seed | Fixture | Hardcoded | Empty fallback | Unknown |
|---|---|---|---|---|---|---|
| All Reports calculations | **✓ (all computed at render)** | — | — | **none found** (zero hardcoded values in `Reports.tsx`/`reporting.ts`) | ✓ honest ("No … yet", GHS 0.00) | — |
| Reports **inputs** on first run | — | **✓ P1 FINDING** | — | — | — | — |
| Old values cited in mandate ("Wedding Gown 20%", "GHS 702", "GHS 2,164", "Emma Thompson", "Sophia Williams") | — | **✓ SEED — source located** | — | — | — | — |

**P1 FINDING (VERIFIED end-to-end, code + live browser):** `AppContext` → `initializeAppStorage()` (`shared/lib/db.ts`) → on first run (no storage version) calls `seedAppStorage(createSeedData(), overwrite=true)` → `createSeedData()` (`shared/lib/seedData.ts`) imports **`data/mockData.ts`** (Emma Thompson, Sophia Williams, Wedding-Gown orders, invoices, payments, dueAlerts). Nothing ever replaces `context.invoices/payments` from the server (sync only *pushes* queued payments out). Consequence, confirmed in a live browser (fresh authenticated session): the Reports view renders the demo roster **as if it were the studio's own analytics** — `Emma Thompson: true`, `Wedding Gown: true`, GHS 702.00 / GHS 2,164.00 visible. This is **not** Phase 18-introduced (the seeding predates Stage 5; Stages 7/10 wisely moved customer/order/invoice surfaces to the API), and the calculations themselves are honest — but the *inputs* are demo fabrications on first run of any real account. Per §34 this is **Outcome D** (demo analytics presented as runtime truth) — an integrity finding requiring an **owner decision** (options: empty-first-run, demo-banner, or demo-workspace switch — all outside this audit's authority).

## PART I — Developer Dashboard Forensics

`DeveloperDashboard.tsx` (857 ln) is a full control-plane UI: Overview (usage summary), **API keys** (create with scopes/revoke; secret shown once), **Webhooks** (create/test/enable-disable/delete endpoints), **Deliveries** (list + filter, dead-letters, replay). All via `developerApi` → `/developers/*` APIs. Tabs + error/notice states present. No diagnostics/flags/env screens (not present — not invented).

## PART J — Developer Authorization Trace

| Capability | UI gate | API gate | Server authority | Classification |
|---|---|---|---|---|
| See "Developer" nav item | **none — visible to every authenticated member** | — | — | UNRESOLVED (carried: Stage 6 §20 — no entitlement signal exists in `featureAccess`) |
| Any `/developers/*` call (keys, webhooks, replay) | none client-side | `authMiddleware` + `requireWorkspace` + `requireFeatureFlag('DEVELOPER_API')` | **flag-gated, fail-closed** (403 FEATURE_DISABLED / 503 FEATURE_CHECK_FAILED) | VERIFIED safe-by-flag |
| Flag state | — | — | `feature_flags` table: **DEVELOPER_API = false** (migration seed `015_…sql` line 40 AND live DB query verified) | VERIFIED disabled |
| Role granularity | — | none beyond authenticated workspace member (no `requireWorkspaceRole` on this router; comment says "staff JWT" but the enforcement is the flag) | — | INFERRED: when the flag is ON, any workspace member could manage keys — entitlement granularity question for the owner **before** the flag is ever enabled |

**§35 verdict: "UI visible but server protected"** — a discoverability/design question, NOT a security failure today (everything fails closed while the flag is off). No vulnerability patched, per mandate; nothing modified.

## PART K — Materials Module Forensics

- **Core records (11.1)**: create/edit/delete fabric records + active/inactive toggle — VERIFIED, via AppContext local store (`addFabricRecord/updateFabricRecord/deleteFabricRecord`), forms + modal in-module.
- **Inventory (11.2)**: quantity + unit tracked; **low-stock logic** (≤ reorderLevel), reorder-suggestion math (target = max(2×reorder, reorder+5)), low-stock/inactive summaries — VERIFIED.
- **Production linkage (11.3)**: material usages (`materialUsages` store; consumption by garment type in Reports; usages pushed to server via sync queue `/materials/usages`) — VERIFIED. Order workflow selects fabric (`selectedFabricId`); exact requirements remain the deterministic Phase 15→16 chain (Stage 9 honesty preserved).
- **Financial linkage (11.4)**: `costPerUnit` → usage cost, total usage cost, inventory exposure (Reports) — VERIFIED (analytics only; no billing).
- **Stage 10 reconciliation (11.5)**: Stage 10 consumed fabric context **read-only** (order materials step + requirement advisory). Standalone Materials management remains fully in the legacy module. **Server materials API exists** (`/materials` CRUD + usages, `shared/api/materials.ts` client) — **zero UI importers** (VERIFIED): the module is device-local while a server contract sits unused. Classification: module **PRESERVED (legacy-active)**; server-client **ORPHANED** (P3 contract-drift note); no capability MISSING.

## PART L — Settings Forensics

Verified categories (evidence only): **Account & Sync** (session/sync info), **Workspace identity/profile** (name, owner, phone, email, address, currency), **Branding** (logo/colours via `updateSetting('branding')`), **Current Plan + Plan Comparison** (trial/STUDIO simulation display), **Team Members** (list/invite/edit/remove via `/settings/workspace-members`).

Persistence classes:
- **Server-authoritative**: branding + workspace_profile (`PUT /settings/:key` — owner/admin via `requireWorkspaceRole`, VERIFIED), team members (owner/admin), audit-logged. Settings UI loads via `fetchSettings()` on mount.
- **Locally persistent**: collections (customers/orders/fabrics/etc.) — not Settings-domain.
- **Runtime-only mirror**: `updateWorkspaceProfile/Branding` also `setState` the in-session workspace object; the workspace object itself re-derives from `mockData.workspaces` on reload (only `currentWorkspaceId` persists) — INFERRED minor: edits persist server-side and re-hydrate on next Settings load, but other surfaces read the runtime mirror until reload. P3 note.
- **Dangerous settings**: currency (`defaultCurrency`) affects display formatting across finance surfaces; team-member removal affects access; branding affects customer-facing exports. All server-gated owner/admin; no issues modified. Workspace profile/branding mutation = **P2-class surface to keep in Stage 14 certification scope** (verified working, not re-tested here).

## PART M — Customer Ecosystem Reconciliation

| Capability | Legacy | Current access | Status |
|---|---|---|---|
| Create | AddCustomerModal (reused verbatim) | CustomersView + OrderWorkflow fallback add | **INTEGRATED** ✓ |
| Search | name/phone/email | CustomersView search (same fields) | **INTEGRATED** ✓ |
| View | list + CustomerDetail | workspace + CustomerDetail reused | **INTEGRATED** ✓ |
| Edit | `EditCustomerModal` + `updateCustomer` API | **NOT reachable** — CustomersView never mounts it (legacy screen unmounted) | **ORPHANED (P2)** — Stage 7 documented as owner-decision follow-up; VERIFIED implementation exists, path does not |
| Delete | — | — | **NEVER EXISTED server-side** (no DELETE route in `customerRoutes.ts`; only `deleted_at IS NULL` filters; no `deleteCustomer` in `customerApi`) — **Stage 7 doc line 45 corrected**: it claims edit/delete "exist in customerApi"; only edit does. Not a regression (nothing was lost); doc accuracy P3 |
| Orders / Measurements / Designs | CustomerDetail | reused inside Stage 7 workspace | **INTEGRATED** ✓ |
| Payments | deferred to Finance (Stage 7) | Finance (Stage 10) has invoice/payment ops; **no per-customer finance rollup exists anywhere** | **DEFERRED → now UNRESOLVED integration gap (P3)**: Customer→Orders→Invoices→Payments chain exists in data (invoices carry customerId) but no surface links a customer to their invoices from the customer workspace |
| Intelligence | readiness strip (Stage 9) | in workspace; full surface in CustomerDetail | **INTEGRATED** ✓ |

## PART N — Protected Capability Discoverability

**Design Studio** (protected, untouched — verified 0-diff in Part Y):
- **Navigation**: SECONDARY_NAV "Design Studio" (desktop sidebar + mobile More) ✓ — labeled "Legacy entry" in More hint.
- **Order context**: Stage 8 OrderWorkflow post-confirm handoff (`selectOrder(id)` + `setView('design-studio')`) ✓ VERIFIED in code and Stage 12 browser journey (reachable path exists).
- **Context received**: `selectedOrderId` → order lookup → customer measurement profiles, profile-linkage extraction, order stage status (VERIFIED at `DesignStudio.tsx` 1557–1674). Contextual binding intact. **Not disconnected by modernization.**

## PART O — Authorization Reconciliation (cross-module)

| Module | See | Invoke | Mutate | Server authority |
|---|---|---|---|---|
| Reports | any member (both roles) | local calc | none (read-only) | none involved (local data); `/reports/summary` exists unused behind auth+workspace (no role gate) |
| Materials UI | any member | local store | local records (device-scoped) | `/materials` CRUD unused by UI (auth+workspace) |
| Settings view | any member | read keys/members | **owner/admin only** (server-enforced `requireWorkspaceRole`) | VERIFIED server-authoritative |
| Developer | any member (nav) | APIs fail closed | flag-off globally | VERIFIED fail-closed; flag-on granularity UNRESOLVED |
| Customers | any member | list/create/edit via API | tier-gated create (client) + server workspace scoping | VERIFIED (Phase 8–10 boundaries) |

Visibility ≠ authorization holds everywhere checked; no hidden-button-only "restriction" was credited as authorization.

## PART P — Offline Reconciliation

| Capability | Class |
|---|---|
| Reports analytics | **FULLY OFFLINE** (local store; honest empty states; no live-truth claims) |
| Materials records | **FULLY OFFLINE** (device store; usage sync pushes when online) |
| Orders (legacy view + Stage 8 creation) | **FULLY OFFLINE** (local store) |
| Settings | **ONLINE REQUIRED** for server keys/members (errors otherwise); runtime mirror local |
| Developer | **ONLINE REQUIRED** (+ flag) |
| Home analytics | **ONLINE REQUIRED** (server `/dashboard`; honest error/retry, Stage 7) |
| Production / Finance / Customers lists | **ONLINE REQUIRED**; payments **QUEUE CAPABLE** (verified idempotent offline queue) |

No fabricated sync states found; shell offline indicator remains `navigator.onLine`-honest.

## PART Q — Mobile Discoverability (structural + browser-verified)

All five audited surfaces are SECONDARY/conditional nav items rendered in the **More sheet** (WorkspaceShell `secondaryBlock(true)`; Finance-overflow block separate). Browser-verified at 390px: **Reports ✓ renders, Materials ✓ ("Materials Inventory"), Settings ✓ ("Account & Sync · STUDIO · TRIALING"), Developer ✓ (loads, fail-closed APIs), Design Studio** (in More; Studio binding verified via Stage 12 journey). 0px overflow. **No Stage-10-style orphaning exists for any remaining module.**

## PART R — Duplication & Orphan Analysis

| Duplicate/Orphan | Legacy | Modern | Shared contract | Both reachable? | Assessment |
|---|---|---|---|---|---|
| Dashboard file | `Dashboard.tsx` | HomeView | `/dashboard` APIs | legacy NO | Intentionally retained (Stage 7 documented); transitional |
| Production board file | `ProductionBoard.tsx` | ProductionView | canonical stages API | legacy NO | Intentionally retained (Stage 10 documented); transitional |
| Invoice list file | `Invoices.tsx` list | FinanceView | invoices/payments API | legacy NO (modal YES, reused) | Intentionally retained |
| **Analytics truth ×3** | local-store Reports | server `/reports/summary` (unused) + server `/dashboard` (Home) | **none shared** | Reports + Home yes | **P2 semantic duality**: Reports revenue (local captured payments, incl. first-run seed) vs Finance "Money received" (server `amountPaid`) can disagree for the same studio. Owner decision required on the Reports data domain before any modernization |
| `shared/api/materials.ts` client | — | server `/materials` | — | NO (zero importers) | ORPHANED client (P3) |
| `EditCustomerModal` + `updateCustomer` | legacy list | CustomersView | customers API | NO | ORPHANED capability (P2, documented deferral) |
| `data/mockData.ts` | seed source | — | — | **YES — live first-run path** | P1 (Part H) |
| `tierEnforcement` mockData fallbacks (`getCustomerUsage`/`getAssistantUsage` without options) | demo data | — | — | dead path in AppContext flow (real counts passed — VERIFIED) | P3 latent hazard |

## PART S — Performance Risk Inventory (observations only)

- **VERIFIED, low**: Reports computes ALL metric families in one large `useMemo` over local arrays — recompute only on store change; top-N slices bounded; **no chart library** (hand-rolled visuals; zero chart deps in package.json); zero network calls.
- **POSSIBLE RISK**: `orders.find` inside the payments loop (O(payments × orders)) and repeated `Array.from(...).sort()` copies — negligible at local-store scale, worth noting for Stage 13 if store sizes grow.
- **POSSIBLE RISK**: `now` captured once per mount (`useMemo([])`) — month boundaries/overdue flags go stale in long-lived sessions.
- **NO EVIDENCE**: unbounded API fan-out in Reports (no calls), duplicate fetching (single source), chart-dependency weight.

## PART T — Accessibility Risk Inventory (observations only)

Legacy-active surfaces (Reports/Materials/Settings/Orders/Developer) predate the Stage 5 DS: slate palette, legacy modal patterns (Customers/Invoices modals reuse pre-DS `ModalShell` — Stage 7 documented deliberate retention), unknown focus-trap/Escape coverage outside DS primitives. Stage 13's formal audit should sweep these five surfaces explicitly (landmarks/keyboard/focus/contrast), plus the FeatureGate upsell interactions. No remediation performed here.

## PART U — Capability Classification Register

**PRESERVED**: Orders surface · Design Studio (protected, contextually bound) · Materials module · Reports module (mechanics) · Settings · Developer console (flag-off) · backend contracts (`/reports`, `/materials`, `/settings`, `/developers`) · offline payment queue · customer measurement profiles.
**INTEGRATED**: Dashboard→HomeView · customer list/workspace (Stage 7) · measurement/design context · production lifecycle (Stage 10) · finance ops incl. InvoiceModal reuse · contextual Studio entries (Stage 8) · intelligence strips (Stage 9).
**INTENTIONALLY DEFERRED (documented)**: customer edit/delete surfacing (Stage 7, owner decision — with the delete-never-existed correction) · developer entitlement-gated visibility (Stage 6 §20) · legacy visual refresh of retained surfaces (Stage 7 §) · legal pages (Stage 11).
**DUPLICATED**: analytics truth (local Reports vs server reports/dashboard) · retained legacy files (Dashboard/ProductionBoard/Invoices-list — transitional by policy).
**ORPHANED**: customer-edit path (implemented, unreachable) · `shared/api/materials.ts` (zero importers) · `/reports/summary` (zero UI callers) · first-run demo seed (live path — the P1).
**MISSING**: none verified (customer delete never existed — recorded as absence, not regression).
**UNRESOLVED**: Reports data domain + demo seed (owner decision) · flag-on developer granularity · per-customer finance rollup link · Stage 7 doc delete-capability wording.

## PART V — Severity Matrix

- **P0 — none found.**
- **P1**: First-run demo seed renders fabricated analytics as studio truth in Reports (VERIFIED code + live browser; §34 Outcome D; pre-existing, not Phase 18-caused).
- **P2**: Customer edit capability orphaned (implemented, unreachable) · analytics semantic duality (local vs server truth, incl. seed divergence) · server `/reports` + materials clients unused (contract drift) · Reports/`/reports` visibility to assistants without role granularity (financial analytics — visibility question).
- **P3**: Developer nav unconditional visibility (safe today: flag-off fail-closed) · Stage 7 doc inaccuracy (delete) · tierEnforcement mockData dead-path fallbacks · workspace-object runtime mirror vs mockData re-derivation on reload · no dedicated test suites for Reports/Materials/Settings/Developer · legacy visual/a11y debt (Part T) · `fetchPriority` React warning.

## PART W — Stage Placement Decisions

| Finding | Placement |
|---|---|
| P1 demo seed | **Owner decision required** (bounded pre-Stage 13 patch *if authorized*; options: empty-first-run / persistent demo banner / demo workspace toggle). Not auto-implemented. |
| Customer edit orphan | Small bounded reconciliation patch (owner-authorized; mount EditCustomerModal in CustomersView or reinstate path) |
| Analytics domain duality | Owner architecture decision; blocks any future Reports modernization, not Stage 13 |
| Legacy a11y/visual debt | Stage 13 scope (audit; remediation sizing after) |
| Perf observations | Stage 13 evidence file |
| Unused server contracts / dead code | Future cleanup phase (post-Stage 14, owner-governed; nothing deleted now) |
| Developer granularity | Document; resolve before DEVELOPER_API flag is ever enabled |

## PART X — Explicit Non-Findings (investigated, no problem)

No hardcoded metric values in Reports (all runtime-computed). No chart dependencies. No unreachable primary destination (all ten legacy destinations accounted for). No mobile orphaning of any module (browser-verified More reachability). No developer authorization hole (flag-off, fail-closed, DB-verified). No settings mutation without server role gate. No Phase 18 stage deleted a legacy capability (all retirements are documented file-retentions). Design Studio contextual binding intact. Protected assets untouched. Baseline exactly reproduces Stage 12 numbers.

## PART Y — Protected Asset Integrity + Integrity Checks

`git diff 96e4848 -- …DesignStudio.tsx` → **0 lines**; `…services/patternEngine.ts` → **0 lines**; `…services/productionAssistant.ts` → **0 lines** (path-adjusted: `apps/web/src/modules/services/patternEngine.ts` per repo layout). Full working tree during audit: documentation only; probe script lives outside the repo (`/home/user/pgtool/probe15-audit.mjs`). Final gates re-run at completion (Part B table + below).

## PART Z — Final Reconciliation Verdict

1. **Core operational capabilities preserved?** YES — every legacy destination has a functional, discoverable equivalent (5 legacy-active, 5 integrated/replaced with files retained).
2. **Fully integrated:** dashboard analytics, customer list/workspace, production lifecycle, finance ops, measurement/design context, contextual Studio.
3. **Legacy-but-valid:** Orders, Materials, Reports, Settings, Developer (all active in the modern shell).
4. **Intentionally deferred:** customer edit/delete surfacing; developer entitlement visibility; legal pages; legacy visual refresh.
5. **Duplicated:** analytics truth (×3 stacks); retained legacy files (transitional, documented).
6. **Genuinely orphaned:** customer-edit path; `api/materials.ts`; `/reports/summary` UI consumers; **first-run demo seed (live path — the one material orphan)**.
7. **Reports:** mechanics operationally complete and honest per-calculation, but **at risk on input integrity** (Outcome D) and semantically dual with server truth — owner decision required; do NOT modernize the visuals and call it reconciled.
8. **Developer:** safely authorized **today** (flag-off fail-closed, DB-verified); granularity question documented for flag-on.
9. **Materials:** reconciled as a device-local module; server contract drift noted; nothing missing.
10. **Settings:** safely preserved (server-authoritative mutations, role-gated).
11. **Stage 13 proceeds unchanged?** **YES — option A.**
12. **Issues requiring authorization before Stage 13?** No *blockers*; the **P1 demo-seed decision** and the P2 patches are owner-authorized items that can proceed independently of Stage 13's scope.

---

## FINAL CAPABILITY MATRIX

| Domain | Legacy capability | Current surface | Functional | Discoverable | Authorized | Offline class | Classification | Severity |
|---|---|---|---|---|---|---|---|---|
| Dashboard | overview + analytics | HomeView (Stage 7) | ✓ | ✓ | ✓ auth | Online Required | INTEGRATED | — |
| Customers | list/search/create/view/edit | CustomersView (+CustomerDetail) | ✓ (edit ✗ path) | ✓ | ✓ auth+tier | List online · profiles offline | INTEGRATED + edit ORPHANED | P2 |
| Orders | order CRUD | Orders (legacy-active) + Stage 8 flow | ✓ | ✓ | ✓ auth | Fully Offline | PRESERVED | — |
| Production | board + lifecycle | ProductionView (Stage 10) | ✓ | ✓ | ✓ auth | Online Required | INTEGRATED | — |
| Finance | invoices + payments | FinanceView (Stage 10) | ✓ | ✓ | ✓ auth server-authoritative | Online + Payment Queue | INTEGRATED | — |
| Design Studio | protected design engine | DesignStudio (protected) | ✓ | ✓ nav + contextual | ✓ auth | Fully Offline | PRESERVED | — |
| Materials | records/inventory/linkage | Materials (legacy-active) | ✓ | ✓ | ✓ auth (local) | Fully Offline | PRESERVED | P3 (contract drift) |
| Reports | BI analytics suite | Reports (legacy-active) | ✓ computes | ✓ | ✓ auth (client tier gate) | Fully Offline | PRESERVED + **P1 seed integrity** | **P1** |
| Developer | API keys/webhooks/deliveries | DeveloperDashboard (legacy-active) | UI ✓ / APIs flag-off | ✓ (unconditional) | ✓ server fail-closed | Online Required | PRESERVED (visibility UNRESOLVED) | P3 |
| Settings | workspace/branding/plan/team | Settings (legacy-active) | ✓ | ✓ | ✓ owner/admin server-gated | Mixed | PRESERVED | — |

**Audit gates at completion:** tests 307/307 · tsc 0 · build PASS · precache 116/6411.36 KiB (unchanged) · protected 0-diff · working tree = this document only.
