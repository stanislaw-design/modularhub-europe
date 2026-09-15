CREATE TYPE "public"."producer_production_scale" AS ENUM('do-10', 'powyzej-10');--> statement-breakpoint
ALTER TABLE "producer" ALTER COLUMN "technology" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "producer" ADD COLUMN "production_scale" "producer_production_scale";