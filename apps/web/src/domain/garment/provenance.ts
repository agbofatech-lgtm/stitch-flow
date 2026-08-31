/**
 * Phase 14 garment specification provenance.
 * Runtime envelope. Does not invent extra persistence fields.
 */

export type GarmentSpecificationSource = 'studio' | 'order' | 'legacy' | 'imported' | 'manual';

export type GarmentAuthorityLevel =
  | 'live'
  | 'observed'
  | 'transitional'
  | 'governed'
  | 'frozen'
  | 'derived'
  | 'unknown';

export type GarmentSpecificationProvenance = {
  source: GarmentSpecificationSource;
  extractionPath: 'studio-adapter' | 'manual' | 'order-extract' | 'legacy-projection';
  authorityLevel: GarmentAuthorityLevel;
  sourceVersion?: string;
};

const SOURCES = new Set<GarmentSpecificationSource>([
  'studio',
  'order',
  'legacy',
  'imported',
  'manual',
]);

export function createGarmentProvenance(input: {
  source: GarmentSpecificationSource;
  extractionPath: GarmentSpecificationProvenance['extractionPath'];
  authorityLevel: GarmentAuthorityLevel;
  sourceVersion?: string;
}): GarmentSpecificationProvenance {
  if (!SOURCES.has(input.source)) {
    throw new Error('STOP: unknown garment specification source');
  }
  const provenance: GarmentSpecificationProvenance = {
    source: input.source,
    extractionPath: input.extractionPath,
    authorityLevel: input.authorityLevel,
  };
  if (input.sourceVersion) provenance.sourceVersion = input.sourceVersion;
  return provenance;
}
