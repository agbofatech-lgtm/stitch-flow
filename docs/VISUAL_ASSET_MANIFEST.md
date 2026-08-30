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
| VA-FAB-01..06 (macro cotton/linen/silk/wool/ankara/kente) | `fabrics/fabric-*-macro-01-{card-800,thumb-480}.webp` | Fabric reference | material recognition (Stage 8/9) — **batch 3 in progress (6/16)** | 1024×1024 | see exception | CACHE ON DEMAND | PASS | LIMITED | PENDING | VISUALLY_PROVISIONAL |
| VA-GAR / VA-ILL | — | garments / illustrations | batches pending — registered on commit | — | — | — | — | — | — | — |

**Budget compliance:** heroes ≤180 KB ✓ (max 101 KB) · cards ≤60 KB ✓ (max 55 KB) — **exception: fabric macro textures** (§11 fidelity rule): cotton 128 KB · linen 207 KB · wool 155 KB · ankara 108 KB · kente 208 KB @800px q72, thumbs 14–86 KB @480px. WHY: high-frequency weave detail is the informative content; ≤60 KB destroys weave structure. USAGE: texture-reference cards/swatch viewers where detail is the purpose. MITIGATION: final quality tuning deferred to Stage 5 with real UI contexts; no blind recompression now.

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
