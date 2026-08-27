-- Phase 5: commercial foundation.
--
-- Adds the server-authoritative SaaS subscription domain:
--   * subscriptions   — workspace-scoped subscription records (BASIC/PRO/STUDIO)
--   * billing_events  — durable, idempotent billing event ledger
--
-- Design decisions (documented in docs/PHASE5_COMMERCIAL_DOMAIN.md):
--   * Canonical plan codes: BASIC, PRO, STUDIO (uppercase, matching the
--     pre-existing client vocabulary; legacy licenses.tier free/pro/enterprise
--     remains for device licensing and is NOT the SaaS entitlement source).
--   * Status values are lowercase snake, matching existing DB conventions
--     (e.g. licenses.tier, workspace_users.role are lowercase).
--   * At most ONE non-terminal subscription per workspace (partial unique
--     index over trialing/active/past_due/paused).
--   * usage counters are DERIVED from authoritative tables (customers,
--     workspace_members) inside the enforcement transaction — no separate
--     usage_counters table, so counters can never drift or become an
--     authorization bypass.
--   * NO destructive operations: no DROP/TRUNCATE of existing tables.
--   * Backfill: every existing workspace without a subscription receives a
--     server-authoritative trial (14 days from migration time, STUDIO trial
--     plan). Runtime trial creation uses env TRIAL_DAYS / TRIAL_PLAN_CODE.

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('BASIC', 'PRO', 'STUDIO')),
  status TEXT NOT NULL CHECK (
    status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')
  ),
  provider TEXT NOT NULL DEFAULT 'none',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  -- Out-of-order webhook guard: the occurred-at timestamp of the last
  -- provider event applied to this row. Older events are ignored as stale.
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One live (non-terminal) subscription per workspace.
CREATE UNIQUE INDEX uq_subscriptions_workspace_live
  ON subscriptions(workspace_id)
  WHERE status IN ('trialing', 'active', 'past_due', 'paused');

-- Provider mapping must be unique — a provider subscription can only ever be
-- associated with one workspace (prevents cross-workspace provider grafting).
CREATE UNIQUE INDEX uq_subscriptions_provider_subscription
  ON subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);

-- Durable billing event ledger. provider_event_id is the idempotency key:
-- duplicate provider deliveries hit the unique constraint and are recorded
-- as no-ops (exactly one effective state transition per event id).
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id),
  subscription_id UUID REFERENCES subscriptions(id),
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'processed', 'rejected', 'ignored_stale', 'failed')
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_billing_events_workspace ON billing_events(workspace_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);

-- Backfill: existing workspaces get a server-authoritative trial so that no
-- tenant silently loses functionality at migration time. 14 days / STUDIO
-- mirrors the documented runtime defaults (TRIAL_DAYS=14, TRIAL_PLAN_CODE=STUDIO).
INSERT INTO subscriptions (workspace_id, plan_code, status, provider, trial_start, trial_end)
SELECT w.id, 'STUDIO', 'trialing', 'none', NOW(), NOW() + INTERVAL '14 days'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.workspace_id = w.id
);
