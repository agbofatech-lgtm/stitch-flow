CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS order_production_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  stage_label TEXT NOT NULL,
  sequence_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  skipped_at TIMESTAMPTZ NULL,
  reopened_at TIMESTAMPTZ NULL,
  notes TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_production_stages_status_check
    CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  CONSTRAINT order_production_stages_stage_code_check
    CHECK (
      stage_code IN (
        'measurement',
        'cutting',
        'sewing',
        'embroidery',
        'first_fitting',
        'second_fitting',
        'final_press',
        'ready',
        'delivered'
      )
    ),
  CONSTRAINT order_production_stages_unique_order_stage UNIQUE (order_id, stage_code),
  CONSTRAINT order_production_stages_unique_order_sequence UNIQUE (order_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS order_production_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES order_production_stages(id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT NULL,
  to_status TEXT NULL,
  note TEXT NULL,
  actor_user_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_production_stage_events_action_check
    CHECK (action IN ('start', 'complete', 'skip', 'reopen', 'note')),
  CONSTRAINT order_production_stage_events_from_status_check
    CHECK (from_status IS NULL OR from_status IN ('pending', 'active', 'completed', 'skipped')),
  CONSTRAINT order_production_stage_events_to_status_check
    CHECK (to_status IS NULL OR to_status IN ('pending', 'active', 'completed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_order_production_stages_order_id
  ON order_production_stages(order_id);

CREATE INDEX IF NOT EXISTS idx_order_production_stages_order_status
  ON order_production_stages(order_id, status);

CREATE INDEX IF NOT EXISTS idx_order_production_stage_events_order_id
  ON order_production_stage_events(order_id);

CREATE INDEX IF NOT EXISTS idx_order_production_stage_events_stage_id
  ON order_production_stage_events(stage_id);