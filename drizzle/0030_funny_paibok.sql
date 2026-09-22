CREATE TABLE "cost_line_item_label_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label_pl" text NOT NULL,
	"locale" "product_translation_locale" NOT NULL,
	"translated_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cost_line_item_label_translation_label_pl_locale_idx" ON "cost_line_item_label_translation" USING btree ("label_pl","locale");