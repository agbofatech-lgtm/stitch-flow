import { Router } from 'express';
import { query, pool } from '../config/db';
import { recordSyncChange, recordSyncChangeTx } from '../services/syncChangeLog';

type FabricRow = {
  id: string;
  workspace_id: string | null;
  name: string;
  fabric_type: string;
  color: string | null;
  unit: string;
  quantity_in_stock: string | number;
  reorder_level: string | number | null;
  cost_per_unit: string | number | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  notes: string | null;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type MaterialUsageRow = {
  id: string;
  order_id: string;
  fabric_record_id: string;
  quantity_used: string | number;
  unit: string;
  notes: string | null;
  created_at: string;
};

const materialRoutes = Router();

function mapFabricRow(row: FabricRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    fabricType: row.fabric_type,
    color: row.color,
    unit: row.unit,
    quantityInStock: Number(row.quantity_in_stock || 0),
    reorderLevel:
      row.reorder_level === null || row.reorder_level === undefined
        ? null
        : Number(row.reorder_level),
    costPerUnit:
      row.cost_per_unit === null || row.cost_per_unit === undefined
        ? null
        : Number(row.cost_per_unit),
    supplierName: row.supplier_name,
    supplierContact: row.supplier_contact,
    notes: row.notes,
    imageUrl: row.image_url,
    metadata: row.metadata,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMaterialUsageRow(row: MaterialUsageRow) {
  return {
    id: row.id,
    orderId: row.order_id,
    fabricRecordId: row.fabric_record_id,
    quantityUsed: Number(row.quantity_used || 0),
    unit: row.unit,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

materialRoutes.get('/fabrics', async (req, res) => {
  try {
    const result = await query<FabricRow>(
      `
      SELECT
        id,
        workspace_id,
        name,
        fabric_type,
        color,
        unit,
        quantity_in_stock,
        reorder_level,
        cost_per_unit,
        supplier_name,
        supplier_contact,
        notes,
        image_url,
        metadata,
        is_active,
        created_at,
        updated_at
      FROM fabric_records
      WHERE workspace_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [req.workspaceId]
    );

    return res.json(result.rows.map(mapFabricRow));
  } catch (error) {
    console.error('Failed to fetch fabrics:', error);
    return res.status(500).json({
      message: 'Failed to fetch fabrics',
    });
  }
});

materialRoutes.get('/fabrics/low-stock', async (req, res) => {
  try {
    const result = await query<FabricRow>(
      `
      SELECT
        id,
        workspace_id,
        name,
        fabric_type,
        color,
        unit,
        quantity_in_stock,
        reorder_level,
        cost_per_unit,
        supplier_name,
        supplier_contact,
        notes,
        image_url,
        metadata,
        is_active,
        created_at,
        updated_at
      FROM fabric_records
      WHERE workspace_id = $1
        AND deleted_at IS NULL
        AND is_active = TRUE
        AND reorder_level IS NOT NULL
        AND quantity_in_stock <= reorder_level
      ORDER BY updated_at DESC
      `,
      [req.workspaceId]
    );

    return res.json(result.rows.map(mapFabricRow));
  } catch (error) {
    console.error('Failed to fetch low stock fabrics:', error);
    return res.status(500).json({
      message: 'Failed to fetch low stock fabrics',
    });
  }
});

materialRoutes.post('/fabrics', async (req, res) => {
  try {
    const {
      workspaceId = null,
      name,
      fabricType,
      color = null,
      unit,
      quantityInStock = 0,
      reorderLevel = null,
      costPerUnit = null,
      supplierName = null,
      supplierContact = null,
      notes = null,
      imageUrl = null,
      metadata = null,
      isActive = true,
    } = req.body ?? {};

    if (!name || !fabricType || !unit) {
      return res.status(400).json({
        message: 'name, fabricType, and unit are required',
      });
    }

    const id = Date.now().toString();

    const result = await query<FabricRow>(
      `
      INSERT INTO fabric_records (
        id,
        workspace_id,
        name,
        fabric_type,
        color,
        unit,
        quantity_in_stock,
        reorder_level,
        cost_per_unit,
        supplier_name,
        supplier_contact,
        notes,
        image_url,
        metadata,
        is_active
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING
        id,
        workspace_id,
        name,
        fabric_type,
        color,
        unit,
        quantity_in_stock,
        reorder_level,
        cost_per_unit,
        supplier_name,
        supplier_contact,
        notes,
        image_url,
        metadata,
        is_active,
        created_at,
        updated_at
      `,
      [
        id,
        req.workspaceId, // server-authoritative tenant, never trusted from the body
        name,
        fabricType,
        color,
        unit,
        quantityInStock,
        reorderLevel,
        costPerUnit,
        supplierName,
        supplierContact,
        notes,
        imageUrl,
        metadata,
        isActive,
      ]
    );

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'fabric_records',
      entityId: id,
      operation: 'insert',
      payload: mapFabricRow(result.rows[0]) as unknown as Record<string, unknown>,
    });

    return res.status(201).json(mapFabricRow(result.rows[0]));
  } catch (error) {
    console.error('Failed to create fabric record:', error);
    return res.status(500).json({
      message: 'Failed to create fabric record',
    });
  }
});

materialRoutes.put('/fabrics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      workspaceId = null,
      name,
      fabricType,
      color = null,
      unit,
      quantityInStock = 0,
      reorderLevel = null,
      costPerUnit = null,
      supplierName = null,
      supplierContact = null,
      notes = null,
      imageUrl = null,
      metadata = null,
      isActive = true,
    } = req.body ?? {};

    if (!name || !fabricType || !unit) {
      return res.status(400).json({
        message: 'name, fabricType, and unit are required',
      });
    }

    const result = await query<FabricRow>(
      `
      UPDATE fabric_records
      SET
        workspace_id = $2,
        -- (workspace stays the authenticated tenant; see params below)
        name = $3,
        fabric_type = $4,
        color = $5,
        unit = $6,
        quantity_in_stock = $7,
        reorder_level = $8,
        cost_per_unit = $9,
        supplier_name = $10,
        supplier_contact = $11,
        notes = $12,
        image_url = $13,
        metadata = $14,
        is_active = $15,
        updated_at = NOW()
      WHERE id = $1 AND workspace_id = $16 AND deleted_at IS NULL
      RETURNING
        id,
        workspace_id,
        name,
        fabric_type,
        color,
        unit,
        quantity_in_stock,
        reorder_level,
        cost_per_unit,
        supplier_name,
        supplier_contact,
        notes,
        image_url,
        metadata,
        is_active,
        created_at,
        updated_at
      `,
      [
        id,
        req.workspaceId,
        name,
        fabricType,
        color,
        unit,
        quantityInStock,
        reorderLevel,
        costPerUnit,
        supplierName,
        supplierContact,
        notes,
        imageUrl,
        metadata,
        isActive,
        req.workspaceId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Fabric record not found',
      });
    }

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'fabric_records',
      entityId: id,
      operation: 'update',
      payload: mapFabricRow(result.rows[0]) as unknown as Record<string, unknown>,
    });

    return res.json(mapFabricRow(result.rows[0]));
  } catch (error) {
    console.error('Failed to update fabric record:', error);
    return res.status(500).json({
      message: 'Failed to update fabric record',
    });
  }
});

materialRoutes.delete('/fabrics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete: other devices need the tombstone to converge.
    const result = await query(
      `
      UPDATE fabric_records
      SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
      RETURNING id
      `,
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Fabric record not found',
      });
    }

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'fabric_records',
      entityId: id,
      operation: 'delete',
      payload: { id, deletedAt: new Date().toISOString() },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete fabric record:', error);
    return res.status(500).json({
      message: 'Failed to delete fabric record',
    });
  }
});

materialRoutes.post('/usages', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      orderId,
      fabricRecordId,
      quantityUsed,
      unit,
      notes = null,
      clientMutationId = null,
    } = req.body ?? {};

    if (!orderId || !fabricRecordId || !quantityUsed || !unit) {
      client.release();
      return res.status(400).json({
        message: 'orderId, fabricRecordId, quantityUsed, and unit are required',
      });
    }

    await client.query('BEGIN');

    // Idempotency: replayed usage mutations do not deduct stock twice.
    if (clientMutationId) {
      const existing = await client.query<MaterialUsageRow>(
        `SELECT id, order_id, fabric_record_id, quantity_used, unit, notes, created_at
         FROM order_material_usages WHERE client_mutation_id = $1`,
        [clientMutationId]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res
          .status(200)
          .json({ ...mapMaterialUsageRow(existing.rows[0]), duplicate: true });
      }
    }

    // The order anchors the usage to a workspace.
    const orderCheck = await client.query(
      `SELECT id FROM orders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [orderId, req.workspaceId]
    );
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Order not found' });
    }

    const fabricResult = await client.query<FabricRow>(
      `
      SELECT
        id,
        workspace_id,
        name,
        fabric_type,
        color,
        unit,
        quantity_in_stock,
        reorder_level,
        cost_per_unit,
        supplier_name,
        supplier_contact,
        notes,
        image_url,
        metadata,
        is_active,
        created_at,
        updated_at
      FROM fabric_records
      WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
      FOR UPDATE
      `,
      [fabricRecordId, req.workspaceId]
    );

    if (fabricResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({
        message: 'Fabric record not found',
      });
    }

    const fabric = fabricResult.rows[0];
    const currentStock = Number(fabric.quantity_in_stock || 0);
    const nextUsageQty = Number(quantityUsed);

    if (fabric.unit !== unit) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        message: `Unit mismatch. Material uses ${fabric.unit}`,
      });
    }

    if (Number.isNaN(nextUsageQty) || nextUsageQty <= 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({
        message: 'quantityUsed must be greater than 0',
      });
    }

    if (currentStock < nextUsageQty) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(409).json({
        message: 'Not enough stock available',
      });
    }

    const id = Date.now().toString();

    const usageResult = await client.query<MaterialUsageRow>(
      `
      INSERT INTO order_material_usages (
        id,
        order_id,
        fabric_record_id,
        quantity_used,
        unit,
        notes,
        client_mutation_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        order_id,
        fabric_record_id,
        quantity_used,
        unit,
        notes,
        created_at
      `,
      [id, orderId, fabricRecordId, nextUsageQty, unit, notes, clientMutationId]
    );

    // Deduction is guarded twice: the FOR UPDATE row lock above and the
    // fabric_records_stock_nonnegative CHECK constraint in the schema.
    await client.query(
      `
      UPDATE fabric_records
      SET
        quantity_in_stock = quantity_in_stock - $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [fabricRecordId, nextUsageQty]
    );

    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'order_material_usages',
      entityId: id,
      operation: 'insert',
      payload: mapMaterialUsageRow(usageResult.rows[0]) as unknown as Record<string, unknown>,
      clientMutationId,
    });
    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'fabric_records',
      entityId: fabricRecordId,
      operation: 'update',
      payload: { id: fabricRecordId, quantityInStock: currentStock - nextUsageQty },
    });

    await client.query('COMMIT');
    client.release();

    return res.status(201).json(mapMaterialUsageRow(usageResult.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Failed to create material usage:', error);
    return res.status(500).json({
      message: 'Failed to create material usage',
    });
  }
});

materialRoutes.get('/usages/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await query<MaterialUsageRow>(
      `
      SELECT
        u.id,
        u.order_id,
        u.fabric_record_id,
        u.quantity_used,
        u.unit,
        u.notes,
        u.created_at
      FROM order_material_usages u
      JOIN orders o ON o.id = u.order_id
      WHERE u.order_id = $1
        AND o.workspace_id = $2
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      `,
      [orderId, req.workspaceId]
    );

    return res.json(result.rows.map(mapMaterialUsageRow));
  } catch (error) {
    console.error('Failed to fetch material usages by order:', error);
    return res.status(500).json({
      message: 'Failed to fetch material usages for order',
    });
  }
});

materialRoutes.delete('/usages/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const usageResult = await client.query<MaterialUsageRow>(
      `
      UPDATE order_material_usages u
      SET deleted_at = NOW()
      FROM orders o
      WHERE u.id = $1
        AND o.id = u.order_id
        AND o.workspace_id = $2
        AND u.deleted_at IS NULL
      RETURNING
        u.id,
        u.order_id,
        u.fabric_record_id,
        u.quantity_used,
        u.unit,
        u.notes,
        u.created_at
      `,
      [id, req.workspaceId]
    );

    if (usageResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({
        message: 'Material usage not found',
      });
    }

    const usage = usageResult.rows[0];

    await client.query(
      `
      UPDATE fabric_records
      SET
        quantity_in_stock = quantity_in_stock + $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [usage.fabric_record_id, Number(usage.quantity_used || 0)]
    );

    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'order_material_usages',
      entityId: id,
      operation: 'delete',
      payload: { id, deletedAt: new Date().toISOString() },
    });

    await client.query('COMMIT');
    client.release();

    return res.json({
      success: true,
      deleted: mapMaterialUsageRow(usage),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Failed to delete material usage:', error);
    return res.status(500).json({
      message: 'Failed to delete material usage',
    });
  }
});

export { materialRoutes };