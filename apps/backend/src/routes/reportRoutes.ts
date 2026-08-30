import { Router } from 'express';
import { query } from '../config/db';
import { entitlementService } from '../services/entitlementService';
import { ApiError } from '../utils/apiError';

/**
 * Phase 18.5 (AD2) — the competing "/reports/*" analytics plane was retired.
 *
 * The former /summary, /order-status, /monthly-revenue and /overdue-orders
 * endpoints had ZERO consumers (forensics F-3): no view imported them and no
 * test exercised them. They duplicated business truth that now lives in the
 * canonical projection layer (client) and /dashboard/* (server-authoritative
 * cross-check). Keeping them would preserve a dead, drift-prone plane, so they
 * are removed rather than left to rot.
 *
 * The single surviving route is the entitlement-gated premium report below,
 * which IS covered by commercial.test.ts (Phase 5 feature-gate behaviour) and
 * therefore is not orphaned.
 */

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const reportRoutes = Router();

reportRoutes.get('/low-stock-materials', async (req, res, next) => {
  try {
    // Phase 5: premium report — server-authoritative feature gate
    // (STUDIO: lowStockAlerts). Throws FEATURE_NOT_AVAILABLE otherwise.
    await entitlementService.requireFeature(req.workspaceId!, 'lowStockAlerts');

    const result = await query(`
      SELECT
        id,
        workspace_id AS "workspaceId",
        name,
        fabric_type AS "fabricType",
        color,
        unit,
        quantity_in_stock AS "quantityInStock",
        reorder_level AS "reorderLevel",
        cost_per_unit AS "costPerUnit",
        supplier_name AS "supplierName",
        supplier_contact AS "supplierContact",
        notes,
        image_url AS "imageUrl",
        metadata,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM fabric_records
      WHERE workspace_id = $1 AND deleted_at IS NULL
        AND is_active IS DISTINCT FROM FALSE
        AND reorder_level IS NOT NULL
        AND quantity_in_stock <= reorder_level
      ORDER BY quantity_in_stock ASC, name ASC
    `, [req.workspaceId]);

    return res.json(
      result.rows.map((row: any) => ({
        ...row,
        quantityInStock: toNumber(row.quantityInStock),
        reorderLevel: toNumber(row.reorderLevel),
        costPerUnit:
          row.costPerUnit === null || row.costPerUnit === undefined
            ? null
            : toNumber(row.costPerUnit),
      }))
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error(error);
    return res.status(500).json({ message: 'Failed to load low stock materials report' });
  }
});

export { reportRoutes };
