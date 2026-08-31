# T7 Design Studio Boundary Map

**Date:** 2026-08-31  
**Doctrine:** EXTRACT WITHOUT DESTROYING. Existing `DesignStudio.tsx` is the behavioural reference.

```
EXPERIENCE (keep in DesignStudio until proven extract)
  UI chrome, tabs, FeatureGate, lucide, canvas silhouette (front/back)
  fabric colour chips, file upload, print-window export

APPLICATION (AppContext TRANSITIONAL)
  orders, profiles, inspirations, fabric records, pattern library
  designStudioMeasurements, selectedOrderId, selectedInspirationId
  updateOrder / saveStudioOutputToOrder (T6, outside this file)

LOCAL DRAFT (legacy)
  stitchflow:design-studio:drafts

DOMAIN GATEWAY (T3 — unused by DesignStudio today)
  requestPattern / requestProductionPlan / measurement separate

APPLICATION ADAPTERS (T7 — DesignStudio imports these)
  application/design/patternAdapter           → generateStylePattern
  application/design/productionAdapter        → generateProductionPlan / analyze / infer
  application/design/draftStore               → stitchflow:design-studio:drafts
  application/design/saveContract             → two distinct save paths

PROTECTED ENGINES (unchanged; invoked only via adapters)
  patternEngine.generateStylePattern          → pieces preview
  productionAssistant.generateProductionPlan  → assistant panel + save
  productionAssistant.analyzeDesignInspiration
  productionAssistant.inferGarmentTypeFromInspiration

T6 WORKFLOW (parallel, not consumed here)
  GarmentSpecification / freeze / T3 wrappers / T2 garment snapshot
```

## Must not cross

| Boundary | Rule |
|---|---|
| Silhouette canvas → Pattern Engine | STOP. Ownership: experience-not-domain. |
| DesignStudio → new AI/3D/billing | LOCKED. |
| Direct engine call → silent formula change | STOP-ADR-01. |
| Draft localStorage → second measurement SoT | STOP-ADR-02 if treated as authority. |
| T6 freeze snapshot ↔ Studio `buildMeasurementSnapshot` | Different shapes. Do not silently merge. |

## Safe later extract candidates (PROPOSAL only — not this slice)

1. Re-point adapters to T3 `requestPattern` / `requestProductionPlan` only after proving no measurement-separation drift in Studio.
2. Measurement alias helpers aligned to `domain/measurement` after snapshot-shape fixtures.
3. Canvas silhouette module **copied** with pixel/path fixtures — not rewritten.

T7 forensic cycle is complete. Adapter import extraction is implemented; owner ACCEPT is pending.
