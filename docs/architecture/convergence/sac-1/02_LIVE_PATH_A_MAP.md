# Live Path A Map

**FACT** `DesignStudio.tsx`:

- Imports `generateStylePattern`, `generateProductionPlan`, `analyzeDesignInspiration` from `../application/design` (T7 barrel).
- `useMemo` calls `generateStylePattern(patternKind, measurements)` for canvas (interactive, partial input via engine try/catch).
- `useMemo` calls `generateProductionPlan({ garmentType, measurements, inspiration, analysis, selectedFabric })`.
- `handleSaveToOrder` writes AppContext `updateOrder` (T7 `studio-order-commit`). Distinct from `AppContext.saveStudioOutputToOrder`.
- Persistence: AppContext localStorage + `stitchflow:design-studio:drafts`.

SAC-1 does not change these generation calls.
