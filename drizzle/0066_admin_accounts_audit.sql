-- Spec 0077 część D AC-41: audyt zaproszeń administratora. `users` ma już wyzwalacz audytu
-- (users_audit, migracja 0002), który łapie blokadę i przywrócenie konta, więc tu dochodzi tylko
-- pending_registration. Tabela nie ma kolumny "id" i niesie w "payload" imię oraz telefon, dlatego
-- zamiast wspólnej funkcji audytu dostaje własną, z wąską listą pól: skrót adresu (md5), rola i data.
-- Zapisywane są tylko wiersze z rolą admin (rejestracje klientów i producentów audytu nie dostają).
CREATE OR REPLACE FUNCTION audit_log_capture_pending_registration() RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
  v_action audit_action;
  v_actor_user_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role <> 'admin' THEN RETURN NEW; END IF;
    v_action := 'create';
    v_new := jsonb_build_object('email_hash', md5(NEW.email), 'role', NEW.role, 'created_at', NEW.created_at);
    v_record_id := md5(NEW.email);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role <> 'admin' AND NEW.role <> 'admin' THEN RETURN NEW; END IF;
    v_action := 'update';
    v_old := jsonb_build_object('email_hash', md5(OLD.email), 'role', OLD.role, 'created_at', OLD.created_at);
    v_new := jsonb_build_object('email_hash', md5(NEW.email), 'role', NEW.role, 'created_at', NEW.created_at);
    v_record_id := md5(NEW.email);
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'admin' THEN RETURN OLD; END IF;
    v_action := 'delete';
    v_old := jsonb_build_object('email_hash', md5(OLD.email), 'role', OLD.role, 'created_at', OLD.created_at);
    v_record_id := md5(OLD.email);
  END IF;

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

DROP TRIGGER IF EXISTS pending_registration_audit ON "pending_registration";
--> statement-breakpoint
CREATE TRIGGER pending_registration_audit AFTER INSERT OR UPDATE OR DELETE ON "pending_registration"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture_pending_registration();
