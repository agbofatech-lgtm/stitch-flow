/**
 * Phase 10 — Signals, Errors & Incidents.
 *  - Signals: the certified health-signals endpoint (counts + trend only,
 *    no AI diagnosis anywhere in this phase).
 *  - Errors: recent error records (severity, route, workspace, message).
 *  - Incidents: existing lifecycle states; status updates go through the
 *    certified operate-level PATCH and are audited server-side.
 */
import { useCallback, useEffect, useState } from 'react';
import { platformApi } from '@shared/api/platform';
import {
  Card,
  ConfirmAction,
  EmptyState,
  ErrorState,
  Loading,
  describeApiError,
  fmtDateTime,
} from './ui';

type Signal = { signal: string; last24h: number; prior24h: number; trend: string };
type ErrorRecord = {
  error_id: string;
  workspace_id: string | null;
  error_code: string;
  route: string | null;
  feature: string | null;
  severity: string;
  message: string;
  occurred_at: string;
  request_id: string | null;
};
type Incident = {
  fingerprint: string;
  status: string;
  occurrence_count: number;
  first_seen_at: string;
  last_occurrence_at: string;
  message?: string;
};

const INCIDENT_STATES = ['NEW', 'INVESTIGATING', 'KNOWN', 'FIXED', 'RELEASED', 'RESOLVED', 'IGNORED'];

export function ObservabilitySection() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [errors, setErrors] = useState<ErrorRecord[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sg, er, inc] = await Promise.all([
        platformApi.signals() as Promise<Signal[]>,
        platformApi.errors(50) as Promise<ErrorRecord[]>,
        platformApi.incidents() as Promise<Incident[]>,
      ]);
      setSignals(sg);
      setErrors(er);
      setIncidents(inc);
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading signals and errors…" />;
  if (error) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <Card title="Health signals (last 24h)">
        {!signals || signals.length === 0 ? (
          <EmptyState>No signals.</EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-3">
            {signals.map((s) => (
              <li key={s.signal} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-800">{s.signal.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {s.last24h}
                  <span className="ml-2 text-xs font-medium text-slate-500">prior 24h: {s.prior24h}</span>
                </p>
                <p className={`text-[11px] font-semibold ${s.trend === 'rising' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {s.trend === 'rising' ? 'Rising' : 'Stable'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Incidents">
        {!incidents || incidents.length === 0 ? (
          <EmptyState>No incidents recorded.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Fingerprint</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Occurrences</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Last seen</th>
                  <th scope="col" className="py-2 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <IncidentRow key={inc.fingerprint} incident={inc} onUpdated={() => void load()} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recent errors">
        {!errors || errors.length === 0 ? (
          <EmptyState>No recent errors.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Severity</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Code</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Route</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Workspace</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Message</th>
                  <th scope="col" className="py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((er) => (
                  <tr key={er.error_id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          er.severity === 'fatal'
                            ? 'bg-rose-100 text-rose-800'
                            : er.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {er.severity}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{er.error_code}</td>
                    <td className="py-2 pr-3 text-slate-600">{er.route ?? '—'}</td>
                    <td className="py-2 pr-3 text-[11px] text-slate-500">{er.workspace_id ?? '—'}</td>
                    <td className="max-w-[280px] truncate py-2 pr-3 text-slate-600" title={er.message}>
                      {er.message}
                    </td>
                    <td className="py-2 text-slate-600">{fmtDateTime(er.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function IncidentRow({ incident, onUpdated }: { incident: Incident; onUpdated: () => void }) {
  const [nextStatus, setNextStatus] = useState(incident.status);
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 pr-3">
        <p className="max-w-[180px] truncate font-medium text-slate-800" title={incident.fingerprint}>
          {incident.fingerprint}
        </p>
        {incident.message && <p className="max-w-[180px] truncate text-[11px] text-slate-500">{incident.message}</p>}
      </td>
      <td className="py-2 pr-3 text-slate-600">{incident.status}</td>
      <td className="py-2 pr-3 text-slate-600">{incident.occurrence_count}</td>
      <td className="py-2 pr-3 text-slate-600">{fmtDateTime(incident.last_occurrence_at)}</td>
      <td className="py-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <label>
            <span className="sr-only">New status for incident {incident.fingerprint}</span>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="rounded-xl border border-slate-300 px-2 py-1.5 text-xs text-slate-800 focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]"
            >
              {INCIDENT_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <ConfirmAction
            label="Update status"
            confirmLabel={`Set ${nextStatus}?`}
            onConfirm={async () => {
              await platformApi.updateIncident(incident.fingerprint, nextStatus);
              onUpdated();
              return `Incident set to ${nextStatus}.`;
            }}
          />
        </span>
      </td>
    </tr>
  );
}
