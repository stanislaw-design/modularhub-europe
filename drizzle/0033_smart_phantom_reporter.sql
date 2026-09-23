ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_price_order";--> statement-breakpoint
ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_price_on_request";--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_price_on_request" CHECK ("product_variant"."price_on_request" = false OR "product_variant"."price_min_cents" IS NULL);
--> statement-breakpoint

-- Spec 0051 AC-3, migracja faza 1: price_sync_trigger przestaje czytać/pisać
-- price_max_cents na obu tabelach, zanim ta kolumna fizycznie zniknie (faza 3,
-- osobna migracja, po pełnym wdrożeniu kodu). CREATE OR REPLACE, sama nazwa
-- funkcji i wyzwalacza bez zmian, więc bez DROP TRIGGER (drizzle/0020_lame_tigra.sql).
CREATE OR REPLACE FUNCTION sync_product_price_from_default_variant() RETURNS trigger AS $$
DECLARE
  v_product_id uuid;
  v_min integer;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT price_min_cents
    INTO v_min
    FROM product_variant
   WHERE product_id = v_product_id
     AND is_default = true
     AND deleted_at IS NULL
   LIMIT 1;

  UPDATE product
     SET price_min_cents = v_min,
         updated_at = now()
   WHERE id = v_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;