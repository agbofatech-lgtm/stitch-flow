-- Phase 7: customer experience, CRM, referrals, appointments, fittings.
-- Additive + idempotent. Workspace-scoped (tenant-safe). No destructive ops.

-- ============ CRM: structured customer notes ============
CREATE TABLE IF NOT EXISTS customer_notes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id),
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (
    category IN ('GENERAL','MEASUREMENT','FIT','STYLE','COMMUNICATION','ORDER','FITTING','SERVICE')
  ),
  note TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'staff' CHECK (visibility IN ('staff','all')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_customer_notes_ws_customer
  ON customer_notes(workspace_id, customer_id, created_at DESC);

-- ============ CRM: extensible customer preferences ============
CREATE TABLE IF NOT EXISTS customer_preferences (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  preferred_language TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('phone','email','whatsapp','sms','none')),
  preferred_appointment_times TEXT,
  style_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  communication_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Consent is explicit: a customer existing is NEVER consent (Step 13).
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, customer_id)
);

-- ============ Customer timeline (business events, per-customer) ============
CREATE TABLE IF NOT EXISTS customer_timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'CUSTOMER_CREATED','CUSTOMER_UPDATED','MEASUREMENT_UPDATED',
      'ORDER_CREATED','ORDER_STATUS_CHANGED',
      'APPOINTMENT_CREATED','APPOINTMENT_RESCHEDULED','APPOINTMENT_COMPLETED',
      'FITTING_CREATED','FITTING_COMPLETED',
      'PAYMENT_RECORDED',
      'REFERRAL_CREATED','REFERRAL_CONVERTED',
      'CUSTOMER_MESSAGE_SENT','CUSTOMER_MESSAGE_RECEIVED',
      'CUSTOMER_FEEDBACK_SUBMITTED'
    )
  ),
  actor_user_id UUID REFERENCES users(id),
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeline_ws_customer_time
  ON customer_timeline_entries(workspace_id, customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_ws_type
  ON customer_timeline_entries(workspace_id, event_type, occurred_at DESC);

-- ============ Referral engine ============
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  referrer_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  referred_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (
    status IN ('CREATED','INVITED','REGISTERED','CONVERTED','REWARDED','CANCELLED')
  ),
  client_mutation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Idempotent attribution: one referral per workspace + mutation key, and
-- referral codes are unique per workspace.
CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_ws_cmid
  ON referrals(workspace_id, client_mutation_id) WHERE client_mutation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_ws_code
  ON referrals(workspace_id, referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_ws_status
  ON referrals(workspace_id, status, created_at DESC);
-- A referred customer can only be attributed once per workspace.
CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_ws_referred
  ON referrals(workspace_id, referred_customer_id) WHERE referred_customer_id IS NOT NULL;

-- ============ Appointments ============
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_member_id UUID REFERENCES users(id),
  appointment_type TEXT NOT NULL DEFAULT 'OTHER' CHECK (
    appointment_type IN ('CONSULTATION','MEASUREMENT','FITTING','PICKUP','DELIVERY','ALTERATION','OTHER')
  ),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (
    status IN ('SCHEDULED','CONFIRMED','RESCHEDULED','COMPLETED','CANCELLED','NO_SHOW')
  ),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  client_mutation_id TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (end_at > start_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_ws_cmid
  ON appointments(workspace_id, client_mutation_id) WHERE client_mutation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_ws_start
  ON appointments(workspace_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_ws_customer
  ON appointments(workspace_id, customer_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_ws_status
  ON appointments(workspace_id, status, start_at);

-- ============ Fittings ============
CREATE TABLE IF NOT EXISTS fittings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_member_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING','IN_FITTING','ALTERATIONS_REQUIRED','READY','COMPLETED')
  ),
  alterations_required BOOLEAN NOT NULL DEFAULT FALSE,
  alterations_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_fittings_ws_customer
  ON fittings(workspace_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fittings_ws_order
  ON fittings(workspace_id, order_id);
CREATE INDEX IF NOT EXISTS idx_fittings_ws_status
  ON fittings(workspace_id, status);

-- ============ Fit observations (observed business data — Step 18) ============
CREATE TABLE IF NOT EXISTS fit_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fitting_id TEXT NOT NULL REFERENCES fittings(id) ON DELETE CASCADE,
  observation_code TEXT NOT NULL CHECK (
    observation_code IN (
      'tight_chest','loose_waist','short_sleeve','long_sleeve','shoulder_issue',
      'collar_issue','trouser_length','seat_issue','rise_issue','other'
    )
  ),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','moderate','major')),
  note TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fit_observations_ws_fitting
  ON fit_observations(workspace_id, fitting_id);
CREATE INDEX IF NOT EXISTS idx_fit_observations_ws_code
  ON fit_observations(workspace_id, observation_code);
