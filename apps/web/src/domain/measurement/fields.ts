/**
 * T3 measurement field ownership.
 * Body, garment, and pattern stay distinct.
 * Pattern fields are a derived projection, not a third independent vocabulary.
 */

export const BODY_MEASUREMENT_FIELDS = [
  'bust',
  'chest',
  'waist',
  'hip',
  'neck',
  'shoulder',
  'sleeve',
  'sleeveLength',
  'aroundArm',
  'aroundWrist',
  'backLength',
  'bustSpan',
  'armholeDepth',
  'shoulderToWaist',
  'shoulderToHip',
  'shoulderToNipple',
  'nippleToNipple',
  'napeToWaist',
  'underBust',
  'shoulderToUnderBust',
  'acrossChest',
  'acrossBack',
  'thigh',
  'knee',
  'ankle',
  'aroundAnkle',
  'inseam',
  'crotchDepth',
  'waistToHip',
  'bicep',
] as const;

export const GARMENT_MEASUREMENT_FIELDS = [
  'trouserLength',
  'skirtLength',
  'slitLength',
  'dressLength',
  'kabaLength',
  'shirtLength',
  'fullLength',
  'sleeveOpening',
  'notes',
] as const;

export type BodyMeasurementField = (typeof BODY_MEASUREMENT_FIELDS)[number];
export type GarmentMeasurementField = (typeof GARMENT_MEASUREMENT_FIELDS)[number];

export type PatternKind = 'bodice' | 'shirt' | 'trouser' | 'skirt' | 'kaftan';

/** FACT: keys the protected pattern engine actually reads (patternEngine.ts). */
export const PATTERN_INPUT_FIELDS: Record<PatternKind, readonly string[]> = {
  bodice: ['bust', 'waist', 'neck', 'shoulder', 'backLength', 'bustSpan', 'armholeDepth'],
  shirt: ['chest', 'neck', 'shoulder', 'sleeve', 'backLength'],
  trouser: ['waist', 'hip', 'trouserLength', 'thigh', 'knee', 'ankle'],
  skirt: ['waist', 'hip', 'skirtLength'],
  kaftan: ['chest', 'shoulder', 'backLength', 'neck'],
};

export type MeasurementClass = 'body' | 'garment' | 'unknown';

const BODY_SET = new Set<string>(BODY_MEASUREMENT_FIELDS);
const GARMENT_SET = new Set<string>(GARMENT_MEASUREMENT_FIELDS);

export function classifyMeasurementField(field: string): MeasurementClass {
  if (BODY_SET.has(field)) return 'body';
  if (GARMENT_SET.has(field)) return 'garment';
  return 'unknown';
}

export function assertBodyAndGarmentDistinct(): void {
  for (const field of BODY_MEASUREMENT_FIELDS) {
    if (GARMENT_SET.has(field)) {
      throw new Error(`STOP: ${field} assigned to both body and garment`);
    }
  }
}

assertBodyAndGarmentDistinct();
