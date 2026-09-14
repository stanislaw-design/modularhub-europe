CREATE TYPE "public"."container_subcategory" AS ENUM('gastronomiczne', 'uslugowe', 'mieszkalne');--> statement-breakpoint
ALTER TYPE "public"."product_family" ADD VALUE 'kontenery-modulowe';--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "container_subcategory" "container_subcategory";