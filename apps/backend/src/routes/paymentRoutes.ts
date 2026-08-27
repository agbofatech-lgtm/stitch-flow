import { Router } from 'express';
import { query, pool } from '../config/db';
import { recordSyncChangeTx } from '../services/syncChangeLog';

type PaymentRow = {
  id: string;
  invoice_id: string;
  customer_id: string;
  order_id: string | null;
  amount: string;
  method: string;
  reference_code: string;
  payment_status: string;
  paid_at: string;
  notes: string;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: string;
};

const paymentRoutes = Router();

paymentRoutes.get('/', async (req, res) => {
  try {
    const result = await query<PaymentRow>(
      `
      SELECT *
      FROM payments
      WHERE workspace_id = $1
      ORDER BY paid_at DESC, created_at DESC
    `,
      [req.workspaceId]
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        customerId: row.customer_id,
        orderId: row.order_id,
        amount: Number(row.amount),
        method: row.method,
        referenceCode: row.reference_code,
        paymentStatus: row.payment_status,
        paidAt: row.paid_at,
        notes: row.notes,
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

paymentRoutes.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const result = await query<PaymentRow>(
      `
      SELECT *
      FROM payments
      WHERE invoice_id = $1 AND workspace_id = $2
      ORDER BY paid_at DESC, created_at DESC
      `,
      [invoiceId, req.workspaceId]
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        invoiceId: row.invoice_id,
        customerId: row.customer_id,
        orderId: row.order_id,
        amount: Number(row.amount),
        method: row.method,
        referenceCode: row.reference_code,
        paymentStatus: row.payment_status,
        paidAt: row.paid_at,
        notes: row.notes,
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch invoice payments:', error);
    res.status(500).json({ message: 'Failed to fetch invoice payments' });
  }
});

paymentRoutes.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      invoiceId,
      customerId,
      orderId = null,
      amount,
      method,
      referenceCode,
      paymentStatus = 'captured',
      paidAt = new Date().toISOString(),
      notes = '',
      clientMutationId = null,
    } = req.body ?? {};

    if (!invoiceId || !customerId || amount === undefined || !method || !referenceCode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    await client.query('BEGIN');

    // Idempotency: a replayed clientMutationId acknowledges the original
    // payment instead of creating a second financial event.
    if (clientMutationId) {
      const existing = await client.query<PaymentRow>(
        `SELECT * FROM payments WHERE workspace_id = $1 AND client_mutation_id = $2`,
        [req.workspaceId, clientMutationId]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        const row = existing.rows[0];
        return res.status(200).json({
          id: row.id,
          invoiceId: row.invoice_id,
          customerId: row.customer_id,
          orderId: row.order_id,
          amount: Number(row.amount),
          method: row.method,
          referenceCode: row.reference_code,
          paymentStatus: row.payment_status,
          paidAt: row.paid_at,
          notes: row.notes,
          createdAt: row.created_at,
          duplicate: true,
        });
      }
    }

    const invoiceResult = await client.query<InvoiceRow>(
      `
      SELECT id, total_amount, amount_paid, balance_due, status
      FROM invoices
      WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
      FOR UPDATE
      `,
      [invoiceId, req.workspaceId]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];
    const currentPaid = Number(invoice.amount_paid);
    const totalAmount = Number(invoice.total_amount);
    const nextPaid = currentPaid + paymentAmount;

    if (nextPaid > totalAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Payment exceeds invoice total' });
    }

    const nextBalance = Math.max(0, totalAmount - nextPaid);

    let nextStatus = invoice.status;
    if (nextBalance === 0) nextStatus = 'paid';
    else if (nextPaid > 0) nextStatus = 'partial';
    else nextStatus = 'pending';

    const id = Date.now().toString();

    const paymentResult = await client.query<PaymentRow>(
      `
      INSERT INTO payments (
        id, workspace_id, invoice_id, customer_id, order_id, amount, method,
        reference_code, payment_status, paid_at, notes, client_mutation_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        id,
        req.workspaceId,
        invoiceId,
        customerId,
        orderId,
        paymentAmount,
        method,
        referenceCode,
        paymentStatus,
        paidAt,
        notes,
        clientMutationId,
      ]
    );

    await client.query(
      `
      UPDATE invoices
      SET
        amount_paid = $2,
        balance_due = $3,
        status = $4
      WHERE id = $1 AND workspace_id = $5
      `,
      [invoiceId, nextPaid, nextBalance, nextStatus, req.workspaceId]
    );

    // The payment event, the invoice reconciliation and BOTH sync-change
    // records commit atomically — or none of them do.
    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'payments',
      entityId: id,
      operation: 'insert',
      payload: {
        id,
        invoiceId,
        customerId,
        orderId,
        amount: paymentAmount,
        method,
        referenceCode,
        paymentStatus,
        paidAt,
        notes,
      },
      clientMutationId,
    });
    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      entity: 'invoices',
      entityId: invoiceId,
      operation: 'update',
      payload: {
        id: invoiceId,
        amountPaid: nextPaid,
        balanceDue: nextBalance,
        status: nextStatus,
      },
    });

    await client.query('COMMIT');

    const row = paymentResult.rows[0];

    res.status(201).json({
      id: row.id,
      invoiceId: row.invoice_id,
      customerId: row.customer_id,
      orderId: row.order_id,
      amount: Number(row.amount),
      method: row.method,
      referenceCode: row.reference_code,
      paymentStatus: row.payment_status,
      paidAt: row.paid_at,
      notes: row.notes,
      createdAt: row.created_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create payment:', error);
    res.status(500).json({ message: 'Failed to create payment' });
  } finally {
    client.release();
  }
});

export { paymentRoutes };
