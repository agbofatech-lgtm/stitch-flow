/**
 * Phase 16 — Fabric Requirement Panel.
 *
 * Displays the authoritative fabric requirement with full breakdown.
 * CRITICAL DISTINCTION:
 *   - "CUTTING LAYOUT LENGTH" = Phase 15 geometry (layoutEnvelopeCm)
 *   - "FABRIC REQUIRED" = Phase 16 authoritative requirement (fabricRequiredCm)
 * These are always displayed separately and labeled accurately.
 * All assumptions are visible. No magic numbers.
 */

import React, { useState } from 'react';
import type { FabricConsumption } from '../../shared/api/production';

interface FabricRequirementPanelProps {
  consumption: FabricConsumption;
}

export default function FabricRequirementPanel({ consumption: c }: FabricRequirementPanelProps) {
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const confidenceColors = {
    high: 'text-green-700 bg-green-50 border-green-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <section aria-label="Fabric requirement" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Fabric Requirement</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${confidenceColors[c.confidence]}`}>
          Confidence: {c.confidence}
        </span>
      </div>

      {/* Width compatibility warning */}
      {!c.widthProfile.isCompatible && (
        <div className="bg-red-50 border border-red-300 rounded-md p-3 text-sm text-red-800" role="alert">
          <strong>PRODUCTION BLOCKED:</strong> Fabric usable width ({c.widthProfile.usableWidthCm} cm) cannot accommodate
          the cutting layout ({c.widthProfile.layoutRequiredWidthCm} cm required).
          Select wider fabric or regenerate the cutting layout.
        </div>
      )}

      {/* Phase distinction banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
        <strong>Phase distinction:</strong> Cutting Layout Length ({c.layoutEnvelopeCm} cm) is the Phase 15 geometric output.
        Fabric Required ({c.fabricRequiredCm} cm) is the Phase 16 authoritative real-world requirement after all allowances.
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBox label="CUTTING LAYOUT LENGTH" value={`${c.layoutEnvelopeCm} cm`} subtitle="Phase 15 geometry" muted />
        <MetricBox label="FABRIC REQUIRED" value={`${c.fabricRequiredCm} cm`} subtitle={`${c.fabricRequiredMeters} m · ${c.fabricRequiredYards} yd`} highlight />
        <MetricBox label="Fabric Width" value={`${c.widthProfile.nominalWidthCm} cm`} subtitle={`Usable: ${c.widthProfile.usableWidthCm} cm`} />
        <MetricBox label="Manual Verification" value={c.manualVerificationRequired ? 'Required' : 'Not required'}
          subtitle={c.manualVerificationRequired ? 'See assumptions' : ''}
          warn={c.manualVerificationRequired} />
      </div>

      {/* Breakdown */}
      <div>
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-indigo-700 transition-colors"
          aria-expanded={showBreakdown}
        >
          <span>{showBreakdown ? '▼' : '▶'}</span>
          Allowance Breakdown
        </button>
        {showBreakdown && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded-md">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-3 py-2 font-medium">Step</th>
                  <th className="text-right px-3 py-2 font-medium">Allowance</th>
                  <th className="text-right px-3 py-2 font-medium">Running Total</th>
                  <th className="text-left px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <BreakdownRow label="Cutting Layout Length (base)" allowance="—"
                  running={`${c.layoutEnvelopeCm} cm`} source="Phase 15 geometry" base />
                <BreakdownRow label={`Shrinkage (${c.shrinkage.percentage}%)`}
                  allowance={`+${c.breakdown.shrinkageAllowanceCm} cm`}
                  running={`${c.breakdown.afterShrinkageCm} cm`} source={c.shrinkage.source} />
                <BreakdownRow label="Selvedge adjustment"
                  allowance={`+${c.breakdown.selvedgeAllowanceCm} cm`}
                  running={`${c.breakdown.afterSelvedgeCm} cm`} source="width calculation" />
                <BreakdownRow label={`Pattern matching (${c.patternMatching.allowancePercentage}%)`}
                  allowance={`+${c.breakdown.patternMatchingAllowanceCm} cm`}
                  running={`${c.breakdown.afterPatternMatchingCm} cm`}
                  source={c.patternMatching.required ? `${c.patternMatching.source} — MANUAL VERIFICATION` : 'not required'} />
                <BreakdownRow label={`Directional fabric (${c.directional.allowancePercentage}%)`}
                  allowance={`+${c.breakdown.directionalAllowanceCm} cm`}
                  running={`${c.breakdown.afterDirectionalCm} cm`}
                  source={c.directional.required ? c.directional.source : 'not required'} />
                <BreakdownRow label={`Handling waste (${c.handlingWaste.percentage}%)`}
                  allowance={`+${c.breakdown.handlingWasteAllowanceCm} cm`}
                  running={`${c.breakdown.afterHandlingWasteCm} cm`} source={c.handlingWaste.source} />
                <BreakdownRow label={`Safety buffer (${c.safetyBuffer.percentage}%)`}
                  allowance={`+${c.breakdown.safetyBufferCm} cm`}
                  running={`${c.breakdown.afterSafetyBufferCm} cm`} source={c.safetyBuffer.source} />
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 font-semibold">
                  <td className="px-3 py-2 text-indigo-900">FABRIC REQUIRED</td>
                  <td className="px-3 py-2 text-right text-indigo-900">—</td>
                  <td className="px-3 py-2 text-right text-indigo-900 font-bold">{c.fabricRequiredCm} cm</td>
                  <td className="px-3 py-2 text-indigo-700">{c.fabricRequiredMeters} m · {c.fabricRequiredYards} yd</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Assumptions */}
      {c.assumptions.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
            aria-expanded={showAssumptions}
          >
            <span>{showAssumptions ? '▼' : '▶'}</span>
            Calculation Assumptions ({c.assumptions.length})
          </button>
          {showAssumptions && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
              {c.assumptions.map((a, i) => (
                <p key={i} className="text-xs text-amber-800">{a}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Calculation version: {c.calculationVersion} · Generated: {c.createdAt}
      </p>
    </section>
  );
}

function MetricBox({
  label, value, subtitle, highlight, muted, warn,
}: {
  label: string; value: string; subtitle?: string;
  highlight?: boolean; muted?: boolean; warn?: boolean;
}) {
  return (
    <div className={[
      'rounded-lg border p-3',
      highlight ? 'bg-indigo-50 border-indigo-200' : muted ? 'bg-gray-50 border-gray-200' : warn ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200',
    ].join(' ')}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-indigo-700' : muted ? 'text-gray-500' : warn ? 'text-amber-700' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-base font-bold mt-1 ${highlight ? 'text-indigo-900' : muted ? 'text-gray-600' : warn ? 'text-amber-900' : 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function BreakdownRow({
  label, allowance, running, source, base,
}: {
  label: string; allowance: string; running: string; source: string; base?: boolean;
}) {
  return (
    <tr className={base ? 'bg-gray-50' : 'hover:bg-gray-50'}>
      <td className="px-3 py-1.5 text-gray-900">{label}</td>
      <td className="px-3 py-1.5 text-right text-gray-700 font-mono">{allowance}</td>
      <td className="px-3 py-1.5 text-right text-gray-900 font-mono">{running}</td>
      <td className="px-3 py-1.5 text-gray-500 text-xs">{source}</td>
    </tr>
  );
}
