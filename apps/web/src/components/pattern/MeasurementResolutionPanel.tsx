/**
 * Phase 15 — Measurement Resolution Panel.
 *
 * Presents missing measurements to the tailor with explicit options:
 *   [Use Estimate] — accepts the engine default (recorded for traceability)
 *   [Enter Manually] — tailor enters a value (recorded as tailor_override)
 *
 * NEVER silently applies a default. Tailor is always authoritative.
 */

import React, { useState } from 'react';
import type { MissingMeasurement } from '../../shared/api/pattern';

interface MeasurementResolutionPanelProps {
  missing: MissingMeasurement[];
  acceptedDefaults: Array<{ code: string; defaultCm: number }>;
  tailorOverrides: Array<{ code: string; valueCm: number }>;
  onAcceptDefault: (m: MissingMeasurement) => void;
  onTailorOverride: (code: string, valueCm: number) => void;
  onProceed: () => void;
}

export default function MeasurementResolutionPanel({
  missing,
  acceptedDefaults,
  tailorOverrides,
  onAcceptDefault,
  onTailorOverride,
  onProceed,
}: MeasurementResolutionPanelProps) {
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  const requiredMissing = missing.filter((m) => m.severity === 'required');
  const recommendedMissing = missing.filter((m) => m.severity === 'recommended');

  function handleManualChange(code: string, value: string) {
    setManualValues((prev) => ({ ...prev, [code]: value }));
    setManualErrors((prev) => ({ ...prev, [code]: '' }));
  }

  function handleManualSubmit(m: MissingMeasurement) {
    const raw = manualValues[m.code] ?? '';
    const val = parseFloat(raw);
    if (Number.isNaN(val) || val <= 0) {
      setManualErrors((prev) => ({ ...prev, [m.code]: 'Enter a positive number in cm.' }));
      return;
    }
    if (val < 5 || val > 300) {
      setManualErrors((prev) => ({
        ...prev,
        [m.code]: `Value ${val} cm seems unusual. Enter a value between 5 and 300 cm.`,
      }));
      return;
    }
    onTailorOverride(m.code, val);
  }

  function isResolved(code: string) {
    return acceptedDefaults.some((d) => d.code === code) ||
      tailorOverrides.some((o) => o.code === code);
  }

  const allRequiredResolved = requiredMissing.every((m) => isResolved(m.code));

  return (
    <section aria-label="Measurement resolution" className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Resolve Missing Measurements</h3>
        <p className="text-sm text-gray-500 mt-1">
          The following measurements are missing from the measurement profile.
          For each, you may <strong>Use Estimate</strong> (engine default, recorded for traceability) or{' '}
          <strong>Enter Manually</strong> (your value, recorded as tailor override).
        </p>
      </div>

      {/* Required */}
      {requiredMissing.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide">
            Required ({requiredMissing.length})
          </h4>
          {requiredMissing.map((m) => (
            <MeasurementCard
              key={m.code}
              measurement={m}
              isResolved={isResolved(m.code)}
              acceptedDefault={acceptedDefaults.find((d) => d.code === m.code)}
              tailorOverride={tailorOverrides.find((o) => o.code === m.code)}
              manualValue={manualValues[m.code] ?? ''}
              manualError={manualErrors[m.code] ?? ''}
              onManualChange={(v) => handleManualChange(m.code, v)}
              onManualSubmit={() => handleManualSubmit(m)}
              onAcceptDefault={() => onAcceptDefault(m)}
            />
          ))}
        </div>
      )}

      {/* Recommended */}
      {recommendedMissing.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            Recommended ({recommendedMissing.length})
          </h4>
          {recommendedMissing.map((m) => (
            <MeasurementCard
              key={m.code}
              measurement={m}
              isResolved={isResolved(m.code)}
              acceptedDefault={acceptedDefaults.find((d) => d.code === m.code)}
              tailorOverride={tailorOverrides.find((o) => o.code === m.code)}
              manualValue={manualValues[m.code] ?? ''}
              manualError={manualErrors[m.code] ?? ''}
              onManualChange={(v) => handleManualChange(m.code, v)}
              onManualSubmit={() => handleManualSubmit(m)}
              onAcceptDefault={() => onAcceptDefault(m)}
            />
          ))}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onProceed}
          disabled={!allRequiredResolved}
          className={[
            'px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors',
            allRequiredResolved
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          Continue to Readiness
        </button>
        {!allRequiredResolved && (
          <p className="mt-1.5 text-xs text-red-600">
            Resolve all required measurements to continue.
          </p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Measurement card
// ---------------------------------------------------------------------------

interface MeasurementCardProps {
  measurement: MissingMeasurement;
  isResolved: boolean;
  acceptedDefault?: { code: string; defaultCm: number };
  tailorOverride?: { code: string; valueCm: number };
  manualValue: string;
  manualError: string;
  onManualChange: (v: string) => void;
  onManualSubmit: () => void;
  onAcceptDefault: () => void;
}

function MeasurementCard({
  measurement: m,
  isResolved,
  acceptedDefault,
  tailorOverride,
  manualValue,
  manualError,
  onManualChange,
  onManualSubmit,
  onAcceptDefault,
}: MeasurementCardProps) {
  const [showManual, setShowManual] = useState(false);

  return (
    <div
      className={[
        'rounded-lg border p-4 space-y-2.5',
        isResolved
          ? 'bg-green-50 border-green-200'
          : m.severity === 'required'
          ? 'bg-white border-red-200'
          : 'bg-white border-amber-200',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{m.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{m.hint}</p>
        </div>
        {isResolved && (
          <span className="text-xs font-medium text-green-700 bg-green-100 rounded px-2 py-0.5 flex-shrink-0">
            Resolved
          </span>
        )}
      </div>

      {isResolved && (
        <div className="text-xs text-gray-700">
          {acceptedDefault && (
            <span>Using engine estimate: <strong>{acceptedDefault.defaultCm} cm</strong></span>
          )}
          {tailorOverride && (
            <span>Tailor override: <strong>{tailorOverride.valueCm} cm</strong></span>
          )}
        </div>
      )}

      {!isResolved && (
        <div className="flex flex-wrap gap-2">
          {m.engineDefaultCm !== null && (
            <button
              type="button"
              onClick={onAcceptDefault}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
            >
              Use Estimate ({m.engineDefaultCm} cm)
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {showManual ? 'Cancel' : 'Enter Manually'}
          </button>
        </div>
      )}

      {showManual && !isResolved && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            step="0.1"
            min="1"
            max="300"
            value={manualValue}
            onChange={(e) => onManualChange(e.target.value)}
            placeholder="cm"
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label={`${m.label} value in centimetres`}
          />
          <span className="text-xs text-gray-500">cm</span>
          <button
            type="button"
            onClick={onManualSubmit}
            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
          >
            Apply
          </button>
          {manualError && (
            <span className="text-xs text-red-600" role="alert">{manualError}</span>
          )}
        </div>
      )}
    </div>
  );
}
