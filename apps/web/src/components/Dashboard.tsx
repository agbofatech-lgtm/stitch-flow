import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  ArrowRight,
  Lock,
  Package,
  Warehouse,
  BarChart3,
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { getDashboardSummary, type DashboardSummary } from '@shared/utils/dashboardApi';
import { API_BASE } from '@shared/utils/api';
import { getDashboardDataBundle } from '@shared/utils/dashboardDataApi';
import { getPaymentsAnalytics, type PaymentsAnalytics } from '@shared/utils/paymentsAnalyticsApi';
import type { ApiOrder } from '@shared/api/orders';
import type { ApiInvoice } from '@shared/api/invoices';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import scissorsSoft from '@shared/assets/scissors-soft.svg';
import measuringTapeSoft from '@shared/assets/measuring-tape-soft.svg';
import sewingMachineSoft from '@shared/assets/sewing-machine-soft.svg';
import tailoringSoft from '@shared/assets/tailoring-soft.svg';
import symbolSoft from '@shared/assets/symbol-soft.svg';
import { DashboardSummaryCard } from './DashboardSummaryCard';

const ACTIVE_ORDER_STATUSES = new Set(['draft', 'in_progress', 'ready']);

const cardShellClass =
  'rounded-sf-lg border border-white/60 bg-surface-panel/90 p-6 shadow-lg';

const interactiveFocusClass =
  'focus:outline-none focus:ring-2 focus:ring-line focus:ring-offset-2';

export function Dashboard() {
  const {
    customers,
    currentMember,
    currentWorkspace,
    featureAccess,
    setView,
    fabricRecords,
    getLowStockMaterials,
  } = useApp();

  const [realSummary, setRealSummary] = useState<DashboardSummary | null>(null);
  const [realOrders, setRealOrders] = useState<ApiOrder[]>([]);
  const [realInvoices, setRealInvoices] = useState<ApiInvoice[]>([]);
  const [paymentsAnalytics, setPaymentsAnalytics] = useState<PaymentsAnalytics | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const summary = await getDashboardSummary();
        setRealSummary(summary);
      } catch (error) {
        console.error('Failed to load dashboard summary:', error);
      }
    }

    void loadSummary();
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const data = await getDashboardDataBundle();
        setRealOrders(data.orders);
        setRealInvoices(data.invoices);
      } catch (error) {
        console.error('Failed to load dashboard order/invoice data:', error);
      }
    }

    void loadDashboardData();
  }, []);

  useEffect(() => {
    async function loadPaymentsAnalytics() {
      try {
        const data = await getPaymentsAnalytics();
        setPaymentsAnalytics(data);
      } catch (error) {
        console.error('Failed to load payments analytics:', error);
      }
    }

    void loadPaymentsAnalytics();
  }, []);

  const workspaceCurrency = currentWorkspace?.defaultCurrency || 'GHS';
  const workspaceName = currentWorkspace?.name || 'your workspace';
  const firstName = getFirstName(currentMember?.user?.fullName);

  const customerNameById = useMemo(() => {
    return new Map((customers || []).map((customer) => [customer.id, customer.fullName]));
  }, [customers]);

  const recentOrders = useMemo(() => realOrders.slice(0, 5), [realOrders]);

  const overdueInvoices = useMemo(
    () =>
      realInvoices.filter((invoice) => {
        if (invoice.status === 'overdue') return true;
        if (!invoice.dueDate) return false;
        return new Date(invoice.dueDate).getTime() < Date.now() && invoice.balanceDue > 0;
      }),
    [realInvoices]
  );

  const lowStockMaterials = useMemo(
    () => getLowStockMaterials(),
    [getLowStockMaterials]
  );

  const ordersDueToday = useMemo(
    () =>
      realOrders.filter((order) => {
        const dueDate = getValidDate(order.dueDate);
        return !!dueDate && isToday(dueDate) && ACTIVE_ORDER_STATUSES.has(order.status);
      }),
    [realOrders]
  );

  const inventorySummary = useMemo(() => {
    const activeMaterials = fabricRecords.filter((item) => item.isActive !== false);

    const totalStockUnits = activeMaterials.reduce(
      (sum, item) => sum + (Number(item.quantityInStock) || 0),
      0
    );

    const stockValue = activeMaterials.reduce((sum, item) => {
      const unitCost = Number(item.costPerUnit) || 0;
      const quantity = Number(item.quantityInStock) || 0;
      return sum + unitCost * quantity;
    }, 0);

    const materialsByType = activeMaterials.reduce((acc, item) => {
      const type = item.fabricType || 'uncategorized';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTypeEntry = Object.entries(materialsByType).sort((a, b) => b[1] - a[1])[0];

    return {
      totalMaterials: activeMaterials.length,
      totalStockUnits,
      stockValue,
      topType: topTypeEntry?.[0] || 'n/a',
    };
  }, [fabricRecords]);

  const weeklyRevenue = paymentsAnalytics ?? {
    bars: [
      { label: 'S', value: 0 },
      { label: 'S', value: 0 },
      { label: 'M', value: 0 },
      { label: 'T', value: 0 },
      { label: 'W', value: 0 },
      { label: 'T', value: 0 },
      { label: 'F', value: 0 },
    ],
    thisWeekTotal: 0,
    previousWeekTotal: 0,
    trendPercent: 0,
    hasRevenue: false,
  };

  const maxRevenueBarValue = Math.max(...((weeklyRevenue?.bars ?? [])?.map(item => item.value) ?? []), 0);

  const displayCustomerCount = realSummary?.totalCustomers ?? customers.length;
  const displayOrderCount = realSummary?.totalOrders ?? realOrders.length;
  const displayRevenue = realSummary?.totalRevenue ?? 0;
  const displayPendingBalances = realSummary?.pendingBalances ?? 0;
  const displayDueAlerts = realSummary?.dueAlerts ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-canvas via-surface-panel to-surface-workspace p-4 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative mb-8 overflow-hidden rounded-sf-workspace border border-white/50 bg-gradient-to-r from-action-primary via-action-primary to-action-hover p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />

          <img
            src={tailoringSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 hidden h-[220px] w-auto -translate-y-1/2 translate-x-8 opacity-50 lg:block"
          />

          <img
            src={scissorsSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-8 top-5 hidden h-16 w-16 rotate-6 opacity-50 md:block"
          />

          <img
            src={measuringTapeSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-[43%] top-20 hidden h-14 w-14 -rotate-12 opacity-50 xl:block"
          />

          <img
            src={sewingMachineSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-6 right-24 hidden h-16 w-16 opacity-50 lg:block"
          />

          <img
            src={symbolSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-5 left-[34%] hidden h-12 w-12 opacity-50 xl:block"
          />

          <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-surface-panel px-3 py-2 shadow-sm">
                  <img
                    src={stitchflowLogo}
                    alt={`${BRAND.productName} logo`}
                    className="h-9 w-auto"
                  />
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-surface-panel/15 px-3 py-1 text-sm backdrop-blur-sm">
                  <TrendingUp className="h-4 w-4" />
                  Studio Overview
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Dashboard</h1>

              <p className="mt-3 max-w-2xl text-sm text-white/90 lg:text-base">
                Welcome back, {firstName}. Here is your business, order, and inventory
                overview for <span className="font-semibold">{workspaceName}</span>.
              </p>

              <div className="mt-5 inline-flex rounded-full bg-surface-panel/12 px-4 py-2 text-sm text-white/95 backdrop-blur-sm">
                {BRAND.productName} by {BRAND.parentName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TopInfoCard label="Customers" value={String(displayCustomerCount)} icon={Users} />
              <TopInfoCard label="Orders" value={String(displayOrderCount)} icon={Package} />
              <TopInfoCard
                label="Low Stock"
                value={String(lowStockMaterials.length)}
                icon={AlertTriangle}
              />
              <TopInfoCard
                label="Materials"
                value={String(inventorySummary.totalMaterials)}
                icon={Warehouse}
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <DashboardSummaryCard />
        </div>

        {lowStockMaterials.length > 0 && (
          <div className="mb-8 rounded-sf-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <h2 className="text-lg font-semibold text-amber-900">Low-stock alerts</h2>
                  <p className="mt-1 text-sm text-amber-700">
                    {lowStockMaterials.length} material
                    {lowStockMaterials.length > 1 ? 's are' : ' is'} at or below reorder
                    level.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {lowStockMaterials.slice(0, 6).map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-surface-panel px-3 py-1 text-xs font-medium text-amber-800 shadow-sm"
                      >
                        {item.name} � {item.quantityInStock} {item.unit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setView('materials')}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 ${interactiveFocusClass}`}
              >
                Open Materials <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(displayRevenue, workspaceCurrency)}
            icon={DollarSign}
            color="green"
            subtitle="Real database revenue"
            onClick={() => setView('invoices')}
          />
          <MetricCard
            title="Pending Balances"
            value={formatCurrency(displayPendingBalances, workspaceCurrency)}
            icon={Clock}
            color="amber"
            subtitle="Real unpaid invoice balances"
            onClick={() => setView('invoices')}
          />
          <MetricCard
            title="Due Alerts"
            value={String(displayDueAlerts)}
            icon={AlertTriangle}
            color="red"
            subtitle="Real overdue / due-now items"
            onClick={() => setView('orders')}
          />
          <MetricCard
            title="Active Customers"
            value={String(displayCustomerCount)}
            icon={Users}
            color="brand"
            subtitle="Real customer count"
            onClick={() => setView('customers')}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className={`${cardShellClass} xl:col-span-1`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">Inventory Summary</h2>
              <button
                type="button"
                onClick={() => setView('materials')}
                className={`text-sm font-medium text-action-primary hover:text-action-hover ${interactiveFocusClass}`}
              >
                View materials
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoStat
                label="Materials"
                value={String(inventorySummary.totalMaterials)}
                accent="brand"
                onClick={() => setView('materials')}
              />
              <InfoStat
                label="Stock Units"
                value={String(inventorySummary.totalStockUnits)}
                accent="sky"
                onClick={() => setView('materials')}
              />
              <InfoStat
                label="Low Stock"
                value={String(lowStockMaterials.length)}
                accent="amber"
                onClick={() => setView('materials')}
              />
              <InfoStat
                label="Top Type"
                value={capitalize(inventorySummary.topType)}
                accent="slate"
                onClick={() => setView('materials')}
              />
            </div>

            <button
              type="button"
              onClick={() => setView('materials')}
              className={`mt-4 block w-full rounded-2xl bg-surface-workspace p-4 text-left transition hover:bg-action-secondary ${interactiveFocusClass}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Estimated Stock Value
              </p>
              <p className="mt-2 text-xl font-bold text-ink-primary">
                {formatCurrency(inventorySummary.stockValue, safeCurrency(workspaceCurrency))}
              </p>
            </button>
          </div>

          <div className={`${cardShellClass} xl:col-span-1`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">Due Today</h2>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-medium text-red-700">
                {ordersDueToday.length}
              </span>
            </div>

            {ordersDueToday.length === 0 ? (
              <p className="text-sm text-ink-muted">No orders due today ??</p>
            ) : (
              <div className="space-y-3">
                {(ordersDueToday || []).map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setView('orders')}
                    className={`block w-full rounded-2xl border border-red-100 bg-red-50 p-3 text-left transition hover:bg-red-100 ${interactiveFocusClass}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-primary">{order.orderNumber}</p>
                        <p className="text-sm text-ink-muted">
                          {customerNameById.get(order.customerId) || '�'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          order.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`${cardShellClass} xl:col-span-1`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">Overdue Invoices</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-700">
                {overdueInvoices.length}
              </span>
            </div>

            {overdueInvoices.length === 0 ? (
              <p className="text-sm text-ink-muted">All invoices are up to date ?</p>
            ) : (
              <div className="space-y-3">
                {(overdueInvoices || []).map((invoice) => {
                  const dueDate = getValidDate(invoice.dueDate);

                  return (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => setView('invoices')}
                      className={`block w-full rounded-2xl border border-amber-100 bg-amber-50 p-3 text-left transition hover:bg-amber-100 ${interactiveFocusClass}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-primary">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-ink-muted">
                            Due: {dueDate ? format(dueDate, 'MMM d, yyyy') : '�'}
                          </p>
                        </div>

                        <span className="font-semibold text-amber-700">
                          {formatCurrency(
                            invoice.balanceDue,
                            safeCurrency(invoice.currency, workspaceCurrency)
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`${cardShellClass} mb-8`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-primary">Recent Orders</h2>
            <button
              type="button"
              onClick={() => setView('orders')}
              className={`flex items-center gap-1 text-sm font-medium text-action-primary hover:text-action-hover ${interactiveFocusClass}`}
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-ink-muted">No recent orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full">
                <thead>
                  <tr className="border-b border-line text-left text-sm text-ink-muted">
                    <th scope="col" className="pb-3 font-medium">
                      Order
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Customer
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Type
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Due Date
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="pb-3 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-line">
                  {(recentOrders || []).map((order) => {
                    const dueDate = getValidDate(order.dueDate);

                    return (
                      <tr key={order.id} className="text-sm hover:bg-surface-workspace">
                        <td className="py-3 font-medium text-ink-primary">
                          <button
                            type="button"
                            onClick={() => setView('orders')}
                            className={`rounded text-left hover:underline ${interactiveFocusClass}`}
                          >
                            {order.orderNumber}
                          </button>
                        </td>
                        <td className="py-3 text-ink-secondary">
                          {customerNameById.get(order.customerId) || '�'}
                        </td>
                        <td className="py-3 text-ink-secondary">{order.orderType || '�'}</td>
                        <td className="py-3 text-ink-secondary">
                          {dueDate ? (
                            <span className={getDueDateClass(dueDate, order.status)}>
                              {format(dueDate, 'MMM d, yyyy')}
                            </span>
                          ) : (
                            '�'
                          )}
                        </td>
                        <td className="py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-3 text-right font-medium text-ink-primary">
                          {formatCurrency(
                            order.totalAmount,
                            safeCurrency(order.currency, workspaceCurrency)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={`relative overflow-hidden ${cardShellClass}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">Revenue Analytics</h2>
              {!featureAccess.canViewAnalytics.allowed && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-600">
                  <Lock className="h-3 w-3" /> Pro
                </span>
              )}
            </div>

            {featureAccess.canViewAnalytics.allowed ? (
              <button
                type="button"
                onClick={() => setView('invoices')}
                className={`block w-full text-left ${interactiveFocusClass}`}
                aria-label="Open revenue analytics"
              >
                <div className="space-y-4">
                  <div className="flex h-32 items-end gap-2">
                    {(weeklyRevenue?.bars ?? [])?.map((bar, index) => (
                      <div
                        key={`${bar.label}-${index}`}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div
                          className="w-full rounded-t bg-action-primary"
                          style={{
                            height: `${
                              maxRevenueBarValue > 0
                                ? Math.max(16, Math.round((bar.value / maxRevenueBarValue) * 100))
                                : 16
                            }%`,
                          }}
                          title={`${bar.label}: ${formatCurrency(bar.value, workspaceCurrency)}`}
                        />
                        <span className="text-xs text-ink-muted">{bar.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-ink-muted">This week</p>
                      <p className="font-semibold text-ink-primary">
                        {formatCurrency(weeklyRevenue.thisWeekTotal, workspaceCurrency)}
                      </p>

                      <p className="text-xs text-ink-muted">
                        Prev: {formatCurrency(weeklyRevenue.previousWeekTotal, workspaceCurrency)}
                      </p>
                    </div>

                    <span
                      className={`flex items-center gap-1 font-medium ${
                        weeklyRevenue.trendPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      {weeklyRevenue.trendPercent >= 0 ? '+' : ''}
                      {(weeklyRevenue.trendPercent ?? 0).toFixed(1)}%
                    </span>
                  </div>

                  {!weeklyRevenue.hasRevenue && (
                    <p className="text-xs text-ink-muted">
                      No captured payments recorded in the last 14 days.
                    </p>
                  )}
                </div>
              </button>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-workspace/90 backdrop-blur-sm">
                <Lock className="mb-2 h-8 w-8 text-ink-muted" />
                <p className="font-medium text-ink-secondary">Analytics requires Pro plan</p>
                <button
                  type="button"
                  className={`mt-3 rounded-xl bg-action-primary px-4 py-2 text-sm font-medium text-white hover:bg-action-hover ${interactiveFocusClass}`}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>

          <div className={`relative overflow-hidden ${cardShellClass}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-primary">
                Studio Inventory Insights
              </h2>
              {!featureAccess.canViewAdvancedReports.allowed && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-600">
                  <Lock className="h-3 w-3" /> Studio
                </span>
              )}
            </div>

            {featureAccess.canViewAdvancedReports.allowed ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InsightCard
                    title="Low Stock Items"
                    value={String(lowStockMaterials.length)}
                    icon={AlertTriangle}
                    tone="amber"
                    onClick={() => setView('materials')}
                  />
                  <InsightCard
                    title="Inventory Value"
                    value={formatCurrency(
                      inventorySummary.stockValue,
                      safeCurrency(workspaceCurrency)
                    )}
                    icon={BarChart3}
                    tone="brand"
                    onClick={() => setView('materials')}
                  />
                  <InsightCard
                    title="Active Materials"
                    value={String(inventorySummary.totalMaterials)}
                    icon={Warehouse}
                    tone="sky"
                    onClick={() => setView('materials')}
                  />
                  <InsightCard
                    title="Top Fabric Type"
                    value={capitalize(inventorySummary.topType)}
                    icon={Package}
                    tone="slate"
                    onClick={() => setView('materials')}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setView('materials')}
                  className={`block w-full rounded-2xl bg-surface-workspace p-4 text-left transition hover:bg-action-secondary ${interactiveFocusClass}`}
                >
                  <p className="text-sm font-semibold text-ink-primary">Studio recommendation</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    {lowStockMaterials.length > 0
                      ? 'Reorder your low-stock materials to avoid production delays on upcoming orders.'
                      : 'Your inventory levels look healthy. Keep tracking material usage per order for stronger cost control.'}
                  </p>
                </button>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-workspace/90 backdrop-blur-sm">
                <Lock className="mb-2 h-8 w-8 text-ink-muted" />
                <p className="font-medium text-ink-secondary">
                  Advanced inventory insights require Studio plan
                </p>
                <button
                  type="button"
                  className={`mt-3 rounded-xl bg-action-primary px-4 py-2 text-sm font-medium text-white hover:bg-action-hover ${interactiveFocusClass}`}
                >
                  Upgrade to Studio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  onClick,
}: {
  title: string;
  value: string;
  icon: ElementType;
  color: 'green' | 'amber' | 'red' | 'brand';
  subtitle?: string;
  onClick?: () => void;
}) {
  const colors = {
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    brand: 'bg-action-secondary text-action-primary',
  };

  return (
    <Surface
      onClick={onClick}
      className={`rounded-sf-lg border border-white/60 bg-surface-panel/90 p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${interactiveFocusClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-ink-muted">{title}</p>
          <p className="text-2xl font-bold text-ink-primary">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>}
        </div>
        <div className={`rounded-2xl p-3 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Surface>
  );
}

function TopInfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-surface-panel/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-panel/15">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs uppercase tracking-wide text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoStat({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent: 'brand' | 'sky' | 'amber' | 'slate';
  onClick?: () => void;
}) {
  const accents = {
    brand: 'bg-action-secondary text-action-primary',
    sky: 'bg-action-secondary text-action-primary',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-action-secondary text-ink-secondary',
  };

  return (
    <Surface
      onClick={onClick}
      className={`rounded-2xl p-4 text-left transition hover:scale-[1.01] ${interactiveFocusClass} ${accents[accent]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </Surface>
  );
}

function InsightCard({
  title,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  icon: ElementType;
  tone: 'amber' | 'brand' | 'sky' | 'slate';
  onClick?: () => void;
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    brand: 'bg-action-secondary text-action-primary',
    sky: 'bg-action-secondary text-action-primary',
    slate: 'bg-action-secondary text-ink-secondary',
  };

  return (
    <Surface
      onClick={onClick}
      className={`rounded-2xl p-4 text-left transition hover:scale-[1.01] ${interactiveFocusClass} ${tones[tone]}`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-panel/70">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </Surface>
  );
}

function Surface({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className: string;
  children: ReactNode;
}) {
  if (!onClick) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-action-secondary text-ink-secondary',
    in_progress: 'bg-action-secondary text-action-primary',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-indigo-100 text-indigo-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function capitalize(value: string) {
  if (!value || value === 'n/a') return 'N/A';

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFirstName(fullName?: string | null) {
  const name = fullName?.trim();
  if (!name) return 'there';
  return name.split(/\s+/)[0];
}

function getValidDate(value?: string | Date | null) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDueDateClass(dueDate: Date, status?: string) {
  if (isPast(dueDate) && !['delivered', 'cancelled'].includes(status || '')) {
    return 'font-medium text-red-600';
  }

  if (isToday(dueDate)) {
    return 'font-medium text-amber-600';
  }

  return '';
}



