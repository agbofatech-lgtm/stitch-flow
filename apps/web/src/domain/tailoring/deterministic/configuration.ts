/**
 * T10.4 configuration authority. Records path-specific defaults.
 * Does not pick a winner among 98 / 100 / 102.
 * Does not change protected-engine constants.
 */

export type DefaultClass =
  | 'deterministic-engine-constant'
  | 'ui-convenience-default'
  | 'domain-default'
  | 'legacy-duplicate'
  | 'unknown';

export type ComputationPath =
  | 'pattern-engine'
  | 'production-assistant'
  | 'design-studio-initial'
  | 'design-studio-canvas'
  | 'job-sheet'
  | 't10-deterministic-core';

export type DefaultRecord = {
  field: string;
  path: ComputationPath;
  value: number | string;
  classification: DefaultClass;
  appliedByCore: boolean;
};

export const CONFIGURATION_AUTHORITY_REGISTRY: DefaultRecord[] = [
  { field: 'hip', path: 'pattern-engine', value: 98, classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'hip', path: 'job-sheet', value: 100, classification: 'ui-convenience-default', appliedByCore: false },
  { field: 'hip', path: 'design-studio-initial', value: 100, classification: 'ui-convenience-default', appliedByCore: false },
  { field: 'hip', path: 'production-assistant', value: 102, classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'hip', path: 'design-studio-canvas', value: 102, classification: 'ui-convenience-default', appliedByCore: false },
  { field: 'bust', path: 'pattern-engine', value: 90, classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'chest', path: 'pattern-engine', value: 96, classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'bust', path: 'production-assistant', value: 96, classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'seamAllowanceCm', path: 'pattern-engine', value: 1.5, classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'fabricUnit', path: 'production-assistant', value: 'yards', classification: 'deterministic-engine-constant', appliedByCore: false },
  { field: 'CM_PER_INCH', path: 't10-deterministic-core', value: 2.54, classification: 'domain-default', appliedByCore: true },
];

export function defaultsForPath(path: ComputationPath): DefaultRecord[] {
  return CONFIGURATION_AUTHORITY_REGISTRY.filter((row) => row.path === path);
}

export function hipConflictUnresolved(): boolean {
  const hips = CONFIGURATION_AUTHORITY_REGISTRY.filter((row) => row.field === 'hip').map((row) => row.value);
  return new Set(hips).size > 1;
}

/**
 * Core selection: none. Missing measurements are forwarded.
 * Callers that need a UI placeholder must name their path explicitly.
 */
export function selectConfigurationPath(path: ComputationPath): ComputationPath {
  return path;
}
