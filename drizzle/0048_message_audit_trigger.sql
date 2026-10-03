-- Custom SQL migration file, put your code below! -----

-- Spec 0064 (atrybucja audytu panelu admina): the comment added by 0026 said
-- "message" celowo nie ma triggera audytu (treść rozmów nie może lądować w
-- audit_log). That is still true for the message BODY, but the admin panel
-- needs to know an advisor was active in a case and when, so this adds a
-- trigger for "message" that logs only metadata, via an explicit allowlist
-- rather than the denylist the other tables use: a denylist would silently
-- let any future new column on "message" (e.g. a richer payload field) flow
-- into audit_log by default, the wrong default for a table this migration is
-- specifically trying to keep content out of. body/payload are never read
-- here, so they can never appear in old_values/new_values, including across
-- the one update shape message_immutable permits (client requested
-- redaction): a redaction's old_values/new_values look identical to any
-- other update's, since neither ever touched body/payload to begin with.
CREATE OR REPLACE FUNCTION audit_log_capture() RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
  v_action audit_action;
  v_actor_user_id text;
  sensitive_key text;
BEGIN
  IF TG_TABLE_NAME = 'message' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'create';
      v_new := jsonb_build_object(
        'channel_id', NEW.channel_id,
        'author_user_id', NEW.author_user_id,
        'author_kind', NEW.author_kind,
        'type', NEW.type,
        'locale', NEW.locale,
        'idempotency_key', NEW.idempotency_key,
        'redacted_at', NEW.redacted_at,
        'created_at', NEW.created_at
      );
      v_record_id := NEW.id::text;
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'update';
      v_old := jsonb_build_object(
        'channel_id', OLD.channel_id,
        'author_user_id', OLD.author_user_id,
        'author_kind', OLD.author_kind,
        'type', OLD.type,
        'locale', OLD.locale,
        'idempotency_key', OLD.idempotency_key,
        'redacted_at', OLD.redacted_at,
        'created_at', OLD.created_at
      );
      v_new := jsonb_build_object(
        'channel_id', NEW.channel_id,
        'author_user_id', NEW.author_user_id,
        'author_kind', NEW.author_kind,
        'type', NEW.type,
        'locale', NEW.locale,
        'idempotency_key', NEW.idempotency_key,
        'redacted_at', NEW.redacted_at,
        'created_at', NEW.created_at
      );
      v_record_id := NEW.id::text;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'delete';
      v_old := jsonb_build_object(
        'channel_id', OLD.channel_id,
        'author_user_id', OLD.author_user_id,
        'author_kind', OLD.author_kind,
        'type', OLD.type,
        'locale', OLD.locale,
        'idempotency_key', OLD.idempotency_key,
        'redacted_at', OLD.redacted_at,
        'created_at', OLD.created_at
      );
      v_record_id := OLD.id::text;
    END IF;
  ELSE
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

    FOREACH sensitive_key IN ARRAY ARRAY['name', 'email', 'phone', 'nip', 'contact_name', 'contact_email', 'contact_phone', 'plot_street', 'plot_postal_code', 'plot_city', 'client_message'] LOOP
      IF v_old IS NOT NULL AND v_old ? sensitive_key AND v_old ->> sensitive_key IS NOT NULL THEN
        v_old := jsonb_set(v_old, ARRAY[sensitive_key], to_jsonb(md5(v_old ->> sensitive_key)));
      END IF;
      IF v_new IS NOT NULL AND v_new ? sensitive_key AND v_new ->> sensitive_key IS NOT NULL THEN
        v_new := jsonb_set(v_new, ARRAY[sensitive_key], to_jsonb(md5(v_new ->> sensitive_key)));
      END IF;
    END LOOP;
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

CREATE TRIGGER message_audit AFTER INSERT OR UPDATE OR DELETE ON "message"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture();
