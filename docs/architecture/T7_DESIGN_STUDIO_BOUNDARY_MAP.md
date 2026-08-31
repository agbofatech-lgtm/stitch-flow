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

PROTECTED ENGINES (called DIRECTLY today)
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

## Safe later extract candidates (PROPOSAL only)

1. Engine **imports** re-pointed to T3 wrappers after equality + UI regression.
2. Measurement alias helpers aligned to `domain/measurement` after snapshot-shape fixtures.
3. Canvas silhouette module **copied** with pixel/path fixtures — not rewritten.

None of these are authorized in the T7 forensic cycle.
