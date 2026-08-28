-- Phase 9 — Commercial Identity, Customer Onboarding & Authentication.
--
-- 1) Optional E.164 phone identity on users (canonical form, e.g. +233241234567).
--    NULL for email-only accounts. Uniqueness enforced at the database level
--    (frontend validation alone is insufficient per product requirements).
-- 2) Case-insensitive email identity: EMAIL@EXAMPLE.COM and email@example.com
--    can never become two accounts. The legacy exact-match UNIQUE constraint
--    remains for compatibility; the functional index closes the case gap.
-- 3) Password-recovery infrastructure: single-use, expiring reset tokens
--    stored ONLY as sha256 hashes (same discipline as refresh_tokens).

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- One identity per phone number (NULLs allowed for email-only accounts).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone
  ON users (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Case-insensitive email uniqueness (deleted users excluded, matching the
-- repository's deleted_at IS NULL lookup semantics).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON users (LOWER(email))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- sha256 hex of the single-use secret. The secret itself is never stored.
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
  ON password_reset_tokens (expires_at);
