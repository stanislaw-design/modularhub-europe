-- Duże zamówienia B2B (spec 0037). Dwa niezależne triggery, ten sam wzorzec
-- co drizzle/0002_audit_log_trigger.sql i drizzle/0012_offer_order_audit_triggers.sql
-- (beyond drizzle-kit's DSL, patrz lib/db/AGENTS.md).

-- 1) Audyt: project_request/bulk_product_inquiry niosą dane osobowe osoby BEZ
-- konta (imię, e mail, telefon), tak samo jak dzisiejsze inquiry (spec 0018
-- Key invariants). Kolumny nazywają się tu contact_name/contact_email/contact_phone,
-- nie name/email/phone jak na inquiry, więc lista redagowanych kluczy w
-- audit_log_capture() musi się o nie poszerzyć (CREATE OR REPLACE) —
-- inaczej te dwie nowe tabele pisałyby dane osobowe do audit_log w pełnej,
-- nieredagowanej postaci.
--
-- /debug (2026-09-13): ta funkcja musi zachować też poprawkę z
-- drizzle/0007_fix_favorite_audit_trigger.sql (COALESCE na v_record_id).
-- Pierwsza wersja tego pliku przez pomyłkę skopiowała treść z ORYGINALNEGO
-- drizzle/0002_audit_log_trigger.sql (bez COALESCE), co cofnęło poprawkę z
-- 0007 na żywej bazie i wywalało KAŻDY insert na tabeli bez pojedynczej
-- kolumny "id" (favorite, offer_item) błędem NOT NULL na audit_log.record_id
-- (dr.record_id := to_jsonb(...) ->> 'id' jest NULL dla klucza złożonego).
CREATE OR REPLACE FUNCTION audit_log_capture() RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
  v_action audit_action;
  v_actor_user_id text;
  sensitive_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new ->> 'id', md5(v_new::text));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new ->> 'id', md5(v_new::text));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(v_old ->> 'id', md5(v_old::text));
  END IF;

  FOREACH sensitive_key IN ARRAY ARRAY['name', 'email', 'phone', 'nip', 'contact_name', 'contact_email', 'contact_phone'] LOOP
    IF v_old IS NOT NULL AND v_old ? sensitive_key AND v_old ->> sensitive_key IS NOT NULL THEN
      v_old := jsonb_set(v_old, ARRAY[sensitive_key], to_jsonb(md5(v_old ->> sensitive_key)));
    END IF;
    IF v_new IS NOT NULL AND v_new ? sensitive_key AND v_new ->> sensitive_key IS NOT NULL THEN
      v_new := jsonb_set(v_new, ARRAY[sensitive_key], to_jsonb(md5(v_new ->> sensitive_key)));
    END IF;
  END LOOP;

  BEGIN
    v_actor_user_id := NULLIF(current_setting('app.actor_user_id', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_actor_user_id := NULL;
  END;

  INSERT INTO "audit_log" ("id", "actor_user_id", "action", "table_name", "record_id", "old_values", "new_values", "created_at")
  VALUES (gen_random_uuid(), v_actor_user_id, v_action, TG_TABLE_NAME, v_record_id, v_old, v_new, now());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER project_request_audit AFTER INSERT OR UPDATE OR DELETE ON "project_request"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER bulk_product_inquiry_audit AFTER INSERT OR UPDATE OR DELETE ON "bulk_product_inquiry"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint

-- 2) Limit 3 jednocześnie nierozstrzygniętych zgłoszeń na znormalizowany e mail
-- (AC-10), egzekwowany atomowo (spec 0037 Key invariants i Follow-up: technika
-- do rozstrzygnięcia przy budowie). db.batch (ten sterownik nie wspiera
-- db.transaction, patrz lib/db/AGENTS.md) nie daje samo w sobie blokady
-- międzyprocesowej, więc licznik "sprawdź przed zapisem" po stronie aplikacji
-- mógłby przepuścić dwa równoległe zgłoszenia ponad limit. pg_advisory_xact_lock
-- blokuje na czas całej niejawnej transakcji pojedynczego INSERT (per e mail,
-- hashtext jako klucz) i zwalnia się sam po jej zakończeniu: drugie równoległe
-- zgłoszenie tego samego e maila czeka na tę blokadę, więc widzi już
-- zatwierdzony (lub odrzucony) wynik pierwszego, zanim policzy swoje wiersze.
CREATE OR REPLACE FUNCTION enforce_bulk_request_email_limit() RETURNS trigger AS $$
DECLARE
  open_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.contact_email));

  SELECT count(*) INTO open_count FROM (
    SELECT id FROM "project_request" WHERE "contact_email" = NEW.contact_email AND "status" IN ('open', 'quoted')
    UNION ALL
    SELECT id FROM "bulk_product_inquiry" WHERE "contact_email" = NEW.contact_email AND "status" IN ('open', 'quoted')
  ) combined;

  IF open_count >= 3 THEN
    RAISE EXCEPTION 'bulk_request_email_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER project_request_email_limit BEFORE INSERT ON "project_request"
  FOR EACH ROW EXECUTE FUNCTION enforce_bulk_request_email_limit();
--> statement-breakpoint
CREATE TRIGGER bulk_product_inquiry_email_limit BEFORE INSERT ON "bulk_product_inquiry"
  FOR EACH ROW EXECUTE FUNCTION enforce_bulk_request_email_limit();
