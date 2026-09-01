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

export {
  assessTrustedReadiness,
  intentFromWorkingDesign,
  type TrustedWorkingDesign,
  type TrustedReadinessResult,
  type TrustedReadinessIssue,
} from './trustedReadiness';

export {
  finalizeDesignForTrustedTailoring,
  type TrustedFinalizationInput,
  type TrustedFinalizationResult,
  type TrustedTailoringArtifact,
  type TrustedFinalizationPhase,
} from './trustedFinalization';
