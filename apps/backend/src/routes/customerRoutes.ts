import { Router } from 'express';
import { query, pool } from '../config/db';
import { recordSyncChange, recordSyncChangeTx } from '../services/syncChangeLog';
import { entitlementService } from '../services/entitlementService';
import { auditLogService } from '../services/auditLogService';
import { ApiError } from '../utils/apiError';

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  customer_id: string;
  order_number: string;
  status: string;
  order_type: string;
  due_date: string | null;
  notes: string;
  total_amount: string;
  currency: string;
  created_at: string;
};

const customerRoutes = Router();

function normalizeCustomerInput(body: any) {
  return {
    fullName: String(body?.fullName ?? '').trim(),
    phone: String(body?.phone ?? '').trim(),
    email: String(body?.email ?? '').trim().toLowerCase(),
    address: String(body?.address ?? '').trim(),
    notes: String(body?.notes ?? '').trim(),
  };
}

function isValidEmail(email: string) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

customerRoutes.get('/', async (req, res) => {
  try {
    const result = await query<CustomerRow>(
      `
        SELECT id, full_name, phone, email, address, notes, created_at
        FROM customers
        WHERE workspace_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `,
      [req.workspaceId]
    );

    const customers = result.rows.map((row: CustomerRow) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

customerRoutes.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query<OrderRow>(
      `
        SELECT id, customer_id, order_number, status, order_type, due_date, notes, total_amount, currency, created_at
        FROM orders
        WHERE customer_id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC
      `,
      [id, req.workspaceId]
    );

    const orders = result.rows.map((row: OrderRow) => ({
      id: row.id,
      customerId: row.customer_id,
      orderNumber: row.order_number,
      status: row.status,
      orderType: row.order_type,
      dueDate: row.due_date,
      notes: row.notes,
      totalAmount: Number(row.total_amount),
      currency: row.currency,
      createdAt: row.created_at,
    }));

    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch customer orders:', error);
    res.status(500).json({ message: 'Failed to fetch customer orders' });
  }
});

customerRoutes.post('/', async (req, res, next) => {
  // Phase 5: creation is transactional with a per-workspace lock so the
  // plan's customer limit cannot be bypassed by simultaneous requests
  // (Step 13 concurrency-safe enforcement).
  const client = await pool.connect();
  try {
    const { fullName, phone, email, address, notes } = normalizeCustomerInput(req.body);

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required if email is provided' });
    }

    const id = Date.now().toString();

    await client.query('BEGIN');

    // Locks the workspace row, resolves server-authoritative entitlements
    // and throws CUSTOMER_LIMIT_REACHED when the plan limit is exhausted.
    await entitlementService.enforceCustomerLimit(client, req.workspaceId!);

    const result = await client.query<CustomerRow>(
      `
        INSERT INTO customers (id, workspace_id, full_name, phone, email, address, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, full_name, phone, email, address, notes, created_at
      `,
      [id, req.workspaceId, fullName, phone, email, address, notes]
    );

    const row = result.rows[0];

    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'customers',
      entityId: row.id,
      operation: 'insert',
      payload: { id: row.id, fullName, phone, email, address, notes },
    });

    // Phase 6: transactional audit trail (atomic with the insert).
    await auditLogService.logTx(client, {
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: row.id,
      metadata: { source: 'api' },
    });

    await client.query('COMMIT');

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
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Failed to create customer:', error);
    return res.status(500).json({ message: 'Failed to create customer' });
  } finally {
    client.release();
  }
});

customerRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, email, address, notes } = normalizeCustomerInput(req.body);

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required if email is provided' });
    }

    const result = await query<CustomerRow>(
      `
        UPDATE customers
        SET
          full_name = $2,
          phone = $3,
          email = $4,
          address = $5,
          notes = $6
        WHERE id = $1 AND workspace_id = $7 AND deleted_at IS NULL
        RETURNING id, full_name, phone, email, address, notes, created_at
      `,
      [id, fullName, phone, email, address, notes, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const row = result.rows[0];

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'customers',
      entityId: row.id,
      operation: 'update',
      payload: { id: row.id, fullName, phone, email, address, notes },
    });

    // Phase 6: audit trail.
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: row.id,
      metadata: { source: 'api' },
    });

    return res.json({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Failed to update customer:', error);
    return res.status(500).json({ message: 'Failed to update customer' });
  }
});

export { customerRoutes };
