ALTER TABLE "product" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_slug_unique" UNIQUE("slug");