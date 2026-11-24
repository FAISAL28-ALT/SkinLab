-- The live audit found no products exceeding four images before this change.
CREATE OR REPLACE FUNCTION enforce_product_image_limit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM products WHERE id = NEW.product_id FOR UPDATE;
  IF (SELECT count(*) FROM product_images WHERE product_id = NEW.product_id
      AND id IS DISTINCT FROM NEW.id) >= 4 THEN
    RAISE EXCEPTION 'A product can have a maximum of 4 images' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
