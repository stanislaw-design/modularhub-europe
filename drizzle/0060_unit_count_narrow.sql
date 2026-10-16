-- Spec 0070 AC-27, zadanie 24 (migracja 5, zwężenie): dawne kolumny zakresu liczby domów
-- znikają po tym, jak kod czyta i zapisuje wyłącznie unit_count (migracja 0055, zadanie 7).
-- Najpierw tymczasowy wyzwalacz zgodności (stary kod znał tylko unit_count_min), potem
-- ograniczenia i kolumny. Pierwotny zakres jest odtwarzalny tylko ze zdania dopisanego do
-- extras_note / note w migracji 0055.
DROP TRIGGER IF EXISTS "project_request_unit_count_compat" ON "project_request";--> statement-breakpoint
DROP TRIGGER IF EXISTS "bulk_product_inquiry_unit_count_compat" ON "bulk_product_inquiry";--> statement-breakpoint
DROP FUNCTION IF EXISTS "unit_count_compat"();--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" DROP CONSTRAINT "bulk_product_inquiry_unit_count_max";--> statement-breakpoint
ALTER TABLE "project_request" DROP CONSTRAINT "project_request_unit_count_max";--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" DROP COLUMN "unit_count_min";--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" DROP COLUMN "unit_count_max";--> statement-breakpoint
ALTER TABLE "project_request" DROP COLUMN "unit_count_min";--> statement-breakpoint
ALTER TABLE "project_request" DROP COLUMN "unit_count_max";