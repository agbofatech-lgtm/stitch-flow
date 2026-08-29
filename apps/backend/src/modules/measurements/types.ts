/**
 * Phase 13 — Measurement Intelligence domain contract.
 * Canonical architecture: Profile → Sets → Values → Definitions.
 * Codes belong to domain logic; labels belong to presentation.
 */

export type MeasurementCategory = 'body' | 'garment' | 'pattern' | 'derived';
export type MeasurementUnit = 'cm' | 'inch';
export type ProfileStatus = 'DRAFT' | 'VALIDATED' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
export type SetCategory = 'body' | 'garment' | 'pattern_reserved';
/** Open string type — new garment types must not require schema changes. */
export type GarmentType = string;
export const KNOWN_GARMENT_TYPES = ['shirt', 'trouser', 'kaftan', 'dress', 'jacket'] as const;
export type MeasurementSource =
  | 'manual'
  | 'historical_copy'
  | 'imported'
  | 'derived'
  | 'estimated';
export type MeasurementConfidence = 'verified' | 'unverified' | 'estimated';
export type ValidationLevel1Result = 'PASS' | 'FAIL';
export type RelationalCheckResult = 'OK' | 'WARNING';
export type AnomalyState = 'NORMAL' | 'UNUSUAL' | 'FLAGGED';
export type CompletenessState = 'COMPLETE' | 'PARTIAL' | 'READY_FOR_DESIGN';

export interface MeasurementDefinition {
  id: string;
  code: string;
  label: string;
  description: string;
  category: MeasurementCategory;
  canonicalUnit: MeasurementUnit;
  dataType: 'numeric';
  displayOrder: number;
  isActive: boolean;
  /** Soft sanity bounds in canonical cm — informational, never rejecting. */
  validationMetadata: { softMinCm?: number; softMaxCm?: number };
  applicableGarmentTypes: GarmentType[];
  /** Garment types for which this definition is required (completeness). */
  requiredFor: GarmentType[] | 'body';
}

export interface QualitativeObservation {
  code: 'posture' | 'shoulder_slope' | 'waist_position' | 'hip_shape' | 'back_curve';
  value: string;
}

export const OBSERVATION_OPTIONS: Record<QualitativeObservation['code'], string[]> = {
  posture: ['neutral', 'forward', 'backward'],
  shoulder_slope: ['neutral', 'sloped', 'square'],
  waist_position: ['natural', 'high', 'low'],
  hip_shape: ['average', 'prominent', 'flat'],
  back_curve: ['average', 'rounded', 'hollow'],
};

export interface MeasurementProfile {
  id: string;
  customerId: string;
  workspaceId: string;
  name: string;
  dateTaken: string;
  version: number;
  parentProfileId: string | null;
  supersedesProfileId: string | null;
  status: ProfileStatus;
  notes: string;
  observations: QualitativeObservation[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementSet {
  id: string;
  profileId: string;
  workspaceId: string;
  category: SetCategory;
  garmentType: GarmentType | null;
  name: string;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementValue {
  id: string;
  measurementSetId: string;
  workspaceId: string;
  definitionId: string;
  definitionCode: string;
  /** Canonical value, always cm, full precision — never rounded for display. */
  canonicalValueCm: number;
  originalValue: number;
  originalUnit: MeasurementUnit;
  source: MeasurementSource;
  confidence: MeasurementConfidence;
  notes: string;
  overrideReason: string | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RelationalFinding {
  code: string;
  result: RelationalCheckResult;
  message: string;
  compared: { code: string; canonicalValueCm: number }[];
}

export interface AnomalyFinding {
  definitionCode: string;
  state: AnomalyState;
  currentCm: number;
  previousCm: number | null;
  historicalAverageCm: number | null;
  changePercent: number | null;
  explanation: string;
}

export interface CompletenessResult {
  state: CompletenessState;
  garmentType: GarmentType | 'body';
  missingDefinitions: string[];
  presentDefinitions: string[];
}

export interface ValidationResult {
  level1: { result: ValidationLevel1Result; errors: string[] };
  relational: RelationalFinding[];
  anomalies: AnomalyFinding[];
  completeness: CompletenessResult[];
  /** Warnings + flags never block; hard level-1 errors block. */
  canSave: boolean;
  canValidate: boolean;
}

export interface ProfileComparisonRow {
  definitionCode: string;
  label: string;
  currentCm: number | null;
  previousCm: number | null;
  absoluteDifferenceCm: number | null;
  percentChange: number | null;
  flag: AnomalyState;
}

export interface ProfileComparison {
  currentProfileId: string;
  previousProfileId: string;
  rows: ProfileComparisonRow[];
}
