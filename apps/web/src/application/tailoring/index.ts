export {
  generateStylePattern,
  generateStudioPattern,
  PatternValidationError,
  runPatternContract,
  type StylePatternKind,
  type StylePatternResult,
  type PatternContractInput,
  type PatternContractResult,
} from './pattern';

export {
  analyzeDesignInspiration,
  generateProductionPlan,
  generateStudioProductionPlan,
  inferGarmentTypeFromInspiration,
  runProductionContract,
  runInspirationAnalysis,
  type GenerateProductionPlanInput,
  type ProductionContractInput,
  type ProductionContractResult,
} from './production';

export {
  CM_PER_INCH,
  ENGINE_LENGTH_UNIT,
  DEFAULT_FABRIC_QUANTITY_UNIT,
  METRES_PER_YARD,
  toCentimetres,
  fromCentimetres,
  toYards,
  fromYards,
  refuseImplicitBodyToFabricConversion,
  assertSameUnitFamily,
  type LengthUnit,
  type UnitFamily,
} from './units';

export {
  patternProvenance,
  productionPlanProvenance,
  type TailoringProvenance,
} from './provenance';

export { evaluateTrustedTailoring, freezeGovernedTrustedTailoring } from './trustedExecution';
