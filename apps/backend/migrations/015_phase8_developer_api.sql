-- Phase 8 — Developer API foundation (Subsystem 1).
-- Additive + idempotent. Purposes documented per table (Phase 8 §9).

-- ============ api_keys (TENANT-SCOPED) ============
-- Purpose: scoped machine credentials for the StitchFlow Developer API.
-- - secret_hash: SHA-256 of the full `sf_live_...` secret. The raw secret is
--   shown ONCE at creation and never stored or logged. SHA-256 (not bcrypt)
--   is the industry standard for high-entropy (256-bit) API secrets and
--   keeps verification O(1) per request.
-- - key_prefix: first 16 chars of the secret, stored in the clear for
--   identification in UIs, logs and prefix-indexed lookup.
-- - scopes: explicit least-privilege scope list (validated against the
--   server-side catalogue; no wildcards).
-- - status lifecycle: active -> revoked (explicit) | expired (lazy, on use).
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (name <> ''),
  key_prefix TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL CHECK (array_length(scopes, 1) >= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  request_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_api_keys_ws_created
  ON api_keys(workspace_id, created_at DESC);
-- Prefix lookups hit the UNIQUE constraint index on key_prefix.

-- ============ Phase 8 feature flags (PLATFORM-GLOBAL seed, all OFF) ============
-- New powerful surfaces default OFF until explicitly enabled by a platform
-- admin (server-authoritative; Phase 8 §25).
INSERT INTO feature_flags (flag_key, enabled, description) VALUES
  ('DEVELOPER_DASHBOARD', false, 'Developer/control-plane dashboard UI (Phase 8)'),
  ('DEVELOPER_API', false, 'Developer API + API-key management (Phase 8)'),
  ('USAGE_DASHBOARD', false, 'Usage intelligence dashboard surfaces (Phase 8)'),
  ('WEBHOOK_MANAGEMENT', false, 'Webhook endpoint management + deliveries (Phase 8)'),
  ('PROVIDER_REGISTRY', false, 'Integration/provider registry (Phase 8)'),
  ('AI_FEATURES', false, 'AI provider surfaces (Phase 8: boundary/registry only)'),
  ('AUTOMATION_FEATURES', false, 'Automation/n8n boundary surfaces (Phase 8)')
ON CONFLICT (flag_key) DO NOTHING;
