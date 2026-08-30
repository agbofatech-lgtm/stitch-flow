# Phase 18 — Stage 11: Public Landing Experience

**Status: IMPLEMENTED. Baseline `7d667fa` (Stage 10 accepted).**
Evidence classes: VERIFIED, IMPLEMENTED, PROPOSED, UNRESOLVED.

---

## PART A — Stage Mandate

Transform the public experience into a cinematic, thematic product narrative that communicates what StitchFlow is and why its tailoring intelligence matters — evidence-first, capability-true, distinct from the operational workspace, with clear paths into authentication.

## PART B — Baseline

Branch `arena/01a04eef-stitch-flow`; Stage 10 tip `7d667fa` verified via fetch; **tree restored to exactly clean** (environment incident disclosed: the sandbox was re-provisioned again between stages — local git reset to the original base clone; repaired via `git reset --hard` to `7d667fa` + `git clean -fd` of 38 foreign untracked leftovers that were provably absent at Stage 10 completion, then `npm ci`; baseline gates re-run: **288-14=274/274 existing tests, tsc 0, build PASS** before implementation). Protected files zero-diff at baseline and at completion.

## PART C — Public Route Forensics (VERIFIED)

| Route | Purpose | Auth | Component (before → decision) |
|---|---|---|---|
| `/` | Public landing when signed out; app when signed in | public/app | `src/public/LandingPage` (Phase 12, code-split in `App.tsx`) → **COMPOSE** |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Public auth | public | `components/Login|Register|…` → **PRESERVE** |
| any other path | Application | token-gated, redirect `/login` + `setNextPath` | `AuthenticatedApp` → **PRESERVE** (untouched) |
| `/design-system` | DS showcase | public, dev-only | **PRESERVE** |

`@shared/router` (`isLandingPath` = `/` or `/index.html`) — no routes invented; no route changes made.

## PART D — Current-State Classification

- PRESERVE: `LandingPage` shell, `PublicHeader`, `PublicFooter`, `useInView` (IO one-shot; **fallback shows content when IO absent**), `WorkflowProgress` rail, `FinalCTASection`, hand-authored SVG stage illustrations, bundled fonts (no runtime fetching).
- COMPOSE: `HeroSection` (+ cinematic hero image), `NarrativeIntro` (reframed to ACT II), `WorkflowSection` + `workflow.ts` (journey rewritten to verified Stages 7–10).
- NEW: `CraftSection` (ACT I), `IntelligenceSection` (ACT III), `ProductionRhythmSection` (ACT V), `MaterialSection` (ACT VI), `LandingImage` primitive + `landingAssets` constants.
- DEPRECATE: none. No component forks: the public `ui/Button` (Phase 11/12, gold variant) remains the public presentation button — a pre-existing primitive, not a Stage 11 fork (D1).

## PART E — Cinematic Thematic Direction

Seven acts, native scroll, one-shot IO reveals (`sf-rise-enter`; global `prefers-reduced-motion` CSS collapses all animation to 0.01ms — content never depends on motion):
**I Craft** ("Tailoring begins before the first stitch", craftsmanship imagery) → **II Complexity** ("Every measurement carries consequence", ink-dark interlude) → **III Intelligence** ("Intelligence that knows when not to decide for you", typographic equation → Confident decisions) → **IV Journey** (five verified chapters, editorial two-column rhythm with connecting spine) → **V Rhythm** ("A garment is never just 'in progress'", nine canonical markers emerging in stagger) → **VI Material** ("Fabric behaves. Planning should know.", macro/drape imagery) → **VII Invitation** (existing charcoal closing + CTAs).

## PART F — Information Architecture

Header (brand · Sign In · CTA) → Hero (logo, eyebrow, headline, proposition, 2 CTAs, hero image, eager/high-priority) → Craft ×3 → Complexity → Intelligence (3 pillars + equation) → Journey ×5 (id/local chapters with SVG schematics) → Rhythm (canonical markers + production image + copy) → Material ×4 → Final CTA (pipeline chips auto-derived from journey) → Footer (Sign In / Create account only).

## PART G — Visual System Consumption

Stage 3 tokens only (ivory/charcoal/ink/gold/line, `font-display`/mono accents); Stage 11 public personality = CINEMATIC expression of the same DNA (workspace untouched). Canonical production stage labels/shapes are consumed from **`design-system/Status.tsx` (`CANONICAL_STAGES` + `STAGE_META`)** — the repository constant, not marketing copy (mandate §8).

## PART H — Asset Usage (manifest-governed)

| Asset | Manifest | Size | Status |
|---|---|---|---|
| `hero/hero-craft-workshop-01-hero-{1280.avif,1280.webp,768.webp}` | VA-LDR-01 (REQUIRED for Stage 11) | 59K AVIF primary | VISUALLY_PROVISIONAL |
| `craftsmanship/craft-{measurement,cutting,fitting}-01-card-800.webp` | VA-CFT | 23–33K each | VISUALLY_PROVISIONAL |
| `fabrics/fabric-{kente,ankara}-macro-01-card-800`, `fabric-{silk,denim}-drape-01-card-800` | VA-FAB | ~30–60K each | VISUALLY_PROVISIONAL |
| `production/production-fitting-01-card-800.webp` | VA-PRD | 32K | VISUALLY_PROVISIONAL |

All lazy except the hero (eager, `fetchpriority=high`, intrinsic 1376×768 — no shift). Provenance honesty: captions state "Reference imagery — style illustration, not a documented workshop" / "material character only, never stock or inventory records". The authentic-photography gap remains OPEN (manifest) — not silently closed.

## PART I — Hero

Copy outside imagery; two CTAs; ambient grid decorative (aria-hidden); image moment below CTAs. LCP budget: AVIF 59KB ≤ 180KB ✓.

## PART J — Narrative Chapters (purpose)

Each of the seven acts earns its place: emotional context (I), real complexity (II), differentiator (III), product truth (IV), operational discipline (V), material craft (VI), conversion (VII).

## PART K — Product Representation / Capability Truth (§22 matrix)

| Public claim | Evidence | Allowed |
|---|---|---|
| Customer workspace: profiles, orders, history | Stage 7 (accepted) | ✓ |
| Ordered order-creation flow → confirmed snapshotted brief | Stage 8 | ✓ |
| Measurement snapshot, readiness, fit-risk advisory; explainable; decisions stay yours | Stage 9 | ✓ (advisory accurately) |
| Nine-stage production lifecycle with notes; skip/reopen; payment "in its own lane" | Stage 10 + backend state machine | ✓ (no delivery-gate claim) |
| Invoices/payments/balances per order | Stage 10 | ✓ |
| Design Studio / Pattern Engine specifics | Phase 12 wording retired from the journey (still true; simplified to journey level) | ✓ |
| Pricing / tiers / trials | none (§25) — absent | ✓ |
| Metrics / testimonials / logos | none (§24) — absent, tested | ✓ |

## PART L — Intelligence Communication

"Trusted facts · Contextual advisory · Your decision" pillars; explicit lines: advisory "never changes a measurement, a fabric or a stage for you"; "leaves every decision with you". No autonomy/guarantee claims (regex-audited + tested PL9). Internal phase numbers never appear.

## PART M — Production Narrative

Nine markers rendered from `CANONICAL_STAGES` in order (PL12 compares DOM to the constant); copy mentions start/complete/skip-with-reason/reopen trail — all verified backend actions; delivery/payment kept as separate lanes (Stage 10 UNRESOLVED gate NOT claimed).

## PART N — Navigation & Authentication Handoff

Header: brand (back-to-top), Sign In, Start CTA (desktop). Footer: Sign In, Create account. Verified journeys (browser): Sign In → `/login` password field; Start → `/register`. No dead anchors; privacy/terms absent → **UNRESOLVED — legal destination absent** (no fake links rendered).

## PART O — Responsive Strategy

Validated 1440/834/390 + a reduced-motion 390 pass: 12 sections render, hero loads, all 10 images load after scroll, CTAs reachable, **0px horizontal overflow, 0 console errors, 0 failed requests** at every width. Mobile: one idea per viewport moment (single-column acts; 3-across craft grid → stacked; canonical markers wrap at w-1/3).

## PART P — Accessibility

Semantic landmarks (header/main/footer), section `aria-labelledby` headings, skip-to-content link, real buttons with focus-visible rings, meaningful alt text (>10 chars, scene-descriptive), decorative layers `aria-hidden`, stage list as `<ol>` with aria-label, equation exposed as an aria-label sentence, reduced-motion honored globally (tested + emulated browser pass). No motion-gated information.

## PART Q — Performance

| Metric | Stage 10 | Stage 11 | Δ |
|---|---|---|---|
| Tests | 274/274 | **288/288** | +14 (PL suite) |
| Build | PASS | PASS | — |
| Precache | 115 entries / 6398.90 KiB | 116 / 6410.50 KiB | +1 entry, +11.6 KiB (grown code-split landing chunk) |
| dist | 6848 KB | 6856 KB | +8 KB |
| Fonts | 0 new | 0 new, 0 runtime fetch | — |

Landing imagery is CACHE-ON-DEMAND per manifest — the operational PWA payload is not bloated; `_originals` excluded (unchanged).

## PART R — SEO / Metadata

`index.html` description + og:description updated to the verified capability set (customer → order → intelligence → production → finance; advisory phrasing). Title/OG title/theme-color/manifest unchanged. No SEO framework added.

## PART S — Testing

`tests/offline/phase18-stage11.test.tsx` — **14 tests**: PL1–PL18 adapted (render w/o shell, hero CTA routes, eager/fetchpriority/size hero, nav/footer destinations, keyboard/skip, reduced-motion CSS + no video, alt discipline, decorative suppression, no fabricated metrics/hype/autonomy, advisory-boundary copy, journey = verified five, canonical sequence equality vs `CANONICAL_STAGES`, asset existence on disk (public/), relative-only imagery). Full suite **288/288 (19 files)**; tsc 0.

## PART T — Browser Validation (unauthenticated, live dev server)

| Pass | sections | canonical | images loaded | hero | login handoff | register handoff | overflow | errors | failed req |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 12 | 9 | 10/10 | ✓ | ✓ | ✓ | 0px | 0 | 0 |
| 834×1000 | 12 | 9 | 10/10 | ✓ | ✓ | ✓ | 0px | 0 | 0 |
| 390×800 | 12 | 9 | 10/10 | ✓ | ✓ | ✓ | 0px | 0 | 0 |
| 390 reduced-motion | 12 | 9 | 10/10 | ✓ | ✓ | ✓ | 0px | 0 | 0 |

## PART U — Visual Review Status

**TECHNICALLY/DOM/RESPONSIVE VALIDATED — art-direction approval PENDING** (no human vision claimed). Stage 4 assets remain VISUALLY_PROVISIONAL; review queue (P0: hero composition with imagery, craft grid rhythm, canonical-marker stagger; P1: material grid tuning; P2: micro-motion refinement) recorded for the owner.

## PART V — Known Limitations

1. Privacy/terms destinations absent (UNRESOLVED — legal content required).
2. All landing imagery AI-generated, provisional (manifest); authentic photography gap open.
3. No analytics (§53) — conceptual events only, nothing implemented.
4. Product-proof section uses schematic SVG illustrations (honest, labelled) rather than real screenshots — real-screen capture is possible future work when the owner wants it (screenshot provenance rules §18 would apply).
5. WorkflowProgress rail tracks journey chapters only, not every act (pre-existing behavior, unchanged).

## PART W — Protected Asset Verification

`git diff 7d667fa -- …DesignStudio.tsx …patternEngine.ts …productionAssistant.ts` → **0 lines**. Stage 9/10 semantics untouched (no engine, snapshot, production or payment changes).

## PART X — Scope Integrity

NO Stage 12/13/14 work · NO Phase 19+ (no pricing/billing) · no backend/schema/auth changes · no new routes · no CMS/analytics · no external assets.

## PART Y — Stage 12 Handoff

Public surface is genuinely responsive already (0 overflow at 390, reduced-motion safe, lazy imagery, reachable CTAs). Stage 12 findings to carry: mobile bottom-nav More-sheet overflow pattern (Stage 10 fix) is the workspace-side reference; landing uses no shell. Landing imagery budgets verified; no mobile-specific landing work pending beyond Stage 12's own workspace overhaul.

## PART Z — Completion Report

Baseline `7d667fa` → final `HEAD` (see commit log); clean tree; gates: 288/288 · tsc 0 · build PASS · precache +1 entry/+11.6 KiB · browser 4/4 passes clean · protected 0-diff · copy audit clean. **STAGE 11 — PUBLIC LANDING EXPERIENCE: COMPLETE. STOPPED.**
