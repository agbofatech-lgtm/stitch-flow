import type {
  Order,
  OrderAlert,
  OrderAlertSummary,
  OrderCompletenessCheck,
  ProductionStage,
  ProductionStageCode,
  StageOverdueAlert,
} from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type MeasurementProfileType =
  | 'shirt'
  | 'dress_kaba'
  | 'skirt'
  | 'trouser'
  | 'blouse'
  | 'custom';

type SnapshotWithProfileMeta = Record<string, unknown> & {
  profileId?: string | null;
  profileLabel?: string | null;
  profileType?: MeasurementProfileType | null;
  capturedAt?: Date | string | null;
};

export const DEFAULT_STAGE_DURATION_DAYS: Record<ProductionStageCode, number> = {
  measurement: 1,
  cutting: 1,
  sewing: 3,
  embroidery: 2,
  first_fitting: 2,
  second_fitting: 2,
  final_press: 1,
  ready: 1,
  delivered: 1,
};

const SNAPSHOT_META_KEYS = new Set([
  'notes',
  'profileId',
  'profileLabel',
  'profileType',
  'capturedAt',
]);

const PROFILE_REQUIRED_FIELDS: Record<MeasurementProfileType, string[]> = {
  shirt: ['chest', 'shoulder', 'sleeveLength', 'aroundWrist', 'shirtLength'],
  dress_kaba: ['bust', 'waist', 'hip', 'shoulderToWaist', 'nippleToNipple'],
  skirt: ['waist', 'hip', 'skirtLength'],
  trouser: ['waist', 'hip', 'trouserLength', 'waistToHip', 'aroundAnkle'],
  blouse: ['bust', 'waist', 'shoulderToWaist'],
  custom: [],
};

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function diffInDays(from: Date, to: Date): number {
  const fromDay = startOfDay(from).getTime();
  const toDay = startOfDay(to).getTime();
  return Math.floor((toDay - fromDay) / MS_PER_DAY);
}

function isStagePending(stage?: ProductionStage | null): boolean {
  return !!stage && stage.status === 'pending';
}

function isStageActive(stage?: ProductionStage | null): boolean {
  return !!stage && stage.status === 'active';
}

function isStageCompleted(stage?: ProductionStage | null): boolean {
  return !!stage && stage.status === 'completed';
}

function isStageSkipped(stage?: ProductionStage | null): boolean {
  return !!stage && stage.status === 'skipped';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function getMeasurementSource(order: Order): SnapshotWithProfileMeta | null {
  if (isRecord(order.measurementSnapshot)) {
    return order.measurementSnapshot as SnapshotWithProfileMeta;
  }

  if (isRecord(order.garmentMeasurements)) {
    return order.garmentMeasurements as SnapshotWithProfileMeta;
  }

  return null;
}

function hasNumericMeasurement(
  source: SnapshotWithProfileMeta | null,
  keys: string[]
): boolean {
  if (!source) return false;

  return keys.some((key) => {
    const value = source[key];
    return typeof value === 'number' && !Number.isNaN(value);
  });
}

function _hasTextMeasurement(
  source: SnapshotWithProfileMeta | null,
  keys: string[]
): boolean {
  if (!source) return false;

  return keys.some((key) => {
    const value = source[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function getMeasurementProfileType(order: Order): MeasurementProfileType {
  const source = getMeasurementSource(order);
  const snapshotProfileType = source?.profileType;

  if (snapshotProfileType) return snapshotProfileType;

  switch (order.garmentType) {
    case 'shirt':
    case 'senator':
      return 'shirt';
    case 'dress':
    case 'gown':
    case 'kaftan':
    case 'agbada':
      return 'dress_kaba';
    case 'skirt':
      return 'skirt';
    case 'trouser':
      return 'trouser';
    case 'blouse':
      return 'blouse';
    default:
      return 'custom';
  }
}

function getMissingRequiredMeasurements(order: Order): string[] {
  const source = getMeasurementSource(order);
  const profileType = getMeasurementProfileType(order);
  const requiredFields = PROFILE_REQUIRED_FIELDS[profileType];

  if (!source || requiredFields.length === 0) return [];

  return requiredFields.filter((field) => {
    switch (field) {
      case 'sleeveLength':
        return !hasNumericMeasurement(source, ['sleeveLength', 'sleeve']);
      case 'aroundWrist':
        return !hasNumericMeasurement(source, ['aroundWrist', 'wrist']);
      case 'shirtLength':
        return !hasNumericMeasurement(source, ['shirtLength', 'backLength']);
      case 'nippleToNipple':
        return !hasNumericMeasurement(source, ['nippleToNipple', 'bustSpan']);
      case 'aroundAnkle':
        return !hasNumericMeasurement(source, ['aroundAnkle', 'ankle']);
      default:
        return !hasNumericMeasurement(source, [field]);
    }
  });
}

function hasMeasurements(order: Order): boolean {
  const source = getMeasurementSource(order);
  if (!source) return false;

  const hasAnyMeasurement = Object.entries(source).some(([key, value]) => {
    if (SNAPSHOT_META_KEYS.has(key)) return false;
    return value !== undefined && value !== null && value !== '';
  });

  if (!hasAnyMeasurement) return false;

  return getMissingRequiredMeasurements(order).length === 0;
}

function hasInspiration(order: Order): boolean {
  return !!order.designInspirationId || !!order.inspirationAnalysis;
}

function hasFabric(order: Order): boolean {
  return !!order.selectedFabricId;
}

function hasProductionPlan(order: Order): boolean {
  return !!order.productionPlan;
}

function getStage(order: Order, code: ProductionStageCode): ProductionStage | undefined {
  return order.productionStages?.find((stage) => stage.code === code);
}

function getCurrentProductionStage(order: Order): ProductionStage | null {
  const stages = order.productionStages || [];
  return (
    stages.find((stage) => stage.status === 'active') ||
    stages.find((stage) => stage.status === 'pending') ||
    null
  );
}

function isOrderClosed(order: Order): boolean {
  return order.status === 'delivered' || order.status === 'cancelled';
}

export function checkOrderCompleteness(order: Order): OrderCompletenessCheck {
  const missing: OrderCompletenessCheck['missing'] = [];
  const alerts: OrderAlert[] = [];
  const missingRequiredMeasurements = getMissingRequiredMeasurements(order);
  const measurementSource = getMeasurementSource(order);

  if (!hasMeasurements(order)) {
    missing.push('measurements');

    const measurementMessage =
      measurementSource && missingRequiredMeasurements.length > 0
        ? `This order is missing required measurements for ${getMeasurementProfileType(order)
            .split('_')
            .join(' ')}: ${missingRequiredMeasurements.join(', ')}.`
        : 'This order does not have a usable measurement snapshot yet.';

    alerts.push({
      code: 'missing_measurements',
      category: 'completeness',
      severity: 'critical',
      title: 'Measurements missing',
      message: measurementMessage,
    });
  }

  if (!hasInspiration(order)) {
    missing.push('inspiration');
    alerts.push({
      code: 'missing_inspiration',
      category: 'completeness',
      severity: 'warning',
      title: 'Inspiration missing',
      message: 'No inspiration or inspiration analysis is linked to this order.',
    });
  }

  if (!hasFabric(order)) {
    missing.push('fabric');
    alerts.push({
      code: 'missing_fabric',
      category: 'completeness',
      severity: 'warning',
      title: 'Fabric not selected',
      message: 'No fabric has been linked to this order yet.',
    });
  }

  if (!hasProductionPlan(order)) {
    missing.push('production_plan');
    alerts.push({
      code: 'missing_production_plan',
      category: 'completeness',
      severity: 'critical',
      title: 'Production plan missing',
      message: 'This order does not yet have a generated production plan.',
    });
  }

  const isBlocked = missing.includes('measurements') || missing.includes('production_plan');

  if (isBlocked) {
    alerts.push({
      code: 'blocked_order',
      category: 'completeness',
      severity: 'critical',
      title: 'Order is blocked',
      message:
        'Critical production data is missing, so this order may not move safely through workflow.',
    });
  }

  return {
    isComplete: missing.length === 0,
    isBlocked,
    missing,
    alerts,
  };
}

export function checkOverdueStages(
  order: Order,
  nowInput?: Date | string
): StageOverdueAlert[] {
  if (isOrderClosed(order)) return [];

  const now = toDate(nowInput || new Date()) || new Date();
  const stages = order.productionStages || [];

  return stages
    .filter((stage) => isStageActive(stage) || isStagePending(stage))
    .map((stage): StageOverdueAlert | null => {
      const durationDays = DEFAULT_STAGE_DURATION_DAYS[stage.code] || 1;
      const startedAt = toDate(stage.startedAt);
      const dueDate = toDate(order.dueDate);

      let expectedBy: Date | null = null;

      if (startedAt) {
        expectedBy = new Date(startOfDay(startedAt).getTime() + durationDays * MS_PER_DAY);
      } else if (dueDate) {
        expectedBy = dueDate;
      }

      if (!expectedBy) return null;

      const daysOverdue = diffInDays(expectedBy, now);
      if (daysOverdue <= 0) return null;

      return {
        stageCode: stage.code,
        stageLabel: stage.label,
        startedAt,
        expectedBy,
        expectedDurationDays: durationDays,
        daysOverdue,
      } satisfies StageOverdueAlert;
    })
    .filter((item): item is StageOverdueAlert => item !== null);
}

export function getOrderAlerts(order: Order, nowInput?: Date | string): OrderAlertSummary {
  const now = toDate(nowInput || new Date()) || new Date();
  const completeness = checkOrderCompleteness(order);
  const overdueStages = checkOverdueStages(order, now);
  const alerts: OrderAlert[] = [...completeness.alerts];

  overdueStages.forEach((stage) => {
    alerts.push({
      code: 'overdue_stage',
      category: 'production',
      severity: stage.daysOverdue >= 2 ? 'critical' : 'warning',
      title: `${stage.stageLabel} overdue`,
      message: `${stage.stageLabel} is overdue by ${stage.daysOverdue} day${
        stage.daysOverdue === 1 ? '' : 's'
      }.`,
      stageCode: stage.stageCode,
      dueDate: stage.expectedBy,
    });
  });

  const orderDueDate = toDate(order.dueDate);
  if (
    orderDueDate &&
    !isOrderClosed(order) &&
    startOfDay(orderDueDate).getTime() < startOfDay(now).getTime()
  ) {
    alerts.push({
      code: 'overdue_order',
      category: 'production',
      severity: 'critical',
      title: 'Order overdue',
      message: 'The delivery due date has passed and the order is not yet delivered.',
      dueDate: orderDueDate,
    });
  }

  const fittingDueDate = toDate(order.fittingDueDate);
  const firstFittingStage = getStage(order, 'first_fitting');
  const secondFittingStage = getStage(order, 'second_fitting');
  const fittingPending =
    !firstFittingStage ||
    !isStageCompleted(firstFittingStage) ||
    (!!secondFittingStage &&
      !isStageCompleted(secondFittingStage) &&
      !isStageSkipped(secondFittingStage));

  if (
    fittingDueDate &&
    fittingPending &&
    !isOrderClosed(order) &&
    diffInDays(now, fittingDueDate) <= 1 &&
    diffInDays(now, fittingDueDate) >= 0
  ) {
    alerts.push({
      code: 'fitting_due',
      category: 'production',
      severity: diffInDays(now, fittingDueDate) === 0 ? 'warning' : 'info',
      title: 'Fitting due',
      message:
        diffInDays(now, fittingDueDate) === 0
          ? 'A fitting is due today for this order.'
          : 'A fitting is due tomorrow for this order.',
      dueDate: fittingDueDate,
    });
  }

  const readyStage = getStage(order, 'ready');
  const deliveredStage = getStage(order, 'delivered');
  const currentStage = getCurrentProductionStage(order);

  if (
    !isOrderClosed(order) &&
    (order.status === 'ready' || isStageCompleted(readyStage)) &&
    !isStageCompleted(deliveredStage)
  ) {
    alerts.push({
      code: 'ready_for_delivery',
      category: 'delivery',
      severity: 'info',
      title: 'Ready for delivery',
      message:
        'This order appears ready and should be prepared for customer pickup or delivery.',
      stageCode: currentStage?.code,
    });
  }

  return {
    alerts,
    isBlocked: completeness.isBlocked,
    hasOverdueStages: overdueStages.length > 0,
    hasFittingReminder: alerts.some((alert) => alert.code === 'fitting_due'),
    hasReadyForDeliveryReminder: alerts.some(
      (alert) => alert.code === 'ready_for_delivery'
    ),
    overdueStages,
  };
}

export function getHighestOrderAlertSeverity(
  alerts: OrderAlert[]
): 'none' | 'info' | 'warning' | 'critical' {
  if (alerts.some((alert) => alert.severity === 'critical')) return 'critical';
  if (alerts.some((alert) => alert.severity === 'warning')) return 'warning';
  if (alerts.some((alert) => alert.severity === 'info')) return 'info';
  return 'none';
}

export function hasOrderIssues(order: Order, nowInput?: Date | string): boolean {
  const summary = getOrderAlerts(order, nowInput);
  return summary.alerts.length > 0;
}
