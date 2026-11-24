-- Shared authentication throttling buckets; the API server is the only writer.
CREATE TABLE IF NOT EXISTS auth_rate_limit_buckets (
  bucket_key VARCHAR(64) NOT NULL,
  bucket_start TIMESTAMPTZ(6) NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_buckets_expiry
  ON auth_rate_limit_buckets (expires_at);
REVOKE ALL ON TABLE auth_rate_limit_buckets FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(40) NOT NULL,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_events_user_created
  ON auth_audit_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_events_created
  ON auth_audit_events (created_at);
REVOKE ALL ON TABLE auth_audit_events FROM PUBLIC, anon, authenticated;

-- Client sessions can read authorized profiles but cannot change roles,
-- shop assignment, or activation state through the Supabase Data API.
DROP POLICY IF EXISTS profiles_admin_read ON profiles;
DROP POLICY IF EXISTS profiles_platform_manage ON profiles;
CREATE POLICY profiles_authorized_read ON profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.current_profile_role()) = 'PLATFORM_ADMIN'
    OR (
      shop_id = (SELECT public.current_profile_shop_id())
      AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'
    )
  );
REVOKE INSERT, UPDATE, DELETE ON TABLE profiles FROM anon, authenticated;
GRANT SELECT ON TABLE profiles TO authenticated;
