-- Spec 0070 AC-13, zadanie 11 (migracja 3): bramka publikacji. Do tej migracji
-- każda oferta dostawała published_to_client_at = now() z tymczasowego defaultu
-- (migracja 1), żeby klient widział oferty z tygodnia 1. Po niej nowe oferty
-- mają NULL i są ukryte do publishSummary.
-- 1) Uzupełnienie pustych wartości (oferty sprzed bramki dalej widoczne dla
-- klienta). Pomijamy oferty zapytań, których podsumowanie już opublikowano:
-- to oferty złożone po publikacji (zadanie 10), które czekają na ponowną
-- publikację i mają zostać ukryte.
UPDATE "project_quote" q SET "published_to_client_at" = q."submitted_at"
WHERE q."published_to_client_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "project_request" r
    WHERE r."id" = q."project_request_id" AND (r."status" = 'published' OR r."summary_published_at" IS NOT NULL)
  )
  AND NOT EXISTS (
    SELECT 1 FROM "bulk_product_inquiry" b
    WHERE b."id" = q."bulk_product_inquiry_id" AND (b."status" = 'published' OR b."summary_published_at" IS NOT NULL)
  );--> statement-breakpoint
-- 2) Usunięcie defaultu.
ALTER TABLE "project_quote" ALTER COLUMN "published_to_client_at" DROP DEFAULT;
