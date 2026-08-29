/**
 * Phase 15 — Pattern Intelligence Main Orchestrator.
 *
 * Orchestrates the full Pattern & Cutting Intelligence workflow:
 * 1. Pattern Readiness assessment
 * 2. Measurement completeness check with explicit [Use Estimate] / [Enter Manually] offers
 * 3. Pattern derivation (via PatternAdapter → patternEngine.ts)
 * 4. Pattern piece display with bounding boxes, grainline, constraints
 * 5. Cutting layout computation (greedy nesting)
 * 6. Layout visualization and validation
 * 7. Cutting instructions display
 * 8. Full traceability chain display
 *
 * CONSTRAINTS:
 * - patternEngine.ts ZERO DIFF — all engine calls via patternAdapter.ts
 * - Never silently use measurement defaults — always offer [Use Estimate] / [Enter Manually]
 * - Layout length labeled "CUTTING LAYOUT LENGTH" — never "FINAL FABRIC YARDAGE"
 * - Pattern matching geometry never faked — flag for manual verification
 * - Tailor is authoritative on all measurements and layout decisions
 * - Offline-first: uses Dexie v5 for persistence
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';
import {
  validateMeasurementCompleteness,
  mapGarmentCategory,
} from '../../modules/services/patternAdapter';
import {
  derivePatternModel,
  listLocalPatternModels,
} from '../../modules/services/patternIntelligenceService';
import {
  computeCuttingLayout,
  listLocalCuttingLayouts,
} from '../../modules/services/cuttingLayoutService';
import { generateCuttingInstructions } from '../../modules/services/cuttingInstructionsService';
import type {
  PatternModel,
  CuttingLayout,
  CuttingInstructionSet,
  MissingMeasurement,
} from '../../shared/api/pattern';
import PatternPiecesPanel from './PatternPiecesPanel';
import CuttingLayoutPanel from './CuttingLayoutPanel';
import CuttingInstructionsPanel from './CuttingInstructionsPanel';
import PatternReadinessPanel from './PatternReadinessPanel';
import MeasurementResolutionPanel from './MeasurementResolutionPanel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PatternIntelligenceProps {
  customerId: string;
  workspaceId: string;
  designSpec: DesignSpecification;
  fabricProfile?: FabricProfile | null;
  /** Called when pattern model is derived (for parent state updates). */
  onPatternDerived?: (model: PatternModel) => void;
  /** Called when cutting layout is computed. */
  onLayoutComputed?: (layout: CuttingLayout) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type WorkflowStep = 'readiness' | 'measurements' | 'pieces' | 'layout' | 'instructions' | 'traceability';

export default function PatternIntelligence({
  customerId,
  workspaceId,
  designSpec,
  fabricProfile,
  onPatternDerived,
  onLayoutComputed,
}: PatternIntelligenceProps) {
  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('readiness');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Domain state
  const [patternModel, setPatternModel] = useState<PatternModel | null>(null);
  const [cuttingLayout, setCuttingLayout] = useState<CuttingLayout | null>(null);
  const [instructionSet, setInstructionSet] = useState<CuttingInstructionSet | null>(null);

  // Measurement resolution state
  const [acceptedDefaults, setAcceptedDefaults] = useState<Array<{ code: string; defaultCm: number }>>([]);
  const [tailorOverrides, setTailorOverrides] = useState<Array<{ code: string; valueCm: number }>>([]);

  // Compute mapping and completeness for display
  const { kind: engineKind, warning: kindWarning } = mapGarmentCategory(designSpec.garment.category);
  const body = designSpec.measurementContext?.body ?? {};
  const garment = designSpec.measurementContext?.garment;
  const completeness = validateMeasurementCompleteness(engineKind, body, garment);

  // Fabric width for layout
  const fabricWidthCm = fabricProfile?.width?.value != null && fabricProfile?.width?.unit === 'cm'
    ? fabricProfile.width.value
    : 115;

  // Load existing models on mount
  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      try {
        const models = await listLocalPatternModels(customerId, workspaceId);
        const latest = models.find(
          (m) => m.designSpecificationId === designSpec.id && m.status !== 'superseded',
        );
        if (latest && !cancelled) {
          setPatternModel(latest);
          setStep('pieces');

          // Load existing layout
          const layouts = await listLocalCuttingLayouts(latest.id, workspaceId);
          if (layouts.length > 0 && !cancelled) {
            const latestLayout = layouts[0];
            setCuttingLayout(latestLayout);
            setStep('layout');
          }
        }
      } catch {
        // Offline — no existing data
      }
    }
    loadExisting();
    return () => { cancelled = true; };
  }, [customerId, workspaceId, designSpec.id]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleDerivePattern = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Check if required measurements are satisfied (have values OR accepted defaults)
      const requiredMissing = completeness.missing.filter(
        (m) => m.severity === 'required' &&
          !acceptedDefaults.some((d) => d.code === m.code) &&
          !tailorOverrides.some((o) => o.code === m.code),
      );
      if (requiredMissing.length > 0) {
        setStep('measurements');
        setError(
          `${requiredMissing.length} required measurement(s) need resolution before pattern can be derived.`,
        );
        return;
      }

      const model = await derivePatternModel(designSpec, customerId, workspaceId, {
        defaultsAccepted: acceptedDefaults,
        tailorOverrides,
        fabricProfile,
        name: `Pattern — ${designSpec.name || designSpec.garment.category}`,
      });

      setPatternModel(model);
      setStep('pieces');
      onPatternDerived?.(model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pattern derivation failed');
    } finally {
      setIsLoading(false);
    }
  }, [designSpec, customerId, workspaceId, fabricProfile, acceptedDefaults, tailorOverrides, completeness.missing, onPatternDerived]);

  const handleComputeLayout = useCallback(async () => {
    if (!patternModel) return;
    setError(null);
    setIsLoading(true);
    try {
      const layout = await computeCuttingLayout(patternModel, customerId, workspaceId, {
        fabricProfile,
        layoutWidthCm: fabricWidthCm,
        marginCm: 2,
      });
      setCuttingLayout(layout);
      setStep('layout');
      onLayoutComputed?.(layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layout computation failed');
    } finally {
      setIsLoading(false);
    }
  }, [patternModel, customerId, workspaceId, fabricProfile, fabricWidthCm, onLayoutComputed]);

  const handleGenerateInstructions = useCallback(() => {
    if (!patternModel) return;
    const set = generateCuttingInstructions(
      patternModel,
      workspaceId,
      cuttingLayout,
      fabricProfile,
    );
    setInstructionSet(set);
    setStep('instructions');
  }, [patternModel, workspaceId, cuttingLayout, fabricProfile]);

  const handleAcceptDefault = useCallback((m: MissingMeasurement) => {
    if (m.engineDefaultCm === null) return;
    setAcceptedDefaults((prev) => {
      const without = prev.filter((d) => d.code !== m.code);
      return [...without, { code: m.code, defaultCm: m.engineDefaultCm! }];
    });
    setTailorOverrides((prev) => prev.filter((o) => o.code !== m.code));
  }, []);

  const handleTailorOverride = useCallback((code: string, valueCm: number) => {
    setTailorOverrides((prev) => {
      const without = prev.filter((o) => o.code !== code);
      return [...without, { code, valueCm }];
    });
    setAcceptedDefaults((prev) => prev.filter((d) => d.code !== code));
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const canDerivePattern = completeness.engineCanRun;
  const hasRequiredGaps = completeness.missing.filter((m) =>
    m.severity === 'required' &&
    !acceptedDefaults.some((d) => d.code === m.code) &&
    !tailorOverrides.some((o) => o.code === m.code),
  ).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Pattern Intelligence</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pattern derivation for {designSpec.name || designSpec.garment.category}
          </p>
        </div>
        {kindWarning && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 max-w-xs">
            {kindWarning}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Step nav */}
      <StepNav
        step={step}
        onStep={setStep}
        hasPatternModel={!!patternModel}
        hasCuttingLayout={!!cuttingLayout}
        hasInstructions={!!instructionSet}
      />

      {/* Readiness */}
      {step === 'readiness' && (
        <PatternReadinessPanel
          completeness={completeness}
          engineKind={engineKind}
          designSpec={designSpec}
          fabricProfile={fabricProfile}
          acceptedDefaults={acceptedDefaults}
          tailorOverrides={tailorOverrides}
          hasRequiredGaps={hasRequiredGaps}
          onResolveMeasurements={() => setStep('measurements')}
          onDerivePattern={handleDerivePattern}
          isLoading={isLoading}
        />
      )}

      {/* Measurement resolution */}
      {step === 'measurements' && (
        <MeasurementResolutionPanel
          missing={completeness.missing}
          acceptedDefaults={acceptedDefaults}
          tailorOverrides={tailorOverrides}
          onAcceptDefault={handleAcceptDefault}
          onTailorOverride={handleTailorOverride}
          onProceed={() => setStep('readiness')}
        />
      )}

      {/* Pattern pieces */}
      {step === 'pieces' && patternModel && (
        <PatternPiecesPanel
          model={patternModel}
          onComputeLayout={handleComputeLayout}
          onViewReadiness={() => setStep('readiness')}
          isLoading={isLoading}
        />
      )}

      {/* Cutting layout */}
      {step === 'layout' && patternModel && (
        <CuttingLayoutPanel
          model={patternModel}
          layout={cuttingLayout}
          fabricProfile={fabricProfile}
          onGenerateInstructions={handleGenerateInstructions}
          onRecomputeLayout={handleComputeLayout}
          isLoading={isLoading}
        />
      )}

      {/* Cutting instructions */}
      {step === 'instructions' && patternModel && (
        <CuttingInstructionsPanel
          model={patternModel}
          layout={cuttingLayout}
          instructionSet={instructionSet}
          fabricProfile={fabricProfile}
          onViewTraceability={() => setStep('traceability')}
        />
      )}

      {/* Traceability */}
      {step === 'traceability' && patternModel && (
        <TraceabilityPanel
          model={patternModel}
          layout={cuttingLayout}
          designSpec={designSpec}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------

interface StepNavProps {
  step: WorkflowStep;
  onStep: (s: WorkflowStep) => void;
  hasPatternModel: boolean;
  hasCuttingLayout: boolean;
  hasInstructions: boolean;
}

function StepNav({ step, onStep, hasPatternModel, hasCuttingLayout, hasInstructions }: StepNavProps) {
  const steps: Array<{ id: WorkflowStep; label: string; enabled: boolean }> = [
    { id: 'readiness', label: 'Readiness', enabled: true },
    { id: 'measurements', label: 'Measurements', enabled: true },
    { id: 'pieces', label: 'Pattern Pieces', enabled: hasPatternModel },
    { id: 'layout', label: 'Cutting Layout', enabled: hasCuttingLayout },
    { id: 'instructions', label: 'Instructions', enabled: hasInstructions },
    { id: 'traceability', label: 'Traceability', enabled: hasPatternModel },
  ];

  return (
    <nav className="flex gap-1 flex-wrap" aria-label="Pattern workflow steps">
      {steps.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => s.enabled && onStep(s.id)}
          disabled={!s.enabled}
          className={[
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            step === s.id
              ? 'bg-indigo-600 text-white'
              : s.enabled
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed',
          ].join(' ')}
          aria-current={step === s.id ? 'step' : undefined}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Inline Traceability Panel
// ---------------------------------------------------------------------------

interface TraceabilityPanelProps {
  model: PatternModel;
  layout: CuttingLayout | null;
  designSpec: DesignSpecification;
}

function TraceabilityPanel({ model, layout, designSpec }: TraceabilityPanelProps) {
  return (
    <section aria-label="Pattern traceability chain">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Traceability Chain</h3>
      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
        <TraceabilityRow label="Customer" value={model.customerId ?? '—'} />
        <TraceabilityRow label="Measurement Profile" value={`${model.measurementProfileId} (v${model.measurementProfileVersion})`} />
        <TraceabilityRow label="Design Specification" value={`${designSpec.id} (v${designSpec.version})`} />
        <TraceabilityRow label="Pattern Model" value={`${model.id} (v${model.version})`} />
        <TraceabilityRow label="Engine Kind" value={model.engineKind} />
        <TraceabilityRow label="Garment Category" value={model.garmentCategory} />
        <TraceabilityRow label="Pattern Status" value={model.status} />
        <TraceabilityRow
          label="Cutting Layout"
          value={layout ? `${layout.id} — ${layout.layoutEnvelopeCm} cm envelope` : 'Not computed yet'}
        />
        <TraceabilityRow
          label="Ease Applied"
          value={model.derivationContext.easeApplied
            .map((e) => `${e.area}: +${e.valueCm} cm (${e.source})`)
            .join(', ') || 'None'}
        />
        <TraceabilityRow
          label="Defaults Accepted"
          value={model.derivationContext.defaultsAccepted.length > 0
            ? model.derivationContext.defaultsAccepted
                .map((d) => `${d.code}: ${d.defaultCm} cm`)
                .join(', ')
            : 'None — all measurements provided'}
        />
        <TraceabilityRow label="Pattern Derived" value={model.createdAt} />
        {layout && <TraceabilityRow label="Layout Computed" value={layout.createdAt} />}
      </div>
    </section>
  );
}

function TraceabilityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-44 flex-shrink-0 text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-xs text-gray-900 font-mono break-all">{value}</dd>
    </div>
  );
}
