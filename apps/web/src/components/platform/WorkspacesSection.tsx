/**
 * Phase 10 — Workspaces: platform-wide workspace roster + operational
 * detail (owner, members, plan, usage, developer surface counts). Workspace
 * status and USER status are shown separately — they are different things.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  platformApi,
  type PlatformWorkspaceDetail,
  type PlatformWorkspaceRow,
} from '@shared/api/platform';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  MetricCard,
  StatusBadge,
  describeApiError,
  fmtDate,
  fmtDateTime,
} from './ui';

export function WorkspacesSection() {
  const [rows, setRows] = useState<PlatformWorkspaceRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await platformApi.workspaces(100));
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

  if (loading) return <Loading label="Loading workspaces…" />;
  if (error) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <Card title={`Workspaces${rows ? ` (${rows.length})` : ''}`}>
        {!rows || rows.length === 0 ? (
          <EmptyState>No workspaces yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Workspace</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Plan</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Members</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Customers</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Orders</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Errors 7d</th>
                  <th scope="col" className="py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr
                    key={w.id}
                    className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === w.id ? 'bg-sky-50/70' : ''}`}
                    onClick={() => setSelectedId(w.id)}
                  >
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(w.id);
                        }}
                        className="text-left font-medium text-[#0F6E8C] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
                      >
                        {w.name}
                      </button>
                      <p className="text-[11px] text-slate-400">{w.id}</p>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{w.plan ?? '—'}</td>
                    <td className="py-2 pr-3">{w.subscription_status ? <StatusBadge status={w.subscription_status} /> : '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.members}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.customers}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.orders}</td>
                    <td className="py-2 pr-3 text-slate-600">{w.errors_7d}</td>
                    <td className="py-2 text-slate-600">{fmtDateTime(w.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedId && <WorkspaceDetailPanel workspaceId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function WorkspaceDetailPanel({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<PlatformWorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await platformApi.workspaceDetail(workspaceId));
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading workspace…" />;
  if (error) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;
  if (!detail) return null;

  const { workspace, owner, members, subscription, stats } = detail;

  return (
    <Card
      title="Workspace detail"
      actions={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Customers" value={stats?.customers ?? 0} />
          <MetricCard label="Orders" value={stats?.orders ?? 0} />
          <MetricCard label="Usage events (30d)" value={stats?.usage_30d ?? 0} />
          <MetricCard label="API requests (30d)" value={stats?.api_requests_30d ?? 0} />
          <MetricCard label="API keys" value={stats?.api_keys ?? 0} />
          <MetricCard label="Webhook endpoints" value={stats?.webhook_endpoints ?? 0} />
          <MetricCard label="Errors (7d)" value={stats?.errors_7d ?? 0} />
        </div>

        <div className="grid gap-4 text-sm lg:grid-cols-2">
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Workspace</h4>
            <p className="mt-1 font-medium text-slate-900">{workspace.name}</p>
            <p className="text-[11px] text-slate-400">{workspace.id} · created {fmtDate(workspace.created_at)}</p>
            <p className="mt-2 text-slate-600">
              Owner: {owner ? `${owner.full_name} (${owner.email})` : 'unknown'}{' '}
              {owner && <StatusBadge status={owner.status} />}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Workspace status is subscription-driven ({subscription ? `${subscription.plan_code} — ${subscription.status}` : 'no subscription'});
              the owner badge above is the USER account status — they are independent.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Members ({members.length})</h4>
            <ul className="mt-1 space-y-1">
              {members.map((m) => (
                <li key={m.user_id} className="text-slate-600">
                  {m.full_name} — {m.email} · {m.role} · joined {fmtDate(m.joined_at)} · <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
