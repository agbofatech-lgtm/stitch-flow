# Design Studio Semantic Map

Asset: `apps/web/src/components/DesignStudio.tsx` — PROTECTED. SHA-256 `5059c0db…783b` UNCHANGED. Do not rewrite.

| Category | Examples | Classification |
|---|---|---|
| Captured intent (if saved to Order) | `garmentType` select; inspiration id; inventory fabric id; pattern library id; measurement sliders | **INTENT** when persisted via `handleSaveToOrder` |
| Visual-only | `previewMode`, `scale` (labelled px/cm), `showGrid`, fabric colour chips, silhouette path, gown train point | **UI / VISUAL ≠ GEOMETRY** |
| Computation-affecting | `garmentType` → patternKind → `generateStylePattern`; measurements map; `generateProductionPlan` inputs | **AFFECTS LEGACY computation** (T10 C1) |
| UI state | `activeTab`, draft restore messages, zoom | **UI-ONLY** (T7 already strips a subset in `studioSpecification`) |
| Persisted drafts | `stitchflow:design-studio:drafts` includes garmentType, measurements, **and** activeTab/previewMode | LEGACY mix of intent + UI |
| Hidden defaults | `buildInitialMeasurements` hip 100, sleeve 24, …; slider `?? field.min`; canvas `hip 102` | Category B / C — **not** domain authority |
| Heuristic “AI” | `inferGarmentTypeFromInspiration`, `analyzeDesignInspiration` | Deterministic keyword match. **Not ML.** Not garment-spec authority |
| No downstream geometry | collarStyle/sleeveStyle on inspiration form (empty default); FitType on inspiration | **SEMANTIC ONLY** for pattern engine |
| Dual save | `handleSaveToOrder` vs `AppContext.saveStudioOutputToOrder` | Different snapshot shapes (T7 FACT) |

## What Design Studio is not

Not domain authority. Not a component model. Not exclusive T10 path.

**PARTIAL** mapping: garmentType and measurements can be extracted; sleeve/collar/fit cannot be compiled to engine inputs without inventing mathematics (STOP-P14-C / H if attempted).
