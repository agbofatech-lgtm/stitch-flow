/**
 * Phase 14 — Design Intelligence API client.
 * Thin wrappers around the authenticated fetch helpers.
 * All errors propagate as thrown Error objects — UI handles state.
 */
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';

// ---------------------------------------------------------------------------
// Types (mirroring backend domain contract)
// ---------------------------------------------------------------------------

export type InspirationSourceType =
  | 'image_upload' | 'camera_capture' | 'existing_garment'
  | 'reference_url' | 'screenshot' | 'manual';

export interface DesignObservation {
  category: 'garment' | 'silhouette' | 'length' | 'sleeve' | 'neckline'
    | 'component' | 'construction' | 'decoration' | 'fit' | 'other';
  value: string;
  confidence?: 'manual' | 'confirmed' | 'uncertain';
  notes?: string;
}

export interface InspirationReference {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  sourceType: InspirationSourceType;
  title: string;
  sourceUrl?: string | null;
  localAssetId?: string | null;
  notes?: string | null;
  observations: DesignObservation[];
  createdAt: string;
  updatedAt: string;
}

export type FabricWidthUnit = 'cm' | 'inch';
export type FabricLengthUnit = 'yard' | 'meter' | 'cm';

export interface FabricProfile {
  id: string;
  workspaceId: string;
  name: string;
  localAssetId?: string | null;
  fabricType?: string | null;
  width?: { value: number; unit: FabricWidthUnit } | null;
  availableLength?: { value: number; unit: FabricLengthUnit } | null;
  properties: {
    directional?: boolean;
    patternRepeat?: boolean;
    patternRepeatSizeCm?: number | null;
    requiresMatching?: boolean;
    stretch?: 'none' | 'low' | 'medium' | 'high';
    transparency?: 'opaque' | 'semi-sheer' | 'sheer';
  };
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignComponent {
  type: string;
  notes?: string | null;
  required?: boolean;
}

export type FitType = 'fitted' | 'slim' | 'regular' | 'relaxed' | 'loose' | 'oversized' | 'custom';
export type DesignSpecStatus = 'draft' | 'partial' | 'ready_for_design' | 'validated' | 'ready_for_pattern';

export interface ReadinessItem {
  key: string;
  label: string;
  satisfied: boolean;
  warning?: string | null;
}

export interface DesignReadiness {
  status: DesignSpecStatus;
  items: ReadinessItem[];
  canOpenDesignStudio: boolean;
}

export interface DesignSpecification {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  name: string;
  version: number;
  parentSpecificationId?: string | null;
  garment: {
    category: string;
    subtype?: string | null;
    silhouette?: string | null;
    fit?: FitType | null;
    lengthType?: string | null;
    targetLengthCm?: number | null;
  };
  sleeves?: { type: string; targetLengthCm?: number | null } | null;
  neckline?: { type: string } | null;
  components: DesignComponent[];
  constructionDetails: string[];
  easeConfigurations: { area: string; valueCm: number; source: string }[];
  observations: DesignObservation[];
  measurementProfileId?: string | null;
  measurementContext?: {
    profileId: string;
    profileVersion: number;
    canonicalUnit: 'cm';
    body: Record<string, number>;
    garment?: Record<string, number>;
    validation: { status: string; warnings: string[] };
  } | null;
  inspirationIds: string[];
  fabricProfileIds: string[];
  notes?: string | null;
  status: DesignSpecStatus;
  readiness?: DesignReadiness | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSuggestion {
  area: string;
  bodyMeasurementCm: number;
  easeCm: number;
  suggestedFinishedCm: number;
  source: string;
}

export interface LocalAssetRecord {
  id: string;
  workspaceId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  widthPx?: number | null;
  heightPx?: number | null;
  thumbnailDataUrl?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Inspiration API
// ---------------------------------------------------------------------------

const inspBase = (cid: string) => `/customers/${cid}/inspirations`;

export async function listInspirations(customerId: string): Promise<InspirationReference[]> {
  const d = await apiGet<{ inspirations: InspirationReference[] }>(inspBase(customerId));
  return d.inspirations;
}

export async function createInspiration(
  customerId: string,
  data: Omit<InspirationReference, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt'>,
): Promise<InspirationReference> {
  const d = await apiPost<{ inspiration: InspirationReference }>(inspBase(customerId), data);
  return d.inspiration;
}

export async function updateInspiration(
  customerId: string,
  id: string,
  data: Partial<Omit<InspirationReference, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt'>>,
): Promise<InspirationReference> {
  const d = await apiPatch<{ inspiration: InspirationReference }>(`${inspBase(customerId)}/${id}`, data);
  return d.inspiration;
}

export async function deleteInspiration(customerId: string, id: string): Promise<void> {
  await apiDelete(`${inspBase(customerId)}/${id}`);
}

// ---------------------------------------------------------------------------
// Fabric Profile API
// ---------------------------------------------------------------------------

export async function listFabricProfiles(): Promise<FabricProfile[]> {
  const d = await apiGet<{ fabricProfiles: FabricProfile[] }>('/fabric-profiles');
  return d.fabricProfiles;
}

export async function createFabricProfile(
  data: Omit<FabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
): Promise<FabricProfile> {
  const d = await apiPost<{ fabricProfile: FabricProfile }>('/fabric-profiles', data);
  return d.fabricProfile;
}

export async function updateFabricProfile(
  id: string,
  data: Partial<Omit<FabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
): Promise<FabricProfile> {
  const d = await apiPatch<{ fabricProfile: FabricProfile }>(`/fabric-profiles/${id}`, data);
  return d.fabricProfile;
}

export async function deleteFabricProfile(id: string): Promise<void> {
  await apiDelete(`/fabric-profiles/${id}`);
}

// ---------------------------------------------------------------------------
// Design Specification API
// ---------------------------------------------------------------------------

const dsBase = (cid: string) => `/customers/${cid}/design-specifications`;

export async function listDesignSpecs(customerId: string): Promise<DesignSpecification[]> {
  const d = await apiGet<{ designSpecifications: DesignSpecification[] }>(dsBase(customerId));
  return d.designSpecifications;
}

export async function createDesignSpec(
  customerId: string,
  data: Partial<Omit<DesignSpecification, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt' | 'readiness'>>,
): Promise<DesignSpecification> {
  const d = await apiPost<{ designSpecification: DesignSpecification }>(dsBase(customerId), data);
  return d.designSpecification;
}

export async function getDesignSpec(customerId: string, id: string): Promise<DesignSpecification> {
  const d = await apiGet<{ designSpecification: DesignSpecification }>(`${dsBase(customerId)}/${id}`);
  return d.designSpecification;
}

export async function updateDesignSpec(
  customerId: string,
  id: string,
  data: Partial<Omit<DesignSpecification, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt' | 'readiness'>>,
): Promise<DesignSpecification> {
  const d = await apiPatch<{ designSpecification: DesignSpecification }>(`${dsBase(customerId)}/${id}`, data);
  return d.designSpecification;
}

export async function getDesignSpecHistory(
  customerId: string,
  id: string,
): Promise<{ version: number; createdAt: string; reason: string }[]> {
  const d = await apiGet<{ history: { version: number; createdAt: string; reason: string }[] }>(
    `${dsBase(customerId)}/${id}/history`,
  );
  return d.history;
}

export async function getMeasurementContext(
  customerId: string,
  specId: string,
): Promise<{ measurementContext: DesignSpecification['measurementContext']; suggestions: DesignSuggestion[] }> {
  return apiGet(`${dsBase(customerId)}/${specId}/measurement-context`);
}

// ---------------------------------------------------------------------------
// Local Asset Registration
// ---------------------------------------------------------------------------

export async function registerAsset(
  data: Omit<LocalAssetRecord, 'workspaceId' | 'createdAt'> & { thumbnailDataUrl?: string },
): Promise<LocalAssetRecord> {
  const d = await apiPost<{ asset: LocalAssetRecord }>('/local-assets', data);
  return d.asset;
}

// ---------------------------------------------------------------------------
// Client-side unit conversion
// ---------------------------------------------------------------------------

export function widthToCm(value: number, unit: FabricWidthUnit): number {
  return unit === 'inch' ? Math.round(value * 2.54 * 100) / 100 : value;
}

export function widthFromCm(cm: number, unit: FabricWidthUnit): number {
  return unit === 'inch' ? Math.round((cm / 2.54) * 100) / 100 : cm;
}

export function lengthToCm(value: number, unit: FabricLengthUnit): number {
  if (unit === 'yard') return Math.round(value * 91.44 * 100) / 100;
  if (unit === 'meter') return Math.round(value * 100 * 100) / 100;
  return value;
}

export const FABRIC_TYPE_LABELS: Record<string, string> = {
  ankara: 'Ankara', wax_print: 'Wax Print', kente: 'Kente', lace: 'Lace',
  brocade: 'Brocade', cotton: 'Cotton', linen: 'Linen', silk: 'Silk',
  wool: 'Wool', denim: 'Denim', jersey: 'Jersey', chiffon: 'Chiffon',
  velvet: 'Velvet', satin: 'Satin', traditional: 'Traditional Fabric', custom: 'Custom',
};

export const GARMENT_CATEGORY_LABELS: Record<string, string> = {
  shirt: 'Shirt', blouse: 'Blouse', trousers: 'Trousers', skirt: 'Skirt',
  dress: 'Dress', jacket: 'Jacket', suit: 'Suit', kaftan: 'Kaftan',
  agbada: 'Agbada', traditional: 'Traditional Wear', gown: 'Gown', custom: 'Custom Garment',
};

export const SILHOUETTE_OPTIONS = [
  'fitted', 'slim', 'regular', 'relaxed', 'loose', 'oversized',
  'flowing', 'a-line', 'straight', 'flared', 'structured', 'custom',
];

export const LENGTH_OPTIONS = [
  'cropped', 'waist', 'hip', 'thigh', 'knee', 'midi', 'calf', 'ankle', 'floor', 'custom',
];

export const SLEEVE_OPTIONS = [
  'sleeveless', 'short', 'elbow', 'three-quarter', 'long',
  'puff', 'bell', 'bishop', 'raglan', 'wide', 'fitted', 'custom',
];

export const NECKLINE_OPTIONS = [
  'round', 'v-neck', 'square', 'boat', 'off-shoulder',
  'mandarin', 'shawl', 'spread_collar', 'standing_collar', 'custom',
];

export const COMPONENT_OPTIONS = [
  'front_panel', 'back_panel', 'side_panel', 'sleeve', 'collar', 'cuff',
  'placket', 'waistband', 'pocket', 'lining', 'train', 'cape',
  'overlay', 'embroidery_panel', 'belt', 'custom',
];

export const CONSTRUCTION_OPTIONS = [
  'darts', 'pleats', 'gathering', 'ruffles', 'panels', 'slits',
  'vents', 'buttons', 'zipper', 'elastic', 'belt', 'drawstring',
  'embroidery', 'applique', 'piping', 'lining', 'interfacing', 'custom',
];

export const OBSERVATION_CATEGORIES = [
  'garment', 'silhouette', 'length', 'sleeve', 'neckline',
  'component', 'construction', 'decoration', 'fit', 'other',
] as const;
