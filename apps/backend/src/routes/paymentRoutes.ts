import { Router } from 'express';
import { query, pool } from '../config/db';

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

paymentRoutes.get('/', async (_req, res) => {
  try {
    const result = await query<PaymentRow>(`
      SELECT *
      FROM payments
      ORDER BY paid_at DESC, created_at DESC
    `);

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
      WHERE invoice_id = $1
      ORDER BY paid_at DESC, created_at DESC
      `,
      [invoiceId]
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
    } = req.body ?? {};

    if (!invoiceId || !customerId || amount === undefined || !method || !referenceCode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    await client.query('BEGIN');

    const invoiceResult = await client.query<InvoiceRow>(
      `
      SELECT id, total_amount, amount_paid, balance_due, status
      FROM invoices
      WHERE id = $1
      FOR UPDATE
      `,
      [invoiceId]
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
        id, invoice_id, customer_id, order_id, amount, method,
        reference_code, payment_status, paid_at, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        id,
        invoiceId,
        customerId,
        orderId,
        paymentAmount,
        method,
        referenceCode,
        paymentStatus,
        paidAt,
        notes,
      ]
    );

    await client.query(
      `
      UPDATE invoices
      SET
        amount_paid = $2,
        balance_due = $3,
        status = $4
      WHERE id = $1
      `,
      [invoiceId, nextPaid, nextBalance, nextStatus]
    );

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
