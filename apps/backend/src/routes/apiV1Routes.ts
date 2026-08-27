import crypto from 'crypto';
import { Router } from 'express';
import { pool, query } from '../config/db';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { requireFeatureFlag } from '../middleware/requireFeatureFlag';
import { entitlementService } from '../services/entitlementService';
import { recordSyncChangeTx } from '../services/syncChangeLog';
import { auditLogService } from '../services/auditLogService';
import { timelineService } from '../services/timelineService';
import { usageService } from '../services/usageService';
import { ApiError } from '../utils/apiError';

/**
 * Phase 8 — versioned Developer API (§12/§13).
 * Auth = scoped API keys ONLY (JWT/portal tokens are rejected: they do not
 * match the sf_live_ shape). Every query is tenant-scoped to the key's
 * workspace; cross-tenant ids read as 404. Writes reuse the SAME business
 * rules as the first-party routes: plan entitlements, sync change log,
 * transactional audit, customer timeline.
 *
 * Express 4 discipline (as everywhere in this repo): every async handler
 * catches and responds — a rejected promise must never hang a request.
 */
export const apiV1Routes = Router();
apiV1Routes.use(requireFeatureFlag('DEVELOPER_API'));

/** Attribution user for machine writes: key creator, else workspace owner. */
async function resolveActorUser(keyId: string, workspaceId: string): Promise<string> {
  const key = await query(`SELECT created_by FROM api_keys WHERE id = $1`, [keyId]);
  if (key.rows[0]?.created_by) return key.rows[0].created_by as string;
  const owner = await query(
    `SELECT user_id FROM workspace_users WHERE workspace_id = $1 AND role = 'owner' LIMIT 1`,
    [workspaceId]
  );
  if (owner.rows[0]?.user_id) return owner.rows[0].user_id as string;
  throw new ApiError(500, 'INTERNAL', 'No attribution user available for developer-API write');
}

// ---------- Introspection ----------
apiV1Routes.get('/me', apiKeyAuth(), (req, res) => {
  const k = req.apiKey!;
  res.json({
    keyId: k.id,
    name: k.name,
    workspaceId: k.workspace_id,
    scopes: k.scopes,
    status: k.status,
    expiresAt: k.expires_at,
  });
});

// ---------- Customers ----------
apiV1Routes.get('/customers', apiKeyAuth('customers:read'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);
    const result = await query(
      `SELECT id, full_name, phone, email, address, created_at
       FROM customers
       WHERE workspace_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT $2`,
      [req.apiKey!.workspace_id, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('developer-api: list customers failed:', err);
    res.status(500).json({ message: 'Failed to list customers' });
  }
});

apiV1Routes.get('/customers/:id', apiKeyAuth('customers:read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, phone, email, address, notes, created_at
       FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.apiKey!.workspace_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ code: 'NOT_FOUND', message: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('developer-api: get customer failed:', err);
    res.status(500).json({ message: 'Failed to load customer' });
  }
});

apiV1Routes.post('/customers', apiKeyAuth('customers:write'), async (req, res, next) => {
  const ws = req.apiKey!.workspace_id;
  const fullName = String(req.body?.fullName ?? '').trim();
  const phone = String(req.body?.phone ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const address = String(req.body?.address ?? '').trim();
  const notes = String(req.body?.notes ?? '').trim();
  if (!fullName) return res.status(400).json({ message: 'fullName is required' });
  if (!phone) return res.status(400).json({ message: 'phone is required' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'email must be valid when provided' });
  }

  const client = await pool.connect();
  try {
    // sync_changes.user_id is NOT NULL FK -> users. Machine writes are
    // attributed to the key's creator (auditable chain: key -> staff
    // author), falling back to the workspace owner.
    const actor = await resolveActorUser(req.apiKey!.id, ws);

    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    await client.query('BEGIN');
    // Same server-authoritative plan limit as the first-party route.
    await entitlementService.enforceCustomerLimit(client, ws);
    const result = await client.query(
      `INSERT INTO customers (id, workspace_id, full_name, phone, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, full_name, phone, email, address, notes, created_at`,
      [id, ws, fullName, phone, email, address, notes]
    );
    const row = result.rows[0];
    await recordSyncChangeTx(client, {
      workspaceId: ws,
      userId: actor,
      entity: 'customers',
      entityId: row.id,
      operation: 'insert',
      payload: { id: row.id, fullName, phone, email, address, notes },
    });
    await auditLogService.logTx(client, {
      userId: actor,
      workspaceId: ws,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: row.id,
      metadata: { source: 'developer_api', apiKeyId: req.apiKey!.id, keyPrefix: req.apiKey!.key_prefix },
    });
    await client.query('COMMIT');
    void timelineService.record({
      workspaceId: ws,
      customerId: row.id,
      eventType: 'CUSTOMER_CREATED',
      actorUserId: actor,
      entityType: 'customer',
      entityId: row.id,
      metadata: { source: 'developer_api' },
    }).catch(() => undefined);
    return res.status(201).json({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (error instanceof ApiError) return next(error); // e.g. CUSTOMER_LIMIT_REACHED
    console.error('developer-api: failed to create customer:', error);
    return res.status(500).json({ message: 'Failed to create customer' });
  } finally {
    client.release();
  }
});

// ---------- Orders (measurement data gated separately) ----------
apiV1Routes.get('/orders', apiKeyAuth('orders:read'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);
    const result = await query(
      `SELECT id, order_number, customer_id, status, total_amount, currency, due_date, created_at
       FROM orders
       WHERE workspace_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT $2`,
      [req.apiKey!.workspace_id, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('developer-api: list orders failed:', err);
    res.status(500).json({ message: 'Failed to list orders' });
  }
});

apiV1Routes.get('/orders/:id', apiKeyAuth('orders:read'), async (req, res) => {
  try {
    // Measurement fields are intentionally excluded here — they require the
    // dedicated measurements:read scope (endpoint below).
    const result = await query(
      `SELECT id, order_number, customer_id, status, total_amount, currency, due_date,
              notes, created_at
       FROM orders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.apiKey!.workspace_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('developer-api: get order failed:', err);
    res.status(500).json({ message: 'Failed to load order' });
  }
});

apiV1Routes.get('/orders/:id/measurements', apiKeyAuth('measurements:read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, measurement_snapshot, garment_measurements, selected_measurement_profile_label
       FROM orders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.apiKey!.workspace_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('developer-api: get measurements failed:', err);
    res.status(500).json({ message: 'Failed to load measurements' });
  }
});

// ---------- Inventory ----------
apiV1Routes.get('/inventory/fabrics', apiKeyAuth('inventory:read'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, fabric_type, color, unit, quantity_in_stock, reorder_level,
              cost_per_unit, supplier_name, is_active, created_at, updated_at
       FROM fabric_records
       WHERE workspace_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 200`,
      [req.apiKey!.workspace_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('developer-api: list fabrics failed:', err);
    res.status(500).json({ message: 'Failed to list fabrics' });
  }
});

// ---------- Reports ----------
apiV1Routes.get('/reports/summary', apiKeyAuth('reports:read'), async (req, res) => {
  try {
    const ws = req.apiKey!.workspace_id;
    const [payments, orders, customers] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(CASE WHEN payment_status = 'captured' THEN amount ELSE 0 END), 0) AS total_paid,
                COUNT(*)::int AS payment_count
         FROM payments WHERE workspace_id = $1`,
        [ws]
      ),
      query(
        `SELECT COUNT(*)::int AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_order_value,
                COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_orders,
                COUNT(*) FILTER (WHERE status IN ('draft','in_progress','ready'))::int AS in_progress_orders
         FROM orders WHERE workspace_id = $1 AND deleted_at IS NULL`,
        [ws]
      ),
      query(
        `SELECT COUNT(*)::int AS total_customers
         FROM customers WHERE workspace_id = $1 AND deleted_at IS NULL`,
        [ws]
      ),
    ]);
    res.json({
      revenue: payments.rows[0],
      orders: orders.rows[0],
      customers: customers.rows[0],
    });
  } catch (err) {
    console.error('developer-api: report summary failed:', err);
    res.status(500).json({ message: 'Failed to build summary' });
  }
});

// ---------- Usage (the key's own workspace only) ----------
apiV1Routes.get('/usage/summary', apiKeyAuth('usage:read'), async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days ?? '30'), 10) || 30, 1), 90);
    res.json(await usageService.workspaceSummary(req.apiKey!.workspace_id, days));
  } catch (err) {
    console.error('developer-api: usage summary failed:', err);
    res.status(500).json({ message: 'Failed to summarize usage' });
  }
});
