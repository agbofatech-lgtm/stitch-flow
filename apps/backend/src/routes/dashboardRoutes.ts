import { Router } from 'express';
import { query } from '../config/db';

type CountRow = {
  count: string;
};

type RevenueRow = {
  total_revenue: string | null;
};

type OrderValueRow = {
  total_order_value: string | null;
};

type BalanceRow = {
  pending_balances: string | null;
};

type PaymentAnalyticsRow = {
  day: string;
  total: string | null;
};

export const dashboardRoutes = Router();

dashboardRoutes.get('/summary', async (req, res) => {
  const ws = req.workspaceId;
  try {
    const [
      customersResult,
      ordersResult,
      pendingOrdersResult,
      revenueResult,
      orderValueResult,
      balancesResult,
      dueAlertsResult,
    ] = await Promise.all([
      query<CountRow>(
        `SELECT COUNT(*)::text AS count FROM customers WHERE workspace_id = $1 AND deleted_at IS NULL`,
        [ws]
      ),
      query<CountRow>(
        `SELECT COUNT(*)::text AS count FROM orders WHERE workspace_id = $1 AND deleted_at IS NULL`,
        [ws]
      ),
      query<CountRow>(
        `
        SELECT COUNT(*)::text AS count
        FROM orders
        WHERE workspace_id = $1 AND deleted_at IS NULL
          AND status IN ('draft', 'in_progress', 'ready')
        `,
        [ws]
      ),
      // F-1 fix: "revenue" is Collected Revenue = captured payments (event time),
      // NEVER order value. Order Value is returned separately below.
      query<RevenueRow>(
        `
        SELECT COALESCE(SUM(amount), 0)::text AS total_revenue
        FROM payments
        WHERE workspace_id = $1
          AND payment_status = 'captured'
        `,
        [ws]
      ),
      query<OrderValueRow>(
        `
        SELECT COALESCE(SUM(total_amount), 0)::text AS total_order_value
        FROM orders
        WHERE workspace_id = $1 AND deleted_at IS NULL
          AND status != 'cancelled'
        `,
        [ws]
      ),
      query<BalanceRow>(
        `
        SELECT COALESCE(SUM(balance_due), 0)::text AS pending_balances
        FROM invoices
        WHERE workspace_id = $1 AND deleted_at IS NULL
          AND status IN ('pending', 'partial', 'overdue')
        `,
        [ws]
      ),
      query<CountRow>(
        `
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT id
          FROM orders
          WHERE workspace_id = $1 AND deleted_at IS NULL
            AND due_date IS NOT NULL
            AND due_date <= NOW()
            AND status NOT IN ('delivered', 'cancelled')

          UNION ALL

          SELECT id
          FROM invoices
          WHERE workspace_id = $1 AND deleted_at IS NULL
            AND due_date IS NOT NULL
            AND due_date <= NOW()
            AND status IN ('pending', 'partial', 'overdue')
        ) AS due_items
        `,
        [ws]
      ),
    ]);

    res.json({
      totalCustomers: Number(customersResult.rows[0]?.count || 0),
      totalOrders: Number(ordersResult.rows[0]?.count || 0),
      pendingOrders: Number(pendingOrdersResult.rows[0]?.count || 0),
      totalRevenue: Number(revenueResult.rows[0]?.total_revenue || 0),
      totalOrderValue: Number(orderValueResult.rows[0]?.total_order_value || 0),
      pendingBalances: Number(balancesResult.rows[0]?.pending_balances || 0),
      dueAlerts: Number(dueAlertsResult.rows[0]?.count || 0),
      currency: 'GHS',
    });
  } catch (error) {
    console.error('Failed to load dashboard summary:', error);
    res.status(500).json({ message: 'Failed to load dashboard summary' });
  }
});

dashboardRoutes.get('/payments-analytics', async (req, res) => {
  const ws = req.workspaceId;
  try {
    const thisWeekResult = await query<PaymentAnalyticsRow>(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('day', paid_at), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(amount), 0)::text AS total
      FROM payments
      WHERE workspace_id = $1
        AND payment_status = 'captured'
        AND paid_at >= DATE_TRUNC('day', NOW()) - INTERVAL '6 days'
      GROUP BY DATE_TRUNC('day', paid_at)
      ORDER BY DATE_TRUNC('day', paid_at) ASC
      `,
      [ws]
    );

    const previousWeekResult = await query<RevenueRow>(
      `
      SELECT COALESCE(SUM(amount), 0)::text AS total_revenue
      FROM payments
      WHERE workspace_id = $1
        AND payment_status = 'captured'
        AND paid_at >= DATE_TRUNC('day', NOW()) - INTERVAL '13 days'
        AND paid_at < DATE_TRUNC('day', NOW()) - INTERVAL '6 days'
      `,
      [ws]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rowsByDay = new Map(
      thisWeekResult.rows.map((row) => [row.day, Number(row.total || 0)])
    );

    const bars = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - 6 + index);

      const iso = day.toISOString().slice(0, 10);
      const value = rowsByDay.get(iso) || 0;

      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value,
      };
    });

    const thisWeekTotal = bars.reduce((sum, bar) => sum + bar.value, 0);
    const previousWeekTotal = Number(previousWeekResult.rows[0]?.total_revenue || 0);

    const trendPercent =
      previousWeekTotal > 0
        ? ((thisWeekTotal - previousWeekTotal) / previousWeekTotal) * 100
        : thisWeekTotal > 0
        ? 100
        : 0;

    res.json({
      bars,
      thisWeekTotal,
      previousWeekTotal,
      trendPercent,
      hasRevenue: thisWeekTotal > 0 || previousWeekTotal > 0,
    });
  } catch (error) {
    console.error('Failed to load payments analytics:', error);
    res.status(500).json({ message: 'Failed to load payments analytics' });
  }
});

