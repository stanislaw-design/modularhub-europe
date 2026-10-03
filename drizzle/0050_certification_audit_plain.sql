-- Spec 0065: nazwy i wystawcy certyfikatów oraz oceny zgodności nie są danymi
-- osobowymi, więc audit_log ma je zapisywać czytelnie (admin ma widzieć, co
-- zmieniono). Wspólny audit_log_capture() redaguje "name" do md5, dlatego te dwie
-- tabele dostają własną funkcję bez redakcji, z tym samym aktorem z app.actor_user_id.
CREATE OR REPLACE FUNCTION audit_log_capture_plain() RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
  v_action audit_action;
  v_actor_user_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := v_old ->> 'id';
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

DROP TRIGGER IF EXISTS producer_certification_audit ON "producer_certification";
--> statement-breakpoint
CREATE TRIGGER producer_certification_audit AFTER INSERT OR UPDATE OR DELETE ON "producer_certification"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture_plain();
--> statement-breakpoint

DROP TRIGGER IF EXISTS product_compliance_assessment_audit ON "product_compliance_assessment";
--> statement-breakpoint
CREATE TRIGGER product_compliance_assessment_audit AFTER INSERT OR UPDATE OR DELETE ON "product_compliance_assessment"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture_plain();
