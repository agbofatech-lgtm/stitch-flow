/**
 * Phase 10 — Overview: real platform metrics only (30-day activity summary +
 * workspace roster counts). No estimates, no placeholders.
 */
import { useCallback, useEffect, useState } from 'react';
import { platformApi, type PlatformOverview, type PlatformWorkspaceRow } from '@shared/api/platform';
import { Card, EmptyState, ErrorState, Loading, MetricCard, describeApiError, fmtDateTime } from './ui';

export function OverviewSection() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [workspaces, setWorkspaces] = useState<PlatformWorkspaceRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ws] = await Promise.all([platformApi.overview(), platformApi.workspaces(25)]);
      setOverview(ov);
      setWorkspaces(ws);
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

  if (loading) return <Loading label="Loading platform overview…" />;
  if (error) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;

  const totalCustomers = (workspaces ?? []).reduce((sum, w) => sum + Number(w.customers ?? 0), 0);
  const errors7d = (workspaces ?? []).reduce((sum, w) => sum + Number(w.errors_7d ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active workspaces (30d)" value={overview?.activeWorkspaces ?? 0} />
        <MetricCard label="Daily active" value={overview?.dailyActive ?? 0} />
        <MetricCard label="Weekly active" value={overview?.weeklyActive ?? 0} />
        <MetricCard label="Monthly active" value={overview?.monthlyActive ?? 0} />
        <MetricCard label="Customers (top 25 workspaces)" value={totalCustomers} />
        <MetricCard label="Errors (7d, top 25 workspaces)" value={errors7d} />
      </div>

      <Card title="Recent workspaces">
        {!workspaces || workspaces.length === 0 ? (
          <EmptyState>No workspaces yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Workspace</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Plan</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Members</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Customers</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Errors 7d</th>
                  <th scope="col" className="py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-800">{w.name}</p>
                      <p className="text-[11px] text-slate-400">{w.id}</p>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{w.plan ?? '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.members}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.customers}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.errors_7d}</td>
                    <td className="py-2 text-slate-600">{fmtDateTime(w.last_activity)}</td>
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
