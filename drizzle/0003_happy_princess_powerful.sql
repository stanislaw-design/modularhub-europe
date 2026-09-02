CREATE TYPE "public"."pergola_subcategory" AS ENUM('bioklimatyczna', 'aluminiowa-stala', 'drewniana', 'wolnostojaca-przyscienna');--> statement-breakpoint
CREATE TYPE "public"."product_family" AS ENUM('dom', 'spa-modulowe', 'pergola');--> statement-breakpoint
CREATE TYPE "public"."spa_subcategory" AS ENUM('sauna', 'jacuzzi', 'wellness-combo');--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "family" "product_family" NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "spa_subcategory" "spa_subcategory";--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "pergola_subcategory" "pergola_subcategory";--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "technical_specs" jsonb;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_family_subcategory_match" CHECK (("product"."category" IS NULL OR "product"."family" = 'dom') AND ("product"."spa_subcategory" IS NULL OR "product"."family" = 'spa-modulowe') AND ("product"."pergola_subcategory" IS NULL OR "product"."family" = 'pergola'));