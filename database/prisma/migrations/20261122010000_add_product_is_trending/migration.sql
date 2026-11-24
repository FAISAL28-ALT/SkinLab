-- AlterTable: Add is_trending column to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_trending" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_products_shop_trending" ON "products"("shop_id", "is_trending");

-- Mark the existing 6 homepage trending designs as trending
UPDATE "products"
SET "is_trending" = true
WHERE "design_number" IN ('013', '021', '024', '009', '028', '007', '13', '21', '24', '9', '28', '7');
