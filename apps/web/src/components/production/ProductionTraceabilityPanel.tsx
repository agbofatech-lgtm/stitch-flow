/**
 * Phase 16 — Production Traceability Panel.
 */

import React from 'react';
import type { ProductionTraceability } from '../../shared/api/production';

export default function ProductionTraceabilityPanel({ traceability: t }: { traceability: ProductionTraceability }) {
  return (
    <section aria-label="Production traceability" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Production Traceability</h3>
        {t.isStale && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            ⚠ STALE — Requires Regeneration
          </span>
        )}
      </div>

      {t.isStale && t.staleReasons.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
          <strong>Why stale:</strong> {t.staleReasons.join('; ')}
          <br />Required action: Regenerate cutting layout and fabric requirement.
        </div>
      )}

      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
        <Row label="Design Specification" value={`${t.designSpecificationId}${t.designSpecificationVersion != null ? ` (v${t.designSpecificationVersion})` : ''}`} />
        {t.measurementProfileId && (
          <Row label="Measurement Profile" value={`${t.measurementProfileId}${t.measurementProfileVersion != null ? ` (v${t.measurementProfileVersion})` : ''}`} />
        )}
        {t.fabricProfileId && <Row label="Fabric Profile" value={t.fabricProfileId} />}
        {t.patternModelId && (
          <Row label="Pattern Model" value={`${t.patternModelId}${t.patternModelVersion != null ? ` (v${t.patternModelVersion})` : ''}`} />
        )}
        <Row label="Cutting Layout" value={t.cuttingLayoutId} />
        {t.cuttingLayoutAlgorithmVersion && <Row label="Layout Algorithm" value={t.cuttingLayoutAlgorithmVersion} />}
        <Row label="Fabric Calculation Version" value={t.fabricCalculationVersion} />
        <Row label="Generated At" value={t.generatedAt} />
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-48 flex-shrink-0 text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-xs text-gray-900 font-mono break-all">{value}</dd>
    </div>
  );
}
