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
| VA-GAR-01..04 (shirt/trouser/kaftan/dress; jacket pending batch 4 completion) | `garments/garment-*-01-{card-800,thumb-480}.webp` | Garment selection | Flow B category selection (Stage 8) — flat-lay grammar, evidence-locked taxonomy | 1408×768 | 4–5K ⚠ | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-ILL | — | illustrations | batch 5 pending (grammar specified above) | — | — | — | — | — | — | — |

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

## 7. Integrity register (§18 checklist — updated at completion gate)
Pending: fabric/garment/illustration coverage · final coherence review · completion checklist.
