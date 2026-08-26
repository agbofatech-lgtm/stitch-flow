import { Router } from 'express';
import { query } from '../config/db';

type RevenueRow = {
  total_revenue: string | null;
  total_paid: string | null;
  total_pending: string | null;
  invoice_count: string | null;
  payment_count: string | null;
};

type OrderStatusRow = {
  status: string;
  count: string;
};

type OrderRevenueRow = {
  total_orders: string | null;
  delivered_orders: string | null;
  in_progress_orders: string | null;
  overdue_orders: string | null;
  total_order_value: string | null;
};

type CustomerRow = {
  total_customers: string | null;
};

type LowStockRow = {
  total_low_stock: string | null;
};

type MonthlyRevenueRow = {
  month: string;
  revenue: string | null;
};

const reportRoutes = Router();

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

reportRoutes.get('/summary', async (_req, res) => {
  try {
    const revenueResult = await query<RevenueRow>(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'captured' THEN amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'captured' THEN amount ELSE 0 END), 0) AS total_paid,
        COUNT(*)::text AS payment_count,
        '0'::text AS total_pending,
        '0'::text AS invoice_count
      FROM payments
    `);

    const invoiceResult = await query<RevenueRow>(`
      SELECT
        COALESCE(SUM(balance_due), 0) AS total_pending,
        COUNT(*)::text AS invoice_count,
        '0'::text AS total_revenue,
        '0'::text AS total_paid,
        '0'::text AS payment_count
      FROM invoices
      WHERE status IN ('sent', 'partial', 'overdue')
    `);

    const orderResult = await query<OrderRevenueRow>(`
      SELECT
        COUNT(*)::text AS total_orders,
        COALESCE(SUM(total_amount), 0) AS total_order_value,
        COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered_orders,
        COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress', 'ready'))::text AS in_progress_orders,
        COUNT(*) FILTER (
          WHERE due_date IS NOT NULL
            AND due_date < NOW()
            AND status NOT IN ('delivered', 'cancelled')
        )::text AS overdue_orders
      FROM orders
    `);

    const customerResult = await query<CustomerRow>(`
      SELECT COUNT(*)::text AS total_customers
      FROM customers
    `);

    const lowStockResult = await query<LowStockRow>(`
      SELECT COUNT(*)::text AS total_low_stock
      FROM fabric_records
      WHERE is_active IS DISTINCT FROM FALSE
        AND reorder_level IS NOT NULL
        AND quantity_in_stock <= reorder_level
    `);

    const payments = revenueResult.rows[0];
    const invoices = invoiceResult.rows[0];
    const orders = orderResult.rows[0];
    const customers = customerResult.rows[0];
    const lowStock = lowStockResult.rows[0];

    return res.json({
      totalRevenue: toNumber(payments?.total_revenue),
      totalPaid: toNumber(payments?.total_paid),
      pendingBalances: toNumber(invoices?.total_pending),
      invoiceCount: toNumber(invoices?.invoice_count),
      paymentCount: toNumber(payments?.payment_count),
      totalOrders: toNumber(orders?.total_orders),
      deliveredOrders: toNumber(orders?.delivered_orders),
      activeOrders: toNumber(orders?.in_progress_orders),
      overdueOrders: toNumber(orders?.overdue_orders),
      totalOrderValue: toNumber(orders?.total_order_value),
      totalCustomers: toNumber(customers?.total_customers),
      lowStockCount: toNumber(lowStock?.total_low_stock),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load report summary' });
  }
});

reportRoutes.get('/order-status', async (_req, res) => {
  try {
    const result = await query<OrderStatusRow>(`
      SELECT
        status,
        COUNT(*)::text AS count
      FROM orders
      GROUP BY status
      ORDER BY status ASC
    `);

    return res.json(
      result.rows.map((row) => ({
        status: row.status,
        count: toNumber(row.count),
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load order status report' });
  }
});

reportRoutes.get('/monthly-revenue', async (_req, res) => {
  try {
    const result = await query<MonthlyRevenueRow>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COALESCE(SUM(amount), 0) AS revenue
      FROM payments
      WHERE payment_status = 'captured'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    return res.json(
      result.rows.map((row) => ({
        month: row.month,
        revenue: toNumber(row.revenue),
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load monthly revenue report' });
  }
});

reportRoutes.get('/overdue-orders', async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        customer_id AS "customerId",
        order_number AS "orderNumber",
        status,
        order_type AS "orderType",
        garment_type AS "garmentType",
        due_date AS "dueDate",
        total_amount AS "totalAmount",
        currency,
        created_at AS "createdAt"
      FROM orders
      WHERE due_date IS NOT NULL
        AND due_date < NOW()
        AND status NOT IN ('delivered', 'cancelled')
      ORDER BY due_date ASC
    `);

    return res.json(
      result.rows.map((row: any) => ({
        id: row.id,
        customerId: row.customerId,
        orderNumber: row.orderNumber,
        status: row.status,
        orderType: row.orderType,
        garmentType: row.garmentType,
        dueDate: row.dueDate,
        totalAmount: toNumber(row.totalAmount),
        currency: row.currency || 'GHS',
        createdAt: row.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load overdue orders' });
  }
});

reportRoutes.get('/low-stock-materials', async (_req, res) => {
  try {
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
      WHERE is_active IS DISTINCT FROM FALSE
        AND reorder_level IS NOT NULL
        AND quantity_in_stock <= reorder_level
      ORDER BY quantity_in_stock ASC, name ASC
    `);

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
    console.error(error);
    return res.status(500).json({ message: 'Failed to load low stock materials report' });
  }
});

export { reportRoutes };