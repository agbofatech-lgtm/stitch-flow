export {
  generateStylePattern,
  generateStudioPattern,
  PatternValidationError,
  type StylePatternKind,
  type StylePatternResult,
} from './patternAdapter';

export {
  analyzeDesignInspiration,
  generateProductionPlan,
  generateStudioProductionPlan,
  inferGarmentTypeFromInspiration,
  type GenerateProductionPlanInput,
} from './productionAdapter';

export {
  STUDIO_DRAFT_STORAGE_KEY,
  getDraftStorageKey,
  readStudioDrafts,
  writeStudioDrafts,
  isLegacyStudioDraftKey,
  type StudioDraftRecord,
} from './draftStore';

export {
  STUDIO_SAVE_PATHS,
  describeStudioSavePaths,
  assertSavePathsRemainDistinct,
  type StudioSavePath,
} from './saveContract';

export {
  buildStudioGarmentSpecification,
  serializeGarmentSpecification,
  assertNoUiStateInSpecification,
} from './studioSpecification';
