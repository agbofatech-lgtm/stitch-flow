/**
 * Phase 10 — Audit log: operator-visible trail of privileged operations
 * (actor / action / target / time / result metadata). Secrets are never
 * written into audit metadata by the services, so nothing needs redacting
 * here — the write side is the control.
 */
import { useCallback, useEffect, useState } from 'react';
import { platformApi, type PlatformAuditEntry } from '@shared/api/platform';
import { Card, EmptyState, ErrorState, Loading, describeApiError, fmtDateTime } from './ui';

const KNOWN_ACTIONS = [
  'platform.customer_created',
  'platform.customer_suspended',
  'platform.customer_reactivated',
  'platform.sessions_revoked',
  'platform.password_reset_sent',
  'platform.operator_role_changed',
  'platform.feature_flag_changed',
  'platform.incident_status_changed',
];

const PAGE = 50;

export function AuditSection() {
  const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const [totalShown, setTotalShown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      const useOffset = reset ? 0 : offset;
      try {
        const rows = await platformApi.auditLogs({ limit: PAGE, offset: useOffset, action: action || undefined });
        setEntries((prev) => (reset || useOffset === 0 ? rows : [...prev, ...rows]));
        setOffset(useOffset);
        setTotalShown(useOffset + rows.length);
        setError(null);
      } catch (e) {
        setError(describeApiError(e));
      } finally {
        setLoading(false);
      }
    },
    [action, offset]
  );

  // Refetch from the top whenever the filter changes; `load(true)` resets the
  // page and keeps `offset` consistent.
  useEffect(() => {
    void load(true);
  }, [action]);

  return (
    <Card
      title="Audit log"
      actions={
        <label className="text-xs font-medium text-slate-600">
          <span className="sr-only">Filter by action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]"
          >
            <option value="">All actions</option>
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {error ? (
        <ErrorState message={error.message} status={error.status} onRetry={() => void load(true)} />
      ) : loading && entries.length === 0 ? (
        <Loading label="Loading audit log…" />
      ) : entries.length === 0 ? (
        <EmptyState>No audit entries{action ? ` for ${action}` : ''}.</EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">When</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Action</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Actor</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Target</th>
                  <th scope="col" className="py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-600">{fmtDateTime(e.created_at)}</td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{e.action}</td>
                    <td className="py-2 pr-3 text-[11px] text-slate-500">{e.user_id ?? '—'}</td>
                    <td className="py-2 pr-3 text-[11px] text-slate-500">
                      {e.entity_type}
                      {e.entity_id ? ` · ${e.entity_id}` : ''}
                    </td>
                    <td className="max-w-[260px] truncate py-2 text-[11px] text-slate-500" title={e.metadata ? JSON.stringify(e.metadata) : undefined}>
                      {e.metadata ? JSON.stringify(e.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{totalShown} shown</span>
            <button
              type="button"
              disabled={loading || entries.length === 0}
              onClick={() => void load(false).then(() => setOffset((o) => o + PAGE))}
              className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
