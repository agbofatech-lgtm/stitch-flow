/**
 * GarmentSpecification is the T6 handoff artifact.
 * Fields are FACT from existing Order / profile types — not invented completeness.
 * Phase 14: TRANSITIONAL / PROJECTION / INPUT CANDIDATE — not GarmentSpecificationVersion.
 */

import type { GarmentType, Order, CustomerMeasurementProfile } from '../../shared/types';
import { mapGarmentTypeToPatternKind } from '../pattern/gateway';
import {
  flattenSeparated,
  separateLegacyMeasurementBlob,
  type SeparatedMeasurements,
} from '../measurement/separate';
import type { PatternKind } from '../measurement/fields';

export type GarmentSpecification = {
  customerId?: string;
  orderId?: string;
  garmentType?: GarmentType;
  measurementProfileId?: string | null;
  measurementVersionCapturedAt?: string;
  separated: SeparatedMeasurements;
  patternKind: PatternKind;
  designInspirationId?: string | null;
  fabricRecordId?: string | null;
  productionPlanPresent: boolean;
  notes?: string;
};

export function buildGarmentSpecification(input: {
  order?: Order | null;
  profile?: CustomerMeasurementProfile | null;
  customerId?: string;
}): GarmentSpecification {
  const order = input.order || null;
  const profile = input.profile || null;
  const blob = {
    ...(profile?.measurements || {}),
    ...(order?.garmentMeasurements || {}),
    ...(order?.measurementSnapshot || {}),
  } as Record<string, unknown>;
  const garmentType = order?.garmentType;
  const patternKind = mapGarmentTypeToPatternKind(garmentType || 'bodice');
  const captured =
    order?.measurementSnapshot?.capturedAt instanceof Date
      ? order.measurementSnapshot.capturedAt.toISOString()
      : typeof order?.measurementSnapshot?.capturedAt === 'string'
      ? order.measurementSnapshot.capturedAt
      : undefined;

  return {
    customerId: input.customerId || order?.customerId || profile?.customerId,
    orderId: order?.id,
    garmentType,
    measurementProfileId: order?.selectedMeasurementProfileId || profile?.id || null,
    measurementVersionCapturedAt: captured,
    separated: separateLegacyMeasurementBlob(blob, patternKind),
    patternKind,
    designInspirationId: order?.designInspirationId || null,
    fabricRecordId: order?.selectedFabricId || null,
    productionPlanPresent: Boolean(order?.productionPlan),
    notes: order?.notes || profile?.notes,
  };
}

export function specificationMeasurementMap(spec: GarmentSpecification): Record<string, unknown> {
  return flattenSeparated(spec.separated);
}

export function orderStatusWorkflowLabel(status: Order['status'] | undefined): string {
  switch (status) {
    case 'draft':
      return 'Draft / early workflow';
    case 'in_progress':
      return 'In production';
    case 'ready':
      return 'Ready for delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}
