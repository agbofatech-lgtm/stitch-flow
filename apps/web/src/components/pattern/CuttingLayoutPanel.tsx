/**
 * Phase 15 — Cutting Layout Panel.
 *
 * Displays the computed greedy cutting layout:
 * - CUTTING LAYOUT LENGTH (not "fabric yardage")
 * - Placed pieces with position coordinates
 * - Validation issues (errors / warnings)
 * - Layout visualization (proportional grid)
 *
 * CRITICAL: Layout envelope is always labeled "CUTTING LAYOUT LENGTH".
 * Final fabric yardage is Phase 16's responsibility.
 */

import React from 'react';
import type { PatternModel, CuttingLayout, LayoutValidationIssue, PlacedPiece } from '../../shared/api/pattern';
import type { FabricProfile } from '../../shared/api/design';

interface CuttingLayoutPanelProps {
  model: PatternModel;
  layout: CuttingLayout | null;
  fabricProfile?: FabricProfile | null;
  onGenerateInstructions: () => void;
  onRecomputeLayout: () => void;
  isLoading: boolean;
}

export default function CuttingLayoutPanel({
  model,
  layout,
  fabricProfile,
  onGenerateInstructions,
  onRecomputeLayout,
  isLoading,
}: CuttingLayoutPanelProps) {
  if (!layout) {
    return (
      <section className="space-y-4" aria-label="Cutting layout">
        <p className="text-sm text-gray-500">No layout computed yet.</p>
        <button
          type="button"
          onClick={onRecomputeLayout}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Computing…' : 'Compute Layout'}
        </button>
      </section>
    );
  }

  const errors = layout.validationIssues.filter((i) => i.severity === 'error');
  const warnings = layout.validationIssues.filter((i) => i.severity === 'warning');
  const pieceMap = new Map(model.pieces.map((p) => [p.id, p]));

  return (
    <section aria-label="Cutting layout" className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Cutting Layout</h3>
          <p className="text-sm text-gray-500">
            Algorithm: {layout.algorithm} v{layout.algorithmVersion}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onRecomputeLayout}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Recompute
          </button>
          <button
            type="button"
            onClick={onGenerateInstructions}
            className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Generate Instructions →
          </button>
        </div>
      </div>

      {/* Layout metrics — CUTTING LAYOUT LENGTH clearly labeled */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricBox
          label="CUTTING LAYOUT LENGTH"
          value={`${layout.layoutEnvelopeCm} cm`}
          highlight
          note="Geometric envelope only — not final fabric yardage"
        />
        <MetricBox
          label="Layout Width"
          value={`${layout.layoutWidthCm} cm`}
        />
        <MetricBox
          label="Margin"
          value={`${layout.marginCm} cm`}
          note="Top + bottom"
        />
      </div>

      {/* Phase 16 note */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
        <strong>Note:</strong> The cutting layout length shown is a geometric envelope
        (furthest piece edge + margin). Final fabric yardage — including selvedge waste,
        pattern repeat matching allowance, and buffers — is calculated separately.
      </div>

      {/* Fabric info */}
      {fabricProfile && (
        <div className="text-xs text-gray-600">
          Fabric: {fabricProfile.name}
          {fabricProfile.properties?.directional && ' · Directional'}
          {fabricProfile.properties?.requiresMatching && ' · Pattern matching required (manual verification)'}
        </div>
      )}

      {/* Validation */}
      {layout.validationIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700">Layout Validation</h4>
          {errors.map((issue, i) => (
            <ValidationIssueRow key={i} issue={issue} />
          ))}
          {warnings.map((issue, i) => (
            <ValidationIssueRow key={`w${i}`} issue={issue} />
          ))}
        </div>
      )}

      {layout.isValid && (
        <div className="flex items-center gap-2 text-xs text-green-700">
          <span className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true" />
          Layout is valid — no errors detected.
        </div>
      )}

      {/* Placed pieces table */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Placed Pieces ({layout.placedPieces.length})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-md">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-3 py-2 font-medium">Piece</th>
                <th className="text-right px-3 py-2 font-medium">Copy</th>
                <th className="text-right px-3 py-2 font-medium">X</th>
                <th className="text-right px-3 py-2 font-medium">Y</th>
                <th className="text-right px-3 py-2 font-medium">W</th>
                <th className="text-right px-3 py-2 font-medium">H</th>
                <th className="text-right px-3 py-2 font-medium">Rot°</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {layout.placedPieces.map((pp, i) => {
                const piece = pieceMap.get(pp.pieceId);
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-900">{piece?.name ?? pp.pieceId}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">{pp.copy}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-900">{pp.xCm}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-900">{pp.yCm}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-600">{pp.effectiveWidthCm}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-600">{pp.effectiveHeightCm}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">{pp.rotationDeg}°</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-gray-400">All values in cm. X = from left edge. Y = from top of layout.</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricBox({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={[
      'rounded-lg border p-3',
      highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200',
    ].join(' ')}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-indigo-700' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-indigo-900' : 'text-gray-900'}`}>
        {value}
      </p>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}

function ValidationIssueRow({ issue }: { issue: LayoutValidationIssue }) {
  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`rounded border px-3 py-2 text-xs ${colors[issue.severity]}`} role="alert">
      <strong className="uppercase">{issue.severity}:</strong> {issue.message}
    </div>
  );
}
