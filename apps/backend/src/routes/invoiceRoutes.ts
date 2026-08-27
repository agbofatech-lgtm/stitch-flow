import { Router } from 'express';
import { query } from '../config/db';
import { recordSyncChange } from '../services/syncChangeLog';
import { auditLogService } from '../services/auditLogService';

type InvoiceRow = {
  id: string;
  customer_id: string;
  order_id: string | null;
  invoice_number: string;
  status: string;
  due_date: string | null;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  currency: string;
  notes: string;
  created_at: string;
};

type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: string;
  unit_price: string;
  total: string;
};

const invoiceRoutes = Router();

function resolveInvoiceStatus({
  amountPaid,
  balanceDue,
  dueDate,
}: {
  amountPaid: number;
  balanceDue: number;
  dueDate?: string | null;
}) {
  if (balanceDue <= 0) return 'paid';

  if (dueDate) {
    const due = new Date(dueDate);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
      return 'overdue';
    }
  }

  if (amountPaid > 0 && balanceDue > 0) return 'partial';

  return 'pending';
}

function mapInvoiceRow(row: InvoiceRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    dueDate: row.due_date,
    totalAmount: Number(row.total_amount),
    amountPaid: Number(row.amount_paid),
    balanceDue: Number(row.balance_due),
    currency: row.currency,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapInvoiceItemRow(row: InvoiceItemRow) {
  return {
    id: row.id,
    description: row.description || '',
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
  };
}

async function getInvoiceItems(invoiceId: string) {
  const result = await query<InvoiceItemRow>(
    `
    SELECT *
    FROM invoice_items
    WHERE invoice_id = $1
    ORDER BY id ASC
    `,
    [invoiceId]
  );

  return result.rows.map(mapInvoiceItemRow);
}

async function replaceInvoiceItems(
  invoiceId: string,
  items: Array<{
    description?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>
) {
  await query(
    `
    DELETE FROM invoice_items
    WHERE invoice_id = $1
    `,
    [invoiceId]
  );

  for (const item of items) {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const total =
      item.total !== undefined
        ? Number(item.total)
        : Number((quantity * unitPrice).toFixed(2));

    await query(
      `
      INSERT INTO invoice_items (
        id, invoice_id, description, quantity, unit_price, total
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        invoiceId,
        item.description || '',
        quantity,
        unitPrice,
        total,
      ]
    );
  }
}

async function refreshOverdueInvoices(workspaceId: string) {
  await query(
    `
    UPDATE invoices
    SET status = 'overdue'
    WHERE workspace_id = $1
      AND balance_due > 0
      AND due_date IS NOT NULL
      AND due_date < NOW()
      AND status IN ('pending', 'partial')
    `,
    [workspaceId]
  );
}

invoiceRoutes.get('/', async (req, res) => {
  try {
    await refreshOverdueInvoices(req.workspaceId!);

    const result = await query<InvoiceRow>(
      `
      SELECT *
      FROM invoices
      WHERE workspace_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [req.workspaceId]
    );

    const invoices = await Promise.all(
      result.rows.map(async (row) => {
        const invoice = mapInvoiceRow(row);
        const items = await getInvoiceItems(row.id);
        return { ...invoice, items };
      })
    );

    res.json(invoices);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

invoiceRoutes.post('/', async (req, res) => {
  try {
    const {
      customerId,
      orderId = null,
      invoiceNumber,
      dueDate = null,
      totalAmount,
      amountPaid = 0,
      balanceDue,
      currency = 'GHS',
      notes = '',
      items = [],
    } = req.body ?? {};

    if (!customerId || !invoiceNumber || totalAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const customerCheck = await query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [customerId, req.workspaceId]
    );
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const numericTotal = Number(totalAmount);
    const numericPaid = Number(amountPaid);

    if (!Number.isFinite(numericTotal) || numericTotal < 0) {
      return res.status(400).json({ message: 'totalAmount must be a non-negative finite number' });
    }
    if (!Number.isFinite(numericPaid) || numericPaid < 0) {
      return res.status(400).json({ message: 'amountPaid must be a non-negative finite number' });
    }

    const computedBalance = Math.max(
      0,
      balanceDue !== undefined ? Number(balanceDue) : numericTotal - numericPaid
    );

    const computedStatus = resolveInvoiceStatus({
      amountPaid: numericPaid,
      balanceDue: computedBalance,
      dueDate,
    });

    const id = Date.now().toString();

    const result = await query<InvoiceRow>(
      `
      INSERT INTO invoices (
        id, workspace_id, customer_id, order_id, invoice_number, status, due_date,
        total_amount, amount_paid, balance_due, currency, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        id,
        req.workspaceId,
        customerId,
        orderId,
        invoiceNumber,
        computedStatus,
        dueDate,
        numericTotal,
        numericPaid,
        computedBalance,
        currency,
        notes,
      ]
    );

    await replaceInvoiceItems(id, Array.isArray(items) ? items : []);

    const created = mapInvoiceRow(result.rows[0]);
    const createdItems = await getInvoiceItems(id);

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'invoices',
      entityId: id,
      operation: 'insert',
      payload: { ...created, items: createdItems } as unknown as Record<string, unknown>,
    });

    // Phase 6: audit trail.
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: id,
      metadata: { invoiceNumber, totalAmount: numericTotal, currency },
    });

    res.status(201).json({ ...created, items: createdItems });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

invoiceRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      orderId = null,
      invoiceNumber,
      dueDate = null,
      totalAmount,
      amountPaid = 0,
      balanceDue,
      currency = 'GHS',
      notes = '',
      items = [],
    } = req.body ?? {};

    if (!customerId || !invoiceNumber || totalAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const numericTotal = Number(totalAmount);
    const numericPaid = Number(amountPaid);

    if (!Number.isFinite(numericTotal) || numericTotal < 0) {
      return res.status(400).json({ message: 'totalAmount must be a non-negative finite number' });
    }
    if (!Number.isFinite(numericPaid) || numericPaid < 0) {
      return res.status(400).json({ message: 'amountPaid must be a non-negative finite number' });
    }

    const computedBalance = Math.max(
      0,
      balanceDue !== undefined ? Number(balanceDue) : numericTotal - numericPaid
    );

    const computedStatus = resolveInvoiceStatus({
      amountPaid: numericPaid,
      balanceDue: computedBalance,
      dueDate,
    });

    const result = await query<InvoiceRow>(
      `
      UPDATE invoices
      SET
        customer_id = $2,
        order_id = $3,
        invoice_number = $4,
        status = $5,
        due_date = $6,
        total_amount = $7,
        amount_paid = $8,
        balance_due = $9,
        currency = $10,
        notes = $11
      WHERE id = $1 AND workspace_id = $12 AND deleted_at IS NULL
      RETURNING *
      `,
      [
        id,
        customerId,
        orderId,
        invoiceNumber,
        computedStatus,
        dueDate,
        numericTotal,
        numericPaid,
        computedBalance,
        currency,
        notes,
        req.workspaceId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await replaceInvoiceItems(id, Array.isArray(items) ? items : []);

    const updated = mapInvoiceRow(result.rows[0]);
    const updatedItems = await getInvoiceItems(id);

    await recordSyncChange({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'invoices',
      entityId: id,
      operation: 'update',
      payload: { ...updated, items: updatedItems } as unknown as Record<string, unknown>,
    });

    res.json({ ...updated, items: updatedItems });
  } catch (error) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ message: 'Failed to update invoice' });
  }
});

export { invoiceRoutes };
