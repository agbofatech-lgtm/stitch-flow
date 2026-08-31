import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requestPattern } from '../domain/pattern/gateway';
import { requestProductionPlan } from '../domain/production/gateway';
import { MemoryStore } from '../shared/persistence/memoryStore';
import { EntityRepository } from '../shared/persistence/repository';
import { migrateLocalSchema } from '../shared/persistence/schema';
import { buildGarmentSpecification, orderStatusWorkflowLabel } from '../domain/garment/specification';
import {
  historicalSnapshotIntact,
  persistSpecificationSnapshot,
  runPatternFromSpecification,
  runProductionFromSpecification,
  workflowNextActions,
} from './orchestrate';
import type { CustomerMeasurementProfile, Order } from '../shared/types';

const SAMPLE = {
  bust: 90,
  chest: 90,
  waist: 72,
  hip: 98,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  bustSpan: 11,
  armholeDepth: 22,
  sleeve: 24,
  thigh: 58,
  knee: 42,
  ankle: 28,
  trouserLength: 108,
  skirtLength: 75,
};

function sampleOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    workspaceId: 'ws-1',
    customerId: 'cust-1',
    assignedTo: null,
    orderNumber: 'SF-1',
    status: 'draft',
    orderType: 'custom',
    dueDate: null,
    notes: '',
    garmentType: 'shirt',
    subtotal: 0,
    taxTotal: 0,
    discountTotal: 0,
    totalAmount: 0,
    createdAt: new Date('2026-08-31T00:00:00.000Z'),
    ...overrides,
  };
}

function sampleProfile(overrides: Partial<CustomerMeasurementProfile> = {}): CustomerMeasurementProfile {
  return {
    id: 'profile-1',
    workspaceId: 'ws-1',
    customerId: 'cust-1',
    label: 'Default',
    profileType: 'shirt',
    measurements: SAMPLE,
    isDefault: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

test('garment specification separates body vs garment and maps shirt kind', () => {
  const spec = buildGarmentSpecification({
    order: sampleOrder(),
    profile: sampleProfile(),
    customerId: 'cust-1',
  });
  assert.equal(spec.patternKind, 'shirt');
  assert.equal(spec.separated.body.class, 'body');
  assert.equal(spec.separated.garment.class, 'garment');
  assert.equal(spec.separated.body.fields.bust, 90);
  assert.equal(spec.separated.garment.fields.trouserLength, 108);
  assert.equal(spec.separated.pattern?.derivedFrom, 'body+garment');
});

test('order workflow labels stay on existing statuses', () => {
  assert.equal(orderStatusWorkflowLabel('draft'), 'Draft / early workflow');
  assert.equal(orderStatusWorkflowLabel('in_progress'), 'In production');
  assert.equal(orderStatusWorkflowLabel('ready'), 'Ready for delivery');
  assert.equal(orderStatusWorkflowLabel('delivered'), 'Delivered');
  assert.equal(orderStatusWorkflowLabel('cancelled'), 'Cancelled');
});

test('historical snapshot remains intact when live profile later changes', () => {
  const order = sampleOrder({
    measurementSnapshot: {
      bust: 90,
      profileId: 'profile-1',
      capturedAt: new Date('2026-08-10T00:00:00.000Z'),
    },
  });
  const live = sampleProfile({ measurements: { ...SAMPLE, bust: 104 } });
  assert.equal(historicalSnapshotIntact(order, live), true);
});

test('pattern from specification matches T3 gateway (engine not rewritten)', () => {
  const spec = buildGarmentSpecification({
    order: sampleOrder({ garmentType: 'bodice' }),
    profile: sampleProfile(),
  });
  const wrapped = requestPattern({ kind: spec.patternKind, measurements: SAMPLE }).result;
  const viaWorkflow = runPatternFromSpecification(spec).output.result;
  assert.deepEqual(viaWorkflow, wrapped);
});

test('production from specification matches T3 gateway except generatedAt', () => {
  const spec = buildGarmentSpecification({
    order: sampleOrder({ garmentType: 'shirt' }),
    profile: sampleProfile(),
  });
  const direct = requestProductionPlan({ garmentType: 'shirt', measurements: SAMPLE });
  const viaWorkflow = runProductionFromSpecification(spec);
  const { generatedAt: _a, ...directRest } = direct;
  const { generatedAt: _b, ...workflowRest } = viaWorkflow;
  assert.deepEqual(workflowRest, directRest);
});

test('specification snapshot writes to T2 garment repository, not localStorage', async () => {
  const store = new MemoryStore();
  await migrateLocalSchema(store);
  const repo = new EntityRepository(store, 'garment');
  const spec = buildGarmentSpecification({
    order: sampleOrder(),
    profile: sampleProfile(),
  });
  const created = await persistSpecificationSnapshot(spec, repo);
  assert.ok(created);
  const loaded = await repo.get(created!.metadata.localId);
  const payload = loaded?.payload as { kind: string; patternKind: string };
  assert.equal(payload.kind, 'GarmentSpecification');
  assert.equal(payload.patternKind, 'shirt');
  assert.equal(typeof localStorage, 'undefined');
});

test('next actions follow the existing chain without invented states', () => {
  const actions = workflowNextActions({
    customerId: null,
    profileId: null,
    orderId: null,
    specification: null,
    patternPresent: false,
    productionPlanPresent: false,
  });
  assert.ok(actions[0]?.includes('customer'));
});

test('workflow modules do not add localStorage or a router', () => {
  const files = ['orchestrate.ts', 'WorkflowContext.tsx', 'WorkflowPanel.tsx'];
  for (const file of files) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.equal(source.includes('localStorage'), false, file);
    assert.equal(source.includes('react-router'), false, file);
    assert.equal(source.includes('createBrowserRouter'), false, file);
  }
});
