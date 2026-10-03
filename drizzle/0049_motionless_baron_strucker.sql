CREATE TYPE "public"."compliance_assessment_status" AS ENUM('approved', 'conditional', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."producer_certification_status" AS ENUM('self_reported', 'platform_confirmed');--> statement-breakpoint
CREATE TABLE "producer_certification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"confirmation_status" "producer_certification_status" DEFAULT 'self_reported' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_certification_producer_name_unique" UNIQUE("producer_id","name"),
	CONSTRAINT "producer_certification_name_length" CHECK (char_length(btrim("producer_certification"."name")) between 1 and 200),
	CONSTRAINT "producer_certification_confirmation_consistent" CHECK (("producer_certification"."confirmation_status" = 'platform_confirmed' AND "producer_certification"."confirmed_at" IS NOT NULL AND "producer_certification"."confirmed_by" IS NOT NULL) OR ("producer_certification"."confirmation_status" = 'self_reported' AND "producer_certification"."confirmed_at" IS NULL AND "producer_certification"."confirmed_by" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "product_compliance_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"rule" text NOT NULL,
	"status" "compliance_assessment_status" NOT NULL,
	"reason" text NOT NULL,
	"confirmation_status" "producer_certification_status" DEFAULT 'self_reported' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_compliance_assessment_product_country_rule_unique" UNIQUE("product_id","country_code","rule"),
	CONSTRAINT "product_compliance_assessment_rule_nonempty" CHECK (char_length(btrim("product_compliance_assessment"."rule")) > 0),
	CONSTRAINT "product_compliance_assessment_reason_nonempty" CHECK (char_length(btrim("product_compliance_assessment"."reason")) > 0),
	CONSTRAINT "product_compliance_assessment_confirmation_consistent" CHECK (("product_compliance_assessment"."confirmation_status" = 'platform_confirmed' AND "product_compliance_assessment"."confirmed_at" IS NOT NULL AND "product_compliance_assessment"."confirmed_by" IS NOT NULL) OR ("product_compliance_assessment"."confirmation_status" = 'self_reported' AND "product_compliance_assessment"."confirmed_at" IS NULL AND "product_compliance_assessment"."confirmed_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "producer_certification" ADD CONSTRAINT "producer_certification_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_certification" ADD CONSTRAINT "producer_certification_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_compliance_assessment" ADD CONSTRAINT "product_compliance_assessment_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_compliance_assessment" ADD CONSTRAINT "product_compliance_assessment_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_compliance_assessment" ADD CONSTRAINT "product_compliance_assessment_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "producer_certification_producer_idx" ON "producer_certification" USING btree ("producer_id");--> statement-breakpoint
CREATE TRIGGER producer_certification_audit AFTER INSERT OR UPDATE OR DELETE ON "producer_certification" FOR EACH ROW EXECUTE FUNCTION audit_log_capture();--> statement-breakpoint
CREATE TRIGGER product_compliance_assessment_audit AFTER INSERT OR UPDATE OR DELETE ON "product_compliance_assessment" FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
