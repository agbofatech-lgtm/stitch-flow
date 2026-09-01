import { useEffect, useState } from 'react';
import { getDashboardSummary, type DashboardSummary } from '@shared/utils/dashboardApi';

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
      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Loading dashboard summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Customers</p>
        <p className="mt-2 text-2xl font-bold text-ink-primary">{data.totalCustomers}</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Orders</p>
        <p className="mt-2 text-2xl font-bold text-ink-primary">{data.totalOrders}</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Pending Orders</p>
        <p className="mt-2 text-2xl font-bold text-ink-primary">{data.pendingOrders}</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Revenue</p>
        <p className="mt-2 text-2xl font-bold text-ink-primary">
          {data.currency} {(data.totalRevenue ?? 0).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Pending Balances</p>
        <p className="mt-2 text-2xl font-bold text-ink-primary">
          {data.currency} {(data.pendingBalances ?? 0).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-panel p-4 shadow-sm">
        <p className="text-sm text-ink-muted">Due Alerts</p>
        <p className="mt-2 text-2xl font-bold text-ink-primary">{data.dueAlerts}</p>
      </div>
    </div>
  );
}
