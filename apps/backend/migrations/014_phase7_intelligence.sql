-- Phase 7: usage intelligence, developer control plane, customer portal,
-- integration outbox, platform roles. Additive + idempotent.

-- ============ Platform roles (Step 39) ============
-- Widening the users.role CHECK: legacy values stay valid; workspace roles
-- (owner/admin/staff) live in workspace_users and are unaffected. A
-- workspace OWNER gets NO platform privileges from this change.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('user', 'admin', 'platform_owner', 'platform_admin', 'platform_support', 'platform_analyst')
);

-- ============ Usage analytics (analytics event class — Step 23/24) ============
CREATE TABLE IF NOT EXISTS usage_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_name TEXT NOT NULL,
  feature TEXT,
  module TEXT,
  app_version TEXT,
  platform TEXT,
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_name = event_name AND event_name <> ''),
  -- bounded metadata: telemetry must stay small (no payload dumping)
  CHECK (octet_length(metadata::text) <= 8192)
);
CREATE INDEX IF NOT EXISTS idx_usage_events_ws_time
  ON usage_events(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_ws_name_time
  ON usage_events(workspace_id, event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_name_time
  ON usage_events(event_name, occurred_at DESC);

-- ============ Errors & incidents (Step 30/31/32) ============
CREATE TABLE IF NOT EXISTS error_records (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id TEXT,
  error_code TEXT NOT NULL,
  route TEXT,
  feature TEXT,
  app_version TEXT,
  platform TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning','error','fatal')),
  fingerprint TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_records_fingerprint
  ON error_records(fingerprint, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_records_ws_time
  ON error_records(workspace_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (
    status IN ('NEW','INVESTIGATING','KNOWN','FIXED','RELEASED','RESOLVED','IGNORED')
  ),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning','error','fatal')),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_occurrence_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  diagnosis TEXT, -- advisory content; always marked AI-GENERATED when machine-written
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ Feature flags (server-authoritative — Step 58) ============
CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key TEXT PRIMARY KEY CHECK (flag_key = flag_key AND flag_key <> ''),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO feature_flags (flag_key, enabled, description) VALUES
  ('AI_DIAGNOSTICS', false, 'Advisory AI diagnostics on incidents (Phase 7: interface only, deterministic placeholder)'),
  ('OPENAI', false, 'Future OpenAI provider (interface only — NOT REQUIRED FOR PHASE 7)'),
  ('GEMINI', false, 'Future Gemini provider (interface only)'),
  ('CLAUDE', false, 'Future Claude provider (interface only)'),
  ('N8N', false, 'Future n8n automation (interface only)'),
  ('CUSTOMER_PORTAL', false, 'Customer-facing portal (Phase 7: foundation)'),
  ('WHATSAPP', false, 'Future WhatsApp communication provider (interface only)'),
  ('ADVANCED_ANALYTICS', false, 'Advanced analytics (future)')
ON CONFLICT (flag_key) DO NOTHING;

-- ============ Customer support (Step 40) + feedback (Step 42) ============
CREATE TABLE IF NOT EXISTS support_cases (
  case_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES users(id),
  category TEXT NOT NULL DEFAULT 'OTHER' CHECK (
    category IN ('BUG','SYNC','BILLING','ACCOUNT','ORDER','MEASUREMENT','FITTING','OTHER')
  ),
  severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('low','normal','high','urgent')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
    status IN ('OPEN','ACKNOWLEDGED','INVESTIGATING','WAITING','RESOLVED','CLOSED')
  ),
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_cases_ws_cmid
  ON support_cases(workspace_id, client_mutation_id) WHERE client_mutation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_cases_ws_status
  ON support_cases(workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category TEXT,
  feature TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_ws_time
  ON customer_feedback(workspace_id, created_at DESC);

-- ============ Customer portal identity (Step 19/61) ============
-- SEPARATE from staff users: portal accounts see only their own customer
-- record through an explicit customer-scoped boundary.
CREATE TABLE IF NOT EXISTS portal_customers (
  portal_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email),
  UNIQUE (workspace_id, customer_id)
);

-- ============ Integration outbox (Step 37) ============
CREATE TABLE IF NOT EXISTS integration_outbox (
  outbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DISPATCHED','FAILED','SKIPPED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
-- Idempotent event emission: one outbox row per (workspace, type, entity).
CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_ws_type_entity
  ON integration_outbox(workspace_id, event_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_status_created
  ON integration_outbox(status, created_at);
