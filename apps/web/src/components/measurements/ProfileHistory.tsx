/**
 * Phase 13 — Profile History & Comparison.
 * Shows the version chain for a customer's measurements.
 * Comparison: absolute + % differences with anomaly flags.
 * Historical records are presented read-only — never editable.
 */
import { useState } from 'react';
import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type {
  ApiMeasurementProfile,
  ApiProfileComparison,
  AnomalyState,
} from './MeasurementTypes';
import { ANOMALY_LABEL, ANOMALY_TONE } from './MeasurementTypes';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Feedback';
import { Select, Field } from '../ui/Field';

function DeltaIcon({ delta }: { delta: number | null }) {
  if (delta === null) return <Minus className="h-3.5 w-3.5 text-ink-mute" />;
  if (delta > 0) return <TrendingUp className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />;
  if (delta < 0) return <TrendingDown className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />;
  return <Minus className="h-3.5 w-3.5 text-ink-mute" aria-hidden="true" />;
}

function ComparisonTable({ comparison }: { comparison: ApiProfileComparison }) {
  const rows = comparison.rows.filter(
    (r) => r.currentCm !== null || r.previousCm !== null,
  );

  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-ink-mute">
        No overlapping measurements to compare.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Measurement comparison">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            <th className="pb-2 pr-3">Measurement</th>
            <th className="pb-2 pr-3 text-right">Previous</th>
            <th className="pb-2 pr-3 text-center" aria-label="Change direction">
              <ArrowRight className="mx-auto h-3.5 w-3.5" aria-hidden="true" />
            </th>
            <th className="pb-2 pr-3 text-right">Current</th>
            <th className="pb-2 pr-3 text-right">Δ cm</th>
            <th className="pb-2 text-right">Δ %</th>
            <th className="pb-2 pl-3 text-center">Flag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {rows.map((row) => (
            <tr
              key={row.definitionCode}
              className={
                row.flag === 'FLAGGED'
                  ? 'bg-rose-50'
                  : row.flag === 'UNUSUAL'
                    ? 'bg-amber-50/60'
                    : ''
              }
            >
              <td className="py-2 pr-3 font-medium capitalize text-ink">
                {row.label || row.definitionCode.replace(/_/g, ' ')}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                {row.previousCm !== null ? `${row.previousCm.toFixed(1)} cm` : '—'}
              </td>
              <td className="py-2 pr-3 text-center">
                <DeltaIcon delta={row.absoluteDifferenceCm} />
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-ink">
                {row.currentCm !== null ? `${row.currentCm.toFixed(1)} cm` : '—'}
              </td>
              <td
                className={`py-2 pr-3 text-right tabular-nums ${
                  (row.absoluteDifferenceCm ?? 0) > 0
                    ? 'text-amber-700'
                    : (row.absoluteDifferenceCm ?? 0) < 0
                      ? 'text-sky-700'
                      : 'text-ink-mute'
                }`}
              >
                {row.absoluteDifferenceCm !== null
                  ? `${row.absoluteDifferenceCm > 0 ? '+' : ''}${row.absoluteDifferenceCm.toFixed(1)}`
                  : '—'}
              </td>
              <td
                className={`py-2 pr-3 text-right tabular-nums text-xs ${
                  (row.percentChange ?? 0) > 0
                    ? 'text-amber-700'
                    : (row.percentChange ?? 0) < 0
                      ? 'text-sky-700'
                      : 'text-ink-mute'
                }`}
              >
                {row.percentChange !== null
                  ? `${row.percentChange > 0 ? '+' : ''}${row.percentChange.toFixed(1)}%`
                  : '—'}
              </td>
              <td className="py-2 pl-3 text-center">
                {row.flag !== 'NORMAL' && (
                  <Badge tone={ANOMALY_TONE[row.flag] as BadgeTone}>
                    {ANOMALY_LABEL[row.flag]}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProfileHistory({
  profiles,
  loadingComparison,
  comparison,
  onCompare,
}: {
  profiles: ApiMeasurementProfile[];
  loadingComparison: boolean;
  comparison: ApiProfileComparison | null;
  onCompare: (currentId: string, previousId: string) => void;
}) {
  const [currentId, setCurrentId] = useState<string>('');
  const [previousId, setPreviousId] = useState<string>('');

  const measurable = profiles.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'VALIDATED' || p.status === 'SUPERSEDED',
  );

  if (measurable.length < 2) {
    return (
      <div className="py-6 text-center text-sm text-ink-mute">
        At least 2 validated or active profiles are needed to compare measurement history.
      </div>
    );
  }

  const handleCompare = () => {
    if (currentId && previousId && currentId !== previousId) {
      onCompare(currentId, previousId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field id="hist-current" label="Current Profile">
          <Select
            id="hist-current"
            value={currentId}
            onChange={(e) => setCurrentId(e.target.value)}
            aria-label="Select current profile to compare"
          >
            <option value="">— select —</option>
            {measurable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || `Profile v${p.version}`} ({p.status}, {p.dateTaken})
              </option>
            ))}
          </Select>
        </Field>
        <Field id="hist-previous" label="Previous Profile">
          <Select
            id="hist-previous"
            value={previousId}
            onChange={(e) => setPreviousId(e.target.value)}
            aria-label="Select previous profile to compare"
          >
            <option value="">— select —</option>
            {measurable
              .filter((p) => p.id !== currentId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `Profile v${p.version}`} ({p.status}, {p.dateTaken})
                </option>
              ))}
          </Select>
        </Field>
        <Button
          size="md"
          variant="secondary"
          onClick={handleCompare}
          disabled={!currentId || !previousId || currentId === previousId}
          loading={loadingComparison}
        >
          Compare
        </Button>
      </div>

      {loadingComparison && <Loading label="Comparing profiles…" />}

      {comparison && !loadingComparison && (
        <div className="rounded-card border border-line bg-surface p-4 shadow-e1">
          <h4 className="mb-3 font-display text-sm font-semibold text-ink">
            Measurement Changes
          </h4>
          <ComparisonTable comparison={comparison} />
          <p className="mt-3 text-[11px] text-ink-mute">
            Historical anomaly flags are informational only — bodies change. Verify with the tailor before acting.
          </p>
        </div>
      )}
    </div>
  );
}
