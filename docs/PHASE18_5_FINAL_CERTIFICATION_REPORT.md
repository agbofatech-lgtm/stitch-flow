# Phase 18.5 — Final Certification Report
## Analytics Truth & Client Business Intelligence — Recovery, Browser Validation, Certification

**Date:** 2026-08-30 · **Branch:** `arena/01a053f0-stitch-flow` @ `61dcde8` + this report
**Execution context:** agent/session continuation under the Phase 18.5 Recovery Protocol. The repository was the sole recovery source; the previous session's ~90%-complete hypothesis was tested against Git and **corrected** (see §1).

---

## 1. Recovery record (protocol §1–§7)

| Item | Finding |
|---|---|
| Repository identity | `github.com/agbofatech-lgtm/stitch-flow` — StitchFlow confirmed (remote, tag chain `phase-2…phase-17`, docs corpus) |
| Inherited state | Session branch sat at grafted base `b576c3e` (single-branch clone, fetch refspec `main` only). `main` was **never advanced**; all phase history (Phases 1–17) lives on the chain ending `ef6465f` (`phase-17-integration-validated`, pre-Phase-18 audit) |
| Phase 18.5 branch located | `origin/arena/01a04eef-stitch-flow` @ `61dcde8` — *docs(phase18.5): stage 0-3 — baseline verification, analytics forensics, truth map, metric contract audit* (2026-08-30 17:01:33 UTC). Proven continuation of the Phase-18 product line; verified ancestor-safe |
| Recovery action | **Pure fast-forward** of `arena/01a053f0-stitch-flow` from `b576c3e` to `61dcde8` (`merge --ff-only`), then pushed. No reset, no rebase, no force, no deletions; the predecessor branch was left untouched |
| Working tree | Clean before and after; no uncommitted work found to preserve |
| **Discrepancy finding** | The continuation prompt claimed ~90% completion (architecture, reconciliation designs, date/time + filter architecture, offline truth model, isolation tests, authorization matrix, chart integrity, a11y, performance, J1–J7 pending). The repository shows **Stage 0–3 complete only**; one Phase 18.5 commit exists; `J1–J7` appears **nowhere** in the repo (nearest concept: browser journeys A–G, Part Z gate 30). Stages 5+ are gated behind owner decisions **AD1/AD2 (+AD6)** per the phase document's own STOP rule. The recovery hypothesis is **rejected on evidence**; this session executed the remaining authorized scope |
| Scope of this session | Baseline re-verification · real-stack environment rebuild · browser validation **J1–J7** (constructed, as the prompt's named-but-undefined journeys, against the phase document's own pending items) · this report · handoff. **No Stage-5+ implementation was performed** — the AD1/AD2 gate was honoured |

## 2. Baseline re-verification (Stage 0 gates reproduced at `61dcde8`)

| Gate | Recorded (Stage 0) | Reproduced this session | Verdict |
|---|---|---|---|
| Working tree | clean | clean | ✓ |
| TypeScript | 0 errors (`tsc --noEmit`) | 0 errors | ✓ |
| Tests | 316/316 (21 files), exit noise = 3 documented unhandled errors in `phase18-stage10`/`stage7` | **316/316 (21 files), same 3 documented unhandled errors, no regressions** | ✓ |
| Build | PASS | PASS (2485 modules) | ✓ |
| PWA precache | 132 entries / 6418.78 KiB | **132 entries / 6418.78 KiB (byte-identical)** | ✓ |
| Protected assets | 0-diff | 0-diff (only successor commit `61dcde8` is docs-only) | ✓ |

## 3. Validation environment (rebuilt from repository truth)

The Stage 14 probe (`probe17-stage14.mjs`) lived outside the repository and is not recoverable; the stack was rebuilt to the same fidelity:

| Component | Provision | Note |
|---|---|---|
| PostgreSQL | **18.4** via the repo's own `@embedded-postgres` binaries; all **21 migrations** applied via `scripts/run-migrations.js` | sandbox apt mirrors are unreachable; embedded binaries are the repo's own test dependency |
| Redis | **7.2.5** built from the official source mirror (`nss-dev`/`redis` GitHub) | `queueService` constructs BullMQ queues at import — real Redis required |
| Backend | `tsx src/server.ts` on :3000, repo `.env` (gitignored), JWT/Redis/PG wired | health, register, business routes all green |
| Web | vite dev on :5173, **out-of-repo config** (`/home/user/vite.phase185.config.mjs`) adding a same-origin API proxy; `VITE_API_URL`/`VITE_API_BASE_URL` set to same-origin at process env | **zero product source changes**; plugin/alias/PWA block mirrored from `vite.config.ts` |
| Browser | headless Chromium 149 (`@sparticuz/chromium` + `puppeteer-core`), NSS/NSPR built from source mirrors to satisfy the only missing shared libs | probe harness out-of-repo (`/home/user/probe`) |
| Preview | user-facing live preview served from the same stack (vite :5173 proxying API) | dev CORS permissive by design (`app.ts` Phase 4 comment names sandbox previews) |

## 4. Method (recorded honestly)

- Fresh workspace per run via the product's own `POST /auth/register`; **exactly one real UI login** per run; sessions are the app's own tokens.
- Server-side seed data created **only through the product REST API** with the account's own tokens (2 customers, 2 orders, 1 invoice, 1 captured payment). No direct DB writes. No fabricated records anywhere.
- One probe run produced the certified evidence (`sfv-evidence/p185/journey-results.json` + 16 screenshots). Earlier runs in this sandbox were diagnostic: v1 selector misses and an **auth rate-limiter 429** (shared 5/900 s window consumed by register) — recorded in §7 as probe/environment operations, per the Stage 14 convention. Backend restarted once to clear the limiter window between runs (documented operational behaviour, not a product defect).
- Viewport 1440×900. Offline journey uses Chromium `setOfflineMode` (real request blocking). J6's 6 console errors / 6 failed requests are the **induced** disconnections (`net::ERR_INTERNET_DISCONNECTED`), expected and honest.
- Constraints: dev-mode vite (not the production service worker build), single viewport (no reduced-motion pass), GHS workspace. None of these gate the analytics-truth findings.

## 5. Journey results — J1–J7 (all PASS, 7/7)

Server truth at probe time: order value **3,300** (2 orders, none cancelled) · captured payments **300** · invoice INV-P185-1 recalculated by server to **Paid 600 / Balance 200 / status `partial`** (seed `amountPaid=300` + captured payment 300 — server is the money authority).

| # | Journey | Key evidence (verbatim from the run) | Verdict |
|---|---|---|---|
| **J1** | Fresh-workspace truth | Landing renders; real UI login; Home: `CUSTOMERS 0 · MATERIALS 0 · ACTIVE ORDERS 0 · PENDING BALANCES GHS 0.00` + provenance footnote; "No customers yet" empty state; Materials demo-free; Reports **5 × `data-chart-empty="true"`** with scope label "Locally calculated — from the records stored on this device…". **0 console errors, 0 failed requests** | PASS — honest empty everywhere |
| **J2** | Server-truth propagation | Home Active work shows `SF-P185-A · In Progress · due 6 Sep`; chip `ACTIVE ORDERS 1`; Finance shows `INV-P185-1 · Total 800.00 · Paid 600.00 · Balance 200.00 · PARTIAL PAYMENT` with explicit subtitles ("Sum of invoice totals / amounts paid / balances due"); Production board shows delivered `SF-P185-B` | PASS — server planes flow to Home/Finance/Production |
| **J3** | **F-1 revenue mislabel** | `GET /dashboard/summary` (fetched in the page's own session): `totalRevenue: 3300` vs captured payments **300** — API "revenue" is order value, 11× collected money. **Live Home renders no revenue figure at all**; the labelled card ("Total Revenue · Real database revenue", `components/Dashboard.tsx:312-319`) is in **unreachable dead code** — only importer is `App.tsx.bak`; live route is `case 'dashboard' → <HomeView/>` | PASS — F-1 confirmed at contract level; UI exposure refuted (new fact, sharpens Part F) |
| **J4** | **F-2 Reports local-blind** | Same session that just displayed server data: Reports still **5 honest-empty charts**, sr-only summaries present, scope label verbatim; zero fabricated analytics | PASS — the two-truths divergence reproduced exactly as Part E predicts |
| **J5** | **F-6 mixed-plane Home + S8 materials** | UI Add Material ("Kente Strip (probe)", qty 2 ≤ reorder 5) appears locally (`MATERIALS 1`, Low-stock alert on Home) while **server `GET /materials/fabrics` does not contain it** (S8 re-confirmed). Same screen: `CUSTOMERS 0` (local) **beside** `ACTIVE ORDERS 1`, `PENDING BALANCES GHS 200.00` (server) and server `totalCustomers: 2` | PASS — mixed-plane chip row proven live (see §6, new finding F-9) |
| **J6** | Offline honesty | Offline: Home degrades to **"Live figures unavailable — Orders and finance figures could not be loaded (you may be offline)… your locally saved data is untouched"** with `PENDING BALANCES —`; Reports stays honest-empty with local scope label. Reconnect: server truth restored (`SF-P185-A`, `ACTIVE ORDERS 1`) | PASS — no fabricated offline numbers |
| **J7** | Chart integrity & a11y | Reports DOM: 5 `data-chart-empty` surfaces (all honest-empty on a data-free device), sr-only text alternatives enumerated ("No data yet for …"), heading hierarchy intact; Dashboard card titles present | PASS — chart-integrity + a11y rules hold in browser |

Hygiene across J1–J5, J7: **consoleErrors 0 · failedRequests 0**. J6: only the induced offline errors. Screenshots: `sfv-evidence/p185/J1…J7-*.jpg` (16 files), machine record: `journey-results.json`.

## 6. New forensic facts produced by validation (feed AD1/AD2; no code changed)

| ID | Finding | Evidence | Consequence for the decision register |
|---|---|---|---|
| **F-8** (refines F-1) | The revenue mislabel is **not user-visible** in the live product: Stage-6 `HomeView` renders no revenue figure; the mislabelled card lives in `components/Dashboard.tsx` (only importer `App.tsx.bak` = dead) and in the `/dashboard/summary` contract (`totalRevenue` = order value). `DashboardSummaryCard.tsx` (label "Revenue") is likewise only imported by the dead file. | J3 (+ source: `AuthenticatedApp.tsx:42`, `HomeView.tsx`) | AD2's "fix F-1 label" is cheaper than the audit assumed: retire dead code + rename the API field (or document `orderValue` semantics) — no live-surface redesign needed. **Decision still the owner's.** |
| **F-9** (sharpens F-6/F-2) | The Home chip row mixes planes **within one component row** (`HomeView.tsx:148-153`: Customers/Materials = local store; Active orders/Pending balances = server), which at validation time produced a **self-contradictory screen**: chip `CUSTOMERS 0` + "No customers yet / add your first customer" empty state beside `ACTIVE ORDERS 1`, `PENDING BALANCES GHS 200.00`, invoice `INV-P185-1` for customer "Ama Serwaa" — on a workspace whose server holds 2 customers. | J5 screenshot `J5-home-chips-after-local-add.jpg`; J2 | Strongest empirical argument yet for the Option C unified projection; the contradiction is customer-facing today. **Decision still the owner's.** |
| **F-10** | Home's provenance footnote ("Figures combine live workspace data with this device's saved records") is present and truthful but does not identify **which** figures are which plane. | J1/J5 | Adequacy ruling belongs in AD1's label vocabulary. |
| **F-11** | Device-local writes propagate to Home instantly (local chip 0→1 on add) while server planes require refetch — flow direction re-confirms Part E's seam #1 with live timing evidence. | J5 | Confirms the bridge (not the stores) is the missing piece — matches Part G Option C rationale. |

## 7. Probe-defect register (harness, not product)

1. v1 used a `role="dialog"` selector; the Materials modal has no dialog role → generic fill hit page inputs (v2 targets `.fixed.inset-0 form` by field label).
2. v1 assumed the legacy `Total Revenue` card renders in the live dashboard; source work proved the live route renders `HomeView` — assertions corrected, and the refutation itself became evidence (F-8).
3. Run-2 (v2 first attempt) hit the shared 5/900 s auth limiter (register consumed the window; UI login 429) → all waits timed out; backend restarted to clear the in-memory window (Stage 14 documented the same operational need).
4. `GET /invoices/:id` has no detail route (list-only) → invoice state read from the list endpoint.
5. J1 v1/v2-early regex demanded the `—` placeholder; the honest server-zero (`GHS 0.00`) is equally valid — predicate widened, never loosened to accept fabricated values.

## 8. Certification verdict

**PHASE 18.5 — ANALYTICS TRUTH & CLIENT BUSINESS INTELLIGENCE: VALIDATED to the full extent authorised by the repository's own stage gate.**

- Stage 0–3 claims: **reproduced** (§2).
- The seven pending validation journeys: **executed against the real running application — 7/7 PASS** (§5), with two material corrections to the forensic record (F-8, F-9) that make the AD1/AD2 decision *easier*, not harder.
- No product source was modified. All evidence is committed under `sfv-evidence/p185/`.
- **The Phase 18.5 STOP gate stands:** implementation of Stage 5+ (projection layer, Dashboard/Reports reconciliation, date/time + filter architecture, offline truth model, AT suite, responsive matrix, PWA gates, final certification) remains **blocked on owner decisions AD1 (analytics source of truth — recommendation Option C), AD2 (adopt/retire `/reports/*`; F-1 remediation), AD6 (repeat-customer & AOV definitions)**. This report intentionally does not decide them.

## 9. Phase 19 handoff

| Item | State |
|---|---|
| Commercial readiness inputs | Analytics truth layer **designed but not implemented**; decision register AD1/AD2/AD6 open and now carry browser-grade evidence (§5–§6). AD3 (materials sync) remains deferred device-local; AD4/AD5 future. |
| Deferred to Phase 19 (per mandate boundary) | Billing/subscriptions/entitlements, Control Center (Plane B), Public API, AI autonomy, 3D, system rewrites. |
| Phase 19 must not assume | That Reports shows workspace truth (it does not — F-2), that `/reports/*` is consumed (it is not — F-3), that `totalRevenue` means collected money (it does not — F-1/F-8). |
| Recommended first Phase 19 action | Ratify AD1/AD2/AD6, then authorise Phase 18.6 Stage 5 (projection layer per Option C) — the validation harness, stack, and evidence conventions from this phase are reusable as-is. |
| Repository state at handoff | `arena/01a053f0-stitch-flow` = recovered Phase 18.5 history + `docs/PHASE18_5_FINAL_CERTIFICATION_REPORT.md` + `docs/PHASE18_5_ANALYTICS_TRUTH.md` (Part H) + `sfv-evidence/p185/*` · `main` untouched (as found) · no phase-18.5 tag exists (none was authorised to be created by the recovered protocol). |

**STOP.** Phase 18.5 is certified to its authorised boundary. Phase 19 does not begin in this session.
