-- Existing deployments may already have the original 24-hour check constraint.
-- Rotate tokens without extending the absolute session expiry to 48 hours.
ALTER TABLE auth_sessions
  DROP CONSTRAINT IF EXISTS ck_auth_sessions_absolute_expiry;
ALTER TABLE auth_sessions
  ADD CONSTRAINT ck_auth_sessions_absolute_expiry
  CHECK (expires_at = created_at + interval '48 hours');
