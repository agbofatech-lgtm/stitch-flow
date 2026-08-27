-- Phase 8 — Webhook delivery infrastructure (Subsystem 2).
-- Additive + idempotent. Builds ON integration_outbox (the durable event
-- queue from Phase 7); this migration adds endpoint registration + delivery
-- tracking only. No competing event system.

-- ============ webhook_endpoints (TENANT-SCOPED) ============
-- Purpose: workspace-registered webhook receivers.
-- - secret_prefix: clear-text identifier (like sf_live_ key prefixes).
-- - secret_encrypted: AES-256-GCM envelope of the whsec_ signing secret.
--   Rationale: an OUTGOING-signing secret must be retrievable to sign
--   (a hash cannot sign); GCM keeps it non-plaintext at rest.
-- - retry policy is per-endpoint configurable and bounded (max_attempts
--   caps total attempts; backoff is exponential from backoff_base_seconds).
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  url TEXT NOT NULL CHECK (url <> ''),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  subscribed_events TEXT[] NOT NULL CHECK (array_length(subscribed_events, 1) >= 1),
  secret_prefix TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 10),
  backoff_base_seconds INTEGER NOT NULL DEFAULT 30 CHECK (backoff_base_seconds BETWEEN 0 AND 3600),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_ws
  ON webhook_endpoints(workspace_id, created_at DESC);

-- ============ webhook_deliveries (TENANT-SCOPED, one row per attempt) ============
-- Purpose: full delivery history + retry state machine.
-- PENDING → DELIVERING → DELIVERED
--                 ↘ FAILED-transient → RETRYING (new PENDING attempt row)
--                 ↘ DEAD_LETTER (permanent 4xx, or attempts exhausted)
-- delivery_key UNIQUE = idempotent delivery identifier (outbox:endpoint:attempt)
-- endpoint_id ON DELETE SET NULL: delivery history outlives endpoint deletion.
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_key TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
  outbox_id UUID REFERENCES integration_outbox(outbox_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempt INTEGER NOT NULL CHECK (attempt >= 1),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING','DELIVERING','DELIVERED','RETRYING','DEAD_LETTER')
  ),
  response_status INTEGER,
  response_time_ms INTEGER,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_ws_status
  ON webhook_deliveries(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_due
  ON webhook_deliveries(status, next_retry_at)
  WHERE status IN ('PENDING','RETRYING');
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint
  ON webhook_deliveries(endpoint_id, attempt DESC);
