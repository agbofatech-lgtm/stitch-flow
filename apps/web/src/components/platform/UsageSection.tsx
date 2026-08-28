/**
 * Phase 10 — Usage: real telemetry only.
 *  - 30-day feature usage (usage_events, grouped server-side)
 *  - platform activity (active workspaces, DAU/WAU/MAU)
 * No derived estimates, no invented numbers.
 */
import { useCallback, useEffect, useState } from 'react';
import { platformApi, type PlatformOverview } from '@shared/api/platform';
import { Card, EmptyState, ErrorState, Loading, MetricCard, describeApiError } from './ui';

type FeatureUsageRow = { feature: string; workspaces: number; uses: number };

export function UsageSection() {
  const [features, setFeatures] = useState<FeatureUsageRow[] | null>(null);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fu, ov] = await Promise.all([
        platformApi.featureUsage() as Promise<FeatureUsageRow[]>,
        platformApi.overview(),
      ]);
      setFeatures(fu);
      setOverview(ov);
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

  if (loading) return <Loading label="Loading usage telemetry…" />;
  if (error) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active workspaces (30d)" value={overview?.activeWorkspaces ?? 0} />
        <MetricCard label="Daily active" value={overview?.dailyActive ?? 0} />
        <MetricCard label="Weekly active" value={overview?.weeklyActive ?? 0} />
        <MetricCard label="Monthly active" value={overview?.monthlyActive ?? 0} />
      </div>

      <Card title="Feature usage (last 30 days)">
        {!features || features.length === 0 ? (
          <EmptyState>No feature usage recorded in the last 30 days.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="sf-table min-w-[480px] ">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">Feature</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Workspaces using it</th>
                  <th scope="col" className="py-2 font-medium">Total uses</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.feature} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800">{f.feature}</td>
                    <td className="py-2 pr-3 text-slate-600">{f.workspaces}</td>
                    <td className="py-2 text-slate-600">{f.uses}</td>
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
