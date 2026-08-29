# Phase 15 — Pattern & Cutting Intelligence: Stage 0 Forensics

**Date:** 2026-08-29  
**Branch:** `arena/01a04c42-stitch-flow`  
**Baseline commit:** `005aef9` (tag: `phase-14-complete`)  
**Author:** StitchFlow Agent

---

## 1. Git Baseline

| Check | Result |
|-------|--------|
| HEAD | `005aef9` |
| Branch | `arena/01a04c42-stitch-flow` |
| Remote SHA | `005aef9` ✅ (matches local) |
| Working tree | CLEAN ✅ |
| Tag `phase-14-complete` deref | `005aef9` ✅ |

---

## 2. Protected IP — ZERO DIFF Verification

```
git diff phase-14-complete -- \
  apps/web/src/components/DesignStudio.tsx \
  apps/web/src/modules/services/patternEngine.ts \
  apps/web/src/modules/services/productionAssistant.ts
```

**Result: 0 lines of diff. ZERO DIFF confirmed. ✅**

---

## 3. patternEngine.ts Forensic Audit (678 lines — READ-ONLY)

### 3.1 What patternEngine.ts exports (must not be modified)

| Export | Signature | Purpose |
|--------|-----------|---------|
| `StylePatternKind` | `type = 'bodice' \| 'shirt' \| 'trouser' \| 'skirt' \| 'kaftan'` | Garment kinds the engine supports |
| `ExtendedMeasurements` | `interface extends Partial<BodyMeasurements>` | Input measurement map |
| `PatternGuideLine` | `{start, end, label}` | Construction guide lines |
| `PatternMarker` | `{point, label}` | Notch/reference markers |
| `PatternPieceNote` | `{name, quantity, note?}` | Piece names & quantities |
| `GenericPatternDraft` | Interface | Output for shirt/trouser/skirt/kaftan |
| `StylePatternResult` | `= BodicePatternResult \| GenericPatternDraft` | Union return type |
| `PatternValidationError` | Class | Thrown on bad measurements |
| `generateBodicePattern(measurements)` | `→ BodicePatternResult` | Bodice-specific generator |
| `generateShirtPattern(measurements)` | `→ GenericPatternDraft` | Shirt generator |
| `generateTrouserPattern(measurements)` | `→ GenericPatternDraft` | Trouser generator |
| `generateSkirtPattern(measurements)` | `→ GenericPatternDraft` | Skirt generator |
| `generateKaftanPattern(measurements)` | `→ GenericPatternDraft` | Kaftan generator |
| `generateStylePattern(kind, measurements)` | `→ StylePatternResult` | Main entry point dispatch |
| `scalePatternPoints(points, scale, offset)` | `→ Point[]` | SVG scaling helper |
| `generateBodiceSvgPath(pattern, scale)` | `→ string` | SVG path for bodice |
| `generateDartPath(pattern, scale)` | `→ string` | SVG dart path |
| `generateGuideLines(...)` | `→ ...` | Guide line rendering |

### 3.2 Internal MEASUREMENT_RANGES (defaults — informational for adapter)

| Key | min | max | default |
|-----|-----|-----|---------|
| bust | 70 | 150 | 90 |
| chest | 75 | 160 | 96 |
| waist | 55 | 140 | 72 |
| hip | 75 | 170 | 98 |
| neck | 30 | 50 | 36 |
| shoulder | 8 | 22 | 12 |
| backLength | 30 | 60 | 40 |
| sleeve | 15 | 75 | 24 |
| bustSpan | 10 | 30 | 11 |
| armholeDepth | 15 | 32 | 22 |
| thigh | 35 | 90 | 58 |
| knee | 25 | 65 | 42 |
| ankle | 18 | 45 | 28 |
| trouserLength | 75 | 130 | 108 |
| skirtLength | 35 | 130 | 75 |

> **Note:** The engine silently uses these defaults when measurements are missing.  
> Phase 15 must intercept before calling the engine and make any default use explicit  
> (offer [Use Estimate] / [Enter Manually]) — never silently pass defaults.

### 3.3 Piece Inventory from patternEngine.ts

| Kind | Pieces (from pieceNotes) |
|------|--------------------------|
| `shirt` | Front panel ×2, Back panel ×1, Sleeve ×2, Collar ×2, Collar stand ×2 |
| `trouser` | Front leg ×2, Back leg ×2, Waistband ×1, Fly shield ×1, Pocket bags ×2 |
| `skirt` | Front skirt ×1 (fold), Back skirt ×2, Waistband ×1, Facing/lining ×1 |
| `kaftan` | Front body ×1 (fold), Back body ×1 (fold), Facing/placket ×1, Pocket ×2 |
| `bodice` | (BodicePatternResult — controlPoints geometry, no pieceNotes) |

### 3.4 Engine geometry structure

- `GenericPatternDraft.outline`: `Point[]` — polygon defining pattern piece boundary
- `GenericPatternDraft.points`: same array (copy of outline)
- `GenericPatternDraft.measurements`: computed dimensions in cm
- `GenericPatternDraft.seamAllowanceCm`: always `1.5` (fixed in engine)
- `BodicePatternResult.controlPoints`: named construction points (A–K, dart points)

### 3.5 Adapter strategy (Phase 15)

**Phase 15 MUST:**
- Import from `patternEngine.ts` — never rewrite its contents
- Use `generateStylePattern(kind, measurements)` as the single engine call
- Map Phase 14 garment categories → `StylePatternKind` (with fallback handling)
- Map Phase 14 `DesignMeasurementContext.body` → `ExtendedMeasurements`
- Collect `pieceNotes` from `GenericPatternDraft` to build `PatternPiece[]`
- Extract polygon from `.outline` for bounding box computation
- Override `.seamAllowanceCm` only as an external metadata annotation (never edit engine)
- Apply Phase 14 ease configurations as **pre-processing adjustments to measurements**  
  before passing to the engine (recorded separately for traceability)

---

## 4. productionAssistant.ts — Relevant Knowledge (DO NOT MODIFY)

- `estimateFabricRequirement()` — fabric estimates by formula (NOT geometric layout)
  - This is the predecessor to Phase 16's authoritative yardage. Phase 15 must NOT call it.
- `buildCuttingList()` — builds a cutting instruction list from analysis
  - Phase 15 builds its own deterministic cutting instructions — does NOT call this.
- `generateProductionPlan()` — high-level production plan
  - Phase 15 does not interact with production planning.

**Decision: Phase 15 does NOT call productionAssistant.ts at all.**

---

## 5. Migration Sequence

| Number | File | Purpose |
|--------|------|---------|
| 018 | `018_phase13_measurement_intelligence.sql` | Measurement profiles & sets |
| 019 | `019_phase14_design_intelligence.sql` | Design specs, inspirations, fabric profiles |
| **020** | `020_phase15_pattern_cutting.sql` | **Phase 15 — Pattern models, cutting layouts** |

---

## 6. Dexie Schema Sequence

| Version | Constant | Tables added |
|---------|----------|-------------|
| 1 | `SCHEMA_V1` | Core offline tables |
| 2 | `SCHEMA_V2` | Queue indices |
| 3 | `SCHEMA_V3` | Phase 13 measurement tables |
| 4 | `SCHEMA_V4` | Phase 14 design intelligence tables |
| **5** | **`SCHEMA_V5`** | **Phase 15 pattern & cutting tables** |

**Next Dexie version: 5.**  
Tables to add: `patternModelsV15`, `cuttingLayoutsV15`, `patternOutbox`

---

## 7. Backend Routes Audit

| Route prefix | File | Phase |
|-------------|------|-------|
| `/customers/:id/measurement-profiles` | `measurementRoutes.ts` | 13 |
| `/measurement-definitions` | `measurementRoutes.ts` | 13 |
| `/customers/:id/design-specifications` | `designRoutes.ts` | 14 |
| `/design-assets` | `designRoutes.ts` | 14 |
| `/fabric-profiles` | `designRoutes.ts` | 14 |
| `/inspirations` | `designRoutes.ts` | 14 |
| **`/customers/:id/pattern-models`** | **TBD — Phase 15** | 15 |
| **`/customers/:id/cutting-layouts`** | **TBD — Phase 15** | 15 |

---

## 8. Existing Test Count

| Test file | Tests |
|-----------|-------|
| Phase 13 | 16 |
| Phase 14 | 22 |
| Other backend | 39 |
| **Total** | **77** |

Phase 15 target: **P01–P69** (69 certification tests across backend + frontend)

---

## 9. Phase 14 DesignSpecification → Phase 15 Mapping Plan

| Phase 14 field | Phase 15 use |
|----------------|--------------|
| `garment.category` | Map to `StylePatternKind` via adapter |
| `garment.fit` | Ease modifier (fitted = less ease, oversized = more ease) |
| `garment.targetLengthCm` | Override computed lengths |
| `garment.silhouette` | Piece shape annotations |
| `garment.lengthType` | Secondary length annotation |
| `sleeve.type` | Sleeve piece variant |
| `sleeve.targetLengthCm` | Sleeve length override |
| `neckline.type` | Neckline annotation (no geometry change — flag for tailor) |
| `components[]` | Expected piece list vs. derived piece list |
| `constructionDetails[]` | Construction annotations on cutting instructions |
| `easeConfigurations[]` | Pre-engine measurement adjustments (explicit, traceable) |
| `measurementContext.body` | Maps to `ExtendedMeasurements` |
| `fabricProfileIds[]` | Fabric constraints for layout validation |
| `measurementProfileId` | Traceability chain (Customer → Measurement → Design → Pattern) |

---

## 10. Phase 14 FabricProfile → Layout Constraints Mapping

| FabricProfile field | Layout constraint |
|--------------------|-------------------|
| `width.valueCm` | Maximum piece width constraint |
| `availableLength.valueCm` | Not used for layout length (layout = max Y + margins) |
| `properties.directional` | All pieces must be oriented same direction |
| `properties.patternRepeat` | Flag for manual matching verification |
| `properties.patternRepeatCm` | Pattern repeat distance (flag, not auto-applied) |
| `properties.requiresMatching` | Layout validation: flag "manual verification required" |

---

## 11. Garment Category → StylePatternKind Map (Phase 15 Extension)

| Phase 14 category | StylePatternKind | Notes |
|-------------------|-----------------|-------|
| `shirt` | `shirt` | Direct |
| `blouse` | `shirt` | Map with annotation |
| `trousers` | `trouser` | Direct |
| `skirt` | `skirt` | Direct |
| `kaftan` | `kaftan` | Direct |
| `agbada` | `kaftan` | Map — agbada outer as extended kaftan |
| `dress` | `bodice` | Bodice foundation + skirt |
| `gown` | `bodice` | Bodice foundation + full skirt |
| `jacket` | `bodice` | Bodice variant (flag for tailor) |
| `suit` | `bodice` | Bodice variant (flag for tailor) |
| `traditional` | `kaftan` | Default to kaftan; flag for tailor |
| `custom` | `bodice` | Conservative fallback; flag for tailor |

---

## 12. Phase 15 Architecture

```
Phase 14 DesignSpecification
        │
        ▼
PatternAdapter (NEW — read-only wrapper around patternEngine.ts)
  - Maps garment category → StylePatternKind
  - Maps measurementContext → ExtendedMeasurements
  - Applies ease configurations explicitly (pre-engine)
  - Validates measurement completeness (never silently uses defaults)
        │
        ▼
patternEngine.ts (UNCHANGED — generateStylePattern())
        │
        ▼
PatternIntelligenceService (NEW)
  - Collects pieceNotes → PatternPiece[]
  - Computes bounding boxes from outline polygons
  - Annotates: grainline, seam allowance, mirror/fold, quantity
  - Validates measurement completeness
  - Applies FabricProfile constraints
        │
        ▼
PatternModel (NEW — persisted to DB + Dexie)
  - Immutable versions
  - Full traceability: customer → measurementProfileId → designSpecId → patternModelId
        │
        ▼
CuttingLayoutService (NEW)
  - Greedy deterministic nesting (bounded, offline-capable)
  - Layout validation: overlap, width, rotation, grainline, directional, mirror
  - Layout envelope: max occupied Y + margins (NOT area ÷ width)
  - Labels: "CUTTING LAYOUT LENGTH" — never "FINAL FABRIC YARDAGE"
        │
        ▼
CuttingLayout (NEW — persisted to DB + Dexie)
  - patternModelId foreign key (traceability)
  - layoutEnvelopeCm (geometric max Y + margins)
  - layoutWidthCm (fabric width used)
  - placedPieces[] with positions, rotations, grainline angles
        │
        ▼
CuttingInstructions (NEW — per piece, deterministic)
        │
        ▼
Phase 16 handoff (cutting layout + pattern model → fabric yardage calculation)
```

---

## 13. Stage Plan

| Stage | Tag | Deliverable |
|-------|-----|-------------|
| 0 | `phase-15-forensics` | This document + git baseline |
| 1 | `phase-15-pattern-contracts` | Domain types, DB migration 020, Dexie v5 |
| 2 | `phase-15-pattern-derivation` | PatternAdapter + PatternIntelligenceService |
| 3 | `phase-15-pattern-rules` | Measurement validation, ease, grainline, seam |
| 4 | `phase-15-pattern-validation` | Completeness validation engine |
| 5 | `phase-15-cutting-layout` | Greedy nesting + layout service |
| 6 | `phase-15-layout-metrics` | Layout envelope computation + validation |
| 7 | `phase-15-cutting-instructions` | Per-piece cutting instructions |
| 8 | `phase-15-pattern-ui` | PatternIntelligence.tsx + pieces/layout UI |
| 9 | `phase-15-traceability` | CustomerDetail integration + traceability chain |
| 10 | `phase-15-responsive-accessibility` | Responsive + accessibility pass |
| 11 | `phase-15-offline` | Offline-first + outbox verification |
| 12 | `phase-15-complete` | P01–P69 ALL PASS + full certification |

---

*Forensics complete. Ready to proceed to Stage 1.*
