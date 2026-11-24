-- SkinLab initial schema for Supabase PostgreSQL.
-- Image binaries live in Cloudflare R2; this database stores object keys only.

CREATE TYPE profile_role AS ENUM ('SHOP_ADMIN', 'PLATFORM_ADMIN');
CREATE TYPE product_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE, description TEXT, logo_url TEXT,
  contact_email VARCHAR(255), contact_phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  full_name VARCHAR(120), email VARCHAR(255) NOT NULL,
  role profile_role NOT NULL DEFAULT 'SHOP_ADMIN', is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_shop_check CHECK
    ((role = 'PLATFORM_ADMIN' AND shop_id IS NULL) OR (role = 'SHOP_ADMIN' AND shop_id IS NOT NULL))
);
CREATE INDEX idx_profiles_shop_id ON profiles(shop_id);
CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL, slug VARCHAR(80) NOT NULL, description TEXT, image_url TEXT,
  icon_name VARCHAR(50), card_color VARCHAR(20), accent_color VARCHAR(20), text_color VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true, sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT uq_categories_shop_slug UNIQUE(shop_id, slug),
  CONSTRAINT uq_categories_shop_name UNIQUE(shop_id, name),
  CONSTRAINT uq_categories_id_shop UNIQUE(id, shop_id)
);
CREATE INDEX idx_categories_shop_id ON categories(shop_id);
CREATE INDEX idx_categories_shop_active_sort ON categories(shop_id, is_active, sort_order);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID NOT NULL, title VARCHAR(200) NOT NULL, slug VARCHAR(220) NOT NULL,
  design_number VARCHAR(20) NOT NULL, description TEXT NOT NULL,
  status product_status NOT NULL DEFAULT 'PUBLISHED', is_featured BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false, is_new BOOLEAN NOT NULL DEFAULT false,
  badge VARCHAR(50), finish VARCHAR(50), material VARCHAR(200), dimensions VARCHAR(100),
  laptop_compatibility TEXT[] NOT NULL DEFAULT '{}', price NUMERIC(10,2), original_price NUMERIC(10,2),
  rating NUMERIC(3,2) DEFAULT 5.0, review_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT fk_products_category_shop FOREIGN KEY(category_id, shop_id)
    REFERENCES categories(id, shop_id) ON DELETE RESTRICT,
  CONSTRAINT uq_products_shop_design_number UNIQUE(shop_id, design_number),
  CONSTRAINT uq_products_shop_slug UNIQUE(shop_id, slug),
  CONSTRAINT uq_products_id_shop UNIQUE(id, shop_id)
);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_shop_status ON products(shop_id, status);
CREATE INDEX idx_products_shop_featured ON products(shop_id, is_featured);
CREATE INDEX idx_products_created_by ON products(created_by);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  original_key TEXT NOT NULL, preview_key TEXT, thumbnail_key TEXT, alt_text VARCHAR(255),
  is_primary BOOLEAN NOT NULL DEFAULT false, sort_order INT NOT NULL DEFAULT 0,
  file_size INT NOT NULL, mime_type VARCHAR(50) NOT NULL, width INT, height INT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_product_sort ON product_images(product_id, sort_order);
CREATE INDEX idx_product_images_product_primary ON product_images(product_id, is_primary);
CREATE UNIQUE INDEX uq_product_images_single_primary ON product_images(product_id) WHERE is_primary;

-- Serialize inserts/updates per product so concurrent requests cannot exceed 8.
CREATE FUNCTION enforce_product_image_limit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM products WHERE id = NEW.product_id FOR UPDATE;
  IF (SELECT count(*) FROM product_images WHERE product_id = NEW.product_id
      AND id IS DISTINCT FROM NEW.id) >= 8 THEN
    RAISE EXCEPTION 'A product can have a maximum of 8 images' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_enforce_product_image_limit BEFORE INSERT OR UPDATE OF product_id
ON product_images FOR EACH ROW EXECUTE FUNCTION enforce_product_image_limit();

-- updated_at is maintained for SQL clients as well as Prisma clients.
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- SECURITY DEFINER helpers bypass profiles RLS to avoid policy recursion.
CREATE FUNCTION current_profile_role() RETURNS profile_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_active LIMIT 1
$$;
CREATE FUNCTION current_profile_shop_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.shop_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_active LIMIT 1
$$;
REVOKE ALL ON FUNCTION current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION current_profile_shop_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_profile_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION current_profile_shop_id() TO anon, authenticated;

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Public browsing is restricted to active shops, active categories and published products.
CREATE POLICY shops_public_read ON shops FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY shops_platform_manage ON shops FOR ALL TO authenticated
  USING ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN')
  WITH CHECK ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN');
CREATE POLICY profiles_admin_read ON profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.current_profile_role()) = 'PLATFORM_ADMIN'
    OR (shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'));
CREATE POLICY profiles_platform_manage ON profiles FOR ALL TO authenticated
  USING ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN')
  WITH CHECK ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN');
CREATE POLICY categories_public_read ON categories FOR SELECT TO anon, authenticated
  USING (is_active AND EXISTS (SELECT 1 FROM shops s WHERE s.id = categories.shop_id AND s.is_active));
CREATE POLICY categories_shop_manage ON categories FOR ALL TO authenticated
  USING ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN'
    OR (shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'))
  WITH CHECK ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN'
    OR (shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'));
CREATE POLICY products_public_read ON products FOR SELECT TO anon, authenticated
  USING (status = 'PUBLISHED' AND EXISTS (SELECT 1 FROM shops s WHERE s.id = products.shop_id AND s.is_active)
    AND EXISTS (SELECT 1 FROM categories c WHERE c.id = products.category_id AND c.shop_id = products.shop_id AND c.is_active));
CREATE POLICY products_shop_manage ON products FOR ALL TO authenticated
  USING ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN'
    OR (shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'))
  WITH CHECK ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN'
    OR (shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'));
CREATE POLICY product_images_public_read ON product_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM products p JOIN shops s ON s.id = p.shop_id
    JOIN categories c ON c.id = p.category_id AND c.shop_id = p.shop_id
    WHERE p.id = product_images.product_id AND p.status = 'PUBLISHED' AND s.is_active AND c.is_active));
CREATE POLICY product_images_shop_manage ON product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND
    ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN' OR
     (p.shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'))))
  WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND
    ((SELECT public.current_profile_role()) = 'PLATFORM_ADMIN' OR
     (p.shop_id = (SELECT public.current_profile_shop_id()) AND (SELECT public.current_profile_role()) = 'SHOP_ADMIN'))));

-- Supabase grants are required in addition to RLS policies.
GRANT SELECT ON shops, categories, products, product_images TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shops, profiles, categories, products, product_images TO authenticated;
