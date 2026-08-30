# Phase 18 — Stage 5: Design System & UI Foundation
**Baseline:** accepted Stage 4 `a96697d` · **Branch:** `arena/01a04eef-stitch-flow`
**Status:** COMPLETE — foundation + controlled showcase only. No application screen rebuilt, no route migration, no protected asset touched.
**Evidence convention:** VERIFIED (in repo/runtime) · INFERRED · PROPOSED · UNRESOLVED · BLOCKED.

## A. Executive summary
Established an **additive** design-system layer — `apps/web/src/design-system/` — implementing the Stage 3 visual contract on the VERIFIED Phase 11 token foundation: semantic `--ds-*` tokens, six typography roles, unified status language (canonical stages preserved, payment independent), AI-advisory visual family, 40+ primitives across 8 modules, a controlled public showcase (`/design-system`), 28 certification tests, and browser validation at 3 widths. The legacy dual-palette problem is resolved *structurally* (semantic tokens exist and are the mandated path); screen-by-screen teal migration is explicitly deferred to Stages 6–10 with a recorded map (§R). One Stage 4 debt was fixed under §32 performance budgets: the source-image archive was relocated out of `public/` after the build proved it inflated the PWA precache (13.56 → 6.44 MB).

## B. Current visual-system findings (forensics, VERIFIED)
Tokens: 37 `--sf-*` primitives (craft palette ivory `#f7f5f0`/charcoal `#18181b`/gold `#c9a96e`/ink tiers/line/surface; radius 4/8/16; elevation e1–e4; z 100–600; durations instant→cinematic + 4 easings; spacing = Tailwind default scale per in-file contract). Fonts: three bundled variable fonts (Hanken Grotesk/Geist/JetBrains Mono), zero runtime fetching, `tabular-nums` in use. Existing primitives: Badge, Button, Card, Feedback, Modal, Toast, Field, motion — retained untouched (Stage 6+ wrappers may compose). Global `prefers-reduced-motion` VERIFIED. Dual palette VERIFIED: legacy teal `#0F6E8C`/`#0C5C74` as arbitrary classes (`bg-[#0F6E8C]` ×6, `text-[#0F6E8C]` ×9 in a 2-file sample; 10 files total) + `brand.ts` legacy config (incl. unused `Inter` entry) + PWA `theme_color:#1e40af` mismatch.

## C. Design principles
One system, four surface personalities (density/temperature differ, components never fork) · colour never sole state carrier · measurement units never hidden · images are reference, never domain truth · intelligence is calm and advisory · borders before shadows · motion serves function · mobile is a first-class environment.

## D. Token architecture (VERIFIED, additive)
primitives `--sf-*` (unchanged) → semantic `--ds-*` (`tokens.css`: bg/surface/subtle/raised/active/overlay, text×3+on-accent, border+strong, accent+hover+focus, success/warning/danger/info (+surfaces), advisory set, 9 production-stage tokens, density controls incl. `--ds-touch-min:44px`) → component contracts (`.ds-*` classes). Tailwind `ds-*` colors added additively. No `--sf-*` redefined; existing screens unaffected (full suite green).

## E. Typography
Six roles as classes: `.ds-display/.ds-heading/.ds-section/.ds-body/.ds-label/.ds-numeric` (+ mobile scale: body ≥16px, display reduced). Verified trio reused — no new fonts, no runtime fetching, no extra weights.

## F. Color semantics
Meaning, not decoration: accent=charcoal, gold reserved (focus/selection/advisory), status pairs fg+surface, AI-advisory distinct from success/error, production ramp (9 tokens) ALWAYS paired with label+shape (§P). V3 final hues implemented as `--ds-stage-*` — subject to owner review in Stage 6 context, non-blocking.

## G. Spacing & layout
Tailwind default scale is the single spacing source (Phase 11 contract, kept). Density via `data-density="workspace|developer|platform|public"` adjusting control/row heights and gaps. Reading measure `max-w-4xl`/`max-w-prose` in showcase.

## H. Surfaces, borders, elevation
bg→surface→subtle→raised→active→overlay hierarchy; hairline borders primary, elevation reserved for overlays (e3/e4) and hover (e1→e2); no glassmorphism/gradient layering.

## I. Component inventory (implemented · contracts in code comments + DS tests)
Layout/typography: Surface, Stack, Inline, Divider, Display/Heading/Section/Body/Label/Numeric, Metric, KeyValue · Actions: Button (primary/secondary/tertiary/destructive/contextual), IconButton, ButtonGroup, Link · Forms: FormField (render-prop wiring label/hint/error/required/optional/unit), Input (numeric mono + inputMode, `garment` dashed variant), Textarea, Select, Checkbox, Radio, Switch, ValidationMessage · Feedback: Badge, Alert, Progress, Skeleton, EmptyState, ErrorState, **AiAdvisory** · Status: StatusPill, PaymentPill, ProductionTracker, CANONICAL_STAGES/STAGE_META exports · Navigation: Tabs (WAI-ARIA + roving tabindex), StepIndicator · Overlays: Dialog, Drawer (right/desktop ↔ bottom-sheet/mobile), Tooltip · Data: Table/Th/Td (region+caption+overflow policy), DataList (mobile transform) · Workflow: Stepper, Timeline, Checklist, ActivityItem, ActionBar (sticky thumb zone, safe-area) · Imagery: ImageFrame (6 variants/ratios, lazy default, honest-alt contract, missing-image fallback), DensitySurface.
**Deferred (no demonstrated use):** Combobox, Menu/Dropdown, Pagination, Breadcrumb, Popover.

## J. Interaction states
Hover/press (Tier-1 micro, 150ms), focus-visible gold ring universal, disabled at 50% + pointer-events off, invalid (danger border + aria-invalid + alert message), loading (Skeleton with sr-only announcement), empty/error families. Tier-0 by contract: tables, financial flows (Table wrapper sets `data-motion="none"`).

## K. Responsive architecture
Breakpoints follow Tailwind defaults (sm 640 the primary mobile→tablet seam). Touch minimum 44px (`--ds-touch-min`) with desktop control height restored at sm. Overflow policy: page-level horizontal overflow = bug (validated 0px at 390/834/1440); internal `overflow-x-auto` for tabs/tables; long tokens `overflow-wrap` guarded at primitive level. Drawer→bottom-sheet, ActionBar sticky+safe-area. Bottom navigation intentionally NOT built (Stage 6).

## L. Accessibility (tested, not aspirational)
Dialog/drawer: `role=dialog`, `aria-modal`, focus-in on open, focus restore, focus trap, Escape (DS6 + browser-verified). Tabs: full keyboard pattern (DS7 + browser). Switch: `role=switch`/`aria-checked`. Forms: label/describedby/invalid/required-sr-only wiring (DS2). Status: text+shape+colour, sr-only state prefixes on tracker (DS3). Images: honest alt or explicit presentation role; placeholders labelled (DS9). Contrast: token pairs chosen for 4.5:1 body target — **UNRESOLVED: full WCAG audit is Stage 13**.

## M. Motion
Four tiers mapped: NONE (tables/financial, enforced via wrapper), SUBTLE/micro (controls), FUNCTIONAL/fast (overlays, disclosure), CINEMATIC (public only; none shipped in this stage). Global `prefers-reduced-motion` retained and `[data-motion=none]` escape added.

## N. Imagery integration
ImageFrame consumes ONLY manifest derivatives under `public/assets/**` (runtime); provenance/licensing per manifest; ratios by variant (hero 16:9, garment 3:4, fabric 1:1); lazy default; missing→labelled placeholder. Showcased P0/P1 assets render and load (browser-verified 5/5 desktop). **Hard rule rendered in component docs: reference image ≠ canonical fabric data.**

## O. AI advisory visual language
`AiAdvisory` (aside `role=note`, `data-ai-verb`): distinct gold-thread family ≠ success/error; verbs INFORM/WARN/SUGGEST/EXPLAIN/RECOMMEND (WARN variant recolours); explicit "Advisory — not deterministic data" label; optional source id; Review/Dismiss actions; "SILENTLY MODIFY" unrepresentable by design. Verified against Phase 17 advisory semantics.

## P. Production/payment status semantics
`CANONICAL_STAGES` exported as the single source (matches `productionStageService` seq 1–9); STAGE_META maps presentation labels/shapes/tokens; `data-stage` carries the canonical code on every pill and tracker node (tested). Human labels may group/simplify — codes never mutate. `PaymentPill` (unpaid/partial/paid/overdue) is a separate primitive: production ≠ financial completion, visually and structurally.

## Q. Surface differentiation
`DensitySurface` + `data-density`: Workspace (default, calm), Developer (32px rows/controls, mono-forward content), Platform (wider gaps, authoritative), Public (editorial spacing). Shared DNA: same tokens, type, components.

## R. Legacy migration map (teal `#0F6E8C`/`#0C5C74` — classified, not yet migrated)
Usage class (10 files, VERIFIED sample): primary-action/brand accent in Dashboard, Customers, CustomerDetail, Invoices, Materials, OrderCard, FeatureGate, AccountPanel, DeveloperDashboard; **DesignStudio.tsx = PROTECTED, retained untouched**. `brand.ts` colors/fonts = legacy config source; PWA `theme_color` = mismatch. Replacement mapping: action/brand teal → `--ds-accent`/`bg-ds-accent`; informational/link teal → `--ds-info`; hover `#0C5C74` → `--ds-accent-hover`; `theme_color` → `#f7f5f0` (or charcoal) with manifest change in Stage 6. Execution: per-screen during Stages 6–10 rebuilds (replacement-before-removal; no blind global replace).

## S. Implementation usage rules
(1) New Phase 18 UI imports from `@/design-system` only — no new hard-coded hex (DS14 enforces). (2) Existing screens keep working untouched until their stage rebuilds them. (3) One primary action per region. (4) Status = StatusPill/PaymentPill primitives, never ad-hoc colours. (5) Imagery via ImageFrame with manifest derivatives. (6) Anything needing domain authority goes to the domain contract, not an image. (7) Showcase is a lab — never linked as product UI.

## T. Stage 6 handoff
Ready to consume: full token layer, primitives, showcase as living reference (`/design-system`), status/AI-advisory languages, responsive+a11y contracts, teal migration map, test patterns (DS1–DS14), asset library + manifest. Stage 6 (Application Shell & Navigation) may build the three shells + responsive nav on DensitySurface/personalities. Must evaluate in real context: fabric-macro byte tuning, garment-card detail sufficiency (P0), V3 stage hues. Must not use unreviewed P0 assets as final. Constraints intact: protected assets untouched (verified), no backend/db changes, DesignStudio untouched, Phase 19–21 untouched.

---
### Validation record
- **Unit/a11y:** 184/184 vitest (156 pre-existing + 28 new DS1–DS14); tsc 0 errors; build PASS (precache 114 entries / 6.44 MB, down from 13.56 MB after source-archive relocation).
- **Browser (DOM-level, LIMITED — no visual/vision inspection):** `/design-system` at 1440/834/390 → horizontal overflow **0px** all widths; 0 page errors; 12 sections render; dialog focus-trap/Escape/restore PASS; Tabs arrow-key PASS; images 5/5 desktop, lazy below-fold on smaller widths as designed; reduced-motion pass clean. Two real defects found & fixed during validation (Tabs tablist overflow; AiAdvisory header no-wrap) + defensive `overflow-wrap` on body text.
- **Quality gates (§39):** Foundation 6/6 · Components 15/15 · Responsive 5/5 · Accessibility 6/6 (contrast audit → Stage 13) · Assets 5/5 (manifest respected; P0/P1 rendered in context — human review still pending, statuses unchanged) · Integrity 8/8.

### Known limitations (honest classification)
VERIFIED: everything marked VERIFIED above · INFERRED: contrast ratios of token pairs (calculated targets, not audited) · PROPOSED: density defaults, V3 stage hues · UNRESOLVED: final WCAG audit (Stage 13); P0 asset art-direction (human); dark mode (V1 deferred) · BLOCKED: none.
