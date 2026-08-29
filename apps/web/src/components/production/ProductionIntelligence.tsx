/**
 * Phase 16 — Production Intelligence Main Orchestrator.
 *
 * Orchestrates the full Phase 16 workflow:
 * 1. Fabric consumption (from Phase 15 layoutEnvelopeCm)
 * 2. Purchasing recommendation
 * 3. Material requirements
 * 4. Cutting execution plan
 * 5. Production workflow
 * 6. Quality control
 * 7. Production readiness
 * 8. Traceability
 *
 * BOUNDARIES:
 * - productionAssistant.ts NEVER called — ZERO DIFF
 * - patternEngine.ts NEVER called — ZERO DIFF
 * - layoutEnvelopeCm is consumed as Phase 15 geometry baseline
 * - fabricRequiredCm is Phase 16 authoritative requirement
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';
import type { CuttingLayout, PatternModel } from '../../shared/api/pattern';
import type { ProductionPlan, ProductionOperationStatus, QualityCheckStatus } from '../../shared/api/production';
import { generateProductionPlan, listLocalProductionPlans } from '../../modules/services/productionPlanService';
import { transitionOperationStatus } from '../../modules/services/productionWorkflowService';
import FabricRequirementPanel from './FabricRequirementPanel';
import PurchasingPanel from './PurchasingPanel';
import ProductionWorkflowPanel from './ProductionWorkflowPanel';
import QualityControlPanel from './QualityControlPanel';
import ProductionReadinessPanel from './ProductionReadinessPanel';
import ProductionTraceabilityPanel from './ProductionTraceabilityPanel';

type WorkflowTab =
  | 'readiness'
  | 'fabric'
  | 'purchasing'
  | 'materials'
  | 'cutting'
  | 'workflow'
  | 'quality'
  | 'traceability';

export interface ProductionIntelligenceProps {
  customerId: string;
  workspaceId: string;
  designSpec: DesignSpecification;
  patternModel: PatternModel | null;
  cuttingLayout: CuttingLayout;
  fabricProfile?: FabricProfile | null;
  availableFabricCm?: number | null;
  onPlanGenerated?: (plan: ProductionPlan) => void;
}

export default function ProductionIntelligence({
  customerId,
  workspaceId,
  designSpec,
  patternModel,
  cuttingLayout,
  fabricProfile,
  availableFabricCm,
  onPlanGenerated,
}: ProductionIntelligenceProps) {
  const [tab, setTab] = useState<WorkflowTab>('readiness');
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing plan on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const plans = await listLocalProductionPlans(customerId, workspaceId);
        const existing = plans.find(
          (p) => p.cuttingLayoutId === cuttingLayout.id && p.status !== 'blocked',
        );
        if (existing && !cancelled) {
          setPlan(existing);
          setTab('fabric');
        }
      } catch { /* offline */ }
    }
    load();
    return () => { cancelled = true; };
  }, [customerId, workspaceId, cuttingLayout.id]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const generated = await generateProductionPlan({
        customerId,
        workspaceId,
        designSpec,
        patternModel,
        cuttingLayout,
        fabricProfile: fabricProfile ?? null,
        availableFabricCm: availableFabricCm ?? null,
      });
      setPlan(generated);
      setTab('fabric');
      onPlanGenerated?.(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Production plan generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, workspaceId, designSpec, patternModel, cuttingLayout, fabricProfile, availableFabricCm, onPlanGenerated]);

  const handleOperationStatus = useCallback((operationId: string, newStatus: ProductionOperationStatus) => {
    if (!plan) return;
    const op = plan.operations.find((o) => o.id === operationId);
    if (!op) return;
    const { ok, updated, error: err } = transitionOperationStatus(op, newStatus, plan.operations);
    if (!ok) { setError(err ?? 'Invalid transition'); return; }
    const updatedPlan = {
      ...plan,
      operations: plan.operations.map((o) => o.id === operationId ? updated : o),
    };
    setPlan(updatedPlan);
  }, [plan]);

  const handleQualityStatus = useCallback((checkpointId: string, status: QualityCheckStatus, failureReason?: string) => {
    if (!plan) return;
    const updatedPlan = {
      ...plan,
      qualityCheckpoints: plan.qualityCheckpoints.map((qc) =>
        qc.id === checkpointId ? { ...qc, status, failureReason: failureReason ?? null } : qc,
      ),
    };
    setPlan(updatedPlan);
  }, [plan]);

  const tabs: Array<{ id: WorkflowTab; label: string; enabled: boolean }> = [
    { id: 'readiness', label: 'Readiness', enabled: true },
    { id: 'fabric', label: 'Fabric Requirement', enabled: !!plan },
    { id: 'purchasing', label: 'Purchasing', enabled: !!plan?.purchasingRecommendation },
    { id: 'materials', label: 'Materials', enabled: !!plan },
    { id: 'cutting', label: 'Cutting Plan', enabled: !!plan },
    { id: 'workflow', label: 'Workflow', enabled: !!plan },
    { id: 'quality', label: 'Quality Control', enabled: !!plan },
    { id: 'traceability', label: 'Traceability', enabled: !!plan },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Production Intelligence</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {designSpec.name || designSpec.garment?.category} · Phase 16
          </p>
        </div>
        {plan && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {/* Tab nav */}
      <nav className="flex gap-1 flex-wrap" aria-label="Production workflow tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => t.enabled && setTab(t.id)}
            disabled={!t.enabled}
            aria-current={tab === t.id ? 'page' : undefined}
            className={[
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              tab === t.id ? 'bg-indigo-600 text-white' : t.enabled ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {tab === 'readiness' && (
        <ProductionReadinessPanel
          readiness={plan?.readiness ?? buildPreviewReadiness(designSpec, patternModel, cuttingLayout, !!fabricProfile)}
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />
      )}

      {tab === 'fabric' && plan && (
        <FabricRequirementPanel consumption={plan.fabricConsumption} />
      )}

      {tab === 'purchasing' && plan?.purchasingRecommendation && (
        <PurchasingPanel rec={plan.purchasingRecommendation} />
      )}

      {tab === 'materials' && plan && (
        <MaterialsPanel materials={plan.materials} />
      )}

      {tab === 'cutting' && plan && (
        <CuttingExecutionPlanDisplay steps={plan.cuttingExecutionPlan} />
      )}

      {tab === 'workflow' && plan && (
        <ProductionWorkflowPanel
          operations={plan.operations}
          onStatusChange={handleOperationStatus}
        />
      )}

      {tab === 'quality' && plan && (
        <QualityControlPanel
          checkpoints={plan.qualityCheckpoints}
          onStatusChange={handleQualityStatus}
        />
      )}

      {tab === 'traceability' && plan && (
        <ProductionTraceabilityPanel traceability={plan.traceability} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

export function MaterialsPanel({ materials }: { materials: ProductionPlan['materials'] }) {
  return (
    <section aria-label="Materials" className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Material Requirements</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-md">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-3 py-2 font-medium">Material</th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-right px-3 py-2 font-medium">Qty</th>
              <th className="text-left px-3 py-2 font-medium">Unit</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
              <th className="text-left px-3 py-2 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materials.map((m) => (
              <tr key={m.id} className={`hover:bg-gray-50 ${!m.required ? 'opacity-70' : ''}`}>
                <td className="px-3 py-1.5 text-gray-900">{m.name}</td>
                <td className="px-3 py-1.5 text-gray-600 capitalize">{m.category.replace('_', ' ')}</td>
                <td className="px-3 py-1.5 text-right font-mono text-gray-900">{m.quantity}</td>
                <td className="px-3 py-1.5 text-gray-600">{m.unit}</td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{m.source.replace('_', ' ')}</td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{m.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Sources labeled — garment defaults are approximate. Confirm with design specification.</p>
    </section>
  );
}

export function CuttingExecutionPlanDisplay({ steps }: { steps: ProductionPlan['cuttingExecutionPlan'] }) {
  return (
    <section aria-label="Cutting execution plan" className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Cutting Execution Plan</h3>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.code} className="flex gap-3 items-start bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-sm font-bold text-gray-400 w-5 flex-shrink-0 mt-0.5">{step.order}.</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {step.title}
                {step.verificationRequired && (
                  <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">Verify</span>
                )}
                {!step.required && (
                  <span className="ml-2 text-xs font-normal text-gray-500">(optional)</span>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Build a preview readiness before plan is generated. */
function buildPreviewReadiness(
  spec: DesignSpecification,
  patternModel: PatternModel | null,
  layout: CuttingLayout,
  hasFabric: boolean,
): import('../../shared/api/production').ProductionReadiness {
  const now = new Date().toISOString();
  return {
    overallStatus: patternModel && layout.isValid ? 'attention_required' : 'blocked',
    designReady: ['validated', 'ready_for_pattern', 'ready_for_design'].includes(spec.status),
    measurementsReady: !!spec.measurementProfileId,
    fabricReady: hasFabric && layout.isValid,
    patternReady: !!patternModel,
    layoutReady: layout.isValid,
    materialsReady: false,
    workflowReady: false,
    qualityPlanReady: false,
    blockers: patternModel && layout.isValid ? [] : [{
      code: patternModel ? 'LAYOUT_INVALID' : 'PATTERN_NOT_DERIVED',
      category: patternModel ? 'layout' : 'pattern',
      severity: 'blocking',
      message: patternModel ? 'Cutting layout has validation errors.' : 'Pattern model has not been derived.',
      resolution: patternModel ? 'Resolve layout issues in Phase 15.' : 'Derive pattern in Phase 15.',
    }],
    warnings: [],
    calculatedAt: now,
  };
}
