# Phase 16 — Fabric & Production Intelligence: Stage 0 Forensics

**Date:** 2026-08-29  
**Branch:** `arena/01a04c42-stitch-flow`  
**Baseline commit:** `fe8e815` (branch HEAD, includes Phase 15 final report)  
**Phase 15 tag:** `phase-15-complete` = `14b6b54` (remote verified ✅)  
**Author:** StitchFlow Agent

---

## 1. Git Baseline

| Check | Result |
|-------|--------|
| HEAD | `fe8e815` |
| Branch | `arena/01a04c42-stitch-flow` |
| Remote branch SHA | `fe8e815` ✅ |
| Working tree | CLEAN ✅ |
| `phase-15-complete` deref | `14b6b54` ✅ |
| `phase-14-complete` deref | `060262564` ✅ |
| `phase-13-complete` deref | `0445965d` ✅ |

**Note:** Branch was reset to initial commit during session handoff but recovered via `git reset --hard FETCH_HEAD`. All work is intact.

---

## 2. Protected IP — ZERO DIFF Verification

```
git diff phase-15-complete -- \
  apps/web/src/components/DesignStudio.tsx \
  apps/web/src/modules/services/patternEngine.ts \
  apps/web/src/modules/services/productionAssistant.ts
```

**Result: 0 lines of diff. ZERO DIFF confirmed. ✅**

---

## 3. productionAssistant.ts — Forensic Audit (READ-ONLY)

`productionAssistant.ts` is PROTECTED. Phase 16 must NOT call it.

Key exports (for awareness — never called from Phase 16):
- `estimateFabricRequirement()` — formula-based estimate (NOT authoritative Phase 16)
- `buildCuttingList()` — cutting list from analysis
- `buildSewingChecklist()` — sewing ops from analysis
- `buildFitRiskWarnings()` — risk flags
- `generateProductionPlan()` — plan orchestrator
- `generateProductionPlanFromInspiration()` — from inspiration only

**Decision:** Phase 16 does NOT call productionAssistant.ts. Phase 16 creates a new, deterministic, layout-geometry-driven Production Intelligence Layer externally.

---

## 4. Phase 15 Consumed Contracts (Phase 16 inputs)

### CuttingLayout (the primary Phase 16 input)
```typescript
interface CuttingLayout {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  patternModelId: string;
  fabricProfileId?: string | null;
  layoutWidthCm: number;       // ← Phase 16 usable width source
  layoutEnvelopeCm: number;    // ← Phase 16 GEOMETRIC BASE LENGTH
  marginCm: number;
  placedPieces: PlacedPiece[];
  validationIssues: LayoutValidationIssue[];
  isValid: boolean;
  algorithm: 'greedy_deterministic';
  algorithmVersion: string;
}
```

### PatternModel (secondary Phase 16 input)
- `pieces[]` — PatternPiece with `seamAllowanceCm`, `grainline`, `constraints`
- `garmentCategory` — drives workflow generation
- `engineKind` — shirt/trouser/skirt/kaftan/bodice
- `derivationContext` — traceability
- `measurementCompleteness` — for readiness

### FabricProfile (from Phase 14, via fabricProfileId)
- `width.valueCm` — nominal width
- `availableLength.valueCm` — what customer brought
- `properties.directional` — drives directional allowance
- `properties.requiresMatching` — drives pattern matching policy
- `properties.patternRepeatSizeCm` — repeat distance (if known)
- `properties.stretch` — fabric type context
- `fabricType` — drives shrinkage defaults

### DesignSpecification (from Phase 14)
- `garment.category` — drives workflow generation
- `garment.fit` — complexity factor
- `components[]` — drives materials and operations
- `constructionDetails[]` — drives workflow
- `status` — readiness gate

---

## 5. Phase 15 Invariants Preserved in Phase 16

| Invariant | How Phase 16 Respects It |
|-----------|--------------------------|
| P15-1: patternEngine.ts ZERO DIFF | Phase 16 does not import or call patternEngine.ts |
| P15-2: layoutEnvelopeCm = max Y + margins (not area÷width) | Phase 16 uses layoutEnvelopeCm as GEOMETRIC BASE LENGTH |
| P15-3: "CUTTING LAYOUT LENGTH" (not "Final Fabric Yardage") | Phase 16 clearly distinguishes: layout length vs fabric required |
| P15-4: Pattern matching never falsely claimed as solved | Phase 16 applies conservative allowance + MANUAL VERIFICATION flag |
| P15-5: Missing measurements never silently defaulted | Phase 16 shows assumption sources; manual overrides preserve provenance |
| P15-6: Nesting is deterministic greedy | Phase 16 does not touch nesting algorithm |

---

## 6. Migration Sequence

| Number | File | Purpose |
|--------|------|---------|
| 019 | `019_phase14_design_intelligence.sql` | Design specs, inspirations, fabric profiles |
| 020 | `020_phase15_pattern_cutting.sql` | Pattern models, cutting layouts |
| **021** | `021_phase16_fabric_production.sql` | **Phase 16 — Fabric consumption, production plans** |

---

## 7. Dexie Schema Sequence

| Version | Tables added |
|---------|-------------|
| 4 | Phase 14 design tables |
| 5 | Phase 15 pattern/cutting tables |
| **6** | **Phase 16 production/fabric tables** |

Tables to add: `productionPlansV16`, `fabricConsumptionsV16`, `productionOutbox`

---

## 8. Backend Route Inventory

| Route prefix | Phase |
|-------------|-------|
| `/customers/:id/measurement-profiles` | 13 |
| `/measurement-definitions` | 13 |
| `/customers/:id/design-specifications` | 14 |
| `/customers/:id/pattern-models` | 15 |
| `/customers/:id/cutting-layouts` | 15 |
| **`/production-plans`** | **16** |
| **`/production-plans/:id/...`** | **16** |

---

## 9. Phase 16 Calculation Model

```
layoutEnvelopeCm (from Phase 15 CuttingLayout)
    │
    ▼ × shrinkageFactor (fabric_profile | material_default | system_default | manual_override)
shrinkageAllowanceCm
    │
    ▼ + selvedgeAllowanceCm (from usable width calculation)
    │
    ▼ × patternMatchingFactor (if requiresMatching; conservative allowance; never auto-solved)
patternMatchingAllowanceCm
    │
    ▼ × directionalFactor (if directional; rotation flexibility reduced)
directionalAllowanceCm
    │
    ▼ × handlingWasteFactor (real-world defects, edge damage, cutting loss)
handlingWasteAllowanceCm
    │
    ▼ × safetyBufferFactor (conservative production margin)
safetyBufferCm
    │
    ▼
fabricRequiredCm (AUTHORITATIVE FABRIC REQUIREMENT)
    │
    ├── fabricRequiredMeters = fabricRequiredCm / 100
    └── fabricRequiredYards = fabricRequiredCm / 91.44
```

---

## 10. Shrinkage Defaults by Fabric Type

| Fabric Type | Default Shrinkage | Confidence |
|-------------|-------------------|------------|
| cotton | 5% | medium |
| linen | 4% | medium |
| silk | 2% | medium |
| wool | 6% | medium |
| denim | 7% | medium |
| jersey | 5% | medium |
| chiffon | 2% | low |
| velvet | 3% | low |
| ankara | 3% | medium |
| wax_print | 3% | medium |
| kente | 2% | low |
| synthetic / unknown | 3% | low |
| (tailor override) | user-set | high |

Source: material_default unless explicitly set in FabricProfile or overridden.

---

## 11. Fabric Width Intelligence

| Field | Source |
|-------|--------|
| Nominal width | `FabricProfile.width.valueCm` |
| Left selvedge default | 1.5 cm |
| Right selvedge default | 1.5 cm |
| Usable width | nominal − left selvedge − right selvedge |
| Tolerance | ±0.5 cm |

Width compatibility check:
- `usableWidthCm >= layoutWidthCm` → PASS
- Otherwise → PRODUCTION BLOCKED

---

## 12. Purchasing Round-Up Policy

| Vendor increment | Round-up example |
|-----------------|------------------|
| 0.5 yard | 2.71 → 3.0 yards |
| 0.25 meter | 2.48 → 2.50 meters |
| 10 cm | 248 → 250 cm |
| 1 yard (default) | 2.71 → 3.0 yards |

Default increment: 0.5 yard or 0.5 meter (configurable).

---

## 13. Garment Workflow Templates

| Category | Key operations |
|----------|---------------|
| shirt | Cutting→Marking→Collar→Sleeve→Body→Sleeve Attach→Placket→Hem→Press→QC |
| trouser | Cutting→Marking→Pocket→Leg Assembly→Crotch→Waistband→Zip→Hem→Press→QC |
| skirt | Cutting→Marking→Darts→Side Seam→Waistband→Zip→Hem→Press→QC |
| kaftan | Cutting→Marking→Neckline→Shoulder→Sleeve→Side Seam→Hem→Press→QC |
| bodice | Cutting→Marking→Darts→Side Seam→Armhole→Shoulder→Neckline→Hem→Press→QC |
| dress | Cutting→Marking→Bodice→Skirt→Join→Zip→Hem→Fitting→Press→QC |
| gown | Cutting→Marking→Bodice→Skirt→Join→Train→Zip→Fitting→Hem→Press→QC |
| agbada | Cutting→Marking→Outer→Inner→Trouser→Embroidery→Neckline→Hem→Press→QC |

---

## 14. Production Readiness Gates

| Gate | Blocker code | Severity |
|------|-------------|----------|
| Design spec validated | DESIGN_NOT_VALIDATED | warning |
| Measurement profile active | MEASUREMENTS_NOT_VALIDATED | warning |
| Fabric profile present | FABRIC_PROFILE_MISSING | warning |
| Usable width compatible | FABRIC_WIDTH_INCOMPATIBLE | blocking |
| Pattern model derived | PATTERN_NOT_DERIVED | blocking |
| Cutting layout valid | LAYOUT_INVALID | blocking |
| Fabric requirement calculated | FABRIC_CONSUMPTION_MISSING | blocking |
| Materials identified | MATERIALS_INCOMPLETE | warning |
| Workflow generated | WORKFLOW_NOT_GENERATED | warning |
| QC plan generated | QC_PLAN_NOT_GENERATED | warning |

---

## 15. F01–F83 Test Coverage Plan

| Range | Area |
|-------|------|
| F01–F18 | Fabric consumption engine |
| F19–F28 | Purchasing intelligence |
| F29–F32 | Material requirements |
| F33–F37 | Cutting execution |
| F38–F46 | Production workflow |
| F47–F50 | Quality control |
| F51–F56 | Production readiness |
| F57–F62 | Traceability |
| F63–F66 | Offline |
| F67–F77 | UI |
| F78–F83 | Integrity (protected IP) |

---

## 16. Stage Plan

| Stage | Tag | Deliverable |
|-------|-----|-------------|
| 0 | `phase-16-forensics` | This document + baseline verification |
| 1 | `phase-16-domain-contracts` | All domain types (backend + frontend) |
| 2 | `phase-16-storage` | Migration 021, Dexie v6 |
| 3 | `phase-16-fabric-consumption` | Consumption engine + tests F01–F18 |
| 4 | `phase-16-purchasing` | Purchasing intelligence + tests F19–F28 |
| 5 | `phase-16-materials` | Material requirements + tests F29–F32 |
| 6 | `phase-16-cutting-execution` | Cutting execution plan + tests F33–F37 |
| 7 | `phase-16-production-workflow` | Workflow engine + tests F38–F46 |
| 8 | `phase-16-quality-control` | QC system + tests F47–F50 |
| 9 | `phase-16-production-readiness` | Readiness engine + tests F51–F56 |
| 10 | `phase-16-api` | Backend routes + tests |
| 11 | `phase-16-ui` | Frontend integration + F67–F77 |
| 12 | `phase-16-complete` | F01–F83 ALL PASS + full certification |

---

*Forensics complete. Ready to proceed to Stage 1.*
