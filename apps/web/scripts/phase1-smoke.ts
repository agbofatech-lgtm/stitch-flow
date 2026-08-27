/**
 * Phase 1 smoke test — exercises the repaired canonical measurement model,
 * the protected pattern engine / production assistant, production alerts,
 * reporting utils, and localStorage persistence round-trip (memory fallback).
 * Run: npx tsx scripts/phase1-smoke.ts (from apps/web)
 */
import {
  generateStylePattern,
  generateBodicePattern,
  type StylePatternKind,
} from '../src/modules/services/patternEngine';
import {
  analyzeDesignInspiration,
  generateProductionPlan,
  inferGarmentTypeFromInspiration,
  estimateFabricRequirement,
} from '../src/modules/services/productionAssistant';
import { checkOverdueStages, getOrderAlerts } from '../src/shared/utils/productionAlerts';
import {
  filterOrdersByDateRange,
  getOverdueOrdersCount,
} from '../src/shared/utils/reporting';
import { customerMeasurementProfiles } from '../src/data/mockData';
import { initializeAppStorage, saveAppStorage } from '../src/shared/lib/db';
import { safeCurrency, formatCurrency } from '../src/shared/utils/currency';
import type { Order, DesignInspiration } from '../src/types';

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${name}:`, err instanceof Error ? err.message : err);
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

console.log('== Canonical measurement model ==');
check('mock profiles use nested measurements with canonical fields', () => {
  assert(customerMeasurementProfiles.length === 5, 'expected 5 mock profiles');
  for (const profile of customerMeasurementProfiles) {
    assert(profile.measurements, `profile ${profile.label} missing measurements`);
    assert(profile.workspaceId, 'missing workspaceId');
    assert(profile.profileType, 'missing profileType');
  }
  const bridal = customerMeasurementProfiles[0];
  assert(bridal.measurements.bust === 92, 'bridal bust should be 92');
  assert(bridal.measurements.waist === 68, 'bridal waist should be 68');
});

console.log('== Pattern engine (protected IP) ==');
const bridalMeasurements = customerMeasurementProfiles[0].measurements;
check('bodice pattern generates from canonical profile measurements', () => {
  const result = generateBodicePattern({
    bust: bridalMeasurements.bust!,
    waist: bridalMeasurements.waist!,
    neck: bridalMeasurements.neck!,
    shoulder: bridalMeasurements.shoulder!,
    backLength: bridalMeasurements.backLength!,
    bustSpan: bridalMeasurements.bustSpan,
    armholeDepth: bridalMeasurements.armholeDepth,
  });
  assert(result.points.length > 0, 'no points');
  assert(result.controlPoints.A, 'missing control point A');
  assert(Number.isFinite(result.measurements.quarterBust), 'bad quarterBust');
});

for (const kind of ['bodice', 'shirt', 'trouser', 'skirt', 'kaftan'] as StylePatternKind[]) {
  check(`generateStylePattern('${kind}') does not throw and yields geometry`, () => {
    const result = generateStylePattern(kind, {
      bust: 92, chest: 96, waist: 76, hip: 100, neck: 38, shoulder: 12,
      backLength: 40, bustSpan: 18, armholeDepth: 21, sleeve: 60,
      thigh: 58, knee: 40, ankle: 24, trouserLength: 100, skirtLength: 60,
      inseam: 78, crotchDepth: 27, fullLength: 140,
    });
    const pts = 'outline' in result ? result.outline : result.points;
    assert(pts.length > 2, 'insufficient geometry');
  });
}

console.log('== Production assistant (protected IP) ==');
const inspiration: DesignInspiration = {
  id: 'insp-1',
  workspaceId: 'ws-1',
  title: 'Kente occasion gown',
  category: 'gown',
  status: 'approved',
  imageUrl: null,
  notes: 'floor length, structured bodice',
  tags: ['gown', 'occasion'],
  createdAt: new Date(),
} as unknown as DesignInspiration;

check('inferGarmentTypeFromInspiration + analyze + generateProductionPlan', () => {
  const garmentType = inferGarmentTypeFromInspiration(inspiration);
  assert(garmentType, 'no garment type inferred');
  const analysis = analyzeDesignInspiration(inspiration);
  assert(analysis.complexityLevel, 'no complexityLevel');
  assert(analysis.suggestedGarmentType, 'no suggestedGarmentType');
  const plan = generateProductionPlan({
    garmentType,
    measurements: bridalMeasurements,
    inspiration,
    analysis,
    selectedFabric: null,
  });
  assert(plan.cuttingList.length > 0, 'empty cutting list');
  assert(plan.sewingChecklist.length > 0, 'empty sewing checklist');
  assert(plan.fabricEstimate, 'no fabric estimate');
});

check('estimateFabricRequirement returns finite quantities', () => {
  const estimate = estimateFabricRequirement({
    garmentType: 'dress',
    measurements: bridalMeasurements,
  });
  assert(Number.isFinite(estimate.mainFabricQty) && estimate.mainFabricQty > 0, 'bad mainFabricQty');
  assert(estimate.unit, 'no unit');
});

console.log('== Production alerts ==');
check('checkOverdueStages returns a clean StageOverdueAlert[] (no nulls)', () => {
  const past = new Date(Date.now() - 10 * 24 * 3600 * 1000);
  const order = {
    id: 'o-1',
    status: 'in_progress',
    dueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    productionStages: [
      { code: 'cutting', label: 'Cutting', status: 'active', startedAt: past, notes: '' },
      { code: 'sewing', label: 'Sewing', status: 'pending', startedAt: null, notes: '' },
    ],
  } as unknown as Order;
  const alerts = checkOverdueStages(order);
  assert(Array.isArray(alerts), 'not an array');
  assert(alerts.every((a) => a !== null && typeof a === 'object'), 'null alert leaked');
  assert(alerts.length >= 1, 'expected at least one overdue alert');
  assert(alerts[0].daysOverdue > 0, 'daysOverdue not positive');
  const summary = getOrderAlerts(order);
  assert(summary.hasOverdueStages, 'summary should flag overdue stages');
});

console.log('== Reporting (Date|string temporal model) ==');
check('reporting utils accept domain orders (Date) and API orders (string)', () => {
  const domainOrder = { id: 'd1', createdAt: new Date(), dueDate: new Date(Date.now() - 86400000), status: 'in_progress' };
  const apiOrder = { id: 'a1', createdAt: new Date().toISOString(), dueDate: null, status: 'draft' };
  const filtered = filterOrdersByDateRange([domainOrder, apiOrder], {});
  assert(filtered.length === 2, 'filter dropped valid orders');
  const overdue = getOverdueOrdersCount([domainOrder, apiOrder]);
  assert(overdue >= 1, 'expected overdue count');
});

console.log('== Persistence round-trip (memory storage fallback) ==');
check('app storage initialize + save + measurements survive reload', () => {
  const first = initializeAppStorage();
  assert(first.customers.length > 0, 'no seeded customers');
  // seed starts with zero profiles by design; add one (canonical nested shape)
  first.measurementProfiles = [
    {
      ...customerMeasurementProfiles[0],
      id: 'smoke-profile-1',
      customerId: first.customers[0].id,
    },
  ];
  saveAppStorage(first);
  const second = initializeAppStorage();
  const restored = second.measurementProfiles.find((p) => p.id === 'smoke-profile-1');
  assert(restored, 'profile did not survive reload');
  assert(restored.measurements, 'profile lost nested measurements on reload');
  assert(restored.measurements.bust === 92, 'bust did not survive reload');
  assert(restored.createdAt instanceof Date, 'createdAt not revived as Date');
});

console.log('== Currency narrowing ==');
check('safeCurrency + formatCurrency handle arbitrary strings', () => {
  assert(safeCurrency('GHS') === 'GHS', 'GHS rejected');
  assert(safeCurrency('XXX') === 'GHS', 'invalid code should fall back to GHS');
  assert(formatCurrency(1234.5, safeCurrency('NGN')).includes('NGN'), 'NGN format');
});

console.log('');
if (failures > 0) {
  console.error(`SMOKE RESULT: FAIL (${failures} failing check(s))`);
  process.exit(1);
}
console.log('SMOKE RESULT: PASS');
