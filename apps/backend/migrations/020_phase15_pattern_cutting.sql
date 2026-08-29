-- ---------------------------------------------------------------------------
-- Phase 15 — Pattern & Cutting Intelligence
-- Migration: 020_phase15_pattern_cutting.sql
--
-- Tables created:
--   pattern_models              — derived pattern model per design spec
--   pattern_model_pieces        — individual pattern pieces within a model
--   pattern_model_versions      — immutable snapshots of each model version
--   cutting_layouts             — greedy deterministic cutting layout
--   cutting_layout_placed_pieces— placed piece positions within a layout
--   cutting_instruction_sets    — cutting instructions for a layout
--
-- IMPORTANT:
--   layout_envelope_cm = max occupied Y + margins (geometric envelope).
--   This is NOT final fabric yardage. Phase 16 owns yardage.
--   Labeled "cutting_layout_length" throughout.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Pattern Models
-- ---------------------------------------------------------------------------
CREATE TABLE pattern_models (
  id                          TEXT PRIMARY KEY,
  workspace_id                TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id                 TEXT REFERENCES customers(id) ON DELETE SET NULL,
  name                        TEXT NOT NULL,
  version                     INTEGER NOT NULL DEFAULT 1,
  -- Immutable references for traceability
  design_specification_id     TEXT NOT NULL,
  measurement_profile_id      TEXT NOT NULL,
  measurement_profile_version INTEGER NOT NULL,
  garment_category            TEXT NOT NULL,
  engine_kind                 TEXT NOT NULL,
  -- Full derivation context (JSON)
  derivation_context          JSONB NOT NULL DEFAULT '{}',
  -- Measurement completeness snapshot
  measurement_completeness    JSONB NOT NULL DEFAULT '{}',
  -- Status
  status                      TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','derived','validated','ready_for_cutting','superseded')),
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pm_workspace   ON pattern_models (workspace_id);
CREATE INDEX idx_pm_customer    ON pattern_models (customer_id);
CREATE INDEX idx_pm_design_spec ON pattern_models (design_specification_id);
CREATE INDEX idx_pm_status      ON pattern_models (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Pattern Pieces (normalized, FK to model)
-- ---------------------------------------------------------------------------
CREATE TABLE pattern_model_pieces (
  id                                    TEXT PRIMARY KEY,
  pattern_model_id                      TEXT NOT NULL REFERENCES pattern_models(id) ON DELETE CASCADE,
  workspace_id                          TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name                                  TEXT NOT NULL,
  quantity                              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- Polygon as JSON array of {x,y} in cm
  outline_cm                            JSONB NOT NULL DEFAULT '[]',
  -- Bounding box
  bounding_box_width_cm                 NUMERIC(8,2) NOT NULL,
  bounding_box_height_cm                NUMERIC(8,2) NOT NULL,
  bounding_box_area_cm2                 NUMERIC(10,2) NOT NULL,
  -- Metadata
  seam_allowance_cm                     NUMERIC(5,2) NOT NULL DEFAULT 1.5,
  applied_ease_cm                       NUMERIC(5,2),
  grainline                             TEXT NOT NULL DEFAULT 'lengthwise'
                                        CHECK (grainline IN ('lengthwise','crosswise','bias','any')),
  -- JSON array of constraint strings
  constraints                           JSONB NOT NULL DEFAULT '[]',
  requires_directional_fabric           BOOLEAN NOT NULL DEFAULT FALSE,
  requires_pattern_matching             BOOLEAN NOT NULL DEFAULT FALSE,
  pattern_matching_manual_verification  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Notes as JSON array of strings
  notes                                 JSONB NOT NULL DEFAULT '[]',
  display_order                         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_pmp_model ON pattern_model_pieces (pattern_model_id);

-- ---------------------------------------------------------------------------
-- Pattern Model Versions (immutable snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE pattern_model_versions (
  id                  TEXT PRIMARY KEY,
  pattern_model_id    TEXT NOT NULL REFERENCES pattern_models(id) ON DELETE CASCADE,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version             INTEGER NOT NULL,
  snapshot            JSONB NOT NULL,
  reason              TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pmv_model ON pattern_model_versions (pattern_model_id, version DESC);

-- ---------------------------------------------------------------------------
-- Cutting Layouts
-- ---------------------------------------------------------------------------
CREATE TABLE cutting_layouts (
  id                    TEXT PRIMARY KEY,
  workspace_id          TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id           TEXT REFERENCES customers(id) ON DELETE SET NULL,
  pattern_model_id      TEXT NOT NULL REFERENCES pattern_models(id) ON DELETE CASCADE,
  fabric_profile_id     TEXT,   -- informational reference to design_intelligence fabric
  layout_width_cm       NUMERIC(8,2) NOT NULL,
  -- CUTTING LAYOUT ENVELOPE = max occupied Y + margin_cm (NOT fabric yardage)
  layout_envelope_cm    NUMERIC(10,2) NOT NULL,
  margin_cm             NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  -- Validation
  validation_issues     JSONB NOT NULL DEFAULT '[]',
  is_valid              BOOLEAN NOT NULL DEFAULT FALSE,
  -- Algorithm
  algorithm             TEXT NOT NULL DEFAULT 'greedy_deterministic'
                        CHECK (algorithm = 'greedy_deterministic'),
  algorithm_version     TEXT NOT NULL DEFAULT '1.0.0',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cl_workspace ON cutting_layouts (workspace_id);
CREATE INDEX idx_cl_customer  ON cutting_layouts (customer_id);
CREATE INDEX idx_cl_model     ON cutting_layouts (pattern_model_id);

-- ---------------------------------------------------------------------------
-- Placed Pieces within a Cutting Layout
-- ---------------------------------------------------------------------------
CREATE TABLE cutting_layout_placed_pieces (
  id                    TEXT PRIMARY KEY,
  cutting_layout_id     TEXT NOT NULL REFERENCES cutting_layouts(id) ON DELETE CASCADE,
  workspace_id          TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  piece_id              TEXT NOT NULL,   -- references pattern_model_pieces.id
  copy_number           INTEGER NOT NULL DEFAULT 1,
  x_cm                  NUMERIC(8,2) NOT NULL,
  y_cm                  NUMERIC(8,2) NOT NULL,
  rotation_deg          NUMERIC(5,1) NOT NULL DEFAULT 0,
  flipped               BOOLEAN NOT NULL DEFAULT FALSE,
  effective_width_cm    NUMERIC(8,2) NOT NULL,
  effective_height_cm   NUMERIC(8,2) NOT NULL,
  placement_order       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_clpp_layout ON cutting_layout_placed_pieces (cutting_layout_id);

-- ---------------------------------------------------------------------------
-- Cutting Instruction Sets
-- ---------------------------------------------------------------------------
CREATE TABLE cutting_instruction_sets (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  pattern_model_id    TEXT NOT NULL REFERENCES pattern_models(id) ON DELETE CASCADE,
  cutting_layout_id   TEXT REFERENCES cutting_layouts(id) ON DELETE SET NULL,
  fabric_profile_id   TEXT,
  -- Instructions as JSON
  instructions        JSONB NOT NULL DEFAULT '[]',
  preamble            JSONB NOT NULL DEFAULT '[]',
  post_cutting_checks JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cis_model ON cutting_instruction_sets (pattern_model_id);
