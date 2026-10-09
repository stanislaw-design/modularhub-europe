CREATE TABLE "product_option_layout" (
	"option_id" uuid PRIMARY KEY NOT NULL,
	"floor_area_m2" real,
	"rooms" integer,
	"bedrooms" integer,
	"bathrooms" integer,
	"room_layout" jsonb,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_option_layout_floor_area_positive" CHECK ("product_option_layout"."floor_area_m2" IS NULL OR "product_option_layout"."floor_area_m2" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_option_layout_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"description" text,
	"room_layout" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "product_option_id" uuid;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "floor_level" text;--> statement-breakpoint
ALTER TABLE "product_option_layout" ADD CONSTRAINT "product_option_layout_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_layout_translation" ADD CONSTRAINT "product_option_layout_translation_option_id_product_option_layout_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_option_layout"("option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_layout_translation_option_locale_idx" ON "product_option_layout_translation" USING btree ("option_id","locale");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_product_option_id_product_option_id_fk" FOREIGN KEY ("product_option_id") REFERENCES "public"."product_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_product_option_idx" ON "document" USING btree ("product_id","product_option_id");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_product_option_floor_plan_only" CHECK ("document"."product_option_id" IS NULL OR "document"."purpose" = 'product_floor_plan');--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_floor_level_values" CHECK ("document"."floor_level" IS NULL OR "document"."floor_level" IN ('parter', 'pietro', 'poddasze'));