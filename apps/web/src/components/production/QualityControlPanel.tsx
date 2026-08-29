/**
 * Phase 16 — Quality Control Panel.
 */

import React from 'react';
import type { QualityCheckpoint, QualityCheckStatus, QualityCheckPhase } from '../../shared/api/production';

const PHASE_LABELS: Record<QualityCheckPhase, string> = {
  cutting: 'Cutting QC',
  assembly: 'Assembly QC',
  fitting: 'Fitting QC',
  finishing: 'Finishing QC',
  final: 'Final QC',
};

const STATUS_COLORS: Record<QualityCheckStatus, string> = {
  pending: 'text-gray-500',
  passed: 'text-green-700',
  failed: 'text-red-700',
  needs_rework: 'text-amber-700',
  skipped: 'text-gray-400',
};

const STATUS_ICONS: Record<QualityCheckStatus, string> = {
  pending: '○',
  passed: '✓',
  failed: '✗',
  needs_rework: '↩',
  skipped: '—',
};

interface QualityControlPanelProps {
  checkpoints: QualityCheckpoint[];
  onStatusChange?: (checkpointId: string, status: QualityCheckStatus, failureReason?: string) => void;
}

export default function QualityControlPanel({ checkpoints, onStatusChange }: QualityControlPanelProps) {
  const phases = ['cutting', 'assembly', 'fitting', 'finishing', 'final'] as QualityCheckPhase[];
  const passedCount = checkpoints.filter((c) => c.status === 'passed').length;
  const failedCount = checkpoints.filter((c) => c.status === 'failed' || c.status === 'needs_rework').length;

  return (
    <section aria-label="Quality control" className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Quality Control</h3>
        <div className="text-xs text-gray-500">
          {passedCount} passed · {failedCount} failed/rework · {checkpoints.filter((c) => c.status === 'pending').length} pending
        </div>
      </div>

      {phases.map((phase) => {
        const phaseItems = checkpoints.filter((c) => c.phase === phase);
        if (phaseItems.length === 0) return null;
        return (
          <div key={phase}>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {PHASE_LABELS[phase]}
            </h4>
            <div className="space-y-1.5">
              {phaseItems.map((qc) => (
                <div
                  key={qc.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${qc.status === 'failed' || qc.status === 'needs_rework' ? 'bg-red-50 border border-red-200' : qc.status === 'passed' ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'}`}
                  role={qc.required ? 'checkbox' : undefined}
                  aria-label={qc.name}
                >
                  <span className={`text-sm font-mono font-bold ${STATUS_COLORS[qc.status]}`} aria-hidden="true">
                    {STATUS_ICONS[qc.status]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${qc.required ? 'text-gray-900' : 'text-gray-600'}`}>
                      {qc.name}
                      {!qc.required && <span className="ml-1 text-gray-400">(optional)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{qc.description}</p>
                    {qc.failureReason && (
                      <p className="text-xs text-red-700 mt-0.5">{qc.failureReason}</p>
                    )}
                  </div>
                  {onStatusChange && qc.status === 'pending' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onStatusChange(qc.id, 'passed')}
                        className="px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                        aria-label={`Pass ${qc.name}`}
                      >Pass</button>
                      <button
                        type="button"
                        onClick={() => onStatusChange(qc.id, 'failed', 'Failed check')}
                        className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                        aria-label={`Fail ${qc.name}`}
                      >Fail</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
