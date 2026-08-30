# Phase 18 — Stage 13: Capability Reconciliation, Accessibility & Performance

**Status: IMPLEMENTED. Baseline `5baecd6` (audit doc) on Stage 12 code baseline `96e4848`.**
Evidence classes: VERIFIED · IMPLEMENTED · IMPROVED · KNOWN LIMITATION · MANUAL VALIDATION REQUIRED · UNRESOLVED.

---

## PART A — Stage Mandate

Reconcile the remaining active surfaces (audit findings), establish honest capability boundaries, and harden the whole application — accessibility, performance, offline integrity — for Stage 14. Not a feature stage: no new analytics platform, no redesign, no silent contract replacement, no Stage 14/Phase 19+ work.

## PART B — Baseline (verified, not assumed)

Environment was **re-provisioned again** before Stage 13 (local git found at base `b576c3e`); repaired via the documented protocol (`fetch` → `reset --hard 5baecd6` → `clean -fd` → `npm ci`), then baseline gates re-run: **307/307 tests · tsc 0 · build PASS · precache 116 entries / 6411.36 KiB · dist 6856 KB** — exactly matching the audit's recorded values. Branch `arena/01a04eef-stitch-flow`; tree clean; remote tip verified `5baecd6`. Protected assets recorded and re-verified 0-diff at completion.

## PART C — Audit Findings Consumed

All five P0 domains re-forensically confirmed before implementation: P1 demo seed (`db.ts` → `seedData.ts` → `mockData.ts` chain; seed predates Phase 18 — initial commit; no demo-mode marker, no onboarding consumer, no demo/production distinction); P2 customer-edit orphan (modal + `updateCustomer` contract fully valid incl. validation/error/saving states); P2 analytics truth ×3 (local Reports vs unused `/reports/summary` vs Home's `/dashboard`); P3 developer visibility (fail-closed confirmed; `describeError` already classifies `FEATURE_DISABLED` precisely — no change needed); P3 materials contract drift; contrast/status-token measurements (Part Q).

## PART D — Capability Reconciliation Matrix

| Module | Reachable | Authorized | Data source | Offline | Mobile | A11y | Perf | Verdict |
|---|---|---|---|---|---|---|---|---|
| Orders | ✓ | auth | local store | FULLY OFFLINE | ✓ (More) | legacy baseline verified | now lazy-split | RECONCILED |
| Materials | ✓ | auth (device-local) | local store | FULLY OFFLINE | ✓ | verified baseline | lazy-split | RECONCILED (server drift documented) |
| Reports | ✓ | auth + client tier gate | local store | FULLY OFFLINE | ✓ | **charts now accessible** (values + empty states) | lazy-split; memoized | **INTEGRITY RESTORED** (no demo seed) |
| Developer | ✓ (unconditional nav — UNRESOLVED visibility) | server fail-closed (flag OFF, DB-verified) | server | ONLINE REQUIRED | ✓ | error classification honest | lazy-split | PRESERVED (visibility = owner decision) |
| Settings | ✓ | owner/admin server-gated for mutations | server + runtime mirror | ONLINE REQUIRED (mutations) | ✓ | save states honest (Saving/Message/Error) | lazy-split | CERTIFIED (P3 mirror note) |
| Design Studio | ✓ nav + contextual | auth | local store | FULLY OFFLINE | ✓ | protected — untouched | lazy-split (import site only) | PRESERVED, 0-diff |

## PART E — Reports Data Lineage

Confirmed three analytics paths: (1) **Reports UI** — local persisted store only, zero API calls; (2) **server `/reports/summary`** — SQL aggregates, auth+workspace gated, **zero UI callers**; (3) **Home `/dashboard`** — server, Stage 7 UI. Local Reports revenue uses captured-payments semantics; Finance displays server `amountPaid`/`balanceDue` — semantics documented (Part G/§22 register carried from audit).

## PART F — Analytics Authority Classification

**Outcome C (hybrid, intentional)** + **Outcome D applied to inputs**: local computation is preserved (offline-first, honest scope label — no new central service, no server migration, §39 stop-rule respected), while the fabricated first-run inputs are removed (Part G). Server remains canonical for money truth (Finance) and workspace aggregates (Home).

## PART G — Demo-Data Decision (P1 remediation)

**Outcome D (production integrity defect) with Outcome B retention** — evidence: the seed exists solely as a Phase-≤12 development demo dataset (initial commit; referenced by no onboarding flow; no demo-mode marker; nothing distinguishes demo from business records; live browser previously showed "Emma Thompson"/"Wedding Gown"/GHS 702/2,164 on a fresh authenticated account).
- `db.ts` gains `createEmptySeedData()`: operational initialization (`initializeAppStorage`) now seeds **empty collections** (customers/orders/invoices/payments/dueAlerts/fabricRecords/materialUsages/profiles); workspace scaffolding ids retained (demo tools only).
- `createSeedData()` retained verbatim as the development/test fixture.
- **Existing devices keep their data** — storage version intentionally NOT bumped (no destruction).
- Live-proven at 6 viewports: fresh context → Reports renders honest empty states, zero demo values.

## PART H — Developer Dashboard Policy Findings

Visibility ≠ authorization ≠ entitlement: nav visible to all members (no client entitlement signal exists — §7.3 forbids inventing one; **discoverability UNRESOLVED, carried**); authorization = auth + workspace + `DEVELOPER_API` flag (server, fail-closed 403/503; flag **false** in live DB); entitlement = flag-on role granularity question documented for the owner (no `requireWorkspaceRole` on `/developers` today). Browser: dashboard renders, shows the honest "disabled for the deployment (feature flag OFF)" classification, **no secrets exposed**. No security change made; none needed.

## PART I — Settings Certification

Verified: server-authoritative mutations (`PUT /settings/:key`, POST/PUT/DELETE members — `requireWorkspaceRole('owner','admin')`); honest async states (Saving…/saved message/error surface); dangerous controls (currency, member removal, branding) remain server-gated. P3 carried: in-session workspace mirror re-derives from fixture data on reload until Settings re-fetches (cosmetic, server values re-hydrate). No redesign.

## PART J — Materials Certification

Records/usages device-local (localStorage + IndexedDB mirror); usage sync pushes via existing queue; `/materials` server CRUD remains UI-unused (drift documented, not migrated — §9 respected). No cloud-sync claims found in UI copy. Module verified reachable + functional at all widths.

## PART K — Customer Ecosystem Reconciliation

**Edit restored (audit P2 → closed)**: `Edit details` action in the customer workspace mounts the existing `EditCustomerModal` (now exported) → existing `updateCustomer` API; save updates the workspace header live; list re-fetches on exit. Verified in browser (name change reflected) and tests (CH7–CH9). **Delete**: corrected record — never existed server-side; Stage 7 doc amended with a clearly-marked Stage 13 correction. No speculative delete built.

## PART L — Accessibility Findings (application-wide)

- **Fixed (IMPROVED)**: legacy `ModalShell` (Add/Edit customer modals) now composes the DS `useModalBehaviour` primitive — Escape, focus move-in/trap/restore, scroll lock (all legacy modals on that shell).
- **Fixed (IMPROVED)**: `FormFields` (Add/Edit customer) labels were unassociated → now `htmlFor`/`id` via `useId` + `aria-required` on the required name field.
- **Fixed (IMPROVED)**: Reports `ChartCard` values invisible to AT → sr-only per-bar values + per-chart summary; all-zero charts now an honest "No data recorded yet" state (§6.4/§21).
- **Verified (existing strength)**: DS primitives (Dialog/Drawer focus+Escape, tabs roving tabindex, focus-visible rings, aria-current nav, landmarks, skip link, non-colour status shapes, `prefers-reduced-motion` global) — Stages 5–12 suites re-run green.
- **Known limitations** (documented, not remediated): legacy slate surfaces (Reports/Materials/Settings/Orders/Developer) pre-DS visual language; assistive-technology (screen reader) validation **MANUAL VALIDATION REQUIRED**; browser DOM/keyboard testing is not AT certification (§49).

## PART M — Keyboard/Focus Validation

Browser-validated: Escape closes the reconciled edit modal (3 viewports); DS overlay contracts remain covered by Stage 6/12 tests; focus-visible classes verified across DS components; no keyboard traps found in tested flows (wizard steps, payment sheet, More sheet, edit modal). Focus order inside legacy modals now managed by the DS primitive.

## PART N — Modal/Overlay Validation

DS Dialog/Drawer/Tooltip + payment sheet (Stage 12) + account menu (Stage 6) — verified. Stage 13 added ModalShell to the managed set. InvoiceModal Stage 12 height/scroll fix re-verified by the finance journey. No overlay regressed.

## PART O — Forms & Error Semantics

Measurement entry (decimal inputMode + visible units) re-verified in journey B; payment sheet (decimal amount, required method/reference, server-rejection shown as error, never fake success) re-verified in journey D; customer create/edit validation messages verified (name/phone required, email format); Settings saving/saved/error states verified. No second measurement model introduced.

## PART P — Charts/Report Accessibility

Every `ChartCard` now exposes: sr-only per-bar `label: value` (currency-formatted for revenue charts), a full sr-only series summary, `aria-hidden` decorative bars, and an honest empty state when no observations exist. Colour is never the sole carrier (values textual).

## PART Q — Contrast Findings (programmatically computed)

Body/text pairs pass strongly (ink/ivory 16.26 AAA; ink-soft 9.59; ink-mute 4.86 AA; ivory/charcoal 16.26; ivory@70/charcoal 8.45; gold-light/charcoal 9.23). **Measured gaps**: status text tokens below 4.5 on light grounds at small sizes — success 3.02, warning 3.72, danger 4.43, advisory 3.03 (all ≥3 → large-text/graphics AA; non-colour cues — icons ✓/◐/!/✗ + labels — already accompany every status, satisfying 1.4.1); focus gold 2.05 (non-text 3:1 gap); ink-mute on subtle 4.22. **Classification: KNOWN LIMITATION → owner decision** — remedying requires darkening accepted Stage 3 brand tokens (recommended values computed and recorded: e.g. success→#15803d, danger→#b91c1c, warning→#92400e); not changed silently under Stage 13 (§3.3/§49).

## PART R — Performance Baseline (before)

Tests 307/307 · build PASS · precache 116 / 6411.36 KiB · dist 6856 KB · **AuthenticatedApp chunk 1008 KB** (all views eager) · index 340 KB · html2canvas 200 KB (transitive, split by Rollup — no direct importer found in src).

## PART S — Bundle Analysis (after, evidence-driven)

Lazy-split heavy/secondary views inside `AuthenticatedApp` (Orders, Production, Finance, DesignStudio, Materials, Reports, Settings, Developer, ControlCenter; daily flows Home/Customers stay eager; protected files untouched — import-site change only). Suspense fallback is an honest loading skeleton. **Result: AuthenticatedApp 1008 → 320 KB (−688 KB, −68% initial authenticated payload)**; FinanceView 396 / DesignStudio 72 / Reports 48 / ControlCenter 48 / Materials / Orders / Settings / Developer as on-demand chunks. No chart libraries exist; no dependency changes.

## PART T — Rendering Performance

Reports already memoizes the full metric computation (single `useMemo` per store change; bounded top-N slices). Audit-noted O(payments×orders) join and `now` staleness remain **documented observations, not hotspots** at local-store scale (§24: no premature optimization). No changes.

## PART U — Asset / PWA Audit

Precache **116 → 132 entries / +7.42 KiB** — the increase is exactly the new split JS chunks (all still precached by the existing glob ⇒ **offline availability unchanged**); no imagery or assets added/removed; `_originals` 0; the audit's standing correction (webp imagery has been precached since Stage 4) remains accurately documented. Service worker config untouched; no runtime caching added; offline indicator honesty unchanged.

## PART V — Network Behavior

Per-view loads re-verified in journeys (no polling, no retry loops; production stage-seeding bounded per stage-less order). Correctness-preserving server refreshes retained (post-payment reload, etc.). Login limiter noted operationally (validation resets on backend restart).

## PART W — Mobile Regression (Stage 12 widths)

430 / 768 / 1280 smoke + full journeys at 390: all Stage 12 contracts held — bottom nav/More reachability, Finance reachable, invoice modal containment, wizard confirm, production transitions, payment flow, **0 px overflow at every width, 0 console errors, 0 failed requests**. (Browser-emulated; not physical-device certification.)

## PART X — Offline Classifications (unchanged truth model)

Reports/Materials/Orders/profiles: FULLY OFFLINE (local store). Payments: OFFLINE QUEUED (verified idempotent queue). Customers/Production/Finance lists, Settings mutations, Developer, Home analytics: ONLINE REQUIRED with honest error/retry. No sync states invented.

## PART Y — Browser Validation (§34/§35)

`/home/user/pgtool/probe16-stage13.mjs` — real backend + DB, fresh context per pass (first-run storage), fresh API-seeded entities per pass:

| Width | A customer+edit | B order | C production | D payment | E reports | F settings | G developer | Overflow | Errors/failed |
|---|---|---|---|---|---|---|---|---|---|
| 1440 | edit saved + Escape ✓ | confirm ✓ | 9 stages + transition ✓ | confirmed + authoritative balance ✓ | scope notice, demo-free, empty states ✓ | ✓ | fail-closed, no secrets ✓ | 0px | 0/0 |
| 834 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0/0 |
| 390 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0/0 |
| 430 / 768 / 1280 | smoke: Reports demo-free + scope notice at each | | | | ✓ | | | 0px | 0/0 |

## PART Z — Decision Register & Stage 14 Handoff

| ID | Finding | Evidence | Severity | Decision/Owner action |
|---|---|---|---|---|
| S13-1 | First-run demo analytics (audit P1) | code chain + live before/after | P1→**CLOSED** | Implemented Outcome D+B (empty init, fixture retained); existing devices unaffected |
| S13-2 | Analytics truth ×3 | audit + Part E/F | P2 | Hybrid model labelled honestly; consolidation = owner decision (future phase) |
| S13-3 | Customer edit orphan (audit P2) | browser + tests | P2→**CLOSED** | Edit reachable via existing contracts; delete documented as never-existing |
| S13-4 | Developer visibility | flag OFF in DB; §7.3 | P3 | Keep fail-closed; entitlement signal + flag-on granularity = owner decisions |
| S13-5 | Status-token contrast <4.5 small text | computed (Part Q) | P2 a11y | Owner visual-direction decision; computed remediation values provided |
| S13-6 | Focus-ring gold 2.05 (non-text 3:1) | computed | P3 | Owner decision (brand token) |
| S13-7 | Materials server-contract drift | audit | P3 | Documented; migration is a future authorized phase |
| S13-8 | Legacy slate visual language | Part L | P3 | Stage 14 certification scope; visual refresh = owner decision |
| S13-9 | AT/physical-device validation | §49 | — | MANUAL VALIDATION REQUIRED (screen readers, real devices) |

**Stage 14 inherits**: the surface map + reconciliation matrix above, the decision register, journeys A–G as the critical-journey suite, the viewport matrix (1440/1280/834/768/430/390), contrast findings, bundle/PWA baselines (320 KB entry chunk, 132 entries/6418.78 KiB), protected-asset verification, and the Reports/Developer classifications.

## Completion Gates (§48)

Repository clean/branch correct/remote verified · **Tests 316/316 (21 files, +9 Stage 13 CH tests)** · **tsc 0** · **build PASS** · **PWA: 132 entries / 6418.78 KiB, `_originals` 0, imagery unchanged** · accessibility coverage documented (L–Q) · performance before/after documented (R–U) · browser journeys A–G at 6 widths green · **0 unexpected console errors / failed requests / overflow** · **protected assets 0-diff**.

**Honest certification language (§49):** keyboard behaviour and dialog semantics browser-validated; contrast programmatically audited; screen-reader validation remains manual; mobile browser-emulated validation complete; physical-device validation pending; Stage 13 accessibility/performance hardening complete — **ready for Stage 14 browser certification**.
