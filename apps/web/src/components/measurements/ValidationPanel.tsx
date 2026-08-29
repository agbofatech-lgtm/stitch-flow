/**
 * Phase 13 — Validation Panel.
 * Displays L1 hard errors, L2 relational warnings, L3 anomaly flags,
 * completeness state, and historical suggestions.
 * Does NOT auto-correct anything — tailor remains authority.
 */
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type {
  ApiValidationResult,
  ApiAnomalyFinding,
  ApiCompletenessResult,
} from './MeasurementTypes';
import { ANOMALY_LABEL, ANOMALY_TONE } from './MeasurementTypes';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
      {children}
    </h4>
  );
}

function L1Section({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-md border border-burgundy/30 bg-rose-50 p-3">
      <SectionHeading>Validation Errors (must fix before saving)</SectionHeading>
      <ul className="space-y-1" role="alert" aria-live="assertive">
        {errors.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-burgundy">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RelationalSection({ relational }: { relational: ApiValidationResult['relational'] }) {
  const warnings = relational.filter((r) => r.result === 'WARNING');
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <SectionHeading>Proportional Warnings (informational)</SectionHeading>
      <ul className="space-y-1">
        {warnings.map((w) => (
          <li key={w.code} className="flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {w.message}{' '}
              <span className="text-xs text-amber-600">
                ({w.compared.map((c) => `${c.code}: ${c.canonicalValueCm.toFixed(1)} cm`).join(' / ')})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnomalySection({ anomalies }: { anomalies: ApiAnomalyFinding[] }) {
  const flagged = anomalies.filter((a) => a.state !== 'NORMAL');
  if (flagged.length === 0) return null;
  return (
    <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
      <SectionHeading>Historical Anomalies (review — not auto-corrected)</SectionHeading>
      <ul className="space-y-2">
        {flagged.map((a) => (
          <li key={a.definitionCode} className="text-sm text-orange-900">
            <div className="mb-0.5 flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span className="font-medium">{a.definitionCode.replace(/_/g, ' ')}</span>
              <Badge tone={ANOMALY_TONE[a.state] as BadgeTone}>{ANOMALY_LABEL[a.state]}</Badge>
            </div>
            <p className="ml-6 text-xs text-orange-700">{a.explanation}</p>
            {a.previousCm !== null && (
              <p className="ml-6 text-xs text-orange-600">
                Previous: {a.previousCm.toFixed(1)} cm → Current: {a.currentCm.toFixed(1)} cm
                {a.changePercent !== null && (
                  <span>
                    {' '}
                    ({a.changePercent > 0 ? '+' : ''}
                    {a.changePercent.toFixed(1)}%)
                  </span>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompletenessSection({ completeness }: { completeness: ApiCompletenessResult[] }) {
  if (completeness.length === 0) return null;
  return (
    <div className="space-y-2">
      <SectionHeading>Completeness</SectionHeading>
      {completeness.map((c) => (
        <div key={c.garmentType} className="rounded-md border border-line bg-grey-light/30 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium capitalize text-ink">{c.garmentType} measurements</span>
            <Badge
              tone={
                c.state === 'COMPLETE' || c.state === 'READY_FOR_DESIGN'
                  ? 'success'
                  : 'warning'
              }
            >
              {c.state === 'READY_FOR_DESIGN' ? 'Ready' : c.state.charAt(0) + c.state.slice(1).toLowerCase()}
            </Badge>
          </div>
          {c.missingDefinitions.length > 0 && (
            <p className="text-xs text-ink-soft">
              Missing:{' '}
              {c.missingDefinitions.map((d) => d.replace(/_/g, ' ')).join(', ')}
            </p>
          )}
          {c.state === 'COMPLETE' || c.state === 'READY_FOR_DESIGN' ? (
            <div className="flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              All required measurements present
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export interface SuggestionItem {
  definitionCode: string;
  label: string;
  previousCm: number;
}

export function ValidationPanel({
  validation,
  suggestions = [],
  onUseSuggestion,
}: {
  validation: ApiValidationResult;
  suggestions?: SuggestionItem[];
  onUseSuggestion?: (code: string, valueCm: number) => void;
}) {
  const hasIssues =
    validation.level1.errors.length > 0 ||
    validation.relational.some((r) => r.result === 'WARNING') ||
    validation.anomalies.some((a) => a.state !== 'NORMAL');

  return (
    <div className="space-y-3" aria-label="Measurement validation results">
      {!hasIssues && validation.completeness.every((c) => c.state !== 'PARTIAL') && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          All measurements pass validation.
        </div>
      )}

      <L1Section errors={validation.level1.errors} />
      <RelationalSection relational={validation.relational} />
      <AnomalySection anomalies={validation.anomalies} />
      <CompletenessSection completeness={validation.completeness} />

      {suggestions.length > 0 && (
        <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
          <SectionHeading>Missing Measurement Suggestions (from history)</SectionHeading>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.definitionCode} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-sky-900">
                  <span className="font-medium">{s.label}</span>
                  <span className="ml-1 text-sky-600">
                    — Estimated value: {s.previousCm.toFixed(1)} cm
                  </span>
                </span>
                {onUseSuggestion && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onUseSuggestion(s.definitionCode, s.previousCm)}
                      className="rounded px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-300 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                    >
                      Use Estimate
                    </button>
                    <span className="rounded px-2 py-0.5 text-xs text-ink-soft ring-1 ring-line">
                      Enter Manually
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-sky-700">
            Suggestions are from previous verified measurements only. The tailor remains the authority — never auto-applied.
          </p>
        </div>
      )}
    </div>
  );
}
