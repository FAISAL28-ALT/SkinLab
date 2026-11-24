-- Retire PLATFORM_ADMIN role: Enforce that all profiles must have SHOP_ADMIN role and a valid shop_id.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_shop_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_shop_check CHECK (role = 'SHOP_ADMIN'::profile_role AND shop_id IS NOT NULL);
