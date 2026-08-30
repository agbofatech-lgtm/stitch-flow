# Phase 18 — Stage 14: Full Product Browser Certification Report

**Stage:** 14 (final Phase 18 release gate)
**Date:** 2026-08-30
**Baseline:** `cf317ae` (Stage 13 tip) — working tree clean, zero source changes during certification
**Verdict:** **PASS — browser-emulated certification achieved across all 13 domains, full viewport matrix, journeys X1–X5, Reports R1–R5, the Finance critical test, and a supplemental pass covering every §20 sub-check (§6a). Zero P0/P1/P2 defects. Five P3 observations documented below (no scope expansion).**

---

## 0. Honest scope statement

- This is **browser-emulated** certification (headless Chromium driven by Playwright, real embedded PostgreSQL 18.4, real API :8312, real Vite dev server :5174). It is **not** physical-device validation, and **no** device certification is claimed.
- Accessibility assertions are structural (labels, dialog semantics, sr-only chart summaries, focus/Escape behaviour). **Screen-reader verification remains manual; WCAG conformance is not claimed.**
- Console errors and failed network requests were captured on every pass: **0 / 0 on all nine passes.**
- Horizontal overflow was asserted on every view at every viewport: **0 px overflow everywhere.**

## 0.1 Method

- Probe: `probe17-stage14.mjs` (9 passes, outside the repository). Each deep pass registers a **fresh account** (fresh workspace), so workspace-integrity checks run against genuinely empty state before any data is created.
- Sessions injected via `localStorage` (`stitchflow.auth.accessToken` / `refreshToken`); exactly **one real UI login + logout** per run (public-1440).
- Auth rate limiter (5/900 s per route, in-memory) is operational hardening, not a defect: probe runs reuse a single minted token; the backend was restarted between runs to clear the window during development of the probe itself.
- Two earlier aborted runs (strict-mode dialog selector; limiter) are recorded as probe defects, not product defects. The final run completed all nine passes end-to-end in one execution (~6.8 min).

---

## 1. Certification matrix — 13 domains × 9 passes

Viewports: full regression 1440 / 390 · major workflow 834 / 430 · smoke 1280 / 768 · public 1440 / 390 (+390 reduced-motion).

| # | Domain | Checks | 1440 | 390 | 834 | 430 | 1280 | 768 |
|---|--------|--------|------|-----|-----|-----|------|-----|
| 1 | Public site | 12 landing sections render; 10/10 images load; no unverifiable claims; reduced-motion pass; 0 overflow | ✅ | ✅ | — | — | — | — |
| 2 | Authentication | Landing→Sign In handoff; real UI login; protected-route redirect to /login; sign-out returns to signed-out surface | ✅ | ✅ | — | — | — | — |
| 3 | Shell | Sidebar 10 items (desktop) / bottom-nav 5 slots + More dialog (mobile); More Escape closes; all 5 More destinations reachable (invoices, materials, reports, settings, developer); account-menu Escape | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Customers | Create (modal, `Add Customer` submit), search, edit | ✅ | ✅ | ✅ | ✅ | load | load |
| 5 | Orders | Full Stage-8 order workflow: senator garment → confirm → SF-numbered order (`SF-260830-…`), snapshot card, Design Studio entry | ✅ | ✅ | ✅ | ✅ | load | load |
| 6 | Intelligence | Readiness computed; decimal measurements preserved; advisory banner present; advisory non-mutating (measurements & orders unchanged after intelligence visit) | ✅ | ✅ | ✅ | ✅ | load | load |
| 7 | Design Studio | Entry from order-confirmed view; lazy chunk loads | ✅ | ✅ | ✅ | ✅ | load | load |
| 8 | Production | 9-stage timeline (measurement → delivered); full lifecycle to terminal `delivered`/“No open stage”; skip dialog states reopened-later consequence; reopen dialog states “every stage after it”; downstream cascade verified | ✅ | ✅ | ✅ | ✅ | load | load |
| 9 | Finance | Partial payment 100 on 500 invoice → server Paid=100 / Balance=400 displayed; full payment to Paid; duplicate replay 201→200 `duplicate:true`; overpayment rejected server-side (400 dialog error); no false success | ✅ | ✅ | ✅ | ✅ | load | load |
| 10 | Reports ⭐ | R1 demo-free · R2 five honest empty charts · R3 real-data propagation · R4 sr-only summaries · R5 responsive (see §3) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11 | Materials ⭐ | Reachable from More dialog; demo-free; no fictional inventory | ✅ | ✅ | ✅ | ✅ | load | load |
| 12 | Settings ⭐ | Save Company Profile → “Company profile saved.”; injected 500 → honest red error, **no false success** | ✅ | ✅ | ✅ | ✅ | load | load |
| 13 | Developer ⭐ | Fail-closed UI (403 surface), no `sk-…` secrets in DOM, server rejects key creation with 403 | ✅ | ✅ | ✅ | ✅ | load | load |

All passes: **consoleErrors 0, failedRequests 0, overflow 0.**

## 2. Cross-module journeys X1–X5

- **X1 customer→order→invoice→payment→Reports — PASS.** Customer created in Customers, order confirmed through the Stage-8 workflow, invoice generated, payments recorded through the payment dialog, and Reports reflects the session’s real data afterwards (`r3_localAnalytics` true on every deep pass). Local analytics revenue stays honestly empty because payments live server-side — the documented duality (`r3_revenueHonest`).
- **X2 order→intelligence→production — PASS.** The confirmed order flows through Intelligence (advisory only; measurements/orders bit-identical after the visit) into Production, where the 9-stage lifecycle runs to `delivered`.
- **X3 rework cascade — PASS.** Completing later stages, then reopening an earlier one, re-pends every downstream stage (“every stage after it”); skip dialog warns about the reopened-later consequence; cascade observed via “Measurement/Cutting/Sewing — Pending”; full lifecycle then re-completes to terminal status.
- **X4 fresh-workspace integrity — PASS.** Every deep pass starts from a **freshly registered workspace**: zero fictional customers/orders/payments/revenue, five honest “No data recorded yet” charts, demo-free Materials. Nothing appears that was not created by the probe.
- **X5 authorization boundary — PASS.** Developer view fails closed with a visible 403/disabled surface, no secrets leak into the DOM, and the server rejects `POST /developers/keys` with **403** (verified both through the UI fetches and a direct authenticated API call). Visibility ≠ authorization preserved.

## 3. Reports certification R1–R5 (first-class domain)

- **R1 fresh workspace:** demo-free at every viewport — no Emma Thompson / Wedding Gown / legacy fixture numbers anywhere.
- **R2 empty states:** exactly **5** `data-chart-empty` markers with honest empty copy before any data exists.
- **R3 real-data propagation:** after the pass creates customers/orders/payments, Reports reflects them; server-side payment totals are never recomputed client-side.
- **R4 accessibility (structural):** sr-only bar-count summaries are **0 while charts are empty** (correct — no bars exist) and **2 once real data exists**; scope notice present (`data-reports-scope="local"`). Screen-reader behaviour remains manual verification (see §0).
- **R5 responsive:** Reports renders and operates at all six viewports with 0 overflow; local-scope notice visible at every width.

## 4. Finance critical test (server-authoritative money)

| Step | Expected | Observed |
|------|----------|----------|
| Invoice 500, pay 100 | Server returns Paid=100 / Balance=400; UI displays server result | ✅ `fin_partial` (4/4 passes) |
| Pay remaining 400 | Paid=500 / Balance=0 / status paid | ✅ `fin_full` (4/4) |
| Replay same `clientMutationId` (UUID) | 201 then 200 `duplicate:true`; exactly one financial event | ✅ 201 / 200 `duplicate=true`; invoice reconciled to a single payment (50 of 300 → balance 250, partial) in direct verification |
| Overpay (500 on 200 balance) | Server 400; dialog error; `[data-outcome="success"]` count 0 | ✅ `fin_overpayRejected` + `fin_noFalseSuccess` (4/4) |

The UI never invents money: every figure displayed comes from the server response; rejections surface as dialog errors with no success state.

## 5. Lazy-load & offline (regression check)

- All **10 lazy views** load at smoke viewports (dashboard, customers, orders, production-board, invoices, design-studio, materials, reports, settings, developer) — no chunk-load or dynamic-import failures anywhere in the final run.
- Baseline gates re-verified before certification: **316/316 tests · tsc 0 errors · build PASS · precache 132 entries / 6418.78 KiB** (Stage 13 state preserved; no protected assets modified — `git status` clean throughout).

## 6. Defect register (final run)

**P0: none. P1: none. P2: none. P3: five (S14-1 … S14-5).**

| ID | Severity | Observation | Evidence | Disposition |
|----|----------|-------------|----------|-------------|
| S14-1 | P3 | Sign-out lands on the public landing (`/`) rather than `/login`. Cause: `logout()` clears tokens asynchronously while `navigate('/login')` runs with the old token still readable, so the still-authed route gate bounces `/login` → `/` before the auth state settles. Both destinations are signed-out public surfaces; session is fully terminated either way. | `logoutDiag` on public-1440 (both runs, deterministic) | Documented; defer to Phase 19 UX pass. No fix under certification discipline. |
| S14-2 | P3 | `POST /payments` with a **non-UUID** `clientMutationId` returns 500 (`22P02` from the uuid-typed sync-change column) instead of 400. Fail-closed: the whole transaction (payment + invoice reconciliation + sync records) rolls back atomically; no partial state. The UI always sends `crypto.randomUUID()`, so no user-facing path exists. | Direct API reproduction + server stack trace; contract verified correct with UUID (201/200 `duplicate:true`) | Documented; recommend 400 validation hardening later. Not a certification blocker. |
| S14-3 | P3 | Settings save failure surfaces as terse `"HTTP 500"` (red, visible) rather than the server’s message — `apiPut` throws `Error(\`HTTP ${status}\`)`. Honest (no false “saved.” — verified), but terse. Related: `updateWorkspaceProfile(payload)` writes the local profile store optimistically *before* the server accepts, so a rejected save leaves the local cache ahead of the server until next refresh. | `settings_failureEvidence: "HTTP 500×6"`; source `apps/web/src/shared/utils/api.ts:209`, `Settings.tsx:249-275` | Documented; message wording + optimistic-local-write ordering deferred. |
| S14-4 | P3 (informational) | sr-only chart summaries read 0 bars while charts are empty (correct behaviour, since no bars exist) — certification asserts them post-data instead. Recorded so the 0 is not misread as a defect. | `r4_srOnlySummaries: 0` empty vs `r4_srOnlyWithData: 2` | No action. |
| S14-5 | P3 | Materials Add/Edit modal is a hand-rolled overlay: no `role="dialog"` / `aria-modal` / Escape / focus trap, and its `<Field>` labels are unassociated with inputs. Same family Stage 13 fixed elsewhere via ModalShell/FormFields. The mandate's Domain 11 matrix does not require dialog a11y for Materials, so it is out-of-matrix — documented, not fixed, to avoid silent scope expansion. | `MaterialModal` source (`Materials.tsx:710-760`): plain `div.fixed` overlay, bare `<label>`; browser: modal opens but exposes no dialog semantics | Defer to the a11y/visual-modernization register (pre-Phase 19 owner decision). |


## 6a. Supplemental certification pass (mandate §20 sub-checks covered implicitly by the main matrix)

Run after the main PASS, certification-only, no source changes (`probe17b-supplement.mjs`, 1440×900, data-bearing account; plus focused diagnostics). Where a check succeeded in some runs and was obscured by harness interference in others, the *observed product behaviour* is stated with verbatim evidence.

| # | Sub-check (mandate §20) | Verdict | Evidence |
|---|--------------------------|---------|----------|
| S1 | Domain 2 — Session handling (token refresh) | **VERIFIED** | Invalid access + valid refresh token → silent refresh → authenticated shell (`s1_sessionRefresh` true, reproduced across runs). Refresh tokens rotate; replaying a rotated refresh token is **rejected fail-closed** (app signs out to /login — observed when a stale token was re-injected). |
| S2 | Domain 3 — Focus restoration | **VERIFIED** | Account menu: Escape closes and focus returns to the account button (`s2_focusRestoreAccount` true). Modal focus traps/Escape were Stage-13-verified and re-exercised by the main matrix dialogs. |
| S3 | Domain 4 — Customers error state | **VERIFIED (two honest behaviours)** | (a) *Graceful degradation:* with REST `/customers` failing, the view serves the local store/sync data — “**32 of 32 customers**” — real data, no fabrication, no crash, no false error (`s3_localStoreResilience` true, reproduced twice). (b) *Honest error surface* when no data is available, verbatim: “⚠ Customers unavailable — Saved lists could not be loaded (HTTP 401). You may be offline — try…” (real status code shown, retry offered). View-level error UI confirmed in source (`Customers.tsx:203-225`). |
| S4 | Domain 4 — Customer workspace | **VERIFIED** | Row → `[data-view="customer-workspace"]` with measurements context (also exercised in all four main deep passes before edit). |
| S5 | Domain 5 — Validation | **VERIFIED** | Order workflow measurements step: with empty required fields the wizard **refuses to advance** — next-step disabled and step unchanged (`s5_validationBlocksEmpty` + `s5_stillOnMeasurements` true). |
| S6 | Domain 6 — Missing-data honesty | **VERIFIED** | Deterministic readiness card reports `data-ready="false"` **before** data entry; still `false` after only 1 of N fields — readiness never overstates completeness. (The `missing` IntelligenceCard kind is not rendered in this flow; `data-ready=false` is the honesty signal.) |
| S7 | Domain 8 — Audit timestamps | **VERIFIED** | Production timeline renders per-stage datetimes: “Measurement — Completed / **completed 30 Aug, 15:22** / canonical code: measurement / Reopen” (`s7_auditTimestamps` true). |
| S8 | Domain 11 — Materials functional depth | **VERIFIED (supported behaviour)** | UI Add Material → item appears in list; low-stock computed correctly client-side (qty 2 ≤ reorder 5 → item retained under the Low-stock filter). **Decision-register evidence:** the UI-created fabric is **not** pushed to the server (`s8_serverSeesUiFabric:false`; `addFabricRecord` is state-only) — the documented device-local/server drift, quantified for the materials reconciliation decision. |
| S9 | Domain 10 — Reports on hydrated (non-session) data | **VERIFIED honest-empty; decision-register evidence** | In a fresh browser context against a data-bearing account, Reports (local scope) shows 5 honest empty charts and 0 sr-only bars — no fabricated analytics. Implication for the analytics-truth decision: the local analytics projection reflects **session-local writes only**; server-hydrated data does not feed it. This is precisely the Option A/B/C question — no change made under certification. |

Supplemental run hygiene: `consoleErrors 0 · failedRequests 0 · overflow 0`. Harness note: `/auth/login` and `/auth/refresh` share the 5/900 s limiter; the app's own refresh retries during deliberate bad-token tests can consume that window (test-environment behaviour, restarted between runs — not a product defect).

## 6b. Architecture decision register — new quantified evidence

1. **Analytics truth (Option A/B/C):** local Reports projection = session-local writes only; server-hydrated orders/payments do **not** propagate into it (S9). Any option chosen must define whether hydrated server data feeds local analytics.
2. **Materials reconciliation:** the write path is one-way (UI → local store only; S8). Server material contracts exist (`POST /materials/fabrics` + idempotent usages) but are not called by the UI today.
3. **Developer entitlement:** unchanged (fail-closed 403, X5). Server-signal + hide recommendation stands.

## 7. Probe defects found & fixed during certification (not product defects)

1. `page.reload()` mid-journey lands on **Home** because in-app views are state-driven (only `/developer` & `/platform` are URL-backed) — removed the reload; the invoice row was already in the live list.
2. Duplicate-payment test originally sent a non-UUID `clientMutationId` (see S14-2) — corrected to UUID; contract then verified green.
3. Settings failure assertion originally matched `/injected failure|failed/` but the UI honestly renders `"HTTP 500"` — corrected the assertion to the real error surface.
4. Dialog close buttons embed the modal title in `aria-label` → strict-mode violations; all dialog targets use `button[type="submit"]`.
5. Auth limiter (5/900 s) trips across back-to-back full runs — single minted token reused; one real UI login per run.

## 8. Stage 14 verdict & handoff

- **Certification: PASS.** All 13 domains, 6 viewports (+reduced-motion), X1–X5, R1–R5, Finance critical test, supplemental §20 sub-check pass (§6a: session refresh, focus restoration, customers error/resilience, workflow validation, missing-data honesty, audit timestamps, materials functional depth, hydrated-Reports honesty), lazy-load integrity, zero console errors / failed requests / overflow.
- Phase 18 is now **ready for owner acceptance and freeze**. No source files were modified in this stage (certification-only mandate honored).
- Per the Stage 13 handoff, the following architecture decisions remain queued for the owner **after** acceptance, before any Phase 19 work:
  1. Analytics truth (Option A/B/C — investigate C; now with §6b evidence: local projection = session-local writes only);
  2. Developer entitlement (recommend server signal + hide);
  3. Materials reconciliation (now with §6b evidence: UI write path is local-only, one-way);
  4. Deferred visual modernization (incl. S13 contrast remediation hexes, S14-1 logout destination, S14-2 payment validation hardening, S14-3 settings error wording, S14-5 Materials modal semantics/labels).

**Phase 19 remains PROHIBITED until owner acceptance of this report.**
