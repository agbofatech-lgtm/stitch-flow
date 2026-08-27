-- Phase 3: server-authoritative sync v2.
-- sync_changes gains: workspace scope, a monotonic server-generated cursor
-- (seq), and idempotency via client_mutation_id.
-- processed_mutations is the durable idempotency ledger (survives restarts,
-- multiple workers and retries).

ALTER TABLE sync_changes ADD COLUMN workspace_id TEXT;
UPDATE sync_changes SET workspace_id = 'default-workspace' WHERE workspace_id IS NULL;
ALTER TABLE sync_changes ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE sync_changes ADD CONSTRAINT sync_changes_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

ALTER TABLE sync_changes ADD COLUMN client_mutation_id TEXT;
ALTER TABLE sync_changes ADD COLUMN seq BIGSERIAL;

CREATE UNIQUE INDEX uq_sync_changes_seq ON sync_changes(seq);
CREATE INDEX idx_sync_changes_workspace_seq ON sync_changes(workspace_id, seq);
CREATE UNIQUE INDEX uq_sync_changes_workspace_cmid
  ON sync_changes(workspace_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;

CREATE TABLE processed_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  client_mutation_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  entity TEXT NOT NULL,
  entity_id TEXT,
  operation TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, client_mutation_id)
);

CREATE INDEX idx_processed_mutations_workspace ON processed_mutations(workspace_id);
