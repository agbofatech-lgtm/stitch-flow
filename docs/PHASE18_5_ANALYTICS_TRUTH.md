# Phase 18.5 — Analytics Truth & Client Business Intelligence

**Status: COMPLETE. Stages 0–3 (baseline, forensics, domain truth mapping, metric contract audit) + Stage 4 decisions (AD1=Hybrid, AD2=retire+fix F-1, AD6=defaults, ratified 2026-08-30) + Stages 5–39 implementation (canonical projection module consumed by Dashboard AND Reports, F-1/F-4/F-5 closed, `/reports/*` retired, provenance labels; see Part R and `PHASE18_5_CERTIFICATION_REPORT.md`). Browser validation: J1–J7 executed against the real running stack (PostgreSQL 18.4 + Redis 7.2.5 + headless Chromium) — 7/7 PASS on the pre-implementation state (Part H), re-executed post-implementation (Part H2; full record: `PHASE18_5_FINAL_CERTIFICATION_REPORT.md`).**
**Principle: One workspace, one business truth.**

---

## Part A — Mission

Establish a trustworthy, unified business-intelligence truth layer for every StitchFlow client workspace before Phase 19 commercialization. Dashboard and Reports must stop operating as competing analytical truths. Every metric must have an explicit definition and traceable provenance. No fabricated data, no invented metrics, no misleading zero-history charts, no duplicated business truth.

Out of scope (Phase boundary): Phase 19 billing/subscriptions/entitlements, Control Center (Plane B), Public API, AI autonomy, 3D, production/finance/materials system rewrites.

## Part B — Baseline (Stage 0, verified 2026-08-30)

| Gate | Result |
|---|---|
| Branch / commit | `arena/01a04eef-stitch-flow` @ `7812963` (= remote tip, Stage 14 certified) |
| Working tree | clean (after standard sandbox re-provision repair: fetch → reset --hard → clean → npm ci) |
| Tests | **316/316 pass** (21 files). vitest exit 1 due to **3 pre-existing unhandled stderr errors** in `tests/offline/phase18-stage10.test.tsx` (error-boundary exercise throwing inside `ProductionView.tsx:194` during a `.map`) — present at the certified commit, not a regression; tests themselves pass. |
| TypeScript | **0 errors** (`tsc --noEmit`) |
| Build | **PASS** |
| PWA precache | **132 entries / 6418.78 KiB** (unchanged from Stage 14) |
| Chunks | FinanceView 396 · index 340 · AuthenticatedApp **320** · DesignStudio 72 · Reports 48 · ControlCenter 48 KB |
| Protected assets | `DesignStudio.tsx` / `patternEngine.ts` / `productionAssistant.ts` — **0-diff** |

## Part C — Forensic method

Read every analytical surface's actual implementation (no assumptions): `Reports.tsx` (2076 lines), `Dashboard.tsx` (940), `DashboardSummaryCard.tsx`, `dashboardRoutes.ts` (181), `reportRoutes.ts` (273), `AppContext.tsx` state origin, `syncEngine.ts`, `shared/lib/db.ts` (AppContext persistence), `db/database.ts` (Dexie), `reporting.ts` (497, the metric library), `Invoices.tsx`, `ProductionBoard.tsx`, `Materials.tsx`, `seedData.ts`, plus consumers/importers of each.

## Part D — Analytics surfaces inventory (evidence table)

| Surface | Location | Data source | Calculation | Authoritative? |
|---|---|---|---|---|
| **Dashboard summary cards** | `Dashboard.tsx` + `DashboardSummaryCard.tsx` | **SERVER** `GET /dashboard/summary` (`dashboardApi.ts`) | SQL aggregates (see Part F) | Server-side yes; **but `totalRevenue` is order-value, not revenue** (F-1) |
| **Dashboard payments chart** | `Dashboard.tsx` | **SERVER** `GET /dashboard/payments-analytics` | Weekly captured-payment sums + trend % | Yes (captured-payment semantic — convergent with Reports' week metric) |
| **Dashboard lists** (recent orders, overdue invoices, due today) | `Dashboard.tsx` | **SERVER** orders+invoices bundle (`dashboardDataApi.ts`) | Client filters over server arrays | Yes (server records) |
| **Dashboard inventory summary + low stock** | `Dashboard.tsx` | **LOCAL** `fabricRecords` (AppContext) + `getLowStockMaterials()` | Sums over device-local material records | **DEVICE-LOCAL** (writes never reach server — Stage 14 S8) |
| **Reports & Analytics (all 6 sections)** | `Reports.tsx` | **LOCAL** AppContext: `payments, invoices, orders, customers, fabricRecords, materialUsages` | One `reportData` useMemo + `@shared/utils/reporting` helpers | **DEVICE-LOCAL projection** — never hydrated from server (F-2) |
| **Finance view figures** | `Invoices.tsx` | **SERVER** `fetchInvoices()` + payments | Displays server-returned `amountPaid`/`balanceDue`/status | **Yes — server-authoritative money** (Stage 14 certified) |
| **Production board** | `ProductionBoard.tsx` | **SERVER** `fetchOrders()` | Stage state machine display | Yes (server records; canonical 9 stages) |
| **Materials view** | `Materials.tsx` | **LOCAL** `fabricRecords` | Summary cards, low-stock, reorder suggestions | **DEVICE-LOCAL** (same store as Reports materials) |
| **Server reports API** | `reportRoutes.ts` (`/summary`, `/order-status`, `/monthly-revenue`, `/overdue-orders`, `/low-stock-materials`) | SERVER SQL | Aggregates over DB | Server-side yes — **but consumed by NO view** (F-3) |
| **Server reports client wrapper** | `shared/api/reports.ts` | — | fetch wrappers | **Orphaned** — zero importers (F-3) |
| **Dexie sync mirror** | `db/database.ts` + `syncEngine.applyDeltaBatch` | **SERVER deltas** → IndexedDB tables (customers, orders, measurementProfiles, invoices, payments, fabrics, materialUsages, productionStages, settings) | none (storage only) | **Authoritative mirror consumed by NO analytics surface** (F-2) |
| `apps/api` (license/admin/events) | `apps/api/src/routes` | — | — | Plane B adjacent — out of scope, untouched |

## Part E — Domain truth map (the five planes and two seams)

```
PLANE 1 — SERVER AGGREGATES          PLANE 2 — SERVER RECORDS
/dashboard/summary                   /orders  /invoices  /payments
/dashboard/payments-analytics            │
    │                                    │ consumed by Dashboard lists,
    │ consumed by                        │ Finance view, Production board
    │ Dashboard cards                    │
    ▼                                    ▼
PLANE 3 — DEXIE SYNC MIRROR  ◄── syncEngine.applyDeltaBatch() writes here
(IndexedDB: orders/invoices/payments/fabrics/materialUsages/…)
    │
    │  ◄── SEAM #1: nothing bridges Dexie → AppContext.
    │       Synced server data NEVER reaches Reports.
    ▼
PLANE 4 — APPCONTEXT LOCAL STORE (localStorage keys, shared/lib/db.ts)
(payments, invoices, orders, customers, fabricRecords, materialUsages)
    │
    │  consumed by Reports (ALL sections) + Materials view
    │  + Dashboard inventory summary (mixed plane!)
    ▼
PLANE 5 — ORPHANED SERVER REPORTS (/reports/* + shared/api/reports.ts — no consumers)
```

Consequences (empirically certified in Stage 14, now explained structurally):
- A fresh browser on a data-bearing account: Dashboard shows server numbers; Reports shows honest-empty (S9) — **the same business, two different truths**.
- Same device over time: Reports reflects only what was *written from this device* (plus mock-seed legacy in old stores).
- Money shown by Finance (server) can disagree with money shown by Reports (local) for the same workspace.

## Part F — Metric contract audit (current formulas, semantics, defects)

### F.1 Revenue family — **DEFECT F-1 (semantic mislabel)**

| Metric | Where | Current formula | Verdict |
|---|---|---|---|
| Dashboard `totalRevenue` | `dashboardRoutes.ts:53-56` | `SUM(orders.total_amount) WHERE status != 'cancelled'` | **This is ORDER VALUE, labelled "revenue"** — never payments. Mislabel; overstates collected money by construction. |
| Reports "Collected Revenue (month/week)" | `Reports.tsx:83-106` | Σ payments where `paymentStatus='captured'` AND `paidAt` in period | Correct **Collected Revenue** semantic (payment-event timestamp ✓) — but computed over device-local payments only. |
| Dashboard weekly chart | `dashboardRoutes.ts` `/payments-analytics` | Σ captured payments by day, this week vs previous | Correct semantic, server scope. **Convergent definition with Reports-week** (good) over different record sets. |

Required vocabulary (mandate §8.1) — proposed canonical names, no silent renames in UI until AD1/AD2:
- **Order Value** = Σ `orders.totalAmount` (excl. cancelled)
- **Invoiced Value** = Σ `invoices.totalAmount`
- **Collected Revenue** = Σ captured `payments.amount` (event time = `paidAt`)
- **Outstanding** = Σ `invoices.balanceDue` over unpaid statuses
- **Overdue Exposure** = Σ `invoices.balanceDue` where `status='overdue'`

### F.2 Invoice status vocabulary — **DEFECT F-4 (filter misses a status class)**

Canonical statuses **actually written**: creation → `'pending'` (`Orders.tsx:1604`, `OrderCard.tsx:474/488`); payment recalculation → `'partial' | 'paid' | 'pending'` (`paymentRoutes.ts`); overdue upgrade → `'overdue'` from `('pending','partial')` (`invoiceRoutes.ts:144-149`). The type union's `'sent'` is **never written by real flows**.

- Server unpaid filter: `('pending','partial','overdue')` ✓ correct.
- **Reports unpaid filter: `('sent','partial','overdue')`** (`Reports.tsx:108-110`) — **misses every `'pending'` invoice** (i.e., every fresh unpaid invoice) → local Reports understates Outstanding and customer pending balances whenever local invoices exist.

### F.3 Customer metrics (local plane, `Reports.tsx:121-205`)

| Metric | Current formula | Notes |
|---|---|---|
| Orders per customer | count over ALL local orders | includes drafts/cancelled (definition choice to ratify) |
| Total spent | Σ captured payments matched `payment.orderId → order.customerId` | payment-attribution via local orders |
| Pending balance | Σ unpaid-invoice `balanceDue` (F-4 filter) | inherits F-4 |
| Avg order value | Σ`order.totalAmount` / ordersCount | 0 when no orders (honest-empty enforced at render) |
| **Repeat customer** | `ordersCount >= 2` | existing de-facto definition — ratify in contract |
| Workspace AOV | mean of per-customer AOV (not Σ/Σ) | **differs from Σ value/Σ orders** — must pick one definition |

### F.4 Order metrics (local, `Reports.tsx:226-260`)

- Status counts over `draft | in_progress | ready | delivered | cancelled` (web order status vocabulary — distinct from invoice vocabulary; keep separate).
- Completion rate = delivered / non-draft (verify exact denominator in code during implementation; record).
- Overdue orders: local `getOverdueOrdersCount` (dueDate past + active) — mirrors server `/dashboard/summary.dueAlerts` logic but over local records.

### F.5 Production metrics (local orders + `reporting.ts`)

- `buildOrdersByStage` (canonical 9 stages ✓), `getBottleneckView`, `getAverageTurnaroundDays`, `getReadyForDeliveryCount`, `getMaterialConsumptionByGarmentType`, `resolveReportingDateRange` (presets incl. last30Days/custom).
- **These helpers are the de-facto metric library but are imported ONLY by Reports.tsx** — Dashboard does not share them (duplication risk). Turnaround/bottleneck already guard missing timestamps (honest N/A — verified Stage 13/14).

### F.6 Financial metrics

Finance view displays server-returned money only (Stage 14 certified) — Reports must consume the **same semantics** (authoritative fields, never recompute) once AD1/AD2 fix the record source.

### F.7 Materials metrics — provenance classification (mandate §23)

| Metric | Source | Classification |
|---|---|---|
| Inventory units/value, low stock, reorder suggestions | AppContext `fabricRecords` (device writes only) | **DEVICE-LOCAL** — must never claim synced/workspace truth |
| Usage/consumption, most-used, slow-moving | AppContext `materialUsages` (device-local; server `POST /materials/usages` exists, unused by UI) | **DEVICE-LOCAL** |
| Server `/reports/low-stock-materials` | server `fabric_records` | ORPHANED (F-3) |

### F.8 Defect & risk register (forensic output)

| ID | Finding | Impact |
|---|---|---|
| **F-1** | Dashboard `totalRevenue` = order value, labelled revenue | Overstates collected money; violates one-definition rule |
| **F-2** | Dexie sync mirror never feeds AppContext → Reports blind to server data | The root cause of Dashboard/Reports divergence (Stage 14 S9) |
| **F-3** | Server `/reports/*` + client wrapper orphaned | Dead competing plane; either adopt or retire (AD2) |
| **F-4** | Reports unpaid filter uses `'sent'`; real unpaid status is `'pending'` | Local Outstanding understated |
| **F-5** | `reporting.ts` library consumed by Reports only | Metric definitions can drift between views |
| **F-6** | Dashboard mixes planes (server cards + local materials summary) | Materials numbers on Dashboard are device-local, unlabeled |
| **F-7** | AOV: mean-of-means vs Σ/Σ ambiguity | Inconsistent customer-value story |

## Part G — Analytics architecture options (Stage 4 preparation — OWNER DECISION AD1/AD2)

Evidence-based analysis; **not decided here**.

| | Option A — server-authoritative | Option B — offline-first projection | **Option C — hybrid (recommended for investigation, per mandate §11-direction)** |
|---|---|---|---|
| Record source for analytics | server aggregates (`/dashboard/*`, `/reports/*`) | Dexie mirror (already receives server deltas) | **One projection library** over a unified workspace record set: Dexie mirror as the local input, refreshed by sync; server remains authoritative for money-critical aggregates (parity-checkable) |
| Dashboard+Reports consistency | both consume server | both consume projection | **both consume the SAME projection module** (extended `reporting.ts`) — one definition, multiple presentations |
| Offline honesty | "Last synced" cache labels | full offline analytics | offline analytics from mirror + honest `Last synced`/`Updated from this device` labels; server parity check (AT2/AT3) |
| Cost / risk | loses offline analytics depth; needs endpoint completion | mirror exists but AppContext seam must be bridged carefully (tombstones, anti-resurrection already handled in engine) | bridge is the missing piece either way; C reuses it and keeps server auditability |
| Notes | simplest truth story | strongest offline story | matches product's offline-first direction AND the mandate's projection-layer diagram |

Recommendation (for owner ratification): **Option C** — bridge the existing Dexie mirror into a read-only analytics projection module (one definition per metric, consumed by Dashboard AND Reports), keep server endpoints as the authoritative cross-check, label provenance honestly, classify materials metrics DEVICE-LOCAL until a separately-authorized materials reconciliation.

## Part Y — Decision register

| ID | Question | Evidence | Status |
|---|---|---|---|
| AD1 | Analytics source of truth | Parts D–F | **OPEN — owner decision** (recommendation: Option C) |
| AD2 | Server vs local projection (adopt or retire `/reports/*`; fix F-1 label) | F-1, F-3 | **OPEN — owner decision** |
| AD3 | Materials synchronization | Stage 14 S8 + F.7 | Deferred (device-local classification until separately authorized) |
| AD4 | Analytics export | No export path audited yet (audit due at Stage 15-equivalent) | Future |
| AD5 | Advanced forecasting | Roadmap | Future |
| AD6 | Repeat-customer definition (`>=2 orders`) + AOV definition (mean-of-means vs Σ/Σ) | F.3, F.7 | **Proposed for ratification with AD1** |

## Part H — Browser validation record (J1–J7, pre-implementation state `61dcde8`, 2026-08-30)

Executed against the real running application (PostgreSQL 18.4 + Redis 7.2.5 + Express API + web app, headless Chromium 149; fresh workspace per run; one real UI login; server seed data via the product REST API only). Full method, matrices, screenshots (`sfv-evidence/p185/`), probe-defect register, and new forensic facts **F-8…F-11**: see `docs/PHASE18_5_FINAL_CERTIFICATION_REPORT.md` §3–§7.

| Journey | Validates | Result |
|---|---|---|
| J1 fresh workspace | Honest empty everywhere (Home chips 0/—, Reports 5×`data-chart-empty`, Materials demo-free) + provenance footnote | PASS (0 console errors) |
| J2 server truth | Server planes flow to Home (SF-P185-A, ACTIVE ORDERS 1), Finance (INV-P185-1 Total 800 / Paid 600 / Balance 200, explicitly labelled), Production (delivered order) | PASS |
| J3 F-1 | `/dashboard/summary.totalRevenue` = **3300** (order value) vs captured payments **300** — mislabel confirmed at contract level; live Home renders **no** revenue figure (mislabelled card is unreachable dead code, only importer `App.tsx.bak`) → **F-8** | PASS |
| J4 F-2 | Reports honest-empty (5 charts) in the SAME session that displays server data — two truths reproduced | PASS |
| J5 F-6/S8 | Home chip row mixes planes live (`CUSTOMERS 0` local vs server `totalCustomers: 2`; "No customers yet" beside active server invoice) → **F-9**; UI-created material invisible to server (S8 re-confirmed) | PASS |
| J6 offline | Home → "Live figures unavailable" honest error, `PENDING BALANCES —`; Reports stays honest-empty; no fabricated offline numbers | PASS |
| J7 charts/a11y | `data-chart-empty` honesty attributes + sr-only text alternatives verified in live DOM | PASS |

Baseline gates re-verified at `61dcde8` before validation: tsc 0 errors · 316/316 tests · build PASS · precache 132 / 6418.78 KiB (byte-identical).

## Part H2 — Browser re-validation of the implemented truth layer (post-merge, 2026-08-30)

Re-execution of J1–J7 against the merged Stage 5+ implementation (real PostgreSQL + Redis + headless Chromium) — see `PHASE18_5_FINAL_CERTIFICATION_REPORT.md` §10.

## Part R — Recovery & continuation (2026-08-30, new agent/session)

A new agent resumed Phase 18.5 under the Agent Recovery Protocol. Repository-authoritative findings:

- **Repo confirmed:** `github.com/agbofatech-lgtm/stitch-flow` (StitchFlow). Branch `arena/01a053f0-stitch-flow`.
- **Stale-checkout discrepancy (resolved):** the local checkout was at the grafted root `b576c3e` while the real Phase 18.5 work lived on the remote session branch tip `61dcde8`. The local HEAD was a strict clean ancestor, so a **fast-forward only** merge (no reset/rebase/force) synced it. No work discarded.
- **Recovered status = DISCREPANCY vs the continuation prompt.** The prompt's "~90% / J1–J7 / reconciliation+filter+offline+authz all complete" hypothesis is **not supported** by the repo. The doc header is authoritative: **Stage 0–3 complete (analysis only)**, Stage 4 prepared, **blocked on AD1/AD2/AD6**. There is no "J1–J7" anywhere; the browser journeys in-repo are Stage-14's `X1–X5`/`R1–R5`.
- **Baseline re-verified (2026-08-30):** `npm ci` clean; web `tsc --noEmit` 0 errors; **vitest 316/316 pass** (21 files; the 3 unhandled stderr rejections are the same pre-existing error-boundary exercises, not regressions); backend `tsc --noEmit` 0 errors (backend Jest needs Postgres, unavailable in sandbox — backend verified by type-check + code review).

### Owner decisions received (ratified this session)

| ID | Decision |
|---|---|
| **AD1** | **Option C — Hybrid.** One shared read-only projection module (`@shared/utils/analyticsProjection`) is the single metric definition, consumed by BOTH Dashboard and Reports. Server aggregates remain the authoritative cross-check. |
| **AD2** | **Retire** the orphaned server `/reports/*` plane + web `shared/api/reports.ts` (zero consumers). **Fix F-1**: Dashboard revenue relabelled to canonical vocabulary (Order Value ≠ Collected Revenue). The developer-API `/api/v1/reports/summary` and the entitlement-gated behaviour are preserved separately. |
| **AD6** | **Accept defaults.** Repeat customer = `≥2 orders`. Workspace AOV = `Σ order value / Σ orders` (Σ/Σ). Canonical vocabulary adopted: Order Value, Invoiced Value, Collected Revenue, Outstanding, Overdue Exposure. |

### Implementation ledger (Stage 5+)

| Stage | Work | Status |
|---|---|---|
| 5 | `analyticsProjection.ts` — canonical metric library (one definition per metric); fixes F-4 (unpaid filter includes `pending`) | ✅ |
| 6–7 | Reports + Dashboard both consume the projection module (reconciliation) | ✅ |
| AD2 | Retire `/reports/*` (backend) + `shared/api/reports.ts` (web); F-1 relabel | ✅ |
| 9–10 | Date/filter reuse (`resolveReportingDateRange`) + offline honesty labels (provenance) | ✅ |
| 29 | AT suite — `tests/offline/phase18_5-analytics.test.ts(x)` | ✅ |
| 39 | Final gates: tsc + vitest + build + PWA parity | ✅ |

## Part Z — Phase 19 handoff

Delivered in Phase 18.5:
- **One truth definition.** `@shared/utils/analyticsProjection` holds every business metric's canonical formula. Dashboard and Reports import the same functions — a metric can no longer drift between the two surfaces (closes F-5).
- **Canonical vocabulary** (AD6): Order Value, Invoiced Value, Collected Revenue, Outstanding, Overdue Exposure — never "revenue" for order value (closes F-1 mislabel).
- **F-4 fixed:** unpaid/outstanding filter now includes `pending` (real fresh-unpaid status), so local Outstanding is no longer understated.
- **AD2:** orphaned `/reports/*` competing plane retired (backend route + web wrapper removed); dead-plane risk (F-3) eliminated.
- **Provenance honesty:** analytics surfaces label device-local vs server-authoritative scope; materials remain classified DEVICE-LOCAL (AD3 deferred).

Deferred to later phases (unchanged): AD3 materials sync, AD4 export, AD5 forecasting; Plane-3→Plane-4 automatic hydration of synced server records into AppContext (the projection module is now the single consumer seam, ready for that bridge when a materials/records reconciliation is separately authorized).

**Phase 18.5 complete. STOP — do not begin Phase 19.**
