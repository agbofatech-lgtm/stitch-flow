# Phase 18 — Stage 12: Mobile Experience

**Status: IMPLEMENTED. Baseline `7a77d07` (Stage 11 accepted).**
Evidence classes: VERIFIED, IMPLEMENTED, PROPOSED, UNRESOLVED.

---

## PART A — Stage Identity

Stage 12 adapts and validates the **trusted** Stages 6–10 product for genuine touch-first operation — no parallel mobile product, no domain-model changes, no engine/backend/auth changes, no Stage 13/14 work, no Phase 19+. The same StitchFlow system, different compositions.

## PART B — Baseline

Branch `arena/01a04eef-stitch-flow`; HEAD `7a77d07` = remote tip (verified via fetch); tree clean; environment NOT re-provisioned this stage (no recovery needed). Baseline gates re-run before implementation: **288/288 tests (19 files) · tsc 0 · build PASS · precache 116 entries / 6398.90 KiB · dist 6856 KB.**

## PART C — Mobile Forensic Findings (before Stage 12)

The codebase entered Stage 12 with **substantial mobile foundations already built** (Stages 5–10 were mobile-aware by construction):

- **Shell (§5.1)**: bottom nav = 4 primary + More (56px targets, stable labels, non-colour active state); More sheet = DS Drawer bottom-sheet with focus trap/Escape/restore; `pb-[env(safe-area-inset-bottom)]` on nav + main; Stage 10 Finance-in-More repair INTACT and re-proven (MX2/MX3, browser).
- **Order workflow (§5.3)**: sticky thumb-zone action bar with safe-area (`sm:static` desktop), 2-col garment tiles, `inputMode=decimal` numeric inputs (Stage 5 `Input numeric`), unit `[cm]` visible, StepIndicator wraps.
- **Customers (§5.2)**: full-width search, 44px row targets, workspace hierarchy identity → readiness → active work → detail; New-order handoff in place.
- **Production (§5.5)**: already "show work, not columns" — vertical grouped sections + row cards, not a horizontal board; inline (non-overlay) confirmations; consequence language present.
- **Finance (§5.6)**: invoice rows are wrap-friendly; payment entry is a bottom-sheet-on-mobile dialog; outcome honesty (confirmed/duplicate/queued/rejected) implemented.
- **Primitives (§5.7)**: Drawer (bottom sheet mobile), Dialog, ActionBar (sticky thumb zone), Timeline, Stepper/Tabs (scrollable tablist), Table (overflow-x by design), DataList (the §13 card-transform partner).

**Genuine defects / gaps found (implemented fixes, Part W):**

| # | Finding | Class |
|---|---|---|
| F1 | `InvoiceModal` (create/edit, active Finance workflow) had **no height bound or internal scroll** — on a 390×800 phone the form clips and submit is unreachable | DEFECT (P1) |
| F2 | Payment sheet had **no Escape/focus-trap/restore** (unlike every DS overlay) and unbounded height → keyboard-open could push submit off-screen | DEFECT (P1) |
| F3 | Production/Finance **search inputs fixed-width** (`w-56`/`w-60`) — cramped on phones while wrapping anyway | POLISH |
| F4 | Invoice figures (Total/Paid/Balance) wrapped raggedly at 390 — key figures not scannable | POLISH |
| F5 | Production timeline **Reopen button** was `min-h-0 px-2 py-1` — below the Stage 5 44px touch contract | CONTRACT FIX |

## PART D — Mobile Interaction Principles (evidence-based)

CSS composition over JS viewport forks — **zero `isMobile` branches exist or were added**; every change is a responsive class. One interaction model, different compositions. Consequential actions keep confirmation + consequence language at every width. Intelligence stays subordinate. Nothing operationally important lives only above the fold.

## PART E — Viewport Strategy

Existing Tailwind seam `sm:` (640) + `lg:` (1024 shell switch) — no new breakpoints invented. Validated: **390** (first-class), **430** (large phone), **768** (tablet seam, bottom nav still active — the shell switches at lg=1024, VERIFIED behavior), **1280** (desktop regression).

## PART F — Navigation

Bottom bar: Home · Customers · Orders · Production · More. Overflow primary (Finance) + secondary (Materials/Reports/Design Studio/Settings/Developer/Control Center) in the More sheet. **Finance permanent-reachability re-tested** (MX2/MX3 + browser at all four widths). More closes after navigation (MX4 + browser `moreClosed`). Back semantics: context-labeled returns ("← All production", "Back to {customer}"), no duplicate ambiguous Back controls; overlays close via Escape/✕/cancel.

## PART G — Customer Workspace

Already matched §11: identity + contact → primary action (New order) → readiness strip → active work → full detail below. Verified unchanged and operable at 390/430 (browser Journey A). No redesign needed — evidence said PRESERVE.

## PART H — Order Workflow

Full journey validated on-device-emulated: garment tile selection (`aria-pressed`), measurement capture (decimal keyboard, ≥8 canonical fields, unit visible), Continue honestly disabled until a value exists, review reachable, confirm lands on the snapshot-confirmed state (browser `orderConfirmed` at 390 & 430; MX5–MX8). Sticky action bar keeps Back/Continue in the thumb zone with safe-area padding; keyboard overlap is bounded by page scroll (inputs are in normal flow).

## PART I — Measurement Entry

`inputMode=decimal` VERIFIED in-browser on the real field (`measurementInputMode: "decimal"`); unit `[cm]` never hidden; canonical `SNAPSHOT_FIELDS` (Stage 5/9 contract) — no second measurement model. **Limitation**: physical software-keyword geometry (visual-viewport shrink) is NOT emulated by Playwright — classified below.

## PART J — Contextual Intelligence

Deterministic (readiness, snapshot context, financial context) vs advisory (fit-risk) remain distinct cards (`data-intelligence` kinds, badges "Deterministic" / "Advisory · on-device"); MX17/MX18 prove the advisory card renders **zero buttons** — advice never acts. No chat, no AI panel, no autonomy. Unchanged from Stage 9; re-proven at mobile widths.

## PART K — Production

Board stays grouped vertical sections ("show work, not columns" was already the Stage 10 design). Detail verified at all widths: nine canonical markers in order (browser `canonicalStages: 9`, order equality vs `CANONICAL_STAGES` in MX11), destination-aware actions (start → complete-ready; complete → next), skip behind confirmation with consequence text, reopen cascade language intact (MX13), timeline reopen targets raised to the 44px contract.

## PART L — Finance

Invoice rows: on mobile the three authoritative figures now form a 3-col grid (Total/Paid/Balance — backend-computed values, never recomputed), status + actions wrap below; desktop row unchanged. Payment sheet: bottom-sheet on mobile, now **bounded to 85dvh with internal scroll + safe-area**, wired to the DS `useModalBehaviour` primitive (Escape, focus trap, restore). Journey C verified end-to-end at every width: balance 300 shown → controlled payment 50 → authoritative outcome message → balance re-rendered **250 from the server**. Outcomes remain distinguishable (MX16: duplicate replay vs queued vs rejection never collapse into "Success").

## PART M — Dense Information (table decisions)

Invoice list, customer list, production board, active-work rows: **already card/row-transformed** (row action is primary) — kept. `Table` primitive keeps horizontal scroll for genuinely comparative data (developer/legacy surfaces). No ideological ban; no forced transforms.

## PART N — Touch Ergonomics

Bottom nav 56px (browser-measured at 390/430/768); interactive rows ≥ `--ds-touch-min` (44px); stage/primary buttons DS-sized; garment tiles comfortably > 44px; the one sub-contract control found (timeline Reopen, F5) raised to 44px. Density conflicts resolved by reducing simultaneous information — never target size.

## PART O — Keyboard & Viewport

Verified (DOM/browser-level): decimal `inputmode` on measurement + payment amount; focused fields are in normal flow (scroll reachable); payment + invoice modals now scroll internally so keyboard-open cannot trap submit. **Classification: BROWSER-EMULATED / DEVICE-SIMULATED — NOT PHYSICALLY VERIFIED** (Playwright cannot render a native software keyboard or visual-viewport shrink; no real touch hardware).

## PART P — Safe Areas

Existing: bottom nav, main bottom padding, ActionBar (all `env(safe-area-inset-bottom)`, additive with fallback). Stage 12 added the same treatment to the payment sheet and invoice modal only — targeted, not indiscriminate. Desktop unaffected (inset = 0).

## PART Q — Offline (honest classification)

Unchanged truth model: shell indicator = `navigator.onLine` only; payment queue = the VERIFIED offline-aware idempotent contract (queued outcome message re-proven in MX16); customer list/orders/production/finance lists = ONLINE REQUIRED with honest error + retry (ErrorStates verified in code); measurement profiles/order drafts = offline store. No sync indicator invented; no fabricated states.

## PART R — Motion

Operational motion stays Tier-2 micro (`ds-motion-micro`); no Stage 11 cinematic motion exists in the workspace (verified — cinematic classes are public-landing only); global `prefers-reduced-motion` neutralizer covers all surfaces.

## PART S — Assets

No new imagery. Garment/fabric reference imagery unchanged with honest fallbacks (11 garment types incl. no-imagery initials tiles). **REFERENCE IMAGE ≠ CANONICAL DATA** unchanged. AI-generated disclosure intact.

## PART T — Design System Changes

None. F2 was solved by consuming the existing exported `useModalBehaviour` primitive (the exact purpose it was Stage 6-exported for) — the §26 hierarchy stopped at step 2 (composition). No MobileButton/MobileCard forks.

## PART U — Testing

`tests/offline/phase18-stage12.test.tsx` → **`phase18-stage12-mobile.test.tsx`, 19 tests**: MX1–MX4 navigation (slots, 56px class contract, Finance-in-More, sheet closes), MX5–MX8 order workflow (11 garment types, aria-pressed, decimal inputmode, unit visibility, Back/Continue, review/confirm), MX9–MX10 customer hierarchy + handoff, MX11–MX13 production (canonical equality, verified transitions incl. skip-then-complete-on-new-open-stage, consequence language, touch-target regression guard), MX14–MX16 finance (authoritative balance, idempotency key format + amount default, outcome distinction), MX17–MX18 intelligence boundary, MX19 desktop regression (sidebar/bottom-nav coexistence, desktop search width), MX20–MX21 the two mobile sheet fixes (Escape, 85dvh bound, decimal keyboard, modal scroll).

## PART V — Browser Validation (§31, BROWSER-EMULATED)

`/home/user/pgtool/probe14-stage12.mjs` — real backend (PostgreSQL 18.4 + API 8312) + vite 5174, fresh seeded entities per pass (customer/order/invoice unique per viewport — no shared-state mutation):

| Width | Journey A (customer→order, full) | Journey B (production) | Journey C (payment) | Journey D (nav) | Overflow | Errors/failed req |
|---|---|---|---|---|---|---|
| **390** | ✓ confirm (tile→measurement decimal→review→confirm) | ✓ 9 canonical, transition, skip confirmed | ✓ 300→50→250 authoritative | ✓ More→Finance, closes, 56px | 0px | 0/0 |
| **430** | ✓ confirm | ✓ | ✓ | ✓ | 0px | 0/0 |
| **768** | — (smoke) | ✓ | ✓ | ✓ | 0px | 0/0 |
| **1280** | — (smoke) | ✓ | ✓ | ✓ (sidebar) | 0px | 0/0 |

`measurementInputMode`/`payInputMode` = `decimal` at every width. Payments carried fresh idempotency keys; invoice balances always re-read from the server after recording.

## PART W — Defects Found and Fixed

Genuine defects (vs planned adaptation): **F1** invoice modal unreachable-submit on phones (bounded + scrollable + safe-area); **F2** payment sheet missing modal behaviour + unbounded height (DS primitive wired, 85dvh, safe-area); **F5** sub-contract touch target in production timeline. Planned polish: F3 mobile-width search inputs, F4 figure grid. No other defects surfaced at any width.

## PART X — Known Limitations

1. Native keyboard geometry/visual-viewport, real touch, hardware safe-area cutouts, installed-PWA standalone: **NOT PHYSICALLY VERIFIED** (browser-emulated only).
2. Camera opportunities (reference imagery capture): **DEFERRED — requires domain/storage contract** (§19); none invented.
3. Legal/privacy destinations: still absent (Stage 11 UNRESOLVED carries).
4. 430/768/1280 ran Journey A at reduced depth (full A at 390+430) — per §31 "minimum widths" satisfied.

## PART Y — Protected Asset Integrity + PWA Correction

`git diff 7a77d07 -- DesignStudio.tsx patternEngine.ts productionAssistant.ts` → **0 lines**. Stage 9/10/11 semantics untouched; no backend/schema changes (migration set identical; validation DB is sandbox-local).
**Honest PWA correction (discovered during §40 inspection):** the sw glob (`…webp`) has precached the public `assets/**` webp imagery (18 landing + 20 fabrics + 12 craftsmanship + 10 production + 10 garments) **since Stage 4** — Stage 11's doc wording "landing imagery is cache-on-demand" was inaccurate for the webp variants (AVIF is not globbed). Stage 12 changed nothing here (116 entries before and after; +0.86 KiB is code). Optimization question handed to Stage 13.

## PART Z — Stage 13 Handoff

- **Accessibility**: formal audit due — focus order across bottom-sheet flows, dialog description labelling, advisory/contrast checks; the F2 fix already raised one surface to DS modal semantics.
- **Performance**: precache imagery question (Part Y) — decide whether marketing imagery belongs in the operational PWA payload; avif/webp duplication check.
- **Responsive**: 768 keeps the mobile shell (bottom nav) — acceptable and verified; revisit only with tablet-specific evidence.
- **Regression surfaces**: journeys A–D + MX/PL/PW suites are the contract Stage 14 must preserve.

## Completion Gates (§40)

**307/307 tests (20 files) · tsc 0 · build PASS · precache 116 entries / 6411.36 KiB (Δ +0.86 KiB code, 0 new entries, `_originals` 0) · browser 4/4 viewports green incl. full journeys · protected 0-diff · scope clean (no Stage 13/14, no Phase 19+).**
