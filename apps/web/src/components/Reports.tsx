import { useMemo, useState, type ElementType, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Users,
  Package,
  ShoppingBag,
  Crown,
  RefreshCw,
  Warehouse,
  Archive,
  CheckCircle2,
  Clock3,
  Sparkles,
  TimerReset,
  ClipboardList,
} from 'lucide-react';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import measuringTapeSoft from '@shared/assets/measuring-tape-soft.svg';
import sewingMachineSoft from '@shared/assets/sewing-machine-soft.svg';
import needleSoft from '@shared/assets/needle-soft.svg';
import { FeatureGate } from './FeatureGate';
import {
  buildOrdersByStage,
  filterOrdersByDateRange,
  getAverageTurnaroundDays,
  getBottleneckView,
  getMaterialConsumptionByGarmentType,
  getOverdueOrdersCount,
  getReadyForDeliveryCount,
  resolveReportingDateRange,
  type ReportingDatePreset,
} from '@shared/utils/reporting';

export function Reports() {
  const {
    payments,
    invoices,
    orders,
    customers,
    fabricRecords,
    materialUsages,
    currentWorkspace,
    setView,
  } = useApp();

  const workspaceCurrency = currentWorkspace.defaultCurrency || 'GHS';

  const [productionRangePreset, setProductionRangePreset] =
    useState<ReportingDatePreset>('last30Days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const startOfWeek = useMemo(() => {
    const next = new Date(now);
    const day = next.getDay();
    const diff = day === 0 ? 6 : day - 1;
    next.setDate(now.getDate() - diff);
    next.setHours(0, 0, 0, 0);
    return next;
  }, [now]);

  const selectedProductionRange = useMemo(
    () =>
      resolveReportingDateRange(
        productionRangePreset,
        customStartDate || undefined,
        customEndDate || undefined,
        now
      ),
    [productionRangePreset, customStartDate, customEndDate, now]
  );

  const reportData = useMemo(() => {
    const paymentsThisMonth = payments.filter((payment) => {
      const paidAt = new Date(payment.paidAt);
      return (
        payment.paymentStatus === 'captured' &&
        paidAt.getMonth() === currentMonth &&
        paidAt.getFullYear() === currentYear
      );
    });

    const paymentsThisWeek = payments.filter((payment) => {
      const paidAt = new Date(payment.paidAt);
      return payment.paymentStatus === 'captured' && paidAt >= startOfWeek;
    });

    const revenueThisMonth = paymentsThisMonth.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const revenueThisWeek = paymentsThisWeek.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const unpaidInvoices = invoices.filter((invoice) =>
      ['sent', 'partial', 'overdue'].includes(invoice.status)
    );

    const unpaidBalanceTotal = unpaidInvoices.reduce(
      (sum, invoice) => sum + invoice.balanceDue,
      0
    );

    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue');

    const overdueAmount = overdueInvoices.reduce(
      (sum, invoice) => sum + invoice.balanceDue,
      0
    );

    const paidInvoicesThisMonth = invoices.filter((invoice) => {
      const issueDate = new Date(invoice.issueDate);
      return (
        invoice.status === 'paid' &&
        issueDate.getMonth() === currentMonth &&
        issueDate.getFullYear() === currentYear
      );
    }).length;

    const customerSpendMap = new Map<string, number>();
    const customerOrderMap = new Map<string, number>();
    const customerPendingMap = new Map<string, number>();
    const customerOrderValueMap = new Map<string, number>();

    for (const order of orders) {
      customerOrderMap.set(
        order.customerId,
        (customerOrderMap.get(order.customerId) || 0) + 1
      );
      customerOrderValueMap.set(
        order.customerId,
        (customerOrderValueMap.get(order.customerId) || 0) + order.totalAmount
      );
    }

    for (const payment of payments.filter((p) => p.paymentStatus === 'captured')) {
      const order = orders.find((o) => o.id === payment.orderId);
      if (!order) continue;

      customerSpendMap.set(
        order.customerId,
        (customerSpendMap.get(order.customerId) || 0) + payment.amount
      );
    }

    for (const invoice of invoices.filter((inv) =>
      ['sent', 'partial', 'overdue'].includes(inv.status)
    )) {
      const order = orders.find((o) => o.id === invoice.orderId);
      if (!order) continue;

      customerPendingMap.set(
        order.customerId,
        (customerPendingMap.get(order.customerId) || 0) + invoice.balanceDue
      );
    }

    const customerInsights = customers
      .map((customer) => {
        const ordersCount = customerOrderMap.get(customer.id) || 0;
        const totalSpent = customerSpendMap.get(customer.id) || 0;
        const pendingBalance = customerPendingMap.get(customer.id) || 0;
        const totalOrderValue = customerOrderValueMap.get(customer.id) || 0;
        const averageOrderValue = ordersCount > 0 ? totalOrderValue / ordersCount : 0;

        return {
          customer,
          ordersCount,
          totalSpent,
          pendingBalance,
          totalOrderValue,
          averageOrderValue,
          isRepeatCustomer: ordersCount >= 2,
        };
      })
      .filter(
        (item) =>
          item.ordersCount > 0 ||
          item.totalSpent > 0 ||
          item.pendingBalance > 0 ||
          item.totalOrderValue > 0
      );

    const topCustomerEntry = Array.from(customerSpendMap.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const topCustomer = topCustomerEntry
      ? {
          customer:
            customers.find((customer) => customer.id === topCustomerEntry[0]) || null,
          amount: topCustomerEntry[1],
        }
      : null;

    const topCustomers = [...customerInsights]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const repeatCustomers = [...customerInsights]
      .filter((item) => item.isRepeatCustomer)
      .sort((a, b) => {
        if (b.ordersCount !== a.ordersCount) return b.ordersCount - a.ordersCount;
        return b.totalSpent - a.totalSpent;
      })
      .slice(0, 5);

    const repeatCustomerCount = customerInsights.filter(
      (item) => item.isRepeatCustomer
    ).length;

    const customersWithPendingBalances = customerInsights
      .filter((item) => item.pendingBalance > 0)
      .sort((a, b) => b.pendingBalance - a.pendingBalance)
      .slice(0, 5);

    const orderTypeMap = new Map<string, number>();
    const orderTypeRevenueMap = new Map<string, number>();

    for (const order of orders) {
      orderTypeMap.set(order.orderType, (orderTypeMap.get(order.orderType) || 0) + 1);
      orderTypeRevenueMap.set(
        order.orderType,
        (orderTypeRevenueMap.get(order.orderType) || 0) + order.totalAmount
      );
    }

    const bestSellingOrderTypes = Array.from(orderTypeMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        revenue: orderTypeRevenueMap.get(name) || 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.revenue - a.revenue;
      })
      .slice(0, 5);

    const topOrderTypeEntry = bestSellingOrderTypes[0] || null;

    const usageByMaterialMap = new Map<string, number>();
    const costByMaterialMap = new Map<string, number>();

    for (const usage of materialUsages) {
      usageByMaterialMap.set(
        usage.fabricRecordId,
        (usageByMaterialMap.get(usage.fabricRecordId) || 0) + usage.quantityUsed
      );

      const fabric = fabricRecords.find((item) => item.id === usage.fabricRecordId);
      const unitCost = fabric?.costPerUnit || 0;

      costByMaterialMap.set(
        usage.fabricRecordId,
        (costByMaterialMap.get(usage.fabricRecordId) || 0) +
          usage.quantityUsed * unitCost
      );
    }

    const topMaterialEntry = Array.from(usageByMaterialMap.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const topMaterial = topMaterialEntry
      ? {
          material:
            fabricRecords.find((material) => material.id === topMaterialEntry[0]) ||
            null,
          quantity: topMaterialEntry[1],
        }
      : null;

    const materialInsights = fabricRecords.map((material) => {
      const totalUsed = usageByMaterialMap.get(material.id) || 0;
      const totalCostUsed = costByMaterialMap.get(material.id) || 0;
      const isInactive = material.isActive === false;
      const isSlowMoving = totalUsed === 0 && material.isActive !== false;
      const isLowStock =
        material.isActive !== false &&
        typeof material.reorderLevel === 'number' &&
        material.quantityInStock <= material.reorderLevel;

      return {
        material,
        totalUsed,
        totalCostUsed,
        isInactive,
        isSlowMoving,
        isLowStock,
      };
    });

    const mostUsedMaterials = [...materialInsights]
      .filter((item) => item.totalUsed > 0)
      .sort((a, b) => {
        if (b.totalUsed !== a.totalUsed) return b.totalUsed - a.totalUsed;
        return b.totalCostUsed - a.totalCostUsed;
      })
      .slice(0, 5);

    const slowMovingMaterials = [...materialInsights]
      .filter((item) => item.isSlowMoving)
      .sort((a, b) => a.material.name.localeCompare(b.material.name))
      .slice(0, 5);

    const inactiveMaterials = [...materialInsights]
      .filter((item) => item.isInactive)
      .sort((a, b) => a.material.name.localeCompare(b.material.name))
      .slice(0, 5);

    const lowStockMaterials = [...materialInsights]
      .filter((item) => item.isLowStock)
      .sort((a, b) => a.material.quantityInStock - b.material.quantityInStock)
      .slice(0, 5);

    const totalMaterialUsageCost = materialInsights.reduce(
      (sum, item) => sum + item.totalCostUsed,
      0
    );

    const averageCustomerOrderValue =
      customerInsights.length > 0
        ? customerInsights.reduce((sum, item) => sum + item.averageOrderValue, 0) /
          customerInsights.length
        : 0;

    const orderStatusCounts = {
      draft: orders.filter((order) => order.status === 'draft').length,
      in_progress: orders.filter((order) => order.status === 'in_progress').length,
      ready: orders.filter((order) => order.status === 'ready').length,
      delivered: orders.filter((order) => order.status === 'delivered').length,
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
    };

    const openOverdueOrders = orders.filter((order) => {
      if (!order.dueDate) return false;
      if (['delivered', 'cancelled'].includes(order.status)) return false;
      return new Date(order.dueDate) < now;
    });

    const completionRate =
      orders.length > 0 ? (orderStatusCounts.delivered / orders.length) * 100 : 0;

    const activeWorkflowOrders =
      orderStatusCounts.draft + orderStatusCounts.in_progress + orderStatusCounts.ready;

    return {
      revenueThisMonth,
      revenueThisWeek,
      unpaidBalanceTotal,
      overdueAmount,
      paidInvoicesThisMonth,
      overdueInvoicesCount: overdueInvoices.length,
      unpaidInvoicesCount: unpaidInvoices.length,
      topCustomer,
      topCustomers,
      repeatCustomers,
      repeatCustomerCount,
      customersWithPendingBalances,
      averageCustomerOrderValue,
      topOrderType: topOrderTypeEntry
        ? { name: topOrderTypeEntry.name, count: topOrderTypeEntry.count }
        : null,
      bestSellingOrderTypes,
      orderStatusCounts,
      openOverdueOrdersCount: openOverdueOrders.length,
      completionRate,
      activeWorkflowOrders,
      topMaterial,
      mostUsedMaterials,
      slowMovingMaterials,
      inactiveMaterials,
      lowStockMaterials,
      totalMaterialUsageCost,
    };
  }, [
    payments,
    invoices,
    orders,
    customers,
    fabricRecords,
    materialUsages,
    currentMonth,
    currentYear,
    startOfWeek,
    now,
  ]);

  const trends = useMemo(() => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseMonth = new Date(currentYear, currentMonth - 5, 1);

    const revenueByMonth = monthLabels.map((_, index) => {
      const monthDate = new Date(
        baseMonth.getFullYear(),
        baseMonth.getMonth() + index,
        1
      );
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const amount = payments
        .filter((payment) => {
          const paidAt = new Date(payment.paidAt);
          return (
            payment.paymentStatus === 'captured' &&
            paidAt.getMonth() === month &&
            paidAt.getFullYear() === year
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      return { label: monthLabels[index], value: amount };
    });

    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revenueByWeek = weekLabels.map((label, index) => {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + index);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const amount = payments
        .filter((payment) => {
          const paidAt = new Date(payment.paidAt);
          return (
            payment.paymentStatus === 'captured' &&
            paidAt >= dayStart &&
            paidAt <= dayEnd
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      return { label, value: amount };
    });

    const paidTotal = invoices
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    const unpaidTotal = invoices
      .filter((invoice) => ['sent', 'partial', 'overdue'].includes(invoice.status))
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

    const overdueTrend = monthLabels.map((_, index) => {
      const monthDate = new Date(
        baseMonth.getFullYear(),
        baseMonth.getMonth() + index,
        1
      );
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const amount = invoices
        .filter((invoice) => {
          const dueDate = new Date(invoice.dueDate);
          return (
            invoice.status === 'overdue' &&
            dueDate.getMonth() === month &&
            dueDate.getFullYear() === year
          );
        })
        .reduce((sum, invoice) => sum + invoice.balanceDue, 0);

      return { label: monthLabels[index], value: amount };
    });

    const completionTrend = monthLabels.map((_, index) => {
      const monthDate = new Date(
        baseMonth.getFullYear(),
        baseMonth.getMonth() + index,
        1
      );
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const count = orders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return (
          order.status === 'delivered' &&
          createdAt.getMonth() === month &&
          createdAt.getFullYear() === year
        );
      }).length;

      return { label: monthLabels[index], value: count };
    });

    const overdueOrdersTrend = monthLabels.map((_, index) => {
      const monthDate = new Date(
        baseMonth.getFullYear(),
        baseMonth.getMonth() + index,
        1
      );
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();

      const count = orders.filter((order) => {
        if (!order.dueDate) return false;
        const dueDate = new Date(order.dueDate);
        return (
          !['delivered', 'cancelled'].includes(order.status) &&
          dueDate.getMonth() === month &&
          dueDate.getFullYear() === year &&
          dueDate < now
        );
      }).length;

      return { label: monthLabels[index], value: count };
    });

    return {
      revenueByMonth,
      revenueByWeek,
      paidTotal,
      unpaidTotal,
      overdueTrend,
      completionTrend,
      overdueOrdersTrend,
    };
  }, [payments, invoices, orders, currentMonth, currentYear, startOfWeek, now]);

  const productionKpis = useMemo(() => {
    const filteredOrders = filterOrdersByDateRange(orders, selectedProductionRange);
    const ordersByStage = buildOrdersByStage(orders, selectedProductionRange);
    const overdueOrdersCount = getOverdueOrdersCount(
      orders,
      selectedProductionRange,
      7,
      now
    );
    const readyForDeliveryCount = getReadyForDeliveryCount(
      orders,
      selectedProductionRange
    );
    const averageTurnaroundDays = getAverageTurnaroundDays(
      orders,
      selectedProductionRange
    );
    const materialConsumption = getMaterialConsumptionByGarmentType(
      orders,
      materialUsages,
      fabricRecords,
      selectedProductionRange
    );
    const bottleneckView = getBottleneckView(orders, selectedProductionRange);
    const topBottleneck = bottleneckView[0] || null;

    return {
      filteredOrdersCount: filteredOrders.length,
      ordersByStage,
      overdueOrdersCount,
      readyForDeliveryCount,
      averageTurnaroundDays,
      materialConsumption,
      bottleneckView,
      topBottleneck,
    };
  }, [orders, materialUsages, fabricRecords, selectedProductionRange, now]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-r from-[#0F6E8C] via-[#117793] to-[#0C5C74] p-6 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_24%)]" />

          <img
            src={measuringTapeSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-8 top-6 hidden h-20 w-20 rotate-6 opacity-[0.16] lg:block"
          />
          <img
            src={sewingMachineSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-32 bottom-6 hidden h-20 w-20 opacity-[0.14] lg:block"
          />
          <img
            src={needleSoft}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-44 top-24 hidden h-14 w-14 opacity-[0.14] xl:block"
          />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <img
                    src={stitchflowLogo}
                    alt={`${BRAND.productName} logo`}
                    className="h-9 w-auto"
                  />
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                  Business Intelligence
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Reports
              </h1>

              <p className="mt-3 max-w-2xl text-sm text-white/90 lg:text-base">
                Revenue, customers, materials, order demand, and studio performance
                insights in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TopInfoCard
                label="This Month"
                value={formatCurrency(
                  reportData.revenueThisMonth,
                  safeCurrency(workspaceCurrency)
                )}
                icon={DollarSign}
              />
              <TopInfoCard
                label="Repeat Clients"
                value={String(reportData.repeatCustomerCount)}
                icon={RefreshCw}
              />
              <TopInfoCard
                label="Top Order Type"
                value={reportData.topOrderType?.name || 'N/A'}
                icon={ShoppingBag}
              />
              <TopInfoCard
                label="Completion"
                value={`${reportData.completionRate.toFixed(0)}%`}
                icon={CheckCircle2}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Revenue This Month"
            value={formatCurrency(
              reportData.revenueThisMonth,
              safeCurrency(workspaceCurrency)
            )}
            subtitle="Captured payments this month"
            icon={DollarSign}
            tone="green"
            onClick={() => setView('invoices')}
          />

          <MetricCard
            title="Best-selling Type"
            value={reportData.topOrderType?.name || 'N/A'}
            subtitle={
              reportData.topOrderType
                ? `${reportData.topOrderType.count} orders`
                : 'No order data yet'
            }
            icon={ShoppingBag}
            tone="brand"
            onClick={() => setView('orders')}
          />

          <MetricCard
            title="Active Workflow"
            value={String(reportData.activeWorkflowOrders)}
            subtitle="Draft, in-progress, and ready"
            icon={RefreshCw}
            tone="sky"
            onClick={() => setView('orders')}
          />

          <MetricCard
            title="Overdue Orders"
            value={String(reportData.openOverdueOrdersCount)}
            subtitle="Past due and still open"
            icon={AlertTriangle}
            tone="red"
            onClick={() => setView('orders')}
          />
        </section>

        <SectionShell
          title="Production KPI Dashboard"
          subtitle="Actionable production metrics for stage flow, delivery readiness, and turnaround"
          actionLabel="Open orders"
          onAction={() => setView('orders')}
          headerSlot={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={productionRangePreset}
                onChange={(e) =>
                  setProductionRangePreset(e.target.value as ReportingDatePreset)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
              >
                <option value="last7Days">Last 7 days</option>
                <option value="last30Days">Last 30 days</option>
                <option value="thisMonth">This month</option>
                <option value="allTime">All time</option>
                <option value="custom">Custom range</option>
              </select>

              {productionRangePreset === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  />
                </>
              )}
            </div>
          }
        >
          <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-slate-600">
            Showing production KPIs for{' '}
            <span className="font-semibold text-slate-900">
              {selectedProductionRange.label}
            </span>
            .
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Orders in Range"
              value={String(productionKpis.filteredOrdersCount)}
              subtitle="Orders included in this KPI range"
              icon={ClipboardList}
              tone="brand"
              onClick={() => setView('orders')}
            />
            <MetricCard
              title="Orders by Stage"
              value={String(
                productionKpis.ordersByStage.reduce(
                  (sum, entry) => sum + entry.count,
                  0
                )
              )}
              subtitle="Stage-tracked orders in range"
              icon={BarChart3}
              tone="sky"
              onClick={() => setView('orders')}
            />
            <MetricCard
              title="Overdue Orders"
              value={String(productionKpis.overdueOrdersCount)}
              subtitle="Past deadline or stuck too long"
              icon={AlertTriangle}
              tone="red"
              onClick={() => setView('orders')}
            />
            <MetricCard
              title="Ready for Delivery"
              value={String(productionKpis.readyForDeliveryCount)}
              subtitle="Ready status or all stages complete"
              icon={CheckCircle2}
              tone="green"
              onClick={() => setView('orders')}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Orders by Stage
                  </h3>
                  <p className="text-sm text-slate-500">
                    Current production load across stages
                  </p>
                </div>

                <div className="rounded-2xl bg-sky-50 px-3 py-2 text-sm font-medium text-[#0F6E8C]">
                  {productionKpis.ordersByStage.length} stage
                  {productionKpis.ordersByStage.length === 1 ? '' : 's'}
                </div>
              </div>

              {productionKpis.ordersByStage.length === 0 ? (
                <EmptyBlock
                  icon={BarChart3}
                  title="No production stage data"
                  description="Orders with production stage data will appear here when available."
                />
              ) : (
                <ChartCard
                  title="Stage Distribution"
                  subtitle="Current stage counts"
                  data={productionKpis.ordersByStage.map((item) => ({
                    label: item.stage,
                    value: item.count,
                  }))}
                  tone="brand"
                />
              )}
            </div>

            <div className="rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Turnaround Snapshot
                  </h3>
                  <p className="text-sm text-slate-500">
                    Delivery speed and stage pressure signals
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                  {productionKpis.averageTurnaroundDays > 0
                    ? `${productionKpis.averageTurnaroundDays.toFixed(1)} days avg`
                    : 'No delivered orders'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <HighlightCard
                  title="Average Turnaround"
                  value={
                    productionKpis.averageTurnaroundDays > 0
                      ? `${productionKpis.averageTurnaroundDays.toFixed(1)} days`
                      : 'N/A'
                  }
                  subtitle="Created to delivered"
                  tone="brand"
                />
                <HighlightCard
                  title="Biggest Bottleneck"
                  value={productionKpis.topBottleneck?.stage || 'N/A'}
                  subtitle={
                    productionKpis.topBottleneck
                      ? `${productionKpis.topBottleneck.averageDays.toFixed(1)} avg days`
                      : 'No completed stage timing yet'
                  }
                  tone="amber"
                />
              </div>

              <div className="mt-5 space-y-3">
                {productionKpis.ordersByStage.slice(0, 5).map((item) => (
                  <div
                    key={item.stage}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{item.stage}</p>
                      <p className="text-sm text-slate-500">Current workload</p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
                      {item.count}
                    </div>
                  </div>
                ))}

                {productionKpis.ordersByStage.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                    No stage distribution available for this date range.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Advanced Production Reports
              </h3>
              <p className="text-sm text-slate-500">
                Material consumption and bottleneck views are available on Studio
              </p>
            </div>

            <FeatureGate
              feature="advancedReports"
              title="Advanced Production Reports"
              description="Upgrade to Studio to unlock material consumption and bottleneck timing across production."
              compact
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <h4 className="mb-4 text-base font-semibold text-slate-900">
                    Material Consumption by Garment Type
                  </h4>

                  {productionKpis.materialConsumption.length === 0 ? (
                    <EmptyBlock
                      icon={Package}
                      title="No material consumption yet"
                      description="Tracked material usage linked to orders will appear here."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Garment Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Quantity Used
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Usage Records
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Linked Orders
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {productionKpis.materialConsumption.map((item) => (
                            <tr key={item.garmentType}>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                {item.garmentType}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {item.totalQuantity.toFixed(2)} {item.unitLabel}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {item.usageCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {item.orderCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <h4 className="mb-4 text-base font-semibold text-slate-900">
                    Bottleneck View
                  </h4>

                  {productionKpis.bottleneckView.length === 0 ? (
                    <EmptyBlock
                      icon={TimerReset}
                      title="No bottleneck data yet"
                      description="Completed production stages with timestamps will appear here."
                    />
                  ) : (
                    <HorizontalStageBars data={productionKpis.bottleneckView} />
                  )}
                </div>
              </div>
            </FeatureGate>
          </div>
        </SectionShell>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard
            title="Revenue by Month"
            subtitle="Last 6 months"
            data={trends.revenueByMonth}
            tone="brand"
          />

          <ChartCard
            title="Revenue by Week"
            subtitle="Current week"
            data={trends.revenueByWeek}
            tone="sky"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComparisonCard
            title="Paid vs Unpaid"
            leftLabel="Paid Total"
            leftValue={formatCurrency(trends.paidTotal, safeCurrency(workspaceCurrency))}
            rightLabel="Unpaid Total"
            rightValue={formatCurrency(trends.unpaidTotal, safeCurrency(workspaceCurrency))}
          />

          <ChartCard
            title="Overdue Invoice Trend"
            subtitle="Overdue value by month"
            data={trends.overdueTrend}
            tone="amber"
          />
        </section>

        <SectionShell
          title="Customer Intelligence"
          subtitle="Top customers, repeat behavior, and outstanding balances"
          actionLabel="Open customers"
          onAction={() => setView('customers')}
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <HighlightCard
              title="Repeat Customers"
              value={String(reportData.repeatCustomerCount)}
              subtitle="Clients with 2 or more orders"
              tone="brand"
            />
            <HighlightCard
              title="Avg Order Value"
              value={formatCurrency(
                reportData.averageCustomerOrderValue,
                safeCurrency(workspaceCurrency)
              )}
              subtitle="Average customer order value"
              tone="sky"
            />
            <HighlightCard
              title="Pending Accounts"
              value={String(reportData.customersWithPendingBalances.length)}
              subtitle="Customers currently owing"
              tone="amber"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Top Customers</h3>

              {reportData.topCustomers.length === 0 ? (
                <EmptyBlock
                  icon={Users}
                  title="No customer insights yet"
                  description="Customer rankings will appear once orders and payments are recorded."
                />
              ) : (
                <div className="space-y-3">
                  {reportData.topCustomers.map((entry, index) => (
                    <RankedCustomerCard
                      key={entry.customer.id}
                      rank={index + 1}
                      name={entry.customer.fullName}
                      subtitle={`${entry.ordersCount} order${entry.ordersCount === 1 ? '' : 's'}`}
                      metrics={[
                        {
                          label: 'Captured Spend',
                          value: formatCurrency(
                            entry.totalSpent,
                            safeCurrency(workspaceCurrency)
                          ),
                          tone: 'green',
                        },
                        {
                          label: 'Pending Balance',
                          value: formatCurrency(
                            entry.pendingBalance,
                            safeCurrency(workspaceCurrency)
                          ),
                          tone: 'amber',
                        },
                        {
                          label: 'Order Count',
                          value: String(entry.ordersCount),
                          tone: 'brand',
                        },
                      ]}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">
                Repeat Customer Watch
              </h3>

              {reportData.repeatCustomers.length === 0 ? (
                <EmptyBlock
                  icon={RefreshCw}
                  title="No repeat customers yet"
                  description="Repeat customer insights will appear when customers place multiple orders."
                />
              ) : (
                <div className="space-y-3">
                  {reportData.repeatCustomers.map((entry) => (
                    <div
                      key={entry.customer.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3">
                        <p className="font-semibold text-slate-900">{entry.customer.fullName}</p>
                        <p className="text-sm text-slate-500">
                          Repeat client â€¢ {entry.ordersCount} orders
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <MiniMetric
                          label="Avg Order"
                          value={formatCurrency(
                            entry.averageOrderValue,
                            safeCurrency(workspaceCurrency)
                          )}
                          tone="sky"
                        />
                        <MiniMetric
                          label="Captured Spend"
                          value={formatCurrency(
                            entry.totalSpent,
                            safeCurrency(workspaceCurrency)
                          )}
                          tone="green"
                        />
                        <MiniMetric
                          label="Pending"
                          value={formatCurrency(
                            entry.pendingBalance,
                            safeCurrency(workspaceCurrency)
                          )}
                          tone="amber"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reportData.customersWithPendingBalances.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">
                    Pending Balance Watchlist
                  </h3>

                  <div className="space-y-3">
                    {reportData.customersWithPendingBalances.map((entry) => (
                      <div
                        key={entry.customer.id}
                        className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{entry.customer.fullName}</p>
                          <p className="text-sm text-slate-500">
                            {entry.ordersCount} order{entry.ordersCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-800">
                            {formatCurrency(
                              entry.pendingBalance,
                              safeCurrency(workspaceCurrency)
                            )}
                          </p>
                          <p className="text-xs text-amber-700">Pending balance</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Material Intelligence"
          subtitle="Most used, slow-moving, inactive, and low-stock materials"
          actionLabel="Open materials"
          onAction={() => setView('materials')}
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <HighlightCard
              title="Used Materials"
              value={String(reportData.mostUsedMaterials.length)}
              subtitle="Materials with tracked usage"
              tone="brand"
            />
            <HighlightCard
              title="Usage Cost"
              value={formatCurrency(
                reportData.totalMaterialUsageCost,
                safeCurrency(workspaceCurrency)
              )}
              subtitle="Estimated consumed material value"
              tone="sky"
            />
            <HighlightCard
              title="Slow-moving"
              value={String(reportData.slowMovingMaterials.length)}
              subtitle="Active materials with no usage"
              tone="amber"
            />
            <HighlightCard
              title="Inactive"
              value={String(reportData.inactiveMaterials.length)}
              subtitle="Materials marked inactive"
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Most Used Materials</h3>

              {reportData.mostUsedMaterials.length === 0 ? (
                <EmptyBlock
                  icon={Package}
                  title="No material usage yet"
                  description="Most used materials will appear when materials are assigned to orders."
                />
              ) : (
                <div className="space-y-3">
                  {reportData.mostUsedMaterials.map((entry, index) => (
                    <div
                      key={entry.material.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sm font-bold text-[#0F6E8C]">
                          {index === 0 ? <Crown className="h-5 w-5" /> : `#${index + 1}`}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">{entry.material.name}</p>
                          <p className="text-sm text-slate-500">
                            {entry.material.fabricType} â€¢ {entry.material.color}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <MiniMetric
                          label="Used"
                          value={`${entry.totalUsed} ${entry.material.unit}`}
                          tone="brand"
                        />
                        <MiniMetric
                          label="Usage Cost"
                          value={formatCurrency(
                            entry.totalCostUsed,
                            safeCurrency(workspaceCurrency)
                          )}
                          tone="sky"
                        />
                        <MiniMetric
                          label="In Stock"
                          value={`${entry.material.quantityInStock} ${entry.material.unit}`}
                          tone="green"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <ListBlock
                title="Slow-moving Materials"
                emptyIcon={Archive}
                emptyTitle="No slow-moving materials"
                emptyDescription="All active materials have some recorded usage."
                items={reportData.slowMovingMaterials.map((entry) => ({
                  key: entry.material.id,
                  name: entry.material.name,
                  subtitle: `${entry.material.fabricType} â€¢ ${entry.material.color}`,
                  value: `${entry.material.quantityInStock} ${entry.material.unit}`,
                  helper: 'No tracked usage',
                  tone: 'amber',
                }))}
              />

              <ListBlock
                title="Inactive Materials"
                emptyIcon={Warehouse}
                emptyTitle="No inactive materials"
                emptyDescription="All materials are currently active."
                items={reportData.inactiveMaterials.map((entry) => ({
                  key: entry.material.id,
                  name: entry.material.name,
                  subtitle: `${entry.material.fabricType} â€¢ ${entry.material.color}`,
                  value: `${entry.material.quantityInStock} ${entry.material.unit}`,
                  helper: 'Inactive stock',
                  tone: 'gray',
                }))}
              />

              {reportData.lowStockMaterials.length > 0 && (
                <ListBlock
                  title="Low-stock Watchlist"
                  emptyIcon={AlertTriangle}
                  emptyTitle=""
                  emptyDescription=""
                  items={reportData.lowStockMaterials.map((entry) => ({
                    key: entry.material.id,
                    name: entry.material.name,
                    subtitle: `Reorder level: ${entry.material.reorderLevel} ${entry.material.unit}`,
                    value: `${entry.material.quantityInStock} ${entry.material.unit}`,
                    helper: 'Low stock',
                    tone: 'red',
                  }))}
                />
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          title="Order Intelligence"
          subtitle="Best-selling order types, workflow distribution, completion, and overdue trends"
          actionLabel="Open orders"
          onAction={() => setView('orders')}
        >
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <HighlightCard
              title="Best-selling Type"
              value={reportData.topOrderType?.name || 'N/A'}
              subtitle={
                reportData.topOrderType
                  ? `${reportData.topOrderType.count} orders`
                  : 'No order data yet'
              }
              tone="brand"
            />
            <HighlightCard
              title="Delivered"
              value={String(reportData.orderStatusCounts.delivered)}
              subtitle="Completed orders"
              tone="sky"
            />
            <HighlightCard
              title="Ready"
              value={String(reportData.orderStatusCounts.ready)}
              subtitle="Ready for delivery"
              tone="amber"
            />
            <HighlightCard
              title="Overdue Open"
              value={String(reportData.openOverdueOrdersCount)}
              subtitle="Past due and not closed"
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">
                Best-selling Order Types
              </h3>

              {reportData.bestSellingOrderTypes.length === 0 ? (
                <EmptyBlock
                  icon={ShoppingBag}
                  title="No order type insights yet"
                  description="Order type rankings will appear when orders are created."
                />
              ) : (
                <div className="space-y-3">
                  {reportData.bestSellingOrderTypes.map((item, index) => (
                    <div
                      key={item.name}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-3 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sm font-bold text-[#0F6E8C]">
                          {index === 0 ? <Crown className="h-5 w-5" /> : `#${index + 1}`}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">
                            {item.count} order{item.count === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <MiniMetric
                          label="Orders"
                          value={String(item.count)}
                          tone="brand"
                        />
                        <MiniMetric
                          label="Revenue"
                          value={formatCurrency(
                            item.revenue,
                            safeCurrency(workspaceCurrency)
                          )}
                          tone="green"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-base font-semibold text-slate-900">
                  Workflow Distribution
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Draft"
                    value={String(reportData.orderStatusCounts.draft)}
                    icon={Package}
                    tone="amber"
                  />
                  <StatTile
                    label="In Progress"
                    value={String(reportData.orderStatusCounts.in_progress)}
                    icon={RefreshCw}
                    tone="brand"
                  />
                  <StatTile
                    label="Ready"
                    value={String(reportData.orderStatusCounts.ready)}
                    icon={CheckCircle2}
                    tone="sky"
                  />
                  <StatTile
                    label="Delivered"
                    value={String(reportData.orderStatusCounts.delivered)}
                    icon={Crown}
                    tone="slate"
                  />
                </div>
              </div>

              {reportData.openOverdueOrdersCount === 0 ? (
                <EmptyBlock
                  icon={Clock3}
                  title="No open overdue orders"
                  description="All open orders are currently on schedule."
                />
              ) : (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    {reportData.openOverdueOrdersCount} open order
                    {reportData.openOverdueOrdersCount === 1 ? '' : 's'} overdue
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Review late orders and update production flow to reduce delivery delays.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard
              title="Completion Trend"
              subtitle="Delivered orders by month"
              data={trends.completionTrend}
              tone="brand"
            />
            <ChartCard
              title="Overdue Orders Trend"
              subtitle="Open overdue orders by month"
              data={trends.overdueOrdersTrend}
              tone="amber"
            />
          </div>
        </SectionShell>

        <section className="relative overflow-hidden rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Studio-only Advanced Insights
            </h2>
            <p className="text-sm text-slate-500">
              Premium studio-level business signals and operational summaries
            </p>
          </div>

          <FeatureGate
            feature="advancedReports"
            title="Advanced insights require Studio plan"
            description="Unlock deeper reports, premium operational intelligence, multi-layer business visibility, and studio-grade reporting tools."
          >
            <>
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="Customer Base"
                  value={String(customers.length)}
                  icon={Users}
                  tone="brand"
                />
                <StatTile
                  label="Orders Logged"
                  value={String(orders.length)}
                  icon={ShoppingBag}
                  tone="sky"
                />
                <StatTile
                  label="Materials Tracked"
                  value={String(fabricRecords.length)}
                  icon={Package}
                  tone="slate"
                />
                <StatTile
                  label="Usage Records"
                  value={String(materialUsages.length)}
                  icon={BarChart3}
                  tone="amber"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <StudioInsightCard
                  title="Revenue Health"
                  value={formatCurrency(
                    reportData.revenueThisMonth,
                    safeCurrency(workspaceCurrency)
                  )}
                  description="Monthly captured revenue gives a live snapshot of current business performance."
                  icon={TrendingUp}
                  tone="brand"
                />

                <StudioInsightCard
                  title="Operations Risk"
                  value={String(reportData.openOverdueOrdersCount)}
                  description="Open overdue orders highlight possible delivery bottlenecks and customer risk."
                  icon={AlertTriangle}
                  tone="amber"
                />

                <StudioInsightCard
                  title="Inventory Exposure"
                  value={formatCurrency(
                    reportData.totalMaterialUsageCost,
                    safeCurrency(workspaceCurrency)
                  )}
                  description="Tracked material usage cost helps connect inventory movement to production value."
                  icon={Warehouse}
                  tone="sky"
                />
              </div>
            </>
          </FeatureGate>
        </section>
      </div>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  actionLabel,
  onAction,
  headerSlot,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  headerSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-lg">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {headerSlot}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="text-sm font-medium text-[#0F6E8C] hover:text-[#0C5C74]"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {children}
    </section>
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
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs uppercase tracking-wide text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone: 'green' | 'brand' | 'amber' | 'red' | 'sky';
  onClick?: () => void;
}) {
  const tones = {
    green: 'bg-green-100 text-green-600',
    brand: 'bg-sky-100 text-[#0F6E8C]',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    sky: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-white/60 bg-white/90 p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function ChartCard({
  title,
  subtitle,
  data,
  tone,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number }>;
  tone: 'brand' | 'sky' | 'amber';
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  const barTones = {
    brand: 'bg-[#0F6E8C]',
    sky: 'bg-cyan-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-lg">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex h-48 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end">
              <div
                className={`w-full rounded-t-xl ${barTones[tone]}`}
                style={{
                  height: `${Math.max(
                    (item.value / max) * 100,
                    item.value > 0 ? 8 : 0
                  )}%`,
                }}
              />
            </div>
            <p className="text-center text-xs font-medium text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  title: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/90 p-6 shadow-lg">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            {leftLabel}
          </p>
          <p className="mt-2 text-xl font-bold text-green-900">{leftValue}</p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {rightLabel}
          </p>
          <p className="mt-2 text-xl font-bold text-amber-900">{rightValue}</p>
        </div>
      </div>
    </div>
  );
}

function HighlightCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: 'brand' | 'sky' | 'amber' | 'slate';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    sky: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{subtitle}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'amber' | 'brand' | 'sky';
}) {
  const tones = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    brand: 'bg-sky-50 text-[#0F6E8C]',
    sky: 'bg-cyan-50 text-cyan-700',
  };

  return (
    <div className={`rounded-2xl p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ElementType;
  tone: 'brand' | 'sky' | 'slate' | 'amber';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    sky: 'bg-cyan-50 text-cyan-700',
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  );
}

function RankedCustomerCard({
  rank,
  name,
  subtitle,
  metrics,
}: {
  rank: number;
  name: string;
  subtitle: string;
  metrics: Array<{
    label: string;
    value: string;
    tone: 'green' | 'amber' | 'brand' | 'sky';
  }>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sm font-bold text-[#0F6E8C]">
          {rank === 1 ? <Crown className="h-5 w-5" /> : `#${rank}`}
        </div>

        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:min-w-[420px]">
        {metrics.map((metric) => (
          <MiniMetric
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </div>
    </div>
  );
}

function ListBlock({
  title,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  items,
}: {
  title: string;
  emptyIcon: ElementType;
  emptyTitle: string;
  emptyDescription: string;
  items: Array<{
    key: string;
    name: string;
    subtitle: string;
    value: string;
    helper: string;
    tone: 'amber' | 'gray' | 'red';
  }>;
}) {
  const toneStyles = {
    amber: 'border-amber-100 bg-amber-50 text-amber-800 text-amber-700',
    gray: 'border-slate-200 bg-slate-50 text-slate-700 text-slate-500',
    red: 'border-red-100 bg-red-50 text-red-700 text-red-600',
  } as const;

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-slate-900">{title}</h3>

      {items.length === 0 ? (
        <EmptyBlock
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const classes = toneStyles[item.tone];
            const parts = classes.split(' ');
            return (
              <div
                key={item.key}
                className={`rounded-2xl border ${parts[0]} ${parts[1]} px-4 py-3`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${parts[2]}`}>{item.value}</p>
                    <p className={`text-xs ${parts[3]}`}>{item.helper}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudioInsightCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  tone: 'brand' | 'amber' | 'sky';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-cyan-50 text-cyan-700',
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function HorizontalStageBars({
  data,
}: {
  data: Array<{
    stage: string;
    averageDays: number;
    sampleSize: number;
  }>;
}) {
  const max = Math.max(...data.map((item) => item.averageDays), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.stage}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{item.stage}</p>
              <p className="text-sm text-slate-500">
                {item.sampleSize} completed stage
                {item.sampleSize === 1 ? '' : 's'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900">
                {item.averageDays.toFixed(1)} days
              </p>
              <p className="text-xs text-slate-500">Average duration</p>
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${Math.max((item.averageDays / max) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-slate-400" />
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
