-- P19.6 platform commercial schema
-- STATUS: NOT APPLIED. Empty 002–005 remain empty. Postgres is not-verified.
-- Do not treat this file as a live database.
-- Tenant ≠ workspace. Shop invoices are not in these tables.

CREATE TABLE IF NOT EXISTS platform_identities (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_workspaces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES platform_tenants(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_memberships (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES platform_identities(id),
  tenant_id TEXT NOT NULL REFERENCES platform_tenants(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES platform_tenants(id),
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS platform_saas_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES platform_tenants(id),
  checkout_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,
  adapter TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_billing_events (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES platform_tenants(id),
  payment_id TEXT NOT NULL,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_commercial_audit (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  actor_id TEXT,
  event_id TEXT,
  source TEXT NOT NULL,
  previous_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_operators (
  identity_id TEXT PRIMARY KEY REFERENCES platform_identities(id)
);
