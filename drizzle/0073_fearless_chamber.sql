ALTER TYPE "public"."product_family" ADD VALUE 'outdoor-kitchen';--> statement-breakpoint
ALTER TABLE "producer" ADD COLUMN "is_platform_brand" boolean DEFAULT false NOT NULL;