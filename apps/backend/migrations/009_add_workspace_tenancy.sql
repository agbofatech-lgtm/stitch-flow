-- Phase 3: workspace tenancy on business tables.
-- Backfill strategy: legacy rows (created before tenancy) are assigned to
-- 'default-workspace' — the identifier the application already used — then
-- NOT NULL + FK are enforced. No data is discarded.

-- customers
ALTER TABLE customers ADD COLUMN workspace_id TEXT;
UPDATE customers SET workspace_id = 'default-workspace' WHERE workspace_id IS NULL;
ALTER TABLE customers ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE customers ADD CONSTRAINT customers_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_customers_workspace_id ON customers(workspace_id);

-- orders
ALTER TABLE orders ADD COLUMN workspace_id TEXT;
UPDATE orders SET workspace_id = 'default-workspace' WHERE workspace_id IS NULL;
ALTER TABLE orders ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_orders_workspace_id ON orders(workspace_id);

-- invoices
ALTER TABLE invoices ADD COLUMN workspace_id TEXT;
UPDATE invoices SET workspace_id = 'default-workspace' WHERE workspace_id IS NULL;
ALTER TABLE invoices ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_invoices_workspace_id ON invoices(workspace_id);

-- payments (immutable events; gain workspace + idempotency key)
ALTER TABLE payments ADD COLUMN workspace_id TEXT;
UPDATE payments SET workspace_id = 'default-workspace' WHERE workspace_id IS NULL;
ALTER TABLE payments ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE payments ADD CONSTRAINT payments_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE payments ADD COLUMN client_mutation_id TEXT;
CREATE UNIQUE INDEX uq_payments_workspace_cmid
  ON payments(workspace_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;
CREATE INDEX idx_payments_workspace_id ON payments(workspace_id);

-- fabric_records (column already existed, nullable)
UPDATE fabric_records SET workspace_id = 'default-workspace' WHERE workspace_id IS NULL;
ALTER TABLE fabric_records ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE fabric_records ADD CONSTRAINT fabric_records_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE fabric_records ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE fabric_records ADD CONSTRAINT fabric_records_stock_nonnegative
  CHECK (quantity_in_stock >= 0);

-- order_material_usages (workspace derived via orders; gains tombstone + idempotency)
ALTER TABLE order_material_usages ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE order_material_usages ADD COLUMN client_mutation_id TEXT;
CREATE UNIQUE INDEX uq_usages_cmid
  ON order_material_usages(client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

-- app_settings: workspace-scoped composite key
ALTER TABLE app_settings ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default-workspace';
ALTER TABLE app_settings ADD CONSTRAINT app_settings_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE app_settings ADD PRIMARY KEY (workspace_id, key);

-- workspace_members: FK to workspaces + optional link to auth users
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE workspace_members ADD COLUMN user_id UUID REFERENCES users(id);
