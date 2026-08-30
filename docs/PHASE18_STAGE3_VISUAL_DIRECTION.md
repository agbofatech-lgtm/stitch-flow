# Phase 18 — Stage 3: Visual Direction
**Baseline:** accepted Stage 2 v1.1 (`f6b7e96`) on certified `phase-17-integration-validated` lineage · **Branch:** `arena/01a04eef-stitch-flow`
**Status:** SPECIFICATION ONLY — no UI source, fonts, packages, assets, layouts, routes or components changed. Stage 4 does not begin here.
**Evidence convention (Stage 2 carried):** **VERIFIED** (in repository/runtime today) · **INFERRED** · **PROPOSED** (Phase 18 direction, not existing) · **UNRESOLVED** (owner/forensics needed).

---

## Part A — Visual Product Thesis

**Thesis: "Intelligence should feel calm."** StitchFlow is a modern tailoring *operating system*: the interface carries the tailor's craft — cloth, line, measurement, garment — while the intelligence stack (Phases 13–17) works invisibly underneath. The screen answers three questions in order: *What is this? What state is it in? What do I do next?*

**Desired perception (deliberate constraints):** PRECISE · CALM · PREMIUM · CRAFT-ORIENTED · VISUAL · TRUSTWORTHY · OPERATIONAL · HUMAN.
**Anti-characteristics (design constraints — reject work that trends toward these):** GENERIC (interchangeable SaaS) · OVER-GAMIFIED · OVER-ANIMATED · TECHNICALLY INTIMIDATING (engine names, jargon) · VISUALLY EMPTY (placeholder rectangles) · CORPORATE-COLD · CLUTTERED (density without hierarchy).

**Craftsmanship ⇄ digital precision:** the visual language pairs *tailoring texture* (warm ivory surfaces, charcoal ink, gold accent, fabric and garment imagery, editorial display type) with *instrument precision* (hairline rules, tabular numerals, measured spacing, status semantics). One without the other fails the thesis: texture without precision = decorative; precision without texture = corporate-cold.

---

## 1. Brand expression *(no logo redesign — out of scope)*

**VERIFIED current:** logo assets exist in 4 variants (128/256 png+webp) + PWA icons; `BRAND` config (`StitchFlow` / `AGBOFA Technology Ltd`). **PROPOSED usage principles:** the logo sits on ivory or charcoal only (never on photography or gold); exclusion zone = the logo's cap-height on all sides; wordmark in `ink` on light, `ivory` on dark; app shells render the lockup once (sidebar/header), landing renders it over the hero scrim; never recolor, stretch, shadow or outline the mark. **App-shell treatment:** Workspace header/sidebar carries the small lockup + workspace name; Developer/Platform shells pair it with the surface label ("Developer Console" / "StitchFlow Platform") for orientation; Public uses the large lockup only in header + footer.

## 2. Typography architecture

**VERIFIED current foundation (strong — keep):** three *locally bundled variable fonts* (no runtime fetching; PWA-precached): display **Hanken Grotesk Variable**, body **Geist Variable**, technical/numeric **JetBrains Mono Variable**; `tabular-nums` already used for card values; global `font-feature-settings`.

**PROPOSED hierarchy (roles, not new fonts):**

| Role | Face | Weight/size logic | Notes |
|---|---|---|---|
| Public editorial display | Hanken Grotesk | 600–700, fluid 40→96 px | cinematic landing only |
| Page title (app) | Hanken Grotesk | 600, 24–28 px | one per screen |
| Section heading | Hanken Grotesk | 600, 16–18 px | e.g., "Materials required" |
| Body / UI text | Geist | 400/500, 14–15 px | operational default |
| Labels / meta | Geist | 500 upper 11–12 px, +tracking | never sentence-case whisper text |
| **Measurements & numeric data** | JetBrains Mono | 400/500, tabular | every measurement, yardage, amount |
| Production status | Geist 500 label + mono value | 12 px | status = label+shape, not just color |
| Tables | Geist 14 / mono numerals | row height 44 px | mono right-aligned numerics |
| Mobile | same trio, scale −1 step | 16 px minimum body | thumb-distance hierarchy |

**Candidate evaluation (rationale):** keep the verified trio — Hanken Grotesk gives fashion-editorial character with grotesk neutrality; Geist gives superb UI legibility at small sizes; JetBrains Mono gives unambiguous numeric clarity (`102` vs `108` must never blur). Adding a serif (e.g., editorial fashion serif) was considered and **rejected** for now: bundle cost, i18n weight, and the calm thesis favor one family voice. **Accessibility/i18n:** system-ui fallbacks already verified; Latin-only today — **UNRESOLVED (Stage 5):** extended-African-language font coverage audit before any marketing claims. **No dependencies installed in this stage.**

## 3. Color architecture

**VERIFIED current — two palettes coexist (key finding):** (a) Phase 11 craft palette as CSS vars — `--sf-ivory/charcoal/gold{,-light,-dark}/burgundy/grey/ink{,-soft,-mute}/line/surface` — used by Layout, design-system components; (b) legacy brand palette in `brand.ts`/older screens — primary `#0F6E8C` teal family used by Customers/Platform/Developer surfaces; plus PWA `theme_color:#1e40af` matching neither. **This is the single largest brand-consistency gap; unification is Stage 5's first task.**

**PROPOSED semantic hierarchy (meaning, not decoration):**
- **Brand:** charcoal (primary identity/ink), gold (accent — reserved for selection, focus, and craft moments; *never* filler), burgundy (heritage accents, sparingly).
- **Surfaces:** ivory canvas → surface white cards → grey-light recesses; one elevation system (`shadow-e1..e4` **VERIFIED**).
- **Text:** ink / ink-soft / ink-mute (3 tiers only).
- **Borders:** line (hairline) + ink at 12% for emphasis edges.
- **Interaction:** focus = gold ring (**VERIFIED pattern** `focus-visible:outline-gold`); interactive = charcoal underline/fill; hover = grey-light.
- **Status (semantic, consistent app-wide):** success `#16A34A` · warning `#D97706` · error `#DC2626` · info charcoal-blue (**VERIFIED** values from brand.ts where present).
- **PROPOSED production-status ramp (canonical stages → presentation):** `not_started` grey · `measurement` teal-info · `cutting` amber · `sewing`/`embroidery` indigo-work · `fittings` violet-check · `final_press` slate · `ready` green · `delivered` charcoal-solid. Final hues set in Stage 5 tokens; **every status also carries label text + icon/shape** (color-independence, §16).
- **PROPOSED AI advisory color:** a distinct warm-gold "advisory" treatment (chip + left rule) clearly different from success/error — AI is neither; label always says "Advisory".
- **Financial state:** balance-due = warning amber with mono amount; paid = success. Never color-only.
- **Light/dark:** light is primary (workshop daylight, print, receipts). Dark mode = **UNRESOLVED/deferred** — a true dark theme touches every image/token; decide after Stage 5 tokens exist (default: not in Phase 18 scope).

## 4. Photography direction *(art direction for Stage 4 acquisition)*

**Categories:** (1) *Craftsmanship* — measuring (tape on form/body), hand-sewing, machine sewing, chalk/cutting, pressing, fitting; (2) *Garments* — dresses, suits, shirts, traditional wear (kaftan, agbada, kente pieces), jackets, trousers, skirts, children's; (3) *Materials* — cotton, linen, silk, wool, Ankara, Kente, lace, denim (macro texture + drape); (4) *Production* — pattern pieces on cloth, laid cuts, construction detail, finishing/press.

**Art direction:** natural window light with deep soft shadows (workshop authenticity, not studio-white catalog); tight purposeful crops on hands/tool/cloth (craft close-ups) with breathing room on garment hero shots; shallow depth for texture, clean geometry for garments; garments shot front-facing, neutral warm-grey backdrop, consistent light across the set (grid coherence); **diversity & authenticity:** Ghanaian/West-African tailors and clients, real workshops, authentic textile patterns (Ankara/Kente depicted accurately, never as generic "print"); contemporary professional (not ethnographic cliché, not Western corporate stock). **Crop behavior:** all photography crops safely to 3:4 (garment), 16:9 (craft/process), 1:1 (texture) with subject-safe margins. **Backgrounds:** photography never bleeds behind operational UI (contrast discipline); landing/editorial use only, plus garment/fabric cards in the app.

## 5. Illustration direction

**One coherent system *(PROPOSED)***: **textile-inspired editorial line-art** — 1.5 px ink line-work on ivory, thread/gold single accent, stitching motifs (dashed rules as seams), tailor's-curve geometry; flat, no gradient, no mascot, no 3D-render style. Uses: empty states (§14), onboarding walkthroughs, conceptual workflow explanations, offline/low-data guidance, permission-restricted states. Never mixed with icon-set style, never decorative filler, never used where a photograph is the honest choice (garments/fabrics).

## 6. Garment visual language *(Diagram 5)*

`CATEGORY → VISUAL COLLECTION → GARMENT CARD → STYLE SELECTION → CUSTOMIZATION`
**Garment card spec (PROPOSED):** 3:4 image; garment fills 85% frame on warm-neutral backdrop; title in Hanken 15/600 under image; category chips above grid. **States:** hover/press = 1.02 scale + gold selection ring (150 ms); selected = gold ring + charcoal check badge; loading = ivory placeholder with stitched-border motif + shimmer ≤ 400 ms (never bare gray box); unavailable = desaturated 60% + "Not available for this style" label; mobile = 2-column grid, full-bleed tap targets, press-state = ring only. Selection must feel like choosing cloth from a rail — image-first, metadata-second — never a database table row.

## 7. Fabric visual language

**Critical rule: REFERENCE IMAGE ≠ CANONICAL FABRIC DATA.** The photo communicates hand/drape/pattern *at a glance*; the canonical facts (width + unit, fiber, directionality, matching requirements — **VERIFIED** Phase 14/16 fields) always render as text/badges beside or beneath the image, sourced from the fabric profile contract. **Never** invent decorative texture implying properties the fabric lacks (no fake nap, no fake directional sheen); if no photo exists, show swatch-color chip derived from profile data + name — not a stock texture. Directional fabrics show a small grain arrow glyph (**PROPOSED** visual for a **VERIFIED** domain property).

## 8. Application surface direction *(Diagram 2)*

| Surface | Personality | Visual treatment |
|---|---|---|
| **Workspace** | OPERATIONAL · CALM · CRAFT-FOCUSED · ACTION-ORIENTED | ivory canvas, hairline structure, gold only for selection/focus; dense where work is dense, silent elsewhere |
| **Developer Console** | TECHNICAL · PRECISE · INSTRUMENTED | cooler surface tint, mono-forward data, dense tables, system-status LEDs — *contained*: zero of this density leaks into Workspace |
| **Platform Control** | AUTHORITATIVE · SYSTEMIC · GOVERNANCE | charcoal-dominant chrome, generous spacing, governance typography; reads as the building's control room |
| **Public** | CINEMATIC · ASPIRATIONAL · VISUAL · STORY-DRIVEN | full-bleed photography, editorial type scale, scroll narrative |

**Shared DNA (one system):** same trio of typefaces, same ivory/charcoal/ink/gold core, same radius/elevation/motion tokens, same status semantics; surfaces differ by *chromatic temperature and density*, never by new hues or new components.

## 9. Desktop layout direction *(Diagram 6 — decision framework > mockups)*

Content: operational max-width 1440 px, reading max-width 720 px, measurement/table full-bleed within page padding 24→32 px. Sidebar: 288 px, calm — 7 destinations, icon+label, active = charcoal fill; collapses to icon-rail ≤ 1200 px. Page header: title + contextual actions right (primary action singular + overflow menu); breadcrumbs only in deep workspaces.

**Information-placement framework (the important part):**
- **ON PAGE** — anything answering "what next?" or needed continuously (status, priorities, order lists, yardage summary).
- **IN DRAWER (right, 480 px)** — inspect/edit one entity without losing list context (customer quick-edit, stage notes, advisory detail).
- **IN MODAL** — short, blocking, single-purpose confirmations only (destructive confirms, one-field asks). Never multi-step forms.
- **IN WORKFLOW STEP** — anything sequential in Flow A/B (measure→design→fabric→confirm; stage gates).
- **IN PROGRESSIVE DISCLOSION** — expert depth (pattern pieces/layout/instructions, override rationale, audit trail) behind one click.
Tables for homogeneous scan-able data; cards for visual/heterogeneous entities (garments, customers, orders); split view (list left 40% / detail right) for high-frequency pivot work; drawers over modals wherever possible.

## 10. Mobile visual direction *(Diagram 7)*

Mobile is a *different composition*, not compressed desktop. **Touch hierarchy:** primary action = full-width 48 px button; secondary = text; destructive = overflow. **One-hand priority:** bottom-anchored everything — **bottom nav (Home · Customers · Orders · Production · More**, 5 max; More = authorization-aware sheet), primary action FAB or bottom-bar slot, stage-transition buttons thumb-reachable. **Full-screen workflows:** Flow A wizard and measurement capture run as full-screen pagers with top progress thread. **Drawers/sheets:** bottom sheets (peek 40%) replace right drawers. **Camera opportunities (specified, not implemented):** inspiration capture (Phase 14 — **VERIFIED** concept exists) and garment-progress photos at stage transitions; measurement entry **ergonomics**: one measurement per screen-step focus, numeric keypad, unit toggle persistent, values in mono 24 px, validation message directly under field (never toast-only).

## 11. Dashboard visual philosophy *(not designed here)*

The Overview answers **"What needs my attention now?"** — work before statistics. Attention hierarchy: **URGENT** (due today, blocked, QC-failed: amber/red, top, max 3 items) → **IMPORTANT** (awaiting measurements/design confirm: teal) → **ACTIVE** (in-production list: status chips) → **INFORMATIONAL** (balances, this-week outlook: quiet, mono) → **HISTORICAL** (delivered, reports links: lowest emphasis). KPI grids/charts appear **only** where operational evidence proves usefulness — default is a tight priorities list + active orders + quick actions (Stage 2 Flow I).

## 12. Motion principles *(Diagram 8)*

Motion serves orientation, state change, workflow progression, storytelling, feedback — nothing else. **Intensity tiers & permitted zones:** **NONE** — data tables, measurement fields, payment screens (stability = trust); **SUBTLE** (<150 ms, opacity/2 px) — hovers, chips, toggles, list reorders (Workspace default); **CONTEXTUAL** (150–300 ms, transform+fade, one element) — wizard step advance, drawer/sheet, disclosure expand, garment-card selection; **CINEMATIC** (scroll-linked, 300 ms+) — public landing only (hero reveal, story sections, production timeline). **Forbidden:** floating cards, perpetual loops, transition-for-transition, any motion that delays a tap, parallax/GPU effects on mobile workflows. **Mandatory:** `prefers-reduced-motion` collapses CINEMATIC→SUBTLE→static (**VERIFIED** already global — preserved and extended to all new motion).

## 13. Cinematic public experience *(Diagram 9 — narrative only)*

Story spine "From measurement to delivery": **CRAFT** (hero: tailor at work, window light — headline "The operating system for modern tailoring") → **MEASUREMENT** (tape close-up — "From measurements to precision") → **DESIGN** (sketch/studio — "Turn ideas into production-ready designs") → **MATERIALS** (cloth macro — "Know exactly what you need before cutting") → **PRODUCTION** (cutting/construction — "Cut with confidence") → **FINISHED GARMENT** (delivery moment — "Deliver with confidence") → CTA. Scroll-driven section reveals (SUBTLE→CINEMATIC), one garment transformation beat (sketch→cut→sewn→worn) as the single signature animation; type-led over gradient-led; every section = photograph + one sentence + one proof point. **Not implemented here.**

## 14. Empty-state philosophy

| Category | Purpose | Visual | Primary action | Secondary | Recovery |
|---|---|---|---|---|---|
| FIRST USE | teach the loop | line-art illustration (tailor motif) + "Create your first order to start production" | `[+ New Order]` | sample-data tour (later) | none needed |
| NO RESULTS | redirect | 1-line art glyph + "No orders match this search" | `[Clear filters]` | — | list restores on clear |
| FILTERED EMPTY | show why | same as no-results + active-filter chips | `[Clear]` per chip | — | same |
| OFFLINE | reassure + queue | thread motif + "Saved on this device — will sync" | `[Retry sync]` | continue offline | auto on reconnect (**VERIFIED** sync) |
| ERROR | explain + retry | minimal red-edge card + plain sentence | `[Try again]` | copy error id | request id for support |
| PERMISSION RESTRICTED | no dead end | lock+seam motif + "Ask your workspace owner for access" | `[Request access]` (later) | docs link | role grant |
| WORKFLOW INCOMPLETE | guide next step | readiness checklist echoing real state | the unblocking action (e.g., `[Take Measurements]`) | view details | re-check automatic |

Never a bare "No data found."

## 15. Design token direction *(current → requirements → gaps → Stage 5 input)*

**VERIFIED foundation:** Phase 11 token system — CSS-var colors (§3), elevation `e1–e4`, radius `btn/card`, motion durations `micro/fast` + `ease-standard`, `sf-*` keyframes/enter classes, z-tiers, bundled variable fonts, `prefers-reduced-motion`. **Visual requirements (this spec):** unified semantic color map (kill dual palette), production-status ramp, AI-advisory treatment, focus/interaction set, typography role scale, imagery slots/ratios, empty-state & illustration tokens, motion tier tokens, surface identity tints (Workspace/Developer/Platform). **Gaps:** legacy-teal vs craft-palette split; no status/advisory/fabric tokens; PWA `theme_color` mismatch; no dark theme (**deferred, UNRESOLVED**); i18n font coverage unaudited. **Stage 5 input:** implement as *additive* token layers over the Phase 11 base (no breaking rename), migrate legacy hex usages screen-by-screen with Stage 6–10 work.

## 16. Accessibility visual requirements *(non-negotiable, defined now; validated Stage 13)*
Text contrast ≥ 4.5:1 (≥3:1 large), UI edges ≥3:1 · **focus always visible** (gold ring, 2 px + offset — **VERIFIED** pattern, universal) · body ≥14 px app / ≥16 px mobile; supports 200% zoom reflow · touch targets ≥44×44 px · **color independence:** status/error/financial/AI states always carry label text + icon/shape, never hue alone · `prefers-reduced-motion` honored globally · every image has honest alt text (garment/fabric alt = canonical data, not decoration); photography never carries sole meaning · loading states perceptible (≤400 ms shimmer, then progress); errors visible inline adjacent to cause, not toast-only.

## 17. Performance-aware visual design
Budgets set now so Stage 13 never dismantles the system: landing LCP image ≤180 KB AVIF (WebP fallback) with responsive `srcset` (480/768/1280/1920) + `loading="lazy"` below fold; app imagery (garment/fabric cards) ≤60 KB per card, lazy, decoded async; total new font weight = **zero** (existing bundled variables reused); CINEMATIC motion = transform/opacity only (compositor-only, no layout thrash), disabled on reduced-motion and low-end mobile; no scroll-jacking; no full-screen blur/backdrop-filter on mobile workflows; illustration = inline SVG ≤8 KB; photography never inside scroll-heavy operational lists (thumbnails only).

---

## Diagrams 1–9 *(informational)*

**D1 — Workspace visual hierarchy:** `URGENT work → ACTIVE work → NAVIGATION(7) → CONTEXTUAL intelligence(chips/disclosure) → EXPERT depth(hidden)` (top = most visual weight; intelligence never outranks work).
**D2 — Surface personalities:** shared DNA core (type trio · ivory/charcoal/ink/gold · tokens) → Workspace warm+calm / Developer cool+dense / Platform dark+authoritative / Public cinematic — temperature & density vary, components don't.
**D3 — Typography hierarchy:** Public display (Hanken 40–96) > Page title (24–28) > Section (16–18) > Body/UI (Geist 14–15) > Labels (11–12 upper) > Numerals (JetBrains mono, tabular) — one voice, six roles.
**D4 — Color semantics:** Brand(charcoal/gold/burgundy) → Surface(ivory/white/grey) → Text(ink×3) → Interaction(focus gold/hover grey) → Status(success/warn/error/info) → Production ramp(grey→teal→amber→indigo→violet→slate→green→solid) → Advisory(gold-thread) → Financial(warn/paid) — all label-reinforced.
**D5 — Imagery architecture:** PHOTOGRAPHY(craft/garment/material/production — landing + cards) + ILLUSTRATION(line-art — empty/onboarding/guidance) + DATA-GLYPHS(grain arrow, status shapes) — never interchangeable.
**D6 — Desktop density model:** page(work+status) / drawer(inspection 480 px) / modal(confirm only) / step(sequential) / disclosure(expert depth).
**D7 — Mobile hierarchy:** bottom nav(5) → bottom sheets → full-screen wizards → thumb-zone actions → camera moments; top reserved for orientation only.
**D8 — Motion model:** NONE(tables/forms/payments) < SUBTLE(workspace µ-interactions) < CONTEXTUAL(flow transitions) < CINEMATIC(public only); reduced-motion collapses right→left.
**D9 — Public narrative:** CRAFT→MEASURE→DESIGN→MATERIALS→PRODUCTION→GARMENT→CTA, one photo + one sentence each, single signature transformation beat.

---

## Risks · Stage 4 inputs · Unresolved decisions

**Visual risks:** (1) *asset dependency* — the entire direction depends on authentic Ghanaian/West-African photography existing acquirably at quality; mitigation: Stage 4 sources licensed + AI-generated per D7-mixed with strict art-direction review. (2) *mobile performance* if imagery leaks into operational lists — budgets §17. (3) *accessibility* — status ramp must pass contrast + label-independence (§16). (4) *brand consistency* — dual-palette unification churn risk; controlled by additive tokens + per-screen migration. (5) *implementation complexity* — three personalities on shared DNA must not fork components; Stage 5 primitives enforce.

**Stage 4 asset requirements (categories for acquisition):** landing hero ×3 (craft/measure/deliver) + story photography ×6 sections · garment sets (8 categories × 3–5 styles, consistent light/backdrop) · fabric macro/drape ×8 materials · production imagery ×4 · illustration pack ×7 empty-state categories + workflow glyphs (SVG) · grain/status glyphs · all with manifest fields (source, license basis, optimization, usage) per Stage 1 pipeline.

**Unresolved (genuine owner decisions only):** **V1** dark mode in Phase 18 scope? (recommended: defer) · **V2** AI-generated imagery share of the mix (licensing/cost/authenticity tradeoff — recommended: ≤30%, no faces synthesized, disclose internally in manifest) · **V3** production-status final hues (Stage 5 token review, non-blocking). All other choices made within the accepted Stage 2 defaults.

**Non-goals honored:** no UI source, fonts, packages, assets, components, layouts, routes, DesignStudio/domain changes, no Stage 4 start, no certification tag.
