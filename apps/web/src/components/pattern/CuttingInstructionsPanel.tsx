/**
 * Phase 15 — Cutting Instructions Panel.
 * Displays per-piece cutting instructions with warnings and post-cutting checks.
 * Suitable for PDF/print output.
 */

import React from 'react';
import type {
  PatternModel,
  CuttingLayout,
  CuttingInstructionSet,
  CuttingInstruction,
} from '../../shared/api/pattern';
import type { FabricProfile } from '../../shared/api/design';

interface CuttingInstructionsPanelProps {
  model: PatternModel;
  layout: CuttingLayout | null;
  instructionSet: CuttingInstructionSet | null;
  fabricProfile?: FabricProfile | null;
  onViewTraceability: () => void;
}

export default function CuttingInstructionsPanel({
  model,
  layout,
  instructionSet,
  fabricProfile,
  onViewTraceability,
}: CuttingInstructionsPanelProps) {
  if (!instructionSet) {
    return (
      <div className="text-sm text-gray-500">No cutting instructions generated yet.</div>
    );
  }

  return (
    <section aria-label="Cutting instructions" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Cutting Instructions</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onViewTraceability}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            View Traceability →
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            aria-label="Print cutting instructions"
          >
            Print
          </button>
        </div>
      </div>

      {/* Preamble */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1.5">
        {instructionSet.preamble.map((line, i) => (
          <p
            key={i}
            className={[
              'text-xs',
              i === 0 ? 'font-bold text-gray-900 text-sm' : 'text-gray-700',
              line.startsWith('NOTE:') || line.startsWith('WARNING') || line.startsWith('PATTERN') || line.startsWith('DIRECTIONAL')
                ? 'font-medium text-amber-800'
                : '',
            ].join(' ')}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Per-piece instructions */}
      <div className="space-y-4">
        {instructionSet.instructions.map((instr, i) => (
          <PieceInstructionCard key={instr.pieceId} instruction={instr} index={i + 1} />
        ))}
      </div>

      {/* Post-cutting checks */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-green-900 mb-2">Post-Cutting Checks</h4>
        <ol className="list-decimal list-inside space-y-1">
          {instructionSet.postCuttingChecks.map((check, i) => (
            <li key={i} className="text-xs text-green-800">
              {check}
            </li>
          ))}
        </ol>
      </div>

      {/* Layout reference footer */}
      {layout && (
        <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
          Cutting Layout ID: <span className="font-mono">{layout.id}</span> ·
          CUTTING LAYOUT LENGTH: <strong>{layout.layoutEnvelopeCm} cm</strong> ·
          Width: {layout.layoutWidthCm} cm ·
          Algorithm: {layout.algorithm} v{layout.algorithmVersion}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Per-piece instruction card
// ---------------------------------------------------------------------------

function PieceInstructionCard({
  instruction,
  index,
}: {
  instruction: CuttingInstruction;
  index: number;
}) {
  return (
    <article
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
      aria-label={`Cutting instructions for ${instruction.pieceName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {index}. {instruction.pieceName}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Qty {instruction.quantity} · seam allowance {instruction.seamAllowanceCm} cm ·{' '}
            grainline: {instruction.grainline}
            {instruction.constraints.filter((c) => c !== 'none').map((c) => ` · ${c}`)}
          </p>
        </div>
        {instruction.layoutPosition && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">Layout position</p>
            <p className="text-xs font-mono text-gray-900">
              {instruction.layoutPosition.xCm} × {instruction.layoutPosition.yCm} cm
            </p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {instruction.warnings.length > 0 && (
        <div className="space-y-1">
          {instruction.warnings.map((w, i) => (
            <div key={i} className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1" role="alert">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      <ol className="list-decimal list-inside space-y-1">
        {instruction.steps.map((step, i) => (
          <li key={i} className="text-xs text-gray-700">
            {step}
          </li>
        ))}
      </ol>
    </article>
  );
}
