import type {
  GarmentMeasurements,
  GarmentType,
  MeasurementProfileType,
} from '../types';

export type PatternKind = 'bodice' | 'shirt' | 'trouser' | 'skirt' | 'kaftan';

export type StudioMeasurementKey =
  | 'bust'
  | 'chest'
  | 'waist'
  | 'hip'
  | 'neck'
  | 'shoulder'
  | 'backLength'
  | 'bustSpan'
  | 'armholeDepth'
  | 'sleeve'
  | 'aroundWrist'
  | 'thigh'
  | 'knee'
  | 'ankle'
  | 'trouserLength'
  | 'skirtLength'
  | 'fullLength';

export type MeasurementField = {
  key: StudioMeasurementKey;
  label: string;
  min: number;
  max: number;
  unit: string;
  optional?: boolean;
};

export type StudioMeasurements = Partial<Record<StudioMeasurementKey, number>>;

function pickNumber(...values: Array<number | undefined>) {
  return values.find((value) => typeof value === 'number' && !Number.isNaN(value));
}

function getLegacyNumber(
  source: Partial<GarmentMeasurements> | null | undefined,
  key: string
): number | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

export function normalizeGarmentLabel(garmentType: GarmentType): string {
  switch (garmentType) {
    case 'bodice':
      return 'Bodice';
    case 'shirt':
      return 'Shirt';
    case 'trouser':
      return 'Trouser';
    case 'skirt':
      return 'Skirt';
    case 'kaftan':
      return 'Kaftan';
    case 'dress':
      return 'Dress';
    case 'gown':
      return 'Gown';
    case 'senator':
      return 'Senator';
    case 'agbada':
      return 'Agbada';
    case 'blouse':
      return 'Blouse';
    case 'custom':
    default:
      return 'Custom';
  }
}

export function getPatternKindForGarment(garmentType: GarmentType): PatternKind {
  switch (garmentType) {
    case 'shirt':
    case 'senator':
      return 'shirt';
    case 'trouser':
      return 'trouser';
    case 'skirt':
      return 'skirt';
    case 'kaftan':
    case 'agbada':
      return 'kaftan';
    case 'bodice':
    case 'dress':
    case 'gown':
    case 'blouse':
    case 'custom':
    default:
      return 'bodice';
  }
}

export function getGarmentTypeFromProfileType(
  profileType?: MeasurementProfileType | null
): GarmentType | null {
  switch (profileType) {
    case 'shirt':
      return 'shirt';
    case 'dress_kaba':
      return 'dress';
    case 'skirt':
      return 'skirt';
    case 'trouser':
      return 'trouser';
    case 'blouse':
      return 'blouse';
    case 'custom':
      return 'custom';
    default:
      return null;
  }
}

export function getProfileTypeForGarment(
  garmentType?: GarmentType | null
): MeasurementProfileType | null {
  switch (garmentType) {
    case 'shirt':
    case 'senator':
      return 'shirt';
    case 'dress':
    case 'gown':
    case 'kaftan':
    case 'agbada':
    case 'bodice':
      return 'dress_kaba';
    case 'skirt':
      return 'skirt';
    case 'trouser':
      return 'trouser';
    case 'blouse':
      return 'blouse';
    case 'custom':
      return 'custom';
    default:
      return null;
  }
}

export function normalizeStudioMeasurementsFromSource(
  source?: Partial<GarmentMeasurements> | null
): StudioMeasurements {
  if (!source) return {};

  return {
    bust: pickNumber(source.bust, source.chest),
    chest: pickNumber(source.chest, source.bust),
    waist: source.waist,
    hip: source.hip,
    neck: source.neck,
    shoulder: source.shoulder,
    backLength: pickNumber(source.backLength, source.shirtLength),
    bustSpan: pickNumber(source.bustSpan, source.nippleToNipple),
    armholeDepth: source.armholeDepth,
    sleeve: pickNumber(source.sleeve, source.sleeveLength),
    aroundWrist: pickNumber(source.aroundWrist, getLegacyNumber(source, 'wrist')),
    thigh: source.thigh,
    knee: source.knee,
    ankle: pickNumber(source.ankle, source.aroundAnkle),
    trouserLength: source.trouserLength,
    skirtLength: source.skirtLength,
    fullLength: pickNumber(source.fullLength, source.dressLength, source.kabaLength),
  };
}

export function mergeStudioMeasurements(
  current: StudioMeasurements,
  source?: Partial<GarmentMeasurements> | null
): StudioMeasurements {
  const normalized = normalizeStudioMeasurementsFromSource(source);

  return {
    ...current,
    bust: pickNumber(normalized.bust, current.bust),
    chest: pickNumber(normalized.chest, current.chest),
    waist: pickNumber(normalized.waist, current.waist),
    hip: pickNumber(normalized.hip, current.hip),
    neck: pickNumber(normalized.neck, current.neck),
    shoulder: pickNumber(normalized.shoulder, current.shoulder),
    backLength: pickNumber(normalized.backLength, current.backLength),
    bustSpan: pickNumber(normalized.bustSpan, current.bustSpan),
    armholeDepth: pickNumber(normalized.armholeDepth, current.armholeDepth),
    sleeve: pickNumber(normalized.sleeve, current.sleeve),
    aroundWrist: pickNumber(normalized.aroundWrist, current.aroundWrist),
    thigh: pickNumber(normalized.thigh, current.thigh),
    knee: pickNumber(normalized.knee, current.knee),
    ankle: pickNumber(normalized.ankle, current.ankle),
    trouserLength: pickNumber(normalized.trouserLength, current.trouserLength),
    skirtLength: pickNumber(normalized.skirtLength, current.skirtLength),
    fullLength: pickNumber(normalized.fullLength, current.fullLength),
  };
}

export function buildGarmentMeasurementsFromStudio(
  measurements: StudioMeasurements
): Partial<GarmentMeasurements> {
  return {
    bust: measurements.bust,
    chest: measurements.chest ?? measurements.bust,
    waist: measurements.waist,
    hip: measurements.hip,
    neck: measurements.neck,
    shoulder: measurements.shoulder,
    backLength: measurements.backLength,
    shirtLength: measurements.backLength,
    bustSpan: measurements.bustSpan,
    nippleToNipple: measurements.bustSpan,
    armholeDepth: measurements.armholeDepth,
    sleeve: measurements.sleeve,
    sleeveLength: measurements.sleeve,
    aroundWrist: measurements.aroundWrist,
    thigh: measurements.thigh,
    knee: measurements.knee,
    ankle: measurements.ankle,
    aroundAnkle: measurements.ankle,
    trouserLength: measurements.trouserLength,
    skirtLength: measurements.skirtLength,
    fullLength: measurements.fullLength,
  };
}

export const MEASUREMENT_FIELDS_BY_GARMENT: Record<GarmentType, MeasurementField[]> = {
  bodice: [
    { key: 'bust', label: 'Bust', min: 70, max: 150, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 120, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 18, unit: 'cm' },
    { key: 'backLength', label: 'Back Length', min: 30, max: 55, unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', min: 10, max: 30, unit: 'cm', optional: true },
    { key: 'armholeDepth', label: 'Armhole Depth', min: 15, max: 32, unit: 'cm', optional: true },
  ],
  shirt: [
    { key: 'chest', label: 'Chest', min: 75, max: 160, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm' },
    { key: 'aroundWrist', label: 'Around Wrist', min: 14, max: 35, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
  ],
  trouser: [
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'hip', label: 'Hip', min: 75, max: 170, unit: 'cm' },
    { key: 'thigh', label: 'Thigh', min: 35, max: 90, unit: 'cm' },
    { key: 'knee', label: 'Knee', min: 25, max: 65, unit: 'cm' },
    { key: 'ankle', label: 'Ankle', min: 18, max: 45, unit: 'cm' },
    { key: 'trouserLength', label: 'Trouser Length', min: 75, max: 130, unit: 'cm' },
  ],
  skirt: [
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'hip', label: 'Hip', min: 75, max: 170, unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', min: 35, max: 130, unit: 'cm' },
  ],
  kaftan: [
    { key: 'chest', label: 'Chest', min: 75, max: 160, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
    { key: 'fullLength', label: 'Full Length', min: 80, max: 180, unit: 'cm', optional: true },
  ],
  dress: [
    { key: 'bust', label: 'Bust', min: 70, max: 150, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'hip', label: 'Hip', min: 75, max: 170, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 60, unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', min: 40, max: 140, unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', min: 10, max: 30, unit: 'cm', optional: true },
    { key: 'armholeDepth', label: 'Armhole Depth', min: 15, max: 32, unit: 'cm', optional: true },
  ],
  gown: [
    { key: 'bust', label: 'Bust', min: 70, max: 150, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'hip', label: 'Hip', min: 75, max: 170, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 60, unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', min: 50, max: 170, unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', min: 10, max: 30, unit: 'cm', optional: true },
    { key: 'armholeDepth', label: 'Armhole Depth', min: 15, max: 32, unit: 'cm', optional: true },
  ],
  senator: [
    { key: 'chest', label: 'Chest', min: 75, max: 160, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm' },
    { key: 'aroundWrist', label: 'Around Wrist', min: 14, max: 35, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
  ],
  agbada: [
    { key: 'chest', label: 'Chest', min: 75, max: 160, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
    { key: 'fullLength', label: 'Full Length', min: 90, max: 190, unit: 'cm' },
  ],
  blouse: [
    { key: 'bust', label: 'Bust', min: 70, max: 150, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 60, unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', min: 10, max: 30, unit: 'cm', optional: true },
    { key: 'armholeDepth', label: 'Armhole Depth', min: 15, max: 32, unit: 'cm', optional: true },
  ],
  custom: [
    { key: 'bust', label: 'Bust / Chest', min: 70, max: 160, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'hip', label: 'Hip', min: 75, max: 170, unit: 'cm', optional: true },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm', optional: true },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm', optional: true },
    { key: 'aroundWrist', label: 'Around Wrist', min: 14, max: 35, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', min: 35, max: 160, unit: 'cm', optional: true },
    { key: 'trouserLength', label: 'Trouser Length', min: 75, max: 130, unit: 'cm', optional: true },
  ],
};

export function getMeasurementFieldsForGarment(
  garmentType: GarmentType
): MeasurementField[] {
  return MEASUREMENT_FIELDS_BY_GARMENT[garmentType] || MEASUREMENT_FIELDS_BY_GARMENT.custom;
}
