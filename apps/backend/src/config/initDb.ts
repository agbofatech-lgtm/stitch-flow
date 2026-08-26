import { query } from './db';

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      status TEXT NOT NULL,
      order_type TEXT NOT NULL,
      due_date TIMESTAMPTZ,
      notes TEXT NOT NULL DEFAULT '',
      total_amount NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GHS',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_customer
        FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      order_id TEXT,
      invoice_number TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TIMESTAMPTZ,
      total_amount NUMERIC NOT NULL,
      amount_paid NUMERIC NOT NULL DEFAULT 0,
      balance_due NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'GHS',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_invoice_customer
        FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_invoice_order
        FOREIGN KEY(order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      order_id TEXT,
      amount NUMERIC NOT NULL,
      method TEXT NOT NULL,
      reference_code TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'captured',
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_payment_invoice
        FOREIGN KEY(invoice_id)
        REFERENCES invoices(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_payment_customer
        FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_payment_order
        FOREIGN KEY(order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL
    );
  `);
}
