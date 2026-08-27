import { useMemo, type MouseEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Package,
  Ruler,
  User,
  X,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { getHighestOrderAlertSeverity, getOrderAlerts } from '@shared/utils/productionAlerts';
import type {
  CurrencyCode,
  FabricRecord,
  Order,
  OrderAlert,
  OrderMaterialUsage,
  OrderMeasurementSnapshot,
  ProductionStage,
  ProductionStageCode,
} from '../types';

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

type OrderCardProps = {
  order: Order;
  workspaceCurrency?: CurrencyCode;
  fabricRecords?: FabricRecord[];
  materialUsages?: OrderMaterialUsage[];
  onSelect?: (order: Order) => void;
  onInitializeWorkflow?: (order: Order) => void;
  onAdvanceStage?: (order: Order) => void;
  onAddMaterial?: (order: Order) => void;
  onDeleteMaterialUsage?: (usageId: string) => void;
  footerRight?: ReactNode;
  className?: string;
};

export function OrderCard({
  order,
  workspaceCurrency = 'GHS',
  fabricRecords = [],
  materialUsages = [],
  onSelect,
  onInitializeWorkflow,
  onAdvanceStage,
  onAddMaterial,
  onDeleteMaterialUsage,
  footerRight,
  className = '',
}: OrderCardProps) {
  const isDue =
    order.dueDate &&
    (isToday(new Date(order.dueDate)) ||
      (isPast(new Date(order.dueDate)) &&
        !['delivered', 'cancelled'].includes(order.status)));

  const measurementCount = getMeasurementCount(order.measurementSnapshot);
  const stages = getNormalizedStages(order.productionStages);
  const completedStages = stages.filter(
    (stage) => stage.status === 'completed' || stage.status === 'skipped'
  ).length;
  const nextStage = stages.find(
    (stage) => stage.status !== 'completed' && stage.status !== 'skipped'
  );

  const alertSummary = useMemo(
    () =>
      getOrderAlerts({
        ...order,
        productionStages: stages,
      }),
    [order, stages]
  );

  const alertSeverity = getHighestOrderAlertSeverity(alertSummary.alerts);

  const topBarClass =
    alertSeverity === 'critical'
      ? 'bg-red-500'
      : alertSeverity === 'warning'
      ? 'bg-amber-400'
      : order.status === 'delivered'
      ? 'bg-green-500'
      : order.status === 'ready'
      ? 'bg-cyan-500'
      : order.status === 'cancelled'
      ? 'bg-red-400'
      : isDue
      ? 'bg-amber-400'
      : 'bg-[#0F6E8C]';

  const handleCardClick = () => {
    onSelect?.(order);
  };

  const stop = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`cursor-pointer overflow-hidden rounded-[24px] border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        alertSeverity === 'critical'
          ? 'border-red-200'
          : alertSeverity === 'warning'
          ? 'border-amber-200'
          : isDue
          ? 'border-amber-200'
          : 'border-slate-200'
      } ${className}`}
      onClick={handleCardClick}
    >
      <div className={`h-1.5 w-full ${topBarClass}`} />

      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{order.orderNumber}</h3>
              <OrderStatusBadge status={order.status} />
              {alertSummary.isBlocked && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Blocked
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{order.orderType}</p>
          </div>

          <span className="text-lg font-semibold text-slate-900">
            {formatCurrency(order.totalAmount, safeCurrency(order.currency, workspaceCurrency))}
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
        </div>

        {alertSummary.alerts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${
                  alertSeverity === 'critical'
                    ? 'text-red-600'
                    : alertSeverity === 'warning'
                    ? 'text-amber-600'
                    : 'text-sky-600'
                }`}
              />
              <h4 className="text-sm font-semibold text-slate-900">Production Alerts</h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {alertSummary.alerts.slice(0, 3).map((alert, index) => (
                <span
                  key={`${alert.code}-${index}`}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getAlertChipClasses(
                    alert
                  )}`}
                  title={alert.message}
                >
                  {alert.title}
                </span>
              ))}

              {alertSummary.alerts.length > 3 && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                  +{alertSummary.alerts.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#0F6E8C]" />
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
                    : stage.status === 'skipped'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {stage.status === 'completed' ? '✓ ' : ''}
                {stage.label}
              </span>
            ))}
          </div>

          {nextStage ? (
            <p className="text-xs text-slate-500">
              Next step: <span className="font-medium text-slate-700">{nextStage.label}</span>
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
                    onClick={stop}
                  >
                    <span>
                      {material?.name || 'Material'} • {usage.quantityUsed} {usage.unit}
                    </span>

                    {onDeleteMaterialUsage && (
                      <button
                        onClick={() => onDeleteMaterialUsage(usage.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove usage"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
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
          {order.status === 'draft' && !order.productionStages?.length && onInitializeWorkflow && (
            <button
              onClick={(event) => {
                stop(event);
                onInitializeWorkflow(order);
              }}
              className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-200"
            >
              Start Workflow
            </button>
          )}

          {order.status !== 'cancelled' &&
            order.status !== 'delivered' &&
            nextStage &&
            onAdvanceStage && (
              <button
                onClick={(event) => {
                  stop(event);
                  onAdvanceStage(order);
                }}
                className="rounded-xl bg-[#0F6E8C]/10 px-3 py-1.5 text-xs font-medium text-[#0F6E8C] hover:bg-[#0F6E8C]/20"
              >
                {nextStage.status === 'active'
                  ? `Complete ${nextStage.label}`
                  : `Advance ${nextStage.label}`}
              </button>
            )}

          {onAddMaterial && (
            <button
              onClick={(event) => {
                stop(event);
                onAddMaterial(order);
              }}
              className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
            >
              Add Material
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {alertSummary.alerts.length > 0 && (
            <AlertTriangle
              className={`h-4 w-4 ${
                alertSeverity === 'critical'
                  ? 'text-red-500'
                  : alertSeverity === 'warning'
                  ? 'text-amber-500'
                  : 'text-sky-500'
              }`}
            />
          )}
          {completedStages === stages.length && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {footerRight}
          <ChevronRight className="h-5 w-5 text-slate-400" />
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
    aroundWrist: 'Around Wrist',
    shoulderToWaist: 'Shoulder to Waist',
    shoulderToHip: 'Shoulder to Hip',
    sleeveOpening: 'Sleeve Opening',
    bicep: 'Bicep',
  };

  return Object.entries(measurementSnapshot)
    .filter(
      ([key, value]) => key !== 'notes' && value !== undefined && value !== null && value !== ''
    )
    .slice(0, 5)
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
          status: 'pending' as const,
          startedAt: null,
          completedAt: null,
          skippedAt: null,
          reopenedAt: null,
          notes: '',
        }
      );
    });
  }

  return (DEFAULT_PRODUCTION_STAGES ?? []).map((stage) => ({
    code: stage.code,
    label: stage.label,
    status: 'pending' as const,
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    reopenedAt: null,
    notes: '',
  }));
}

function getAlertChipClasses(alert: OrderAlert) {
  if (alert.severity === 'critical') return 'bg-red-100 text-red-700';
  if (alert.severity === 'warning') return 'bg-amber-100 text-amber-700';
  return 'bg-sky-100 text-sky-700';
}
