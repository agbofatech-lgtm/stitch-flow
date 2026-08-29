/**
 * Phase 13 — Measurement Definition Registry (seed content).
 * The registry is the single source of measurement concepts; UI forms are
 * definition-driven and requiredness lives here, not in components.
 * Soft bounds are informational sanity metadata — never hard correctness.
 */
import type { MeasurementCategory, MeasurementDefinition } from './types';

let seq = 0;
const def = (
  code: string,
  label: string,
  category: MeasurementCategory,
  opts: Partial<MeasurementDefinition> & { soft?: [number, number] } = {},
): MeasurementDefinition => ({
  id: `mdef-${code}`,
  code,
  label,
  description: opts.description ?? `${label} measurement.`,
  category,
  canonicalUnit: 'cm',
  dataType: 'numeric',
  displayOrder: (seq += 10),
  isActive: true,
  validationMetadata: { softMinCm: opts.soft?.[0], softMaxCm: opts.soft?.[1] },
  applicableGarmentTypes: opts.applicableGarmentTypes ?? [],
  requiredFor: opts.requiredFor ?? [],
});

export const BODY_DEFINITIONS: MeasurementDefinition[] = [
  def('bust_circumference', 'Bust / Chest', 'body', { soft: [60, 180], requiredFor: 'body' }),
  def('waist_circumference', 'Waist', 'body', { soft: [40, 180], requiredFor: 'body' }),
  def('hip_circumference', 'Hip', 'body', { soft: [50, 200], requiredFor: 'body' }),
  def('neck_circumference', 'Neck', 'body', { soft: [25, 60], requiredFor: 'body' }),
  def('shoulder_width', 'Shoulder Width', 'body', { soft: [25, 70], requiredFor: 'body' }),
  def('sleeve_length', 'Sleeve Length', 'body', { soft: [30, 95] }),
  def('inseam_length', 'Inseam', 'body', { soft: [40, 110] }),
  def('outseam_length', 'Outseam', 'body', { soft: [60, 130] }),
  def('front_length', 'Front Length', 'body', { soft: [30, 90] }),
  def('back_length', 'Back Length', 'body', { soft: [30, 90] }),
  def('armhole_depth', 'Armhole Depth', 'body', { soft: [15, 45] }),
  def('bicep_circumference', 'Bicep', 'body', { soft: [18, 60] }),
  def('wrist_circumference', 'Wrist', 'body', { soft: [12, 35] }),
  def('thigh_circumference', 'Thigh', 'body', { soft: [30, 110] }),
  def('calf_circumference', 'Calf', 'body', { soft: [20, 80] }),
  def('ankle_circumference', 'Ankle', 'body', { soft: [15, 50] }),
];

export const GARMENT_DEFINITIONS: MeasurementDefinition[] = [
  // Shirt
  def('collar_circumference', 'Collar', 'garment', { applicableGarmentTypes: ['shirt'], requiredFor: ['shirt'], soft: [25, 60] }),
  def('garment_shoulder_width', 'Shoulder (garment)', 'garment', { applicableGarmentTypes: ['shirt', 'jacket', 'kaftan'], requiredFor: ['shirt', 'jacket'], soft: [25, 70] }),
  def('garment_chest_circumference', 'Chest (garment)', 'garment', { applicableGarmentTypes: ['shirt', 'jacket', 'kaftan', 'dress'], requiredFor: ['shirt', 'jacket', 'dress'], soft: [60, 200] }),
  def('garment_waist_circumference', 'Waist (garment)', 'garment', { applicableGarmentTypes: ['shirt', 'trouser', 'kaftan', 'dress', 'jacket'], requiredFor: ['shirt', 'trouser'], soft: [40, 200] }),
  def('garment_sleeve_length', 'Sleeve Length (garment)', 'garment', { applicableGarmentTypes: ['shirt', 'jacket'], requiredFor: ['shirt'], soft: [30, 95] }),
  def('garment_length', 'Garment Length', 'garment', { applicableGarmentTypes: ['shirt', 'kaftan', 'dress', 'jacket'], requiredFor: ['shirt', 'kaftan', 'dress'], soft: [40, 180] }),
  def('cuff_circumference', 'Cuff', 'garment', { applicableGarmentTypes: ['shirt', 'jacket'], requiredFor: ['shirt'], soft: [15, 45] }),
  def('bicep_garment', 'Bicep (garment)', 'garment', { applicableGarmentTypes: ['shirt', 'jacket'] }),
  def('wrist_garment', 'Wrist (garment)', 'garment', { applicableGarmentTypes: ['shirt'] }),
  def('armhole_depth_garment', 'Armhole (garment)', 'garment', { applicableGarmentTypes: ['shirt', 'jacket', 'dress'] }),
  // Trouser
  def('garment_hip_circumference', 'Hip (garment)', 'garment', { applicableGarmentTypes: ['trouser', 'dress'], requiredFor: ['trouser'], soft: [50, 220] }),
  def('garment_inseam_length', 'Inseam (garment)', 'garment', { applicableGarmentTypes: ['trouser'], requiredFor: ['trouser'], soft: [40, 110] }),
  def('garment_outseam_length', 'Outseam (garment)', 'garment', { applicableGarmentTypes: ['trouser'], requiredFor: ['trouser'], soft: [60, 130] }),
  def('thigh_garment', 'Thigh (garment)', 'garment', { applicableGarmentTypes: ['trouser'] }),
  def('knee_circumference', 'Knee', 'garment', { applicableGarmentTypes: ['trouser'] }),
  def('calf_garment', 'Calf (garment)', 'garment', { applicableGarmentTypes: ['trouser'] }),
  def('hem_width', 'Hem Width', 'garment', { applicableGarmentTypes: ['trouser'] }),
  // Kaftan / dress / jacket extras
  def('kaftan_sleeve_length', 'Sleeve (kaftan)', 'garment', { applicableGarmentTypes: ['kaftan'] }),
  def('dress_hip_circumference', 'Hip (dress)', 'garment', { applicableGarmentTypes: ['dress'] }),
  def('jacket_length', 'Jacket Length', 'garment', { applicableGarmentTypes: ['jacket'] }),
];

/** Reserved for future Pattern Intelligence — registered, not editable UI. */
export const PATTERN_RESERVED_DEFINITIONS: MeasurementDefinition[] = [
  def('pattern_front_bodice_length', 'Front bodice length (pattern)', 'pattern' as never, { description: 'Reserved pattern contract — derived by future Pattern Intelligence.' }),
  def('pattern_back_bodice_length', 'Back bodice length (pattern)', 'pattern' as never, { description: 'Reserved pattern contract — derived by future Pattern Intelligence.' }),
];

export const ALL_DEFINITIONS: MeasurementDefinition[] = [
  ...BODY_DEFINITIONS,
  ...GARMENT_DEFINITIONS,
  ...PATTERN_RESERVED_DEFINITIONS,
];

export const DEFINITION_BY_CODE = new Map(ALL_DEFINITIONS.map((d) => [d.code, d]));

export function definitionsForGarment(garmentType: string): MeasurementDefinition[] {
  return GARMENT_DEFINITIONS.filter((d) => d.applicableGarmentTypes.includes(garmentType));
}

export function requiredDefinitionsFor(garmentType: string | 'body'): MeasurementDefinition[] {
  if (garmentType === 'body') return BODY_DEFINITIONS.filter((d) => d.requiredFor === 'body');
  return GARMENT_DEFINITIONS.filter((d) => Array.isArray(d.requiredFor) && d.requiredFor.includes(garmentType));
}
