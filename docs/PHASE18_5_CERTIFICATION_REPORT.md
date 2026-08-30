# Phase 18.5 — Analytics Truth & Client Business Intelligence — Final Certification

**Date:** 2026-08-30
**Branch:** `arena/01a053f0-stitch-flow`
**Baseline recovered:** `61dcde8` (Stage 0–3 analysis, fast-forwarded from stale local `b576c3e`; see PHASE18_5_ANALYTICS_TRUTH.md Part R)
**Verdict:** **PASS** — analytics truth layer implemented per ratified owner decisions AD1 (Hybrid), AD2 (retire `/reports/*` + fix F-1), AD6 (defaults). Zero test regressions; all gates green.

---

## 0. Honest scope statement

- **Environment constraints (recorded honestly):** this sandbox has **no PostgreSQL** (backend Jest suite cannot run) and **no installable browser binary** (Playwright Chromium download is network-blocked). Therefore:
  - Backend changes are verified by **`tsc --noEmit` (0 errors)** + code review, not by live Jest.
  - Browser validation is done by **(a)** a live Vite dev-server preview on `:5173` (bound `0.0.0.0`, the real manual-browser channel shown to the user) and **(b)** **real-DOM rendering of the actual `Reports` surface through the real `AppProvider`** in jsdom (`phase18_5-reports-integration.test.tsx`). No physical-device or full headless-Chromium certification is claimed this phase (that was Stage 14's scope, run against embedded Postgres).
- No fabricated data, no invented metrics, no misleading zero-history charts. Empty-workspace honesty is asserted (BV3, AT5).

## 1. Decisions executed

| ID | Decision | Implementation |
|---|---|---|
| **AD1** | Option C — Hybrid | `src/shared/utils/analyticsProjection.ts`: one canonical definition per metric; imported by Dashboard (via AppContext `buildDashboardSummary`) and Reports. Server `/dashboard/*` remains authoritative cross-check. |
| **AD2** | Retire orphaned `/reports/*`; fix F-1 | Backend `reportRoutes.ts` reduced to the entitlement-gated `/low-stock-materials` (the only tested, non-orphaned route); `/summary`, `/order-status`, `/monthly-revenue`, `/overdue-orders` removed. Web `shared/api/reports.ts` (zero importers) deleted. F-1: `/dashboard/summary.totalRevenue` now = captured payments (Collected Revenue); Order Value returned separately as `totalOrderValue`. |
| **AD6** | Accept defaults | Repeat = `≥2 orders`; workspace AOV = `Σ order value / Σ orders` (Σ/Σ, replacing the prior mean-of-means in Reports); canonical vocabulary. |

## 2. Defect closures (from forensics F-register)

| ID | Before | After |
|---|---|---|
| **F-1** | Dashboard "revenue" = SUM(order totals), mislabeled | Server + client "revenue" = captured payments only; Dashboard card relabeled **"Collected Revenue" / "Captured payments (server)"**; Order Value is a separate metric. |
| **F-4** | Unpaid filter `('sent','partial','overdue')` missed every `pending` invoice → Outstanding understated | Canonical `UNPAID_INVOICE_STATUSES = ('pending','sent','partial','overdue')`; applied in Reports, AppContext, FinanceView "outstanding" filter, and the mockData fixture helper. |
| **F-5** | `reporting.ts` metric library consumed only by Reports → drift risk | Money/customer definitions centralized in `analyticsProjection.ts`, consumed by both surfaces. |
| **F-3** | Orphaned competing `/reports/*` plane | Retired (backend routes + web wrapper). |
| **F-6** | Dashboard mixes server cards + device-local materials, unlabeled | Reports carries the device-local provenance notice; materials remain classified DEVICE-LOCAL (AD3 deferred, unchanged). |
| **F-7** | AOV mean-of-means vs Σ/Σ ambiguity | Resolved to Σ/Σ (AD6). |

## 3. Verification gates

| Gate | Result |
|---|---|
| Recovery | Repo confirmed StitchFlow; stale local branch fast-forwarded to remote session tip (no reset/rebase/force; nothing discarded). |
| Baseline re-verified | vitest 316/316; web tsc 0; backend tsc 0; PWA 132 entries / 6418.78 KiB. |
| Web TypeScript | **0 errors** (`tsc --noEmit`). |
| Backend TypeScript | **0 errors** (`tsc --noEmit`). |
| Web tests | **343/343 pass** (23 files) = 316 baseline + **20 AT** (`phase18_5-analytics.test.ts`) + **7 BV** (`phase18_5-reports-integration.test.tsx`). The 3 unhandled stderr rejections are the pre-existing error-boundary exercises (phase18-stage7/stage10), unchanged — not regressions. |
| Build | **PASS** (`vite build`). |
| PWA precache | **132 entries / 6419.00 KiB** — parity with Stage 14 baseline. |
| Reports chunk | 48 KB (unchanged); AuthenticatedApp 327 KB. |
| Live preview | Vite dev server on `:5173` (0.0.0.0), serves `/`, `/login` (HTTP 200) — manual browser channel available to the user. |
| Protected assets | `DesignStudio.tsx` / `patternEngine.ts` / `productionAssistant.ts` — untouched. |

## 4. Browser-emulated evidence (BV suite, real DOM)

- **BV1:** Real `Reports` renders through the real `AppProvider` (no mocked context); carries the `data-reports-scope="local"` "Locally calculated" notice and **never** claims "live"/"synced".
- **BV2:** Canonical projection values (Collected Revenue, Outstanding incl. `pending`, Σ/Σ AOV) match what the surface computes over the seeded workspace; Order Value ≠ Collected Revenue proven on the fixture.
- **BV3:** Empty workspace renders honest zeros — no fabricated analytics.

## 5. Phase 19 handoff

See PHASE18_5_ANALYTICS_TRUTH.md Part Z. Deferred (unchanged): AD3 materials sync, AD4 export, AD5 forecasting, and automatic Plane-3→Plane-4 hydration of synced server records into AppContext (the projection module is the ready single-consumer seam).

**Phase 18.5 complete. STOP — Phase 19 not started.**
