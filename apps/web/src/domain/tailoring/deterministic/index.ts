export {
  canonicalize,
  canonicalJson,
  canonicalizeMeasurementMap,
} from './canonicalize';
export { fingerprintCanonicalPayload, fnv1a64Hex, FINGERPRINT_ALGORITHM } from './fingerprint';
export {
  executeDeterministicPattern,
  executeDeterministicProductionPlan,
} from './execute';
export {
  PATTERN_COMPUTATION_VERSION,
  PRODUCTION_COMPUTATION_VERSION,
  PATTERN_ENGINE_SOURCE_IDENTITY,
  PRODUCTION_ASSISTANT_SOURCE_IDENTITY,
  ENGINE_VERSION_UNKNOWN,
} from './versioning';
export {
  CM_PER_INCH,
  ENGINE_LENGTH_UNIT,
  toCentimetres,
  refuseImplicitBodyToFabricConversion,
  assertSameUnitFamily,
} from './units';
export { DEFAULT_AUTHORITY_INVENTORY, HIP_DEFAULT_CONFLICT } from './defaultsInventory';
export {
  governedMeasurementsFromUnknown,
  assertNoSilentCoercion,
  PATTERN_DECLARED_FIELDS,
} from './inputAuthority';
export {
  CONFIGURATION_AUTHORITY_REGISTRY,
  defaultsForPath,
  hipConflictUnresolved,
  selectConfigurationPath,
} from './configuration';
export type {
  DeterministicPatternRequest,
  DeterministicProductionRequest,
  DeterministicComputationResult,
  ComputationProvenance,
  ComputationFingerprint,
} from './contracts';
