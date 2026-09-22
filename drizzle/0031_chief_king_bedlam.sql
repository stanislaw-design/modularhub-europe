ALTER TYPE "public"."document_purpose" ADD VALUE 'product_sales_pdf';--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "client_requirements" jsonb;--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "client_requirements" jsonb;--> statement-breakpoint
ALTER TABLE "product_variant" ADD COLUMN "price_on_request" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variant" ADD COLUMN "excluded_scope" text;--> statement-breakpoint
ALTER TABLE "product_variant_translation" ADD COLUMN "excluded_scope" text;--> statement-breakpoint
CREATE UNIQUE INDEX "document_one_sales_pdf_per_product" ON "document" USING btree ("product_id") WHERE "document"."purpose" = 'product_sales_pdf' AND "document"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_price_on_request" CHECK ("product_variant"."price_on_request" = false OR ("product_variant"."price_min_cents" IS NULL AND "product_variant"."price_max_cents" IS NULL));