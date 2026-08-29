-- Phase 14 — Design Intelligence foundation.
-- inspiration_references + fabric_profiles + design_specifications + versioning.
-- All owned rows carry workspace_id FK (tenant isolation).
-- IDs are TEXT — client-generatable, offline-stable.

-- ---------------------------------------------------------------------------
-- Local asset registry (metadata only — binary stored client-side in Dexie)
-- ---------------------------------------------------------------------------
CREATE TABLE local_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width_px INTEGER,
  height_px INTEGER,
  -- Compact thumbnail (≤ 10 KB base64 data URL) stored server-side
  thumbnail_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_local_assets_size CHECK (size_bytes >= 0)
);
CREATE INDEX idx_local_assets_workspace ON local_assets (workspace_id);

-- ---------------------------------------------------------------------------
-- Inspiration References
-- ---------------------------------------------------------------------------
CREATE TABLE inspiration_references (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'image_upload','camera_capture','existing_garment',
      'reference_url','screenshot','manual'
    )
  ),
  title TEXT NOT NULL,
  source_url TEXT,
  local_asset_id TEXT REFERENCES local_assets(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  -- Structured observations stored as JSONB array
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_inspiration_observations_array
    CHECK (jsonb_typeof(observations) = 'array')
);
CREATE INDEX idx_inspiration_workspace ON inspiration_references (workspace_id, created_at DESC);
CREATE INDEX idx_inspiration_customer ON inspiration_references (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Fabric Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE fabric_profiles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  local_asset_id TEXT REFERENCES local_assets(id) ON DELETE SET NULL,
  fabric_type TEXT,
  -- Width: stored as canonical cm + original value/unit preserved
  width_cm NUMERIC(10,4),
  width_original_value NUMERIC(10,4),
  width_original_unit TEXT CHECK (width_original_unit IN ('cm','inch')),
  -- Available length: stored in canonical cm + original value/unit
  length_cm NUMERIC(10,4),
  length_original_value NUMERIC(10,4),
  length_original_unit TEXT CHECK (length_original_unit IN ('yard','meter','cm')),
  -- Physical behaviour (user-confirmed — not AI-detected)
  directional BOOLEAN,
  pattern_repeat BOOLEAN,
  pattern_repeat_size_cm NUMERIC(8,4),
  requires_matching BOOLEAN,
  stretch TEXT CHECK (stretch IN ('none','low','medium','high')),
  transparency TEXT CHECK (transparency IN ('opaque','semi-sheer','sheer')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fabric_profiles_workspace ON fabric_profiles (workspace_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Design Specifications
-- ---------------------------------------------------------------------------
CREATE TABLE design_specifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_specification_id TEXT REFERENCES design_specifications(id) ON DELETE SET NULL,

  -- Garment classification (open string — extensible without migration)
  garment_category TEXT NOT NULL,
  garment_subtype TEXT,
  silhouette TEXT,
  fit TEXT CHECK (fit IN ('fitted','slim','regular','relaxed','loose','oversized','custom')),
  length_type TEXT,
  target_length_cm NUMERIC(8,4),

  -- Sleeve
  sleeve_type TEXT,
  sleeve_length_cm NUMERIC(8,4),

  -- Neckline
  neckline_type TEXT,

  -- Structured arrays as JSONB
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  construction_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  ease_configurations JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Phase 13 measurement profile linkage (ID only — never raw measurement data)
  measurement_profile_id TEXT,
  -- Snapshot of measurement context at design time (JSONB)
  measurement_context JSONB,

  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','partial','ready_for_design','validated','ready_for_pattern')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ds_components_array CHECK (jsonb_typeof(components) = 'array'),
  CONSTRAINT chk_ds_construction_array CHECK (jsonb_typeof(construction_details) = 'array'),
  CONSTRAINT chk_ds_ease_array CHECK (jsonb_typeof(ease_configurations) = 'array'),
  CONSTRAINT chk_ds_observations_array CHECK (jsonb_typeof(observations) = 'array')
);

CREATE INDEX idx_ds_workspace ON design_specifications (workspace_id, created_at DESC);
CREATE INDEX idx_ds_customer ON design_specifications (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;
CREATE INDEX idx_ds_status ON design_specifications (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Design Specification ↔ Inspiration (M:N join)
-- ---------------------------------------------------------------------------
CREATE TABLE design_specification_inspirations (
  design_specification_id TEXT NOT NULL
    REFERENCES design_specifications(id) ON DELETE CASCADE,
  inspiration_reference_id TEXT NOT NULL
    REFERENCES inspiration_references(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (design_specification_id, inspiration_reference_id)
);

-- ---------------------------------------------------------------------------
-- Design Specification ↔ Fabric Profile (M:N join)
-- ---------------------------------------------------------------------------
CREATE TABLE design_specification_fabrics (
  design_specification_id TEXT NOT NULL
    REFERENCES design_specifications(id) ON DELETE CASCADE,
  fabric_profile_id TEXT NOT NULL
    REFERENCES fabric_profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (design_specification_id, fabric_profile_id)
);

-- ---------------------------------------------------------------------------
-- Design Specification version history (immutable snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE design_specification_versions (
  id TEXT PRIMARY KEY,
  design_specification_id TEXT NOT NULL
    REFERENCES design_specifications(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dsv_spec ON design_specification_versions (design_specification_id, version DESC);
