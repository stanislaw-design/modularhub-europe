CREATE TABLE "product_variant_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"scope_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "simplified_permit_eligible" boolean;--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "room_layout" jsonb;--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "faq" jsonb;--> statement-breakpoint
ALTER TABLE "product_variant_translation" ADD CONSTRAINT "product_variant_translation_product_variant_id_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_translation_variant_id_locale_idx" ON "product_variant_translation" USING btree ("product_variant_id","locale");
--> statement-breakpoint
-- Backfill (spec 0045 AC-15, Migration plan phase 2, hand-enriched beyond drizzle-kit's
-- DSL per lib/db/AGENTS.md): every product (draft or published) with a filled
-- house_price_min_cents and no product_variant row yet gets exactly one default
-- variant, so the price stays visible after the old flat pricing step is retired.
-- A product with house_price_min_cents = null is deliberately skipped (AC-15) —
-- giving it a priceless default variant would violate AC-4's publish gate with
-- retroactive force; it is left for the producer to fill in the new "Warianty i
-- cennik" step. sort_order = 0 keeps it first among any later, producer-added
-- variants.
INSERT INTO "product_variant" ("id", "product_id", "completion_standard", "price_min_cents", "price_max_cents", "is_default", "sort_order")
SELECT gen_random_uuid(), p."id", COALESCE(p."completion_standard", 'deweloperski'), p."house_price_min_cents", p."house_price_max_cents", true, 0
FROM "product" p
WHERE p."house_price_min_cents" IS NOT NULL
  AND p."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "product_variant" pv WHERE pv."product_id" = p."id" AND pv."deleted_at" IS NULL
  );