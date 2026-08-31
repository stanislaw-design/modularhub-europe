-- Ścieżka audytu RODO (spec 0018, AC-2, Feature design > Audyt): jeden trigger
-- Postgres, nie dyscyplina kodu aplikacji przy każdym miejscu wywołania.
-- Redaguje pola osobowe (name, email, phone, nip, jeśli obecne w wierszu) do
-- skrótu md5 zamiast pełnej wartości, żeby audit_log samo nie stało się
-- miejscem, gdzie "usunięte" dane osobowe wciąż istnieją w pełnej postaci.
--
-- actor_user_id czyta opcjonalny GUC "app.actor_user_id", który przyszła
-- warstwa dostępu (feature 6+) ustawia przed zapisem (SET LOCAL
-- app.actor_user_id = '<uuid>'); brak ustawienia -> NULL (akcja systemowa).
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
    v_record_id := to_jsonb(NEW) ->> 'id';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := to_jsonb(NEW) ->> 'id';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := to_jsonb(OLD) ->> 'id';
  END IF;

  FOREACH sensitive_key IN ARRAY ARRAY['name', 'email', 'phone', 'nip'] LOOP
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

-- Podłączone tylko na tabelach niosących dane osobowe (spec 0018 Key invariants).
CREATE TRIGGER users_audit AFTER INSERT OR UPDATE OR DELETE ON "users"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER producer_audit AFTER INSERT OR UPDATE OR DELETE ON "producer"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER client_audit AFTER INSERT OR UPDATE OR DELETE ON "client"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER inquiry_audit AFTER INSERT OR UPDATE OR DELETE ON "inquiry"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER payment_audit AFTER INSERT OR UPDATE OR DELETE ON "payment"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
--> statement-breakpoint
CREATE TRIGGER document_audit AFTER INSERT OR UPDATE OR DELETE ON "document"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
