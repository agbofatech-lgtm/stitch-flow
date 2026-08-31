/**
 * T10.1 computation versions. Not engine semantic versions.
 * SOURCE_IDENTITY_AVAILABLE = T0 SHA-256 of the protected file.
 */

export const PATTERN_COMPUTATION_VERSION = 'pattern-v1' as const;
export const PRODUCTION_COMPUTATION_VERSION = 'production-plan-v1' as const;
export const INPUT_CONTRACT_VERSION = 'measurement-input-v1' as const;
export const CONFIGURATION_IDENTITY = 'engine-internal-defaults' as const;

export const PATTERN_ENGINE_SOURCE_IDENTITY =
  'sha256:d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc';

export const PRODUCTION_ASSISTANT_SOURCE_IDENTITY =
  'sha256:140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4';

export const ENGINE_VERSION_UNKNOWN = 'ENGINE_VERSION_UNKNOWN' as const;

export type ComputationVersion =
  | typeof PATTERN_COMPUTATION_VERSION
  | typeof PRODUCTION_COMPUTATION_VERSION;
