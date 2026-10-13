-- Spec 0070 AC-38, zadanie 25 (migracja 6): limit trzech nierozstrzygniętych dużych
-- zamówień na e mail liczy też status 'published', a wznowienie zamkniętego zapytania
-- nie omija limitu. Ręcznie pisany plik (funkcja i wyzwalacze poza DSL drizzle-kit),
-- ten sam wzór co drizzle/0014_bulk_request_limit_and_audit.sql.
-- Status 'published' dodała migracja 0054, więc jest już dostępny w tym pliku.

-- 1) Ta sama funkcja, tylko z 'published' na liście statusów. Blokada doradcza
-- pg_advisory_xact_lock(hashtext(contact_email)) zostaje bez zmian.
CREATE OR REPLACE FUNCTION enforce_bulk_request_email_limit() RETURNS trigger AS $$
DECLARE
  open_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.contact_email));

  SELECT count(*) INTO open_count FROM (
    SELECT id FROM "project_request" WHERE "contact_email" = NEW.contact_email AND "status" IN ('open', 'quoted', 'published')
    UNION ALL
    SELECT id FROM "bulk_product_inquiry" WHERE "contact_email" = NEW.contact_email AND "status" IN ('open', 'quoted', 'published')
  ) combined;

  IF open_count >= 3 THEN
    RAISE EXCEPTION 'bulk_request_email_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- 2) Wznowienie (zmiana statusu z closed lub accepted na status aktywny) przechodzi
-- przez tę samą funkcję. Wznawiany wiersz ma w chwili BEFORE UPDATE jeszcze stary,
-- nieaktywny status, więc nie liczy się sam do siebie.
CREATE TRIGGER project_request_email_limit_reopen BEFORE UPDATE OF "status" ON "project_request"
  FOR EACH ROW WHEN (OLD."status" IN ('closed', 'accepted') AND NEW."status" IN ('open', 'quoted', 'published'))
  EXECUTE FUNCTION enforce_bulk_request_email_limit();
--> statement-breakpoint
CREATE TRIGGER bulk_product_inquiry_email_limit_reopen BEFORE UPDATE OF "status" ON "bulk_product_inquiry"
  FOR EACH ROW WHEN (OLD."status" IN ('closed', 'accepted') AND NEW."status" IN ('open', 'quoted', 'published'))
  EXECUTE FUNCTION enforce_bulk_request_email_limit();
