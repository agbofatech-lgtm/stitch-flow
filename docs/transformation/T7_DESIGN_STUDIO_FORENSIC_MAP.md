# T7 Design Studio Forensic Map

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T6 checkpoint | `transformation-t6-workflow-migration-complete` → `d0d43a04c1b4878b25a9e00c13b786262288c00d` |
| Asset | `apps/web/src/components/DesignStudio.tsx` |
| Size | 4075 lines |
| SHA-256 | `78ddd839fe2baeeedd37408b3ef9aaead0b8b1e1863ebec438e72334ae4e9507` (T0 unchanged) |
| Host | T5 `StudioShell` workspace `design` |
| T7 implementation | **NOT STARTED** |

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **IMPLEMENTED**

---

## 1. File identity — FACT

- Single React component export: `export function DesignStudio()`.
- Hosted unedited by T5/T6. T6 inspector can also `saveStudioOutputToOrder` without entering this file.
- Type imports use `../types` (T0 DANGEROUS barrel; content is `main.tsx`). Runtime is unaffected because imports are type-only.
- Adjacent leftovers exist (`DesignStudio.tsx.bak*`). Not opened as authority.

## 2. External dependencies — FACT

| Import | Role |
|---|---|
| `react` (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`) | UI / canvas / draft lifecycle |
| `../context/AppContext` `useApp` | Transitional application store |
| `../config/brand` | Export title string |
| `./FeatureGate` | Simulated tier locks (upgrade `window.alert`) |
| `lucide-react` | Icons |
| `@modules/services/patternEngine` | `generateStylePattern`, `PatternValidationError`, `StylePatternKind` |
| `@modules/services/productionAssistant` | `analyzeDesignInspiration`, `generateProductionPlan`, `inferGarmentTypeFromInspiration` |

**FACT:** T3 gateways (`requestPattern`, `requestProductionPlan`) are **not** imported.

**FACT:** No React Router. No T2 repositories. No T6 `WorkflowProvider` consumption inside this file.

## 3. UI state (component-local) — FACT

Tabs: `activeTab` = `pattern | fabric | inspiration`.

Canvas chrome: `previewMode` (`front | back | pieces`), `scale`, `showGrid`, `showSavedPatternPreview`, `patternError`.

Garment: `garmentType` (`SupportedGarmentType`, 11 values).

Measurements: `measurements` (`StudioMeasurements`).

Selection: `selectedFabric` (hardcoded colour chips), `selectedInventoryFabricId`, `selectedMeasurementProfileId`, `selectedPatternLibraryId`.

Draft UX: `studioStatusMessage`, `restoredDraftMessage`, `lastDraftSavedAt`.

Inspiration form: `newInspiration`.

Pattern library form: `patternLibraryDraft`.

Refs: `canvasRef`, `fileInputRef`, `inspirationFileInputRef`.

## 4. Domain / application state (AppContext) — FACT

Read: `currentMember`, `currentWorkspace`, `designStudioMeasurements`, `currentInspirationAnalysis`, `featureAccess`, `fabricImage`, `selectedOrderId`, `orders`, `designInspirations`, `selectedInspirationId`, `fabricRecords`, `patternLibrary`.

Write: `setDesignMeasurements`, `setGarmentMeasurements`, `setSelectedGarmentType`, `setCurrentInspirationAnalysis`, `setFabricImage`, `selectOrder`, `updateOrder`, `addDesignInspiration`, `selectDesignInspiration`, `linkInspirationToOrder`, `addPatternLibraryItem`, `linkPatternToOrder`, `addCustomerMeasurementProfile`.

`deleteDesignInspiration` is destructured and unused.

## 5. Canvas / rendering — FACT

Two independent visual systems:

1. **Silhouette preview** (`front` / `back`): `buildGarmentRenderShape` → `buildUpperGarmentShape` / `buildSkirtShape` / `buildTrouserShape` → `mapShapeToCanvas` → 2D canvas fill/stroke. T3 ownership already labels this `design-studio-canvas-silhouettes` / EXPERIENCE, **not** pattern geometry.
2. **Pieces preview**: `generateStylePattern` output. Bodice uses `controlPoints` path F-A-E-G-J-I-K-D plus dart; generic kinds use `outline` + `guides`.

Shared canvas effects: grid, fabric texture (`fabricImage` or inventory `imageUrl`), colour fill, zoom (`scale` as px/cm), saved-library PNG instead of live canvas.

Export: `canvas.toDataURL` or inspiration/library image → download PNG or `window.open` print HTML (labelled PDF).

## 6. Measurement / garment specification logic — FACT

Local anti-corruption (duplicate of T3 aliases, not imported from `domain/measurement`):

- `MEASUREMENT_ALIASES` bust↔chest, sleeve↔sleeveLength, ankle not fully mirrored to aroundAnkle in this file.
- `getMeasurementValue`, `normalizeMeasurementSource`, `mergeStudioMeasurementsFromSource`, `buildGarmentMeasurements` (also nests `measurements` + `wrist`).
- `buildMeasurementSnapshot` writes **both** `metadata` and `profileMetadata` plus flattened fields. AppContext freeze path does **not** write those extra nests.
- `getPatternKindForGarment`: dress/gown/blouse/custom → bodice; senator → shirt; agbada → kaftan. Matches T3 `mapGarmentTypeToPatternKind` (already documented as Design Studio FACT).

`applyMeasurementProfile` calls `updateOrder` with a new snapshot `capturedAt`. It does **not** call `applyMeasurementProfileToOrder`.

## 7. Selection / transformation — FACT

- Order select → effect hydrates garment type, measurements (replace), fabric, inspiration, pattern library, profile id.
- Draft restore from localStorage can overlay after/alongside order hydrate (two `useEffect`s keyed on `selectedOrderId`).
- `updateMeasurement` aliases bust↔chest for selected kinds and pushes CORE keys into `setDesignMeasurements`.
- `applyAiSuggestion` is keyword/heuristic `inferGarmentTypeFromInspiration` (not ML). UI label says “AI”.
- `handleSaveToOrder` regenerates production plan via the engine and `updateOrder`. Parallel T6 path `saveStudioOutputToOrder` is a **different** function.

## 8. Persistence — FACT

| Path | Key / target | Authority |
|---|---|---|
| Studio drafts | `stitchflow:design-studio:drafts` | **legacy localStorage** (T0 recorded; not added in T3–T6) |
| Order / profiles / library / inspirations | AppContext `saveAppStorage` | TRANSITIONAL localStorage |
| T2 garment / measurement repos | none from this file | — |

Draft write is debounced 500ms. Clear draft deletes one key in the draft map.

## 9. Pattern Engine dependencies — FACT

Called in `useMemo` on every measurement/kind change: `generateStylePattern(patternKind, measurements)`.

Validation errors become `patternError`. Engine formulas are not copied into the canvas silhouette path.

## 10. Production Assistant dependencies — FACT

- `analyzeDesignInspiration` in `useMemo` and again in `handleSaveToOrder`.
- `generateProductionPlan` in `useMemo` (live assistant panel) and `handleSaveToOrder`.
- `inferGarmentTypeFromInspiration` in `applyAiSuggestion`.

UI labels these “AI”. Engine comments and T0 registry: deterministic heuristics, not ML.

## 11. Feature / commercial coupling — FACT

`FeatureGate` wraps measurement profiles, save-to-library, production assistant, fit warnings.

`isProFeature = !featureAccess.canGeneratePattern.allowed` dims pattern generation / refresh.

Upgrade buttons `window.alert` a billing-setup message. Not a billing implementation.

`featureAccess.measurementProfiles | savePattern | productionAssistant | fitWarnings` are optional; Studio defaults several to `true`.

## 12. Hidden / implicit business rules — FACT

- Selectable “use order measurements” only if snapshot/garmentMeasurements has a numeric field.
- Overdue stage uses `expectedCompletionDate` on a stage object (not in canonical `ProductionStage` type).
- Custom garment with `trouserLength` and no bust renders as trousers.
- Gown back preview adds a train point.
- Save-as-profile uses `window.prompt` and `profileType: garmentType` (garment type written into measurement profile type).
- Refresh Draft button does not re-run engines; it copies `inspirationAnalysis` into AppContext and clears saved-preview mode.

## 13. Dead / unused in-file — FACT

`fillColorSafe`, `DetailCard` defined, never called. `deleteDesignInspiration` unused.

## 14. INFERENCE

- Aggressive extraction without a fixture harness would likely change canvas, snapshot shape, or order-save behaviour because the file is the behavioural reference and has no dedicated tests.
- Re-pointing engine calls to T3 wrappers is the lowest-risk *later* extraction **if** output equality is proven (T3 already proved wrapper ≡ engine for sampled kinds). That still requires Design Studio regression, which does not exist yet.
- Dual save paths (Studio `handleSaveToOrder` vs T6 `saveStudioOutputToOrder`) can diverge snapshot metadata.

## 15. PROPOSAL (not implemented)

Do not extract in this cycle. Next authorized work, if owner confirms safety:

1. Capture canvas/order-save behavioural fixtures while the file stays frozen.
2. Only then consider re-pointing engine imports to T3 gateways with equality tests.
3. Do not move silhouette geometry into the pattern engine.
4. Do not delete `stitchflow:design-studio:drafts` without a migration ADR.

## 16. IMPLEMENTED (this cycle)

Documentation only. `DesignStudio.tsx` bytes unchanged.
