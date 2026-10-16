CREATE TABLE "inquiry_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_request_id" uuid,
	"bulk_product_inquiry_id" uuid,
	"r2_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_kind" text NOT NULL,
	"uploaded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"hidden_by_user_id" text,
	"deleted_at" timestamp with time zone,
	"deleted_by_kind" text,
	"purged_at" timestamp with time zone,
	CONSTRAINT "inquiry_attachment_exactly_one_link" CHECK ((("inquiry_attachment"."project_request_id" IS NOT NULL)::int + ("inquiry_attachment"."bulk_product_inquiry_id" IS NOT NULL)::int) = 1),
	CONSTRAINT "inquiry_attachment_size_positive" CHECK ("inquiry_attachment"."size_bytes" > 0),
	CONSTRAINT "inquiry_attachment_uploaded_by_kind" CHECK ("inquiry_attachment"."uploaded_by_kind" IN ('client', 'guest', 'staff')),
	CONSTRAINT "inquiry_attachment_guest_has_no_user" CHECK (("inquiry_attachment"."uploaded_by_kind" = 'guest') = ("inquiry_attachment"."uploaded_by_user_id" IS NULL)),
	CONSTRAINT "inquiry_attachment_hidden_consistent" CHECK (("inquiry_attachment"."hidden_at" IS NOT NULL) = ("inquiry_attachment"."hidden_reason" IS NOT NULL AND "inquiry_attachment"."hidden_by_user_id" IS NOT NULL)),
	CONSTRAINT "inquiry_attachment_deleted_consistent" CHECK (("inquiry_attachment"."deleted_at" IS NOT NULL) = ("inquiry_attachment"."deleted_by_kind" IS NOT NULL)),
	CONSTRAINT "inquiry_attachment_deleted_by_kind" CHECK ("inquiry_attachment"."deleted_by_kind" IS NULL OR "inquiry_attachment"."deleted_by_kind" IN ('client', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "bulk_product_inquiry" ADD COLUMN "attachments_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_request" ADD COLUMN "attachments_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry_attachment" ADD CONSTRAINT "inquiry_attachment_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachment" ADD CONSTRAINT "inquiry_attachment_bulk_product_inquiry_id_bulk_product_inquiry_id_fk" FOREIGN KEY ("bulk_product_inquiry_id") REFERENCES "public"."bulk_product_inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachment" ADD CONSTRAINT "inquiry_attachment_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_attachment" ADD CONSTRAINT "inquiry_attachment_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiry_attachment_project_request_idx" ON "inquiry_attachment" USING btree ("project_request_id") WHERE "inquiry_attachment"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "inquiry_attachment_bulk_product_inquiry_idx" ON "inquiry_attachment" USING btree ("bulk_product_inquiry_id") WHERE "inquiry_attachment"."deleted_at" IS NULL;--> statement-breakpoint

-- Spec 0070 część D, zadanie 20 (migracja 4), dopisane ręcznie (wyzwalacze poza DSL
-- drizzle-kit, ten sam wzór co drizzle/0014 i 0056).

-- 1) Limity i stan zapytania przy wstawieniu pliku (AC-28). Blokada doradcza na
-- zapytaniu serializuje równoległe wgrania, bo sterownik neon-http nie ma transakcji
-- i sam INSERT ... SELECT ... WHERE widziałby przy każdym wywołaniu ten sam stan.
-- Warunki stanu (status, wybór, termin, publikacja) dotyczą klienta i gościa, nie
-- doradcy ani admina (uploaded_by_kind = 'staff'). Limity liczby i rozmiaru
-- obowiązują wszystkich. Komunikaty błędów to kontrakt z lib/inquiry-attachment-actions.ts.
CREATE OR REPLACE FUNCTION enforce_inquiry_attachment_limits() RETURNS trigger AS $$
DECLARE
  v_parent_id uuid;
  v_status text;
  v_selected uuid;
  v_deadline timestamptz;
  v_published timestamptz;
  v_active_count integer;
  v_active_bytes bigint;
  v_stored_count integer;
  v_stored_bytes bigint;
BEGIN
  -- Wiersz bez dokładnie jednego powiązania odrzuci CHECK inquiry_attachment_exactly_one_link.
  IF (NEW."project_request_id" IS NULL) = (NEW."bulk_product_inquiry_id" IS NULL) THEN
    RETURN NEW;
  END IF;
  v_parent_id := COALESCE(NEW."project_request_id", NEW."bulk_product_inquiry_id");
  PERFORM pg_advisory_xact_lock(hashtext(v_parent_id::text));

  IF NEW."project_request_id" IS NOT NULL THEN
    SELECT "status"::text, "selected_quote_id", "deadline_at", "summary_published_at"
      INTO v_status, v_selected, v_deadline, v_published
      FROM "project_request" WHERE "id" = NEW."project_request_id";
  ELSE
    SELECT "status"::text, "selected_quote_id", "deadline_at", "summary_published_at"
      INTO v_status, v_selected, v_deadline, v_published
      FROM "bulk_product_inquiry" WHERE "id" = NEW."bulk_product_inquiry_id";
  END IF;

  IF NEW."uploaded_by_kind" <> 'staff' THEN
    IF v_status IS NULL OR v_status NOT IN ('open', 'quoted', 'published')
       OR v_selected IS NOT NULL OR v_deadline < now() OR v_published IS NOT NULL THEN
      RAISE EXCEPTION 'inquiry_attachment_closed' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT count(*), COALESCE(sum("size_bytes"), 0) INTO v_active_count, v_active_bytes
    FROM "inquiry_attachment"
    WHERE "deleted_at" IS NULL
      AND COALESCE("project_request_id", "bulk_product_inquiry_id") = v_parent_id;
  IF v_active_count >= 10 THEN
    RAISE EXCEPTION 'inquiry_attachment_limit_count' USING ERRCODE = 'P0001';
  END IF;
  IF v_active_bytes + NEW."size_bytes" > 62914560 THEN
    RAISE EXCEPTION 'inquiry_attachment_limit_size' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*), COALESCE(sum("size_bytes"), 0) INTO v_stored_count, v_stored_bytes
    FROM "inquiry_attachment"
    WHERE "purged_at" IS NULL
      AND COALESCE("project_request_id", "bulk_product_inquiry_id") = v_parent_id;
  IF v_stored_count >= 30 OR v_stored_bytes + NEW."size_bytes" > 157286400 THEN
    RAISE EXCEPTION 'inquiry_attachment_limit_stored' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER inquiry_attachment_limits BEFORE INSERT ON "inquiry_attachment"
  FOR EACH ROW EXECUTE FUNCTION enforce_inquiry_attachment_limits();
--> statement-breakpoint

-- 2) Audyt bez nazwy pliku i klucza R2 w treści (nazwa pliku może zawierać dane
-- osobowe inwestora, klucz to adres obiektu). Aktor z app.actor_user_id jak w
-- audit_log_capture() (drizzle/0002), ustawiany przez withAdminActor.
CREATE OR REPLACE FUNCTION inquiry_attachment_audit_capture() RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
  v_action audit_action;
  v_actor_user_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW) - ARRAY['filename', 'r2_key'];
    v_record_id := to_jsonb(NEW) ->> 'id';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD) - ARRAY['filename', 'r2_key'];
    v_new := to_jsonb(NEW) - ARRAY['filename', 'r2_key'];
    v_record_id := to_jsonb(NEW) ->> 'id';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD) - ARRAY['filename', 'r2_key'];
    v_record_id := to_jsonb(OLD) ->> 'id';
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
CREATE TRIGGER inquiry_attachment_audit AFTER INSERT OR UPDATE OR DELETE ON "inquiry_attachment"
  FOR EACH ROW EXECUTE FUNCTION inquiry_attachment_audit_capture();
