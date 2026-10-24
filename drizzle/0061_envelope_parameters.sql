CREATE TYPE "public"."envelope_element" AS ENUM('wall', 'roof', 'floor_ground', 'floor_air', 'window', 'glazing', 'door');--> statement-breakpoint
CREATE TYPE "public"."envelope_method" AS ENUM('calculation', 'lab_test', 'manufacturer_declaration');--> statement-breakpoint
CREATE TYPE "public"."envelope_quantity" AS ENUM('u_value', 'rc_value');--> statement-breakpoint
CREATE TYPE "public"."foundation_status" AS ENUM('permanent', 'temporary');--> statement-breakpoint
CREATE TYPE "public"."intended_use" AS ENUM('year_round', 'seasonal');--> statement-breakpoint
CREATE TABLE "product_envelope_parameter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"element" "envelope_element" NOT NULL,
	"quantity" "envelope_quantity" NOT NULL,
	"value" numeric(6, 3) NOT NULL,
	"method" "envelope_method" NOT NULL,
	"method_note" text,
	"as_of_date" date NOT NULL,
	"confirmation_status" "producer_certification_status" DEFAULT 'self_reported' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_envelope_parameter_product_element_quantity_unique" UNIQUE("product_id","element","quantity"),
	CONSTRAINT "product_envelope_parameter_quantity_by_element" CHECK (("product_envelope_parameter"."element" IN ('window', 'glazing', 'door') AND "product_envelope_parameter"."quantity" = 'u_value') OR "product_envelope_parameter"."element" IN ('wall', 'roof', 'floor_ground', 'floor_air')),
	CONSTRAINT "product_envelope_parameter_value_range" CHECK (("product_envelope_parameter"."quantity" = 'u_value' AND "product_envelope_parameter"."value" BETWEEN 0.05 AND 6) OR ("product_envelope_parameter"."quantity" = 'rc_value' AND "product_envelope_parameter"."value" BETWEEN 0.1 AND 20)),
	CONSTRAINT "product_envelope_parameter_method_note_length" CHECK ("product_envelope_parameter"."method_note" IS NULL OR char_length("product_envelope_parameter"."method_note") <= 300),
	CONSTRAINT "product_envelope_parameter_confirmation_consistent" CHECK (("product_envelope_parameter"."confirmation_status" = 'platform_confirmed' AND "product_envelope_parameter"."confirmed_at" IS NOT NULL AND "product_envelope_parameter"."confirmed_by" IS NOT NULL) OR ("product_envelope_parameter"."confirmation_status" = 'self_reported' AND "product_envelope_parameter"."confirmed_at" IS NULL AND "product_envelope_parameter"."confirmed_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "intended_use" "intended_use";--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "intended_use_months" integer;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "intended_use" "intended_use";--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "intended_use_months" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "foundation_status" "foundation_status";--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "intended_use" "intended_use";--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "intended_use_months" integer;--> statement-breakpoint
ALTER TABLE "product_envelope_parameter" ADD CONSTRAINT "product_envelope_parameter_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_envelope_parameter" ADD CONSTRAINT "product_envelope_parameter_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_envelope_parameter_product_idx" ON "product_envelope_parameter" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_intended_use_months" CHECK ("bulk_product_inquiry"."intended_use_months" IS NULL OR ("bulk_product_inquiry"."intended_use_months" BETWEEN 1 AND 11 AND "bulk_product_inquiry"."intended_use" = 'seasonal'));--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_intended_use_months" CHECK ("inquiry"."intended_use_months" IS NULL OR ("inquiry"."intended_use_months" BETWEEN 1 AND 11 AND "inquiry"."intended_use" = 'seasonal'));--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_foundation_status_family_match" CHECK ("product"."foundation_status" IS NULL OR "product"."family" = 'dom' OR ("product"."family" = 'kontenery-modulowe' AND "product"."container_subcategory" = 'mieszkalne'));--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_intended_use_months" CHECK ("project_request"."intended_use_months" IS NULL OR ("project_request"."intended_use_months" BETWEEN 1 AND 11 AND "project_request"."intended_use" = 'seasonal'));--> statement-breakpoint
INSERT INTO "country" ("code", "name") VALUES
  ('BE', 'Belgia'),
  ('IT', 'Włochy'),
  ('FR', 'Francja')
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
CREATE TRIGGER product_envelope_parameter_audit AFTER INSERT OR UPDATE OR DELETE ON "product_envelope_parameter" FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
