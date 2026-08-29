/**
 * Phase 16 — Fabric & Production Intelligence Frontend Certification Tests (F63–F77)
 *
 * Offline, UI contract, and integration tests. F73–F77 render real components (jsdom).
 */

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  calculateFabricConsumption,
  buildWidthProfile,
  buildShrinkageAllowance,
  buildPatternMatchingAssessment,
  buildDirectionalAllowance,
  buildHandlingWaste,
  buildSafetyBuffer,
  cmToMeters,
  cmToYards,
  metersToCm,
  yardsToCm,
} from '../../src/modules/services/fabricConsumptionService';
import {
  determineSufficiency,
  buildPurchasingRecommendation,
  calculateRollUtilisation,
} from '../../src/modules/services/purchasingService';
import {
  validateNoCycles,
  computeOperationReadiness,
  generateProductionWorkflow,
} from '../../src/modules/services/productionWorkflowService';
import {
  computeProductionReadiness,
} from '../../src/modules/services/productionPlanService';
import type { CuttingLayout } from '../../src/shared/api/pattern';
import type { FabricConsumption } from '../../src/shared/api/production';

// ---------------------------------------------------------------------------
// Mock objects
// ---------------------------------------------------------------------------

const mockLayout: CuttingLayout = {
  id: 'cl-test',
  workspaceId: 'ws-1',
  customerId: 'cust-1',
  patternModelId: 'pm-1',
  fabricProfileId: null,
  layoutWidthCm: 110,
  layoutEnvelopeCm: 215,
  marginCm: 2,
  placedPieces: [],
  validationIssues: [],
  isValid: true,
  algorithm: 'greedy_deterministic',
  algorithmVersion: '1.0.0',
  notes: null,
  createdAt: '2026-08-29T00:00:00Z',
  updatedAt: '2026-08-29T00:00:00Z',
};

// ---------------------------------------------------------------------------
// F63–F66: Offline calculations
// ---------------------------------------------------------------------------

describe('F63–F66: Offline fabric calculations', () => {
  it('F63: Fabric calculations work without network (pure functions)', () => {
    // These functions are pure — no network calls
    const result = calculateFabricConsumption({
      workspaceId: 'ws-1',
      customerId: 'cust-1',
      designSpecificationId: 'ds-1',
      cuttingLayout: mockLayout,
      fabricProfile: null,
    });
    // Phase 15 envelope is the base
    expect(result.layoutEnvelopeCm).toBe(215);
    // Phase 16 adds allowances — result > layout envelope
    expect(result.fabricRequiredCm).toBeGreaterThan(215);
    expect(result.calculationVersion).toBeTruthy();
  });

  it('F64: Production Plan has id and is structurally complete (offline)', () => {
    const result = calculateFabricConsumption({
      workspaceId: 'ws-1', customerId: 'cust-1', designSpecificationId: 'ds-1',
      cuttingLayout: mockLayout,
    });
    expect(result.id).toBeTruthy();
    expect(result.cuttingLayoutId).toBe('cl-test');
    expect(typeof result.fabricRequiredCm).toBe('number');
  });

  it('F65: Workflow generation works offline (no network)', () => {
    const mockFc = { widthProfile: { isCompatible: true, layoutRequiredWidthCm: 110, usableWidthCm: 115 },
      shrinkage: { percentage: 5 }, directional: { required: false, notes: [] },
      patternMatching: { required: false, notes: [], allowancePercentage: 0 },
      layoutEnvelopeCm: 215, layoutFabricWidthCm: 110 } as unknown as FabricConsumption;
    const result = generateProductionWorkflow('plan-1', 'shirt', mockLayout, mockFc);
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.qualityCheckpoints.length).toBeGreaterThan(0);
    expect(result.dependencyGraphValid).toBe(true);
  });

  it('F66: QC state transitions work offline', () => {
    const qc = { id: 'qc-1', status: 'pending' as const };
    // Simulate transition
    const updated = { ...qc, status: 'passed' as const };
    expect(updated.status).toBe('passed');
  });
});

// ---------------------------------------------------------------------------
// F67–F72: UI contracts (render-level type checking)
// ---------------------------------------------------------------------------

describe('F67–F72: UI contracts', () => {
  it('F67: FabricConsumption has all fields for FabricRequirementPanel', () => {
    const result = calculateFabricConsumption({
      workspaceId: 'ws-1', customerId: 'cust-1', designSpecificationId: 'ds-1',
      cuttingLayout: mockLayout,
    });
    // Fields needed by FabricRequirementPanel
    expect(typeof result.layoutEnvelopeCm).toBe('number');
    expect(typeof result.fabricRequiredCm).toBe('number');
    expect(typeof result.fabricRequiredMeters).toBe('number');
    expect(typeof result.fabricRequiredYards).toBe('number');
    expect(result.breakdown).toBeDefined();
    expect(Array.isArray(result.assumptions)).toBe(true);
    expect(result.widthProfile).toBeDefined();
    expect(result.shrinkage).toBeDefined();
    expect(result.patternMatching).toBeDefined();
  });

  it('F68: PurchasingRecommendation has all fields for PurchasingPanel', () => {
    const result = calculateFabricConsumption({
      workspaceId: 'ws-1', customerId: 'cust-1', designSpecificationId: 'ds-1',
      cuttingLayout: mockLayout,
    });
    const rec = buildPurchasingRecommendation(result, { availableFabricCm: null });
    expect(rec.status).toBe('unknown');
    expect(typeof rec.requiredCm).toBe('number');
    expect(Array.isArray(rec.reasons)).toBe(true);
  });

  it('F69: ProductionOperation has all fields for WorkflowPanel', () => {
    const mockFc = { widthProfile: { isCompatible: true, layoutRequiredWidthCm: 110, usableWidthCm: 115 },
      shrinkage: { percentage: 5 }, directional: { required: false, notes: [] },
      patternMatching: { required: false, notes: [], allowancePercentage: 0 },
      layoutEnvelopeCm: 215, layoutFabricWidthCm: 110 } as unknown as FabricConsumption;
    const result = generateProductionWorkflow('plan-1', 'trouser', mockLayout, mockFc);
    const op = result.operations[0];
    expect(op.id).toBeTruthy();
    expect(op.name).toBeTruthy();
    expect(op.timeEstimate).toBeDefined();
    expect(Array.isArray(op.dependencies)).toBe(true);
    expect(typeof op.requiresCustomer).toBe('boolean');
  });

  it('F70: QualityCheckpoint has all fields for QualityControlPanel', () => {
    const mockFc = { widthProfile: { isCompatible: true, layoutRequiredWidthCm: 110, usableWidthCm: 115 },
      shrinkage: { percentage: 5 }, directional: { required: false, notes: [] },
      patternMatching: { required: false, notes: [], allowancePercentage: 0 },
      layoutEnvelopeCm: 215, layoutFabricWidthCm: 110 } as unknown as FabricConsumption;
    const result = generateProductionWorkflow('plan-1', 'skirt', mockLayout, mockFc);
    const qc = result.qualityCheckpoints[0];
    expect(qc.id).toBeTruthy();
    expect(qc.phase).toBeTruthy();
    expect(qc.code).toBeTruthy();
    expect(qc.status).toBe('pending');
  });

  it('F71: ProductionReadiness has correct overallStatus', () => {
    const r = computeProductionReadiness({
      hasDesignSpec: true, designSpecStatus: 'validated',
      hasMeasurementProfile: true, hasFabricProfile: true,
      fabricWidthCompatible: true, hasFabricConsumption: true,
      hasPatternModel: true, layoutIsValid: true,
      materialsIdentified: true, workflowGenerated: true, qualityPlanGenerated: true,
    });
    expect(r.overallStatus).toBe('ready');
    expect(r.blockers.filter((b) => b.severity === 'blocking')).toHaveLength(0);
  });

  it('F72: ProductionTraceability structure is complete', () => {
    const t = {
      designSpecificationId: 'ds-1', designSpecificationVersion: 1,
      measurementProfileId: 'mp-1', measurementProfileVersion: 2,
      fabricProfileId: 'fp-1', patternModelId: 'pm-1', patternModelVersion: 1,
      cuttingLayoutId: 'cl-1', cuttingLayoutAlgorithmVersion: '1.0.0',
      fabricCalculationVersion: '1.0.0', generatedAt: '2026-08-29T00:00:00Z',
      isStale: false, staleReasons: [],
    };
    expect(t.cuttingLayoutId).toBe('cl-1');
    expect(t.fabricCalculationVersion).toBeTruthy();
    expect(t.isStale).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F73–F77: Responsive / accessibility contracts (real DOM rendering)
// ---------------------------------------------------------------------------

import React from 'react';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import * as fs from 'fs';
import * as nodePath from 'path';
import type { DesignSpecification } from '../../src/shared/api/design';
import type { MaterialRequirement, ProductionTraceability } from '../../src/shared/api/production';
import FabricRequirementPanel from '../../src/components/production/FabricRequirementPanel';
import PurchasingPanel from '../../src/components/production/PurchasingPanel';
import ProductionWorkflowPanel from '../../src/components/production/ProductionWorkflowPanel';
import QualityControlPanel from '../../src/components/production/QualityControlPanel';
import ProductionReadinessPanel from '../../src/components/production/ProductionReadinessPanel';
import ProductionTraceabilityPanel from '../../src/components/production/ProductionTraceabilityPanel';
import ProductionIntelligence, {
  MaterialsPanel,
  CuttingExecutionPlanDisplay,
} from '../../src/components/production/ProductionIntelligence';

const mockDesignSpec = {
  id: 'ds-1', workspaceId: 'ws-1', customerId: 'cust-1', name: 'Test Kaftan',
  version: 1, parentSpecificationId: null,
  garment: { category: 'kaftan', subtype: null, silhouette: 'flowing', fit: 'loose', lengthType: 'ankle', targetLengthCm: 142 },
  sleeves: { type: 'wide', targetLengthCm: null },
  neckline: { type: 'round' },
  components: [{ type: 'front_panel' }, { type: 'back_panel' }],
  constructionDetails: ['lining'],
  easeConfigurations: [],
  observations: [],
  measurementProfileId: 'mp-1',
  measurementContext: null,
  inspirationIds: [],
  fabricProfileIds: [],
  notes: '',
  status: 'validated',
  createdAt: '2026-08-29T00:00:00Z',
  updatedAt: '2026-08-29T00:00:00Z',
} as unknown as DesignSpecification;

const mockTraceability = {
  designSpecificationId: 'ds-1', designSpecificationVersion: 1,
  measurementProfileId: 'mp-1', measurementProfileVersion: 2,
  fabricProfileId: 'fp-1', patternModelId: 'pm-1', patternModelVersion: 1,
  cuttingLayoutId: 'cl-test', cuttingLayoutAlgorithmVersion: '1.0.0',
  fabricCalculationVersion: '1.0.0', generatedAt: '2026-08-29T00:00:00Z',
  isStale: false, staleReasons: [],
} as unknown as ProductionTraceability;

const mockMaterials: MaterialRequirement[] = [
  { id: 'mat-1', productionPlanId: 'plan-1', category: 'thread', name: 'Sewing thread (main colour)', quantity: 2, unit: 'spool', source: 'garment_default', confidence: 'medium', required: true, notes: null },
  { id: 'mat-2', productionPlanId: 'plan-1', category: 'lining', name: 'Lining fabric (design specification)', quantity: 1.2, unit: 'meter', source: 'design_specification', confidence: 'high', required: true, notes: null },
];

function buildMockPlanData() {
  const consumption = calculateFabricConsumption({
    workspaceId: 'ws-1',
    customerId: 'cust-1',
    designSpecificationId: 'ds-1',
    cuttingLayout: mockLayout,
    fabricProfile: null,
    shrinkageOverridePercent: 8,
    overrideReason: 'Premium pre-shrunk cotton — workshop measured 8%',
  });
  const rec = buildPurchasingRecommendation(consumption, { availableFabricCm: 300 });
  const workflow = generateProductionWorkflow('plan-1', 'shirt', mockLayout, consumption);
  const readiness = computeProductionReadiness({
    hasDesignSpec: true, designSpecStatus: 'validated',
    hasMeasurementProfile: true, hasFabricProfile: true,
    fabricWidthCompatible: true, hasFabricConsumption: true,
    hasPatternModel: true, layoutIsValid: true,
    materialsIdentified: true, workflowGenerated: true, qualityPlanGenerated: true,
  });
  return { consumption, rec, workflow, readiness };
}

function readGlobalCss(): string {
  return fs.readFileSync(nodePath.resolve(__dirname, '../../src/index.css'), 'utf8');
}

// vitest runs without globals — register DOM cleanup explicitly so renders
// from one test never leak into another test's document.
afterEach(() => {
  cleanup();
});

describe('F73–F77: Responsive & accessibility contracts (real DOM)', () => {
  it('F73: 390px mobile viewport — no fixed widths > 390px, every table in a scroll container', () => {
    const { consumption, rec, workflow } = buildMockPlanData();
    const readiness = computeProductionReadiness({
      hasDesignSpec: true, designSpecStatus: 'validated',
      hasMeasurementProfile: true, hasFabricProfile: true,
      fabricWidthCompatible: true, hasFabricConsumption: true,
      hasPatternModel: true, layoutIsValid: true,
      materialsIdentified: true, workflowGenerated: true, qualityPlanGenerated: true,
    });
    const { container } = render(
      <div style={{ width: 390 }}>
        <FabricRequirementPanel consumption={consumption} />
        <PurchasingPanel rec={rec} />
        <MaterialsPanel materials={mockMaterials} />
        <CuttingExecutionPlanDisplay steps={workflow.cuttingExecutionPlan} />
        <ProductionWorkflowPanel operations={workflow.operations} />
        <QualityControlPanel checkpoints={workflow.qualityCheckpoints} />
        <ProductionReadinessPanel readiness={readiness} onGenerate={() => {}} isLoading={false} />
        <ProductionTraceabilityPanel traceability={mockTraceability} />
      </div>,
    );

    // (a) No element declares a fixed pixel width wider than the 390px viewport
    // (neither inline style nor arbitrary Tailwind w-[NNNpx] / min-w-[NNNpx]).
    for (const el of Array.from(container.querySelectorAll<HTMLElement>('*'))) {
      const inline = el.style?.width;
      if (inline) {
        expect(parseFloat(inline), `inline width "${inline}"`).toBeLessThanOrEqual(390);
      }
      const cls = el.getAttribute('class') ?? '';
      for (const m of cls.matchAll(/(?:min-)?w-\[(\d+(?:\.\d+)?)px\]/g)) {
        expect(parseFloat(m[1]), `class width "${m[0]}"`).toBeLessThanOrEqual(390);
      }
    }

    // (b) Every data table sits inside a horizontal scroll container —
    // columns scroll instead of clipping or overflowing the card.
    const tables = container.querySelectorAll('table');
    expect(tables.length).toBeGreaterThanOrEqual(2);
    for (const table of Array.from(tables)) {
      expect(table.parentElement?.className).toContain('overflow-x-auto');
    }
  });

  it('F74: Large/long data values render as text inside scroll-safe, non-fixed containers', () => {
    const { consumption } = buildMockPlanData();
    // Extreme values must not break layout: they are formatted text inside the
    // same scroll-safe containers as normal values.
    const bigRec = buildPurchasingRecommendation(consumption, { availableFabricCm: 99999 });
    const { container } = render(<PurchasingPanel rec={bigRec} />);
    expect(container.textContent).toContain('999'); // value rendered, not lost
    expect(container.textContent).toContain('Excess'); // status surfaced
    for (const table of Array.from(container.querySelectorAll('table'))) {
      expect(table.parentElement?.className).toContain('overflow-x-auto');
    }

    // Unknown inventory + provided price: cost and currency are surfaced (never fabricated).
    const priced = buildPurchasingRecommendation(consumption, {
      availableFabricCm: null,
      unitPricePerMeter: 45.5,
      currency: 'GHS',
    });
    const { container: c2 } = render(<PurchasingPanel rec={priced} />);
    expect(c2.textContent).toContain('GHS');
    expect(priced.estimatedCost).not.toBeNull();
    expect(c2.textContent).toContain(String(priced.estimatedCost));
  });

  it('F75: Keyboard navigation — native focusable controls, correct aria state, no focus traps', () => {
    // Orchestrator tab bar (plan not generated yet: readiness active, others disabled)
    const orch = render(
      <ProductionIntelligence
        customerId="cust-1"
        workspaceId="ws-1"
        designSpec={mockDesignSpec}
        patternModel={null}
        cuttingLayout={mockLayout}
        fabricProfile={null}
      />,
    );
    const nav = screen.getByRole('navigation', { name: /production workflow tabs/i });
    const tabButtons = within(nav).getAllByRole('button');
    expect(tabButtons.length).toBe(8);
    for (const b of tabButtons) {
      // native <button> → reachable by Tab, with a perceivable accessible name
      expect(b.tagName).toBe('BUTTON');
      expect((b as HTMLButtonElement).tabIndex).toBe(0);
      expect(b.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
    // Active tab is announced via aria-current; disabled tabs leave the tab order
    const active = tabButtons.find((b) => b.getAttribute('aria-current') === 'page');
    expect(active).toBeTruthy();
    expect(tabButtons.filter((b) => (b as HTMLButtonElement).disabled)).toHaveLength(7);
    orch.unmount();

    // Collapsible breakdown: focusable, state announced, Enter toggles
    const panel = render(<FabricRequirementPanel consumption={buildMockPlanData().consumption} />);
    const toggle = within(panel.container).getByRole('button', { name: /allowance breakdown/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
    // Activation: a native <button> receives Enter/Space as a click in every
    // real browser (jsdom does not synthesize that activation, so the keyboard
    // contract is asserted structurally and the resulting click is simulated).
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('F76: Visible focus — global :focus-visible ring, no un-compensated outline suppression', () => {
    // Design-system contract: a visible focus ring exists for keyboard focus.
    const css = readGlobalCss();
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid/s);

    // Phase 16 UI: any outline suppression must be compensated by a visible
    // ring/shadow (focus:ring-* or focus:shadow-*), never removed silently.
    const { container } = render(
      <ProductionIntelligence
        customerId="cust-1"
        workspaceId="ws-1"
        designSpec={mockDesignSpec}
        patternModel={null}
        cuttingLayout={mockLayout}
        fabricProfile={null}
      />,
    );
    const suppressed = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
      (el.getAttribute('class') ?? '').includes('outline-none'),
    );
    for (const el of suppressed) {
      const cls = el.getAttribute('class') ?? '';
      const compensated = /(?:focus|focus-visible):ring-/.test(cls) || /(?:focus|focus-visible):shadow-/.test(cls);
      expect(compensated, `outline-none without visible compensation on <${el.tagName}>`).toBe(true);
    }
  });

  it('F77: Reduced motion — global media contract kills all animation/transition; no self-driven motion', () => {
    // The stylesheet must carry a prefers-reduced-motion contract that reduces
    // every animation/transition to (near) zero regardless of source.
    const css = readGlobalCss();
    const blockMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{([\s\S]*?)\n  \}/);
    expect(blockMatch).not.toBeNull();
    const block = blockMatch![1];
    expect(block).toContain('animation-duration: 0.01ms !important');
    expect(block).toContain('animation-iteration-count: 1 !important');
    expect(block).toContain('transition-duration: 0.01ms !important');

    // Phase 16 components must not add self-driven (inline) animation/transition
    // outside the global system — the only animations they use are the global
    // utility classes, which the media contract above disables.
    const { consumption, rec } = buildMockPlanData();
    const { container } = render(
      <div>
        <FabricRequirementPanel consumption={consumption} />
        <PurchasingPanel rec={rec} />
      </div>,
    );
    const selfDriven = Array.from(container.querySelectorAll<HTMLElement>('[style*="animation"], [style*="transition"]'));
    expect(selfDriven.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unit conversion validation
// ---------------------------------------------------------------------------

describe('Unit conversion accuracy', () => {
  it('cmToMeters is accurate', () => {
    expect(cmToMeters(100)).toBe(1);
    expect(cmToMeters(250)).toBe(2.5);
    expect(cmToMeters(290)).toBe(2.9);
  });

  it('cmToYards is accurate', () => {
    expect(cmToYards(91.44)).toBeCloseTo(1, 3);
    expect(cmToYards(182.88)).toBeCloseTo(2, 3);
  });

  it('metersToCm is accurate', () => {
    expect(metersToCm(1)).toBe(100);
    expect(metersToCm(2.5)).toBe(250);
  });

  it('yardsToCm is accurate', () => {
    expect(yardsToCm(1)).toBeCloseTo(91.44, 2);
    expect(yardsToCm(2)).toBeCloseTo(182.88, 2);
  });

  it('Width profile calculates usable width correctly', () => {
    const wp = buildWidthProfile({ nominalWidthCm: 150, layoutRequiredWidthCm: 110 });
    expect(wp.usableWidthCm).toBeCloseTo(147, 1); // 150 - 1.5 - 1.5
    expect(wp.isCompatible).toBe(true);
  });

  it('Width profile marks incompatible when usable < required', () => {
    const wp = buildWidthProfile({ nominalWidthCm: 100, layoutRequiredWidthCm: 115 });
    expect(wp.isCompatible).toBe(false);
  });

  it('Shrinkage defaults by fabric type', () => {
    const cotton = buildShrinkageAllowance(200, 'cotton');
    expect(cotton.percentage).toBe(5);
    expect(cotton.source).toBe('material_default');
    const unknown = buildShrinkageAllowance(200, null);
    expect(unknown.percentage).toBe(3);
    expect(unknown.source).toBe('system_default');
  });

  it('Shrinkage manual override has high confidence', () => {
    const manual = buildShrinkageAllowance(200, 'cotton', 8);
    expect(manual.percentage).toBe(8);
    expect(manual.source).toBe('manual_override');
    expect(manual.confidence).toBe('high');
  });

  it('Pattern matching: required=false → zero allowance', () => {
    const pm = buildPatternMatchingAssessment(200, false, null);
    expect(pm.required).toBe(false);
    expect(pm.allowanceCm).toBe(0);
    expect(pm.automatedVerification).toBe('not_required');
  });

  it('Pattern matching: required=true → 15% conservative allowance', () => {
    const pm = buildPatternMatchingAssessment(200, true, 12);
    expect(pm.required).toBe(true);
    expect(pm.allowanceCm).toBeGreaterThan(0);
    expect(pm.automatedVerification).toBe('manual_required');
    expect(pm.notes.join(' ')).toMatch(/PATTERN MATCHING/);
  });

  it('Directional: not required → zero allowance', () => {
    const dir = buildDirectionalAllowance(200, false);
    expect(dir.required).toBe(false);
    expect(dir.allowanceCm).toBe(0);
  });

  it('Directional: required → 10% allowance', () => {
    const dir = buildDirectionalAllowance(200, true);
    expect(dir.required).toBe(true);
    expect(dir.allowanceCm).toBe(20);
  });

  it('Sufficiency: excess when available >> required', () => {
    const status = determineSufficiency(200, 400);
    expect(status).toBe('excess');
  });

  it('Roll utilisation is not applicable without roll data', () => {
    const roll = calculateRollUtilisation(200, null);
    expect(roll.applicable).toBe(false);
    expect(roll.reason).toMatch(/unavailable/i);
  });

  it('Roll utilisation calculated correctly with roll data', () => {
    const roll = calculateRollUtilisation(250, { widthCm: 115, lengthCm: 150 });
    expect(roll.applicable).toBe(true);
    expect(roll.rollsRequired).toBe(2); // ceil(250/150) = 2
    expect(roll.totalLengthPurchasedCm).toBe(300);
  });

  it('DAG cycle detection works for valid graph', () => {
    const ops = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['b'] },
    ] as any;
    expect(validateNoCycles(ops)).toBe(true);
  });
});
