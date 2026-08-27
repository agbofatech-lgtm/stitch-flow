import { Router } from 'express';
import { query } from '../config/db';
import { recordSyncChange } from '../services/syncChangeLog';
import { auditLogService } from '../services/auditLogService';
import {
  getOrderProductionStages,
  saveOrderProductionStageNote,
  transitionOrderProductionStage,
  type ProductionStageCode,
  type StageAction,
} from '../services/productionStageService';

type JsonValue = Record<string, unknown> | Array<unknown> | null;

type OrderRow = {
  id: string;
  customer_id: string;
  assigned_to: string | null;
  order_number: string;
  status: string;
  order_type: string;
  garment_type: string | null;
  fit_type: string | null;
  due_date: string | null;
  notes: string;
  style_notes: string | null;
  subtotal: string | null;
  tax_total: string | null;
  discount_total: string | null;
  total_amount: string;
  currency: string;
  measurement_snapshot: JsonValue;
  garment_measurements: JsonValue;
  production_plan: JsonValue;
  production_stages: JsonValue;
  inspiration_analysis: JsonValue;
  selected_fabric_id: string | null;
  design_inspiration_id: string | null;
  selected_pattern_id: string | null;
  selected_measurement_profile_id: string | null;
  selected_measurement_profile_label: string | null;
  selected_measurement_profile_type: string | null;
  created_at: string;
};

type StudioSaveBody = {
  garmentType?: string | null;
  measurements?: Record<string, unknown> | null;
  garmentMeasurements?: Record<string, unknown> | null;
  measurementSnapshot?: Record<string, unknown> | null;
  productionPlan?: Record<string, unknown> | null;
  inspirationAnalysis?: Record<string, unknown> | null;
  designInspirationId?: string | null;
  selectedFabricId?: string | null;
  selectedPatternId?: string | null;
  selectedMeasurementProfileId?: string | null;
  selectedMeasurementProfileLabel?: string | null;
  selectedMeasurementProfileType?: string | null;
  status?: string | null;
};

const orderRoutes = Router();

function isProductionStageCode(value: string): value is ProductionStageCode {
  return [
    'measurement',
    'cutting',
    'sewing',
    'embroidery',
    'first_fitting',
    'second_fitting',
    'final_press',
    'ready',
    'delivered',
  ].includes(value);
}

function isStageAction(value: string): value is StageAction {
  return ['start', 'complete', 'skip', 'reopen'].includes(value);
}

function mapOrderRow(row: OrderRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    assignedTo: row.assigned_to,
    orderNumber: row.order_number,
    status: row.status,
    orderType: row.order_type,
    garmentType: row.garment_type,
    fitType: row.fit_type,
    dueDate: row.due_date,
    notes: row.notes,
    styleNotes: row.style_notes,
    subtotal: Number(row.subtotal || 0),
    taxTotal: Number(row.tax_total || 0),
    discountTotal: Number(row.discount_total || 0),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    measurementSnapshot: row.measurement_snapshot,
    garmentMeasurements: row.garment_measurements,
    productionPlan: row.production_plan,
    productionStages: row.production_stages,
    inspirationAnalysis: row.inspiration_analysis,
    selectedFabricId: row.selected_fabric_id,
    designInspirationId: row.design_inspiration_id,
    selectedPatternId: row.selected_pattern_id,
    selectedMeasurementProfileId: row.selected_measurement_profile_id,
    selectedMeasurementProfileLabel: row.selected_measurement_profile_label,
    selectedMeasurementProfileType: row.selected_measurement_profile_type,
    createdAt: row.created_at,
  };
}

function toNullableJson(value: unknown): JsonValue {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value as Array<unknown>;
  if (typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

orderRoutes.get('/', async (req, res) => {
  try {
    const result = await query<OrderRow>(
      `
      SELECT *
      FROM orders
      WHERE workspace_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `,
      [req.workspaceId]
    );

    res.json(result.rows.map(mapOrderRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

orderRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query<OrderRow>(
      `
      SELECT *
      FROM orders
      WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
      LIMIT 1
      `,
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(mapOrderRow(result.rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
});

async function orderBelongsToWorkspace(orderId: string, workspaceId: string) {
  const result = await query(
    `SELECT id FROM orders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
    [orderId, workspaceId]
  );
  return result.rows.length > 0;
}

orderRoutes.get('/:orderId/production-stages', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!(await orderBelongsToWorkspace(orderId, req.workspaceId!))) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const stages = await getOrderProductionStages(orderId);
    return res.json(stages);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : 'Failed to fetch production stages';
    return res.status(400).json({ message });
  }
});

orderRoutes.post('/:orderId/production-stages/:stageCode/transition', async (req, res) => {
  try {
    const { orderId, stageCode } = req.params;
    const { action, note } = req.body ?? {};

    if (!isProductionStageCode(stageCode)) {
      return res.status(400).json({ message: 'Invalid production stage code' });
    }

    if (!isStageAction(String(action || ''))) {
      return res.status(400).json({ message: 'Invalid production stage action' });
    }

    if (!(await orderBelongsToWorkspace(orderId, req.workspaceId!))) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const result = await transitionOrderProductionStage(
      orderId,
      stageCode,
      action,
      typeof note === 'string' ? note : undefined,
      null
    );

    return res.json(result);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : 'Failed to transition production stage';
    return res.status(400).json({ message });
  }
});

orderRoutes.post('/:orderId/production-stages/:stageCode/note', async (req, res) => {
  try {
    const { orderId, stageCode } = req.params;
    const { note } = req.body ?? {};

    if (!isProductionStageCode(stageCode)) {
      return res.status(400).json({ message: 'Invalid production stage code' });
    }

    if (!(await orderBelongsToWorkspace(orderId, req.workspaceId!))) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const productionStages = await saveOrderProductionStageNote(
      orderId,
      stageCode,
      typeof note === 'string' ? note : '',
      null
    );

    return res.json({ productionStages });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : 'Failed to save production stage note';
    return res.status(400).json({ message });
  }
});

orderRoutes.post('/', async (req, res) => {
  try {
    const {
      customerId,
      assignedTo = null,
      orderNumber,
      status = 'draft',
      orderType,
      garmentType = null,
      fitType = null,
      dueDate = null,
      notes = '',
      styleNotes = null,
      subtotal = 0,
      taxTotal = 0,
      discountTotal = 0,
      totalAmount = 0,
      currency = 'GHS',
      measurementSnapshot = null,
      garmentMeasurements = null,
      productionPlan = null,
      productionStages = null,
      inspirationAnalysis = null,
      selectedFabricId = null,
      designInspirationId = null,
      selectedPatternId = null,
      selectedMeasurementProfileId = null,
      selectedMeasurementProfileLabel = null,
      selectedMeasurementProfileType = null,
    } = req.body ?? {};

    if (!customerId || !orderNumber || !orderType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const customerCheck = await query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [customerId, req.workspaceId]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const id = Date.now().toString();

    const result = await query<OrderRow>(
      `
      INSERT INTO orders (
        id,
        workspace_id,
        customer_id,
        assigned_to,
        order_number,
        status,
        order_type,
        garment_type,
        fit_type,
        due_date,
        notes,
        style_notes,
        subtotal,
        tax_total,
        discount_total,
        total_amount,
        currency,
        measurement_snapshot,
        garment_measurements,
        production_plan,
        production_stages,
        inspiration_analysis,
        selected_fabric_id,
        design_inspiration_id,
        selected_pattern_id,
        selected_measurement_profile_id,
        selected_measurement_profile_label,
        selected_measurement_profile_type
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      )
      RETURNING *
      `,
      [
        id,
        req.workspaceId,
        customerId,
        assignedTo,
        orderNumber,
        status,
        orderType,
        garmentType,
        fitType,
        dueDate,
        notes,
        styleNotes,
        subtotal,
        taxTotal,
        discountTotal,
        totalAmount,
        currency,
        measurementSnapshot,
        garmentMeasurements,
        productionPlan,
        productionStages,
        inspirationAnalysis,
        selectedFabricId,
        designInspirationId,
        selectedPatternId,
        selectedMeasurementProfileId,
        selectedMeasurementProfileLabel,
        selectedMeasurementProfileType,
      ]
    );

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'orders',
      entityId: id,
      operation: 'insert',
      payload: mapOrderRow(result.rows[0]) as unknown as Record<string, unknown>,
    });

    // Phase 6: audit trail.
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'ORDER_CREATED',
      entityType: 'order',
      entityId: id,
      metadata: { orderNumber, orderType, totalAmount, currency },
    });

    res.status(201).json(mapOrderRow(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

orderRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      assignedTo = null,
      orderNumber,
      status = 'draft',
      orderType,
      garmentType = null,
      fitType = null,
      dueDate = null,
      notes = '',
      styleNotes = null,
      subtotal = 0,
      taxTotal = 0,
      discountTotal = 0,
      totalAmount = 0,
      currency = 'GHS',
      measurementSnapshot = null,
      garmentMeasurements = null,
      productionPlan = null,
      productionStages = null,
      inspirationAnalysis = null,
      selectedFabricId = null,
      designInspirationId = null,
      selectedPatternId = null,
      selectedMeasurementProfileId = null,
      selectedMeasurementProfileLabel = null,
      selectedMeasurementProfileType = null,
    } = req.body ?? {};

    if (!customerId || !orderNumber || !orderType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Phase 6: previous status captured so status transitions are audited
    // distinctly from ordinary updates (ORDER_STATUS_CHANGED).
    const previous = await query<{ status: string }>(
      `SELECT status FROM orders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [id, req.workspaceId]
    );

    const result = await query<OrderRow>(
      `
      UPDATE orders
      SET
        customer_id = $2,
        assigned_to = $3,
        order_number = $4,
        status = $5,
        order_type = $6,
        garment_type = $7,
        fit_type = $8,
        due_date = $9,
        notes = $10,
        style_notes = $11,
        subtotal = $12,
        tax_total = $13,
        discount_total = $14,
        total_amount = $15,
        currency = $16,
        measurement_snapshot = $17,
        garment_measurements = $18,
        production_plan = $19,
        production_stages = $20,
        inspiration_analysis = $21,
        selected_fabric_id = $22,
        design_inspiration_id = $23,
        selected_pattern_id = $24,
        selected_measurement_profile_id = $25,
        selected_measurement_profile_label = $26,
        selected_measurement_profile_type = $27
      WHERE id = $1 AND workspace_id = $28 AND deleted_at IS NULL
      RETURNING *
      `,
      [
        id,
        customerId,
        assignedTo,
        orderNumber,
        status,
        orderType,
        garmentType,
        fitType,
        dueDate,
        notes,
        styleNotes,
        subtotal,
        taxTotal,
        discountTotal,
        totalAmount,
        currency,
        measurementSnapshot,
        garmentMeasurements,
        productionPlan,
        productionStages,
        inspirationAnalysis,
        selectedFabricId,
        designInspirationId,
        selectedPatternId,
        selectedMeasurementProfileId,
        selectedMeasurementProfileLabel,
        selectedMeasurementProfileType,
        req.workspaceId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'orders',
      entityId: id,
      operation: 'update',
      payload: mapOrderRow(result.rows[0]) as unknown as Record<string, unknown>,
    });

    // Phase 6: audit trail — status transitions are first-class events.
    const statusChanged =
      previous.rows.length > 0 && previous.rows[0].status !== result.rows[0].status;
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: statusChanged ? 'ORDER_STATUS_CHANGED' : 'ORDER_UPDATED',
      entityType: 'order',
      entityId: id,
      metadata: statusChanged
        ? { from: previous.rows[0].status, to: result.rows[0].status }
        : { orderNumber },
    });

    res.json(mapOrderRow(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

orderRoutes.patch('/:id/studio-session', async (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as StudioSaveBody;

    const existingResult = await query<OrderRow>(
      `
      SELECT *
      FROM orders
      WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
      LIMIT 1
      `,
      [id, req.workspaceId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const existing = existingResult.rows[0];

    const nextGarmentMeasurements =
      toNullableJson(body.garmentMeasurements) ??
      toNullableJson(body.measurements) ??
      existing.garment_measurements;

    const nextMeasurementSnapshot =
      toNullableJson(body.measurementSnapshot) ??
      toNullableJson(body.measurements) ??
      existing.measurement_snapshot;

    const nextProductionPlan =
      toNullableJson(body.productionPlan) ?? existing.production_plan;

    const nextInspirationAnalysis =
      toNullableJson(body.inspirationAnalysis) ?? existing.inspiration_analysis;

    const result = await query<OrderRow>(
      `
      UPDATE orders
      SET
        garment_type = $2,
        garment_measurements = $3,
        measurement_snapshot = $4,
        production_plan = $5,
        inspiration_analysis = $6,
        design_inspiration_id = $7,
        selected_fabric_id = $8,
        selected_pattern_id = $9,
        selected_measurement_profile_id = $10,
        selected_measurement_profile_label = $11,
        selected_measurement_profile_type = $12,
        status = $13
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        body.garmentType ?? existing.garment_type,
        nextGarmentMeasurements,
        nextMeasurementSnapshot,
        nextProductionPlan,
        nextInspirationAnalysis,
        body.designInspirationId ?? existing.design_inspiration_id,
        body.selectedFabricId ?? existing.selected_fabric_id,
        body.selectedPatternId ?? existing.selected_pattern_id,
        body.selectedMeasurementProfileId ?? existing.selected_measurement_profile_id,
        body.selectedMeasurementProfileLabel ?? existing.selected_measurement_profile_label,
        body.selectedMeasurementProfileType ?? existing.selected_measurement_profile_type,
        body.status ?? existing.status,
      ]
    );

    return res.json(mapOrderRow(result.rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to save design studio session' });
  }
});

export { orderRoutes };