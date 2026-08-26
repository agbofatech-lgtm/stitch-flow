import { query } from '../config/db';

export type ProductionStageCode =
  | 'measurement'
  | 'cutting'
  | 'sewing'
  | 'embroidery'
  | 'first_fitting'
  | 'second_fitting'
  | 'final_press'
  | 'ready'
  | 'delivered';

export type ProductionStageStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'skipped';

export type StageAction =
  | 'start'
  | 'complete'
  | 'skip'
  | 'reopen';

export type OrderStatus =
  | 'draft'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type ProductionStageDto = {
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

const STAGE_TEMPLATES: Array<{
  code: ProductionStageCode;
  label: string;
  sequence: number;
}> = [
  { code: 'measurement', label: 'Measurement', sequence: 1 },
  { code: 'cutting', label: 'Cutting', sequence: 2 },
  { code: 'sewing', label: 'Sewing', sequence: 3 },
  { code: 'embroidery', label: 'Embroidery', sequence: 4 },
  { code: 'first_fitting', label: 'First Fitting', sequence: 5 },
  { code: 'second_fitting', label: 'Second Fitting', sequence: 6 },
  { code: 'final_press', label: 'Final Press', sequence: 7 },
  { code: 'ready', label: 'Ready', sequence: 8 },
  { code: 'delivered', label: 'Delivered', sequence: 9 },
];

type StageRow = {
  id: string;
  order_id: string;
  stage_code: ProductionStageCode;
  stage_label: string;
  sequence_no: number;
  status: ProductionStageStatus;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  reopened_at: string | null;
  notes: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

function mapStageRow(row: StageRow): ProductionStageDto {
  return {
    id: row.id,
    code: row.stage_code,
    label: row.stage_label,
    sequence: row.sequence_no,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    skippedAt: row.skipped_at,
    reopenedAt: row.reopened_at,
    notes: row.notes || '',
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildStagesFromOrderStatus(status: OrderStatus): Array<{
  code: ProductionStageCode;
  label: string;
  sequence: number;
  status: ProductionStageStatus;
}> {
  return STAGE_TEMPLATES.map((stage, index) => {
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
      if (stage.code === 'delivered') {
        return { ...stage, status: 'pending' };
      }
      return { ...stage, status: 'completed' };
    }

    if (status === 'delivered') {
      return { ...stage, status: 'completed' };
    }

    return { ...stage, status: 'pending' };
  });
}

function deriveOrderStatusFromStages(stages: StageRow[]): OrderStatus {
  const delivered = stages.find((stage) => stage.stage_code === 'delivered');
  const ready = stages.find((stage) => stage.stage_code === 'ready');

  const hasProgress = stages.some(
    (stage) =>
      stage.status === 'active' ||
      stage.status === 'completed' ||
      stage.status === 'skipped'
  );

  if (delivered?.status === 'completed') return 'delivered';
  if (ready?.status === 'completed') return 'ready';
  if (hasProgress) return 'in_progress';
  return 'draft';
}

function getCurrentOpenStageIndex(stages: StageRow[]) {
  return stages.findIndex(
    (stage) => stage.status !== 'completed' && stage.status !== 'skipped'
  );
}

async function getOrderStatus(orderId: string): Promise<OrderStatus> {
  const result = await query<{ status: OrderStatus }>(
    `
      SELECT status
      FROM orders
      WHERE id = $1
      LIMIT 1
    `,
    [orderId]
  );

  if (!result.rows.length) {
    throw new Error('Order not found');
  }

  return result.rows[0].status;
}

async function loadStages(orderId: string): Promise<StageRow[]> {
  const result = await query<StageRow>(
    `
      SELECT *
      FROM order_production_stages
      WHERE order_id = $1
      ORDER BY sequence_no ASC
    `,
    [orderId]
  );

  return result.rows;
}

async function recordEvent(params: {
  orderId: string;
  stageId: string;
  stageCode: ProductionStageCode;
  action: 'start' | 'complete' | 'skip' | 'reopen' | 'note';
  fromStatus: ProductionStageStatus | null;
  toStatus: ProductionStageStatus | null;
  note?: string | null;
  actorUserId?: string | null;
}) {
  await query(
    `
      INSERT INTO order_production_stage_events (
        order_id,
        stage_id,
        stage_code,
        action,
        from_status,
        to_status,
        note,
        actor_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      params.orderId,
      params.stageId,
      params.stageCode,
      params.action,
      params.fromStatus,
      params.toStatus,
      params.note || null,
      params.actorUserId || null,
    ]
  );
}

async function syncOrderStageSnapshot(orderId: string) {
  const stages = await loadStages(orderId);
  const orderStatus = deriveOrderStatusFromStages(stages);
  const productionStages = stages.map(mapStageRow);

  await query(
    `
      UPDATE orders
      SET
        status = $2,
        production_stages = $3
      WHERE id = $1
    `,
    [orderId, orderStatus, JSON.stringify(productionStages)]
  );

  return {
    orderStatus,
    productionStages,
  };
}

export async function ensureOrderProductionStages(orderId: string): Promise<void> {
  const existing = await loadStages(orderId);
  if (existing.length > 0) return;

  const orderStatus = await getOrderStatus(orderId);
  const seededStages = buildStagesFromOrderStatus(orderStatus);

  for (const stage of seededStages) {
    const now = new Date().toISOString();
    const status: ProductionStageStatus = stage.status;

    await query(
      `
        INSERT INTO order_production_stages (
          order_id,
          stage_code,
          stage_label,
          sequence_no,
          status,
          started_at,
          completed_at,
          skipped_at,
          reopened_at,
          notes,
          assigned_to,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13
        )
      `,
      [
        orderId,
        stage.code,
        stage.label,
        stage.sequence,
        status,
        status === 'active' ? now : null,
        status === 'completed' ? now : null,
        status === 'skipped' ? now : null,
        null,
        '',
        null,
        now,
        now,
      ]
    );
  }

  await syncOrderStageSnapshot(orderId);
}

export async function getOrderProductionStages(orderId: string): Promise<ProductionStageDto[]> {
  await ensureOrderProductionStages(orderId);
  const stages = await loadStages(orderId);
  return stages.map(mapStageRow);
}

export async function transitionOrderProductionStage(
  orderId: string,
  stageCode: ProductionStageCode,
  action: StageAction,
  note?: string,
  actorUserId?: string | null
): Promise<{ orderStatus: OrderStatus; productionStages: ProductionStageDto[] }> {
  await ensureOrderProductionStages(orderId);

  const stages = await loadStages(orderId);
  const targetIndex = stages.findIndex((stage) => stage.stage_code === stageCode);

  if (targetIndex === -1) {
    throw new Error('Production stage not found');
  }

  const target = stages[targetIndex];
  const currentOpenStageIndex = getCurrentOpenStageIndex(stages);
  const now = new Date().toISOString();

  if (action === 'start') {
    if (target.status !== 'pending' || targetIndex !== currentOpenStageIndex) {
      throw new Error('Only the current pending stage can be started');
    }

    await query(
      `
        UPDATE order_production_stages
        SET
          status = 'active',
          started_at = COALESCE(started_at, $2),
          skipped_at = NULL,
          updated_at = $2
        WHERE id = $1
      `,
      [target.id, now]
    );

    await recordEvent({
      orderId,
      stageId: target.id,
      stageCode,
      action,
      fromStatus: target.status,
      toStatus: 'active',
      note,
      actorUserId,
    });

    return syncOrderStageSnapshot(orderId);
  }

  if (action === 'complete') {
    if (target.status !== 'active') {
      throw new Error('Only an active stage can be completed');
    }

    await query(
      `
        UPDATE order_production_stages
        SET
          status = 'completed',
          started_at = COALESCE(started_at, $2),
          completed_at = $2,
          skipped_at = NULL,
          updated_at = $2
        WHERE id = $1
      `,
      [target.id, now]
    );

    const nextStage = stages[targetIndex + 1];
    if (nextStage && nextStage.status === 'pending') {
      await query(
        `
          UPDATE order_production_stages
          SET
            status = 'active',
            started_at = COALESCE(started_at, $2),
            updated_at = $2
          WHERE id = $1
        `,
        [nextStage.id, now]
      );
    }

    await recordEvent({
      orderId,
      stageId: target.id,
      stageCode,
      action,
      fromStatus: target.status,
      toStatus: 'completed',
      note,
      actorUserId,
    });

    return syncOrderStageSnapshot(orderId);
  }

  if (action === 'skip') {
    if (
      (target.status !== 'pending' && target.status !== 'active') ||
      targetIndex !== currentOpenStageIndex
    ) {
      throw new Error('Only the current open stage can be skipped');
    }

    await query(
      `
        UPDATE order_production_stages
        SET
          status = 'skipped',
          completed_at = NULL,
          skipped_at = $2,
          updated_at = $2
        WHERE id = $1
      `,
      [target.id, now]
    );

    const nextStage = stages[targetIndex + 1];
    if (nextStage && nextStage.status === 'pending') {
      await query(
        `
          UPDATE order_production_stages
          SET
            status = 'active',
            started_at = COALESCE(started_at, $2),
            updated_at = $2
          WHERE id = $1
        `,
        [nextStage.id, now]
      );
    }

    await recordEvent({
      orderId,
      stageId: target.id,
      stageCode,
      action,
      fromStatus: target.status,
      toStatus: 'skipped',
      note,
      actorUserId,
    });

    return syncOrderStageSnapshot(orderId);
  }

  if (action === 'reopen') {
    if (target.status !== 'completed' && target.status !== 'skipped') {
      throw new Error('Only completed or skipped stages can be reopened');
    }

    for (let i = targetIndex; i < stages.length; i += 1) {
      const stage = stages[i];

      await query(
        `
          UPDATE order_production_stages
          SET
            status = 'pending',
            started_at = NULL,
            completed_at = NULL,
            skipped_at = NULL,
            reopened_at = CASE WHEN id = $1 THEN $2 ELSE reopened_at END,
            updated_at = $2
          WHERE id = $3
        `,
        [target.id, now, stage.id]
      );
    }

    await recordEvent({
      orderId,
      stageId: target.id,
      stageCode,
      action,
      fromStatus: target.status,
      toStatus: 'pending',
      note,
      actorUserId,
    });

    return syncOrderStageSnapshot(orderId);
  }

  throw new Error('Unsupported stage action');
}

export async function saveOrderProductionStageNote(
  orderId: string,
  stageCode: ProductionStageCode,
  note: string,
  actorUserId?: string | null
): Promise<ProductionStageDto[]> {
  await ensureOrderProductionStages(orderId);

  const stages = await loadStages(orderId);
  const target = stages.find((stage) => stage.stage_code === stageCode);

  if (!target) {
    throw new Error('Production stage not found');
  }

  const now = new Date().toISOString();

  await query(
    `
      UPDATE order_production_stages
      SET
        notes = $2,
        updated_at = $3
      WHERE id = $1
    `,
    [target.id, note || '', now]
  );

  await recordEvent({
    orderId,
    stageId: target.id,
    stageCode,
    action: 'note',
    fromStatus: target.status,
    toStatus: target.status,
    note,
    actorUserId,
  });

  const updated = await loadStages(orderId);
  const productionStages = updated.map(mapStageRow);

  await query(
    `
      UPDATE orders
      SET production_stages = $2
      WHERE id = $1
    `,
    [orderId, JSON.stringify(productionStages)]
  );

  return productionStages;
}