/**
 * Phase 15 composition provenance. Runtime envelope.
 * Does not invent extra persistence fields.
 */

export type CompositionSource = 'specification-version' | 'manual' | 'user-selection';

export type CompositionAuthorityLevel =
  | 'governed'
  | 'frozen'
  | 'observed'
  | 'insufficient'
  | 'unknown';

export type CompositionProvenance = {
  source: CompositionSource;
  extractionPath: 'p14-specification-version' | 'manual' | 'explicit-selection';
  authorityLevel: CompositionAuthorityLevel;
  specificationVersionId: string;
  resolverVersion: string;
  ruleRegistryVersion: string;
  measurementVersionId?: string | null;
};

export function createCompositionProvenance(input: {
  source: CompositionSource;
  extractionPath: CompositionProvenance['extractionPath'];
  authorityLevel: CompositionAuthorityLevel;
  specificationVersionId: string;
  resolverVersion: string;
  ruleRegistryVersion: string;
  measurementVersionId?: string | null;
}): CompositionProvenance {
  const provenance: CompositionProvenance = {
    source: input.source,
    extractionPath: input.extractionPath,
    authorityLevel: input.authorityLevel,
    specificationVersionId: input.specificationVersionId,
    resolverVersion: input.resolverVersion,
    ruleRegistryVersion: input.ruleRegistryVersion,
  };
  if (input.measurementVersionId !== undefined) {
    provenance.measurementVersionId = input.measurementVersionId;
  }
  return provenance;
}
