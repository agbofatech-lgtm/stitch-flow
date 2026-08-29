/**
 * Phase 13 — Measurement Intelligence API client.
 * Thin wrappers around apiGet/apiPost/apiPut matching the backend routes.
 * All errors propagate as thrown Error objects — callers handle UI state.
 */
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';

export type MeasurementUnit = 'cm' | 'inch';
export type ProfileStatus = 'DRAFT' | 'VALIDATED' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
export type SetCategory = 'body' | 'garment' | 'pattern_reserved';
export type AnomalyState = 'NORMAL' | 'UNUSUAL' | 'FLAGGED';

export interface ApiMeasurementDefinition {
  id: string;
  code: string;
  label: string;
  description: string;
  category: 'body' | 'garment' | 'pattern' | 'derived';
  canonicalUnit: MeasurementUnit;
  displayOrder: number;
  validationMetadata: { softMinCm?: number; softMaxCm?: number };
  applicableGarmentTypes: string[];
  requiredFor: string[] | 'body';
}

export interface ApiMeasurementValue {
  id: string;
  definitionCode: string;
  originalValue: number;
  originalUnit: MeasurementUnit;
  canonicalValueCm: number;
  source: string;
  confidence: string;
  notes: string;
  overrideReason: string | null;
  overriddenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMeasurementSet {
  id: string;
  category: SetCategory;
  garmentType: string | null;
  name: string;
  status: ProfileStatus;
  values: ApiMeasurementValue[];
}

export interface ApiMeasurementProfile {
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
  qualitativeObservations: { code: string; value: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiRelationalFinding {
  code: string;
  result: 'OK' | 'WARNING';
  message: string;
  compared: { code: string; canonicalValueCm: number }[];
}

export interface ApiAnomalyFinding {
  definitionCode: string;
  state: AnomalyState;
  currentCm: number;
  previousCm: number | null;
  historicalAverageCm: number | null;
  changePercent: number | null;
  explanation: string;
}

export interface ApiCompletenessResult {
  state: 'COMPLETE' | 'PARTIAL' | 'READY_FOR_DESIGN';
  garmentType: string;
  missingDefinitions: string[];
  presentDefinitions: string[];
}

export interface ApiValidationResult {
  level1: { result: 'PASS' | 'FAIL'; errors: string[] };
  relational: ApiRelationalFinding[];
  anomalies: ApiAnomalyFinding[];
  completeness: ApiCompletenessResult[];
  canSave: boolean;
  canValidate: boolean;
  /** Historical suggestions — previous verified values only. Never predictions. Never auto-applied. */
  suggestions?: ApiSuggestion[];
}

export interface ApiProfileFull {
  profile: ApiMeasurementProfile;
  sets: ApiMeasurementSet[];
  validation: ApiValidationResult;
}

export interface ApiProfileComparison {
  currentProfileId: string;
  previousProfileId: string;
  rows: {
    definitionCode: string;
    label: string;
    currentCm: number | null;
    previousCm: number | null;
    absoluteDifferenceCm: number | null;
    percentChange: number | null;
    flag: AnomalyState;
  }[];
}

export interface ApiSuggestion {
  definitionCode: string;
  label: string;
  previousCm: number;
}

/** Value input for create/update. */
export interface ValueInput {
  definitionCode: string;
  originalValue: number;
  originalUnit: MeasurementUnit;
  source?: 'manual' | 'historical_copy' | 'imported' | 'derived' | 'estimated';
  confidence?: 'verified' | 'unverified' | 'estimated';
  notes?: string;
  overrideReason?: string | null;
}

export interface SetInput {
  id?: string;
  category: 'body' | 'garment';
  garmentType?: string | null;
  values: ValueInput[];
}

export interface DraftUpdate {
  name?: string;
  dateTaken?: string;
  notes?: string;
  observations?: { code: string; value: string }[];
  sets?: SetInput[];
}

const profileBase = (customerId: string) =>
  `/customers/${customerId}/measurement-profiles`;

/** List all profiles for a customer. */
export async function listProfiles(customerId: string): Promise<ApiMeasurementProfile[]> {
  const data = await apiGet<{ profiles: ApiMeasurementProfile[] }>(profileBase(customerId));
  return data.profiles;
}

/** Create a new DRAFT profile. */
export async function createProfile(
  customerId: string,
  init?: { name?: string; dateTaken?: string; notes?: string },
): Promise<ApiMeasurementProfile> {
  const data = await apiPost<{ profile: ApiMeasurementProfile }>(profileBase(customerId), init ?? {});
  return data.profile;
}

/** Get a single profile with sets + validation. */
export async function getProfileFull(
  customerId: string,
  profileId: string,
): Promise<ApiProfileFull> {
  return apiGet<ApiProfileFull>(`${profileBase(customerId)}/${profileId}`);
}

/** Update a DRAFT profile (name, dateTaken, notes, observations, sets). */
export async function updateDraft(
  customerId: string,
  profileId: string,
  update: DraftUpdate,
): Promise<ApiProfileFull> {
  return apiPatch<ApiProfileFull>(`${profileBase(customerId)}/${profileId}`, update);
}

/** Transition DRAFT → VALIDATED. */
export async function validateProfile(
  customerId: string,
  profileId: string,
): Promise<{ profile: ApiMeasurementProfile; validation: ApiValidationResult }> {
  return apiPost(`${profileBase(customerId)}/${profileId}/validate`, {});
}

/** Transition VALIDATED → ACTIVE (supersedes previous ACTIVE). */
export async function activateProfile(
  customerId: string,
  profileId: string,
): Promise<{ profile: ApiMeasurementProfile }> {
  return apiPost(`${profileBase(customerId)}/${profileId}/activate`, {});
}

/** Transition → ARCHIVED. */
export async function archiveProfile(
  customerId: string,
  profileId: string,
): Promise<{ profile: ApiMeasurementProfile }> {
  return apiPost(`${profileBase(customerId)}/${profileId}/archive`, {});
}

/** Create new version (copies values as historical_copy, returns new DRAFT). */
export async function createNewVersion(
  customerId: string,
  profileId: string,
): Promise<{ profile: ApiMeasurementProfile; sets: ApiMeasurementSet[] }> {
  return apiPost(`${profileBase(customerId)}/${profileId}/new-version`, {});
}

/** Compare two profiles by ID. */
export async function compareProfiles(
  customerId: string,
  currentId: string,
  previousId: string,
): Promise<{ comparison: ApiProfileComparison }> {
  return apiGet(
    `${profileBase(customerId)}/compare?currentId=${encodeURIComponent(currentId)}&previousId=${encodeURIComponent(previousId)}`,
  );
}

/** Definition registry lookup. */
export async function listDefinitions(
  filter?: { category?: string; garmentType?: string },
): Promise<ApiMeasurementDefinition[]> {
  let qs = '';
  if (filter?.category) qs = `?category=${encodeURIComponent(filter.category)}`;
  else if (filter?.garmentType) qs = `?garmentType=${encodeURIComponent(filter.garmentType)}`;
  const data = await apiGet<{ definitions: ApiMeasurementDefinition[] }>(`/measurement-definitions${qs}`);
  return data.definitions;
}

/** Cm ↔ display conversion helpers (client-side, matches backend arithmetic). */
export function cmToInch(cm: number): number {
  return Math.round((cm / 2.54) * 100) / 100;
}
export function inchToCm(inch: number): number {
  return Math.round(inch * 2.54 * 100) / 100;
}
export function formatMeasurement(cm: number, unit: MeasurementUnit): string {
  if (unit === 'inch') return `${cmToInch(cm).toFixed(2)}"`;
  return `${cm.toFixed(1)} cm`;
}
