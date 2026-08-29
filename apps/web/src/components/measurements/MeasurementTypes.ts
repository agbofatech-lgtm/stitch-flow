/**
 * Phase 13 — Measurement UI shared type re-exports.
 * Components import from here to avoid deep relative paths to the API module.
 */
export type {
  MeasurementUnit,
  ProfileStatus,
  SetCategory,
  AnomalyState,
  ApiMeasurementDefinition,
  ApiMeasurementValue,
  ApiMeasurementSet,
  ApiMeasurementProfile,
  ApiValidationResult,
  ApiRelationalFinding,
  ApiAnomalyFinding,
  ApiCompletenessResult,
  ApiProfileFull,
  ApiProfileComparison,
  ValueInput,
  SetInput,
  DraftUpdate,
} from '../../shared/api/measurements';

export { formatMeasurement, cmToInch, inchToCm } from '../../shared/api/measurements';

/** Status display config. */
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  VALIDATED: 'Validated',
  ACTIVE: 'Active',
  SUPERSEDED: 'Superseded',
  ARCHIVED: 'Archived',
};

export const STATUS_TONE: Record<string, string> = {
  DRAFT: 'neutral',
  VALIDATED: 'info',
  ACTIVE: 'success',
  SUPERSEDED: 'warning',
  ARCHIVED: 'neutral',
};

export const ANOMALY_TONE: Record<string, string> = {
  NORMAL: 'neutral',
  UNUSUAL: 'warning',
  FLAGGED: 'danger',
};

export const ANOMALY_LABEL: Record<string, string> = {
  NORMAL: 'Normal',
  UNUSUAL: 'Unusual',
  FLAGGED: 'Flagged',
};

/** Garment types supported in the UI (open — new types don't need schema changes). */
export const KNOWN_GARMENT_TYPES = [
  { value: 'shirt', label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'kaftan', label: 'Kaftan' },
  { value: 'dress', label: 'Dress' },
  { value: 'jacket', label: 'Jacket' },
] as const;

export const OBSERVATION_CODES = [
  'posture',
  'shoulder_slope',
  'waist_position',
  'hip_shape',
  'back_curve',
] as const;

export const OBSERVATION_OPTIONS: Record<string, string[]> = {
  posture: ['neutral', 'forward', 'backward'],
  shoulder_slope: ['neutral', 'sloped', 'square'],
  waist_position: ['neutral', 'high', 'low'],
  hip_shape: ['neutral', 'wide', 'narrow'],
  back_curve: ['neutral', 'pronounced', 'flat'],
};

export const OBSERVATION_LABELS: Record<string, string> = {
  posture: 'Posture',
  shoulder_slope: 'Shoulder Slope',
  waist_position: 'Waist Position',
  hip_shape: 'Hip Shape',
  back_curve: 'Back Curve',
};
