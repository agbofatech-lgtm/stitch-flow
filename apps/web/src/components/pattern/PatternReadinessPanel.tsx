/**
 * Phase 15 — Pattern Readiness Panel.
 * Displays measurement completeness and readiness before pattern derivation.
 */

import React from 'react';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';
import type { MeasurementCompletenessResult } from '../../shared/api/pattern';

interface PatternReadinessPanelProps {
  completeness: MeasurementCompletenessResult;
  engineKind: string;
  designSpec: DesignSpecification;
  fabricProfile?: FabricProfile | null;
  acceptedDefaults: Array<{ code: string; defaultCm: number }>;
  tailorOverrides: Array<{ code: string; valueCm: number }>;
  hasRequiredGaps: boolean;
  onResolveMeasurements: () => void;
  onDerivePattern: () => void;
  isLoading: boolean;
}

export default function PatternReadinessPanel({
  completeness,
  engineKind,
  designSpec,
  fabricProfile,
  acceptedDefaults,
  tailorOverrides,
  hasRequiredGaps,
  onResolveMeasurements,
  onDerivePattern,
  isLoading,
}: PatternReadinessPanelProps) {
  const resolvedCount = acceptedDefaults.length + tailorOverrides.length;
  const missingRequired = completeness.missing.filter((m) => m.severity === 'required').length;
  const resolvedRequired = completeness.missing.filter(
    (m) => m.severity === 'required' &&
      (acceptedDefaults.some((d) => d.code === m.code) || tailorOverrides.some((o) => o.code === m.code)),
  ).length;

  return (
    <section aria-label="Pattern readiness" className="space-y-4">
      {/* Spec summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Design Specification</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28">Garment</dt>
            <dd className="text-gray-900 capitalize">{designSpec.garment.category}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-28">Engine kind</dt>
            <dd className="text-gray-900 font-mono text-xs">{engineKind}</dd>
          </div>
          {designSpec.garment.fit && (
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28">Fit</dt>
              <dd className="text-gray-900 capitalize">{designSpec.garment.fit}</dd>
            </div>
          )}
          {fabricProfile && (
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28">Fabric</dt>
              <dd className="text-gray-900">{fabricProfile.name}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Measurement completeness */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Measurement Completeness</h3>

        {completeness.complete ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" aria-hidden="true" />
            All required measurements present. Ready for pattern derivation.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-amber-700">
              {missingRequired - resolvedRequired} required measurement(s) unresolved.
              {resolvedCount > 0 && ` ${resolvedCount} resolved (defaults/overrides).`}
            </div>
            {completeness.missing.map((m) => {
              const accepted = acceptedDefaults.find((d) => d.code === m.code);
              const override = tailorOverrides.find((o) => o.code === m.code);
              const resolved = !!accepted || !!override;
              return (
                <div
                  key={m.code}
                  className={[
                    'text-xs px-3 py-1.5 rounded border',
                    resolved
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : m.severity === 'required'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800',
                  ].join(' ')}
                >
                  <span className="font-medium">{m.label}</span>
                  {resolved && accepted && (
                    <span className="ml-2 text-green-700">[estimate: {accepted.defaultCm} cm]</span>
                  )}
                  {resolved && override && (
                    <span className="ml-2 text-green-700">[override: {override.valueCm} cm]</span>
                  )}
                  {!resolved && <span className="ml-2 italic">{m.severity}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!completeness.complete && (
          <button
            type="button"
            onClick={onResolveMeasurements}
            className="px-4 py-2 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            Resolve Measurements
          </button>
        )}
        <button
          type="button"
          onClick={onDerivePattern}
          disabled={hasRequiredGaps || isLoading}
          className={[
            'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors',
            hasRequiredGaps || isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
          ].join(' ')}
        >
          {isLoading ? 'Deriving pattern…' : 'Derive Pattern'}
        </button>
      </div>

      {hasRequiredGaps && (
        <p className="text-xs text-red-600">
          Resolve all required measurements before deriving the pattern.
          Use "Resolve Measurements" to accept estimates or enter values manually.
        </p>
      )}
    </section>
  );
}
