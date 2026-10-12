CREATE TYPE "public"."bulk_close_reason" AS ENUM('client_cancelled', 'no_offers', 'expired', 'staff_closed');--> statement-breakpoint
CREATE TYPE "public"."project_request_override_mode" AS ENUM('include', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."quote_price_tax_mode" AS ENUM('net', 'gross');--> statement-breakpoint
CREATE TYPE "public"."quote_producer_outcome" AS ENUM('signed', 'no_agreement', 'withdrew');--> statement-breakpoint
ALTER TYPE "public"."bulk_request_status" ADD VALUE 'published' BEFORE 'accepted';--> statement-breakpoint
CREATE TABLE "project_notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_request_id" uuid,
	"bulk_product_inquiry_id" uuid,
	"producer_id" uuid,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_notification_log_exactly_one_target" CHECK ((("project_notification_log"."project_request_id" IS NOT NULL)::int + ("project_notification_log"."bulk_product_inquiry_id" IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE TABLE "project_request_producer_override" (
	"project_request_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"mode" "project_request_override_mode" NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_request_producer_override_project_request_id_producer_id_pk" PRIMARY KEY("project_request_id","producer_id")
);
--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "deadline_at" timestamp with time zone DEFAULT now() + interval '14 days' NOT NULL;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "selected_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "selected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "contact_locale" text DEFAULT 'pl' NOT NULL;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "created_by_staff_user_id" text;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "staff_consent_note" text;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "summary_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "closed_reason" "bulk_close_reason";--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "price_tax_mode" "quote_price_tax_mode" DEFAULT 'net' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "vat_rate_percent" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "scope_included" text;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "scope_excluded" text;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "logistics" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "payment_plan" text;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "valid_until" date;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "warranty_note" text;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "delivery_window_from" date;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "delivery_window_to" date;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "advisor_note" text;--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "published_to_client_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "producer_outcome" "quote_producer_outcome";--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "producer_outcome_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "deadline_at" timestamp with time zone DEFAULT now() + interval '14 days' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "selected_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "selected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "contact_locale" text DEFAULT 'pl' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "created_by_staff_user_id" text;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "staff_consent_note" text;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "summary_published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "closed_reason" "bulk_close_reason";--> statement-breakpoint
ALTER TABLE "project_notification_log" ADD CONSTRAINT "project_notification_log_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notification_log" ADD CONSTRAINT "project_notification_log_bulk_product_inquiry_id_bulk_product_inquiry_id_fk" FOREIGN KEY ("bulk_product_inquiry_id") REFERENCES "public"."bulk_product_inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notification_log" ADD CONSTRAINT "project_notification_log_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_producer_override" ADD CONSTRAINT "project_request_producer_override_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_producer_override" ADD CONSTRAINT "project_request_producer_override_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_producer_override" ADD CONSTRAINT "project_request_producer_override_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_notification_log_unique_idx" ON "project_notification_log" USING btree (coalesce("project_request_id", "bulk_product_inquiry_id"),coalesce("producer_id", '00000000-0000-0000-0000-000000000000'::uuid),"kind");--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_selected_quote_id_project_quote_id_fk" FOREIGN KEY ("selected_quote_id") REFERENCES "public"."project_quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_created_by_staff_user_id_users_id_fk" FOREIGN KEY ("created_by_staff_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_selected_quote_id_project_quote_id_fk" FOREIGN KEY ("selected_quote_id") REFERENCES "public"."project_quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_created_by_staff_user_id_users_id_fk" FOREIGN KEY ("created_by_staff_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "project_request" SET "closed_at" = "updated_at", "closed_reason" = 'staff_closed' WHERE "status" = 'closed';--> statement-breakpoint
UPDATE "bulk_product_inquiry" SET "closed_at" = "updated_at", "closed_reason" = 'staff_closed' WHERE "status" = 'closed';--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_contact_locale" CHECK ("bulk_product_inquiry"."contact_locale" IN ('pl', 'en', 'de', 'nl'));--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_staff_consent" CHECK ("bulk_product_inquiry"."created_by_staff_user_id" IS NULL OR "bulk_product_inquiry"."staff_consent_note" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_closed_consistent" CHECK (("bulk_product_inquiry"."status" = 'closed') = ("bulk_product_inquiry"."closed_at" IS NOT NULL AND "bulk_product_inquiry"."closed_reason" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "project_quote" ADD CONSTRAINT "project_quote_delivery_window_order" CHECK ("project_quote"."delivery_window_from" IS NULL OR "project_quote"."delivery_window_to" IS NULL OR "project_quote"."delivery_window_to" >= "project_quote"."delivery_window_from");--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_contact_locale" CHECK ("project_request"."contact_locale" IN ('pl', 'en', 'de', 'nl'));--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_staff_consent" CHECK ("project_request"."created_by_staff_user_id" IS NULL OR "project_request"."staff_consent_note" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_closed_consistent" CHECK (("project_request"."status" = 'closed') = ("project_request"."closed_at" IS NOT NULL AND "project_request"."closed_reason" IS NOT NULL));