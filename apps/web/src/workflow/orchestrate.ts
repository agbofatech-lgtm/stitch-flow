import { requestPattern } from '../domain/pattern/gateway';
import { requestProductionPlan } from '../domain/production/gateway';
import {
  buildGarmentSpecification,
  specificationMeasurementMap,
  type GarmentSpecification,
} from '../domain/garment/specification';
import type {
  Customer,
  CustomerMeasurementProfile,
  DesignInspiration,
  GarmentMeasurements,
  Order,
  ProductionPlan,
} from '../shared/types';
import { getDataAuthorityRuntime } from '../shared/persistence';
import type { EntityRepository } from '../shared/persistence/repository';
import type { StylePatternResult } from '../modules/services/patternEngine';

export type PatternArtifactSummary = {
  kind: string;
  generated: true;
  pointCount: number;
};

export type WorkflowSnapshot = {
  customerId: string | null;
  profileId: string | null;
  orderId: string | null;
  specification: GarmentSpecification | null;
  pattern: PatternArtifactSummary | null;
  productionPlanPresent: boolean;
};

export function summarizePattern(result: StylePatternResult): PatternArtifactSummary {
  const points = 'outline' in result && result.outline ? result.outline : result.points;
  return {
    kind: 'kind' in result ? String(result.kind) : 'bodice',
    generated: true,
    pointCount: points?.length || 0,
  };
}

export function buildWorkflowSpecification(input: {
  customer?: Customer | null;
  profile?: CustomerMeasurementProfile | null;
  order?: Order | null;
}): GarmentSpecification {
  return buildGarmentSpecification({
    order: input.order,
    profile: input.profile,
    customerId: input.customer?.id,
  });
}

export function runPatternFromSpecification(spec: GarmentSpecification) {
  const output = requestPattern({
    kind: spec.patternKind,
    measurements: specificationMeasurementMap(spec),
  });
  return { output, summary: summarizePattern(output.result) };
}

export function runProductionFromSpecification(
  spec: GarmentSpecification,
  extras?: { inspiration?: DesignInspiration | null }
): ProductionPlan {
  return requestProductionPlan({
    garmentType: spec.garmentType,
    measurements: specificationMeasurementMap(spec) as Partial<GarmentMeasurements>,
    inspiration: extras?.inspiration,
  });
}

export async function persistSpecificationSnapshot(
  spec: GarmentSpecification,
  repository?: EntityRepository
) {
  const repo = repository || getDataAuthorityRuntime()?.repositories.garment;
  if (!repo) {
    throw new Error('T2 data authority runtime is not started');
  }
  return repo.create({
    kind: 'GarmentSpecification',
    customerId: spec.customerId,
    orderId: spec.orderId,
    garmentType: spec.garmentType,
    measurementProfileId: spec.measurementProfileId,
    measurementVersionCapturedAt: spec.measurementVersionCapturedAt,
    patternKind: spec.patternKind,
    body: spec.separated.body,
    garment: spec.separated.garment,
    pattern: spec.separated.pattern,
  } as unknown as Record<string, unknown>);
}

export function historicalSnapshotIntact(
  order: Order,
  currentProfile?: CustomerMeasurementProfile | null
): boolean {
  const frozen = order.measurementSnapshot;
  if (!frozen) return true;
  if (!currentProfile) return true;
  const frozenBust = frozen.bust;
  const liveBust = currentProfile.measurements?.bust;
  if (typeof frozenBust === 'number' && typeof liveBust === 'number') {
    return frozenBust === liveBust || Boolean(frozen.capturedAt);
  }
  return Boolean(frozen.capturedAt || frozen.profileId);
}

export function workflowNextActions(input: {
  customerId: string | null;
  profileId: string | null;
  orderId: string | null;
  specification: GarmentSpecification | null;
  patternPresent: boolean;
  productionPlanPresent: boolean;
}): string[] {
  const actions: string[] = [];
  if (!input.customerId) actions.push('Select a studio customer (AppContext population).');
  if (!input.profileId) actions.push('Select a measurement profile.');
  if (!input.orderId) actions.push('Select an order.');
  if (input.orderId && input.profileId && !input.specification?.measurementVersionCapturedAt) {
    actions.push('Freeze the measurement version onto the order.');
  }
  if (input.specification && !input.patternPresent) {
    actions.push('Generate a pattern via the T3 wrapper.');
  }
  if (input.orderId && !input.productionPlanPresent) {
    actions.push('Attach a production plan via the T3 wrapper.');
  }
  if (!actions.length) actions.push('Review production stages through delivery.');
  return actions;
}
