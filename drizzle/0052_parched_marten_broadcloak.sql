CREATE TABLE "producer_certification_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certification_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producer_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"description" text,
	"showroom_visit_note" text,
	"inquiry_response_time_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_group_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_text_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_pl" text NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"translated" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "construction_system" text;--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "roof_type" text;--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "customization_scope" text;--> statement-breakpoint
ALTER TABLE "product_translation" ADD COLUMN "service_scope_description" text;--> statement-breakpoint
ALTER TABLE "producer_certification_translation" ADD CONSTRAINT "producer_certification_translation_certification_id_producer_certification_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."producer_certification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_translation" ADD CONSTRAINT "producer_translation_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_group_translation" ADD CONSTRAINT "product_option_group_translation_group_id_product_option_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_option_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_translation" ADD CONSTRAINT "product_option_translation_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "producer_certification_translation_cert_locale_idx" ON "producer_certification_translation" USING btree ("certification_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "producer_translation_producer_locale_idx" ON "producer_translation" USING btree ("producer_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_group_translation_group_locale_idx" ON "product_option_group_translation" USING btree ("group_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_translation_option_locale_idx" ON "product_option_translation" USING btree ("option_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "reference_text_translation_source_locale_idx" ON "reference_text_translation" USING btree ("source_pl","locale");