/**
 * Phase 14 canonical garment specification contract.
 * Semantic intent only. Measurements remain Phase 13. Geometry remains derived.
 */

import {
  classifyFitType,
  classifyGarmentType,
  type GarmentTypeStatus,
  type KnownFitType,
  type KnownGarmentType,
} from './taxonomy';
import { DERIVED_PATTERN_OUTPUT_KEYS } from '../measurement/derived';
import { BODY_MEASUREMENT_FIELDS, GARMENT_MEASUREMENT_FIELDS } from '../measurement/fields';

export const GARMENT_SPECIFICATION_SCHEMA_VERSION = 1 as const;

export const UI_ONLY_SPEC_KEYS = [
  'selectedTab',
  'activeTab',
  'isDragging',
  'canvasZoom',
  'hoveredElement',
  'panelOpen',
  'mousePosition',
  'previewMode',
  'showGrid',
  'scale',
] as const;

const UI_SET = new Set<string>(UI_ONLY_SPEC_KEYS);
const MEASUREMENT_SET = new Set<string>([...BODY_MEASUREMENT_FIELDS, ...GARMENT_MEASUREMENT_FIELDS]);
const DERIVED_SET = new Set<string>(DERIVED_PATTERN_OUTPUT_KEYS);

export type GarmentIntentInput = {
  garmentType?: unknown;
  fitType?: unknown;
  sleeveStyle?: unknown;
  collarStyle?: unknown;
  neckline?: unknown;
  lengthType?: unknown;
  pocketStyle?: unknown;
  fabricType?: unknown;
  designCategory?: unknown;
  styleNotes?: unknown;
  customerId?: string | null;
  orderId?: string | null;
  measurementVersionId?: string | null;
};

export type CanonicalGarmentSpecification = {
  schemaVersion: typeof GARMENT_SPECIFICATION_SCHEMA_VERSION;
  garmentType: KnownGarmentType | null;
  garmentTypeStatus: GarmentTypeStatus;
  rawGarmentType?: string;
  fitType?: KnownFitType;
  fitTypeStatus: GarmentTypeStatus;
  rawFitType?: string;
  sleeveStyle?: string;
  collarStyle?: string;
  neckline?: string;
  lengthType?: string;
  pocketStyle?: string;
  fabricType?: string;
  designCategory?: string;
  styleNotes?: string;
  customerId?: string | null;
  orderId?: string | null;
  measurementVersionId?: string | null;
};

function optionalTrimmedString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new Error('STOP: garment specification text fields must be strings when present');
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function assertNoUiStateInGarmentIntent(fields: Record<string, unknown>): void {
  for (const key of Object.keys(fields)) {
    if (UI_SET.has(key)) {
      throw new Error(`STOP: garment specification must not contain UI state "${key}"`);
    }
  }
}

export function assertNoMeasurementOrDerivedInGarmentIntent(fields: Record<string, unknown>): void {
  for (const key of Object.keys(fields)) {
    if (MEASUREMENT_SET.has(key)) {
      throw new Error(
        `STOP: "${key}" is a measurement field (Phase 13), not garment specification authority`
      );
    }
    if (DERIVED_SET.has(key)) {
      throw new Error(`STOP: "${key}" is a derived pattern output, not garment specification`);
    }
  }
}

export function buildCanonicalGarmentSpecification(
  input: GarmentIntentInput
): CanonicalGarmentSpecification {
  const bag = input as Record<string, unknown>;
  assertNoUiStateInGarmentIntent(bag);
  assertNoMeasurementOrDerivedInGarmentIntent(bag);

  const garment = classifyGarmentType(input.garmentType);
  const fit = classifyFitType(input.fitType);

  const spec: CanonicalGarmentSpecification = {
    schemaVersion: GARMENT_SPECIFICATION_SCHEMA_VERSION,
    garmentType: garment.known,
    garmentTypeStatus: garment.status,
    fitTypeStatus: fit.status,
  };

  if (garment.raw !== undefined && garment.status !== 'known') {
    spec.rawGarmentType = garment.raw;
  }
  if (garment.status === 'known' && garment.raw) {
    spec.rawGarmentType = garment.raw;
  }
  if (fit.known) spec.fitType = fit.known;
  if (fit.raw !== undefined && fit.status !== 'known') spec.rawFitType = fit.raw;
  if (fit.status === 'known' && fit.raw) spec.rawFitType = fit.raw;

  const sleeveStyle = optionalTrimmedString(input.sleeveStyle);
  const collarStyle = optionalTrimmedString(input.collarStyle);
  const neckline = optionalTrimmedString(input.neckline);
  const lengthType = optionalTrimmedString(input.lengthType);
  const pocketStyle = optionalTrimmedString(input.pocketStyle);
  const fabricType = optionalTrimmedString(input.fabricType);
  const designCategory = optionalTrimmedString(input.designCategory);
  const styleNotes = optionalTrimmedString(input.styleNotes);

  if (sleeveStyle) spec.sleeveStyle = sleeveStyle;
  if (collarStyle) spec.collarStyle = collarStyle;
  if (neckline) spec.neckline = neckline;
  if (lengthType) spec.lengthType = lengthType;
  if (pocketStyle) spec.pocketStyle = pocketStyle;
  if (fabricType) spec.fabricType = fabricType;
  if (designCategory) spec.designCategory = designCategory;
  if (styleNotes) spec.styleNotes = styleNotes;
  if (input.customerId !== undefined) spec.customerId = input.customerId;
  if (input.orderId !== undefined) spec.orderId = input.orderId;
  if (input.measurementVersionId !== undefined) spec.measurementVersionId = input.measurementVersionId;

  return spec;
}
