CREATE TYPE "public"."product_option_selection_type" AS ENUM('single', 'multi');--> statement-breakpoint
CREATE TABLE "product_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"label" text NOT NULL,
	"price_cents" integer,
	"price_on_request" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_option_price_on_request" CHECK (("product_option"."price_on_request" = true AND "product_option"."price_cents" IS NULL) OR ("product_option"."price_on_request" = false AND "product_option"."price_cents" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "product_option_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"selection_type" "product_option_selection_type" NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_option_group_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_option_group_assignment_product_group_unique" UNIQUE("product_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "product_option" ADD CONSTRAINT "product_option_group_id_product_option_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_option_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_group" ADD CONSTRAINT "product_option_group_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_group_assignment" ADD CONSTRAINT "product_option_group_assignment_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_group_assignment" ADD CONSTRAINT "product_option_group_assignment_group_id_product_option_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."product_option_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_one_default_per_group" ON "product_option" USING btree ("group_id") WHERE "product_option"."is_default" AND "product_option"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "product_option_group_id_idx" ON "product_option" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "product_option_group_producer_id_idx" ON "product_option_group" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "product_option_group_assignment_product_id_idx" ON "product_option_group_assignment" USING btree ("product_id");