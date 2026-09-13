CREATE TYPE "public"."bulk_request_status" AS ENUM('open', 'quoted', 'accepted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."client_verification_status" AS ENUM('not_submitted', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('resort', 'holiday-park', 'housing-development', 'student-housing', 'senior-living', 'workforce-accommodation', 'other');--> statement-breakpoint
CREATE TYPE "public"."target_producer_status" AS ENUM('invited', 'viewed', 'quoted', 'declined');--> statement-breakpoint
CREATE TABLE "bulk_product_inquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"product_id" uuid NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"unit_count_min" integer NOT NULL,
	"unit_count_max" integer,
	"delivery_country_code" text NOT NULL,
	"start_window_from" date,
	"start_window_to" date,
	"delivery_window_from" date,
	"delivery_window_to" date,
	"note" text,
	"status" "bulk_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bulk_product_inquiry_unit_count_min" CHECK ("bulk_product_inquiry"."unit_count_min" >= 10),
	CONSTRAINT "bulk_product_inquiry_unit_count_max" CHECK ("bulk_product_inquiry"."unit_count_max" IS NULL OR "bulk_product_inquiry"."unit_count_max" >= "bulk_product_inquiry"."unit_count_min"),
	CONSTRAINT "bulk_product_inquiry_start_window_order" CHECK ("bulk_product_inquiry"."start_window_from" IS NULL OR "bulk_product_inquiry"."start_window_to" IS NULL OR "bulk_product_inquiry"."start_window_to" >= "bulk_product_inquiry"."start_window_from"),
	CONSTRAINT "bulk_product_inquiry_delivery_window_order" CHECK ("bulk_product_inquiry"."delivery_window_from" IS NULL OR "bulk_product_inquiry"."delivery_window_to" IS NULL OR "bulk_product_inquiry"."delivery_window_to" >= "bulk_product_inquiry"."delivery_window_from")
);
--> statement-breakpoint
CREATE TABLE "producer_capacity_profile" (
	"producer_id" uuid PRIMARY KEY NOT NULL,
	"units_per_month" integer,
	"production_lines" integer,
	"lead_time_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_module_size_m2" real,
	"completion_standards_supported" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"can_customize_client_design" boolean DEFAULT false NOT NULL,
	"customization_note" text,
	"can_handle_transport" boolean DEFAULT false NOT NULL,
	"can_handle_assembly" boolean DEFAULT false NOT NULL,
	"capability_note" text,
	"past_project_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"volume_verification_status" "producer_verification_status" DEFAULT 'not_submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_request_id" uuid,
	"bulk_product_inquiry_id" uuid,
	"producer_id" uuid NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"unit_price_cents" bigint,
	"total_price_cents" bigint NOT NULL,
	"proposed_lead_time_weeks" integer,
	"notes" text,
	"status" "offer_status" DEFAULT 'active' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_quote_exactly_one_link" CHECK ((("project_quote"."project_request_id" IS NOT NULL)::int + ("project_quote"."bulk_product_inquiry_id" IS NOT NULL)::int) = 1),
	CONSTRAINT "project_quote_unit_price_positive" CHECK ("project_quote"."unit_price_cents" IS NULL OR "project_quote"."unit_price_cents" > 0),
	CONSTRAINT "project_quote_total_price_positive" CHECK ("project_quote"."total_price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"country_code" text NOT NULL,
	"location_detail" text,
	"project_type" "project_type" NOT NULL,
	"families" jsonb NOT NULL,
	"unit_count_min" integer NOT NULL,
	"unit_count_max" integer,
	"floor_area_m2_min" real,
	"floor_area_m2_max" real,
	"completion_standard" "completion_standard",
	"start_window_from" date,
	"start_window_to" date,
	"delivery_window_from" date,
	"delivery_window_to" date,
	"extras_note" text,
	"status" "bulk_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_request_families_not_empty" CHECK (jsonb_array_length("project_request"."families") > 0),
	CONSTRAINT "project_request_unit_count_min" CHECK ("project_request"."unit_count_min" >= 10),
	CONSTRAINT "project_request_unit_count_max" CHECK ("project_request"."unit_count_max" IS NULL OR "project_request"."unit_count_max" >= "project_request"."unit_count_min"),
	CONSTRAINT "project_request_start_window_order" CHECK ("project_request"."start_window_from" IS NULL OR "project_request"."start_window_to" IS NULL OR "project_request"."start_window_to" >= "project_request"."start_window_from"),
	CONSTRAINT "project_request_delivery_window_order" CHECK ("project_request"."delivery_window_from" IS NULL OR "project_request"."delivery_window_to" IS NULL OR "project_request"."delivery_window_to" >= "project_request"."delivery_window_from")
);
--> statement-breakpoint
CREATE TABLE "project_request_target_producer" (
	"project_request_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"status" "target_producer_status" DEFAULT 'invited' NOT NULL,
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"viewed_at" timestamp with time zone,
	CONSTRAINT "project_request_target_producer_project_request_id_producer_id_pk" PRIMARY KEY("project_request_id","producer_id")
);
--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "nip" text;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "client" ADD COLUMN "b2b_verification_status" "client_verification_status" DEFAULT 'not_submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_delivery_country_code_country_code_fk" FOREIGN KEY ("delivery_country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_capacity_profile" ADD CONSTRAINT "producer_capacity_profile_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quote" ADD CONSTRAINT "project_quote_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quote" ADD CONSTRAINT "project_quote_bulk_product_inquiry_id_bulk_product_inquiry_id_fk" FOREIGN KEY ("bulk_product_inquiry_id") REFERENCES "public"."bulk_product_inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quote" ADD CONSTRAINT "project_quote_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_target_producer" ADD CONSTRAINT "project_request_target_producer_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_request_target_producer" ADD CONSTRAINT "project_request_target_producer_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bulk_product_inquiry_contact_email_idx" ON "bulk_product_inquiry" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "bulk_product_inquiry_client_id_idx" ON "bulk_product_inquiry" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "bulk_product_inquiry_product_id_idx" ON "bulk_product_inquiry" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_quote_active_per_request_producer" ON "project_quote" USING btree ("project_request_id","producer_id") WHERE "project_quote"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "project_quote_active_per_bulk_inquiry_producer" ON "project_quote" USING btree ("bulk_product_inquiry_id","producer_id") WHERE "project_quote"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "project_quote_accepted_per_request" ON "project_quote" USING btree ("project_request_id") WHERE "project_quote"."status" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX "project_quote_accepted_per_bulk_inquiry" ON "project_quote" USING btree ("bulk_product_inquiry_id") WHERE "project_quote"."status" = 'accepted';--> statement-breakpoint
CREATE INDEX "project_request_contact_email_idx" ON "project_request" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "project_request_client_id_idx" ON "project_request" USING btree ("client_id");