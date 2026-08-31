import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type ChangeEvent,
  type ElementType,
} from 'react';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import { FeatureGate } from './FeatureGate';
import {
  Ruler,
  Upload,
  Save,
  Download,
  Lock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Grid,
  Eye,
  Layers,
  Info,
  Sparkles,
  Scissors,
  Shirt,
  Images,
  Plus,
  Link as LinkIcon,
  Tag,
  Trash2,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Package,
  ClipboardList,
  BadgeInfo,
  PanelsTopLeft,
  XCircle,
} from 'lucide-react';
import {
  generateStylePattern,
  PatternValidationError,
  type StylePatternKind,
  analyzeDesignInspiration,
  generateProductionPlan,
  inferGarmentTypeFromInspiration,
  getDraftStorageKey,
  readStudioDrafts,
  writeStudioDrafts,
} from '../application/design';
import type {
  BodyMeasurements,
  DesignCategory,
  DesignStatus,
  FabricType,
  FitType,
  GarmentMeasurements,
  PatternLibraryItem,
  ProductionStage,
} from '../types';

type SupportedGarmentType =
  | 'bodice'
  | 'shirt'
  | 'trouser'
  | 'skirt'
  | 'kaftan'
  | 'dress'
  | 'gown'
  | 'blouse'
  | 'senator'
  | 'agbada'
  | 'custom';

type PreviewMode = 'front' | 'back' | 'pieces';

type StudioMeasurementKey =
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

type StudioMeasurements = Partial<Record<StudioMeasurementKey, number>>;
type LooseRecord = Record<string, unknown>;
type FlexibleMeasurementSource = Partial<GarmentMeasurements> & LooseRecord;

type MeasurementField = {
  key: StudioMeasurementKey;
  label: string;
  min: number;
  max: number;
  unit: string;
  optional?: boolean;
};

type MeasurementProfileOption = {
  id: string;
  label: string;
  profileType?: string;
  isDefault: boolean;
  measurements: StudioMeasurements;
  raw: LooseRecord;
};

type MeasurementProfileLinkage = {
  profileId: string | null;
  profileLabel: string | null;
  profileType: string | null;
  capturedAt: string | null;
};

type RenderPoint = {
  x: number;
  y: number;
};

type RenderGuide = {
  start: RenderPoint;
  end: RenderPoint;
  label?: string;
};

type RenderShape = {
  outline: RenderPoint[];
  guides?: RenderGuide[];
  accents?: RenderGuide[];
};

type StudioDraftRecord = {
  garmentType: SupportedGarmentType;
  measurements: StudioMeasurements;
  selectedInventoryFabricId: string | null;
  selectedMeasurementProfileId: string | null;
  selectedPatternLibraryId: string | null;
  selectedInspirationId: string | null;
  activeTab: 'pattern' | 'fabric' | 'inspiration';
  previewMode: PreviewMode;
  restoredAt?: string | null;
  savedAt: string;
};

type StudioAlert = {
  id: string;
  label: string;
  actionLabel: string;
  actionTab: 'pattern' | 'fabric' | 'inspiration';
};

const CORE_MEASUREMENT_KEYS: StudioMeasurementKey[] = [
  'bust',
  'waist',
  'neck',
  'shoulder',
  'backLength',
  'bustSpan',
  'armholeDepth',
  'aroundWrist',
];

const GARMENT_OPTIONS: Array<{
  value: SupportedGarmentType;
  label: string;
  helper: string;
}> = [
  { value: 'bodice', label: 'Bodice', helper: 'Upper-body foundation block' },
  { value: 'shirt', label: 'Shirt', helper: 'Shirt body + sleeve base' },
  { value: 'trouser', label: 'Trouser', helper: 'Trouser front draft guide' },
  { value: 'skirt', label: 'Skirt', helper: 'Skirt foundation block' },
  { value: 'kaftan', label: 'Kaftan', helper: 'Loose native/flowing body draft' },
  { value: 'dress', label: 'Dress', helper: 'Dress planning + bodice foundation preview' },
  { value: 'gown', label: 'Gown', helper: 'Gown planning + bodice foundation preview' },
  { value: 'blouse', label: 'Blouse', helper: 'Blouse planning + bodice preview' },
  { value: 'senator', label: 'Senator', helper: 'Native top planning + shirt preview' },
  { value: 'agbada', label: 'Agbada', helper: 'Agbada planning + kaftan preview' },
  { value: 'custom', label: 'Custom', helper: 'General style planning' },
];

const MEASUREMENT_FIELD_MAP: Record<SupportedGarmentType, MeasurementField[]> = {
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
    { key: 'aroundWrist', label: 'Around Wrist', min: 16, max: 40, unit: 'cm' },
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
  senator: [
    { key: 'chest', label: 'Chest', min: 75, max: 160, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm' },
    { key: 'aroundWrist', label: 'Around Wrist', min: 16, max: 40, unit: 'cm' },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
  ],
  agbada: [
    { key: 'chest', label: 'Chest', min: 75, max: 160, unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
    { key: 'fullLength', label: 'Full Length', min: 90, max: 190, unit: 'cm' },
  ],
  custom: [
    { key: 'bust', label: 'Bust / Chest', min: 70, max: 160, unit: 'cm' },
    { key: 'waist', label: 'Waist', min: 55, max: 140, unit: 'cm' },
    { key: 'hip', label: 'Hip', min: 75, max: 170, unit: 'cm', optional: true },
    { key: 'neck', label: 'Neck', min: 30, max: 50, unit: 'cm', optional: true },
    { key: 'shoulder', label: 'Shoulder', min: 8, max: 22, unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', min: 15, max: 75, unit: 'cm', optional: true },
    { key: 'backLength', label: 'Back Length', min: 30, max: 65, unit: 'cm' },
    {
      key: 'skirtLength',
      label: 'Skirt Length',
      min: 35,
      max: 160,
      unit: 'cm',
      optional: true,
    },
    {
      key: 'trouserLength',
      label: 'Trouser Length',
      min: 75,
      max: 130,
      unit: 'cm',
      optional: true,
    },
  ],
};

const FABRIC_PATTERNS = [
  { name: 'Sea Blue', color: '#0F6E8C' },
  { name: 'Linen Sand', color: '#D6C3B3' },
  { name: 'Silk Cream', color: '#F2E6DA' },
  { name: 'Denim Blue', color: '#355C9A' },
  { name: 'Velvet Wine', color: '#7A2846' },
  { name: 'Cotton White', color: '#FAF7F2' },
];

const DESIGN_CATEGORIES: DesignCategory[] = [
  'senator',
  'kaftan',
  'agbada',
  'suit',
  'shirt',
  'trousers',
  'gown',
  'dress',
  'skirt',
  'blouse',
  'bridal',
  'wedding',
  'casual',
  'traditional',
  'unisex',
  'other',
];

const FABRIC_TYPES: FabricType[] = [
  'cotton',
  'linen',
  'silk',
  'wool',
  'denim',
  'velvet',
  'lace',
  'adire',
  'ankara',
  'brocade',
  'cashmere',
  'other',
];

const FIT_TYPES: FitType[] = [
  'slim',
  'regular',
  'relaxed',
  'oversized',
  'tailored',
  'custom',
];

const MEASUREMENT_ALIASES: Record<StudioMeasurementKey, string[]> = {
  bust: ['bust', 'chest'],
  chest: ['chest', 'bust'],
  waist: ['waist'],
  hip: ['hip'],
  neck: ['neck'],
  shoulder: ['shoulder'],
  backLength: ['backLength', 'back_length'],
  bustSpan: ['bustSpan', 'bust_span'],
  armholeDepth: ['armholeDepth', 'armhole_depth'],
  sleeve: ['sleeve', 'sleeveLength', 'sleeve_length'],
  aroundWrist: ['aroundWrist', 'wrist', 'wristCircumference', 'wrist_circumference'],
  thigh: ['thigh'],
  knee: ['knee'],
  ankle: ['ankle'],
  trouserLength: ['trouserLength', 'trouser_length', 'length'],
  skirtLength: ['skirtLength', 'skirt_length'],
  fullLength: ['fullLength', 'full_length'],
};

function asRecord(value: unknown): LooseRecord | null {
  return value && typeof value === 'object' ? (value as LooseRecord) : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function capitalize(value: string | undefined | null) {
  if (!value || !value.trim()) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pickNumber(...values: Array<number | undefined>): number | undefined {
  return values.find((value) => typeof value === 'number' && !Number.isNaN(value));
}

function getMeasurementValue(
  source: FlexibleMeasurementSource | LooseRecord | null | undefined,
  key: StudioMeasurementKey
): number | undefined {
  if (!source) return undefined;

  const topLevel = asRecord(source) || {};
  const nested = asRecord(topLevel.measurements) || {};
  const aliases = MEASUREMENT_ALIASES[key];

  for (const alias of aliases) {
    const nestedValue = asNumber(nested[alias]);
    if (nestedValue !== undefined) return nestedValue;
    const topValue = asNumber(topLevel[alias]);
    if (topValue !== undefined) return topValue;
  }

  return undefined;
}

function normalizeMeasurementSource(
  source?: FlexibleMeasurementSource | LooseRecord | null
): StudioMeasurements {
  if (!source) return {};

  return {
    bust: getMeasurementValue(source, 'bust'),
    chest: getMeasurementValue(source, 'chest'),
    waist: getMeasurementValue(source, 'waist'),
    hip: getMeasurementValue(source, 'hip'),
    neck: getMeasurementValue(source, 'neck'),
    shoulder: getMeasurementValue(source, 'shoulder'),
    backLength: getMeasurementValue(source, 'backLength'),
    bustSpan: getMeasurementValue(source, 'bustSpan'),
    armholeDepth: getMeasurementValue(source, 'armholeDepth'),
    sleeve: getMeasurementValue(source, 'sleeve'),
    aroundWrist: getMeasurementValue(source, 'aroundWrist'),
    thigh: getMeasurementValue(source, 'thigh'),
    knee: getMeasurementValue(source, 'knee'),
    ankle: getMeasurementValue(source, 'ankle'),
    trouserLength: getMeasurementValue(source, 'trouserLength'),
    skirtLength: getMeasurementValue(source, 'skirtLength'),
    fullLength: getMeasurementValue(source, 'fullLength'),
  };
}

function isBodicePattern(value: unknown): value is {
  controlPoints: Record<string, { x: number; y: number }>;
  points: Array<{ x: number; y: number }>;
  measurements: Record<string, number>;
} {
  return !!value && typeof value === 'object' && 'controlPoints' in value;
}

function normalizeGarmentLabel(garmentType: SupportedGarmentType) {
  return (
    GARMENT_OPTIONS.find((item) => item.value === garmentType)?.label ||
    capitalize(garmentType)
  );
}

function normalizeProfileTypeToGarment(
  profileType?: string | null
): SupportedGarmentType | null {
  const value = profileType?.trim().toLowerCase();
  if (!value) return null;

  if ((value ?? "").includes('shirt')) return 'shirt';
  if ((value ?? "").includes('senator')) return 'senator';
  if ((value ?? "").includes('trouser') || (value ?? "").includes('pants')) return 'trouser';
  if ((value ?? "").includes('skirt')) return 'skirt';
  if ((value ?? "").includes('kaftan')) return 'kaftan';
  if ((value ?? "").includes('agbada')) return 'agbada';
  if ((value ?? "").includes('gown')) return 'gown';
  if ((value ?? "").includes('dress')) return 'dress';
  if ((value ?? "").includes('blouse')) return 'blouse';
  if ((value ?? "").includes('bodice')) return 'bodice';
  if ((value ?? "").includes('custom')) return 'custom';

  return null;
}

function getSeverityClasses(severity?: string) {
  if (severity === 'high') {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (severity === 'medium') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function hasUsableMeasurementSnapshot(snapshot?: unknown): boolean {
  if (!snapshot) return false;
  const normalized = normalizeMeasurementSource(snapshot as FlexibleMeasurementSource);
  return Object.values(normalized).some((value) => value !== undefined && value !== null);
}

function mergeStudioMeasurementsFromSource(
  current: StudioMeasurements,
  source?: FlexibleMeasurementSource | LooseRecord | null
): StudioMeasurements {
  if (!source) return current;

  const normalized = normalizeMeasurementSource(source);

  return {
    ...current,
    bust: pickNumber(normalized.bust, normalized.chest, current.bust),
    chest: pickNumber(normalized.chest, normalized.bust, current.chest),
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

function buildGarmentMeasurements(measurements: StudioMeasurements): FlexibleMeasurementSource {
  const merged: StudioMeasurements = {
    ...measurements,
    chest: measurements.chest ?? measurements.bust,
    bust: measurements.bust ?? measurements.chest,
    aroundWrist: measurements.aroundWrist,
  };

  return {
    bust: merged.bust,
    chest: merged.chest,
    waist: merged.waist,
    hip: merged.hip,
    neck: merged.neck,
    shoulder: merged.shoulder,
    backLength: merged.backLength,
    bustSpan: merged.bustSpan,
    armholeDepth: merged.armholeDepth,
    sleeve: merged.sleeve,
    aroundWrist: merged.aroundWrist,
    thigh: merged.thigh,
    knee: merged.knee,
    ankle: merged.ankle,
    trouserLength: merged.trouserLength,
    skirtLength: merged.skirtLength,
    fullLength: merged.fullLength,
    measurements: {
      ...merged,
      wrist: merged.aroundWrist,
    },
  };
}

function buildBodyUpdatesFromGarmentSource(
  source?: FlexibleMeasurementSource | LooseRecord | null
): Partial<BodyMeasurements> & Record<string, number | undefined> {
  if (!source) return {};

  const normalized = normalizeMeasurementSource(source);

  return {
    bust: pickNumber(normalized.bust, normalized.chest),
    waist: normalized.waist,
    neck: normalized.neck,
    shoulder: normalized.shoulder,
    backLength: normalized.backLength,
    bustSpan: normalized.bustSpan,
    armholeDepth: normalized.armholeDepth,
    aroundWrist: normalized.aroundWrist,
  };
}

function buildInitialMeasurements(base: BodyMeasurements): StudioMeasurements {
  const baseRecord = asRecord(base) || {};

  return {
    bust: asNumber(baseRecord.bust),
    chest: pickNumber(asNumber(baseRecord.chest), asNumber(baseRecord.bust)),
    waist: asNumber(baseRecord.waist),
    neck: asNumber(baseRecord.neck),
    shoulder: asNumber(baseRecord.shoulder),
    backLength: asNumber(baseRecord.backLength),
    bustSpan: asNumber(baseRecord.bustSpan),
    armholeDepth: asNumber(baseRecord.armholeDepth),
    hip: asNumber(baseRecord.hip) ?? 100,
    sleeve: asNumber(baseRecord.sleeve) ?? 24,
    aroundWrist:
      pickNumber(asNumber(baseRecord.aroundWrist), asNumber(baseRecord.wrist)) ?? 20,
    thigh: asNumber(baseRecord.thigh) ?? 58,
    knee: asNumber(baseRecord.knee) ?? 42,
    ankle: asNumber(baseRecord.ankle) ?? 28,
    trouserLength: asNumber(baseRecord.trouserLength) ?? 108,
    skirtLength: asNumber(baseRecord.skirtLength) ?? 75,
    fullLength: asNumber(baseRecord.fullLength) ?? 135,
  };
}

function extractProfileLinkageFromOrder(order?: unknown): MeasurementProfileLinkage {
  const orderRecord = asRecord(order) || {};
  const snapshot = asRecord(orderRecord.measurementSnapshot) || {};
  const metadata = asRecord(snapshot.metadata) || {};
  const profileMetadata = asRecord(snapshot.profileMetadata) || {};

  return {
    profileId:
      asString(orderRecord.selectedMeasurementProfileId) ||
      asString(orderRecord.measurementProfileId) ||
      asString(profileMetadata.profileId) ||
      asString(metadata.profileId) ||
      asString(snapshot.profileId),
    profileLabel:
      asString(orderRecord.selectedMeasurementProfileLabel) ||
      asString(profileMetadata.profileLabel) ||
      asString(metadata.profileLabel) ||
      asString(snapshot.profileLabel),
    profileType:
      asString(orderRecord.selectedMeasurementProfileType) ||
      asString(profileMetadata.profileType) ||
      asString(metadata.profileType) ||
      asString(snapshot.profileType),
    capturedAt:
      asString(profileMetadata.capturedAt) ||
      asString(metadata.capturedAt) ||
      asString(snapshot.capturedAt),
  };
}

function buildMeasurementSnapshot(params: {
  existingSnapshot?: unknown;
  garmentMeasurements: FlexibleMeasurementSource;
  selectedProfile?: MeasurementProfileOption | null;
  capturedAt?: string;
}) {
  const existing = asRecord(params.existingSnapshot) || {};
  const existingMeasurements = normalizeMeasurementSource(existing);
  const nextMeasurements = {
    ...existingMeasurements,
    ...normalizeMeasurementSource(params.garmentMeasurements),
  };
  const existingMetadata = asRecord(existing.metadata) || {};
  const existingProfileMetadata = asRecord(existing.profileMetadata) || {};

  const profileId =
    params.selectedProfile?.id ||
    asString(existingProfileMetadata.profileId) ||
    asString(existingMetadata.profileId) ||
    asString(existing.profileId);
  const profileLabel =
    params.selectedProfile?.label ||
    asString(existingProfileMetadata.profileLabel) ||
    asString(existingMetadata.profileLabel) ||
    asString(existing.profileLabel);
  const profileType =
    params.selectedProfile?.profileType ||
    asString(existingProfileMetadata.profileType) ||
    asString(existingMetadata.profileType) ||
    asString(existing.profileType);
  const capturedAt =
    params.capturedAt ||
    asString(existingProfileMetadata.capturedAt) ||
    asString(existingMetadata.capturedAt) ||
    asString(existing.capturedAt);

  return {
    ...existing,
    ...nextMeasurements,
    measurements: {
      ...(asRecord(existing.measurements) || {}),
      ...nextMeasurements,
      wrist: nextMeasurements.aroundWrist,
    },
    wrist: nextMeasurements.aroundWrist,
    profileId,
    profileLabel,
    profileType,
    capturedAt,
    metadata: {
      ...existingMetadata,
      profileId,
      profileLabel,
      profileType,
      capturedAt,
    },
    profileMetadata: {
      ...existingProfileMetadata,
      profileId,
      profileLabel,
      profileType,
      capturedAt,
    },
  };
}

function normalizeMeasurementProfile(profile: unknown): MeasurementProfileOption | null {
  const record = asRecord(profile);
  if (!record) return null;

  const id =
    asString(record.id) ||
    asString(record.profileId) ||
    asString(record._id) ||
    asString(record.uuid);
  if (!id) return null;

  const measurements = normalizeMeasurementSource(record);
  const label =
    asString(record.label) ||
    asString(record.name) ||
    asString(record.title) ||
    `Profile ${id.slice(0, 6)}`;

  return {
    id,
    label,
    profileType:
      asString(record.profileType) ||
      asString(record.garmentType) ||
      asString(record.type),
    isDefault: Boolean(record.isDefault),
    measurements,
    raw: record,
  };
}

function getCustomerMeasurementProfiles(customer?: unknown): MeasurementProfileOption[] {
  const customerRecord = asRecord(customer);
  if (!customerRecord) return [];

  const candidateLists = [
    customerRecord.measurementProfiles,
    customerRecord.profiles,
    customerRecord.measurementsProfiles,
  ];

  const list = candidateLists.find((value) => Array.isArray(value));
  if (!Array.isArray(list)) return [];

  return list
    .map((profile) => normalizeMeasurementProfile(profile))
    .filter((profile): profile is MeasurementProfileOption => Boolean(profile));
}

function getPatternKindForGarment(garmentType: SupportedGarmentType): StylePatternKind {
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
    case 'dress':
    case 'gown':
    case 'blouse':
    case 'custom':
    case 'bodice':
    default:
      return 'bodice';
  }
}

function getLibraryPatternTypeForGarment(
  garmentType: SupportedGarmentType
): PatternLibraryItem['patternType'] {
  switch (garmentType) {
    case 'bodice':
      return 'bodice';
    case 'shirt':
      return 'shirt';
    case 'trouser':
      return 'trouser';
    case 'skirt':
      return 'skirt';
    case 'kaftan':
      return 'kaftan';
    case 'senator':
      return 'senator';
    case 'agbada':
      return 'agbada';
    case 'gown':
      return 'gown';
    case 'blouse':
      return 'blouse';
    case 'dress':
      return 'bodice';
    case 'custom':
    default:
      return 'custom';
  }
}

function getGarmentTypeFromLibraryPatternType(
  patternType: PatternLibraryItem['patternType']
): SupportedGarmentType {
  switch (patternType) {
    case 'bodice':
      return 'bodice';
    case 'shirt':
      return 'shirt';
    case 'trouser':
      return 'trouser';
    case 'kaftan':
      return 'kaftan';
    case 'senator':
      return 'senator';
    case 'agbada':
      return 'agbada';
    case 'gown':
      return 'gown';
    case 'blouse':
      return 'blouse';
    case 'skirt':
      return 'skirt';
    case 'custom':
    case 'sleeve':
    case 'collar':
    case 'suit':
    default:
      return 'custom';
  }
}

function getOrderStageStatus(order?: unknown): {
  hasProductionPlan: boolean;
  hasOverdueStage: boolean;
} {
  const orderRecord = asRecord(order) || {};
  const productionStages = (orderRecord.productionStages as ProductionStage[] | undefined) || [];
  const hasProductionPlan = Boolean(orderRecord.productionPlan);

  const hasOverdueStage = productionStages.some((stage) => {
    const expectedDate = asString((stage as LooseRecord).expectedCompletionDate);
    if (!expectedDate) return false;
    if (stage.status === 'completed') return false;

    const parsed = new Date(expectedDate);
    if (Number.isNaN(parsed.getTime())) return false;

    return parsed.getTime() < Date.now();
  });

  return {
    hasProductionPlan,
    hasOverdueStage,
  };
}

function getOrderMissingAlerts(params: {
  order?: unknown;
  measurements: StudioMeasurements;
  selectedInspirationId?: string | null;
  selectedInventoryFabricId?: string | null;
}): StudioAlert[] {
  const alerts: StudioAlert[] = [];
  const orderRecord = asRecord(params.order) || {};
  const hasMeasurements = Object.values(params.measurements).some(
    (value) => typeof value === 'number' && !Number.isNaN(value)
  );
  const hasInspiration = Boolean(
    params.selectedInspirationId || asString(orderRecord.designInspirationId)
  );
  const hasFabric = Boolean(
    params.selectedInventoryFabricId || asString(orderRecord.selectedFabricId)
  );
  const { hasProductionPlan } = getOrderStageStatus(params.order);

  if (!hasInspiration) {
    alerts.push({
      id: 'missing-inspiration',
      label: 'No inspiration linked to this order yet.',
      actionLabel: 'Add inspiration',
      actionTab: 'inspiration',
    });
  }

  if (!hasFabric) {
    alerts.push({
      id: 'missing-fabric',
      label: 'No fabric has been selected for this order.',
      actionLabel: 'Choose fabric',
      actionTab: 'fabric',
    });
  }

  if (!hasMeasurements) {
    alerts.push({
      id: 'missing-measurements',
      label: 'Measurements are incomplete for this order.',
      actionLabel: 'Update measurements',
      actionTab: 'pattern',
    });
  }

  if (!hasProductionPlan) {
    alerts.push({
      id: 'missing-production-plan',
      label: 'Production plan has not been saved on this order.',
      actionLabel: 'Review pattern',
      actionTab: 'pattern',
    });
  }

  return alerts;
}

function traceClosedPath(ctx: CanvasRenderingContext2D, points: RenderPoint[]) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }

  const last = points[points.length - 1];
  const first = points[0];
  const closeMidX = (last.x + first.x) / 2;
  const closeMidY = (last.y + first.y) / 2;
  ctx.quadraticCurveTo(last.x, last.y, closeMidX, closeMidY);
  ctx.closePath();
}

function renderGuides(
  ctx: CanvasRenderingContext2D,
  guides: RenderGuide[] = [],
  color = '#7AA8B5'
) {
  if (!guides.length) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = '#5B707A';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.font = '10px Inter, sans-serif';

  guides.forEach((guide) => {
    ctx.beginPath();
    ctx.moveTo(guide.start.x, guide.start.y);
    ctx.lineTo(guide.end.x, guide.end.y);
    ctx.stroke();

    if (guide.label) {
      ctx.setLineDash([]);
      ctx.fillText(guide.label, guide.end.x + 6, guide.end.y - 4);
      ctx.setLineDash([6, 4]);
    }
  });

  ctx.restore();
}

function renderAccents(
  ctx: CanvasRenderingContext2D,
  guides: RenderGuide[] = [],
  color = '#1C8AA8'
) {
  if (!guides.length) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([]);
  guides.forEach((guide) => {
    ctx.beginPath();
    ctx.moveTo(guide.start.x, guide.start.y);
    ctx.lineTo(guide.end.x, guide.end.y);
    ctx.stroke();
  });
  ctx.restore();
}

function renderFabricFill(params: {
  ctx: CanvasRenderingContext2D;
  textureImage?: HTMLImageElement;
  fillColor: string;
  bounds: { left: number; top: number; width: number; height: number };
}) {
  const { ctx, textureImage, fillColor, bounds } = params;

  if (textureImage) {
    ctx.save();
    ctx.clip();

    const repeatScale = Math.max(bounds.width, bounds.height) / 3.2;
    const tileWidth = Math.max(90, repeatScale);
    const tileHeight = Math.max(90, repeatScale);

    for (
      let x = bounds.left - tileWidth;
      x < bounds.left + bounds.width + tileWidth;
      x += tileWidth * 0.92
    ) {
      for (
        let y = bounds.top - tileHeight;
        y < bounds.top + bounds.height + tileHeight;
        y += tileHeight * 0.92
      ) {
        ctx.drawImage(textureImage, x, y, tileWidth, tileHeight);
      }
    }

    const gradient = ctx.createLinearGradient(
      bounds.left,
      bounds.top,
      bounds.left,
      bounds.top + bounds.height
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.02)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = gradient;
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    ctx.restore();
    return;
  }

  ctx.fillStyle = fillColor;
  ctx.fill();

  const gradient = ctx.createLinearGradient(
    bounds.left,
    bounds.top,
    bounds.left,
    bounds.top + bounds.height
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.09)');
  ctx.fillStyle = gradient;
  ctx.fill();
}
function mapShapeToCanvas(
  shape: RenderShape,
  width: number,
  height: number,
  padding = 44
): RenderShape {
  const allPoints = [
    ...shape.outline,
    ...(shape.guides?.flatMap((guide) => [guide.start, guide.end]) || []),
    ...(shape.accents?.flatMap((guide) => [guide.start, guide.end]) || []),
  ];

  const minX = Math.min(...(allPoints ?? []).map((point) => point.x));
  const maxX = Math.max(...(allPoints ?? []).map((point) => point.x));
  const minY = Math.min(...(allPoints ?? []).map((point) => point.y));
  const maxY = Math.max(...(allPoints ?? []).map((point) => point.y));

  const shapeWidth = Math.max(maxX - minX, 1);
  const shapeHeight = Math.max(maxY - minY, 1);

  const scale = Math.min(
    (width - padding * 2) / shapeWidth,
    (height - padding * 2) / shapeHeight
  );

  const offsetX = (width - shapeWidth * scale) / 2 - minX * scale;
  const offsetY = (height - shapeHeight * scale) / 2 - minY * scale;

  const mapPoint = (point: RenderPoint): RenderPoint => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  });

  return {
    outline: (shape.outline ?? []).map(mapPoint),
    guides: shape.guides?.map((guide) => ({
      ...guide,
      start: mapPoint(guide.start),
      end: mapPoint(guide.end),
    })),
    accents: shape.accents?.map((guide) => ({
      ...guide,
      start: mapPoint(guide.start),
      end: mapPoint(guide.end),
    })),
  };
}

function buildUpperGarmentShape(options: {
  garmentType: SupportedGarmentType;
  previewMode: PreviewMode;
  chest: number;
  waist: number;
  hip: number;
  shoulder: number;
  neck: number;
  sleeve: number;
  aroundWrist: number;
  backLength: number;
  fullLength: number;
  skirtLength: number;
}) {
  const {
    garmentType,
    previewMode,
    chest,
    waist,
    hip,
    shoulder,
    neck,
    sleeve,
    aroundWrist,
    backLength,
    fullLength,
    skirtLength,
  } = options;

  const cx = 50;
  const topY = 8;
  const neckHalf = clamp(neck / 5.2, 5.5, 9.5);
  const neckDepthFront =
    garmentType === 'gown'
      ? 13
      : garmentType === 'dress'
      ? 10
      : garmentType === 'blouse'
      ? 9
      : 6.5;
  const neckDepthBack = clamp(neckDepthFront * 0.42, 3, 6);
  const neckDepth = previewMode === 'back' ? neckDepthBack : neckDepthFront;

  const shoulderHalf = clamp(shoulder * 1.6, 15, 28);
  const bustHalf = clamp(chest / 5.8, 18, 31);
  const waistHalf = clamp(waist / 6.4, 15, 28);
  const hipHalf = clamp(hip / 5.6, 18, 34);
  const sleeveProj = clamp(sleeve * 0.52, 10, 24);
  const sleeveDrop = garmentType === 'kaftan' || garmentType === 'agbada' ? 14 : 11;
  const wristInset =
    garmentType === 'shirt' || garmentType === 'senator'
      ? clamp((aroundWrist - 18) * 0.18, 0.3, 4.4)
      : 1.2;

  const armholeY = 26;
  const waistY = clamp(backLength * 1.15, 42, 52);
  const hipY = waistY + 16;

  let hemY = clamp(fullLength * 0.82, 74, 130);
  if (garmentType === 'bodice' || garmentType === 'blouse' || garmentType === 'shirt') {
    hemY = clamp(backLength * 1.8, 54, 74);
  }
  if (garmentType === 'senator') {
    hemY = clamp(backLength * 2.1, 78, 102);
  }
  if (garmentType === 'kaftan') {
    hemY = clamp(fullLength * 0.85, 95, 124);
  }
  if (garmentType === 'agbada') {
    hemY = clamp(fullLength * 0.88, 102, 132);
  }
  if (garmentType === 'dress' || garmentType === 'gown') {
    hemY = clamp(
      (backLength + skirtLength) * 0.78,
      garmentType === 'gown' ? 108 : 94,
      garmentType === 'gown' ? 138 : 126
    );
  }

  let hemHalf = bustHalf;
  if (garmentType === 'shirt' || garmentType === 'blouse') hemHalf = bustHalf + 2;
  if (garmentType === 'senator') hemHalf = bustHalf + 5;
  if (garmentType === 'kaftan') hemHalf = bustHalf + 16;
  if (garmentType === 'agbada') hemHalf = bustHalf + 28;
  if (garmentType === 'dress') hemHalf = hipHalf + 10;
  if (garmentType === 'gown') hemHalf = hipHalf + 22;
  if (garmentType === 'bodice') hemHalf = waistHalf + 3;

  const shoulderY = topY + 5;
  const cuffY = topY + sleeveDrop;
  const sideUnderarmY = armholeY;

  const outline: RenderPoint[] = [
    { x: cx - neckHalf * 0.75, y: topY + neckDepth },
    { x: cx - shoulderHalf * 0.45, y: topY + 1 },
    { x: cx - shoulderHalf, y: shoulderY },
    { x: cx - shoulderHalf - sleeveProj + wristInset, y: cuffY },
    { x: cx - bustHalf - 2.5, y: sideUnderarmY },
    { x: cx - waistHalf, y: waistY },
    { x: cx - hipHalf, y: hipY },
    { x: cx - hemHalf, y: hemY },
    garmentType === 'gown' && previewMode === 'back'
      ? { x: cx, y: hemY + 7 }
      : { x: cx + hemHalf, y: hemY },
    { x: cx + hipHalf, y: hipY },
    { x: cx + waistHalf, y: waistY },
    { x: cx + bustHalf + 2.5, y: sideUnderarmY },
    { x: cx + shoulderHalf + sleeveProj - wristInset, y: cuffY },
    { x: cx + shoulderHalf, y: shoulderY },
    { x: cx + shoulderHalf * 0.45, y: topY + 1 },
    { x: cx + neckHalf * 0.75, y: topY + neckDepth },
  ];

  const guides: RenderGuide[] = [
    {
      start: { x: cx, y: topY + neckDepth },
      end: { x: cx, y: hemY - 4 },
      label: previewMode === 'back' ? 'CB' : 'CF',
    },
    {
      start: { x: cx - bustHalf - 2, y: waistY },
      end: { x: cx + bustHalf + 2, y: waistY },
      label: 'Waist',
    },
  ];

  const accents: RenderGuide[] = [];

  if (
    garmentType === 'dress' ||
    garmentType === 'gown' ||
    garmentType === 'bodice' ||
    garmentType === 'blouse'
  ) {
    accents.push(
      {
        start: { x: cx - bustHalf * 0.28, y: waistY - 2 },
        end: { x: cx - bustHalf * 0.18, y: armholeY + 10 },
      },
      {
        start: { x: cx + bustHalf * 0.28, y: waistY - 2 },
        end: { x: cx + bustHalf * 0.18, y: armholeY + 10 },
      }
    );
  }

  if (garmentType === 'shirt' || garmentType === 'senator') {
    accents.push({
      start: { x: cx, y: topY + neckDepth },
      end: { x: cx, y: hemY - 3 },
    });
    guides.push({
      start: { x: cx + shoulderHalf + sleeveProj - wristInset - 8, y: cuffY + 1 },
      end: { x: cx + shoulderHalf + sleeveProj - wristInset, y: cuffY + 1 },
      label: `Wrist ${(aroundWrist ?? 0).toFixed(0)}cm`,
    });
  }

  if (garmentType === 'kaftan') {
    accents.push(
      {
        start: { x: cx - hemHalf * 0.65, y: hemY - 18 },
        end: { x: cx - hemHalf * 0.65, y: hemY - 3 },
      },
      {
        start: { x: cx + hemHalf * 0.65, y: hemY - 18 },
        end: { x: cx + hemHalf * 0.65, y: hemY - 3 },
      }
    );
  }

  if (garmentType === 'agbada') {
    guides.push(
      {
        start: { x: cx - hemHalf * 0.45, y: 28 },
        end: { x: cx - hemHalf * 0.2, y: hemY - 14 },
        label: 'Flow',
      },
      {
        start: { x: cx + hemHalf * 0.45, y: 28 },
        end: { x: cx + hemHalf * 0.2, y: hemY - 14 },
      }
    );
  }

  return { outline, guides, accents };
}

function buildSkirtShape(
  previewMode: PreviewMode,
  waist: number,
  hip: number,
  skirtLength: number,
  garmentType: SupportedGarmentType
): RenderShape {
  const cx = 50;
  const topY = 14;
  const waistHalf = clamp(waist / 7.2, 10, 18);
  const hipHalf = clamp(hip / 5.8, 16, 30);
  const hemY = clamp(skirtLength * 1.12, 82, 128);
  const hemHalf = garmentType === 'dress' ? hipHalf + 12 : clamp(hipHalf + 8, 24, 40);

  const outline: RenderPoint[] = [
    { x: cx - waistHalf, y: topY },
    { x: cx - hipHalf, y: topY + 22 },
    { x: cx - hemHalf, y: hemY },
    { x: cx + hemHalf, y: hemY },
    { x: cx + hipHalf, y: topY + 22 },
    { x: cx + waistHalf, y: topY },
  ];

  const guides: RenderGuide[] = [
    {
      start: { x: cx, y: topY },
      end: { x: cx, y: hemY - 4 },
      label: previewMode === 'back' ? 'CB' : 'CF',
    },
    {
      start: { x: cx - hipHalf, y: topY + 22 },
      end: { x: cx + hipHalf, y: topY + 22 },
      label: 'Hip',
    },
  ];

  const accents: RenderGuide[] =
    previewMode === 'back'
      ? [
          {
            start: { x: cx, y: hemY - 18 },
            end: { x: cx, y: hemY - 3 },
          },
        ]
      : [
          {
            start: { x: cx - waistHalf * 0.5, y: topY + 4 },
            end: { x: cx - waistHalf * 0.25, y: topY + 22 },
          },
          {
            start: { x: cx + waistHalf * 0.5, y: topY + 4 },
            end: { x: cx + waistHalf * 0.25, y: topY + 22 },
          },
        ];

  return { outline, guides, accents };
}

function buildTrouserShape(
  waist: number,
  hip: number,
  thigh: number,
  knee: number,
  ankle: number,
  trouserLength: number
): RenderShape {
  const cx = 50;
  const topY = 10;
  const waistHalf = clamp(waist / 7.4, 12, 18);
  const hipHalf = clamp(hip / 6, 18, 28);
  const thighHalf = clamp(thigh / 5.5, 10, 18);
  const kneeHalf = clamp(knee / 5.7, 7, 14);
  const ankleHalf = clamp(ankle / 5.5, 5, 11);
  const hemY = clamp(trouserLength * 1.06, 98, 136);
  const crotchY = 30;
  const kneeY = hemY - 34;
  const inseamGap = 4.5;

  const outline: RenderPoint[] = [
    { x: cx - waistHalf, y: topY },
    { x: cx - hipHalf, y: crotchY - 4 },
    { x: cx - thighHalf - 3, y: crotchY + 8 },
    { x: cx - kneeHalf - 2, y: kneeY },
    { x: cx - ankleHalf - 1.5, y: hemY },
    { x: cx - inseamGap, y: hemY },
    { x: cx - 1.5, y: crotchY + 10 },
    { x: cx + 1.5, y: crotchY + 10 },
    { x: cx + inseamGap, y: hemY },
    { x: cx + ankleHalf + 1.5, y: hemY },
    { x: cx + kneeHalf + 2, y: kneeY },
    { x: cx + thighHalf + 3, y: crotchY + 8 },
    { x: cx + hipHalf, y: crotchY - 4 },
    { x: cx + waistHalf, y: topY },
  ];

  const guides: RenderGuide[] = [
    {
      start: { x: cx, y: topY },
      end: { x: cx, y: hemY - 4 },
      label: 'Crease',
    },
    {
      start: { x: cx - hipHalf, y: crotchY - 4 },
      end: { x: cx + hipHalf, y: crotchY - 4 },
      label: 'Hip',
    },
    {
      start: { x: cx - kneeHalf - 2, y: kneeY },
      end: { x: cx + kneeHalf + 2, y: kneeY },
      label: 'Knee',
    },
  ];

  const accents: RenderGuide[] = [
    {
      start: { x: cx - waistHalf * 0.5, y: topY + 1 },
      end: { x: cx - waistHalf * 0.2, y: crotchY - 2 },
    },
    {
      start: { x: cx + waistHalf * 0.5, y: topY + 1 },
      end: { x: cx + waistHalf * 0.2, y: crotchY - 2 },
    },
  ];

  return { outline, guides, accents };
}

function buildGarmentRenderShape(
  garmentType: SupportedGarmentType,
  previewMode: Exclude<PreviewMode, 'pieces'>,
  measurements: StudioMeasurements
): RenderShape {
  const bust = pickNumber(measurements.bust, measurements.chest, 96) || 96;
  const chest = pickNumber(measurements.chest, measurements.bust, bust) || bust;
  const waist = pickNumber(measurements.waist, 76) || 76;
  const hip = pickNumber(measurements.hip, 102) || 102;
  const neck = pickNumber(measurements.neck, 36) || 36;
  const shoulder = pickNumber(measurements.shoulder, 13) || 13;
  const sleeve = pickNumber(measurements.sleeve, 24) || 24;
  const aroundWrist = pickNumber(measurements.aroundWrist, 20) || 20;
  const backLength = pickNumber(measurements.backLength, 40) || 40;
  const skirtLength = pickNumber(measurements.skirtLength, 75) || 75;
  const fullLength =
    pickNumber(measurements.fullLength, backLength + skirtLength, 135) || 135;
  const thigh = pickNumber(measurements.thigh, 58) || 58;
  const knee = pickNumber(measurements.knee, 42) || 42;
  const ankle = pickNumber(measurements.ankle, 28) || 28;
  const trouserLength = pickNumber(measurements.trouserLength, 108) || 108;

  if (garmentType === 'trouser') {
    return buildTrouserShape(waist, hip, thigh, knee, ankle, trouserLength);
  }

  if (garmentType === 'skirt') {
    return buildSkirtShape(previewMode, waist, hip, skirtLength, garmentType);
  }

  if (garmentType === 'custom' && measurements.trouserLength && !measurements.bust) {
    return buildTrouserShape(waist, hip, thigh, knee, ankle, trouserLength);
  }

  return buildUpperGarmentShape({
    garmentType,
    previewMode,
    chest,
    waist,
    hip,
    shoulder,
    neck,
    sleeve,
    aroundWrist,
    backLength,
    fullLength,
    skirtLength,
  });
}

export function DesignStudio() {
  const {
    currentMember,
    currentWorkspace,
    designStudioMeasurements,
    setDesignMeasurements,
    setGarmentMeasurements,
    setSelectedGarmentType,
    currentInspirationAnalysis,
    setCurrentInspirationAnalysis,
    featureAccess,
    fabricImage,
    setFabricImage,
    selectedOrderId,
    selectOrder,
    orders,
    updateOrder,
    designInspirations,
    addDesignInspiration,
    deleteDesignInspiration,
    selectDesignInspiration,
    selectedInspirationId,
    linkInspirationToOrder,
    fabricRecords,
    patternLibrary,
    addPatternLibraryItem,
    linkPatternToOrder,
    addCustomerMeasurementProfile,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pattern' | 'fabric' | 'inspiration'>(
    'pattern'
  );
  const [garmentType, setGarmentType] = useState<SupportedGarmentType>('dress');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('front');
  const [scale, setScale] = useState(8);
  const [showGrid, setShowGrid] = useState(true);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [selectedFabric, setSelectedFabric] = useState(FABRIC_PATTERNS[0]);
  const [selectedInventoryFabricId, setSelectedInventoryFabricId] = useState<string | null>(
    null
  );
  const [selectedMeasurementProfileId, setSelectedMeasurementProfileId] = useState<
    string | null
  >(null);
  const [measurements, setMeasurements] = useState<StudioMeasurements>(() =>
    buildInitialMeasurements(designStudioMeasurements)
  );
  const [studioStatusMessage, setStudioStatusMessage] = useState<string | null>(null);
  const [restoredDraftMessage, setRestoredDraftMessage] = useState<string | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);

  const [selectedPatternLibraryId, setSelectedPatternLibraryId] = useState<string | null>(
    null
  );
  const [showSavedPatternPreview, setShowSavedPatternPreview] = useState(false);
  const [patternLibraryMessage, setPatternLibraryMessage] = useState<string | null>(null);
  const [patternLibraryDraft, setPatternLibraryDraft] = useState({
    name: '',
    description: '',
    sizeRange: '',
    notes: '',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inspirationFileInputRef = useRef<HTMLInputElement>(null);

  const [newInspiration, setNewInspiration] = useState({
    title: '',
    description: '',
    category: 'senator' as DesignCategory,
    imageUrl: '',
    fabricType: 'cotton' as FabricType,
    primaryColor: '',
    secondaryColor: '',
    fitType: 'tailored' as FitType,
    collarStyle: '',
    sleeveStyle: '',
    pocketStyle: '',
    embroideryNotes: '',
    occasion: '',
    tags: '',
  });

  const selectedOrder = selectedOrderId
    ? orders.find((order) => order.id === selectedOrderId) ?? null
    : null;

  const selectedInspiration = designInspirations.find(
    (item) => item.id === selectedInspirationId
  );

  const selectedInventoryFabric = selectedInventoryFabricId
    ? fabricRecords.find((item) => item.id === selectedInventoryFabricId) || null
    : null;

  const selectedPatternLibraryItem = selectedPatternLibraryId
    ? patternLibrary.find((item) => item.id === selectedPatternLibraryId) || null
    : null;

  const selectableOrders = useMemo(
    () =>
      orders.filter((order) =>
        hasUsableMeasurementSnapshot(
          (order.garmentMeasurements as unknown) || order.measurementSnapshot
        )
      ),
    [orders]
  );

  const customerMeasurementProfiles = useMemo(
    () => getCustomerMeasurementProfiles(selectedOrder?.customer),
    [selectedOrder]
  );

  const selectedMeasurementProfile = useMemo(
    () =>
      customerMeasurementProfiles.find((profile) => profile.id === selectedMeasurementProfileId) ||
      null,
    [customerMeasurementProfiles, selectedMeasurementProfileId]
  );

  const profileLinkage = useMemo(
    () => extractProfileLinkageFromOrder(selectedOrder),
    [selectedOrder]
  );

  const orderStageStatus = useMemo(
    () => getOrderStageStatus(selectedOrder),
    [selectedOrder]
  );

  const orderAlerts = useMemo(
    () =>
      getOrderMissingAlerts({
        order: selectedOrder,
        measurements,
        selectedInspirationId,
        selectedInventoryFabricId,
      }),
    [measurements, selectedInspirationId, selectedInventoryFabricId, selectedOrder]
  );

  const hasAnyOrderMeasurements = selectableOrders.length > 0;
  const hasAnyInspiration = designInspirations.length > 0;
  const selectedMeasurementFields = MEASUREMENT_FIELD_MAP[garmentType];
  const patternKind = getPatternKindForGarment(garmentType);
  const canUseMeasurementProfiles =
    featureAccess.measurementProfiles?.allowed ?? true;
  const canSavePatternToLibrary = featureAccess.savePattern?.allowed ?? true;
  const canSeeProductionAssistant =
    featureAccess.productionAssistant?.allowed ?? true;
  const canSeeFitWarnings = featureAccess.fitWarnings?.allowed ?? true;

  const patternResult = useMemo(() => {
    try {
      const result = generateStylePattern(patternKind, measurements);
      return {
        pattern: result,
        error: null as string | null,
      };
    } catch (err) {
      if (err instanceof PatternValidationError) {
        return {
          pattern: null,
          error: `${err.field}: ${err.message}`,
        };
      }

      return {
        pattern: null,
        error: 'Failed to generate pattern',
      };
    }
  }, [patternKind, measurements]);

  useEffect(() => {
    setPatternError(patternResult.error);
  }, [patternResult.error]);

  const inspirationAnalysis = useMemo(() => {
    return analyzeDesignInspiration(selectedInspiration || undefined, garmentType);
  }, [selectedInspiration, garmentType]);

  const productionPlan = useMemo(() => {
    return generateProductionPlan({
      garmentType,
      measurements,
      inspiration: selectedInspiration || undefined,
      analysis: inspirationAnalysis,
      selectedFabric: selectedInventoryFabric || undefined,
    });
  }, [
    garmentType,
    measurements,
    selectedInspiration,
    inspirationAnalysis,
    selectedInventoryFabric,
  ]);

  const pushMeasurementsToStudio = useCallback(
    (
      source: FlexibleMeasurementSource | LooseRecord | null | undefined,
      mode: 'replace' | 'overlay' = 'overlay'
    ) => {
      const base =
        mode === 'replace'
          ? buildInitialMeasurements(designStudioMeasurements)
          : measurements;

      const nextMeasurements = mergeStudioMeasurementsFromSource(base, source);
      const nextGarmentMeasurements = buildGarmentMeasurements(nextMeasurements);

      setMeasurements(nextMeasurements);
      setGarmentMeasurements(nextGarmentMeasurements as Partial<GarmentMeasurements>);

      const baseUpdates = buildBodyUpdatesFromGarmentSource(nextGarmentMeasurements);
      if (Object.keys(baseUpdates).length > 0) {
        setDesignMeasurements(baseUpdates as Partial<BodyMeasurements>);
      }

      return {
        nextMeasurements,
        nextGarmentMeasurements,
      };
    },
    [designStudioMeasurements, measurements, setDesignMeasurements, setGarmentMeasurements]
  );

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedMeasurementProfileId(null);
      return;
    }

    const savedSource =
      (selectedOrder.garmentMeasurements as FlexibleMeasurementSource | null) ||
      (selectedOrder.measurementSnapshot as LooseRecord | null) ||
      null;

    const linkedProfile = extractProfileLinkageFromOrder(selectedOrder);
    const savedGarmentType =
      (selectedOrder.garmentType as SupportedGarmentType | undefined) ||
      normalizeProfileTypeToGarment(linkedProfile.profileType || undefined);

    if (savedGarmentType) {
      setGarmentType(savedGarmentType);
      setSelectedGarmentType(savedGarmentType);
    }

    if (savedSource) {
      pushMeasurementsToStudio(savedSource, 'replace');
    }

    setSelectedInventoryFabricId(selectedOrder.selectedFabricId || null);

    if (selectedOrder.designInspirationId) {
      if (selectedOrder.designInspirationId !== selectedInspirationId) {
        selectDesignInspiration(selectedOrder.designInspirationId);
      }
    } else if (selectedInspirationId) {
      selectDesignInspiration(null);
    }

    if (selectedOrder.inspirationAnalysis) {
      setCurrentInspirationAnalysis(selectedOrder.inspirationAnalysis);
    }

    if (selectedOrder.selectedPatternId) {
      const linkedPattern =
        patternLibrary.find((item) => item.id === selectedOrder.selectedPatternId) || null;

      setSelectedPatternLibraryId(selectedOrder.selectedPatternId);
      setShowSavedPatternPreview(!!linkedPattern?.previewImageUrl);

      if (linkedPattern) {
        setPatternLibraryDraft({
          name: linkedPattern.name,
          description: linkedPattern.description || '',
          sizeRange: linkedPattern.sizeRange || '',
          notes: linkedPattern.notes || '',
        });
      }
    } else {
      setSelectedPatternLibraryId(null);
      setShowSavedPatternPreview(false);
    }

    const restoredProfileId =
      linkedProfile.profileId ||
      customerMeasurementProfiles.find((profile) => profile.isDefault)?.id ||
      customerMeasurementProfiles[0]?.id ||
      null;

    setSelectedMeasurementProfileId(restoredProfileId);
  }, [
    selectedOrder,
    customerMeasurementProfiles,
    patternLibrary,
    pushMeasurementsToStudio,
    selectedInspirationId,
    selectDesignInspiration,
    setCurrentInspirationAnalysis,
    setSelectedGarmentType,
  ]);

  useEffect(() => {
    if (!customerMeasurementProfiles.length) {
      setSelectedMeasurementProfileId(null);
      return;
    }

    if (
      selectedMeasurementProfileId &&
      customerMeasurementProfiles.some((profile) => profile.id === selectedMeasurementProfileId)
    ) {
      return;
    }

    const fallbackId =
      profileLinkage.profileId ||
      customerMeasurementProfiles.find((profile) => profile.isDefault)?.id ||
      customerMeasurementProfiles[0]?.id ||
      null;

    setSelectedMeasurementProfileId(fallbackId);
  }, [customerMeasurementProfiles, profileLinkage.profileId, selectedMeasurementProfileId]);

  useEffect(() => {
    const draftKey = getDraftStorageKey(selectedOrderId);
    const drafts = readStudioDrafts<StudioDraftRecord>();
    const draft = drafts[draftKey];

    if (!draft) return;

    setGarmentType(draft.garmentType);
    setSelectedGarmentType(draft.garmentType);
    setMeasurements((prev) => ({
      ...prev,
      ...draft.measurements,
    }));
    setSelectedInventoryFabricId(draft.selectedInventoryFabricId);
    setSelectedMeasurementProfileId(draft.selectedMeasurementProfileId);
    setSelectedPatternLibraryId(draft.selectedPatternLibraryId);
    setShowSavedPatternPreview(Boolean(draft.selectedPatternLibraryId));
    setActiveTab(draft.activeTab);
    setPreviewMode(draft.previewMode);

    if (draft.selectedInspirationId && draft.selectedInspirationId !== selectedInspirationId) {
      selectDesignInspiration(draft.selectedInspirationId);
    }

    setRestoredDraftMessage(
      selectedOrderId
        ? `Restored saved draft for ${selectedOrder?.orderNumber || 'selected order'}.`
        : 'Restored your last unsaved studio draft.'
    );
    setLastDraftSavedAt(draft.savedAt);
  }, [selectedOrderId, selectedOrder?.orderNumber, selectedInspirationId, selectDesignInspiration, setSelectedGarmentType]);

  useEffect(() => {
    const draftKey = getDraftStorageKey(selectedOrderId);
    const timeout = window.setTimeout(() => {
      const drafts = readStudioDrafts();
      drafts[draftKey] = {
        garmentType,
        measurements,
        selectedInventoryFabricId,
        selectedMeasurementProfileId,
        selectedPatternLibraryId,
        selectedInspirationId: selectedInspirationId || null,
        activeTab,
        previewMode,
        savedAt: new Date().toISOString(),
      };
      writeStudioDrafts(drafts);
      setLastDraftSavedAt(drafts[draftKey].savedAt);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    activeTab,
    garmentType,
    measurements,
    previewMode,
    selectedInspirationId,
    selectedInventoryFabricId,
    selectedMeasurementProfileId,
    selectedOrderId,
    selectedPatternLibraryId,
  ]);

  const clearStudioDraft = useCallback(() => {
    const draftKey = getDraftStorageKey(selectedOrderId);
    const drafts = readStudioDrafts<StudioDraftRecord>();
    delete drafts[draftKey];
    writeStudioDrafts(drafts);
    setLastDraftSavedAt(null);
    setRestoredDraftMessage(null);
    setStudioStatusMessage('Draft cleared for this studio workspace.');
  }, [selectedOrderId]);

  const updateMeasurement = useCallback(
    (key: StudioMeasurementKey, value: number) => {
      setMeasurements((prev) => {
        const next = { ...prev, [key]: value };

        if (key === 'bust') {
          next.chest = value;
        }

        if (
          key === 'chest' &&
          (!prev.bust ||
            garmentType === 'shirt' ||
            garmentType === 'senator' ||
            garmentType === 'kaftan' ||
            garmentType === 'agbada')
        ) {
          next.bust = value;
        }

        return next;
      });

      if ((CORE_MEASUREMENT_KEYS ?? "").includes(key)) {
        setDesignMeasurements({
          [key]: value,
        } as Partial<BodyMeasurements>);
      }
    },
    [garmentType, setDesignMeasurements]
  );

  const applyMeasurementProfile = useCallback(
    (targetProfileId?: string) => {
      const profile =
        customerMeasurementProfiles.find(
          (item) => item.id === (targetProfileId || selectedMeasurementProfileId)
        ) || null;

      if (!profile) return;

      const nextGarmentType = normalizeProfileTypeToGarment(profile.profileType);
      if (nextGarmentType) {
        setGarmentType(nextGarmentType);
        setSelectedGarmentType(nextGarmentType);
      }

      const applied = pushMeasurementsToStudio(profile.measurements, 'overlay');
      setSelectedMeasurementProfileId(profile.id);

      if (selectedOrder) {
        updateOrder(selectedOrder.id, {
          garmentType: nextGarmentType || garmentType,
          garmentMeasurements: applied.nextGarmentMeasurements,
          measurementSnapshot: buildMeasurementSnapshot({
            existingSnapshot: selectedOrder.measurementSnapshot,
            garmentMeasurements: applied.nextGarmentMeasurements,
            selectedProfile: profile,
            capturedAt: new Date().toISOString(),
          }),
          selectedMeasurementProfileId: profile.id,
          selectedMeasurementProfileLabel: profile.label,
          selectedMeasurementProfileType: profile.profileType || null,
        });
      }

      setStudioStatusMessage(`Applied measurement profile "${profile.label}".`);
    },
    [
      customerMeasurementProfiles,
      garmentType,
      pushMeasurementsToStudio,
      selectedMeasurementProfileId,
      selectedOrder,
      setSelectedGarmentType,
      updateOrder,
    ]
  );

  const handleSaveAsProfile = useCallback(() => {
    if (!selectedOrder?.customerId || !addCustomerMeasurementProfile) return;

    const profileName = window.prompt('Enter a name for this measurement profile');
    if (!profileName?.trim()) return;

    const profileId = addCustomerMeasurementProfile({
      workspaceId: currentWorkspace.id,
      customerId: selectedOrder.customerId,
      label: profileName.trim(),
      profileType: garmentType,
      measurements: buildGarmentMeasurements(measurements),
      fitType: selectedOrder.fitType || 'custom',
      isDefault: false,
      createdBy: currentMember.userId,
      notes: `Saved from Design Studio for ${selectedOrder.orderNumber}`,
    });

    setSelectedMeasurementProfileId(profileId);
    setStudioStatusMessage(`Saved current measurements as "${profileName.trim()}".`);
  }, [
    addCustomerMeasurementProfile,
    currentMember.userId,
    currentWorkspace.id,
    garmentType,
    measurements,
    selectedOrder,
  ]);

  const applyOrderMeasurements = useCallback(
    (targetOrderId?: string) => {
      const sourceOrder =
        (targetOrderId
          ? orders.find((order) => order.id === targetOrderId) || null
          : selectedOrder) ||
        selectableOrders[0] ||
        null;

      const sourceSnapshot =
        (sourceOrder?.garmentMeasurements as FlexibleMeasurementSource | null) ||
        (sourceOrder?.measurementSnapshot as LooseRecord | null) ||
        null;

      if (!sourceOrder || !sourceSnapshot) return;

      if (sourceOrder.id !== selectedOrderId) {
        selectOrder(sourceOrder.id);
      }

      const sourceLinkage = extractProfileLinkageFromOrder(sourceOrder);
      const sourceGarmentType =
        (sourceOrder.garmentType as SupportedGarmentType | undefined) ||
        normalizeProfileTypeToGarment(sourceLinkage.profileType || undefined);

      if (sourceGarmentType) {
        setGarmentType(sourceGarmentType);
        setSelectedGarmentType(sourceGarmentType);
      }

      pushMeasurementsToStudio(sourceSnapshot, 'replace');

      const restoredProfileId =
        sourceLinkage.profileId ||
        getCustomerMeasurementProfiles(sourceOrder.customer).find((profile) => profile.isDefault)
          ?.id ||
        null;

      setSelectedMeasurementProfileId(restoredProfileId);
      setStudioStatusMessage(`Loaded measurements from ${sourceOrder.orderNumber}.`);
    },
    [
      orders,
      pushMeasurementsToStudio,
      selectableOrders,
      selectOrder,
      selectedOrder,
      selectedOrderId,
      setSelectedGarmentType,
    ]
  );

  const applyAiSuggestion = useCallback(() => {
    const sourceInspiration = selectedInspiration || designInspirations[0] || null;
    if (!sourceInspiration) return;

    if (sourceInspiration.id !== selectedInspirationId) {
      selectDesignInspiration(sourceInspiration.id);
    }

    const inferred = inferGarmentTypeFromInspiration(sourceInspiration, garmentType);
    setGarmentType(inferred as SupportedGarmentType);
    setSelectedGarmentType(inferred as SupportedGarmentType);
    setShowSavedPatternPreview(false);
    setStudioStatusMessage(`AI suggestion updated garment to ${capitalize(inferred)}.`);
  }, [
    selectedInspiration,
    designInspirations,
    selectedInspirationId,
    selectDesignInspiration,
    garmentType,
    setSelectedGarmentType,
  ]);

  const handleSaveToOrder = useCallback(() => {
    if (!selectedOrder) return;

    const garmentMeasurements = buildGarmentMeasurements(measurements);
    const resolvedAnalysis = selectedInspiration
      ? analyzeDesignInspiration(selectedInspiration, garmentType)
      : currentInspirationAnalysis || analyzeDesignInspiration(undefined, garmentType);

    const nextProductionPlan = generateProductionPlan({
      garmentType,
      measurements,
      inspiration: selectedInspiration || undefined,
      analysis: resolvedAnalysis,
      selectedFabric: selectedInventoryFabric || undefined,
    });

    const snapshot = buildMeasurementSnapshot({
      existingSnapshot: selectedOrder.measurementSnapshot,
      garmentMeasurements,
      selectedProfile: selectedMeasurementProfile,
      capturedAt:
        selectedMeasurementProfile?.id
          ? new Date().toISOString()
          : profileLinkage.capturedAt || undefined,
    });

    setSelectedGarmentType(garmentType);
    setGarmentMeasurements(garmentMeasurements as Partial<GarmentMeasurements>);
    setCurrentInspirationAnalysis(resolvedAnalysis);

    updateOrder(selectedOrder.id, {
      garmentType,
      garmentMeasurements,
      measurementSnapshot: snapshot,
      inspirationAnalysis: resolvedAnalysis,
      designInspirationId:
        selectedInspirationId ?? selectedOrder.designInspirationId ?? null,
      selectedFabricId:
        selectedInventoryFabricId ?? selectedOrder.selectedFabricId ?? null,
      selectedPatternId:
        selectedPatternLibraryId ?? selectedOrder.selectedPatternId ?? null,
      productionPlan: nextProductionPlan,
      selectedMeasurementProfileId: selectedMeasurementProfile?.id || profileLinkage.profileId || null,
      selectedMeasurementProfileLabel:
        selectedMeasurementProfile?.label || profileLinkage.profileLabel || null,
      selectedMeasurementProfileType:
        selectedMeasurementProfile?.profileType || profileLinkage.profileType || null,
    });

    if (
      selectedInspirationId &&
      selectedInspirationId !== selectedOrder.designInspirationId
    ) {
      linkInspirationToOrder(selectedOrder.id, selectedInspirationId);
    }

    if (
      selectedPatternLibraryId &&
      selectedPatternLibraryId !== selectedOrder.selectedPatternId &&
      linkPatternToOrder
    ) {
      linkPatternToOrder(selectedOrder.id, selectedPatternLibraryId);
    }

    setStudioStatusMessage(`Saved studio progress to ${selectedOrder.orderNumber}.`);
  }, [
    currentInspirationAnalysis,
    garmentType,
    linkInspirationToOrder,
    linkPatternToOrder,
    measurements,
    profileLinkage,
    selectedInspiration,
    selectedInspirationId,
    selectedInventoryFabric,
    selectedInventoryFabricId,
    selectedMeasurementProfile,
    selectedOrder,
    selectedPatternLibraryId,
    setCurrentInspirationAnalysis,
    setGarmentMeasurements,
    setSelectedGarmentType,
    updateOrder,
  ]);

  const handleSavePatternToLibrary = useCallback(() => {
    if (!canvasRef.current && !selectedPatternLibraryItem?.previewImageUrl) {
      setPatternLibraryMessage('Generate a preview before saving.');
      return;
    }

    const previewImageUrl =
      showSavedPatternPreview && selectedPatternLibraryItem?.previewImageUrl
        ? selectedPatternLibraryItem.previewImageUrl
        : canvasRef.current?.toDataURL('image/png') || null;

    if (!previewImageUrl) {
      setPatternLibraryMessage('Generate a preview before saving.');
      return;
    }

    const patternName =
      patternLibraryDraft.name.trim() ||
      `${normalizeGarmentLabel(garmentType)} ${new Date().toLocaleDateString()}`;

    const patternId = addPatternLibraryItem({
      name: patternName,
      patternType: getLibraryPatternTypeForGarment(garmentType),
      description:
        patternLibraryDraft.description.trim() ||
        selectedInspiration?.description ||
        '',
      previewImageUrl,
      linkedDesignInspirationId: selectedInspirationId || null,
      sizeRange: patternLibraryDraft.sizeRange.trim() || undefined,
      recommendedFabricTypes:
        inspirationAnalysis.recommendedFabricTypes?.length
          ? inspirationAnalysis.recommendedFabricTypes
          : selectedInventoryFabric
          ? [selectedInventoryFabric.fabricType]
          : undefined,
      notes: patternLibraryDraft.notes.trim() || undefined,
      createdBy: currentMember.userId,
    });

    setSelectedPatternLibraryId(patternId);
    setShowSavedPatternPreview(true);
    setPatternLibraryMessage(`Saved "${patternName}" to Pattern Library.`);

    if (selectedOrder && linkPatternToOrder) {
      linkPatternToOrder(selectedOrder.id, patternId);
    }
  }, [
    addPatternLibraryItem,
    currentMember.userId,
    garmentType,
    inspirationAnalysis.recommendedFabricTypes,
    linkPatternToOrder,
    patternLibraryDraft,
    selectedInspiration,
    selectedInspirationId,
    selectedInventoryFabric,
    selectedOrder,
    selectedPatternLibraryItem,
    showSavedPatternPreview,
  ]);

  const handleLoadPatternFromLibrary = useCallback(
    (patternId: string) => {
      const pattern = patternLibrary.find((item) => item.id === patternId);
      if (!pattern) return;

      const nextGarmentType = getGarmentTypeFromLibraryPatternType(pattern.patternType);

      setSelectedPatternLibraryId(pattern.id);
      setShowSavedPatternPreview(!!pattern.previewImageUrl);
      setGarmentType(nextGarmentType);
      setSelectedGarmentType(nextGarmentType);
      setPatternLibraryDraft({
        name: pattern.name,
        description: pattern.description || '',
        sizeRange: pattern.sizeRange || '',
        notes: pattern.notes || '',
      });

      if (pattern.linkedDesignInspirationId) {
        selectDesignInspiration(pattern.linkedDesignInspirationId);
      }

      if (selectedOrder && linkPatternToOrder) {
        linkPatternToOrder(selectedOrder.id, pattern.id);
      }

      setPatternLibraryMessage(`Loaded "${pattern.name}" from Pattern Library.`);
    },
    [
      linkPatternToOrder,
      patternLibrary,
      selectDesignInspiration,
      selectedOrder,
      setSelectedGarmentType,
    ]
  );

  const handleFabricUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
        setFabricImage(canvas.toDataURL('image/png'));
        setStudioStatusMessage('Fabric texture uploaded for preview.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleInspirationUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewInspiration((prev) => ({
        ...prev,
        imageUrl: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddInspiration = () => {
    if (!newInspiration.title.trim() || !newInspiration.imageUrl.trim()) return;

    addDesignInspiration({
      title: newInspiration.title,
      description: newInspiration.description,
      category: newInspiration.category,
      status: 'inspiration' as DesignStatus,
      imageUrl: newInspiration.imageUrl,
      thumbnailUrl: null,
      fabricType: newInspiration.fabricType,
      primaryColor: newInspiration.primaryColor,
      secondaryColor: newInspiration.secondaryColor,
      fitType: newInspiration.fitType,
      collarStyle: newInspiration.collarStyle,
      sleeveStyle: newInspiration.sleeveStyle,
      pocketStyle: newInspiration.pocketStyle,
      embroideryNotes: newInspiration.embroideryNotes,
      occasion: newInspiration.occasion,
      linkedCustomerId: null,
      linkedOrderId: selectedOrderId ?? null,
      tags: newInspiration.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    setNewInspiration({
      title: '',
      description: '',
      category: 'senator',
      imageUrl: '',
      fabricType: 'cotton',
      primaryColor: '',
      secondaryColor: '',
      fitType: 'tailored',
      collarStyle: '',
      sleeveStyle: '',
      pocketStyle: '',
      embroideryNotes: '',
      occasion: '',
      tags: '',
    });

    setStudioStatusMessage('Inspiration added to studio board.');
  };

  const isProFeature = !featureAccess.canGeneratePattern.allowed;

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePreview = () => {
    if (activeTab === 'inspiration') {
      if (!selectedInspiration?.imageUrl) return;
      const fileName = `${selectedInspiration.title
        .replace(/\s+/g, '-')
        .toLowerCase()}-preview.png`;
      downloadDataUrl(selectedInspiration.imageUrl, fileName);
      return;
    }

    if (showSavedPatternPreview && selectedPatternLibraryItem?.previewImageUrl) {
      downloadDataUrl(
        selectedPatternLibraryItem.previewImageUrl,
        `${selectedPatternLibraryItem.name.replace(/\s+/g, '-').toLowerCase()}-saved-pattern.png`
      );
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, `${garmentType}-${previewMode}-preview.png`);
  };

  const handleExportPdf = () => {
    let imageUrl = '';
    let title = '';

    if (activeTab === 'inspiration') {
      if (!selectedInspiration?.imageUrl) return;
      imageUrl = selectedInspiration.imageUrl;
      title = selectedInspiration.title || 'Inspiration Preview';
    } else if (showSavedPatternPreview && selectedPatternLibraryItem?.previewImageUrl) {
      imageUrl = selectedPatternLibraryItem.previewImageUrl;
      title = selectedPatternLibraryItem.name || 'Saved Pattern Preview';
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      imageUrl = canvas.toDataURL('image/png');
      title = `${normalizeGarmentLabel(garmentType)} ${capitalize(previewMode)} Preview`;
    }

    const description =
      activeTab === 'inspiration'
        ? 'Fashion inspiration export'
        : `${normalizeGarmentLabel(garmentType)} preview export`;

    const printWindow = window.open('', '_blank', 'width=1000,height=760');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              margin: 0;
              background: #ffffff;
              color: #222;
            }
            .wrapper {
              max-width: 980px;
              margin: 0 auto;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
            }
            p {
              color: #666;
              margin-bottom: 24px;
            }
            img {
              max-width: 100%;
              height: auto;
              border: 1px solid #eee;
              border-radius: 12px;
            }
            .meta {
              margin-top: 16px;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <h1>${title}</h1>
            <p>${description}</p>
            <img src="${imageUrl}" alt="${title}" />
            <div class="meta">Exported from ${BRAND.productName} Design Studio</div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };
  useEffect(() => {
    if (!canvasRef.current) return;
    if (showSavedPatternPreview) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const fabricTextureUrl = fabricImage || selectedInventoryFabric?.imageUrl || null;
    const fillColor = selectedInventoryFabric?.color || selectedFabric.color;

    const drawGrid = (gridSize: number) => {
      if (!showGrid) return;
      ctx.save();
      ctx.strokeStyle = '#D8EAF0';
      ctx.lineWidth = 0.5;

      for (let x = 20; x < width - 20; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, height - 20);
        ctx.stroke();
      }

      for (let y = 20; y < height - 20; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }

      ctx.restore();
    };

    const renderPatternPieces = (textureImage?: HTMLImageElement) => {
      if (!patternResult.pattern) return;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const activePattern = patternResult.pattern;
      const basePoints = isBodicePattern(activePattern)
        ? activePattern.points
        : activePattern.outline;

      const minX = Math.min(...(basePoints ?? []).map((point) => point.x));
      const maxX = Math.max(...(basePoints ?? []).map((point) => point.x));
      const minY = Math.min(...(basePoints ?? []).map((point) => point.y));
      const maxY = Math.max(...(basePoints ?? []).map((point) => point.y));

      const patternWidth = Math.max(maxX - minX, 1);
      const patternHeight = Math.max(maxY - minY, 1);
      const fitScale = Math.min(
        (width - 92) / patternWidth,
        (height - 92) / patternHeight
      );

      const finalScale = Math.max(4, Math.min(scale, fitScale));
      const offsetX = (width - patternWidth * finalScale) / 2 - minX * finalScale;
      const offsetY = (height - patternHeight * finalScale) / 2 - minY * finalScale;

      const s = (point: { x: number; y: number }) => ({
        x: point.x * finalScale + offsetX,
        y: point.y * finalScale + offsetY,
      });

      drawGrid(finalScale);

      const outlinePoints = isBodicePattern(activePattern)
        ? (() => {
            const cp = activePattern.controlPoints;
            return [cp.F, cp.A, cp.E, cp.G, cp.J, cp.I, cp.K, cp.D];
          })()
        : activePattern.outline;

      ctx.save();
      traceClosedPath(ctx, (outlinePoints ?? []).map(s));

      const left = Math.min(...(outlinePoints ?? []).map((point) => s(point).x));
      const right = Math.max(...(outlinePoints ?? []).map((point) => s(point).x));
      const top = Math.min(...(outlinePoints ?? []).map((point) => s(point).y));
      const bottom = Math.max(...(outlinePoints ?? []).map((point) => s(point).y));

      renderFabricFill({
        ctx,
        textureImage,
        fillColor,
        bounds: {
          left,
          top,
          width: right - left,
          height: bottom - top,
        },
      });

      ctx.restore();

      ctx.strokeStyle = '#0F6E8C';
      ctx.lineWidth = 2;
      traceClosedPath(ctx, (outlinePoints ?? []).map(s));
      ctx.stroke();

      if (isBodicePattern(activePattern)) {
        const cp = activePattern.controlPoints;

        ctx.strokeStyle = '#1C8AA8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const dartLeft = s(cp.dartLeft);
        const dartTip = s(cp.dartTip);
        const dartRight = s(cp.dartRight);
        ctx.moveTo(dartLeft.x, dartLeft.y);
        ctx.lineTo(dartTip.x, dartTip.y);
        ctx.lineTo(dartRight.x, dartRight.y);
        ctx.stroke();

        const pointsToMark = [
          { point: cp.A, label: 'A' },
          { point: cp.E, label: 'E' },
          { point: cp.G, label: 'G' },
          { point: cp.H, label: 'H' },
          { point: cp.I, label: 'I' },
          { point: cp.K, label: 'K' },
        ];

        ctx.fillStyle = '#0F6E8C';
        ctx.font = 'bold 10px Inter, sans-serif';
        pointsToMark.forEach(({ point, label }) => {
          const p = s(point);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(label, p.x + 6, p.y - 6);
        });

        ctx.fillStyle = '#5B707A';
        ctx.font = '11px Inter, sans-serif';
        const bustMidX = (s(cp.A).x + s(cp.B).x) / 2;
        ctx.fillText(
          `${(activePattern.measurements.quarterBust ?? 0).toFixed(1)}cm`,
          bustMidX - 18,
          s(cp.A).y - 10
        );
      } else if (activePattern.guides?.length) {
        ctx.strokeStyle = '#7AA8B5';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);

        activePattern.guides.slice(0, 6).forEach((guide) => {
          const start = s(guide.start);
          const end = s(guide.end);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.fillStyle = '#5B707A';
          ctx.font = '10px Inter, sans-serif';
          if (guide.label) {
            ctx.fillText(guide.label, end.x + 6, end.y - 4);
          }
          ctx.setLineDash([5, 4]);
        });

        ctx.setLineDash([]);
      }
    };

    const renderGarmentPreview = (textureImage?: HTMLImageElement) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const rawShape = buildGarmentRenderShape(
        garmentType,
        previewMode as Exclude<PreviewMode, 'pieces'>,
        measurements
      );

      const shape = mapShapeToCanvas(rawShape, width, height, 42);
      const allOutline = shape.outline;
      const left = Math.min(...(allOutline ?? []).map((point) => point.x));
      const right = Math.max(...(allOutline ?? []).map((point) => point.x));
      const top = Math.min(...(allOutline ?? []).map((point) => point.y));
      const bottom = Math.max(...(allOutline ?? []).map((point) => point.y));

      drawGrid(Math.max(18, scale * 3.3));

      ctx.save();
      traceClosedPath(ctx, allOutline);
      renderFabricFill({
        ctx,
        textureImage,
        fillColor,
        bounds: {
          left,
          top,
          width: right - left,
          height: bottom - top,
        },
      });
      ctx.restore();

      ctx.strokeStyle = '#0F6E8C';
      ctx.lineWidth = 2.2;
      traceClosedPath(ctx, allOutline);
      ctx.stroke();

      renderGuides(ctx, shape.guides);
      renderAccents(ctx, shape.accents);

      const centerX = (left + right) / 2;
      ctx.save();
      ctx.fillStyle = '#5B707A';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(
        `${normalizeGarmentLabel(garmentType)} ${capitalize(previewMode)}`,
        left + 8,
        top + 18
      );

      if (garmentType === 'dress' || garmentType === 'gown') {
        ctx.fillText(
          `${(measurements.skirtLength || 75).toFixed(0)}cm skirt`,
          centerX - 28,
          bottom - 10
        );
      }

      if (garmentType === 'trouser') {
        ctx.fillText(
          `${(measurements.trouserLength || 108).toFixed(0)}cm length`,
          centerX - 32,
          bottom - 10
        );
      }

      if (
        (garmentType === 'shirt' || garmentType === 'senator') &&
        measurements.aroundWrist
      ) {
        ctx.fillText(
          `${(measurements.aroundWrist ?? 0).toFixed(0)}cm Around Wrist`,
          left + 8,
          bottom - 10
        );
      }

      ctx.restore();
    };

    const runRender = (textureImage?: HTMLImageElement) => {
      if (previewMode === 'pieces') {
        renderPatternPieces(textureImage);
        return;
      }

      renderGarmentPreview(textureImage);
    };

    if (fabricTextureUrl) {
      const img = new Image();
      img.onload = () => runRender(img);
      img.src = fabricTextureUrl;
    } else {
      runRender();
    }
  }, [
    patternResult.pattern,
    previewMode,
    garmentType,
    measurements,
    scale,
    showGrid,
    selectedFabric,
    fabricImage,
    selectedInventoryFabric,
    showSavedPatternPreview,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        {selectedOrder && orderAlerts.length > 0 && (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-900">
                  This order is missing some important design details
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {(orderAlerts ?? []).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm text-slate-700">{alert.label}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab(alert.actionTab)}
                        className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-200"
                      >
                        {alert.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {(restoredDraftMessage || studioStatusMessage || lastDraftSavedAt) && (
          <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                {restoredDraftMessage && (
                  <p className="text-sm font-medium text-sky-800">{restoredDraftMessage}</p>
                )}
                {studioStatusMessage && (
                  <p className="text-sm text-slate-700">{studioStatusMessage}</p>
                )}
                {lastDraftSavedAt && (
                  <p className="text-xs text-slate-500">
                    Draft saved at {new Date(lastDraftSavedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={clearStudioDraft}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <XCircle className="h-4 w-4" />
                Clear Draft
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-r from-[#0F6E8C] via-[#117793] to-[#0C5C74] p-6 text-white shadow-2xl">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Creative Pattern Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Design Studio
              </h1>

              <p className="mt-3 max-w-2xl text-sm text-white/90 lg:text-base">
                Select a garment, apply a customer measurement profile, attach fabric,
                read the inspiration, and keep a safe order snapshot while refining the studio draft.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm text-white/95 backdrop-blur-sm">
                  Garment: {normalizeGarmentLabel(garmentType)}
                </span>

                {selectedOrder && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white/95 backdrop-blur-sm">
                    Order: {selectedOrder.orderNumber}
                    {orderStageStatus.hasOverdueStage && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                        Overdue
                      </span>
                    )}
                  </span>
                )}

                {(selectedMeasurementProfile?.label || profileLinkage.profileLabel) && (
                  <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm text-white/95 backdrop-blur-sm">
                    Profile: {selectedMeasurementProfile?.label || profileLinkage.profileLabel}
                  </span>
                )}

                {selectedPatternLibraryItem && (
                  <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm text-white/95 backdrop-blur-sm">
                    Pattern: {selectedPatternLibraryItem.name}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TopInfoCard icon={Scissors} label="Draft Basis" value={capitalize(patternKind)} />
              <TopInfoCard
                icon={Package}
                label="Cut Pieces"
                value={`${productionPlan.cuttingList.length}`}
              />
              <TopInfoCard
                icon={ClipboardList}
                label="Sewing Steps"
                value={`${productionPlan.sewingChecklist.length}`}
              />
              <TopInfoCard
                icon={AlertTriangle}
                label="Fit Risks"
                value={`${productionPlan.fitRisks.length}`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-xl backdrop-blur-sm">
            <div className="border-b border-slate-200 px-5 py-5">
              <h2 className="text-xl font-bold text-slate-900">Studio Controls</h2>
              <p className="mt-1 text-sm text-slate-500">
                Measurements, profiles, inspiration intake, fabric input, and production planning.
              </p>
            </div>

            <div className="border-b border-slate-200 px-3 py-3">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-sky-50 p-1">
                <button
                  onClick={() => setActiveTab('pattern')}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === 'pattern'
                      ? 'bg-[#0F6E8C] text-white shadow-md'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Ruler className="mr-1.5 inline h-4 w-4" />
                  Pattern
                </button>

                <button
                  onClick={() => setActiveTab('fabric')}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === 'fabric'
                      ? 'bg-[#0F6E8C] text-white shadow-md'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Layers className="mr-1.5 inline h-4 w-4" />
                  Fabric
                </button>

                <button
                  onClick={() => setActiveTab('inspiration')}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === 'inspiration'
                      ? 'bg-[#0F6E8C] text-white shadow-md'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Images className="mr-1.5 inline h-4 w-4" />
                  Inspiration
                </button>
              </div>
            </div>

            <div className="max-h-[980px] overflow-y-auto px-5 py-5">
              {activeTab === 'pattern' ? (
                <div className="space-y-5">
                  {isProFeature && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm font-semibold">Pro Feature</span>
                      </div>
                      <p className="mt-1 text-xs text-amber-700">
                        Pattern generation requires Pro plan. Preview access is limited.
                      </p>
                    </div>
                  )}

                  <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      Garment Setup
                      <Info className="h-4 w-4 text-sky-500" />
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Garment Type
                        </label>
                        <select
                          value={garmentType}
                          onChange={(e) => {
                            const nextType = e.target.value as SupportedGarmentType;
                            setGarmentType(nextType);
                            setSelectedGarmentType(nextType);
                            setShowSavedPatternPreview(false);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                        >
                          {(GARMENT_OPTIONS ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} — {option.helper}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Studio Order
                        </label>
                        <select
                          value={selectedOrderId ?? ''}
                          onChange={(e) => selectOrder(e.target.value || null)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                        >
                          <option value="">No order selected</option>
                          {(orders ?? []).map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.orderNumber} — {order.orderType} —{' '}
                              {order.customer?.fullName || 'No customer'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Inspiration Source
                        </label>
                        <select
                          value={selectedInspirationId ?? ''}
                          onChange={(e) => selectDesignInspiration(e.target.value || null)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                        >
                          <option value="">No inspiration selected</option>
                          {(designInspirations ?? []).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title} — {capitalize(item.category)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={applyAiSuggestion}
                          disabled={!hasAnyInspiration}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            hasAnyInspiration
                              ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Wand2 className="mr-1.5 inline h-4 w-4" />
                          Use AI Suggestion
                        </button>

                        <button
                          type="button"
                          onClick={() => applyOrderMeasurements()}
                          disabled={!hasAnyOrderMeasurements}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            hasAnyOrderMeasurements
                              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400'
                          }`}
                        >
                          Use Order Measurements
                        </button>
                      </div>
                    </div>
                  </div>

                  <FeatureGate
                    feature="measurementProfiles"
                    title="Measurement Profiles"
                    description="Upgrade to Pro or Studio to use customer measurement profiles."
                    compact
                  >
                    <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        Customer Profiles
                        <BadgeInfo className="h-4 w-4 text-sky-500" />
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Customer Profile
                          </label>
                          <select
                            value={selectedMeasurementProfileId ?? ''}
                            onChange={(e) => {
                              const nextId = e.target.value || null;
                              setSelectedMeasurementProfileId(nextId);

                              const nextProfile =
                                customerMeasurementProfiles.find((profile) => profile.id === nextId) ||
                                null;
                              const profileGarment = normalizeProfileTypeToGarment(
                                nextProfile?.profileType
                              );

                              if (profileGarment) {
                                setGarmentType(profileGarment);
                                setSelectedGarmentType(profileGarment);
                              }
                            }}
                            disabled={!customerMeasurementProfiles.length || !canUseMeasurementProfiles}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300 disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">
                              {customerMeasurementProfiles.length
                                ? 'Select a measurement profile'
                                : 'No customer profiles available'}
                            </option>
                            {(customerMeasurementProfiles ?? []).map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.label}
                                {profile.profileType ? ` — ${capitalize(profile.profileType)}` : ''}
                                {profile.isDefault ? ' — Default' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => applyMeasurementProfile()}
                            disabled={!selectedMeasurementProfile}
                            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
                              selectedMeasurementProfile
                                ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                                : 'cursor-not-allowed bg-slate-100 text-slate-400'
                            }`}
                          >
                            Use Profile
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveAsProfile}
                            disabled={!selectedOrder}
                            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
                              selectedOrder
                                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                                : 'cursor-not-allowed bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Save className="h-4 w-4" />
                            Save as Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </FeatureGate>

                  <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      Render View
                      <PanelsTopLeft className="h-4 w-4 text-sky-500" />
                    </h3>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2">
                      {(['front', 'back', 'pieces'] as PreviewMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setPreviewMode(mode);
                            setShowSavedPatternPreview(false);
                          }}
                          className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                            previewMode === mode
                              ? 'bg-[#0F6E8C] text-white shadow-md'
                              : 'bg-slate-50 text-slate-600 hover:bg-sky-50'
                          }`}
                        >
                          {capitalize(mode)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      Garment Measurements
                      <BadgeInfo className="h-4 w-4 text-sky-500" />
                    </h3>

                    <div className="space-y-4">
                      {(selectedMeasurementFields ?? []).map((field) => {
                        const currentValue = measurements[field.key] ?? field.min;

                        return (
                          <div
                            key={field.key}
                            className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                          >
                            <label className="mb-2 flex items-center justify-between text-xs text-slate-500">
                              <span>
                                {field.label}
                                {field.optional && (
                                  <span className="ml-1 text-slate-400">(opt)</span>
                                )}
                              </span>
                              <span>
                                {field.min}-{field.max} {field.unit}
                              </span>
                            </label>

                            <input
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={0.5}
                              value={currentValue}
                              onChange={(e) =>
                                updateMeasurement(field.key, parseFloat(e.target.value))
                              }
                              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-sky-100 accent-[#0F6E8C]"
                            />

                            <div className="mt-2 flex items-center justify-between">
                              <input
                                type="number"
                                min={field.min}
                                max={field.max}
                                step={0.5}
                                value={currentValue}
                                onChange={(e) =>
                                  updateMeasurement(
                                    field.key,
                                    parseFloat(e.target.value) || field.min
                                  )
                                }
                                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                              />
                              <span className="text-xs text-slate-400">{field.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {patternError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-700">{patternError}</p>
                    </div>
                  )}

                  {patternResult.pattern && (
                    <div className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-slate-900">
                        AI Draft Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                        <div className="rounded-xl bg-white/80 p-3">
                          Garment: {normalizeGarmentLabel(garmentType)}
                        </div>
                        <div className="rounded-xl bg-white/80 p-3">
                          Draft Basis: {capitalize(patternKind)}
                        </div>
                        <div className="rounded-xl bg-white/80 p-3">
                          Complexity: {capitalize(inspirationAnalysis.complexityLevel)}
                        </div>
                        <div className="rounded-xl bg-white/80 p-3">
                          Profile: {selectedMeasurementProfile?.label || 'Manual / order snapshot'}
                        </div>
                      </div>
                    </div>
                  )}

                  <FeatureGate
                    feature="savePattern"
                    title="Save Pattern to Library"
                    description="Upgrade to Pro or Studio to save generated patterns to your library."
                    compact
                  >
                    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Save Pattern to Library
                        </h3>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-[#0F6E8C]">
                          Task 7
                        </span>
                      </div>

                      <div className="space-y-3">
                        {patternLibraryMessage && (
                          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-[#0F6E8C]">
                            {patternLibraryMessage}
                          </div>
                        )}

                        <input
                          value={patternLibraryDraft.name}
                          onChange={(e) =>
                            setPatternLibraryDraft((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Pattern name"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        />

                        <input
                          value={patternLibraryDraft.sizeRange}
                          onChange={(e) =>
                            setPatternLibraryDraft((prev) => ({
                              ...prev,
                              sizeRange: e.target.value,
                            }))
                          }
                          placeholder="Size range e.g. M-L or Chest 42"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        />

                        <textarea
                          value={patternLibraryDraft.description}
                          onChange={(e) =>
                            setPatternLibraryDraft((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="Pattern description"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        />

                        <textarea
                          value={patternLibraryDraft.notes}
                          onChange={(e) =>
                            setPatternLibraryDraft((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Construction notes, fitting notes, recommended use..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        />

                        <button
                          type="button"
                          onClick={handleSavePatternToLibrary}
                          disabled={
                            !canSavePatternToLibrary ||
                            (!patternResult.pattern && !selectedPatternLibraryItem?.previewImageUrl)
                          }
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
                            canSavePatternToLibrary &&
                            (patternResult.pattern || selectedPatternLibraryItem?.previewImageUrl)
                              ? 'bg-[#0F6E8C] text-white shadow-md hover:bg-[#0C5C74]'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Save className="h-4 w-4" />
                          Save Pattern to Library
                        </button>
                      </div>
                    </div>
                  </FeatureGate>
                </div>
              ) : activeTab === 'fabric' ? (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Quick Fabric Colors
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(FABRIC_PATTERNS ?? []).map((fabric) => (
                        <button
                          key={fabric.name}
                          onClick={() => setSelectedFabric(fabric)}
                          className={`group rounded-2xl border-2 p-2 transition ${
                            selectedFabric.name === fabric.name
                              ? 'border-[#0F6E8C] ring-4 ring-sky-100'
                              : 'border-white hover:border-sky-200'
                          }`}
                          title={fabric.name}
                        >
                          <div
                            className="aspect-square rounded-xl shadow-inner"
                            style={{ backgroundColor: fabric.color }}
                          />
                          <p className="mt-2 text-xs font-medium text-slate-600">
                            {fabric.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Use Inventory Fabric
                    </h3>

                    <select
                      value={selectedInventoryFabricId || ''}
                      onChange={(e) => setSelectedInventoryFabricId(e.target.value || null)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                    >
                      <option value="">No inventory fabric selected</option>
                      {(fabricRecords ?? []).map((fabric) => (
                        <option key={fabric.id} value={fabric.id}>
                          {fabric.name} • {capitalize(fabric.fabricType)} • {fabric.color}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Upload Fabric Texture
                    </h3>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFabricUpload}
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!featureAccess.canUseFabricVisualizer.allowed}
                      className={`w-full rounded-[24px] border-2 border-dashed p-6 text-center transition ${
                        featureAccess.canUseFabricVisualizer.allowed
                          ? 'border-sky-200 bg-sky-50/60 hover:border-cyan-300 hover:bg-cyan-50'
                          : 'cursor-not-allowed border-slate-200 bg-slate-50'
                      }`}
                    >
                      {featureAccess.canUseFabricVisualizer.allowed ? (
                        <>
                          <Upload className="mx-auto mb-3 h-7 w-7 text-[#0F6E8C]" />
                          <p className="text-sm font-semibold text-slate-700">
                            Upload fabric photo
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            PNG, JPG up to 5MB
                          </p>
                        </>
                      ) : (
                        <>
                          <Lock className="mx-auto mb-3 h-7 w-7 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-400">Pro feature</p>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Add Style Inspiration
                      </h3>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-[#0F6E8C]">
                        Fashion Board
                      </span>
                    </div>

                    <div className="space-y-3">
                      <input
                        value={newInspiration.title}
                        onChange={(e) =>
                          setNewInspiration((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Design title"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                      />

                      <textarea
                        value={newInspiration.description}
                        onChange={(e) =>
                          setNewInspiration((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe the style..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={newInspiration.category}
                          onChange={(e) =>
                            setNewInspiration((prev) => ({
                              ...prev,
                              category: e.target.value as DesignCategory,
                            }))
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        >
                          {(DESIGN_CATEGORIES ?? []).map((category) => (
                            <option key={category} value={category}>
                              {capitalize(category)}
                            </option>
                          ))}
                        </select>

                        <select
                          value={newInspiration.fabricType}
                          onChange={(e) =>
                            setNewInspiration((prev) => ({
                              ...prev,
                              fabricType: e.target.value as FabricType,
                            }))
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        >
                          {(FABRIC_TYPES ?? []).map((fabricType) => (
                            <option key={fabricType} value={fabricType}>
                              {capitalize(fabricType)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={newInspiration.primaryColor}
                          onChange={(e) =>
                            setNewInspiration((prev) => ({
                              ...prev,
                              primaryColor: e.target.value,
                            }))
                          }
                          placeholder="Primary color"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        />

                        <input
                          value={newInspiration.secondaryColor}
                          onChange={(e) =>
                            setNewInspiration((prev) => ({
                              ...prev,
                              secondaryColor: e.target.value,
                            }))
                          }
                          placeholder="Secondary color"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                        />
                      </div>

                      <select
                        value={newInspiration.fitType}
                        onChange={(e) =>
                          setNewInspiration((prev) => ({
                            ...prev,
                            fitType: e.target.value as FitType,
                          }))
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                      >
                        {(FIT_TYPES ?? []).map((fitType) => (
                          <option key={fitType} value={fitType}>
                            {capitalize(fitType)}
                          </option>
                        ))}
                      </select>

                      <input
                        value={newInspiration.imageUrl}
                        onChange={(e) =>
                          setNewInspiration((prev) => ({
                            ...prev,
                            imageUrl: e.target.value,
                          }))
                        }
                        placeholder="Paste image URL or upload below"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                      />

                      <input
                        ref={inspirationFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleInspirationUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => inspirationFileInputRef.current?.click()}
                        className="w-full rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-4 text-center transition hover:border-cyan-300 hover:bg-cyan-50"
                      >
                        <Upload className="mx-auto mb-2 h-6 w-6 text-[#0F6E8C]" />
                        <p className="text-sm font-semibold text-slate-700">
                          Upload inspiration photo
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddInspiration}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F6E8C] py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0C5C74]"
                      >
                        <Plus className="h-4 w-4" />
                        Add Inspiration
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSavePreview}
                  disabled={!featureAccess.canSavePreview.allowed}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition ${
                    featureAccess.canSavePreview.allowed
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  {featureAccess.canSavePreview.allowed ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Save
                </button>

                <button
                  onClick={handleExportPdf}
                  disabled={!featureAccess.canExportPdf.allowed}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition ${
                    featureAccess.canExportPdf.allowed
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  {featureAccess.canExportPdf.allowed ? (
                    <Download className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Export
                </button>
              </div>

              <button
                onClick={handleSaveToOrder}
                disabled={!selectedOrder}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition ${
                  selectedOrder
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                <Package className="h-4 w-4" />
                {selectedOrder
                  ? `Save to ${selectedOrder.orderNumber}`
                  : 'Select an order to save'}
              </button>

              <button
                onClick={() => {
                  if (!isProFeature) {
                    setPatternError(null);
                    setCurrentInspirationAnalysis(inspirationAnalysis);
                    setShowSavedPatternPreview(false);
                  }
                }}
                disabled={isProFeature}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold transition ${
                  isProFeature
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-[#0F6E8C] text-white shadow-md hover:bg-[#0C5C74]'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Draft + Production Plan
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-xl backdrop-blur-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeTab === 'inspiration'
                      ? 'Inspiration Preview'
                      : showSavedPatternPreview && selectedPatternLibraryItem
                      ? 'Saved Pattern Preview'
                      : 'Garment + Pattern Preview'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Real draft preview plus a production assistant for tailoring execution.
                  </p>
                </div>

                {activeTab !== 'inspiration' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {showSavedPatternPreview && selectedPatternLibraryItem ? (
                      <button
                        onClick={() => setShowSavedPatternPreview(false)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-sky-50"
                      >
                        Switch to Live Draft
                      </button>
                    ) : selectedPatternLibraryItem?.previewImageUrl ? (
                      <button
                        onClick={() => setShowSavedPatternPreview(true)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-sky-50"
                      >
                        Show Saved Preview
                      </button>
                    ) : null}

                    <button
                      onClick={() => setScale((s) => Math.max(4, s - 1))}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-sky-50"
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>

                    <div className="rounded-xl bg-sky-50 px-4 py-2 text-sm font-medium text-slate-600">
                      {scale}px/cm
                    </div>

                    <button
                      onClick={() => setScale((s) => Math.min(16, s + 1))}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-sky-50"
                      title="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`rounded-xl p-2.5 transition ${
                        showGrid
                          ? 'bg-sky-100 text-[#0F6E8C]'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-sky-50'
                      }`}
                      title="Toggle grid"
                    >
                      <Grid className="h-4 w-4" />
                    </button>

                    <div className="ml-1 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      <Eye className="h-4 w-4" />
                      {showSavedPatternPreview ? 'Saved Preview' : capitalize(previewMode)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-[1100px] overflow-y-auto">
              {activeTab === 'inspiration' ? (
                <div className="min-h-[420px] bg-gradient-to-br from-white via-slate-50 to-sky-50 p-4 lg:p-8">
                  {selectedInspiration ? (
                    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="aspect-[4/3] w-full bg-slate-100">
                          <img
                            src={selectedInspiration.imageUrl}
                            alt={selectedInspiration.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0F6E8C]">
                            {capitalize(selectedInspiration.category)}
                          </span>
                          {selectedInspiration.fitType && (
                            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                              {capitalize(selectedInspiration.fitType)}
                            </span>
                          )}
                          {selectedInspiration.fabricType && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {capitalize(selectedInspiration.fabricType)}
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900">
                          {selectedInspiration.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {selectedInspiration.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[340px] items-center justify-center">
                      <div className="rounded-[28px] border border-dashed border-sky-200 bg-white/80 p-10 text-center shadow-lg">
                        <Images className="mx-auto mb-3 h-10 w-10 text-sky-500" />
                        <h3 className="text-lg font-semibold text-slate-800">
                          No inspiration selected
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Choose a saved inspiration to let the assistant interpret the style.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex min-h-[560px] items-center justify-center overflow-auto bg-gradient-to-br from-white via-slate-50 to-sky-50 p-4 lg:p-8">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-2xl">
                      {showSavedPatternPreview && selectedPatternLibraryItem?.previewImageUrl ? (
                        <img
                          src={selectedPatternLibraryItem.previewImageUrl}
                          alt={selectedPatternLibraryItem.name}
                          className="block h-[500px] w-[620px] rounded-2xl object-contain"
                        />
                      ) : (
                        <canvas
                          ref={canvasRef}
                          width={620}
                          height={500}
                          className="block rounded-2xl"
                        />
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-white/80 px-5 py-4">
                    <div className="flex flex-col gap-2 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-[#0F6E8C]">
                          {normalizeGarmentLabel(garmentType)} Draft
                        </span>
                        <span>Pattern Basis: {capitalize(patternKind)}</span>
                        <span>View: {capitalize(previewMode)}</span>
                        {(selectedMeasurementProfile?.label || profileLinkage.profileLabel) && (
                          <span>
                            Profile:{' '}
                            {selectedMeasurementProfile?.label || profileLinkage.profileLabel}
                          </span>
                        )}
                      </div>

                      <div className="text-slate-400">
                        {showSavedPatternPreview && selectedPatternLibraryItem
                          ? `Library preview: ${selectedPatternLibraryItem.name}`
                          : selectedInventoryFabric
                          ? `Fabric: ${selectedInventoryFabric.name}`
                          : `Color: ${selectedFabric.name}`}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <FeatureGate
                feature="productionAssistant"
                title="Production Assistant"
                description="Upgrade to Studio to unlock cutting lists, sewing steps, and assistant outputs."
              >
                <div className="border-t border-slate-200 bg-white px-4 py-5 lg:px-6">
                  <div className="mb-5 flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-[#0F6E8C]" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Production Assistant
                    </h3>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoCard
                      title="Suggested Garment"
                      value={normalizeGarmentLabel(
                        productionPlan.garmentType as SupportedGarmentType
                      )}
                      subtitle="AI interpretation"
                      icon={Shirt}
                      tone="brand"
                    />
                    <InfoCard
                      title="Fabric Estimate"
                      value={`${productionPlan.fabricEstimate.mainFabricQty} ${productionPlan.fabricEstimate.unit}`}
                      subtitle="Main fabric"
                      icon={Layers}
                      tone="amber"
                    />
                    <InfoCard
                      title="Cutting Pieces"
                      value={String(productionPlan.cuttingList.length)}
                      subtitle="Prepared piece list"
                      icon={Scissors}
                      tone="indigo"
                    />
                    <InfoCard
                      title="Fit Warnings"
                      value={String(productionPlan.fitRisks.length)}
                      subtitle="Before sewing"
                      icon={AlertTriangle}
                      tone="rose"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                      <h4 className="mb-4 text-base font-semibold text-slate-900">
                        Fabric Requirement Estimate
                      </h4>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <MiniPlanStat
                          label="Main Fabric"
                          value={`${productionPlan.fabricEstimate.mainFabricQty} ${productionPlan.fabricEstimate.unit}`}
                        />
                        <MiniPlanStat
                          label="Fabric Type"
                          value={capitalize(productionPlan.fabricEstimate.fabricType)}
                        />
                        <MiniPlanStat
                          label="Lining"
                          value={
                            productionPlan.fabricEstimate.liningQty
                              ? `${productionPlan.fabricEstimate.liningQty} ${productionPlan.fabricEstimate.unit}`
                              : 'Not required'
                          }
                        />
                        <MiniPlanStat
                          label="Interfacing"
                          value={
                            productionPlan.fabricEstimate.interfacingQty
                              ? `${productionPlan.fabricEstimate.interfacingQty} ${productionPlan.fabricEstimate.unit}`
                              : 'Not required'
                          }
                        />
                      </div>
                    </section>

                    <FeatureGate
                      feature="fitWarnings"
                      title="Fit-Risk Warnings"
                      description="Upgrade to Studio to unlock AI fit-risk warnings."
                      compact
                    >
                      <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                        <h4 className="mb-4 text-base font-semibold text-slate-900">
                          Fit-Risk Warnings
                        </h4>

                        {productionPlan.fitRisks.length === 0 ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            No major fit warnings from the current measurements. Still do a
                            physical fitting before final finishing.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(productionPlan.fitRisks ?? []).map((risk: any, index: number) => (
                              <div
                                key={`${risk.title}-${index}`}
                                className={`rounded-2xl border p-4 ${getSeverityClasses(
                                  risk.severity
                                )}`}
                              >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <p className="font-semibold">{risk.title}</p>
                                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium capitalize">
                                    {risk.severity || 'info'}
                                  </span>
                                </div>
                                <p className="text-sm">{risk.description}</p>
                                {risk.recommendation && (
                                  <p className="mt-2 text-sm font-medium">
                                    Recommendation: {risk.recommendation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </FeatureGate>
                  </div>
                </div>
              </FeatureGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fillColorSafe(primary?: string | null, fallback?: string) {
  return primary || fallback || '#0F6E8C';
}

function TopInfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs uppercase tracking-wide text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-800">
        {value && value.trim() ? value : 'Not set'}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone: 'brand' | 'amber' | 'indigo' | 'rose';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniPlanStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
