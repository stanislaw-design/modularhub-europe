-- Fixes audit_log_capture() (0002_audit_log_trigger.sql) for tables with no
-- single `id` column, e.g. `favorite` (spec 0024), whose primary key is the
-- pair (client_id, product_id). The original body read `to_jsonb(row) ->> 'id'`
-- unconditionally; on such a table that is NULL, which violates
-- audit_log.record_id's NOT NULL constraint and rolls back every write on the
-- audited table (discovered live: every toggleFavorite insert was failing).
-- Falls back to an md5 hash of the full row when no `id` column exists —
-- still a stable, deterministic identifier, just not the real primary key.
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
