import {
  buildGarmentSpecification,
  type GarmentSpecification,
} from '../../domain/garment/specification';
import { mapGarmentTypeToPatternKind } from '../../domain/pattern/gateway';
import { separateLegacyMeasurementBlob } from '../../domain/measurement/separate';
import type { GarmentType } from '../../shared/types';

const UI_ONLY_KEYS = new Set([
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
]);

export function assertNoUiStateInSpecification(value: Record<string, unknown>): void {
  for (const key of Object.keys(value)) {
    if (UI_ONLY_KEYS.has(key)) {
      throw new Error(`STOP: GarmentSpecification must not contain UI state "${key}"`);
    }
  }
}

export function serializeGarmentSpecification(spec: GarmentSpecification): string {
  const payload = {
    customerId: spec.customerId,
    orderId: spec.orderId,
    garmentType: spec.garmentType,
    measurementProfileId: spec.measurementProfileId,
    measurementVersionCapturedAt: spec.measurementVersionCapturedAt,
    patternKind: spec.patternKind,
    designInspirationId: spec.designInspirationId,
    fabricRecordId: spec.fabricRecordId,
    productionPlanPresent: spec.productionPlanPresent,
    notes: spec.notes,
    body: spec.separated.body,
    garment: spec.separated.garment,
    pattern: spec.separated.pattern,
  };
  assertNoUiStateInSpecification(payload as Record<string, unknown>);
  return JSON.stringify(payload);
}

export function buildStudioGarmentSpecification(input: {
  garmentType?: GarmentType;
  measurements?: Record<string, unknown>;
  customerId?: string;
  orderId?: string;
  measurementProfileId?: string | null;
  designInspirationId?: string | null;
  fabricRecordId?: string | null;
  productionPlanPresent?: boolean;
  notes?: string;
}): GarmentSpecification {
  const garmentType = input.garmentType || 'bodice';
  const patternKind = mapGarmentTypeToPatternKind(garmentType);
  const blob = { ...(input.measurements || {}) };
  for (const key of UI_ONLY_KEYS) delete blob[key];

  const spec: GarmentSpecification = {
    ...buildGarmentSpecification({ customerId: input.customerId }),
    customerId: input.customerId,
    orderId: input.orderId,
    garmentType,
    measurementProfileId: input.measurementProfileId ?? null,
    separated: separateLegacyMeasurementBlob(blob, patternKind),
    patternKind,
    designInspirationId: input.designInspirationId ?? null,
    fabricRecordId: input.fabricRecordId ?? null,
    productionPlanPresent: Boolean(input.productionPlanPresent),
    notes: input.notes,
  };
  assertNoUiStateInSpecification(JSON.parse(serializeGarmentSpecification(spec)));
  return spec;
}
