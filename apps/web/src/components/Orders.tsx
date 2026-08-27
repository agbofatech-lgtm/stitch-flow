import {
  useMemo,
  useState,
  type ElementType,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import {
  Search,
  ChevronRight,
  Calendar,
  User,
  Clock,
  Ruler,
  Sparkles,
  Scissors,
  CheckCircle2,
  Package,
  X,
  ClipboardList,
  AlertTriangle,
  TimerReset,
  Boxes,
  Plus,
  Pencil,
  Shirt,
  Layers3,
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import {
  fetchOrderProductionStages,
  transitionOrderProductionStage,
  type ApiProductionStage,
} from '@shared/api/productionStages';
import {
  FabricRecord,
  MaterialUnit,
  ProductionStage,
  ProductionStageCode,
  GarmentMeasurements,
  GarmentType,
  Order,
  OrderMeasurementSnapshot,
  DesignInspiration,
} from '../types';
import {
  analyzeDesignInspiration,
  generateProductionPlan,
} from '@modules/services/productionAssistant';

const statusFilters = ['all', 'draft', 'in_progress', 'ready', 'delivered', 'cancelled'] as const;

const DEFAULT_PRODUCTION_STAGES: Array<{
  code: ProductionStageCode;
  label: string;
}> = [
  { code: 'measurement', label: 'Measurement' },
  { code: 'cutting', label: 'Cutting' },
  { code: 'sewing', label: 'Sewing' },
  { code: 'embroidery', label: 'Embroidery' },
  { code: 'first_fitting', label: '1st Fitting' },
  { code: 'second_fitting', label: '2nd Fitting' },
  { code: 'final_press', label: 'Final Press' },
  { code: 'ready', label: 'Ready' },
  { code: 'delivered', label: 'Delivered' },
];

const GARMENT_OPTIONS: Array<{ value: GarmentType; label: string }> = [
  { value: 'bodice', label: 'Bodice' },
  { value: 'shirt', label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'skirt', label: 'Skirt' },
  { value: 'kaftan', label: 'Kaftan' },
  { value: 'dress', label: 'Dress' },
  { value: 'gown', label: 'Gown' },
  { value: 'senator', label: 'Senator' },
  { value: 'agbada', label: 'Agbada' },
  { value: 'blouse', label: 'Blouse' },
  { value: 'custom', label: 'Custom' },
];

type MeasurementKey =
  | 'bust'
  | 'chest'
  | 'waist'
  | 'hip'
  | 'neck'
  | 'shoulder'
  | 'sleeve'
  | 'backLength'
  | 'bustSpan'
  | 'armholeDepth'
  | 'thigh'
  | 'knee'
  | 'ankle'
  | 'trouserLength'
  | 'skirtLength'
  | 'fullLength';

type MeasurementField = {
  key: MeasurementKey;
  label: string;
  unit: string;
};

const MEASUREMENT_FIELDS_BY_GARMENT: Record<GarmentType, MeasurementField[]> = {
  bodice: [
    { key: 'bust', label: 'Bust', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', unit: 'cm' },
    { key: 'armholeDepth', label: 'Armhole Depth', unit: 'cm' },
  ],
  shirt: [
    { key: 'chest', label: 'Chest', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
  ],
  trouser: [
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'hip', label: 'Hip', unit: 'cm' },
    { key: 'thigh', label: 'Thigh', unit: 'cm' },
    { key: 'knee', label: 'Knee', unit: 'cm' },
    { key: 'ankle', label: 'Ankle', unit: 'cm' },
    { key: 'trouserLength', label: 'Trouser Length', unit: 'cm' },
  ],
  skirt: [
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'hip', label: 'Hip', unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', unit: 'cm' },
  ],
  kaftan: [
    { key: 'chest', label: 'Chest', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'fullLength', label: 'Full Length', unit: 'cm' },
  ],
  dress: [
    { key: 'bust', label: 'Bust', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'hip', label: 'Hip', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', unit: 'cm' },
    { key: 'armholeDepth', label: 'Armhole Depth', unit: 'cm' },
  ],
  gown: [
    { key: 'bust', label: 'Bust', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'hip', label: 'Hip', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', unit: 'cm' },
    { key: 'armholeDepth', label: 'Armhole Depth', unit: 'cm' },
  ],
  senator: [
    { key: 'chest', label: 'Chest', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
  ],
  agbada: [
    { key: 'chest', label: 'Chest', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'fullLength', label: 'Full Length', unit: 'cm' },
  ],
  blouse: [
    { key: 'bust', label: 'Bust', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'bustSpan', label: 'Bust Span', unit: 'cm' },
    { key: 'armholeDepth', label: 'Armhole Depth', unit: 'cm' },
  ],
  custom: [
    { key: 'bust', label: 'Bust', unit: 'cm' },
    { key: 'chest', label: 'Chest', unit: 'cm' },
    { key: 'waist', label: 'Waist', unit: 'cm' },
    { key: 'hip', label: 'Hip', unit: 'cm' },
    { key: 'neck', label: 'Neck', unit: 'cm' },
    { key: 'shoulder', label: 'Shoulder', unit: 'cm' },
    { key: 'sleeve', label: 'Sleeve', unit: 'cm' },
    { key: 'backLength', label: 'Back Length', unit: 'cm' },
    { key: 'trouserLength', label: 'Trouser Length', unit: 'cm' },
    { key: 'skirtLength', label: 'Skirt Length', unit: 'cm' },
    { key: 'fullLength', label: 'Full Length', unit: 'cm' },
  ],
};

type OrderFormState = {
  customerId: string;
  orderNumber: string;
  orderType: string;
  garmentType: GarmentType;
  dueDate: string;
  notes: string;
  styleNotes: string;
  subtotal: string;
  taxTotal: string;
  discountTotal: string;
  currency: string;
  designInspirationId: string;
  selectedFabricId: string;
  assignedTo: string;
  measurements: Partial<Record<MeasurementKey, string>>;
};

export function Orders() {
  const {
    orders,
    customers,
    designInspirations,
    updateOrder,
    addOrder,
    selectOrder,
    setView,
    currentWorkspace,
    fabricRecords,
    getOrderMaterialUsages,
    addMaterialUsage,
    deleteMaterialUsage,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>('all');
  const [materialOrderId, setMaterialOrderId] = useState<string | null>(null);
  const [orderFormMode, setOrderFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [stageActionOrderId, setStageActionOrderId] = useState<string | null>(null);
  const [stageActionError, setStageActionError] = useState<string | null>(null);

  const workspaceCurrency = currentWorkspace.defaultCurrency || 'GHS';

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        (o.orderNumber ?? "").toLowerCase().includes((search ?? "").toLowerCase()) ||
        (o.customer?.fullName || '').toLowerCase().includes((search ?? "").toLowerCase()) ||
        (o.orderType ?? "").toLowerCase().includes((search ?? "").toLowerCase()) ||
        (o.notes || '').toLowerCase().includes((search ?? "").toLowerCase()) ||
        (o.garmentType || '').toLowerCase().includes((search ?? "").toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const statusCounts = useMemo(() => {
    return orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  const summary = useMemo(() => {
    const active = orders.filter((o) => ['draft', 'in_progress', 'ready'].includes(o.status)).length;
    const dueSoon = orders.filter((o) => {
      if (!o.dueDate) return false;
      return (
        isToday(new Date(o.dueDate)) ||
        (isPast(new Date(o.dueDate)) && !['delivered', 'cancelled'].includes(o.status))
      );
    }).length;
    const completed = orders.filter((o) => o.status === 'delivered').length;

    return {
      total: orders.length,
      active,
      dueSoon,
      completed,
    };
  }, [orders]);

  function mapApiStageToLocalStage(stage: ApiProductionStage): ProductionStage {
    return {
      code: stage.code,
      label: stage.label,
      status: stage.status,
      startedAt: stage.startedAt ? new Date(stage.startedAt) : null,
      completedAt: stage.completedAt ? new Date(stage.completedAt) : null,
      skippedAt: stage.skippedAt ? new Date(stage.skippedAt) : null,
      reopenedAt: stage.reopenedAt ? new Date(stage.reopenedAt) : null,
      notes: stage.notes || '',
      assignedTo: stage.assignedTo || null,
    } as ProductionStage;
  }

  const handleInitializeWorkflow = async (orderId: string) => {
    try {
      setStageActionError(null);
      setStageActionOrderId(orderId);

      const stages = await fetchOrderProductionStages(orderId);

      updateOrder(orderId, {
        productionStages: (stages ?? []).map(mapApiStageToLocalStage),
        status: 'in_progress',
      });
    } catch (err) {
      setStageActionError(
        err instanceof Error ? err.message : 'Failed to initialize workflow'
      );
    } finally {
      setStageActionOrderId(null);
    }
  };

  const handleAdvanceStage = async (order: Order) => {
    try {
      setStageActionError(null);
      setStageActionOrderId(order.id);

      const normalizedStages = getNormalizedStages(order.productionStages);
      const nextStage = normalizedStages.find((stage) => stage.status !== 'completed');

      if (!nextStage) {
        return;
      }

      const action = nextStage.status === 'active' ? 'complete' : 'start';

      const result = await transitionOrderProductionStage(
        order.id,
        nextStage.code,
        action
      );

      updateOrder(order.id, {
        productionStages: (result.productionStages ?? []).map(mapApiStageToLocalStage),
        status: result.orderStatus as Order['status'],
      });
    } catch (err) {
      setStageActionError(
        err instanceof Error ? err.message : 'Failed to update production stage'
      );
    } finally {
      setStageActionOrderId(null);
    }
  };

  const selectedMaterialOrder = materialOrderId
    ? orders.find((order) => order.id === materialOrderId) || null
    : null;

  const editingOrder =
    editingOrderId ? orders.find((order) => order.id === editingOrderId) || null : null;

  const openCreateOrderModal = () => {
    setEditingOrderId(null);
    setOrderFormMode('create');
  };

  const openEditOrderModal = (orderId: string) => {
    setEditingOrderId(orderId);
    setOrderFormMode('edit');
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
            <ClipboardList className="h-4 w-4" />
            {BRAND.productName} Order Workflow
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-slate-500">
            {orders.length} total orders • linked to customers, garments, measurements, design work, and materials
          </p>
        </div>

        <button
          onClick={openCreateOrderModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0F6E8C] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0C5C74]"
        >
          <Plus className="h-4 w-4" />
          New Order
        </button>
      </div>

      {stageActionError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {stageActionError}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Orders"
          value={String(summary.total)}
          subtitle="All recorded orders"
          icon={ClipboardList}
          tone="brand"
        />
        <SummaryCard
          title="Active Orders"
          value={String(summary.active)}
          subtitle="Draft, in progress, and ready"
          icon={TimerReset}
          tone="sky"
        />
        <SummaryCard
          title="Due Alerts"
          value={String(summary.dueSoon)}
          subtitle="Due today or overdue"
          icon={AlertTriangle}
          tone="amber"
        />
        <SummaryCard
          title="Delivered"
          value={String(summary.completed)}
          subtitle="Completed customer orders"
          icon={CheckCircle2}
          tone="slate"
        />
      </div>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm xl:flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, customer name, garment, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm xl:w-auto">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(statusFilters ?? []).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-[#0F6E8C] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
                {status !== 'all' && statusCounts[status] ? (
                  <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                    {statusCounts[status]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(filteredOrders ?? []).map((order) => {
          const isDue =
            order.dueDate &&
            (isToday(new Date(order.dueDate)) ||
              (isPast(new Date(order.dueDate)) &&
                !['delivered', 'cancelled'].includes(order.status)));

          const measurementCount = getMeasurementCount(order.measurementSnapshot);
          const stages = getNormalizedStages(order.productionStages);
          const completedStages = stages.filter((stage) => stage.status === 'completed').length;
          const nextStage = stages.find((stage) => stage.status !== 'completed');
          const materialUsages = getOrderMaterialUsages(order.id);
          const linkedFabric = fabricRecords.find((item) => item.id === order.selectedFabricId);
          const linkedInspiration = designInspirations.find(
            (item) => item.id === order.designInspirationId
          );
          const isStageUpdating = stageActionOrderId === order.id;
          const nextStageActionLabel =
            nextStage?.status === 'active'
              ? `Complete ${nextStage.label}`
              : nextStage
              ? `Start ${nextStage.label}`
              : '';

          const topBarClass =
            order.status === 'delivered'
              ? 'bg-green-500'
              : order.status === 'ready'
              ? 'bg-cyan-500'
              : order.status === 'cancelled'
              ? 'bg-red-400'
              : isDue
              ? 'bg-amber-400'
              : 'bg-[#0F6E8C]';

          return (
            <div
              key={order.id}
              className={`cursor-pointer overflow-hidden rounded-[24px] border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isDue ? 'border-amber-200' : 'border-slate-200'
              }`}
              onClick={() => {
                selectOrder(order.id);
                setView('design-studio');
              }}
            >
              <div className={`h-1.5 w-full ${topBarClass}`} />

              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
                      <OrderStatusBadge status={order.status} />
                      {order.garmentType && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-[#0F6E8C]">
                          {titleCase(order.garmentType)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{order.orderType}</p>
                  </div>

                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(
                      order.totalAmount,
                      safeCurrency(order.currency, workspaceCurrency)
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-4 w-4 text-slate-400" />
                    {order.customer?.fullName || 'No customer linked'}
                  </div>

                  {order.dueDate && (
                    <div
                      className={`flex items-center gap-2 ${
                        isDue ? 'text-amber-700' : 'text-slate-600'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      Due: {format(new Date(order.dueDate), 'MMM d, yyyy')}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-4 w-4" />
                    Created: {format(new Date(order.createdAt), 'MMM d')}
                  </div>

                  {measurementCount > 0 && (
                    <div className="flex items-center gap-2 text-[#0F6E8C]">
                      <Ruler className="h-4 w-4" />
                      {measurementCount} measurements saved
                    </div>
                  )}

                  {linkedInspiration && (
                    <div className="flex items-center gap-2 text-violet-600">
                      <Sparkles className="h-4 w-4" />
                      {linkedInspiration.title}
                    </div>
                  )}

                  {linkedFabric && (
                    <div className="flex items-center gap-2 text-rose-600">
                      <Layers3 className="h-4 w-4" />
                      {linkedFabric.name}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-[#0F6E8C]" />
                      <h4 className="text-sm font-semibold text-slate-900">Production Workflow</h4>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {completedStages}/{stages.length} completed
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {(stages ?? []).map((stage) => (
                      <span
                        key={stage.code}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          stage.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : stage.status === 'active'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {stage.status === 'completed' ? '? ' : ''}
                        {stage.status === 'active' ? '• ' : ''}
                        {stage.label}
                      </span>
                    ))}
                  </div>

                  {nextStage ? (
                    <p className="text-xs text-slate-500">
                      Next step:{' '}
                      <span className="font-medium text-slate-700">{nextStage.label}</span>
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-green-600">Workflow completed</p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-rose-600" />
                      <h4 className="text-sm font-semibold text-slate-900">Materials Used</h4>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {materialUsages.length} item{materialUsages.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {materialUsages.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(materialUsages ?? []).map((usage) => {
                        const material = fabricRecords.find((f) => f.id === usage.fabricRecordId);
                        return (
                          <div
                            key={usage.id}
                            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>
                              {material?.name || 'Material'} • {usage.quantityUsed} {usage.unit}
                            </span>
                            <button
                              onClick={() => deleteMaterialUsage(usage.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove usage"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No materials assigned yet.</p>
                  )}
                </div>

                {(order.notes || measurementCount > 0) && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {order.notes && (
                      <p className="mb-2 line-clamp-2 text-sm text-slate-500">{order.notes}</p>
                    )}

                    {measurementCount > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {renderMeasurementChips(order.measurementSnapshot).map((item) => (
                          <span
                            key={item.label}
                            className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-[#0F6E8C]"
                          >
                            {item.label}: {item.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {order.status === 'draft' && !order.productionStages?.length && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleInitializeWorkflow(order.id);
                      }}
                      disabled={isStageUpdating}
                      className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStageUpdating ? 'Starting...' : 'Start Workflow'}
                    </button>
                  )}

                  {order.status !== 'cancelled' && order.status !== 'delivered' && nextStage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAdvanceStage(order);
                      }}
                      disabled={isStageUpdating}
                      className="rounded-xl bg-[#0F6E8C]/10 px-3 py-1.5 text-xs font-medium text-[#0F6E8C] hover:bg-[#0F6E8C]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isStageUpdating ? 'Updating...' : nextStageActionLabel}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMaterialOrderId(order.id);
                    }}
                    className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
                  >
                    Add Material
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditOrderModal(order.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  {completedStages === stages.length && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto max-w-md rounded-[24px] border border-dashed border-slate-200 bg-white p-8">
            <Boxes className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">No orders found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create a new order, or change your search and filter.
            </p>
          </div>
        </div>
      )}

      {selectedMaterialOrder && (
        <AddMaterialToOrderModal
          orderId={selectedMaterialOrder.id}
          orderLabel={selectedMaterialOrder.orderNumber}
          materials={fabricRecords}
          onClose={() => setMaterialOrderId(null)}
          onSubmit={(data) => {
            const result = addMaterialUsage(data);
            if (result.success) {
              setMaterialOrderId(null);
            }
            return result;
          }}
        />
      )}

      {orderFormMode && (
        <OrderFormModal
          mode={orderFormMode}
          existingOrder={orderFormMode === 'edit' ? editingOrder : null}
          customers={customers}
          materials={fabricRecords}
          inspirations={designInspirations}
          workspaceCurrency={workspaceCurrency}
          existingOrders={orders}
          onClose={() => {
            setOrderFormMode(null);
            setEditingOrderId(null);
          }}
          onCreate={(payload) => {
            const createdId = addOrder(payload);
            if (createdId) {
              selectOrder(createdId);
              setOrderFormMode(null);
              setEditingOrderId(null);
            }
          }}
          onUpdate={(orderId, updates) => {
            updateOrder(orderId, updates);
            selectOrder(orderId);
            setOrderFormMode(null);
            setEditingOrderId(null);
          }}
        />
      )}
    </div>
  );
}

function OrderFormModal({
  mode,
  existingOrder,
  customers,
  materials,
  inspirations,
  workspaceCurrency,
  existingOrders,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: 'create' | 'edit';
  existingOrder: Order | null;
  customers: Array<{ id: string; fullName: string }>;
  materials: FabricRecord[];
  inspirations: Array<{ id: string; title: string; category: string; fitType?: string }>;
  workspaceCurrency: string;
  existingOrders: Order[];
  onClose: () => void;
  onCreate: (payload: Omit<Order, 'id' | 'workspaceId' | 'createdAt'>) => void;
  onUpdate: (orderId: string, updates: Partial<Order>) => void;
}) {
  const [form, setForm] = useState<OrderFormState>(() =>
    buildOrderFormState(existingOrder, workspaceCurrency, existingOrders)
  );
  const [error, setError] = useState<string | null>(null);

  const measurementFields = MEASUREMENT_FIELDS_BY_GARMENT[form.garmentType];
  const selectedMaterial = materials.find((item) => item.id === form.selectedFabricId) || null;
  const selectedInspiration =
    inspirations.find((item) => item.id === form.designInspirationId) || null;

  const subtotal = parseAmount(form.subtotal);
  const taxTotal = parseAmount(form.taxTotal);
  const discountTotal = parseAmount(form.discountTotal);
  const totalAmount = Math.max(0, subtotal + taxTotal - discountTotal);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.customerId) {
      setError('Please select a customer.');
      return;
    }

    if (!form.orderNumber.trim()) {
      setError('Please enter an order number.');
      return;
    }

    if (!form.orderType.trim()) {
      setError('Please enter an order description.');
      return;
    }

    const linkedFabric =
      form.selectedFabricId
        ? materials.find((item) => item.id === form.selectedFabricId) || null
        : null;

    const matchingInspiration =
      form.designInspirationId
        ? inspirations.find((item) => item.id === form.designInspirationId) || null
        : null;

    const measurementSnapshot = parseMeasurementValues(form.measurements);

    const analysis = analyzeDesignInspiration(
      // Trimmed inspiration shape; the analyzer reads optional fields only.
      (matchingInspiration ?? undefined) as unknown as DesignInspiration | undefined,
      form.garmentType
    );

    const productionPlan = generateProductionPlan({
      garmentType: form.garmentType,
      measurements: measurementSnapshot,
      inspiration: (matchingInspiration ?? undefined) as unknown as DesignInspiration | undefined,
      analysis,
      selectedFabric: linkedFabric || undefined,
    });

    const basePayload: Omit<Order, 'id' | 'workspaceId' | 'createdAt'> = {
      customerId: form.customerId,
      assignedTo: form.assignedTo.trim() || null,
      orderNumber: form.orderNumber.trim(),
      status:
        existingOrder?.status ||
        (existingOrder?.productionStages?.length ? 'in_progress' : 'draft'),
      orderType: form.orderType.trim(),
      dueDate: form.dueDate ? new Date(form.dueDate) : null,
      notes: form.notes.trim(),
      designInspirationId: form.designInspirationId || null,
      selectedFabricId: form.selectedFabricId || null,
      selectedPatternId: existingOrder?.selectedPatternId || null,
      fitType: (matchingInspiration?.fitType as Order['fitType']) || existingOrder?.fitType,
      styleNotes: form.styleNotes.trim() || undefined,
      garmentType: form.garmentType,
      garmentMeasurements: measurementSnapshot,
      measurementSnapshot,
      productionPlan,
      inspirationAnalysis: analysis,
      productionStages:
        existingOrder?.productionStages?.length
          ? existingOrder.productionStages
          : buildInitialProductionStages(),
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      currency: safeCurrency(form.currency),
    };

    if (mode === 'create') {
      onCreate(basePayload);
      return;
    }

    if (!existingOrder) {
      setError('No order selected for editing.');
      return;
    }

    onUpdate(existingOrder.id, basePayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-[#0F6E8C]" />

        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'create' ? 'Create Order' : 'Edit Order'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture garment type, measurement snapshot, inspiration, fabric, and production setup.
            </p>
          </div>

          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form id="order-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-[#0F6E8C]" />
                  <h3 className="text-base font-semibold text-slate-900">Order Basics</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Customer">
                    <select
                      value={form.customerId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, customerId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    >
                      <option value="">Select customer</option>
                      {(customers ?? []).map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.fullName}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Order Number">
                    <input
                      value={form.orderNumber}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, orderNumber: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>

                  <FormField label="Garment Type">
                    <select
                      value={form.garmentType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          garmentType: e.target.value as GarmentType,
                          measurements: remapMeasurements(
                            prev.measurements,
                            e.target.value as GarmentType
                          ),
                          orderType:
                            prev.orderType.trim() && prev.orderType !== titleCase(prev.garmentType)
                              ? prev.orderType
                              : titleCase(e.target.value),
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    >
                      {(GARMENT_OPTIONS ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Order Description">
                    <input
                      value={form.orderType}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, orderType: e.target.value }))
                      }
                      placeholder="Wedding gown, Senator set, Corporate shirt..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>

                  <FormField label="Due Date">
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>

                  <FormField label="Currency">
                    <input
                      value={form.currency}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, currency: (e.target.value ?? "").toUpperCase() }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField label="Subtotal">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.subtotal}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, subtotal: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>

                  <FormField label="Tax">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.taxTotal}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, taxTotal: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>

                  <FormField label="Discount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountTotal}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, discountTotal: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    />
                  </FormField>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Amount
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(totalAmount, safeCurrency(form.currency || workspaceCurrency))}
                  </p>
                </div>

                <div className="mt-4">
                  <FormField label="Notes">
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                      placeholder="Special instructions, delivery notes, finishing requirements..."
                    />
                  </FormField>
                </div>

                <div className="mt-4">
                  <FormField label="Style Notes">
                    <textarea
                      rows={3}
                      value={form.styleNotes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, styleNotes: e.target.value }))
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                      placeholder="Silhouette, fit direction, neckline preferences..."
                    />
                  </FormField>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-[#0F6E8C]" />
                  <h3 className="text-base font-semibold text-slate-900">Measurement Snapshot</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(measurementFields ?? []).map((field) => (
                    <FormField key={field.key} label={`${field.label} (${field.unit})`}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.measurements[field.key] || ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            measurements: {
                              ...prev.measurements,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                        placeholder="0"
                      />
                    </FormField>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <h3 className="text-base font-semibold text-slate-900">Optional Design Links</h3>
                </div>

                <div className="space-y-4">
                  <FormField label="Inspiration">
                    <select
                      value={form.designInspirationId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, designInspirationId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    >
                      <option value="">No inspiration linked</option>
                      {(inspirations ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} • {titleCase(item.category)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Fabric">
                    <select
                      value={form.selectedFabricId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, selectedFabricId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-300"
                    >
                      <option value="">No fabric linked</option>
                      {materials
                        .filter((item) => item.isActive !== false)
                        .map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} • {material.quantityInStock} {material.unit}
                          </option>
                        ))}
                    </select>
                  </FormField>
                </div>

                {(selectedInspiration || selectedMaterial) && (
                  <div className="mt-4 space-y-3">
                    {selectedInspiration && (
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Inspiration Linked
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {selectedInspiration.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {titleCase(selectedInspiration.category)}
                        </p>
                      </div>
                    )}

                    {selectedMaterial && (
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Fabric Linked
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {selectedMaterial.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedMaterial.quantityInStock} {selectedMaterial.unit} in stock
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Shirt className="h-5 w-5 text-[#0F6E8C]" />
                  <h3 className="text-base font-semibold text-slate-900">Production Ready Output</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Garment Type
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {titleCase(form.garmentType)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Measurement Fields Captured
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {Object.keys(parseMeasurementValues(form.measurements)).length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Production Stages
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {existingOrder?.productionStages?.length || DEFAULT_PRODUCTION_STAGES.length} stages
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      New orders auto-initialize workflow from Measurement.
                    </p>
                  </div>
                </div>
              </section>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="border-t border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="order-form"
              className="rounded-2xl bg-[#0F6E8C] px-4 py-3 font-semibold text-white hover:bg-[#0C5C74]"
            >
              {mode === 'create' ? 'Create Order' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMaterialToOrderModal({
  orderId,
  orderLabel,
  materials,
  onClose,
  onSubmit,
}: {
  orderId: string;
  orderLabel: string;
  materials: FabricRecord[];
  onClose: () => void;
  onSubmit: (data: {
    orderId: string;
    fabricRecordId: string;
    quantityUsed: number;
    unit: MaterialUnit;
    notes?: string;
  }) => { success: boolean; error?: string };
}) {
  const activeMaterials = materials.filter((item) => item.isActive !== false);

  const [fabricRecordId, setFabricRecordId] = useState(activeMaterials[0]?.id || '');
  const [quantityUsed, setQuantityUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedMaterial = activeMaterials.find((item) => item.id === fabricRecordId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!fabricRecordId) {
      setError('Please select a material');
      return;
    }

    const qty = Number(quantityUsed);
    if (!quantityUsed || qty <= 0) {
      setError('Enter a valid quantity');
      return;
    }

    const result = onSubmit({
      orderId,
      fabricRecordId,
      quantityUsed: qty,
      unit: selectedMaterial?.unit || 'yards',
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error || 'Failed to assign material');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[24px] bg-white shadow-xl">
        <div className="h-1.5 w-full bg-[#0F6E8C]" />

        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Material to Order</h2>
            <p className="mt-1 text-sm text-slate-500">{orderLabel}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Material</label>
            <select
              value={fabricRecordId}
              onChange={(e) => setFabricRecordId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
            >
              {activeMaterials.length === 0 ? (
                <option value="">No materials available</option>
              ) : (
                (activeMaterials ?? []).map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} • {material.quantityInStock} {material.unit} left
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedMaterial && (
            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">In stock:</span> {selectedMaterial.quantityInStock}{' '}
                {selectedMaterial.unit}
              </p>
              {typeof selectedMaterial.reorderLevel === 'number' && (
                <p className="mt-1">
                  <span className="font-medium">Reorder level:</span>{' '}
                  {selectedMaterial.reorderLevel} {selectedMaterial.unit}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity Used</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
              placeholder="4"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
              placeholder="Used for body, sleeve, collar, lining..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMaterial}
              className="flex-1 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white hover:bg-[#0C5C74] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Assign Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({
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
  tone: 'brand' | 'sky' | 'amber' | 'slate';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    sky: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
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

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-sky-100 text-sky-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-cyan-100 text-cyan-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function getMeasurementCount(
  measurementSnapshot?: OrderMeasurementSnapshot | Record<string, unknown> | null
): number {
  if (!measurementSnapshot) return 0;

  return Object.entries(measurementSnapshot).filter(([key, value]) => {
    if (key === 'notes') return false;
    return value !== undefined && value !== null && value !== '';
  }).length;
}

function renderMeasurementChips(
  measurementSnapshot?: OrderMeasurementSnapshot | Record<string, unknown> | null
): Array<{ label: string; value: string }> {
  if (!measurementSnapshot) return [];

  const labelMap: Record<string, string> = {
    chest: 'Chest',
    waist: 'Waist',
    hip: 'Hip',
    shoulder: 'Shoulder',
    sleeve: 'Sleeve',
    neck: 'Neck',
    bust: 'Bust',
    backLength: 'Back',
    bustSpan: 'Bust Span',
    armholeDepth: 'Armhole',
    skirtLength: 'Skirt',
    trouserLength: 'Trouser',
    fullLength: 'Full Length',
    thigh: 'Thigh',
    knee: 'Knee',
    ankle: 'Ankle',
  };

  return Object.entries(measurementSnapshot)
    .filter(
      ([key, value]) => key !== 'notes' && value !== undefined && value !== null && value !== ''
    )
    .slice(0, 6)
    .map(([key, value]) => ({
      label: labelMap[key] || key,
      value: String(value),
    }));
}

function getNormalizedStages(stages?: ProductionStage[]): ProductionStage[] {
  if (stages && stages.length > 0) {
    return (DEFAULT_PRODUCTION_STAGES ?? []).map((defaultStage) => {
      const existing = stages.find((stage) => stage.code === defaultStage.code);
      return (
        existing || {
          code: defaultStage.code,
          label: defaultStage.label,
          status: 'pending',
          completedAt: null,
          notes: '',
        }
      );
    });
  }

  return (DEFAULT_PRODUCTION_STAGES ?? []).map((stage) => ({
    code: stage.code,
    label: stage.label,
    status: 'pending' as const,
    completedAt: null,
    notes: '',
  }));
}

function buildInitialProductionStages(): ProductionStage[] {
  return (DEFAULT_PRODUCTION_STAGES ?? []).map((stage, index) => ({
    code: stage.code,
    label: stage.label,
    status: index === 0 ? ('active' as const) : ('pending' as const),
    completedAt: null,
    notes: '',
  }));
}

function generateNextOrderNumber(existingOrders: Order[]) {
  const next = existingOrders.length + 1;
  return `ORD-${String(next).padStart(4, '0')}`;
}

function buildOrderFormState(
  existingOrder: Order | null,
  workspaceCurrency: string,
  existingOrders: Order[]
): OrderFormState {
  return {
    customerId: existingOrder?.customerId || '',
    orderNumber: existingOrder?.orderNumber || generateNextOrderNumber(existingOrders),
    orderType: existingOrder?.orderType || titleCase(existingOrder?.garmentType || 'dress'),
    garmentType: existingOrder?.garmentType || 'dress',
    dueDate: toDateInputValue(existingOrder?.dueDate),
    notes: existingOrder?.notes || '',
    styleNotes: existingOrder?.styleNotes || '',
    subtotal: String(existingOrder?.subtotal ?? 0),
    taxTotal: String(existingOrder?.taxTotal ?? 0),
    discountTotal: String(existingOrder?.discountTotal ?? 0),
    currency: existingOrder?.currency || workspaceCurrency,
    designInspirationId: existingOrder?.designInspirationId || '',
    selectedFabricId: existingOrder?.selectedFabricId || '',
    assignedTo: existingOrder?.assignedTo || '',
    measurements: buildMeasurementDraft(existingOrder?.measurementSnapshot),
  };
}

function buildMeasurementDraft(
  snapshot?: Partial<GarmentMeasurements> | null
): Partial<Record<MeasurementKey, string>> {
  if (!snapshot) return {};

  const entries = Object.entries(snapshot).filter(([, value]) => typeof value === 'number');

  return Object.fromEntries(
    (entries ?? []).map(([key, value]) => [key, String(value)])
  ) as Partial<Record<MeasurementKey, string>>;
}

function parseMeasurementValues(
  values: Partial<Record<MeasurementKey, string>>
): Partial<GarmentMeasurements> {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]): [string, number] => [key, Number(value)])
      .filter(([, value]) => Number.isFinite(value) && value > 0)
  ) as Partial<GarmentMeasurements>;
}

function remapMeasurements(
  current: Partial<Record<MeasurementKey, string>>,
  garmentType: GarmentType
) {
  const allowedKeys = new Set(MEASUREMENT_FIELDS_BY_GARMENT[garmentType].map((field) => field.key));

  return Object.fromEntries(
    Object.entries(current).filter(([key]) => allowedKeys.has(key as MeasurementKey))
  ) as Partial<Record<MeasurementKey, string>>;
}

function parseAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateInputValue(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
