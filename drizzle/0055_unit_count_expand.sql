-- Spec 0070 AC-8, AC-27: jedna dokładna liczba domów (migracja "rozszerz").
-- Stare kolumny unit_count_min i unit_count_max zostają do migracji 5 (zwężenie).
-- Plik jest rozbity ręcznie: dodaj nullable, uzupełnij, dopiero potem NOT NULL.
ALTER TABLE "project_request" ADD COLUMN "unit_count" integer;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "unit_count" integer;--> statement-breakpoint
-- Uzupełnienie liczby i zdanie o dawnym zakresie w jednym UPDATE, tylko dla wierszy
-- jeszcze bez unit_count (ponowne uruchomienie nie dubluje zdania). CASE zamiast samej
-- konkatenacji, bo NULL || tekst daje NULL i zgubiłby zdanie.
UPDATE "project_request" SET
  "extras_note" = CASE
    WHEN "unit_count_max" IS NULL OR "unit_count_max" = "unit_count_min" THEN
      CASE WHEN "unit_count_max" IS NULL THEN
        CASE WHEN "extras_note" IS NULL OR "extras_note" = '' THEN 'Pierwotnie podano: co najmniej ' || "unit_count_min" || ' domów.'
        ELSE "extras_note" || E'\n' || 'Pierwotnie podano: co najmniej ' || "unit_count_min" || ' domów.' END
      ELSE "extras_note" END
    ELSE
      CASE WHEN "extras_note" IS NULL OR "extras_note" = '' THEN 'Pierwotnie podany zakres: ' || "unit_count_min" || ' do ' || "unit_count_max" || ' domów.'
      ELSE "extras_note" || E'\n' || 'Pierwotnie podany zakres: ' || "unit_count_min" || ' do ' || "unit_count_max" || ' domów.' END
  END,
  "unit_count" = "unit_count_min"
WHERE "unit_count" IS NULL;--> statement-breakpoint
UPDATE "bulk_product_inquiry" SET
  "note" = CASE
    WHEN "unit_count_max" IS NULL OR "unit_count_max" = "unit_count_min" THEN
      CASE WHEN "unit_count_max" IS NULL THEN
        CASE WHEN "note" IS NULL OR "note" = '' THEN 'Pierwotnie podano: co najmniej ' || "unit_count_min" || ' domów.'
        ELSE "note" || E'\n' || 'Pierwotnie podano: co najmniej ' || "unit_count_min" || ' domów.' END
      ELSE "note" END
    ELSE
      CASE WHEN "note" IS NULL OR "note" = '' THEN 'Pierwotnie podany zakres: ' || "unit_count_min" || ' do ' || "unit_count_max" || ' domów.'
      ELSE "note" || E'\n' || 'Pierwotnie podany zakres: ' || "unit_count_min" || ' do ' || "unit_count_max" || ' domów.' END
  END,
  "unit_count" = "unit_count_min"
WHERE "unit_count" IS NULL;--> statement-breakpoint
-- Tymczasowy wyzwalacz zgodności do migracji 5: stary kod zna tylko unit_count_min.
CREATE OR REPLACE FUNCTION "unit_count_compat"() RETURNS trigger AS $$
BEGIN
  NEW."unit_count" := coalesce(NEW."unit_count", NEW."unit_count_min");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "project_request_unit_count_compat" BEFORE INSERT ON "project_request" FOR EACH ROW EXECUTE FUNCTION "unit_count_compat"();--> statement-breakpoint
CREATE TRIGGER "bulk_product_inquiry_unit_count_compat" BEFORE INSERT ON "bulk_product_inquiry" FOR EACH ROW EXECUTE FUNCTION "unit_count_compat"();--> statement-breakpoint
ALTER TABLE "project_request" ALTER COLUMN "unit_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ALTER COLUMN "unit_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_unit_count" CHECK ("project_request"."unit_count" >= 3);--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD CONSTRAINT "bulk_product_inquiry_unit_count" CHECK ("bulk_product_inquiry"."unit_count" >= 3);--> statement-breakpoint
ALTER TABLE "project_request" DROP CONSTRAINT "project_request_unit_count_min";--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" DROP CONSTRAINT "bulk_product_inquiry_unit_count_min";--> statement-breakpoint
ALTER TABLE "project_request" ALTER COLUMN "unit_count_min" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ALTER COLUMN "unit_count_min" DROP NOT NULL;
