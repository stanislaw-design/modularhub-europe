CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."completion_standard" AS ENUM('surowy-zamkniety', 'deweloperski', 'pod-klucz');--> statement-breakpoint
CREATE TYPE "public"."document_purpose" AS ENUM('product_photo', 'product_floor_plan', 'order_stage', 'company_verification', 'producer_photo');--> statement-breakpoint
CREATE TYPE "public"."eligibility_status" AS ENUM('approved', 'conditional', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('open', 'offered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('active', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."order_stage" AS ENUM('produkcja', 'transport', 'montaz', 'odbior', 'gwarancja');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('plot_analysis_fee', 'platform_commission');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."producer_technology" AS ENUM('szkielet-drewniany', 'modulowa-stal-lekka', 'plyta-warstwowa-sip', 'beton-modulowy');--> statement-breakpoint
CREATE TYPE "public"."producer_verification_status" AS ENUM('not_submitted', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('caloroczny', 'rekreacyjny-caloroczny', 'mobilny');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('client', 'producer', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" "audit_action" NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "client_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "country" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"r2_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"purpose" "document_purpose" NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"owner_user_id" text NOT NULL,
	"product_id" uuid,
	"order_stage_event_id" uuid,
	"producer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"delivery_country_code" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'open' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_item" (
	"inquiry_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiry_item_inquiry_id_product_id_pk" PRIMARY KEY("inquiry_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"installation_price_cents" integer NOT NULL,
	"transport_price_cents" integer NOT NULL,
	"status" "offer_status" DEFAULT 'active' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_item" (
	"offer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"house_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_item_offer_id_product_id_pk" PRIMARY KEY("offer_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"current_stage" "order_stage" DEFAULT 'produkcja' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_offer_id_unique" UNIQUE("offer_id")
);
--> statement-breakpoint
CREATE TABLE "order_stage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"stage" "order_stage" NOT NULL,
	"reached_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by_user_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" "payment_purpose" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"provider_reference" text,
	"order_id" uuid,
	"plot_analysis_result_id" uuid,
	"paid_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plot_analysis_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "eligibility_status" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"nip" text NOT NULL,
	"name" text NOT NULL,
	"country_code" text NOT NULL,
	"rating" real,
	"review_count" integer DEFAULT 0 NOT NULL,
	"technology" "producer_technology" NOT NULL,
	"verification_status" "producer_verification_status" DEFAULT 'not_submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "producer_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "producer_nip_unique" UNIQUE("nip")
);
--> statement-breakpoint
CREATE TABLE "producer_delivery_country" (
	"producer_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_delivery_country_producer_id_country_code_pk" PRIMARY KEY("producer_id","country_code")
);
--> statement-breakpoint
CREATE TABLE "producer_export_readiness" (
	"producer_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"status" "eligibility_status" NOT NULL,
	"reason" text NOT NULL,
	"gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_export_readiness_producer_id_country_code_pk" PRIMARY KEY("producer_id","country_code")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"name" text,
	"country_of_production" text,
	"floor_area_m2" real,
	"built_up_area_m2" real,
	"description" text,
	"wall_build_up" text,
	"insulation" text,
	"heat_transfer_coefficients" text,
	"window_class" text,
	"ventilation" text,
	"heat_source" text,
	"fire_resistance" text,
	"wind_resistance" text,
	"completion_standard" "completion_standard",
	"production_lead_time_weeks_min" integer,
	"production_lead_time_weeks_max" integer,
	"on_site_assembly_days_min" integer,
	"on_site_assembly_days_max" integer,
	"house_price_min_cents" integer,
	"house_price_max_cents" integer,
	"structural_warranty_years" integer,
	"category" "product_category",
	"rooms" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"storeys" integer,
	"external_dimensions" text,
	"roof_type" text,
	"construction_system" text,
	"foundation_options" text,
	"customization_scope" text,
	"price_min_cents" integer,
	"price_max_cents" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"price_includes" jsonb,
	"price_excludes" jsonb,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_country_eligibility" (
	"product_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"status" "eligibility_status" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_country_eligibility_product_id_country_code_pk" PRIMARY KEY("product_id","country_code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_order_stage_event_id_order_stage_event_id_fk" FOREIGN KEY ("order_stage_event_id") REFERENCES "public"."order_stage_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_delivery_country_code_country_code_fk" FOREIGN KEY ("delivery_country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_item" ADD CONSTRAINT "inquiry_item_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_item" ADD CONSTRAINT "inquiry_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_item" ADD CONSTRAINT "offer_item_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_item" ADD CONSTRAINT "offer_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stage_event" ADD CONSTRAINT "order_stage_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stage_event" ADD CONSTRAINT "order_stage_event_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_plot_analysis_result_id_plot_analysis_result_id_fk" FOREIGN KEY ("plot_analysis_result_id") REFERENCES "public"."plot_analysis_result"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plot_analysis_result" ADD CONSTRAINT "plot_analysis_result_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plot_analysis_result" ADD CONSTRAINT "plot_analysis_result_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer" ADD CONSTRAINT "producer_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer" ADD CONSTRAINT "producer_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_delivery_country" ADD CONSTRAINT "producer_delivery_country_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_delivery_country" ADD CONSTRAINT "producer_delivery_country_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_export_readiness" ADD CONSTRAINT "producer_export_readiness_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_export_readiness" ADD CONSTRAINT "producer_export_readiness_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_country_of_production_country_code_fk" FOREIGN KEY ("country_of_production") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_country_eligibility" ADD CONSTRAINT "product_country_eligibility_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_country_eligibility" ADD CONSTRAINT "product_country_eligibility_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_active_per_inquiry_producer" ON "offer" USING btree ("inquiry_id","producer_id") WHERE "offer"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "plot_analysis_result_product_client_unique" ON "plot_analysis_result" USING btree ("product_id","client_id");