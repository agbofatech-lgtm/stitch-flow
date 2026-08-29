/**
 * Phase 14 — Design Intelligence domain contract.
 * Inspiration + Fabric + Design Specification → structured handoff for Phase 15.
 *
 * ARCHITECTURAL BOUNDARIES:
 * - Phase 14 captures structured design intent. It does NOT generate patterns.
 * - Phase 14 records available fabric. It does NOT calculate yardage.
 * - Phase 14 presents suggestions. It does NOT auto-apply them.
 * - The tailor remains authoritative throughout.
 */

// ---------------------------------------------------------------------------
// Inspiration
// ---------------------------------------------------------------------------

export type InspirationSourceType =
  | 'image_upload'
  | 'camera_capture'
  | 'existing_garment'
  | 'reference_url'
  | 'screenshot'
  | 'manual';

/**
 * A single design observation — structured rather than free-form notes.
 * Confidence reflects how the observation was determined (manual = tailor-entered).
 */
export interface DesignObservation {
  category:
    | 'garment'
    | 'silhouette'
    | 'length'
    | 'sleeve'
    | 'neckline'
    | 'component'
    | 'construction'
    | 'decoration'
    | 'fit'
    | 'other';
  value: string;
  confidence?: 'manual' | 'confirmed' | 'uncertain';
  notes?: string;
}

/**
 * An inspiration reference is evidence of design intent.
 * It is NOT automatically treated as a pattern.
 * A reference URL is metadata — not an AI ingestion pipeline.
 */
export interface InspirationReference {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  sourceType: InspirationSourceType;
  title: string;
  /** External URL (reference_url / screenshot) — metadata only. Never scraped. */
  sourceUrl?: string | null;
  /** Local asset ID referencing the stored image blob (Dexie v4 assetStore). */
  localAssetId?: string | null;
  notes?: string | null;
  observations: DesignObservation[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Fabric Profile
// ---------------------------------------------------------------------------

export type FabricWidthUnit = 'cm' | 'inch';
export type FabricLengthUnit = 'yard' | 'meter' | 'cm';
export type FabricStretch = 'none' | 'low' | 'medium' | 'high';
export type FabricTransparency = 'opaque' | 'semi-sheer' | 'sheer';

/**
 * Phase 14 Fabric Profile: captures the actual fabric the customer brings.
 * Available quantity ≠ required quantity (yardage calculation is Phase 16).
 */
export interface FabricProfile {
  id: string;
  workspaceId: string;
  name: string;
  /** Local asset ID for the fabric photo. */
  localAssetId?: string | null;
  fabricType?: string | null;
  /** Width with unit — normalized internally, original preserved. */
  width?: { value: number; unit: FabricWidthUnit } | null;
  /** What the customer brought — NOT what the garment requires. */
  availableLength?: { value: number; unit: FabricLengthUnit } | null;
  properties: {
    directional?: boolean;
    patternRepeat?: boolean;
    patternRepeatSizeCm?: number | null;
    requiresMatching?: boolean;
    stretch?: FabricStretch;
    transparency?: FabricTransparency;
  };
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Design Component
// ---------------------------------------------------------------------------

export interface DesignComponent {
  type: string;   // e.g. 'front_panel', 'sleeve', 'collar', 'lining' — open string
  notes?: string | null;
  required?: boolean;
}

// ---------------------------------------------------------------------------
// Ease Configuration
// ---------------------------------------------------------------------------

export type EaseArea = 'chest' | 'waist' | 'hip' | 'bicep';
export type EaseSource = 'default' | 'garment' | 'tailor_override';

export interface EaseConfiguration {
  area: EaseArea;
  valueCm: number;
  source: EaseSource;
}

// ---------------------------------------------------------------------------
// Design Measurement Context (Measurement → Design Adapter)
// ---------------------------------------------------------------------------

/**
 * Normalized measurement context produced by the adapter.
 * All values are in cm (canonical). Original measurement profile is referenced
 * by ID and version — never mutated.
 */
export interface DesignMeasurementContext {
  profileId: string;
  profileVersion: number;
  canonicalUnit: 'cm';
  /** Body measurements keyed by definition code, value in cm. */
  body: Record<string, number>;
  /** Garment measurements (if available) keyed by definition code, value in cm. */
  garment?: Record<string, number>;
  validation: {
    status: 'VALIDATED' | 'ACTIVE' | 'DRAFT' | 'unknown';
    warnings: string[];
  };
}

// ---------------------------------------------------------------------------
// Design Specification — the canonical Phase 14 output / Phase 15 input
// ---------------------------------------------------------------------------

export type DesignSpecificationStatus =
  | 'draft'
  | 'partial'
  | 'ready_for_design'
  | 'validated'
  | 'ready_for_pattern';

export type FitType = 'fitted' | 'slim' | 'regular' | 'relaxed' | 'loose' | 'oversized' | 'custom';

export interface DesignSpecification {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  name: string;
  version: number;
  parentSpecificationId?: string | null;

  garment: {
    category: string;      // open string — extensible without schema changes
    subtype?: string | null;
    silhouette?: string | null;
    fit?: FitType | null;
    lengthType?: string | null;
    targetLengthCm?: number | null;
  };

  sleeves?: {
    type: string;
    targetLengthCm?: number | null;
  } | null;

  neckline?: {
    type: string;
  } | null;

  components: DesignComponent[];
  constructionDetails: string[];
  easeConfigurations: EaseConfiguration[];
  observations: DesignObservation[];

  /** Phase 13 measurement profile ID — never the raw measurement data. */
  measurementProfileId?: string | null;
  /** Snapshot of the measurement context at time of design. */
  measurementContext?: DesignMeasurementContext | null;

  /** Linked inspiration reference IDs. */
  inspirationIds: string[];
  /** Linked fabric profile IDs. */
  fabricProfileIds: string[];

  notes?: string | null;
  status: DesignSpecificationStatus;

  /** Human-readable readiness report — computed, not stored. */
  readiness?: DesignReadinessReport | null;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Design Readiness Report
// ---------------------------------------------------------------------------

export interface ReadinessItem {
  key: string;
  label: string;
  satisfied: boolean;
  warning?: string | null;
}

export interface DesignReadinessReport {
  status: DesignSpecificationStatus;
  items: ReadinessItem[];
  canOpenDesignStudio: boolean;
}

// ---------------------------------------------------------------------------
// Design Studio Adapter context
// ---------------------------------------------------------------------------

/**
 * What the adapter passes to the existing Design Studio (via AppContext setters).
 * Constructed from the DesignSpecification; does NOT touch protected files.
 */
export interface DesignStudioContext {
  designSpecificationId: string;
  customerId?: string | null;
  measurementContext?: DesignMeasurementContext | null;
  garment: {
    category: string;
    silhouette?: string | null;
    fit?: FitType | null;
    lengthCm?: number | null;
  };
  components: DesignComponent[];
  inspirationIds: string[];
  fabricProfileIds: string[];
}

// ---------------------------------------------------------------------------
// Fabric type registry (open — new types do not require schema changes)
// ---------------------------------------------------------------------------

export const FABRIC_TYPE_OPTIONS = [
  'ankara',
  'wax_print',
  'kente',
  'lace',
  'brocade',
  'cotton',
  'linen',
  'silk',
  'wool',
  'denim',
  'jersey',
  'chiffon',
  'velvet',
  'satin',
  'traditional',
  'custom',
] as const;

export type KnownFabricType = (typeof FABRIC_TYPE_OPTIONS)[number];

export const FABRIC_TYPE_LABELS: Record<string, string> = {
  ankara: 'Ankara',
  wax_print: 'Wax Print',
  kente: 'Kente',
  lace: 'Lace',
  brocade: 'Brocade',
  cotton: 'Cotton',
  linen: 'Linen',
  silk: 'Silk',
  wool: 'Wool',
  denim: 'Denim',
  jersey: 'Jersey',
  chiffon: 'Chiffon',
  velvet: 'Velvet',
  satin: 'Satin',
  traditional: 'Traditional Fabric',
  custom: 'Custom',
};

// ---------------------------------------------------------------------------
// Garment category registry (open — extensible)
// ---------------------------------------------------------------------------

export const GARMENT_CATEGORIES = [
  'shirt',
  'blouse',
  'trousers',
  'skirt',
  'dress',
  'jacket',
  'suit',
  'kaftan',
  'agbada',
  'traditional',
  'gown',
  'custom',
] as const;

export const GARMENT_CATEGORY_LABELS: Record<string, string> = {
  shirt: 'Shirt',
  blouse: 'Blouse',
  trousers: 'Trousers',
  skirt: 'Skirt',
  dress: 'Dress',
  jacket: 'Jacket',
  suit: 'Suit',
  kaftan: 'Kaftan',
  agbada: 'Agbada',
  traditional: 'Traditional Wear',
  gown: 'Gown',
  custom: 'Custom Garment',
};

// ---------------------------------------------------------------------------
// Silhouette / Length / Sleeve / Neckline option sets
// ---------------------------------------------------------------------------

export const SILHOUETTE_OPTIONS = [
  'fitted', 'slim', 'regular', 'relaxed', 'loose', 'oversized',
  'flowing', 'a-line', 'straight', 'flared', 'structured', 'custom',
] as const;

export const LENGTH_OPTIONS = [
  'cropped', 'waist', 'hip', 'thigh', 'knee', 'midi', 'calf', 'ankle', 'floor', 'custom',
] as const;

export const SLEEVE_OPTIONS = [
  'sleeveless', 'short', 'elbow', 'three-quarter', 'long',
  'puff', 'bell', 'bishop', 'raglan', 'wide', 'fitted', 'custom',
] as const;

export const NECKLINE_OPTIONS = [
  'round', 'v-neck', 'square', 'boat', 'off-shoulder',
  'mandarin', 'shawl', 'spread_collar', 'standing_collar', 'custom',
] as const;

export const COMPONENT_OPTIONS = [
  'front_panel', 'back_panel', 'side_panel', 'sleeve', 'collar', 'cuff',
  'placket', 'waistband', 'pocket', 'lining', 'train', 'cape',
  'overlay', 'embroidery_panel', 'belt', 'custom',
] as const;

export const CONSTRUCTION_OPTIONS = [
  'darts', 'pleats', 'gathering', 'ruffles', 'panels', 'slits',
  'vents', 'buttons', 'zipper', 'elastic', 'belt', 'drawstring',
  'embroidery', 'applique', 'piping', 'lining', 'interfacing', 'custom',
] as const;

export const OBSERVATION_CATEGORIES: DesignObservation['category'][] = [
  'garment', 'silhouette', 'length', 'sleeve', 'neckline',
  'component', 'construction', 'decoration', 'fit', 'other',
];
