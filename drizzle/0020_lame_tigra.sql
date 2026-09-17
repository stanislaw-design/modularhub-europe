CREATE TYPE "public"."cost_line_item_status" AS ENUM('w-cenie', 'obowiazkowa-doplata', 'opcja', 'po-stronie-klienta', 'do-wyceny');--> statement-breakpoint
CREATE TYPE "public"."product_timeline_stage_key" AS ENUM('formalnosci', 'produkcja', 'transport', 'montaz', 'wykonczenie');--> statement-breakpoint
ALTER TYPE "public"."document_purpose" ADD VALUE 'product_realization_photo';--> statement-breakpoint
ALTER TYPE "public"."product_category" ADD VALUE 'wynajem-hotel';--> statement-breakpoint
CREATE TABLE "cost_line_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" "cost_line_item_status" NOT NULL,
	"responsible_party" text,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_timeline_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"stage_key" "product_timeline_stage_key" NOT NULL,
	"duration_min_days" integer,
	"duration_max_days" integer,
	"starts_from_label" text,
	"responsible_party" text,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_timeline_stage_duration_order" CHECK ("product_timeline_stage"."duration_min_days" IS NULL OR "product_timeline_stage"."duration_max_days" IS NULL OR "product_timeline_stage"."duration_max_days" >= "product_timeline_stage"."duration_min_days")
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"completion_standard" "completion_standard" NOT NULL,
	"variant_label" text,
	"price_min_cents" integer,
	"price_max_cents" integer,
	"scope_summary" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_variant_price_order" CHECK ("product_variant"."price_min_cents" IS NULL OR "product_variant"."price_max_cents" IS NULL OR "product_variant"."price_max_cents" >= "product_variant"."price_min_cents")
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "product_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "installation_warranty_years" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "service_scope_description" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "transport_dimensions" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "crane_requirements" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "min_plot_width_m" real;--> statement-breakpoint
ALTER TABLE "cost_line_item" ADD CONSTRAINT "cost_line_item_product_variant_id_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_timeline_stage" ADD CONSTRAINT "product_timeline_stage_product_variant_id_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_line_item_product_variant_id_idx" ON "cost_line_item" USING btree ("product_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_timeline_stage_variant_stage_unique" ON "product_timeline_stage" USING btree ("product_variant_id","stage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_product_standard_unique" ON "product_variant" USING btree ("product_id","completion_standard") WHERE "product_variant"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variant_one_default_per_product" ON "product_variant" USING btree ("product_id") WHERE "product_variant"."is_default" AND "product_variant"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "product_variant_product_id_idx" ON "product_variant" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_product_variant_id_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Wyzwalacz synchronizacji ceny (spec 0041 Feature design), ten sam wzorzec
-- spoza DSL drizzle-kit co audit_log_capture (0002_audit_log_trigger.sql):
-- po każdym wstawieniu, zmianie lub usunięciu wiersza w product_variant
-- przelicza product.price_min_cents/price_max_cents na podstawie wariantu z
-- is_default = true i deleted_at IS NULL dla danego produktu. Gdy żaden
-- wariant nie jest domyślny (lub produkt nie ma jeszcze żadnego wariantu),
-- cena wraca do NULL, nigdy do zmieszanego zakresu z kilku standardów naraz
-- (poprawiona reguła po cross checku tej specyfikacji — patrz Feature design).
-- Działa niezależnie od tego, czy wiersz wstawia surowy SQL przez Neon MCP,
-- czy przyszły kod aplikacji, bo działa na poziomie bazy, nie zapytania.
CREATE OR REPLACE FUNCTION sync_product_price_from_default_variant() RETURNS trigger AS $$
DECLARE
  v_product_id uuid;
  v_min integer;
  v_max integer;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT price_min_cents, price_max_cents
    INTO v_min, v_max
    FROM product_variant
   WHERE product_id = v_product_id
     AND is_default = true
     AND deleted_at IS NULL
   LIMIT 1;

  UPDATE product
     SET price_min_cents = v_min,
         price_max_cents = v_max,
         updated_at = now()
   WHERE id = v_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER product_variant_price_sync
  AFTER INSERT OR UPDATE OR DELETE ON "product_variant"
  FOR EACH ROW EXECUTE FUNCTION sync_product_price_from_default_variant();