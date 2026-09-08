CREATE TYPE "public"."product_translation_locale" AS ENUM('en', 'nl');--> statement-breakpoint
CREATE TABLE "product_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_translation" ADD CONSTRAINT "product_translation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_translation_product_id_locale_idx" ON "product_translation" USING btree ("product_id","locale");