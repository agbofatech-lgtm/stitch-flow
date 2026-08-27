export type ReportingDatePreset =
  | 'last7Days'
  | 'last30Days'
  | 'thisMonth'
  | 'allTime'
  | 'custom';

export type ReportingDateRange = {
  preset: ReportingDatePreset;
  start: Date | null;
  end: Date | null;
  label: string;
};

type MinimalOrder = {
  id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  dueDate?: string | Date | null;
  deliveredAt?: string | Date | null;
  status?: string | null;
  orderType?: string | null;
  garmentType?: string | null;
  productionStages?: MinimalProductionStage[] | null;
};

type MinimalProductionStage = {
  name?: string | null;
  label?: string | null;
  title?: string | null;
  stage?: string | null;
  status?: string | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  expectedCompletionDate?: string | Date | null;
  deadline?: string | Date | null;
  dueDate?: string | Date | null;
};

type MinimalMaterialUsage = {
  fabricRecordId?: string | null;
  orderId?: string | null;
  linkedOrderId?: string | null;
  referenceOrderId?: string | null;
  quantityUsed: number;
  unit?: string | null;
  createdAt?: string | Date | null;
};

type MinimalFabricRecord = {
  id: string;
  unit?: string | null;
};

const COMPLETED_STAGE_STATUSES = new Set([
  'completed',
  'complete',
  'done',
  'ready',
  'delivered',
]);

const CLOSED_ORDER_STATUSES = new Set(['cancelled', 'delivered']);

const STAGE_PRIORITY: Record<string, number> = {
  Design: 1,
  Cutting: 2,
  Sewing: 3,
  Fitting: 4,
  Ready: 5,
  Delivered: 6,
  Other: 99,
};

export function resolveReportingDateRange(
  preset: ReportingDatePreset,
  customStart?: string,
  customEnd?: string,
  now = new Date()
): ReportingDateRange {
  if (preset === 'allTime') {
    return {
      preset,
      start: null,
      end: null,
      label: 'all time',
    };
  }

  if (preset === 'custom') {
    const start = customStart ? parseDate(customStart) : null;
    const end = customEnd ? endOfDay(parseDate(customEnd)) : null;

    if (start && end) {
      return {
        preset,
        start,
        end,
        label: `${formatDateLabel(start)} to ${formatDateLabel(end)}`,
      };
    }

    return {
      preset,
      start,
      end,
      label: 'custom range',
    };
  }

  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endOfDay(now);

    return {
      preset,
      start,
      end,
      label: 'this month',
    };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === 'last7Days') {
    start.setDate(start.getDate() - 6);
    return {
      preset,
      start,
      end: endOfDay(now),
      label: 'last 7 days',
    };
  }

  start.setDate(start.getDate() - 29);
  return {
    preset,
    start,
    end: endOfDay(now),
    label: 'last 30 days',
  };
}

export function filterOrdersByDateRange<T extends MinimalOrder>(
  orders: T[],
  range: ReportingDateRange
): T[] {
  if (!range.start && !range.end) return orders;

  return orders.filter((order) => {
    const createdAt = parseDate(order.createdAt);
    if (!createdAt) return false;
    return isWithinRange(createdAt, range);
  });
}

export function buildOrdersByStage<T extends MinimalOrder>(
  orders: T[],
  range?: ReportingDateRange
) {
  const scopedOrders = range ? filterOrdersByDateRange(orders, range) : orders;
  const counts = new Map<string, number>();

  for (const order of scopedOrders) {
    const stage = getCurrentStageLabel(order);
    counts.set(stage, (counts.get(stage) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => {
      const priorityA = STAGE_PRIORITY[a.stage] ?? STAGE_PRIORITY.Other;
      const priorityB = STAGE_PRIORITY[b.stage] ?? STAGE_PRIORITY.Other;

      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.count - a.count;
    });
}

export function getOverdueOrdersCount<T extends MinimalOrder>(
  orders: T[],
  range?: ReportingDateRange,
  stalledThresholdDays = 7,
  now = new Date()
) {
  const scopedOrders = range ? filterOrdersByDateRange(orders, range) : orders;

  return scopedOrders.filter((order) =>
    isOrderOverdue(order, stalledThresholdDays, now)
  ).length;
}

export function getReadyForDeliveryCount<T extends MinimalOrder>(
  orders: T[],
  range?: ReportingDateRange
) {
  const scopedOrders = range ? filterOrdersByDateRange(orders, range) : orders;

  return scopedOrders.filter((order) => {
    const status = String(order.status || '').toLowerCase();
    if (status === 'ready') return true;

    const stages = getProductionStages(order);
    return stages.length > 0 && stages.every((stage) => isStageComplete(stage));
  }).length;
}

export function getAverageTurnaroundDays<T extends MinimalOrder>(
  orders: T[],
  range?: ReportingDateRange
) {
  const scopedOrders = range ? filterOrdersByDateRange(orders, range) : orders;
  const deliveredOrders = scopedOrders.filter(
    (order) => !!getDeliveredAt(order) && !!parseDate(order.createdAt)
  );

  if (!deliveredOrders.length) return 0;

  const totalDays = deliveredOrders.reduce((sum, order) => {
    const createdAt = parseDate(order.createdAt)!;
    const deliveredAt = getDeliveredAt(order)!;
    return sum + diffDays(createdAt, deliveredAt);
  }, 0);

  return totalDays / deliveredOrders.length;
}

export function getMaterialConsumptionByGarmentType<
  TOrder extends MinimalOrder,
  TUsage extends MinimalMaterialUsage,
  TFabric extends MinimalFabricRecord
>(
  orders: TOrder[],
  materialUsages: TUsage[],
  fabricRecords: TFabric[] = [],
  range?: ReportingDateRange
) {
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const fabricMap = new Map(fabricRecords.map((fabric) => [fabric.id, fabric]));
  const summary = new Map<
    string,
    {
      garmentType: string;
      totalQuantity: number;
      usageCount: number;
      orderIds: Set<string>;
      units: Set<string>;
    }
  >();

  for (const usage of materialUsages) {
    const orderId = usage.orderId || usage.linkedOrderId || usage.referenceOrderId;
    if (!orderId) continue;

    const order = orderMap.get(orderId);
    if (!order) continue;

    if (range) {
      const usageDate = parseDate(usage.createdAt) || parseDate(order.createdAt);
      if (!usageDate || !isWithinRange(usageDate, range)) continue;
    }

    const garmentType = normalizeLabel(order.garmentType || order.orderType || 'Unspecified');
    const unit =
      usage.unit ||
      fabricMap.get(usage.fabricRecordId || '')?.unit ||
      'units';

    const current = summary.get(garmentType) || {
      garmentType,
      totalQuantity: 0,
      usageCount: 0,
      orderIds: new Set<string>(),
      units: new Set<string>(),
    };

    current.totalQuantity += usage.quantityUsed || 0;
    current.usageCount += 1;
    current.orderIds.add(order.id);
    current.units.add(unit);

    summary.set(garmentType, current);
  }

  return Array.from(summary.values())
    .map((entry) => ({
      garmentType: entry.garmentType,
      totalQuantity: entry.totalQuantity,
      usageCount: entry.usageCount,
      orderCount: entry.orderIds.size,
      unitLabel:
        entry.units.size === 1 ? Array.from(entry.units)[0] : 'mixed units',
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

export function getBottleneckView<T extends MinimalOrder>(
  orders: T[],
  range?: ReportingDateRange
) {
  const scopedOrders = range ? filterOrdersByDateRange(orders, range) : orders;

  const stageDurations = new Map<
    string,
    {
      totalDays: number;
      sampleSize: number;
    }
  >();

  for (const order of scopedOrders) {
    const stages = getProductionStages(order);
    if (!stages.length) continue;

    let previousCompletedAt = parseDate(order.createdAt);

    for (const stage of stages) {
      const completedAt =
        parseDate(stage.completedAt) || parseDate(stage.updatedAt);
      if (!completedAt) continue;

      const startedAt =
        parseDate(stage.startedAt) ||
        parseDate(stage.createdAt) ||
        previousCompletedAt;

      if (!startedAt) {
        previousCompletedAt = completedAt;
        continue;
      }

      const duration = diffDays(startedAt, completedAt);
      const label = getStageLabel(stage);

      const current = stageDurations.get(label) || {
        totalDays: 0,
        sampleSize: 0,
      };

      current.totalDays += duration;
      current.sampleSize += 1;
      stageDurations.set(label, current);

      previousCompletedAt = completedAt;
    }
  }

  return Array.from(stageDurations.entries())
    .map(([stage, data]) => ({
      stage,
      averageDays: data.sampleSize > 0 ? data.totalDays / data.sampleSize : 0,
      sampleSize: data.sampleSize,
    }))
    .sort((a, b) => b.averageDays - a.averageDays);
}

function isOrderOverdue(
  order: MinimalOrder,
  stalledThresholdDays: number,
  now: Date
) {
  const status = String(order.status || '').toLowerCase();
  if (CLOSED_ORDER_STATUSES.has(status)) return false;

  const orderDueDate = parseDate(order.dueDate);
  if (orderDueDate && orderDueDate < now) return true;

  const stages = getProductionStages(order);

  for (const stage of stages) {
    if (isStageComplete(stage)) continue;

    const deadline = getStageDeadline(stage);
    if (deadline && deadline < now) return true;

    const activeSince =
      parseDate(stage.startedAt) ||
      parseDate(stage.updatedAt) ||
      parseDate(stage.createdAt) ||
      parseDate(order.updatedAt) ||
      parseDate(order.createdAt);

    if (activeSince && diffDays(activeSince, now) > stalledThresholdDays) {
      return true;
    }
  }

  return false;
}

function getCurrentStageLabel(order: MinimalOrder) {
  const stages = getProductionStages(order);
  const firstIncomplete = stages.find((stage) => !isStageComplete(stage));

  if (firstIncomplete) {
    return getStageLabel(firstIncomplete);
  }

  const status = String(order.status || '').toLowerCase();

  if (status === 'delivered') return 'Delivered';
  if (status === 'ready') return 'Ready';
  if (status === 'draft') return 'Design';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'cancelled') return 'Cancelled';

  if (stages.length > 0) {
    return 'Ready';
  }

  return normalizeLabel(order.orderType || 'Other');
}

function getProductionStages(order: MinimalOrder) {
  return Array.isArray(order.productionStages) ? order.productionStages : [];
}

function isStageComplete(stage: MinimalProductionStage) {
  const status = String(stage.status || '').toLowerCase();
  return COMPLETED_STAGE_STATUSES.has(status) || !!parseDate(stage.completedAt);
}

function getStageLabel(stage: MinimalProductionStage) {
  const raw = stage.label || stage.name || stage.title || stage.stage || 'Other';
  const normalized = normalizeLabel(raw);

  if (normalized.toLowerCase() === 'in progress') {
    return 'Sewing';
  }

  return normalized;
}

function getStageDeadline(stage: MinimalProductionStage) {
  return (
    parseDate(stage.expectedCompletionDate) ||
    parseDate(stage.deadline) ||
    parseDate(stage.dueDate)
  );
}

function getDeliveredAt(order: MinimalOrder) {
  const direct = parseDate(order.deliveredAt);
  if (direct) return direct;

  const completedStages = getProductionStages(order)
    .map((stage) => parseDate(stage.completedAt) || parseDate(stage.updatedAt))
    .filter(Boolean) as Date[];

  if (!completedStages.length) return null;

  completedStages.sort((a, b) => a.getTime() - b.getTime());
  return completedStages[completedStages.length - 1];
}

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(date: Date, range: ReportingDateRange) {
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function diffDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(ms / (1000 * 60 * 60 * 24), 0);
}

function endOfDay(date: Date | null) {
  if (!date) return null;
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeLabel(value: string) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
