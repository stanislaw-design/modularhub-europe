ALTER TABLE "product" DROP CONSTRAINT "product_family_subcategory_match";--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "family" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."product_family";--> statement-breakpoint
CREATE TYPE "public"."product_family" AS ENUM('dom', 'spa-modulowe', 'kontenery-modulowe');--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "family" SET DATA TYPE "public"."product_family" USING "family"::"public"."product_family";--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_family_subcategory_match" CHECK (("product"."category" IS NULL OR "product"."family" = 'dom') AND ("product"."spa_subcategory" IS NULL OR "product"."family" = 'spa-modulowe') AND ("product"."container_subcategory" IS NULL OR "product"."family" = 'kontenery-modulowe'));