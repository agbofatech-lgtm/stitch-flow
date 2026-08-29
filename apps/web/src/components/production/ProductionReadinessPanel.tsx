/**
 * Phase 16 — Production Readiness Panel.
 */

import React from 'react';
import type { ProductionReadiness, ProductionBlocker } from '../../shared/api/production';

const CATEGORY_LABELS: Record<string, string> = {
  measurement: 'Measurements', design: 'Design', fabric: 'Fabric',
  pattern: 'Pattern', layout: 'Cutting Layout', materials: 'Materials',
  workflow: 'Workflow', quality: 'Quality',
};

export default function ProductionReadinessPanel({
  readiness,
  onGenerate,
  isLoading,
}: {
  readiness: ProductionReadiness;
  onGenerate?: () => void;
  isLoading?: boolean;
}) {
  const statusConfig = {
    ready: { label: 'READY FOR PRODUCTION', color: 'bg-green-50 border-green-300 text-green-900' },
    attention_required: { label: 'ATTENTION REQUIRED', color: 'bg-amber-50 border-amber-300 text-amber-900' },
    blocked: { label: 'PRODUCTION BLOCKED', color: 'bg-red-50 border-red-300 text-red-900' },
  };
  const cfg = statusConfig[readiness.overallStatus];

  const checks = [
    { key: 'design', label: 'Design Specification', ok: readiness.designReady },
    { key: 'measurements', label: 'Measurements', ok: readiness.measurementsReady },
    { key: 'fabric', label: 'Fabric Profile & Consumption', ok: readiness.fabricReady },
    { key: 'pattern', label: 'Pattern Model', ok: readiness.patternReady },
    { key: 'layout', label: 'Cutting Layout Valid', ok: readiness.layoutReady },
    { key: 'materials', label: 'Materials Identified', ok: readiness.materialsReady },
    { key: 'workflow', label: 'Workflow Generated', ok: readiness.workflowReady },
    { key: 'quality', label: 'QC Plan Generated', ok: readiness.qualityPlanReady },
  ];

  return (
    <section aria-label="Production readiness" className="space-y-4">
      <div className={`rounded-lg border px-4 py-3 ${cfg.color}`}>
        <p className="text-sm font-bold">{cfg.label}</p>
        {readiness.overallStatus !== 'ready' && (
          <p className="text-xs mt-0.5">
            {readiness.blockers.filter((b) => b.severity === 'blocking').length} blocker(s) ·
            {readiness.warnings.length} warning(s)
          </p>
        )}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-2">
        {checks.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className={`text-sm ${c.ok ? 'text-green-600' : 'text-gray-400'}`} aria-hidden="true">
              {c.ok ? '✓' : '○'}
            </span>
            <span className={`text-xs ${c.ok ? 'text-gray-900' : 'text-gray-500'}`}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Blockers */}
      {readiness.blockers.length > 0 && (
        <div className="space-y-2">
          {readiness.blockers.filter((b) => b.severity === 'blocking').map((b, i) => (
            <BlockerCard key={i} blocker={b} />
          ))}
          {readiness.blockers.filter((b) => b.severity === 'warning').map((b, i) => (
            <BlockerCard key={`w${i}`} blocker={b} warning />
          ))}
        </div>
      )}

      {/* Generate button */}
      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {isLoading ? 'Generating…' : 'Generate Production Plan'}
        </button>
      )}
    </section>
  );
}

function BlockerCard({ blocker: b, warning }: { blocker: ProductionBlocker; warning?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${warning ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-start gap-2">
        <span className={`text-xs font-bold ${warning ? 'text-amber-700' : 'text-red-700'} uppercase`}>
          {warning ? 'Warning' : 'Blocker'} · {CATEGORY_LABELS[b.category] ?? b.category}
        </span>
      </div>
      <p className="text-xs text-gray-900 mt-1">{b.message}</p>
      <p className="text-xs text-gray-600 mt-1">Resolution: {b.resolution}</p>
    </div>
  );
}
