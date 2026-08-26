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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Loading dashboard summary...</p>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Customers</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{data.totalCustomers}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Orders</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{data.totalOrders}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Pending Orders</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{data.pendingOrders}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Revenue</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          {data.currency} {(data.totalRevenue ?? 0).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Pending Balances</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          {data.currency} {(data.pendingBalances ?? 0).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Due Alerts</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{data.dueAlerts}</p>
      </div>
    </div>
  );
}
