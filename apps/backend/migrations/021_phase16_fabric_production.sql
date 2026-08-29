-- ---------------------------------------------------------------------------
-- Phase 16 — Fabric & Production Intelligence
-- Migration: 021_phase16_fabric_production.sql
--
-- Tables created:
--   fabric_consumptions         — authoritative fabric requirement per layout
--   purchasing_recommendations  — purchasing guidance
--   production_plans            — canonical production planning aggregate
--   production_materials        — garment material requirements
--   cutting_execution_steps     — operational cutting sequence
--   production_operations       — workflow operations with dependencies
--   quality_checkpoints         — QC checklist items
--
-- CRITICAL TERMINOLOGY:
--   fabric_required_cm  = Phase 16 AUTHORITATIVE FABRIC REQUIREMENT
--   layout_envelope_cm  = Phase 15 CUTTING LAYOUT LENGTH (geometry)
--   These are DIFFERENT quantities. The column names preserve this distinction.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Fabric Consumption (authoritative Phase 16 output)
-- ---------------------------------------------------------------------------
CREATE TABLE fabric_consumptions (
  id                            TEXT PRIMARY KEY,
  workspace_id                  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id                   TEXT REFERENCES customers(id) ON DELETE SET NULL,
  design_specification_id       TEXT NOT NULL,
  pattern_model_id              TEXT,
  cutting_layout_id             TEXT NOT NULL,
  fabric_profile_id             TEXT,

  -- Phase 15 source geometry (immutable reference)
  layout_envelope_cm            NUMERIC(10,2) NOT NULL,
  layout_fabric_width_cm        NUMERIC(8,2) NOT NULL,

  -- Width intelligence (JSON)
  width_profile                 JSONB NOT NULL DEFAULT '{}',

  -- Individual allowances (each stored for independent visibility)
  shrinkage_percentage          NUMERIC(5,2) NOT NULL DEFAULT 0,
  shrinkage_allowance_cm        NUMERIC(8,2) NOT NULL DEFAULT 0,
  shrinkage_source              TEXT NOT NULL DEFAULT 'system_default',
  shrinkage_confidence          TEXT NOT NULL DEFAULT 'low',

  pattern_matching_percentage   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pattern_matching_allowance_cm NUMERIC(8,2) NOT NULL DEFAULT 0,
  pattern_matching_required     BOOLEAN NOT NULL DEFAULT FALSE,
  pattern_matching_verification TEXT NOT NULL DEFAULT 'not_required',

  directional_percentage        NUMERIC(5,2) NOT NULL DEFAULT 0,
  directional_allowance_cm      NUMERIC(8,2) NOT NULL DEFAULT 0,
  directional_required          BOOLEAN NOT NULL DEFAULT FALSE,

  handling_waste_percentage     NUMERIC(5,2) NOT NULL DEFAULT 0,
  handling_waste_allowance_cm   NUMERIC(8,2) NOT NULL DEFAULT 0,

  safety_buffer_percentage      NUMERIC(5,2) NOT NULL DEFAULT 0,
  safety_buffer_cm              NUMERIC(8,2) NOT NULL DEFAULT 0,

  -- Full intermediate breakdown (JSON for auditability)
  breakdown                     JSONB NOT NULL DEFAULT '{}',

  -- AUTHORITATIVE FABRIC REQUIREMENT (the Phase 16 output)
  -- NOT the same as layout_envelope_cm (Phase 15 geometry)
  fabric_required_cm            NUMERIC(10,2) NOT NULL,
  fabric_required_meters        NUMERIC(8,3) NOT NULL,
  fabric_required_yards         NUMERIC(8,3) NOT NULL,

  -- Confidence and assumptions
  confidence                    TEXT NOT NULL DEFAULT 'low'
                                CHECK (confidence IN ('high','medium','low')),
  assumptions                   JSONB NOT NULL DEFAULT '[]',
  manual_verification_required  BOOLEAN NOT NULL DEFAULT FALSE,
  calculation_version           TEXT NOT NULL DEFAULT '1.0.0',

  -- Stale detection
  is_stale                      BOOLEAN NOT NULL DEFAULT FALSE,
  stale_reason                  TEXT,

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fc_workspace       ON fabric_consumptions (workspace_id);
CREATE INDEX idx_fc_customer        ON fabric_consumptions (customer_id);
CREATE INDEX idx_fc_cutting_layout  ON fabric_consumptions (cutting_layout_id);
CREATE INDEX idx_fc_design_spec     ON fabric_consumptions (design_specification_id);

-- ---------------------------------------------------------------------------
-- Purchasing Recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE purchasing_recommendations (
  id                          TEXT PRIMARY KEY,
  fabric_consumption_id       TEXT NOT NULL REFERENCES fabric_consumptions(id) ON DELETE CASCADE,
  workspace_id                TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  status                      TEXT NOT NULL DEFAULT 'unknown'
                              CHECK (status IN ('sufficient','insufficient','exact','excess','unknown')),
  required_cm                 NUMERIC(10,2) NOT NULL,
  available_cm                NUMERIC(10,2),
  shortage_cm                 NUMERIC(10,2),
  excess_cm                   NUMERIC(10,2),
  raw_purchase_needed_cm      NUMERIC(10,2),
  recommended_purchase_cm     NUMERIC(10,2),
  recommended_purchase_meters NUMERIC(8,3),
  recommended_purchase_yards  NUMERIC(8,3),
  purchase_rounding_reason    TEXT,
  purchase_policy             JSONB NOT NULL DEFAULT '{}',
  estimated_cost              NUMERIC(12,2),
  currency                    TEXT,
  reasons                     JSONB NOT NULL DEFAULT '[]',
  assumptions                 JSONB NOT NULL DEFAULT '[]',

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pr_consumption ON purchasing_recommendations (fabric_consumption_id);

-- ---------------------------------------------------------------------------
-- Production Plans
-- ---------------------------------------------------------------------------
CREATE TABLE production_plans (
  id                              TEXT PRIMARY KEY,
  workspace_id                    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id                     TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  design_specification_id         TEXT NOT NULL,
  pattern_model_id                TEXT,
  cutting_layout_id               TEXT NOT NULL,
  fabric_consumption_id           TEXT REFERENCES fabric_consumptions(id) ON DELETE SET NULL,

  -- Time estimates (minutes)
  estimated_total_time_min        INTEGER NOT NULL DEFAULT 0,
  estimated_total_time_expected   INTEGER NOT NULL DEFAULT 0,
  estimated_total_time_max        INTEGER NOT NULL DEFAULT 0,

  -- Status
  status                          TEXT NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','attention_required','ready',
                                    'in_production','quality_control','completed','blocked')),

  -- Readiness (JSON snapshot)
  readiness                       JSONB NOT NULL DEFAULT '{}',

  -- Traceability (JSON)
  traceability                    JSONB NOT NULL DEFAULT '{}',

  notes                           TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pp_workspace    ON production_plans (workspace_id);
CREATE INDEX idx_pp_customer     ON production_plans (customer_id);
CREATE INDEX idx_pp_design_spec  ON production_plans (design_specification_id);
CREATE INDEX idx_pp_status       ON production_plans (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Production Materials
-- ---------------------------------------------------------------------------
CREATE TABLE production_materials (
  id                  TEXT PRIMARY KEY,
  production_plan_id  TEXT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  name                TEXT NOT NULL,
  quantity            NUMERIC(10,3) NOT NULL,
  unit                TEXT NOT NULL,
  source              TEXT NOT NULL DEFAULT 'garment_default',
  confidence          TEXT NOT NULL DEFAULT 'medium',
  required            BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_pm_plan ON production_materials (production_plan_id);

-- ---------------------------------------------------------------------------
-- Cutting Execution Steps
-- ---------------------------------------------------------------------------
CREATE TABLE cutting_execution_steps (
  id                      TEXT PRIMARY KEY,
  production_plan_id      TEXT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  workspace_id            TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  step_order              INTEGER NOT NULL,
  code                    TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  required                BOOLEAN NOT NULL DEFAULT TRUE,
  verification_required   BOOLEAN NOT NULL DEFAULT FALSE,
  related_piece_ids       JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_ces_plan ON cutting_execution_steps (production_plan_id, step_order);

-- ---------------------------------------------------------------------------
-- Production Operations (workflow with dependencies)
-- ---------------------------------------------------------------------------
CREATE TABLE production_operations (
  id                      TEXT PRIMARY KEY,
  production_plan_id      TEXT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  workspace_id            TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code                    TEXT NOT NULL,
  name                    TEXT NOT NULL,
  description             TEXT NOT NULL,
  op_order                INTEGER NOT NULL,
  time_min_minutes        INTEGER NOT NULL DEFAULT 0,
  time_expected_minutes   INTEGER NOT NULL DEFAULT 0,
  time_max_minutes        INTEGER NOT NULL DEFAULT 0,
  time_confidence         TEXT NOT NULL DEFAULT 'medium',
  time_factors            JSONB NOT NULL DEFAULT '[]',
  dependencies            JSONB NOT NULL DEFAULT '[]',  -- array of operation IDs
  required_skills         JSONB NOT NULL DEFAULT '[]',
  requires_customer       BOOLEAN NOT NULL DEFAULT FALSE,
  status                  TEXT NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started','ready','in_progress',
                            'completed','blocked','skipped')),
  blocking_reason         TEXT,
  source                  TEXT NOT NULL DEFAULT 'workflow_rule',
  notes                   TEXT,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ
);

CREATE INDEX idx_po_plan   ON production_operations (production_plan_id, op_order);
CREATE INDEX idx_po_status ON production_operations (production_plan_id, status);

-- ---------------------------------------------------------------------------
-- Quality Checkpoints
-- ---------------------------------------------------------------------------
CREATE TABLE quality_checkpoints (
  id                  TEXT PRIMARY KEY,
  production_plan_id  TEXT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation_id        TEXT,  -- optional link to production_operations.id
  phase               TEXT NOT NULL
                      CHECK (phase IN ('cutting','assembly','fitting','finishing','final')),
  code                TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  required            BOOLEAN NOT NULL DEFAULT TRUE,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','passed','failed','needs_rework','skipped')),
  failure_reason      TEXT,
  notes               TEXT,
  checked_by          TEXT,
  checked_at          TIMESTAMPTZ
);

CREATE INDEX idx_qc_plan  ON quality_checkpoints (production_plan_id);
CREATE INDEX idx_qc_phase ON quality_checkpoints (production_plan_id, phase);
