# T10 Default Authority Inventory

**Status:** INVENTORIED. Values **not** changed. Conflicts **not** reconciled.  
**Date:** 2026-08-31

T10.1 does not fill missing measurements at the contract boundary. Missing keys remain missing so each engine keeps its own shipped defaults.

| Default | Location | Value | Classification | Authority | Action |
|---|---|---|---|---|---|
| bust (missing) | patternEngine `MEASUREMENT_RANGES` | 90 | ENGINE_INVARIANT | Pattern Engine | leave |
| chest (missing) | patternEngine `MEASUREMENT_RANGES` | 96 | ENGINE_INVARIANT | Pattern Engine | leave |
| waist (missing) | patternEngine `MEASUREMENT_RANGES` | 72 | ENGINE_INVARIANT | Pattern Engine | leave |
| hip (missing) | patternEngine `MEASUREMENT_RANGES` | 98 | ENGINE_INVARIANT | Pattern Engine | leave |
| hip (missing) | jobSheet `getPatternMeasurements` | 100 | UI_DEFAULT / LEGACY_DUPLICATE | jobSheetExport | leave; **conflicts** with 98 |
| hip (missing) | DesignStudio `buildInitialMeasurements` | 100 | UI_DEFAULT | DesignStudio | leave; **conflicts** with engine 98 |
| hip (missing) | productionAssistant `estimateFabricRequirement` | 102 | ENGINE_INVARIANT | Production Assistant | leave; **conflicts** with 98 and 100 |
| hip (missing) | DesignStudio `buildGarmentRenderShape` | 102 | UI_DEFAULT | canvas EXPERIENCE | leave; not pattern geometry |
| bust/chest fabric fallback | productionAssistant | 96 | ENGINE_INVARIANT | Production Assistant | leave |
| backLength fabric fallback | productionAssistant | 40 | ENGINE_INVARIANT | Production Assistant | leave |
| sleeve fabric fallback | productionAssistant | 24 | ENGINE_INVARIANT | Production Assistant | leave |
| skirtLength fabric fallback | productionAssistant | 75 | ENGINE_INVARIANT | Production Assistant | leave |
| trouserLength fabric fallback | productionAssistant | 108 | ENGINE_INVARIANT | Production Assistant | leave |
| jobSheet bust/chest | jobSheet | 90 | UI_DEFAULT | jobSheetExport | leave |
| seamAllowanceCm | patternEngine generic drafts | 1.5 | ENGINE_INVARIANT | Pattern Engine | leave |
| round1 | both engines | 0.1 cm / 0.1 yards | ENGINE_INVARIANT | engines | leave |
| fabric unit | productionAssistant | `yards` | ENGINE_INVARIANT | Production Assistant | leave |
| generatedAt | productionAssistant | `new Date()` | operational clock | Production Assistant | excluded from identity |
| CM_PER_INCH | T8 units | 2.54 | DOMAIN_CONFIGURATION | T8 | reuse |
| METRES_PER_YARD | T9 tailoring units | 0.9144 | DOMAIN_CONFIGURATION | T9 | unused by engines |
| Studio draft key | T7 | `stitchflow:design-studio:drafts` | UI convenience | T7 TRANSITIONAL | no new key |

## Conflict record (not resolved)

**HIP missing-key defaults disagree:** engine 98 vs jobSheet/Studio initial 100 vs assistant/canvas 102.

**Classification:** LEGACY_DUPLICATE / ENGINE_INVARIANT disagreement.

**T10.1 action:** STOP reconciliation. Do not pick a winner. Contract does not inject a hip default.

Bust missing-key similarly disagrees (engine 90 vs assistant 96) when paths differ.
