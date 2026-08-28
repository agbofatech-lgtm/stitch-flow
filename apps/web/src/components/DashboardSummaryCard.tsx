import { useEffect, useState } from 'react';
import { getDashboardSummary, type DashboardSummary } from '@shared/utils/dashboardApi';
import { MetricCard } from './ui/Card';
import { ErrorState, Skeleton } from './ui/Feedback';
import { Stagger } from './ui/motion';

export function DashboardSummaryCard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const summary = await getDashboardSummary();
        setData(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard summary');
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" aria-busy="true" aria-label="Loading dashboard summary">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-4 shadow-e1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-14" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} status={null} />;
  }

  if (!data) {
    return null;
  }

  return (
    <Stagger className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="Customers" value={data.totalCustomers} />
      <MetricCard label="Orders" value={data.totalOrders} />
      <MetricCard label="Pending Orders" value={data.pendingOrders} />
      <MetricCard label="Revenue" value={`${data.currency} ${(data.totalRevenue ?? 0).toLocaleString()}`} />
      <MetricCard label="Pending Balances" value={`${data.currency} ${(data.pendingBalances ?? 0).toLocaleString()}`} />
      <MetricCard label="Due Alerts" value={data.dueAlerts} />
    </Stagger>
  );
}
