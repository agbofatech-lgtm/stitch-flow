/**
 * Phase 16 execution vocabulary. Not tailoring law.
 */

export const EXECUTION_CONTRACT_VERSION = 'trusted-tailoring-execution-v1' as const;

export const EXECUTION_OUTPUT_CLASSIFICATIONS = [
  'AUTHORITATIVE',
  'DERIVED_OUTPUT',
  'OBSERVED_ENGINE_OUTPUT',
  'HEURISTIC_OUTPUT',
  'ADVISORY_OUTPUT',
  'UNKNOWN',
] as const;

export type ExecutionOutputClassification = (typeof EXECUTION_OUTPUT_CLASSIFICATIONS)[number];

export const EXECUTION_STATUSES = [
  'executed',
  'partial',
  'unknown',
  'unsupported',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];
