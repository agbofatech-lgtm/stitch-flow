import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useApp } from '../context/AppContext';
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
import { exportOrderJobSheetPdf } from '@modules/services/jobSheetExport';
import {
  getHighestOrderAlertSeverity,
  getOrderAlerts,
} from '@shared/utils/productionAlerts';
import { fetchOrders, type ApiOrder } from '@shared/api/orders';
import { getCustomers, type ApiCustomer } from '@shared/utils/customerApi';
import { API_BASE } from '@shared/utils/api';
import { Button, ErrorState, ExperienceEmptyState, LoadingState, PageHeader, Workroom, WorkspaceSkeleton } from '../experience';
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

type ProductionOrder = {
  id: string;
  customerId: string;
  customer?: { fullName?: string } | null;
  assignedTo?: string | null;
  orderNumber: string;
  status: Order['status'];
  orderType: string;
  garmentType?: string | null;
  fitType?: string | null;
  dueDate: Date | null;
  notes: string;
  styleNotes?: string | null;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  currency?: string;
  createdAt?: Date | null;
  measurementSnapshot?: Record<string, unknown> | null;
  garmentMeasurements?: Record<string, unknown> | null;
  productionPlan?: ProductionPlan | null;
  productionStages?: ProductionStage[];
  inspirationAnalysis?: Record<string, unknown> | null;
  selectedFabricId?: string | null;
  designInspirationId?: string | null;
};

type EnrichedOrder = ProductionOrder & {
  productionStages: ProductionStage[];
  progress: number;
  stageSummary: string;
  overdue: boolean;
  alertSummary: OrderAlertSummary;
  alertSeverity: AlertSeverityLevel;
  hasIssues: boolean;
};

type ApiProductionStage = {
  id: string;
  code: ProductionStageCode;
  label: string;
  sequence: number;
  status: ProductionStageStatus;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  reopenedAt: string | null;
  notes: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
};

type StageTransitionResponse = {
  orderStatus: Order['status'];
  productionStages: ApiProductionStage[];
};

type StageNoteResponse = {
  productionStages: ApiProductionStage[];
};

function mapApiProductionStages(stages?: unknown): ProductionStage[] {
  if (!Array.isArray(stages)) return [];

  return stages
    .filter((stage): stage is ApiProductionStage => {
      return (
        typeof stage === 'object' &&
        stage !== null &&
        'code' in stage &&
        'label' in stage &&
        'status' in stage
      );
    })
    .map((stage) => ({
      code: stage.code,
      label: stage.label,
      status: stage.status,
      startedAt: stage.startedAt || null,
      completedAt: stage.completedAt || null,
      skippedAt: stage.skippedAt || null,
      reopenedAt: stage.reopenedAt || null,
      notes: stage.notes || '',
    }));
}

async function transitionProductionStage(
  orderId: string,
  stageCode: ProductionStageCode,
  action: StageAction,
  note?: string
): Promise<StageTransitionResponse> {
  const response = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(orderId)}/production-stages/${encodeURIComponent(stageCode)}/transition`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, note }),
    }
  );

  if (!response.ok) {
    const payload = (await safeJson(response)) as { message?: string } | null;
    throw new Error(payload?.message || 'Failed to update production stage');
  }

  return (await response.json()) as StageTransitionResponse;
}

async function saveProductionStageNote(
  orderId: string,
  stageCode: ProductionStageCode,
  note: string
): Promise<StageNoteResponse> {
  const response = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(orderId)}/production-stages/${encodeURIComponent(stageCode)}/note`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ note }),
    }
  );

  if (!response.ok) {
    const payload = (await safeJson(response)) as { message?: string } | null;
    throw new Error(payload?.message || 'Failed to save production stage note');
  }

  return (await response.json()) as StageNoteResponse;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function ProductionBoard() {
  const { currentWorkspace } = useApp();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [search, setSearch] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyProductionStageUpdate(
    orderId: string,
    updates: {
      status?: Order['status'];
      productionStages: ProductionStage[];
    }
  ) {
    setOrders((current) =>
      (current ?? []).map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...(updates.status ? { status: updates.status } : {}),
              productionStages: updates.productionStages,
            }
          : order
      )
    );
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const orderData = await fetchOrders();

      let customerData: ApiCustomer[] = [];
      try {
        customerData = await getCustomers();
      } catch (error) {
        console.warn('Customer fetch failed, continuing without customers', error);
      }

      const customerMap = new Map((customerData ?? []).map((customer) => [customer.id, customer]));

      const mappedOrders: ProductionOrder[] = (orderData ?? []).map((order: ApiOrder) => ({
        id: order.id,
        customerId: order.customerId,
        customer: customerMap.get(order.customerId)
          ? { fullName: customerMap.get(order.customerId)?.fullName }
          : null,
        assignedTo: order.assignedTo || null,
        orderNumber: order.orderNumber,
        status: order.status as Order['status'],
        orderType: order.orderType,
        garmentType:
          order.garmentType || order.orderType?.toLowerCase().replace(/\s+/g, '_') || null,
        fitType: order.fitType || null,
        dueDate: order.dueDate ? new Date(order.dueDate) : null,
        notes: order.notes || '',
        styleNotes: order.styleNotes || null,
        subtotal: order.subtotal || 0,
        taxTotal: order.taxTotal || 0,
        discountTotal: order.discountTotal || 0,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt ? new Date(order.createdAt) : null,
        measurementSnapshot: (order.measurementSnapshot as Record<string, unknown>) || null,
        garmentMeasurements: (order.garmentMeasurements as Record<string, unknown>) || null,
        productionPlan: (order.productionPlan as ProductionPlan) || null,
        productionStages:
          mapApiProductionStages(order.productionStages) ||
          buildStagesFromStatus(order.status as Order['status']),
        inspirationAnalysis: (order.inspirationAnalysis as Record<string, unknown>) || null,
        selectedFabricId: order.selectedFabricId || null,
        designInspirationId: order.designInspirationId || null,
      }));

      setOrders(
        (mappedOrders ?? []).map((order) => ({
          ...order,
          productionStages:
            order.productionStages && order.productionStages.length > 0
              ? ensureStages(order.productionStages)
              : buildStagesFromStatus(order.status),
        }))
      );
      setCustomers(customerData);

      setSelectedOrderId((current) => {
        if (current && mappedOrders.some((order) => order.id === current)) {
          return current;
        }
        return mappedOrders[0]?.id || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load production board');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    return (orders ?? []).map((order) => {
      const stages = ensureStages(order.productionStages);
      const progress = getStageProgress(stages);
      const stageSummary = getStageSummary(stages);
      const overdue = isOrderOverdue(order);
      const alertSummary = getOrderAlerts({
        ...(order as unknown as Order),
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
        (order.orderNumber ?? "").toLowerCase().includes(term) ||
        (order.orderType ?? "").toLowerCase().includes(term) ||
        (order.customer?.fullName || '').toLowerCase().includes(term) ||
        (order.garmentType || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      switch (filter) {
        case 'in_progress':
          return order.status === 'in_progress';
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
    enrichedOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null;

  const summary = useMemo(() => {
    const ready = enrichedOrders.filter((order) => order.status === 'ready').length;
    const delivered = enrichedOrders.filter((order) => order.status === 'delivered').length;
    const overdue = enrichedOrders.filter(
      (order) => order.overdue || order.alertSummary.hasOverdueStages
    ).length;
    const inProgress = enrichedOrders.filter((order) => order.status === 'in_progress').length;
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
    setSelectedOrderId(orderId);
  };

  const handleStageAction = async (
    order: ProductionOrder,
    stageCode: ProductionStageCode,
    action: StageAction
  ) => {
    try {
      setMutating(true);
      setError(null);

      const result = await transitionProductionStage(order.id, stageCode, action);

      applyProductionStageUpdate(order.id, {
        status: result.orderStatus,
        productionStages: ensureStages(mapApiProductionStages(result.productionStages)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update production stage');
    } finally {
      setMutating(false);
    }
  };

  const handleQuickAction = async (order: ProductionOrder) => {
    const stages = ensureStages(order.productionStages);
    const currentIndex = getCurrentOpenStageIndex(stages);

    if (currentIndex === -1) return;

    const currentStage = stages[currentIndex];
    const action: StageAction = currentStage.status === 'active' ? 'complete' : 'start';

    await handleStageAction(order, currentStage.code, action);
  };

  const handleStageNoteSave = async (order: ProductionOrder, stageCode: ProductionStageCode) => {
    const key = `${order.id}:${stageCode}`;
    const draftValue = noteDrafts[key];

    if (draftValue === undefined) return;

    const existingStage = ensureStages(order.productionStages).find((stage) => stage.code === stageCode);
    const currentValue = existingStage?.notes || '';
    const nextValue = draftValue.trim();

    if (nextValue === currentValue.trim()) return;

    try {
      setMutating(true);
      setError(null);

      const result = await saveProductionStageNote(order.id, stageCode, nextValue);

      applyProductionStageUpdate(order.id, {
        productionStages: ensureStages(mapApiProductionStages(result.productionStages)),
      });

      setNoteDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stage note');
    } finally {
      setMutating(false);
    }
  };

  const selectedStages = selectedOrder?.productionStages || [];
  const currentOpenStageIndex = selectedOrder ? getCurrentOpenStageIndex(selectedStages) : -1;
  const currentOpenStage =
    currentOpenStageIndex >= 0 ? selectedStages[currentOpenStageIndex] : null;

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
      order: selectedOrder as unknown as Order,
      inspiration: null,
      selectedFabric: null,
      workspaceName: currentWorkspace.name || 'StitchFlow',
      logoUrl: currentWorkspace.logoUrl || null,
      brandColor: currentWorkspace.brandColor || '#0F6E8C',
      phone: currentWorkspace.phone || '',
      email: currentWorkspace.email || '',
      address: currentWorkspace.address || '',
      useLogoAsWatermark: !!currentWorkspace.useLogoAsWatermark,
    });
  };

  if (loading) {
    return (
      <Workroom>
        <WorkspaceSkeleton label="Loading production board" />
      </Workroom>
    );
  }

  if (error && orders.length === 0) {
    return (
      <Workroom>
        <ErrorState
          title="Production board could not load"
          description={`${error} Orders: ${API_BASE}/orders. Customers: ${API_BASE}/customers.`}
          action={<Button variant="secondary" size="sm" onClick={() => void loadData()}>Retry</Button>}
        />
      </Workroom>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-canvas via-surface-panel to-surface-workspace">
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <PageHeader
          level={2}
          kicker="Production floor"
          title="Production Board"
          description="Move orders from measurement to delivery with real backend stage persistence."
        />

                {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div>
              <p className="font-medium">{error}</p>
              <p className="mt-1 text-xs text-red-600">Orders source: {`${API_BASE}/orders`}</p>
              <p className="mt-1 text-xs text-red-600">Customers source: {`${API_BASE}/customers`}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-sf-workspace border border-line bg-surface-panel/90 shadow-xl backdrop-blur-sm">
            <div className="border-b border-line px-5 py-5">
              <h2 className="text-xl font-bold text-ink-primary">Orders Queue</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Search, filter, and jump into production work.
              </p>
            </div>

            <div className="border-b border-line px-5 py-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order, customer, or garment"
                    className="w-full rounded-2xl border border-line bg-surface-panel py-3 pl-10 pr-4 text-sm text-ink-secondary outline-none transition focus:border-action-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FilterButton label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
                  <FilterButton
                    label="In Progress"
                    active={filter === 'in_progress'}
                    onClick={() => setFilter('in_progress')}
                  />
                  <FilterButton label="Ready" active={filter === 'ready'} onClick={() => setFilter('ready')} />
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
                <div className="rounded-sf-lg border border-dashed border-line bg-action-secondary/60 p-8 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-action-primary" />
                  <p className="font-semibold text-ink-primary">No production orders found</p>
                  <p className="mt-2 text-sm text-ink-muted">
                    Adjust the search or filter, or create new orders first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(filteredOrders ?? []).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => handleSelectOrder(order.id)}
                      className={`block w-full rounded-sf-lg border p-4 text-left transition ${getQueueCardClasses(
                        order,
                        selectedOrder?.id === order.id
                      )}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">{order.orderNumber}</p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {order.customer?.fullName || 'No customer'} �{' '}
                            {titleCase(order.orderType || 'custom')}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getOrderBadgeClasses(order)}`}
                        >
                          {order.overdue ? 'Overdue' : titleCase(order.status)}
                        </span>
                      </div>

                      <div className="mb-3 h-2 overflow-hidden rounded-full bg-action-secondary">
                        <div
                          className="h-full rounded-full bg-action-primary"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-ink-muted">
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
                            <span className="rounded-full bg-action-secondary px-2.5 py-1 text-[11px] font-semibold text-ink-secondary">
                              +{order.alertSummary.alerts.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                        <span>Due: {formatDate(order.dueDate)}</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-sf-workspace border border-line bg-surface-panel/90 shadow-xl backdrop-blur-sm">
            {!selectedOrder ? (
              <div className="flex min-h-[760px] items-center justify-center p-8">
                <div className="rounded-sf-workspace border border-dashed border-line bg-action-secondary/60 p-10 text-center">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 text-action-primary" />
                  <h3 className="text-lg font-semibold text-ink-primary">No order selected</h3>
                  <p className="mt-2 text-sm text-ink-muted">
                    Select an order from the queue to manage its workshop flow.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-line px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-action-secondary px-3 py-1 text-xs font-semibold text-action-primary">
                          {selectedOrder.orderNumber}
                        </span>
                        <span className="rounded-full bg-action-secondary px-3 py-1 text-xs font-semibold text-ink-secondary">
                          {titleCase(selectedOrder.orderType || 'custom')}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderBadgeClasses(selectedOrder)}`}
                        >
                          {selectedOrder.overdue ? 'Overdue' : titleCase(selectedOrder.status)}
                        </span>
                      </div>

                      <h2 className="text-2xl font-bold text-ink-primary">
                        {selectedOrder.customer?.fullName || 'Unnamed Customer'}
                      </h2>

                      <p className="mt-2 text-sm text-ink-muted">
                        Due date: {formatDate(selectedOrder.dueDate)} � Current stage:{' '}
                        {selectedOrder.stageSummary}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleExportJobSheet}
                        className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-panel px-4 py-3 text-sm font-semibold text-ink-secondary transition hover:bg-action-secondary"
                      >
                        <Download className="h-4 w-4" />
                        Export Job Sheet PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleQuickAction(selectedOrder)}
                        disabled={!currentOpenStage || mutating}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          currentOpenStage && !mutating
                            ? 'bg-action-primary text-white hover:bg-action-hover'
                            : 'cursor-not-allowed bg-action-secondary text-ink-muted'
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

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-action-secondary">
                    <div
                      className="h-full rounded-full bg-action-primary"
                      style={{ width: `${selectedOrder.progress}%` }}
                    />
                  </div>
                </div>

                <div className="max-h-[980px] overflow-y-auto p-5">
                  {selectedOrder.alertSummary.alerts.length > 0 && (
                    <section className="mb-6 rounded-sf-lg border border-line bg-surface-workspace/60 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-ink-primary">Production Alerts</h3>
                      </div>

                      <div className="space-y-3">
                        {(selectedOrder.alertSummary.alerts ?? []).map((alert, index) => (
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
                      title="Order Status"
                      value={titleCase(selectedOrder.status)}
                      subtitle="Persisted in backend"
                      icon={Scissors}
                      tone="amber"
                    />
                    <InfoStatCard
                      title="Total Amount"
                      value={`${selectedOrder.currency || 'GHS'} ${selectedOrder.totalAmount}`}
                      subtitle="Order value"
                      icon={Ruler}
                      tone="indigo"
                    />
                    <InfoStatCard
                      title="Alerts"
                      value={String(selectedOrder.alertSummary.alerts.length)}
                      subtitle="Production signals"
                      icon={AlertTriangle}
                      tone="rose"
                    />
                  </div>

                  <section className="mt-6 rounded-sf-lg border border-line bg-surface-workspace/60 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock3 className="h-5 w-5 text-action-primary" />
                      <h3 className="text-lg font-semibold text-ink-primary">Production Stages</h3>
                    </div>

                    <div className="space-y-4">
                      {(selectedOrder.productionStages ?? []).map((stage, index) => {
                        const noteKey = `${selectedOrder.id}:${stage.code}`;
                        const draftValue = noteDrafts[noteKey] ?? stage.notes ?? '';
                        const isCurrentStage = currentOpenStageIndex === index;
                        const canStart = stage.status === 'pending' && isCurrentStage;
                        const canComplete = stage.status === 'active' && isCurrentStage;
                        const canSkip =
                          (stage.status === 'pending' || stage.status === 'active') && isCurrentStage;
                        const canReopen =
                          stage.status === 'completed' || stage.status === 'skipped';
                        const overdueStage = overdueStageMap[stage.code];

                        return (
                          <div
                            key={stage.code}
                            className={`rounded-sf-lg border bg-surface-panel p-4 ${
                              overdueStage ? 'border-red-200 ring-1 ring-red-100' : 'border-line'
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

                                  <span className="text-sm font-semibold text-ink-primary">
                                    {stage.label}
                                  </span>

                                  {isCurrentStage &&
                                    stage.status !== 'completed' &&
                                    stage.status !== 'skipped' && (
                                      <span className="rounded-full bg-action-secondary px-2.5 py-1 text-[11px] font-semibold text-action-primary">
                                        Current Stage
                                      </span>
                                    )}

                                  {overdueStage && (
                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                      {overdueStage.daysOverdue} day{overdueStage.daysOverdue === 1 ? '' : 's'} overdue
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink-muted md:grid-cols-2">
                                  <StageMeta label="Started" value={formatDateTime(stage.startedAt)} />
                                  <StageMeta label="Completed" value={formatDateTime(stage.completedAt)} />
                                  <StageMeta label="Skipped" value={formatDateTime(stage.skippedAt)} />
                                  <StageMeta label="Reopened" value={formatDateTime(stage.reopenedAt)} />
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <StageActionButton
                                  label="Start"
                                  icon={Play}
                                  disabled={!canStart || mutating}
                                  onClick={() => void handleStageAction(selectedOrder, stage.code, 'start')}
                                />
                                <StageActionButton
                                  label="Complete"
                                  icon={CheckCircle2}
                                  disabled={!canComplete || mutating}
                                  onClick={() => void handleStageAction(selectedOrder, stage.code, 'complete')}
                                />
                                <StageActionButton
                                  label="Skip"
                                  icon={SkipForward}
                                  disabled={!canSkip || mutating}
                                  onClick={() => void handleStageAction(selectedOrder, stage.code, 'skip')}
                                />
                                <StageActionButton
                                  label="Reopen"
                                  icon={RotateCcw}
                                  disabled={!canReopen || mutating}
                                  onClick={() => void handleStageAction(selectedOrder, stage.code, 'reopen')}
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
                              onBlur={() => void handleStageNoteSave(selectedOrder, stage.code)}
                              placeholder={`Add ${(stage.label ?? "").toLowerCase()} notes...`}
                              rows={3}
                              className="w-full rounded-2xl border border-line px-4 py-3 text-sm text-ink-secondary outline-none transition focus:border-action-primary"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="mt-6 rounded-sf-lg border border-line bg-surface-panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Shirt className="h-5 w-5 text-action-primary" />
                      <h3 className="text-lg font-semibold text-ink-primary">Order Notes</h3>
                    </div>

                    <div className="rounded-2xl bg-surface-workspace p-4 text-sm text-ink-secondary whitespace-pre-wrap">
                      {selectedOrder.notes || 'No saved order-wide notes yet.'}
                    </div>
                  </section>

                  <section className="mt-6 rounded-sf-lg border border-line bg-surface-workspace/60 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-action-primary" />
                      <h3 className="text-lg font-semibold text-ink-primary">Phase B Notice</h3>
                    </div>

                    <div className="rounded-2xl border border-line bg-action-secondary p-4 text-sm text-action-primary">
                      Production stages now use persistent backend transitions and stage-specific notes.
                      Order notes remain separate from workshop stage notes.
                    </div>
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

function buildStagesFromStatus(status: Order['status']): ProductionStage[] {
  return ensureStages().map((stage, index) => {
    if (status === 'draft') {
      return {
        ...stage,
        status: index === 0 ? 'active' : 'pending',
      };
    }

    if (status === 'in_progress') {
      if (index < 2) return { ...stage, status: 'completed' };
      if (index === 2) return { ...stage, status: 'active' };
      return { ...stage, status: 'pending' };
    }

    if (status === 'ready') {
      if (stage.code === 'delivered') return { ...stage, status: 'pending' };
      return { ...stage, status: 'completed' };
    }

    if (status === 'delivered') {
      return { ...stage, status: 'completed' };
    }

    return stage;
  });
}

function ensureStages(existing?: ProductionStage[] | null): ProductionStage[] {
  return (STAGE_TEMPLATES ?? []).map((template) => {
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

function isOrderOverdue(order: { dueDate?: Date | string | null; status: Order['status'] }) {
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
  if (!value) return '�';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '�';

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
  if (order.status === 'ready') return 'bg-action-secondary text-action-primary';
  if (order.status === 'in_progress') return 'bg-amber-50 text-amber-700';
  return 'bg-action-secondary text-ink-secondary';
}

function getStageBadgeClasses(status: ProductionStageStatus) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'active') return 'bg-action-secondary text-action-primary';
  if (status === 'skipped') return 'bg-action-secondary text-ink-secondary';
  return 'bg-amber-50 text-amber-700';
}

function getAlertChipClasses(severity: OrderAlert['severity']) {
  if (severity === 'critical') return 'bg-red-50 text-red-700';
  if (severity === 'warning') return 'bg-amber-50 text-amber-700';
  return 'bg-action-secondary text-action-primary';
}

function getAlertBannerClasses(severity: OrderAlert['severity']) {
  if (severity === 'critical') return 'border-red-200 bg-red-50 text-red-800';
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-line bg-action-secondary text-action-primary';
}

function getQueueCardClasses(order: EnrichedOrder, isSelected: boolean) {
  if (isSelected) {
    return 'border-action-primary bg-action-secondary ring-2 ring-sky-100';
  }

  if (order.alertSeverity === 'critical') {
    return 'border-red-200 bg-surface-panel hover:border-red-300 hover:bg-red-50/30';
  }

  if (order.alertSeverity === 'warning') {
    return 'border-amber-200 bg-surface-panel hover:border-amber-300 hover:bg-amber-50/30';
  }

  return 'border-line bg-surface-panel hover:border-line hover:bg-action-secondary/50';
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
        <div className="mt-0.5 rounded-full bg-surface-panel/70 p-2">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{alert.title}</p>
            <span className="rounded-full bg-surface-panel/70 px-2.5 py-1 text-[11px] font-semibold capitalize">
              {alert.severity}
            </span>
          </div>

          <p className="mt-1 text-sm">{alert.message}</p>

          {(alert.stageCode || alert.dueDate) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {alert.stageCode && (
                <span className="rounded-full bg-surface-panel/70 px-2.5 py-1 font-semibold">
                  Stage: {titleCase(alert.stageCode)}
                </span>
              )}
              {alert.dueDate && (
                <span className="rounded-full bg-surface-panel/70 px-2.5 py-1 font-semibold">
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
    <div className="rounded-2xl border border-white/15 bg-surface-panel/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-panel/15">
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
        active ? 'bg-action-primary text-white shadow-md' : 'bg-surface-panel text-ink-secondary hover:bg-action-secondary'
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
          ? 'cursor-not-allowed bg-action-secondary text-ink-muted'
          : 'border border-line bg-surface-panel text-ink-secondary hover:bg-action-secondary'
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
    <div className="rounded-xl bg-surface-workspace px-3 py-2">
      <span className="font-medium text-ink-secondary">{label}:</span> <span>{value}</span>
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
    brand: 'bg-action-secondary text-action-primary',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="rounded-sf-lg border border-line bg-surface-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ink-primary">{value}</p>
          <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}











