# T7 Implementation Report

**Date:** 2026-08-31  
**Status:** Adapter extraction implemented. Owner Acceptance **PENDING**. T7 tag **not created**.

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **DEFERRED**

## What was extracted — FACT

New application module `apps/web/src/application/design/`:

| File | Role |
|---|---|
| `patternAdapter.ts` | Re-exports `generateStylePattern` / `PatternValidationError`; wraps `generateStudioPattern` |
| `productionAdapter.ts` | Re-exports `analyzeDesignInspiration`, `generateProductionPlan`, `inferGarmentTypeFromInspiration`; wraps `generateStudioProductionPlan` |
| `draftStore.ts` | Legacy key `stitchflow:design-studio:drafts` only |
| `saveContract.ts` | Documents two distinct save paths |
| `studioSpecification.ts` | Builds/serializes `GarmentSpecification` without UI-only keys |
| `index.ts` | Public adapter barrel |
| `design.test.ts` | Equality + boundary tests |

`DesignStudio.tsx` now imports engines and draft helpers from `../application/design`. Local `STUDIO_DRAFT_STORAGE_KEY` and local `readStudioDrafts` / `writeStudioDrafts` / `getDraftStorageKey` were removed. Canvas silhouette builders, measurement aliases, tabs, and `handleSaveToOrder` body remain in the component.

## Dual save paths — FACT

| Path | Owner | Status |
|---|---|---|
| `studio-order-commit` | `DesignStudio.handleSaveToOrder` | Unchanged behaviour; still present |
| `context-studio-session` | `AppContext.saveStudioOutputToOrder` | Unchanged; still a different function |

They were not merged.

## Persistence — FACT

- Drafts still use `stitchflow:design-studio:drafts`.
- No new localStorage key.
- Draft map is not deleted.
- T2 garment repository is **not** used for studio drafts.

**DEFERRED:** migrating drafts onto T2 (requires ADR + owner).

## What was not done — FACT

- Pattern Engine / Production Assistant bytes unchanged vs T0.
- Canvas / silhouette / UI / formulas not rewritten.
- T3 `requestPattern` / `requestProductionPlan` still unused by DesignStudio (adapters wrap the same signatures Studio already called, to avoid measurement-separation drift).
- No T7 completion tag.
- T8 / Phase 13 not started.

## Protected hashes

| Asset | SHA-256 | vs T0 |
|---|---|---|
| patternEngine.ts | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` | unchanged |
| productionAssistant.ts | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` | unchanged |
| shared/types/index.ts | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` | unchanged |
| productionStageService.ts | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` | unchanged |
| DesignStudio.tsx | `5059c0db5633d9340793e620863cfc521ee8118a2f3188ead9082ee2c1ae783b` | changed (import/draft extraction only; 4047 lines) |
