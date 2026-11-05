CREATE TABLE "producer_content_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "producer_content_item_kind" CHECK ("producer_content_item"."kind" IN ('collaboration_step', 'commercial_use'))
);
--> statement-breakpoint
CREATE TABLE "producer_content_item_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producer_interior_style" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "producer_interior_style_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producer_interior_style_material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_id" uuid NOT NULL,
	"zone" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"swatch_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_interior_style_material_zone" CHECK ("producer_interior_style_material"."zone" IN ('walls_ceilings', 'flooring', 'built_in_furniture', 'bathroom', 'kitchen', 'beds_textiles'))
);
--> statement-breakpoint
CREATE TABLE "producer_interior_style_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_id" uuid NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_interior_style_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_interior_style_assignment_product_style_unique" UNIQUE("product_id","style_id")
);
--> statement-breakpoint
ALTER TABLE "inquiry_item" ADD COLUMN "configuration_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "producer_content_item" ADD CONSTRAINT "producer_content_item_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_content_item_translation" ADD CONSTRAINT "producer_content_item_translation_item_id_producer_content_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."producer_content_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_interior_style" ADD CONSTRAINT "producer_interior_style_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_interior_style_image" ADD CONSTRAINT "producer_interior_style_image_style_id_producer_interior_style_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."producer_interior_style"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_interior_style_material" ADD CONSTRAINT "producer_interior_style_material_style_id_producer_interior_style_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."producer_interior_style"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_interior_style_translation" ADD CONSTRAINT "producer_interior_style_translation_style_id_producer_interior_style_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."producer_interior_style"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_interior_style_assignment" ADD CONSTRAINT "product_interior_style_assignment_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_interior_style_assignment" ADD CONSTRAINT "product_interior_style_assignment_style_id_producer_interior_style_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."producer_interior_style"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "producer_content_item_producer_kind_idx" ON "producer_content_item" USING btree ("producer_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "producer_content_item_translation_item_locale_idx" ON "producer_content_item_translation" USING btree ("item_id","locale");--> statement-breakpoint
CREATE INDEX "producer_interior_style_producer_id_idx" ON "producer_interior_style" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "producer_interior_style_image_style_id_idx" ON "producer_interior_style_image" USING btree ("style_id");--> statement-breakpoint
CREATE INDEX "producer_interior_style_material_style_id_idx" ON "producer_interior_style_material" USING btree ("style_id");--> statement-breakpoint
CREATE UNIQUE INDEX "producer_interior_style_translation_style_locale_idx" ON "producer_interior_style_translation" USING btree ("style_id","locale");--> statement-breakpoint
CREATE INDEX "product_interior_style_assignment_product_id_idx" ON "product_interior_style_assignment" USING btree ("product_id");