/**
 * Phase 13 measurement taxonomy.
 * Classifies existing records. Does not invent a second source of truth.
 */

export type MeasurementAuthorityClass =
  | 'live-profile'
  | 'measurement-set'
  | 'frozen-version'
  | 'order-snapshot'
  | 'derived-pattern'
  | 'legacy-draft'
  | 'unknown';

export type MeasurementTaxonomyRecord = {
  authority: MeasurementAuthorityClass;
  mutability: 'mutable' | 'frozen' | 'derived' | 'unknown';
  sourceOfTruth: 'transitional-appcontext' | 't2-measurement' | 'derived' | 'legacy' | 'unknown';
};

export function classifyMeasurementRecord(input: {
  kind?: string | null;
  frozen?: boolean | null;
  derivedFrom?: string | null;
  draftKey?: string | null;
  isOrderSnapshot?: boolean;
  isLiveProfile?: boolean;
}): MeasurementTaxonomyRecord {
  if (input.draftKey === 'stitchflow:design-studio:drafts') {
    return { authority: 'legacy-draft', mutability: 'mutable', sourceOfTruth: 'legacy' };
  }
  if (input.kind === 'MeasurementVersion' || input.frozen === true) {
    return { authority: 'frozen-version', mutability: 'frozen', sourceOfTruth: 't2-measurement' };
  }
  if (input.kind === 'MeasurementSet') {
    return { authority: 'measurement-set', mutability: 'mutable', sourceOfTruth: 't2-measurement' };
  }
  if (input.derivedFrom === 'body+garment') {
    return { authority: 'derived-pattern', mutability: 'derived', sourceOfTruth: 'derived' };
  }
  if (input.isOrderSnapshot) {
    return {
      authority: 'order-snapshot',
      mutability: 'frozen',
      sourceOfTruth: 'transitional-appcontext',
    };
  }
  if (input.isLiveProfile) {
    return {
      authority: 'live-profile',
      mutability: 'mutable',
      sourceOfTruth: 'transitional-appcontext',
    };
  }
  return { authority: 'unknown', mutability: 'unknown', sourceOfTruth: 'unknown' };
}
