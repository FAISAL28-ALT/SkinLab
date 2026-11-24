-- Create functional indexes for fast case-insensitive authentication lookups
CREATE INDEX IF NOT EXISTS idx_profiles_lower_email ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_auth_credentials_lower_login_id ON public.auth_credentials (LOWER(login_id));
