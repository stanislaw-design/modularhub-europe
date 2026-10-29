ALTER TABLE "project_request" DROP CONSTRAINT "project_request_unit_count";--> statement-breakpoint
ALTER TABLE "project_request" DROP CONSTRAINT "project_request_staff_consent";--> statement-breakpoint
DROP INDEX "project_quote_active_per_request_producer";--> statement-breakpoint
ALTER TABLE "project_quote" ADD COLUMN "variant_label" text;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "is_platform_owned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "platform_marked_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_platform_marked_quote_id_project_quote_id_fk" FOREIGN KEY ("platform_marked_quote_id") REFERENCES "public"."project_quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_quote_active_per_request_producer" ON "project_quote" USING btree ("project_request_id","producer_id",COALESCE(lower(btrim("variant_label")), '')) WHERE "project_quote"."status" = 'active';--> statement-breakpoint
ALTER TABLE "project_quote" ADD CONSTRAINT "project_quote_variant_label" CHECK ("project_quote"."variant_label" IS NULL OR char_length(btrim("project_quote"."variant_label")) BETWEEN 1 AND 60);--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_platform_title" CHECK (NOT "project_request"."is_platform_owned" OR ("project_request"."title" IS NOT NULL AND char_length(btrim("project_request"."title")) BETWEEN 3 AND 120));--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_unit_count" CHECK ("project_request"."unit_count" >= 1 AND ("project_request"."is_platform_owned" OR "project_request"."unit_count" >= 3));--> statement-breakpoint
ALTER TABLE "project_request" ADD CONSTRAINT "project_request_staff_consent" CHECK ("project_request"."created_by_staff_user_id" IS NULL OR "project_request"."staff_consent_note" IS NOT NULL OR "project_request"."is_platform_owned");--> statement-breakpoint

-- Spec 0077: limit trzech zapytań na e mail pomija projekty własne ModularHub (wszystkie
-- mają ten sam adres zespołu), zarówno przy wstawieniu, jak i przy zliczaniu. Funkcja
-- działa też na bulk_product_inquiry, który nie ma kolumny is_platform_owned, więc flagę
-- czytamy bezpiecznie przez to_jsonb (brak klucza daje NULL, czyli nie projekt własny).
CREATE OR REPLACE FUNCTION enforce_bulk_request_email_limit() RETURNS trigger AS $$
DECLARE
  open_count integer;
BEGIN
  IF coalesce((to_jsonb(NEW)->>'is_platform_owned')::boolean, false) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.contact_email));

  SELECT count(*) INTO open_count FROM (
    SELECT id FROM "project_request" WHERE "contact_email" = NEW.contact_email AND NOT "is_platform_owned" AND "status" IN ('open', 'quoted', 'published')
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

-- Spec 0077 AC-12: co najwyżej pięć aktywnych ofert jednego producenta w projekcie
-- własnym. Blokada doradcza na parze (projekt, producent) zamyka wyścig dwóch
-- równoległych zapisów szóstego wariantu.
CREATE OR REPLACE FUNCTION enforce_platform_quote_variant_limit() RETURNS trigger AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.project_request_id IS NULL OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "project_request" WHERE "id" = NEW.project_request_id AND "is_platform_owned") THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_request_id::text || ':' || NEW.producer_id::text));

  SELECT count(*) INTO active_count FROM "project_quote"
    WHERE "project_request_id" = NEW.project_request_id AND "producer_id" = NEW.producer_id AND "status" = 'active';

  IF active_count >= 5 THEN
    RAISE EXCEPTION 'platform_quote_variant_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER project_quote_platform_variant_limit BEFORE INSERT ON "project_quote"
  FOR EACH ROW EXECUTE FUNCTION enforce_platform_quote_variant_limit();
