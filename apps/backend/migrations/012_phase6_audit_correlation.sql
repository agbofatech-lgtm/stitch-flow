-- Phase 6: observability + audit correlation (additive, idempotent).
--
-- Adds workspace and request correlation to the audit trail (Step 37) so
-- audit records carry: workspace, actor, action, entity, entityId,
-- timestamp, requestId, metadata. No destructive operations; existing
-- rows untouched (new columns are nullable; entity_id is WIDENED from
-- UUID to TEXT because core business entities — customers, orders,
-- invoices — legitimately use non-UUID string ids, and TEXT accepts
-- every existing UUID value unchanged).

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_id TEXT;

ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE TEXT;

-- Tenant-scoped audit lookups (workspace → recent audit trail).
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id
  ON audit_logs(workspace_id);

-- Correlation lookups (requestId → everything that happened in a request).
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id
  ON audit_logs(request_id);
