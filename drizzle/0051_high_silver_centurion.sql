ALTER TABLE "inquiry" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "contact_email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "locale" text;--> statement-breakpoint
CREATE INDEX "inquiry_email_received_idx" ON "inquiry" USING btree (lower("email"),"received_at");--> statement-breakpoint
UPDATE "inquiry" SET "contact_email_verified_at" = "received_at" WHERE "client_id" IS NOT NULL;
