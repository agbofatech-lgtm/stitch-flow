-- SAC-4 shop persistence authority.
-- Does not apply platform commercial schema (006 deferred).
-- Nested migrations/migrations/ is historical duplicate, not this ledger.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_customers (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS shop_customers_scope_idx
  ON shop_customers (tenant_id, workspace_id);

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES shop_customers(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL,
  garment_type TEXT,
  notes TEXT NOT NULL DEFAULT '',
  measurement_snapshot JSONB,
  production_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS shop_orders_scope_idx
  ON shop_orders (tenant_id, workspace_id);

CREATE TABLE IF NOT EXISTS shop_trusted_artifacts (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  order_id UUID REFERENCES shop_orders(id),
  frozen BOOLEAN NOT NULL DEFAULT TRUE,
  fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT shop_trusted_artifacts_frozen_chk CHECK (frozen = TRUE)
);

CREATE INDEX IF NOT EXISTS shop_trusted_artifacts_scope_idx
  ON shop_trusted_artifacts (tenant_id, workspace_id);
