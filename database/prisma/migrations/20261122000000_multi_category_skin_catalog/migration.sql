-- Add design_style to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "design_style" VARCHAR(50);

-- Populate design_style from previous category names for existing products
UPDATE "products" p
SET "design_style" = c."name"
FROM "categories" c
WHERE p."category_id" = c."id" AND p."design_style" IS NULL;

-- Seed the 8 device categories for all shops
DO $$
DECLARE
    s RECORD;
    laptop_cat_id UUID;
BEGIN
    FOR s IN SELECT id FROM shops LOOP
        -- 1. Laptop Skins
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Laptop Skins', 'laptop-skins', 'Precision die-cut skins engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.', 'Laptop', 1, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Laptop Skins', "icon_name" = 'Laptop', "sort_order" = 1, "is_active" = true
        RETURNING "id" INTO laptop_cat_id;

        IF laptop_cat_id IS NULL THEN
            SELECT "id" INTO laptop_cat_id FROM "categories" WHERE "shop_id" = s.id AND "slug" = 'laptop-skins';
        END IF;

        -- 2. Mobile Skin
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Mobile Skin', 'mobile-skin', 'Ultra-thin precision wraps engineered with authentic 3M materials. Protect and personalize your smartphone.', 'Smartphone', 2, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Mobile Skin', "icon_name" = 'Smartphone', "sort_order" = 2, "is_active" = true;

        -- 3. Tablet Skin
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Tablet Skin', 'tablet-skin', 'Full-coverage premium wraps engineered with authentic 3M materials. Guard your tablet with style.', 'Tablet', 3, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Tablet Skin', "icon_name" = 'Tablet', "sort_order" = 3, "is_active" = true;

        -- 4. Camera Skin
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Camera Skin', 'camera-skin', 'Textured protective wraps engineered with authentic 3M materials. Enhanced grip and defense for camera bodies.', 'Camera', 4, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Camera Skin', "icon_name" = 'Camera', "sort_order" = 4, "is_active" = true;

        -- 5. Camera Lens Skin
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Camera Lens Skin', 'camera-lens-skin', 'Precision-cut lens barrel wraps engineered with authentic 3M materials. Protect your glass bodies from scratches and wear.', 'Cylinder', 5, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Camera Lens Skin', "icon_name" = 'Cylinder', "sort_order" = 5, "is_active" = true;

        -- 6. Card Skin
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Card Skin', 'card-skin', 'Ultra-slim protective card wraps engineered with authentic 3M materials. Customize your payment and transit cards.', 'CreditCard', 6, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Card Skin', "icon_name" = 'CreditCard', "sort_order" = 6, "is_active" = true;

        -- 7. Gaming Skin
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'Gaming Skin', 'gaming-skin', 'High-durability console and controller skins engineered with authentic 3M materials. Level up your gaming setup.', 'Gamepad2', 7, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'Gaming Skin', "icon_name" = 'Gamepad2', "sort_order" = 7, "is_active" = true;

        -- 8. DJI Skins
        INSERT INTO "categories" ("id", "shop_id", "name", "slug", "description", "icon_name", "sort_order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid(), s.id, 'DJI Skins', 'dji-skins', 'Precision-cut drone and controller wraps engineered with authentic 3M materials. High visibility and maximum style in flight.', 'Drone', 8, true, now(), now())
        ON CONFLICT ("shop_id", "slug") DO UPDATE SET "name" = 'DJI Skins', "icon_name" = 'Drone', "sort_order" = 8, "is_active" = true;

        -- Ensure all existing products for this shop are assigned to Laptop Skins category
        IF laptop_cat_id IS NOT NULL THEN
            UPDATE "products" SET "category_id" = laptop_cat_id WHERE "shop_id" = s.id;
        END IF;

        -- Deactivate old style categories so only the 8 device categories appear as active categories
        UPDATE "categories" SET "is_active" = false
        WHERE "shop_id" = s.id AND "slug" IN ('anime', 'cars', 'travel', 'gaming', 'aesthetic', 'abstract');
    END LOOP;
END $$;
