# StitchFlow — Visual Asset Manifest
**Phase 18 · Stage 4 · Status: IN PROGRESS** (begun during acquisition per mandate §15; updated per batch)
**Pipeline:** `_originals/` (SOURCE ARCHIVE · NON-RUNTIME · never bundled into PWA payload) → ImageMagick optimization → production derivatives (AVIF/WebP) under `apps/web/public/assets/`.
**Naming:** `[category]-[subject]-[variant]-[size].[format]` · no upscaling ever · variants only with a defined consumer.

## 1. Requirement classification (quality-over-count, mandate §2)

| Requirement | Class | Rationale |
|---|---|---|
| Landing heroes ×3 | REQUIRED | public story entry (Stage 11) |
| Craftsmanship story ×6 | REQUIRED | MEASURE→…→FINISH narrative (Stage 11) |
| Production workflow ×5 (incl. measurement) | REQUIRED | workflow explanation (Stage 10) |
| Fabric macro ×8 | REQUIRED | material recognition/selection (Stage 8/9) |
| Fabric drape ×8 | HIGH VALUE | material behavior context |
| Garment style cards 8 categories ×3 | REQUIRED | visual garment selection UX (Stage 8) — 3 establishes choice language |
| Garment category heroes / detail shots | DEFERRED | style cards serve Stage 8; avoid redundancy |
| Empty-state illustration system ×7 | HIGH VALUE | Stage 5 primitives + all screens |
| Additional alternates/variants | OPTIONAL | not generated without documented UX purpose |

## 2. Sourcing verdict & policy registers

**Source discovery result (2026-08-30):** all probed photographic channels failed production-license review → library is **AI-GENERATED, fully disclosed**. **Hard generation rules (every asset):** no synthetic identifiable faces (crops at hands/shoulders or no people) · no celebrity resemblance · no brand marks/logos · no embedded text · no watermarks · Ghanaian/West-African craft context · Stage 3 palette (ivory/charcoal/warm gold, natural window light).

**AI-GENERATED ASSET REGISTER (applies to every asset below):** Source method: AI generation · System: Arena Agent image generator · Date: 2026-08-30 · Prompt family: Stage 3 art direction (§Photography/§Illustration of `PHASE18_STAGE3_VISUAL_DIRECTION.md`) · Synthetic-content disclosure: **AI-GENERATED — must never be presented as documentary photography** · Human-likeness policy: no faces · Brand policy: no marks · License basis: generated-for-project (Arena generation tool terms); **HUMAN ART-DIRECTION REVIEW: REQUIRED before first production UI use.**

**AUTHENTIC PHOTOGRAPHY ACQUISITION GAP (open — mandate §10):** not yet acquired, to be sourced later via genuine license or commission: West-African tailoring workshop · professional measurement process · traditional garment craftsmanship · Kente handling · Ankara cutting · garment fitting · professional tailor workspace · finished bespoke garments. The AI library is the *current controlled foundation only*.

## 3. Review-status model (§8)
`ACQUIRED → TECHNICALLY_VALIDATED → VISUALLY_PROVISIONAL → HUMAN_APPROVED` (or `REJECTED` / `REPLACEMENT_REQUIRED`).
Technical validation = automated (format/dimensions/size/integrity). **Automated visual inspection: LIMITED (no machine-vision available in build environment)** → all assets stand at **VISUALLY_PROVISIONAL; AI-artifact inspection (hands, tools, symmetry, pseudo-text) deferred to human review.**

## 4. Asset register

| Asset ID | Files (derivatives) | Category | Intended usage / Surface | Orig. dims | Sizes | Offline class | Tech | Auto-insp | Human | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| VA-LDR-01 | `landing/hero/hero-craft-workshop-01-hero-{1280.avif,1280.webp,768.webp}` | Landing hero | Public hero (Stage 11); AVIF primary + WebP fallback, 768 mobile | 1376×768 | 59K/101K/54K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDR-02 | `landing/hero/hero-measurement-form-01-hero-{…}` | Landing hero alt | Public hero alternative/editorial | 1376×768 | 18K/36K/19K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDR-03 | `landing/hero/hero-finished-garment-01-hero-{…}` | Landing hero alt | Public "delivery" hero/campaign | 1376×768 | 58K/91K/44K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDC-01 | `landing/craftsmanship/craft-measurement-01-{large-1280,card-800}.webp` | Craftsmanship story | Public MEASURE section (Stage 11) | 1408×768 | 85K/30K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDC-02 | `craft-design-01-{…}` | Craftsmanship story | Public DESIGN section | 1408×768 | 57K/30K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDC-03 | `craft-fabric-selection-01-{…}` | Craftsmanship story | Public MATERIALS section | 1408×768 | 87K/44K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDC-04 | `craft-cutting-01-{…}` | Craftsmanship story | Public PREPARE section | 1408×768 | 64K/33K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDC-05 | `craft-sewing-01-{…}` | Craftsmanship story | Public MAKE section | 1408×768 | 71K/38K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-LDC-06 | `craft-fitting-01-{…}` | Craftsmanship story | Public FINISH section | 1408×768 | 44K/23K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-PRD-01 | `production/production-measurement-01-{large-1280,card-800}.webp` | Production process | Workspace workflow explanation (Stage 10) | 1408×768 | 100K/39K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-PRD-02 | `production-cutting-01-{…}` | Production process | cutting: pattern layout/preparation | 1408×768 | 121K/55K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-PRD-03 | `production-sewing-01-{…}` | Production process | sewing: garment assembly | 1408×768 | 57K/32K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-PRD-04 | `production-fitting-01-{…}` | Production process | fitting: pinned adjustment on form | 1408×768 | 67K/32K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-PRD-05 | `production-finishing-01-{…}` | Production process | finishing: final press | 1408×768 | 57K/29K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
**Batch 3 demand-driven decision (mandate §3.2):** drape references acquired **per distinct fabric *behavior*, not per material**. Behavioral groups: STRUCTURED (denim — stiff twill, holds shape) · FLOWING (silk — liquid drape) · TEXTURED/TRADITIONAL (kente — handwoven strip cloth, sculptural stiffness) · TRANSPARENT/DELICATE (lace — layered sheerness). **One drape representative per group = 4 assets.** NOT generated (documented reuse/omission): cotton, linen, wool, ankara drapes — their macros already communicate weight/weave; their behaviors are represented by the four chosen (cotton≈ankara crispness, linen≈cotton, wool≈denim structure). Lace + denim macros ADDED (distinct material characteristics: transparency/structure; heavy indigo twill).

**Garment Visual Taxonomy — evidence-locked (mandate §4):** repository VERIFIED canonical garment types (`measurements/definitions.ts` `applicableGarmentTypes`): **shirt · trouser · kaftan · dress · jacket**. Classification: one style card per canonical type = **REQUIRED** (Flow B category selection, Stage 8) · second/third variants per type = OPTIONAL (deferred until Stage 8 UX proves choice language) · suits/runway/editorial variants = DEFERRED · **children's wear = DEFERRED — no canonical domain category exists** (not invented). Presentation grammar for ALL garment cards: flat-lay, top-down, neutral warm-grey surface, soft even studio light, garment-only (no model, no face, no props), clear silhouette + visible construction (seams/collar/cuff/hem), palette-consistent fabrics.
| VA-FAB-01..08 (macro cotton/linen/silk/wool/ankara/kente/lace/denim) | `fabrics/fabric-*-macro-01-{card-800,thumb-480}.webp` | Fabric reference | material recognition (Stage 8/9) — texture character | 1024×1024 | see exception | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-FAB-D01..04 (drape silk/denim/kente/lace — one per behavioral group) | `fabrics/fabric-*-drape-01-card-800.webp` | Fabric reference | drape *behavior* (Stage 8/9 material context) | ~1024px | 11–37K | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-GAR-01..05 (shirt/trouser/kaftan/dress/jacket) | `garments/garment-*-01-{card-800,thumb-480}.webp` | Garment selection | Flow B category selection (Stage 8) — flat-lay grammar, evidence-locked taxonomy: **coverage complete; visual acceptance provisional** | 1408×768 | 4.3–7.2K ⚠ | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-ILL-01..07 (no-customers/orders/production/materials/reports/results/activity) | `illustrations/empty-states/empty-state-*-01-card-800.webp` | Empty-state system | Stage 5 primitives + all screens; hierarchy message→action→illustration | 1408×768 | 4.7–9.3K | PRECACHE REQUIRED | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |

**⚠ Garment-card size flag (honest review signal, §9):** 4–5 KB at 800 px is atypically small for photographic content — may indicate overly plain/low-detail imagery. TECHNICALLY VALIDATED only; **HUMAN REVIEW REQUIRED — REPLACEMENT candidate if detail proves insufficient.** Drape references (11–37 KB) plausible. Fabric-texture exception extended: lace 102K · denim 115K @card-800 (same §10 rationale as other macros).

**Budget exceptions (§10 format):** fabric macro textures — cotton 128K / linen 207K / wool 155K / ankara 108K / kente 208K @card-800 (target ≤60K); lace/denim added this batch if exceeding. WHY COMPRESSION FAILED: high-frequency weave detail is the informative content; q≤60 destroys weave structure. INFORMATION LOST AT TARGET: individual thread/weave definition, material identity. MITIGATION (Stage 5 evaluates in UI context): lower-res preview + detail-zoom variant, progressive loading, AVIF tuning, thumbnail/detail split. STAGE 5 REVIEW REQUIRED: **YES**.

**Empty-state illustration grammar (mandate §6 — defined BEFORE generation, applies to all 7):** LINE LANGUAGE: textile-inspired ink line-work, uniform 2px-equivalent stroke, no fills except ivory; one gold thread accent per illustration; stitch-dash (seam) motif as family signature · COMPLEXITY: single primary object + max one supporting element, ≤8KB-class SVG-simple geometry · COMPOSITION: object at visual center, ≥60% whitespace, horizon stitch-line baseline · EMOTIONAL TONE: calm, possibility, craftsmanship-in-progress — never cartoon, never generic SaaS blobs, no characters · FAMILY: same geometry radius, same stroke, same accent placement across: NO CUSTOMERS / NO ORDERS / NO PRODUCTION / NO MATERIALS / NO REPORT DATA / NO SEARCH RESULTS / NO ACTIVITY.

## 5. Rejected candidate sources (provenance evidence, §15)

| Source probed | Verdict | Reason |
|---|---|---|
| gettyimages.com (tailoring/Ghana textile results) | REJECTED | paid stock, no license acquired |
| vecteezy.com (tailor workshop results) | REJECTED | tiered license unclear for production redistribution |
| dreamstime.com (tailor desk results) | REJECTED | paid stock |
| pinterest.com (Ankara board) | REJECTED | repost provenance, unverifiable rights |
| amazon.com product imagery (fabrics, tape measures) | REJECTED | copyrighted product photography |
| arkrepublic.com / contemporary-african-art.com (Kente editorial) | REJECTED | editorial copyright, no usage grant |
| etsy.com listing (Dutch wax fabric) | REJECTED | shop/product copyright |

## 6. Usage map (§21 original mandate)
Landing hero + craftsmanship → **Stage 11 Public Landing** · Production imagery → **Stage 10 Production Workflow** · Fabric macro/drape → **Stage 8/9 material workflow** · Garment cards → **Stage 8 Customer/Order workflow** · Empty states → **Stage 5 primitives** + implementation stages · Brand (existing, untouched) → all surfaces, PRECACHE REQUIRED · `_originals/` → NON-RUNTIME.

## 7. Garment Card Quality Review Register (mandate §1)

Diagnosis (§5 classification, evidence-based): garment **source** JPEGs are 62–147 KB @1408×768 vs 156–240 KB for craft scenes; a near-lossless q95 re-encode of `garment-shirt-01` reaches only 28 KB → small derivatives are explained by **(A) source image complexity** (flat-lay grammar on matte ground compresses well), **not (B) aggressive optimization**. Whether that equals **(D) genuine lack of visual information** is **(E) UNKNOWN WITHOUT HUMAN INSPECTION.** No replacements generated (§5 constraint honored).

| Garment | Source | Purpose | Tech | Card size | Expected visual info | Auto-insp | Human | Status | Replacement risk | Stage 5 action |
|---|---|---|---|---|---|---|---|---|---|---|
| shirt | `garment-shirt-01.jpg` (69K) | category selection | VALID | 5.4K | silhouette, collar/cuff/construction, ivory cotton form, ground separation | LIMITED | REQUIRED | VISUALLY_PROVISIONAL | MEDIUM | EVALUATE IN CONTEXT |
| trouser | `garment-trouser-01.jpg` (108K) | category selection | VALID | 5.5K | silhouette, creases/waistband/pockets, charcoal wool, separation | LIMITED | REQUIRED | VISUALLY_PROVISIONAL | MEDIUM | EVALUATE IN CONTEXT |
| kaftan | `garment-kaftan-01.jpg` (77K) | category selection | VALID | 5.0K | silhouette, neckline/cuff embroidery, wide sleeve drape | LIMITED | REQUIRED | VISUALLY_PROVISIONAL | MEDIUM | EVALUATE IN CONTEXT |
| dress | `garment-dress-01.jpg` (63K) | category selection | VALID | 4.3K | silhouette, waist seams, neckline, burgundy form | LIMITED | REQUIRED | VISUALLY_PROVISIONAL | MEDIUM | EVALUATE IN CONTEXT |
| jacket | `garment-jacket-01.jpg` (147K) | category selection | VALID | 7.2K | silhouette, notch lapels, buttons, navy suiting | LIMITED | REQUIRED | VISUALLY_PROVISIONAL | LOW-MED | EVALUATE IN CONTEXT |

Jacket discrepancy note (§2): jacket source is materially richer (147 KB → 7.2 KB card) than the other four; proportionate behavior, no anomalous normalization — **documented, not reconciled silently**.

## 8. Empty-State Family Coherence Register (§4)

All 7 from one grammar spec; per-field verification is auto-limited (no machine vision) — **structural** conformity verified at generation time (single prompt family, fixed constraints), visual conformity pending human review.

| Check | Status |
|---|---|
| Line weight consistency (2px-equivalent ink) | SPEC-CONFORMANT / visual: LIMITED, PENDING |
| Single gold accent per illustration | SPEC-CONFORMANT / visual: LIMITED, PENDING |
| Stitch-dash family signature present | SPEC-CONFORMANT / visual: LIMITED, PENDING |
| ≥60% whitespace | SPEC-CONFORMANT / visual: LIMITED, PENDING |
| ≤2 principal elements | SPEC-CONFORMANT / visual: LIMITED, PENDING |
| Object scale consistency | LIMITED, PENDING |
| Emotional tone (calm/craft) | LIMITED, PENDING |
| Background: opaque warm-ivory (NOT transparent — webp derivatives are flattened; alpha-channel variant is a Stage 5 decision if needed) | VERIFIED (opaque) |

Family status: TECHNICALLY_VALIDATED · AUTO-INSPECTION: LIMITED · HUMAN REVIEW: PENDING · VISUALLY_PROVISIONAL. Concept mapping validated to Stage 3 taxonomy: NO CUSTOMERS/ORDERS/PRODUCTION/MATERIALS (Workspace entities) · NO REPORT DATA (`no-reports`) · NO RESULTS (search) · NO ACTIVITY (feed/dashboard).

## 9. Coverage audit (§6)

**A Public/landing:** 3 heroes + 6 story moments → hero storytelling ✓, craftsmanship ✓, MEASURE→FINISH narrative ✓.
**B Tailor Workspace:** garment category selection ✓ (5 canonical cards, provisional) · fabric reference ✓ (8 macro + 4 drape) · production context ✓ (5 distinct moments) · empty states ✓ (7-family).
**C Fabric system:** surface characteristics ✓ (8 macros) · flowing ✓ silk · structured ✓ denim · sheer/delicate ✓ lace · traditional identity ✓ kente (macro + drape) & ankara (macro).
**D Production system:** measurement / cutting (layout) / sewing (assembly) / fitting (pinning on form) / finishing (press) — 5 distinct operational moments vs workflow spine ✓; embroidery stage imagery intentionally folded into "sewing/assembly" (not separately acquired — canonical stage *model* untouched; imagery is human-concept, §10 original mandate).
**E Empty states:** coherent 7-member family ✓ (provisional).
**F Reuse classification:** heroes/story = PUBLIC-surface-specific · production = cross-surface (Workspace Stage 10 + Public MAKE section reuse) · fabrics = cross-surface (Stage 8/9 + Public MATERIALS) · garments = Workspace Stage 8 (+ future Public marketing OPTIONAL) · illustrations = cross-surface PRECACHE · `_originals/` = NON-RUNTIME. No remaining product moment lacks required visual support within the accepted provisional-quality caveat.

## 10. Deferred assets (controlled omissions — architecture, not gaps)

1. Garment variants 2–3 per type — OPTIONAL until Stage 8 proves choice language. 2. Category-hero/detail garment shots — DEFERRED (style cards serve Stage 8). 3. Children's/specialty garments — **unsupported by repository taxonomy**. 4. Cotton/linen/wool/ankara drapes — redundant (behavior covered). 5. Embroidery-specific process image — folded into sewing/assembly. 6. Authentic documentary photography (all categories) — requires licensed/commissioned acquisition; gap register open. 7. Dark-mode asset variants — V1 deferred. 8. Phase 19/20/21 assets — out of scope by standing boundary. 9. Transparent-alpha illustration variants — Stage 5 decision.

## 11. Human review queue

**P0 — before UI implementation:** all 5 garment cards (detail sufficiency; replacement risk MEDIUM) · 3 heroes (art-direction fit). **P1 — during Stage 5:** 7 empty-state illustrations (family coherence on real surfaces) · 4 drapes · fabric macro quality-vs-byte tuning in UI context (exception review: YES). **P2 — before public release:** 6 craftsmanship story images · production set as used in Stage 10 · PWA/manifest visual coherence. **P3 — future acquisition:** authentic photography per gap register; optional garment variants; dark-mode variants.

## 12. Stage 5 handoff

**May use immediately (technically validated):** token-gap work (no assets involved); asset paths in *design specs only*. **Must evaluate in real UI context:** fabric macro byte/quality tuning (documented mitigations); garment cards 800/480 in card layouts; illustration scale/whitespace on real surfaces; hero AVIF/WebP loading strategy (runtime = `assets/**` derivatives only). **Must not use until human review:** any P0 asset in shipped UI (garment cards, heroes). **Intentionally deferred:** §10 list. **Open gaps:** authentic photography (register §2). Runtime/original separation: `_originals/` = SOURCE ARCHIVE, NON-RUNTIME, never bundled/precached.

## 13. Completion checklist (§10)

Visual system 7/7 ✓ · Governance 6/6 ✓ (manifest, provenance, AI disclosure, rejected sources, photography gap, deferred list) · Technical integrity 5/5 ✓ (68 derivatives readable 0 corrupt; runtime/original separation; optimization documented; exceptions explicit; no unexplained duplicates) · Quality governance 5/5 ✓ (technical validation complete; no false approval claims; review queue P0–P3; replacement candidates flagged; Stage 5 evaluation documented) · Scope integrity 5/5 ✓ (zero UI/CSS/component/route changes; Stage 5 not begun).

