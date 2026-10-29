CREATE TABLE "producer_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_group_name_length" CHECK (char_length(btrim("producer_group"."name")) BETWEEN 2 AND 60),
	CONSTRAINT "producer_group_description_length" CHECK ("producer_group"."description" IS NULL OR char_length("producer_group"."description") <= 300)
);
--> statement-breakpoint
CREATE TABLE "producer_group_member" (
	"group_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_group_member_group_id_producer_id_pk" PRIMARY KEY("group_id","producer_id")
);
--> statement-breakpoint
ALTER TABLE "producer_group" ADD CONSTRAINT "producer_group_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_group_member" ADD CONSTRAINT "producer_group_member_group_id_producer_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."producer_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_group_member" ADD CONSTRAINT "producer_group_member_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "producer_group_name_unique" ON "producer_group" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "producer_group_member_producer_idx" ON "producer_group_member" USING btree ("producer_id");--> statement-breakpoint

-- Spec 0077 AC-27: audyt grup. Nazwa grupy nie jest daną osobową, więc zamiast wspólnej funkcji
-- (która haszuje pole "name") używamy audit_log_capture_plain() z migracji 0050, czyli zapisu
-- czytelnego, z autorem z app.actor_user_id. Ta funkcja bierze record_id z kolumny "id", a
-- producer_group_member nie ma jej (klucz złożony), więc dostaje ten sam zapas co funkcja wspólna:
-- skrót wiersza. Dla producer_group i dwóch tabel certyfikatów nic się nie zmienia (mają "id").
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

CREATE TRIGGER producer_group_audit AFTER INSERT OR UPDATE OR DELETE ON "producer_group"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture_plain();
--> statement-breakpoint
CREATE TRIGGER producer_group_member_audit AFTER INSERT OR UPDATE OR DELETE ON "producer_group_member"
  FOR EACH ROW EXECUTE FUNCTION audit_log_capture_plain();
