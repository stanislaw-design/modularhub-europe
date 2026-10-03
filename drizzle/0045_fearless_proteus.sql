CREATE TYPE "public"."trust_signal" AS ENUM('new', 'complete');--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "contact_revealed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "trust_signal" "trust_signal" DEFAULT 'new' NOT NULL;