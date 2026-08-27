-- Business tables used by the StitchFlow domain routes
-- (customerRoutes, orderRoutes, invoiceRoutes, paymentRoutes,
--  materialRoutes, settingsRoutes, dashboardRoutes, reportRoutes).
--
-- Shapes are derived from the routes' Row types and INSERT statements —
-- the authoritative runtime contract. IDs are TEXT because the routes
-- generate their own identifiers.

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to TEXT,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  order_type TEXT NOT NULL DEFAULT 'custom',
  garment_type TEXT,
  fit_type TEXT,
  due_date TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  style_notes TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  measurement_snapshot JSONB,
  garment_measurements JSONB,
  production_plan JSONB,
  production_stages JSONB,
  inspiration_analysis JSONB,
  selected_fabric_id TEXT,
  design_inspiration_id TEXT,
  selected_pattern_id TEXT,
  selected_measurement_profile_id TEXT,
  selected_measurement_profile_label TEXT,
  selected_measurement_profile_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  reference_code TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'captured',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fabric_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  name TEXT NOT NULL,
  fabric_type TEXT NOT NULL,
  color TEXT,
  unit TEXT NOT NULL,
  quantity_in_stock NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC,
  cost_per_unit NUMERIC,
  supplier_name TEXT,
  supplier_contact TEXT,
  notes TEXT,
  image_url TEXT,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_material_usages (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fabric_record_id TEXT NOT NULL REFERENCES fabric_records(id) ON DELETE CASCADE,
  quantity_used NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'assistant',
  can_manage_customers BOOLEAN NOT NULL DEFAULT false,
  can_manage_orders BOOLEAN NOT NULL DEFAULT false,
  can_manage_payments BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_due_date ON orders(due_date);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_fabric_records_workspace_id ON fabric_records(workspace_id);
CREATE INDEX idx_order_material_usages_order_id ON order_material_usages(order_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
