import { useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  Filter,
  Info,
  Package,
  Ruler,
  Scissors,
  Search,
  Shirt,
  Truck,
  Play,
  SkipForward,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportOrderJobSheetPdf } from '@modules/services/jobSheetExport';
import {
  getHighestOrderAlertSeverity,
  getOrderAlerts,
} from '@shared/utils/productionAlerts';
import type {
  Order,
  OrderAlert,
  OrderAlertSummary,
  ProductionPlan,
  ProductionStage,
  ProductionStageCode,
  ProductionStageStatus,
  StageOverdueAlert,
} from '../types';

const STAGE_TEMPLATES: Array<{ code: ProductionStageCode; label: string }> = [
  { code: 'measurement', label: 'Measurement' },
  { code: 'cutting', label: 'Cutting' },
  { code: 'sewing', label: 'Sewing' },
  { code: 'embroidery', label: 'Embroidery' },
  { code: 'first_fitting', label: 'First Fitting' },
  { code: 'second_fitting', label: 'Second Fitting' },
  { code: 'final_press', label: 'Final Press' },
  { code: 'ready', label: 'Ready' },
  { code: 'delivered', label: 'Delivered' },
];

type BoardFilter = 'all' | 'in_progress' | 'ready' | 'delivered' | 'overdue';
type StageAction = 'start' | 'complete' | 'skip' | 'reopen';
type AlertSeverityLevel = 'none' | 'info' | 'warning' | 'critical';

type EnrichedOrder = Order & {
  productionStages: ProductionStage[];
  progress: number;
  stageSummary: string;
  overdue: boolean;
  alertSummary: OrderAlertSummary;
  alertSeverity: AlertSeverityLevel;
  hasIssues: boolean;
};

export function ProductionBoard() {
  const {
    orders,
    selectedOrderId,
    selectOrder,
    updateOrder,
    canPerform,
    fabricRecords,
    designInspirations,
    currentWorkspace,
    getOrderMaterialUsages,
  } = useApp();

  const [filter, setFilter] = useState<BoardFilter>('all');
  const [search, setSearch] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const canManageOrders = canPerform('manage_orders');

  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    return orders.map((order) => {
      const stages = ensureStages(order.productionStages);
      const progress = getStageProgress(stages);
      const stageSummary = getStageSummary(stages);
      const overdue = isOrderOverdue(order);
      const alertSummary = getOrderAlerts({
        ...order,
        productionStages: stages,
      });
      const alertSeverity = getHighestOrderAlertSeverity(alertSummary.alerts);
      const hasIssues = alertSummary.alerts.length > 0;

      return {
        ...order,
        productionStages: stages,
        progress,
        stageSummary,
        overdue,
        alertSummary,
        alertSeverity,
        hasIssues,
      };
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return enrichedOrders.filter((order) => {
      const matchesSearch =
        !term ||
        order.orderNumber.toLowerCase().includes(term) ||
        order.orderType.toLowerCase().includes(term) ||
        (order.customer?.fullName || '').toLowerCase().includes(term) ||
        (order.garmentType || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      switch (filter) {
        case 'in_progress':
          return (
            order.status === 'in_progress' ||
            order.productionStages.some((stage) => stage.status === 'active')
          );
        case 'ready':
          return order.status === 'ready';
        case 'delivered':
          return order.status === 'delivered';
        case 'overdue':
          return order.overdue || order.alertSummary.hasOverdueStages;
        case 'all':
        default:
          return true;
      }
    });
  }, [enrichedOrders, filter, search]);

  const selectedOrder =
    enrichedOrders.find((order) => order.id === selectedOrderId) ||
    filteredOrders[0] ||
    null;

  const summary = useMemo(() => {
    const ready = enrichedOrders.filter((order) => order.status === 'ready').length;
    const delivered = enrichedOrders.filter((order) => order.status === 'delivered').length;
    const overdue = enrichedOrders.filter(
      (order) => order.overdue || order.alertSummary.hasOverdueStages
    ).length;
    const inProgress = enrichedOrders.filter(
      (order) =>
        order.status === 'in_progress' ||
        order.productionStages.some((stage) => stage.status === 'active')
    ).length;
    const issues = enrichedOrders.filter((order) => order.hasIssues).length;

    return {
      total: enrichedOrders.length,
      ready,
      delivered,
      overdue,
      inProgress,
      issues,
    };
  }, [enrichedOrders]);

  const handleSelectOrder = (orderId: string) => {
    selectOrder(orderId);
  };

  const handleStageAction = (
    order: Order,
    stageCode: ProductionStageCode,
    action: StageAction
  ) => {
    const currentStages = ensureStages(order.productionStages);
    const updatedStages = applyStageAction(currentStages, stageCode, action);
    const nextOrderStatus = deriveOrderStatus(updatedStages);

    updateOrder(order.id, {
      productionStages: updatedStages,
      status: nextOrderStatus,
    });
  };

  const handleQuickAction = (order: Order) => {
    const stages = ensureStages(order.productionStages);
    const currentIndex = getCurrentOpenStageIndex(stages);

    if (currentIndex === -1) return;

    const currentStage = stages[currentIndex];
    const action: StageAction =
      currentStage.status === 'active' ? 'complete' : 'start';

    handleStageAction(order, currentStage.code, action);
  };

  const handleStageNoteSave = (order: Order, stageCode: ProductionStageCode) => {
    const key = `${order.id}:${stageCode}`;
    const noteValue = noteDrafts[key] ?? '';
    const currentStages = ensureStages(order.productionStages);

    const updatedStages = currentStages.map((stage) =>
      stage.code === stageCode
        ? {
            ...stage,
            notes: noteValue.trim() || undefined,
          }
        : stage
    );

    updateOrder(order.id, {
      productionStages: updatedStages,
    });
  };

  const selectedPlan = selectedOrder?.productionPlan || null;
  const selectedStages = selectedOrder?.productionStages || [];
  const currentOpenStageIndex = selectedOrder
    ? getCurrentOpenStageIndex(selectedStages)
    : -1;
  const currentOpenStage =
    currentOpenStageIndex >= 0 ? selectedStages[currentOpenStageIndex] : null;

  const selectedFabric = useMemo(() => {
    if (!selectedOrder?.selectedFabricId) return null;
    return (
      fabricRecords.find((item) => item.id === selectedOrder.selectedFabricId) || null
    );
  }, [selectedOrder, fabricRecords]);

  const linkedInspiration = useMemo(() => {
    if (!selectedOrder?.designInspirationId) return null;
    return (
      designInspirations.find(
        (item) => item.id === selectedOrder.designInspirationId
      ) || null
    );
  }, [selectedOrder, designInspirations]);

  const selectedOrderMaterialUsages = useMemo(() => {
    if (!selectedOrder) return [];
    return getOrderMaterialUsages(selectedOrder.id);
  }, [selectedOrder, getOrderMaterialUsages]);

  const plannedMainFabricQty = selectedPlan?.fabricEstimate?.mainFabricQty || 0;

  const allocatedFabricQty = useMemo(() => {
    if (!selectedOrder || !selectedFabric) return 0;

    return selectedOrderMaterialUsages
      .filter((usage) => usage.fabricRecordId === selectedFabric.id)
      .reduce((sum, usage) => sum + usage.quantityUsed, 0);
  }, [selectedOrder, selectedFabric, selectedOrderMaterialUsages]);

  const remainingFabricToReserve = Math.max(
    plannedMainFabricQty - allocatedFabricQty,
    0
  );

  const hasStockShortage =
    !!selectedFabric && remainingFabricToReserve > selectedFabric.quantityInStock;

  const isLowStock =
    !!selectedFabric &&
    typeof selectedFabric.reorderLevel === 'number' &&
    selectedFabric.quantityInStock <= selectedFabric.reorderLevel;

  const overdueStageMap = useMemo<Record<ProductionStageCode, StageOverdueAlert>>(() => {
    if (!selectedOrder?.alertSummary.overdueStages.length) {
      return {} as Record<ProductionStageCode, StageOverdueAlert>;
    }

    return selectedOrder.alertSummary.overdueStages.reduce((acc, item) => {
      acc[item.stageCode] = item;
      return acc;
    }, {} as Record<ProductionStageCode, StageOverdueAlert>);
  }, [selectedOrder]);

  const handleExportJobSheet = () => {
    if (!selectedOrder) return;

    exportOrderJobSheetPdf({
      order: selectedOrder,
      inspiration: linkedInspiration,
      selectedFabric,
      workspaceName: currentWorkspace.name,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <div className="overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-r from-[#0F6E8C] via-[#117793] to-[#0C5C74] p-6 text-white shadow-2xl">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
                <ClipboardList className="h-4 w-4" />
                Workshop Operations
              </div>

              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Production Board
              </h1>

              <p className="mt-3 max-w-2xl text-sm text-white/90 lg:text-base">
                Move orders from measurement to delivery with real stage actions,
                timestamps, notes, material readiness, and intelligent production alerts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="Orders" value={String(summary.total)} icon={Package} />
              <SummaryCard label="In Progress" value={String(summary.inProgress)} icon={Scissors} />
              <SummaryCard label="Issues" value={String(summary.issues)} icon={AlertTriangle} />
              <SummaryCard label="Ready" value={String(summary.ready)} icon={CheckCircle2} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-xl backdrop-blur-sm">
            <div className="border-b border-slate-200 px-5 py-5">
              <h2 className="text-xl font-bold text-slate-900">Orders Queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter, and jump into production work.
              </p>
            </div>

            <div className="border-b border-slate-200 px-5 py-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order, customer, or garment"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FilterButton
                    label="All"
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                  />
                  <FilterButton
                    label="In Progress"
                    active={filter === 'in_progress'}
                    onClick={() => setFilter('in_progress')}
                  />
                  <FilterButton
                    label="Ready"
                    active={filter === 'ready'}
                    onClick={() => setFilter('ready')}
                  />
                  <FilterButton
                    label="Overdue"
                    active={filter === 'overdue'}
                    onClick={() => setFilter('overdue')}
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[920px] overflow-y-auto px-4 py-4">
              {filteredOrders.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-sky-200 bg-sky-50/60 p-8 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-sky-500" />
                  <p className="font-semibold text-slate-800">No production orders found</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Adjust the search or filter, or create new orders first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => handleSelectOrder(order.id)}
                      className={`block w-full rounded-[24px] border p-4 text-left transition ${getQueueCardClasses(
                        order,
                        selectedOrder?.id === order.id
                      )}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {order.orderNumber}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.customer?.fullName || 'No customer'} â€¢{' '}
                            {titleCase(order.garmentType || order.orderType || 'custom')}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getOrderBadgeClasses(
                            order
                          )}`}
                        >
                          {order.overdue ? 'Overdue' : titleCase(order.status)}
                        </span>
                      </div>

                      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#0F6E8C]"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{order.stageSummary}</span>
                        <span>{order.progress}% complete</span>
                      </div>

                      {order.hasIssues && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {order.alertSummary.alerts.slice(0, 2).map((alert, index) => (
                            <span
                              key={`${alert.code}-${index}`}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getAlertChipClasses(
                                alert.severity
                              )}`}
                            >
                              {alert.title}
                            </span>
                          ))}
                          {order.alertSummary.alerts.length > 2 && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              +{order.alertSummary.alerts.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>Due: {formatDate(order.dueDate)}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-xl backdrop-blur-sm">
            {!selectedOrder ? (
              <div className="flex min-h-[760px] items-center justify-center p-8">
                <div className="rounded-[28px] border border-dashed border-sky-200 bg-sky-50/60 p-10 text-center">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-500" />
                  <h3 className="text-lg font-semibold text-slate-800">No order selected</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Select an order from the queue to manage its workshop flow.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0F6E8C]">
                          {selectedOrder.orderNumber}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {titleCase(selectedOrder.garmentType || selectedOrder.orderType || 'custom')}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderBadgeClasses(
                            selectedOrder
                          )}`}
                        >
                          {selectedOrder.overdue ? 'Overdue' : titleCase(selectedOrder.status)}
                        </span>
                        {selectedOrder.alertSummary.isBlocked && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            Blocked
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedOrder.customer?.fullName || 'Unnamed Customer'}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Due date: {formatDate(selectedOrder.dueDate)} â€¢ Current stage:{' '}
                        {selectedOrder.stageSummary}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleExportJobSheet}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
                      >
                        <Download className="h-4 w-4" />
                        Export Job Sheet PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAction(selectedOrder)}
                        disabled={!canManageOrders || !currentOpenStage}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          canManageOrders && currentOpenStage
                            ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
                        }`}
                      >
                        {currentOpenStage?.status === 'active'
                          ? `Complete ${currentOpenStage.label}`
                          : currentOpenStage
                          ? `Start ${currentOpenStage.label}`
                          : 'Workflow Complete'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#0F6E8C]"
                      style={{ width: `${selectedOrder.progress}%` }}
                    />
                  </div>
                </div>

                <div className="max-h-[980px] overflow-y-auto p-5">
                  {selectedOrder.alertSummary.alerts.length > 0 && (
                    <section className="mb-6 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Production Alerts</h3>
                      </div>

                      <div className="space-y-3">
                        {selectedOrder.alertSummary.alerts.map((alert, index) => (
                          <AlertBanner key={`${alert.code}-${index}`} alert={alert} />
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoStatCard
                      title="Production Progress"
                      value={`${selectedOrder.progress}%`}
                      subtitle="Stage completion"
                      icon={ClipboardList}
                      tone="brand"
                    />
                    <InfoStatCard
                      title="Cutting Pieces"
                      value={String(selectedPlan?.cuttingList.length || 0)}
                      subtitle="Prepared list"
                      icon={Scissors}
                      tone="amber"
                    />
                    <InfoStatCard
                      title="Sewing Steps"
                      value={String(selectedPlan?.sewingChecklist.length || 0)}
                      subtitle="Checklist items"
                      icon={Ruler}
                      tone="indigo"
                    />
                    <InfoStatCard
                      title="Fit Warnings"
                      value={String(selectedPlan?.fitRisks.length || 0)}
                      subtitle="Watch points"
                      icon={AlertTriangle}
                      tone="rose"
                    />
                  </div>

                  <section className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-[#0F6E8C]" />
                      <h3 className="text-lg font-semibold text-slate-900">
                        Material Readiness
                      </h3>
                    </div>

                    {!selectedPlan ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                        No production plan has been attached to this order yet.
                      </div>
                    ) : !selectedOrder.selectedFabricId || !selectedFabric ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        No fabric has been linked to this order yet. Link a fabric before cutting.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <SnapshotMiniCard label="Fabric" value={selectedFabric.name} />
                          <SnapshotMiniCard
                            label="Planned Main Qty"
                            value={`${plannedMainFabricQty} ${selectedPlan.fabricEstimate.unit}`}
                          />
                          <SnapshotMiniCard
                            label="Allocated / Logged"
                            value={`${allocatedFabricQty} ${selectedFabric.unit}`}
                          />
                          <SnapshotMiniCard
                            label="Available Now"
                            value={`${selectedFabric.quantityInStock} ${selectedFabric.unit}`}
                          />
                        </div>

                        {remainingFabricToReserve <= 0 ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            Fabric requirement for this order has already been allocated or logged.
                          </div>
                        ) : hasStockShortage ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            Planned requirement exceeds current stock. Remaining requirement:{' '}
                            <span className="font-semibold">
                              {remainingFabricToReserve} {selectedFabric.unit}
                            </span>
                            , available stock:{' '}
                            <span className="font-semibold">
                              {selectedFabric.quantityInStock} {selectedFabric.unit}
                            </span>
                            .
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                            Enough stock is available for the remaining planned requirement:{' '}
                            <span className="font-semibold">
                              {remainingFabricToReserve} {selectedFabric.unit}
                            </span>
                            .
                          </div>
                        )}

                        {isLowStock && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            Low-stock warning: {selectedFabric.name} is at or below reorder level.
                            Reorder level:{' '}
                            <span className="font-semibold">
                              {selectedFabric.reorderLevel} {selectedFabric.unit}
                            </span>
                            .
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock3 className="h-5 w-5 text-[#0F6E8C]" />
                      <h3 className="text-lg font-semibold text-slate-900">Production Stages</h3>
                    </div>

                    <div className="space-y-4">
                      {selectedOrder.productionStages.map((stage, index) => {
                        const noteKey = `${selectedOrder.id}:${stage.code}`;
                        const draftValue = noteDrafts[noteKey] ?? stage.notes ?? '';
                        const isCurrentStage = currentOpenStageIndex === index;
                        const canStart =
                          canManageOrders &&
                          stage.status === 'pending' &&
                          isCurrentStage;
                        const canComplete =
                          canManageOrders &&
                          stage.status === 'active' &&
                          isCurrentStage;
                        const canSkip =
                          canManageOrders &&
                          (stage.status === 'pending' || stage.status === 'active') &&
                          isCurrentStage;
                        const canReopen =
                          canManageOrders &&
                          (stage.status === 'completed' || stage.status === 'skipped');
                        const overdueStage = overdueStageMap[stage.code];

                        return (
                          <div
                            key={stage.code}
                            className={`rounded-[24px] border bg-white p-4 ${
                              overdueStage
                                ? 'border-red-200 ring-1 ring-red-100'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStageBadgeClasses(
                                      stage.status
                                    )}`}
                                  >
                                    {titleCase(stage.status)}
                                  </span>

                                  <span className="text-sm font-semibold text-slate-900">
                                    {stage.label}
                                  </span>

                                  {isCurrentStage &&
                                    stage.status !== 'completed' &&
                                    stage.status !== 'skipped' && (
                                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-[#0F6E8C]">
                                        Current Stage
                                      </span>
                                    )}

                                  {overdueStage && (
                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                      {overdueStage.daysOverdue} day
                                      {overdueStage.daysOverdue === 1 ? '' : 's'} overdue
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-2">
                                  <StageMeta label="Started" value={formatDateTime(stage.startedAt)} />
                                  <StageMeta label="Completed" value={formatDateTime(stage.completedAt)} />
                                  <StageMeta label="Skipped" value={formatDateTime(stage.skippedAt)} />
                                  <StageMeta label="Reopened" value={formatDateTime(stage.reopenedAt)} />
                                </div>

                                {overdueStage && (
                                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                                    Expected by {formatDate(overdueStage.expectedBy)} based on a{' '}
                                    {overdueStage.expectedDurationDays}-day allowance for this stage.
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <StageActionButton
                                  label="Start"
                                  icon={Play}
                                  disabled={!canStart}
                                  onClick={() =>
                                    handleStageAction(selectedOrder, stage.code, 'start')
                                  }
                                />
                                <StageActionButton
                                  label="Complete"
                                  icon={CheckCircle2}
                                  disabled={!canComplete}
                                  onClick={() =>
                                    handleStageAction(selectedOrder, stage.code, 'complete')
                                  }
                                />
                                <StageActionButton
                                  label="Skip"
                                  icon={SkipForward}
                                  disabled={!canSkip}
                                  onClick={() =>
                                    handleStageAction(selectedOrder, stage.code, 'skip')
                                  }
                                />
                                <StageActionButton
                                  label="Reopen"
                                  icon={RotateCcw}
                                  disabled={!canReopen}
                                  onClick={() =>
                                    handleStageAction(selectedOrder, stage.code, 'reopen')
                                  }
                                />
                              </div>
                            </div>

                            <textarea
                              value={draftValue}
                              onChange={(e) =>
                                setNoteDrafts((prev) => ({
                                  ...prev,
                                  [noteKey]: e.target.value,
                                }))
                              }
                              onBlur={() => handleStageNoteSave(selectedOrder, stage.code)}
                              placeholder={`Add ${stage.label.toLowerCase()} notes...`}
                              rows={3}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <PlanCard
                      title="Cutting List"
                      emptyText="No cutting list linked yet."
                      items={selectedPlan?.cuttingList || []}
                      renderItem={(piece: CuttingLike, index: number) => (
                        <div
                          key={`${piece.name}-${index}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{piece.name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                Qty: {piece.quantity}
                                {piece.cutOnFold ? ' â€¢ Cut on fold' : ''}
                                {piece.fabric ? ` â€¢ ${titleCase(piece.fabric)}` : ''}
                              </p>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </div>
                          {piece.notes && (
                            <p className="mt-2 text-sm text-slate-600">{piece.notes}</p>
                          )}
                        </div>
                      )}
                    />

                    <PlanCard
                      title="Sewing Checklist"
                      emptyText="No sewing checklist linked yet."
                      items={selectedPlan?.sewingChecklist || []}
                      renderItem={(step: SewingLike) => (
                        <div
                          key={step.step}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-2 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6E8C] text-sm font-bold text-white">
                              {step.step}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{step.title}</p>
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                {step.category}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-slate-600">{step.description}</p>
                        </div>
                      )}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Fit Risk Warnings</h3>
                      </div>

                      {!selectedPlan?.fitRisks?.length ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                          No fit warnings recorded for this order yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPlan.fitRisks.map((risk, index) => (
                            <div
                              key={`${risk.title}-${index}`}
                              className={`rounded-2xl border p-4 ${getRiskClasses(risk.severity)}`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="font-semibold">{risk.title}</p>
                                <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold capitalize">
                                  {risk.severity}
                                </span>
                              </div>
                              <p className="text-sm">{risk.description}</p>
                              {risk.recommendation && (
                                <p className="mt-2 text-sm font-medium">
                                  Recommendation: {risk.recommendation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-[#0F6E8C]" />
                        <h3 className="text-lg font-semibold text-slate-900">Tailor Notes</h3>
                      </div>

                      {!selectedPlan?.tailorNotes?.length ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                          No tailor notes linked yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPlan.tailorNotes.map((note, index) => (
                            <div
                              key={`${note}-${index}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"
                            >
                              {note}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Shirt className="h-5 w-5 text-[#0F6E8C]" />
                      <h3 className="text-lg font-semibold text-slate-900">Production Plan Snapshot</h3>
                    </div>

                    <PlanSnapshot plan={selectedPlan} />
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type CuttingLike = NonNullable<ProductionPlan['cuttingList']>[number];
type SewingLike = NonNullable<ProductionPlan['sewingChecklist']>[number];

function ensureStages(existing?: ProductionStage[] | null): ProductionStage[] {
  return STAGE_TEMPLATES.map((template) => {
    const found = existing?.find((stage) => stage.code === template.code);

    return {
      code: template.code,
      label: template.label,
      status: found?.status || 'pending',
      startedAt: found?.startedAt || null,
      completedAt: found?.completedAt || null,
      skippedAt: found?.skippedAt || null,
      reopenedAt: found?.reopenedAt || null,
      notes: found?.notes || '',
    };
  });
}

function applyStageAction(
  stages: ProductionStage[],
  stageCode: ProductionStageCode,
  action: StageAction
): ProductionStage[] {
  const now = new Date();
  const next = ensureStages(stages).map((stage) => ({ ...stage }));
  const targetIndex = next.findIndex((stage) => stage.code === stageCode);

  if (targetIndex === -1) return next;

  if (action === 'reopen') {
    return next.map((stage, index) => {
      if (index < targetIndex) return stage;

      if (index === targetIndex) {
        return {
          ...stage,
          status: 'pending',
          startedAt: null,
          completedAt: null,
          skippedAt: null,
          reopenedAt: now,
        };
      }

      return {
        ...stage,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        skippedAt: null,
        reopenedAt: null,
      };
    });
  }

  next.forEach((stage, index) => {
    if (index !== targetIndex && stage.status === 'active') {
      stage.status = 'pending';
      stage.startedAt = null;
    }
  });

  const target = next[targetIndex];

  if (action === 'start') {
    target.status = 'active';
    target.startedAt = target.startedAt || now;
    target.skippedAt = null;
    return next;
  }

  if (action === 'complete') {
    target.status = 'completed';
    target.startedAt = target.startedAt || now;
    target.completedAt = now;
    target.skippedAt = null;

    const nextIndex = targetIndex + 1;
    if (nextIndex < next.length && next[nextIndex].status === 'pending') {
      next[nextIndex] = {
        ...next[nextIndex],
        status: 'active',
        startedAt: next[nextIndex].startedAt || now,
      };
    }

    return next;
  }

  if (action === 'skip') {
    target.status = 'skipped';
    target.completedAt = null;
    target.skippedAt = now;

    const nextIndex = targetIndex + 1;
    if (nextIndex < next.length && next[nextIndex].status === 'pending') {
      next[nextIndex] = {
        ...next[nextIndex],
        status: 'active',
        startedAt: next[nextIndex].startedAt || now,
      };
    }

    return next;
  }

  return next;
}

function getCurrentOpenStageIndex(stages: ProductionStage[]) {
  return stages.findIndex(
    (stage) => stage.status !== 'completed' && stage.status !== 'skipped'
  );
}

function getStageProgress(stages: ProductionStage[]) {
  const progressedCount = stages.filter(
    (stage) => stage.status === 'completed' || stage.status === 'skipped'
  ).length;

  return Math.round((progressedCount / stages.length) * 100);
}

function getStageSummary(stages: ProductionStage[]) {
  const active = stages.find((stage) => stage.status === 'active');
  if (active) return active.label;

  const pending = stages.find((stage) => stage.status === 'pending');
  if (pending) return pending.label;

  const delivered = stages.find((stage) => stage.code === 'delivered');
  if (delivered?.status === 'completed') return 'Delivered';

  const ready = stages.find((stage) => stage.code === 'ready');
  if (ready?.status === 'completed') return 'Ready for Delivery';

  return 'Completed';
}

function deriveOrderStatus(stages: ProductionStage[]): Order['status'] {
  const deliveredStage = stages.find((stage) => stage.code === 'delivered');
  const readyStage = stages.find((stage) => stage.code === 'ready');
  const hasProgress = stages.some(
    (stage) =>
      stage.status === 'active' ||
      stage.status === 'completed' ||
      stage.status === 'skipped'
  );

  if (deliveredStage?.status === 'completed') return 'delivered';
  if (readyStage?.status === 'completed') return 'ready';
  if (hasProgress) return 'in_progress';

  return 'draft';
}

function isOrderOverdue(order: Order) {
  if (!order.dueDate) return false;
  if (order.status === 'delivered' || order.status === 'cancelled') return false;

  const due = new Date(order.dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return due < now;
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Not set';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return 'â€”';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'â€”';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getOrderBadgeClasses(order: { overdue?: boolean; status: Order['status'] }) {
  if (order.overdue) return 'bg-red-50 text-red-700';
  if (order.status === 'delivered') return 'bg-emerald-50 text-emerald-700';
  if (order.status === 'ready') return 'bg-sky-50 text-[#0F6E8C]';
  if (order.status === 'in_progress') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function getStageBadgeClasses(status: ProductionStageStatus) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'active') return 'bg-sky-50 text-[#0F6E8C]';
  if (status === 'skipped') return 'bg-slate-100 text-slate-600';
  return 'bg-amber-50 text-amber-700';
}

function getRiskClasses(severity?: string) {
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-800';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getAlertChipClasses(severity: OrderAlert['severity']) {
  if (severity === 'critical') return 'bg-red-50 text-red-700';
  if (severity === 'warning') return 'bg-amber-50 text-amber-700';
  return 'bg-sky-50 text-sky-700';
}

function getAlertBannerClasses(severity: OrderAlert['severity']) {
  if (severity === 'critical') return 'border-red-200 bg-red-50 text-red-800';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

function getQueueCardClasses(order: EnrichedOrder, isSelected: boolean) {
  if (isSelected) {
    return 'border-sky-300 bg-sky-50 ring-2 ring-sky-100';
  }

  if (order.alertSeverity === 'critical') {
    return 'border-red-200 bg-white hover:border-red-300 hover:bg-red-50/30';
  }

  if (order.alertSeverity === 'warning') {
    return 'border-amber-200 bg-white hover:border-amber-300 hover:bg-amber-50/30';
  }

  return 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50';
}

function getAlertIcon(alert: OrderAlert) {
  if (alert.code === 'ready_for_delivery') return Truck;
  if (alert.code === 'fitting_due' || alert.code === 'overdue_stage') return Clock3;
  if (alert.severity === 'info') return Info;
  return AlertTriangle;
}

function AlertBanner({ alert }: { alert: OrderAlert }) {
  const Icon = getAlertIcon(alert);

  return (
    <div className={`rounded-2xl border p-4 ${getAlertBannerClasses(alert.severity)}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-white/70 p-2">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{alert.title}</p>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold capitalize">
              {alert.severity}
            </span>
          </div>

          <p className="mt-1 text-sm">{alert.message}</p>

          {(alert.stageCode || alert.dueDate) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {alert.stageCode && (
                <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold">
                  Stage: {titleCase(alert.stageCode)}
                </span>
              )}
              {alert.dueDate && (
                <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold">
                  Due: {formatDate(alert.dueDate)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
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

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-[#0F6E8C] text-white shadow-md'
          : 'bg-white text-slate-600 hover:bg-sky-50'
      }`}
    >
      <Filter className="mr-1.5 inline h-4 w-4" />
      {label}
    </button>
  );
}

function StageActionButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ElementType;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
        disabled
          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function StageMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <span className="font-medium text-slate-600">{label}:</span>{' '}
      <span>{value}</span>
    </div>
  );
}

function InfoStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone: 'brand' | 'amber' | 'indigo' | 'rose';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
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
    </div>
  );
}

function PlanCard<T>({
  title,
  emptyText,
  items,
  renderItem,
}: {
  title: string;
  emptyText: string;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">{items.map(renderItem)}</div>
      )}
    </section>
  );
}

function PlanSnapshot({ plan }: { plan: ProductionPlan | null }) {
  if (!plan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No production plan has been attached to this order yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SnapshotMiniCard label="Garment" value={titleCase(plan.garmentType)} />
      <SnapshotMiniCard
        label="Main Fabric"
        value={`${plan.fabricEstimate.mainFabricQty} ${plan.fabricEstimate.unit}`}
      />
      <SnapshotMiniCard
        label="Lining"
        value={
          plan.fabricEstimate.liningQty
            ? `${plan.fabricEstimate.liningQty} ${plan.fabricEstimate.unit}`
            : 'Not required'
        }
      />
      <SnapshotMiniCard
        label="Interfacing"
        value={
          plan.fabricEstimate.interfacingQty
            ? `${plan.fabricEstimate.interfacingQty} ${plan.fabricEstimate.unit}`
            : 'Not required'
        }
      />
    </div>
  );
}

function SnapshotMiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
