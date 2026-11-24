-- App-managed auth cutover. Existing profile IDs, shop links, products, and inventory remain intact.
-- Profiles become standalone app identities so new Shop Owners do not need auth.users rows.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Disable direct Supabase Data API access to application records. The Express API
-- uses the database connection and performs its own JWT and tenant checks.
REVOKE ALL ON TABLE shops, profiles, categories, products, product_images FROM PUBLIC, anon, authenticated;

CREATE TABLE auth_credentials (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  login_id VARCHAR(80) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT uq_auth_credentials_login_id UNIQUE (login_id),
  CONSTRAINT ck_auth_credentials_login_id CHECK (login_id = lower(trim(login_id)) AND length(login_id) BETWEEN 3 AND 80)
);
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ(6) NOT NULL,
  last_used_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ(6),
  user_agent VARCHAR(500),
  ip_address VARCHAR(64),
  CONSTRAINT ck_auth_sessions_absolute_expiry CHECK (expires_at = created_at + interval '48 hours')
);
CREATE INDEX idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at, expires_at);
CREATE INDEX idx_auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE auth_refresh_token_history (
  token_hash CHAR(64) PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_refresh_history_session ON auth_refresh_token_history(session_id);
CREATE TABLE auth_login_throttles (
  key CHAR(64) PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ(6),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_login_throttle_lock ON auth_login_throttles(locked_until);
REVOKE ALL ON TABLE auth_credentials, auth_sessions, auth_refresh_token_history, auth_login_throttles FROM PUBLIC, anon, authenticated;
