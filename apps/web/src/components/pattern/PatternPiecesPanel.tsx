/**
 * Phase 15 — Pattern Pieces Panel.
 * Displays derived pattern pieces with bounding boxes, grainline, seam allowance,
 * and constraints. Leads to layout computation.
 */

import React from 'react';
import type { PatternModel, PatternPiece, GrainlineDirection } from '../../shared/api/pattern';

interface PatternPiecesPanelProps {
  model: PatternModel;
  onComputeLayout: () => void;
  onViewReadiness: () => void;
  isLoading: boolean;
}

export default function PatternPiecesPanel({
  model,
  onComputeLayout,
  onViewReadiness,
  isLoading,
}: PatternPiecesPanelProps) {
  const warnings = model.derivationContext.warnings;
  const defaultsUsed = model.derivationContext.defaultsAccepted;

  return (
    <section aria-label="Derived pattern pieces" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pattern Pieces</h3>
          <p className="text-sm text-gray-500">
            {model.pieces.length} pieces derived · {model.garmentCategory} · {model.engineKind}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onViewReadiness}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onComputeLayout}
            disabled={isLoading}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500',
              isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700',
            ].join(' ')}
          >
            {isLoading ? 'Computing layout…' : 'Compute Cutting Layout →'}
          </button>
        </div>
      </div>

      {/* Defaults banner */}
      {defaultsUsed.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
          <strong>{defaultsUsed.length} measurement estimate(s) used:</strong>{' '}
          {defaultsUsed.map((d) => `${d.code}: ${d.defaultCm} cm`).join(', ')}.{' '}
          Verify fit before final cutting.
        </div>
      )}

      {/* Derivation warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-800">{w}</p>
          ))}
        </div>
      )}

      {/* Piece grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {model.pieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} />
        ))}
      </div>

      {/* Completeness note */}
      {!model.measurementCompleteness.complete && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          Pattern derived with estimated measurements. Verify fit sample before production cutting.
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Piece Card
// ---------------------------------------------------------------------------

function GrainlineTag({ grainline }: { grainline: GrainlineDirection }) {
  const colors: Record<GrainlineDirection, string> = {
    lengthwise: 'bg-blue-100 text-blue-700',
    crosswise: 'bg-purple-100 text-purple-700',
    bias: 'bg-orange-100 text-orange-700',
    any: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${colors[grainline]}`}>
      {grainline}
    </span>
  );
}

function PieceCard({ piece }: { piece: PatternPiece }) {
  const { boundingBox: bb } = piece;
  return (
    <article
      className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
      aria-label={`Pattern piece: ${piece.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{piece.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Qty: {piece.quantity}
            {piece.constraints.includes('cut_on_fold') && ' · cut on fold'}
            {piece.constraints.includes('mirror') && ' · mirror pair'}
          </p>
        </div>
        <GrainlineTag grainline={piece.grainline} />
      </div>

      {/* Bounding box */}
      <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded p-2.5">
        <div className="text-center">
          <p className="text-xs text-gray-500">Width</p>
          <p className="text-sm font-mono font-medium text-gray-900">{bb.widthCm} cm</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Height</p>
          <p className="text-sm font-mono font-medium text-gray-900">{bb.heightCm} cm</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Seam</p>
          <p className="text-sm font-mono font-medium text-gray-900">{piece.seamAllowanceCm} cm</p>
        </div>
      </div>

      {/* Flags */}
      {(piece.requiresDirectionalFabric || piece.requiresPatternMatching) && (
        <div className="flex flex-wrap gap-1.5">
          {piece.requiresDirectionalFabric && (
            <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded">
              Directional
            </span>
          )}
          {piece.requiresPatternMatching && (
            <span className="px-2 py-0.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded">
              Pattern matching — manual verification required
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {piece.notes.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
          {piece.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
