# Phase 18.5 — Analytics Truth & Client Business Intelligence

**Status: Stage 0–3 COMPLETE (baseline, forensics, domain truth mapping, metric contract audit). Stage 4 (architecture decision) prepared with evidence — awaiting owner decisions AD1/AD2 before projection-layer implementation.**
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
| **F-8** | Stage-transition route refreshed `orders.production_stages` (snapshot) but never recorded a sync change | Server-side stage history never reached other devices — production analytics blind (found by browser Journey D, fixed `145b20d`) |
| **F-9** | `getDeliveredAt` treated ANY completed stage's timestamp as delivery | Fabricated "0.0 days average turnaround" for undelivered orders (fixed `323e8a9`) |
| **F-10** | Rendered CH4 violations: Reports "live snapshot" insight copy; Home "Live figures unavailable" title | Claimed liveness analytics never had (fixed `0ad3b35`) |

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

## Part H — Projection layer (Stage 5, IMPLEMENTED `22f8171`)

`apps/web/src/modules/analytics/projection.ts` — one deterministic, read-only pass over
workspace domain records. Every presentation consumes these definitions; none re-implements
formulas.

- **Inputs** (shape-tolerant `Minimal*` types): customers, orders (incl. embedded
  `productionStages`), invoices, payments, material usages, fabric records.
- **Outputs**: `executiveSummary`, `salesIntelligence`, `customerIntelligence`,
  `orderIntelligence`, `productionIntelligence` (stage distribution, bottleneck,
  turnaround), `materialIntelligence`, plus re-exports of the `reporting.ts` primitives.
- **Bridge** (`useAnalytics.ts`): device-local AppContext baseline available immediately
  (offline-capable, §16) merged with the Dexie sync mirror — **server rows win on id
  collision**; materials stay DEVICE_LOCAL by design (AD3). `lastSyncedAt` surfaces the
  evidenced sync time.
- **Provenance** (internal, not user-facing jargon): `SERVER_SYNCED | DEVICE_LOCAL | MIXED |
  UNAVAILABLE`, exposed as `data-analytics-provenance` on the Reports scope notice for
  testability.
- **N/A vs zero**: `hasTurnaroundEvidence` gates `averageTurnaroundDays` — `null` (renders
  N/A) unless an order has created→delivered timing. ZERO RECORDED ≠ NO DATA everywhere.

## Part I — Dashboard reconciliation (Stage 6, IMPLEMENTED `f2ed807`)

- Home "At a glance" now consumes `executiveSummary(analytics.records)` — the SAME
  projection Reports uses (one metric definition; AT2/AT15).
- The server data bundle (`getDashboardDataBundle`) is retained ONLY for the TODAY
  operational lists (urgent/action/active) — operational ≠ analytical; no formula duplication.
- F-1: legacy `components/Dashboard.tsx` is dead code (AD2 RESOLVED-in-principle: retire at
  next cleanup window; nothing imports it — removal is an owner-visible change, not
  snuck in during 18.5).
- F-6 closed: the materials figure on Home is a count of local fabric records under the
  explicit disclosure line (see Part O).

## Part J — Reports reconciliation (Stage 7, IMPLEMENTED `20b400d`)

- Reports renders FROM the projection (no parallel formulas survive; F-5 closed).
- F-4 closed: unpaid-invoice statuses derive from the real contract (`pending` et al.), not
  the never-written `'sent'`.
- §20 chart integrity: trend month labels derive from the actual window
  (`monthDate.toLocaleString('en',{month:'short'})`); the Jan–Jun hardcode (wrong 11/12
  months) is gone — grep-verified zero remaining.
- Honest empty states: `data-chart-empty="true"` "No data recorded yet" panels; never
  zero-filled fake history (AT1/AT4).
- CH4: scope notice states "Locally calculated — from your workspace records on this
  device", with evidenced "Last synced [time]" / "not yet synced" disclosure; no
  live/real-time claims (F-10 fixed `0ad3b35`).

## Part K — Customer intelligence (Stage 8 domain integration)

Ratified AD6 definitions, single implementation in the projection:
- **Repeat customer** = customer with **≥ 2 orders** (order count, not payment count).
- **Average Order Value (workspace)** = **Σ order value / Σ orders** (Σ/Σ, not
  mean-of-means; F-7 closed).
- Top customers by evidenced spend; outstanding balances from invoice `balanceDue`
  (server-authoritative, never recomputed).

## Part L — Order intelligence

Total/open/overdue/completion from the REAL order statuses (F-4 fix; no collapsed
aggregates beyond documented groups: draft+in_progress+ready = "active workflow",
labelled as such). Best-selling type by order count. Workflow distribution per actual
status values.

## Part M — Production intelligence

- **Stage distribution** consumes the embedded `productionStages` history on order records.
  Canonical nine stages remain authoritative — analytics never renames, invents, or writes
  stages.
- **F-8 fixed (`145b20d`)**: the transition route now records the same `orders` sync change
  the other order routes emit, so `syncOrderStageSnapshot`'s refresh of
  `orders.production_stages` propagates to other devices' mirrors. Verified end-to-end in
  Journey D: API transitions → reload → mirror → Reports stage distribution + real
  bottleneck ("Sewing") rendered.
- **Delivery evidence (F-9 fixed `323e8a9`)**: only a completed canonical `delivered` stage
  (or explicit `deliveredAt`) counts as delivery. Completing sewing is production progress,
  not delivery. Turnaround without delivery evidence renders N/A (AT8, +2 regression cases).
- **Bottleneck** computed only from stage timing evidence (startedAt→completedAt); N/A
  otherwise. Auto-completed initialization stages carry no startedAt → honestly excluded.

## Part N — Financial intelligence

Collected Revenue = Σ payments (event = `paidAt`); Outstanding = Σ invoice `balanceDue`;
Invoiced Value = Σ invoice totals; Overdue Exposure = outstanding on past-due invoices.
All consumed from the authoritative finance contracts — Reports never recomputes
paid amounts, balances, or invoice statuses (mandate §24). Partial-payment truth
(invoice 500 / paid 100 / outstanding 400) verified in AT3 and browser Journey C.

## Part O — Material intelligence (honesty boundary, Stage 14 carried)

Stage 14 confirmed material UI writes are device-local and do not propagate. Therefore:
- Material analytics are classified **DEVICE-LOCAL**; `materialsProvenance` is fixed to
  `'DEVICE_LOCAL'` in the projection.
- Both Home and Reports carry the disclosure: "Material figures are recorded on this
  device only. Payment truth remains server-authoritative in Finance."
- No synchronized-truth claim exists for materials (AT9, Journey F). AD3 (materials
  synchronization) stays deferred — 18.5 did not migrate the materials backend.

## Part P — Date & filtering architecture (Stage 9)

Range filters (`filterOrdersByDateRange` / payment `paidAt` scoping) are pure and
deterministic (AT11): same dataset + same range → same numbers. Empty ranges render honest
"No data recorded yet" states, never zero-history trends (AT12). Revenue-this-month uses
the **payment captured timestamp** (`paidAt`), not order creation (mandate §14). Trend
labels derive from the actual window (§20 fix).

## Part Q — Offline truth model (Stage 10)

- Device-local baseline is available offline immediately; mirror merge upgrades provenance
  when sync evidence exists.
- Offline (Journey G, browser-verified with `context.setOffline`): numbers persist from the
  local store, "Locally calculated" notice stays, no live/real-time claims, provenance
  attribute unchanged. The shell offline indicator reports only `navigator.onLine`
  evidence.
- No "Synced/Live" label is ever rendered without sync evidence (CH4; AT10).

## Part R — Authorization audit (Stage 11)

- Analytics are read-only surfaces inside the authenticated workspace shell; they add no
  endpoints and no new permission surface. Workspace isolation is inherited from the
  domain queries + mirror `workspaceId` filtering (AT5 covers projection-level isolation).
- **UNRESOLVED (documented, not invented)**: a per-role analytics policy (e.g. staff
  seeing finance analytics) does not exist in the repository. No permission model was
  introduced in 18.5; the gap is recorded here per mandate §18.

## Part S — Accessibility (Stage 13 of the phase)

Charts carry sr-only text summaries (values exposed to assistive tech); labels are
programmatically associated in the analytics surfaces; filters/keyboard/focus behaviour
inherited from the Stage 6 shell primitives. **Honest scope**: validated via
browser-emulated DOM inspection and the jsdom AT suite — NOT manual screen-reader
certification; no WCAG conformance claim is made (mandate §21, §17 carried).

## Part T — Performance (Stage 12)

Measured (vite build, this phase):
- AuthenticatedApp: 320 KB (Stage 13) → 336 KB (Stage 5–7 projection + bridge) →
  **341.19 KB** (after F-8/F-9 honesty code) — **+21 KB (+6.6%)** accepted WITH evidence:
  the delta buys the single projection both views share. A dynamic-Dexie-import experiment
  moved nothing (Dexie already eager elsewhere) — not retried.
- Reports chunk: 48 KB → **42.10 KB** (projection dedupe).
- PWA precache: 132 entries / **6426.14 KiB** (Stage 13: 6419 KiB; +0.4 KiB this round).
- No memoization added without profiling (mandate §22); projection is a single pass,
  consumed memoized at the two call sites.

## Part U — Tests (Stage 29 mandate)

- **AT suite**: `apps/web/tests/offline/phase18-5-analytics-truth.test.tsx` —
  **17/17 green** (AT1–AT15 + 2 AT8 delivery-evidence regressions).
- **Full web suite**: 22 files, **333/333 green** (`npm test`).
- **Backend**: `api-crud` + `integrity` jest suites **11/11 green** on the F-8 route change;
  `npx tsc --noEmit` clean both apps; production build clean.

## Part V — Browser validation (Stage 14, CERTIFIED 2026-08-30)

Real stack: fresh Postgres (migrations 001–021), live API :8312, live web :5174, real UI
login, real sync engine, real projection. Headless Chromium (browser-emulated — honest
scope). Fresh workspace account per run (probe `/home/user/pgtool/probe185.mjs`).

| Journey | Verified | Result |
|---|---|---|
| A — Fresh workspace | honest zeros, 5 empty-chart states, no demo data, provenance DEVICE_LOCAL, no live claim | ✅ |
| B — Device-local order (UI senator workflow) | Home/Reports count it WITHOUT any server round-trip; server /orders still `[]`; "Locally calculated" | ✅ |
| C — Server money (invoice 500, payment 100) | Home Outstanding GHS 400.00 = Reports Outstanding GHS 400.00 (§39 consistency gate); collected GHS 100.00 both; provenance SERVER_SYNCED; "last synced" evidenced | ✅ |
| D — Stage history (complete sewing+embroidery 200/200) | Stage Distribution renders server history via mirror; Bottleneck "Sewing" (real timing); **Average Turnaround N/A** (no delivery evidence — honest); pre-fix this exposed F-8/F-9 | ✅ |
| E — Repeat customer (2nd order) | Repeat Clients = 1 (AD6 ≥2 rule); customer visible in Reports | ✅ |
| F — Materials (UI-created fabric) | DEVICE-LOCAL disclosure present; no false sync claim | ✅ |
| G — Offline (setOffline) | numbers persist (100/400), Locally-calculated notice, no live claim, provenance stable | ✅ |
| Console | page errors | **0** |

## Part W — Responsive matrix (§31, CERTIFIED)

Reports reached via the real navigation at every width; zero horizontal overflow:

`390 drawer 0px · 430 drawer 0px · 768 drawer 0px · 834 drawer 0px · 1280 sidebar 0px · 1440 sidebar 0px`
(mobile widths navigate More-sheet → Reports; ≥1280 sidebar). Tooling note: the shared
headless-Chromium process is unstable across MANY sequential context creations in this
sandbox — a per-width fresh browser or single-context resize is the reliable harness;
findings are app behaviour either way (verified both ways).

## Part X — PWA impact (§33)

Precache 132 entries / 6426.14 KiB (Stage 13 baseline 6419 KiB → +7 KiB total across
Stages 5–14 of this phase). No duplicate assets; Reports/AuthenticatedApp chunks remain
code-split and lazy; offline operational behaviour unchanged (Journey G).

## Part Y — Decision register (transcribed from phase execution)

| ID | Question | Evidence | Decision |
|---|---|---|---|
| AD1 | Analytics source of truth | Parts D–F; Stage 5 bridge | **RESOLVED — Option C**: one read-only projection over the device-local records merged with the Dexie sync mirror (server rows win). Dashboard AND Reports consume it; no second formula plane. |
| AD2 | Server vs local projection; orphaned `/reports/*`; dead Dashboard.tsx | F-1, F-3 | **RESOLVED-in-principle**: client projection adopted (AD1); orphaned server `/reports/*` + dead `Dashboard.tsx` flagged for retirement at the next cleanup window — not removed inside 18.5 (removal is owner-visible; zero imports verified). |
| AD3 | Materials synchronization | Stage 14 seam, Part O | **Deferred**: materials stay DEVICE-LOCAL with explicit disclosure; no backend migration inside 18.5. |
| AD4 | Analytics export (PDF/CSV/XLSX) | Export-path audit: no mature export utility found in-repo (no jsPDF/CSV download pattern on analytics surfaces) | **Future**: contract only — export consumes the projection when authorized; 18.5 built no document-generation. |
| AD5 | Advanced forecasting | Roadmap | **Future** — 18.5 renders facts + deterministic metrics only (§26). |
| AD6 | Repeat-customer definition + AOV basis | F.3, F.7, Part K | **RATIFIED**: repeat = ≥ 2 orders; workspace AOV = Σ value / Σ orders. Single implementation in the projection. |
| AD7 | Stage-history propagation semantics (raised by F-8) | Journey D evidence, `145b20d` | **RESOLVED**: transitions emit the standard `orders` sync change carrying the refreshed snapshot column; canonical stage tables remain authoritative. Creation-time snapshot seeding stays lazy (first GET/transition) — documented, not changed. |
| AD8 | Delivery-evidence semantics (raised by F-9) | `323e8a9`, AT8 regressions | **RESOLVED**: delivery evidence = explicit `deliveredAt` OR completed canonical `delivered` stage; no other stage completion qualifies. |

## Part Z — Phase 19 handoff

**Phase 18.5 is implemented and certified** (final gates §39 all green, 2026-08-30):
full web suite 333/333 across 22 files · AT suite 17/17 · backend targeted suites 11/11 ·
tsc clean (both apps) · production build clean · PWA precache 132 / 6426.14 KiB ·
browser journeys A–G ✅ with 0 console errors · responsive matrix 6 widths 0px overflow ·
Dashboard↔Reports consistency gate ✅ (Journey C) · workspace isolation inherited + AT5 ·
no fabricated first-run analytics (AT1/Journey A) · protected engines zero-diff ·
clean tree at the certification commits · commits: `22f8171` (projection+bridge),
`20b400d` (Reports), `f2ed807` (Dashboard), `cd076be` (AT suite), `8c65ae7` (stage
history typing), `145b20d` (F-8 sync propagation), `323e8a9` (F-9 delivery evidence),
`0ad3b35` (CH4 copy).

Handoff to Phase 19 commercialization:
- **Trusted workspace foundation**: customer/order/production/finance domains untouched and
  authoritative; analytics truth layer sits read-only on top (Parts H–N).
- **Client business finance ≠ platform billing** (mandate §41): Collected Revenue /
  Outstanding / Overdue Exposure inside client analytics are GHS workspace metrics —
  Phase 19's subscription billing is a separate financial domain and must not reuse or
  rename these definitions.
- **Open items for the owner** (none block Phase 19): retire orphaned `/reports/*` +
  dead `Dashboard.tsx` (AD2); per-role analytics policy UNRESOLVED (Part R); materials
  synchronization deferred (AD3); export contract only (AD4).
- **Environment recipes** for re-certification live in the phase session records
  (embedded Postgres initdb/pwfile, inline-env API with REFRESH_TOKEN_SECRET,
  VITE_API_BASE_URL web, headless-Chromium launch with extracted NSS libs).
