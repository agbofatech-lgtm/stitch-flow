-- Phase 3: workspaces + user membership (the tenancy anchor).
--
-- 'default-workspace' is seeded because it is the PRE-EXISTING convention:
-- settingsRoutes defaults workspaceId to 'default-workspace' and the frontend
-- uses the same identifier. Legacy rows are backfilled to it in 009.

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'assistant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_users_user_id ON workspace_users(user_id);
CREATE INDEX idx_workspace_users_workspace_id ON workspace_users(workspace_id);

INSERT INTO workspaces (id, name) VALUES ('default-workspace', 'Default Workspace')
ON CONFLICT (id) DO NOTHING;

-- Any workspace ids referenced by legacy workspace_members rows must exist
-- before FKs are added in 009.
INSERT INTO workspaces (id, name)
SELECT DISTINCT workspace_id, workspace_id FROM workspace_members
ON CONFLICT (id) DO NOTHING;
