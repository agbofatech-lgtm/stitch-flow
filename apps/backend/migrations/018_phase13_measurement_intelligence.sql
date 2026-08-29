-- Phase 13 — Measurement Intelligence foundation.
-- Canonical architecture: MeasurementDefinition registry (global),
-- MeasurementProfile -> MeasurementSet -> MeasurementValue, immutable
-- version lineage, workspace isolation on every owned row.
-- IDs are TEXT so clients can generate stable offline identities.

CREATE TABLE measurement_definitions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('body','garment','pattern','derived')),
  canonical_unit TEXT NOT NULL DEFAULT 'cm' CHECK (canonical_unit IN ('cm','inch')),
  data_type TEXT NOT NULL DEFAULT 'numeric' CHECK (data_type = 'numeric'),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  validation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  applicable_garment_types TEXT[] NOT NULL DEFAULT '{}',
  required_for TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_measurement_definitions_code UNIQUE (code)
);

CREATE TABLE measurement_profiles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_taken DATE NOT NULL DEFAULT CURRENT_DATE,
  version INTEGER NOT NULL DEFAULT 1,
  parent_profile_id TEXT REFERENCES measurement_profiles(id) ON DELETE SET NULL,
  supersedes_profile_id TEXT REFERENCES measurement_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','VALIDATED','ACTIVE','SUPERSEDED','ARCHIVED')),
  notes TEXT NOT NULL DEFAULT '',
  qualitative_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_measurement_profiles_customer_version UNIQUE (customer_id, version),
  CONSTRAINT chk_profile_observations_array
    CHECK (jsonb_typeof(qualitative_observations) = 'array')
);

CREATE INDEX idx_measurement_profiles_customer ON measurement_profiles (customer_id, created_at DESC);
CREATE INDEX idx_measurement_profiles_workspace ON measurement_profiles (workspace_id);
CREATE INDEX idx_measurement_profiles_status ON measurement_profiles (customer_id, status);

CREATE TABLE measurement_sets (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES measurement_profiles(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('body','garment','pattern_reserved')),
  garment_type TEXT,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','VALIDATED','ACTIVE','SUPERSEDED','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sets_garment_type_required
    CHECK ((category = 'garment') = (garment_type IS NOT NULL))
);

CREATE UNIQUE INDEX uq_measurement_sets_profile_scope
  ON measurement_sets (profile_id, category, COALESCE(garment_type, ''));
CREATE INDEX idx_measurement_sets_profile ON measurement_sets (profile_id);
CREATE INDEX idx_measurement_sets_workspace ON measurement_sets (workspace_id);

CREATE TABLE measurement_values (
  id TEXT PRIMARY KEY,
  measurement_set_id TEXT NOT NULL REFERENCES measurement_sets(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES measurement_definitions(id),
  canonical_value_cm NUMERIC(10,4) NOT NULL CHECK (canonical_value_cm > 0),
  original_value NUMERIC(10,4) NOT NULL CHECK (original_value > 0),
  original_unit TEXT NOT NULL CHECK (original_unit IN ('cm','inch')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','historical_copy','imported','derived','estimated',
                      'ai_suggested','computer_vision','body_scan')),
  confidence TEXT NOT NULL DEFAULT 'unverified'
    CHECK (confidence IN ('verified','unverified','estimated')),
  notes TEXT NOT NULL DEFAULT '',
  override_reason TEXT,
  overridden_by TEXT,
  overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_measurement_values_set_definition UNIQUE (measurement_set_id, definition_id)
);

CREATE INDEX idx_measurement_values_set ON measurement_values (measurement_set_id);
CREATE INDEX idx_measurement_values_definition ON measurement_values (definition_id);
CREATE INDEX idx_measurement_values_workspace ON measurement_values (workspace_id);

INSERT INTO measurement_definitions
  (id, code, label, description, category, canonical_unit, data_type,
   display_order, is_active, validation_metadata, applicable_garment_types, required_for)
VALUES
  ('mdef-bust_circumference','bust_circumference','Bust / Chest','Bust / Chest measurement.','body','cm','numeric',10,true,'{"softMinCm":60,"softMaxCm":180}','{}','{body}'),
  ('mdef-waist_circumference','waist_circumference','Waist','Waist measurement.','body','cm','numeric',20,true,'{"softMinCm":40,"softMaxCm":180}','{}','{body}'),
  ('mdef-hip_circumference','hip_circumference','Hip','Hip measurement.','body','cm','numeric',30,true,'{"softMinCm":50,"softMaxCm":200}','{}','{body}'),
  ('mdef-neck_circumference','neck_circumference','Neck','Neck measurement.','body','cm','numeric',40,true,'{"softMinCm":25,"softMaxCm":60}','{}','{body}'),
  ('mdef-shoulder_width','shoulder_width','Shoulder Width','Shoulder Width measurement.','body','cm','numeric',50,true,'{"softMinCm":25,"softMaxCm":70}','{}','{body}'),
  ('mdef-sleeve_length','sleeve_length','Sleeve Length','Sleeve Length measurement.','body','cm','numeric',60,true,'{"softMinCm":30,"softMaxCm":95}','{}',NULL),
  ('mdef-inseam_length','inseam_length','Inseam','Inseam measurement.','body','cm','numeric',70,true,'{"softMinCm":40,"softMaxCm":110}','{}',NULL),
  ('mdef-outseam_length','outseam_length','Outseam','Outseam measurement.','body','cm','numeric',80,true,'{"softMinCm":60,"softMaxCm":130}','{}',NULL),
  ('mdef-front_length','front_length','Front Length','Front Length measurement.','body','cm','numeric',90,true,'{"softMinCm":30,"softMaxCm":90}','{}',NULL),
  ('mdef-back_length','back_length','Back Length','Back Length measurement.','body','cm','numeric',100,true,'{"softMinCm":30,"softMaxCm":90}','{}',NULL),
  ('mdef-armhole_depth','armhole_depth','Armhole Depth','Armhole Depth measurement.','body','cm','numeric',110,true,'{"softMinCm":15,"softMaxCm":45}','{}',NULL),
  ('mdef-bicep_circumference','bicep_circumference','Bicep','Bicep measurement.','body','cm','numeric',120,true,'{"softMinCm":18,"softMaxCm":60}','{}',NULL),
  ('mdef-wrist_circumference','wrist_circumference','Wrist','Wrist measurement.','body','cm','numeric',130,true,'{"softMinCm":12,"softMaxCm":35}','{}',NULL),
  ('mdef-thigh_circumference','thigh_circumference','Thigh','Thigh measurement.','body','cm','numeric',140,true,'{"softMinCm":30,"softMaxCm":110}','{}',NULL),
  ('mdef-calf_circumference','calf_circumference','Calf','Calf measurement.','body','cm','numeric',150,true,'{"softMinCm":20,"softMaxCm":80}','{}',NULL),
  ('mdef-ankle_circumference','ankle_circumference','Ankle','Ankle measurement.','body','cm','numeric',160,true,'{"softMinCm":15,"softMaxCm":50}','{}',NULL),
  ('mdef-collar_circumference','collar_circumference','Collar','Collar measurement.','garment','cm','numeric',170,true,'{"softMinCm":25,"softMaxCm":60}','{shirt}','{shirt}'),
  ('mdef-garment_shoulder_width','garment_shoulder_width','Shoulder (garment)','Shoulder (garment) measurement.','garment','cm','numeric',180,true,'{"softMinCm":25,"softMaxCm":70}','{shirt,jacket,kaftan}','{shirt,jacket}'),
  ('mdef-garment_chest_circumference','garment_chest_circumference','Chest (garment)','Chest (garment) measurement.','garment','cm','numeric',190,true,'{"softMinCm":60,"softMaxCm":200}','{shirt,jacket,kaftan,dress}','{shirt,jacket,dress}'),
  ('mdef-garment_waist_circumference','garment_waist_circumference','Waist (garment)','Waist (garment) measurement.','garment','cm','numeric',200,true,'{"softMinCm":40,"softMaxCm":200}','{shirt,trouser,kaftan,dress,jacket}','{shirt,trouser}'),
  ('mdef-garment_sleeve_length','garment_sleeve_length','Sleeve Length (garment)','Sleeve Length (garment) measurement.','garment','cm','numeric',210,true,'{"softMinCm":30,"softMaxCm":95}','{shirt,jacket}','{shirt}'),
  ('mdef-garment_length','garment_length','Garment Length','Garment Length measurement.','garment','cm','numeric',220,true,'{"softMinCm":40,"softMaxCm":180}','{shirt,kaftan,dress,jacket}','{shirt,kaftan,dress}'),
  ('mdef-cuff_circumference','cuff_circumference','Cuff','Cuff measurement.','garment','cm','numeric',230,true,'{"softMinCm":15,"softMaxCm":45}','{shirt,jacket}','{shirt}'),
  ('mdef-bicep_garment','bicep_garment','Bicep (garment)','Bicep (garment) measurement.','garment','cm','numeric',240,true,'{}','{shirt,jacket}',NULL),
  ('mdef-wrist_garment','wrist_garment','Wrist (garment)','Wrist (garment) measurement.','garment','cm','numeric',250,true,'{}','{shirt}',NULL),
  ('mdef-armhole_depth_garment','armhole_depth_garment','Armhole (garment)','Armhole (garment) measurement.','garment','cm','numeric',260,true,'{}','{shirt,jacket,dress}',NULL),
  ('mdef-garment_hip_circumference','garment_hip_circumference','Hip (garment)','Hip (garment) measurement.','garment','cm','numeric',270,true,'{"softMinCm":50,"softMaxCm":220}','{trouser,dress}','{trouser}'),
  ('mdef-garment_inseam_length','garment_inseam_length','Inseam (garment)','Inseam (garment) measurement.','garment','cm','numeric',280,true,'{"softMinCm":40,"softMaxCm":110}','{trouser}','{trouser}'),
  ('mdef-garment_outseam_length','garment_outseam_length','Outseam (garment)','Outseam (garment) measurement.','garment','cm','numeric',290,true,'{"softMinCm":60,"softMaxCm":130}','{trouser}','{trouser}'),
  ('mdef-thigh_garment','thigh_garment','Thigh (garment)','Thigh (garment) measurement.','garment','cm','numeric',300,true,'{}','{trouser}',NULL),
  ('mdef-knee_circumference','knee_circumference','Knee','Knee measurement.','garment','cm','numeric',310,true,'{}','{trouser}',NULL),
  ('mdef-calf_garment','calf_garment','Calf (garment)','Calf (garment) measurement.','garment','cm','numeric',320,true,'{}','{trouser}',NULL),
  ('mdef-hem_width','hem_width','Hem Width','Hem Width measurement.','garment','cm','numeric',330,true,'{}','{trouser}',NULL),
  ('mdef-kaftan_sleeve_length','kaftan_sleeve_length','Sleeve (kaftan)','Sleeve (kaftan) measurement.','garment','cm','numeric',340,true,'{}','{kaftan}',NULL),
  ('mdef-dress_hip_circumference','dress_hip_circumference','Hip (dress)','Hip (dress) measurement.','garment','cm','numeric',350,true,'{}','{dress}',NULL),
  ('mdef-jacket_length','jacket_length','Jacket Length','Jacket Length measurement.','garment','cm','numeric',360,true,'{}','{jacket}',NULL),
  ('mdef-pattern_front_bodice_length','pattern_front_bodice_length','Front bodice length (pattern)','Reserved pattern contract — derived by future Pattern Intelligence.','pattern','cm','numeric',370,true,'{}','{}',NULL),
  ('mdef-pattern_back_bodice_length','pattern_back_bodice_length','Back bodice length (pattern)','Reserved pattern contract — derived by future Pattern Intelligence.','pattern','cm','numeric',380,true,'{}','{}',NULL);
