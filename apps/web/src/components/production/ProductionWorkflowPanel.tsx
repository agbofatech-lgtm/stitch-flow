/**
 * Phase 16 — Production Workflow Panel.
 * Operations timeline with status, dependencies, and time estimates.
 */

import React from 'react';
import type { ProductionOperation, ProductionOperationStatus } from '../../shared/api/production';

const STATUS_CONFIG: Record<ProductionOperationStatus, { label: string; color: string; dot: string }> = {
  not_started: { label: 'Not started', color: 'text-gray-500', dot: 'bg-gray-300' },
  ready: { label: 'Ready', color: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { label: 'In progress', color: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'text-green-700', dot: 'bg-green-500' },
  blocked: { label: 'Blocked', color: 'text-red-700', dot: 'bg-red-400' },
  skipped: { label: 'Skipped', color: 'text-gray-400', dot: 'bg-gray-200' },
};

interface ProductionWorkflowPanelProps {
  operations: ProductionOperation[];
  onStatusChange?: (operationId: string, newStatus: ProductionOperationStatus) => void;
}

export default function ProductionWorkflowPanel({ operations, onStatusChange }: ProductionWorkflowPanelProps) {
  const totalExpected = operations.reduce((s, o) => s + o.timeEstimate.expectedMinutes, 0);
  const completedCount = operations.filter((o) => o.status === 'completed').length;

  return (
    <section aria-label="Production workflow" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Production Workflow</h3>
        <div className="text-xs text-gray-500">
          {completedCount}/{operations.length} ops · ~{Math.round(totalExpected / 60)}h expected
        </div>
      </div>

      <div className="space-y-2">
        {operations.map((op, idx) => {
          const cfg = STATUS_CONFIG[op.status];
          return (
            <article
              key={op.id}
              className={`bg-white border rounded-lg p-3 ${op.status === 'blocked' ? 'border-red-200' : op.status === 'ready' ? 'border-blue-200' : 'border-gray-200'}`}
              aria-label={`Operation ${op.name}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{idx + 1}. {op.name}</span>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    {op.requiresCustomer && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Customer required</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{op.description}</p>
                  {op.blockingReason && (
                    <p className="text-xs text-red-700 mt-0.5 font-medium">{op.blockingReason}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      {op.timeEstimate.minimumMinutes}–{op.timeEstimate.maximumMinutes} min
                      (expected: {op.timeEstimate.expectedMinutes} min)
                    </span>
                  </div>
                </div>
                {onStatusChange && op.status === 'ready' && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(op.id, 'in_progress')}
                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Start
                  </button>
                )}
                {onStatusChange && op.status === 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(op.id, 'completed')}
                    className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex-shrink-0"
                  >
                    Complete
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
