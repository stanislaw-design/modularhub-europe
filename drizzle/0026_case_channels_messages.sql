CREATE TYPE "public"."case_closed_reason" AS ENUM('brak_ofert', 'klient_zrezygnowal', 'poza_obszarem', 'do_b2b', 'inny');--> statement-breakpoint
CREATE TYPE "public"."case_stage" AS ENUM('nowe', 'rozmowa', 'brief_do_zatwierdzenia', 'producenci_odpowiadaja', 'porownanie_w_przygotowaniu', 'porownanie_gotowe', 'finalista_wybrany', 'wspolne_ustalenia', 'zamkniete_bez_wyboru', 'legacy_direct');--> statement-breakpoint
CREATE TYPE "public"."case_waiting_on" AS ENUM('client', 'advisor', 'producer');--> statement-breakpoint
CREATE TYPE "public"."channel_kind" AS ENUM('klient_doradca', 'producent_doradca', 'wspolny');--> statement-breakpoint
CREATE TYPE "public"."message_author_kind" AS ENUM('client', 'advisor', 'producer', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'question_card', 'answer', 'file_request', 'file', 'brief_preview', 'brief_approval', 'consent', 'alternative_proposal', 'system_notice');--> statement-breakpoint
CREATE TABLE "channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"kind" "channel_kind" NOT NULL,
	"producer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_producer_matches_kind" CHECK (("channel"."kind" = 'klient_doradca' AND "channel"."producer_id" IS NULL) OR ("channel"."kind" <> 'klient_doradca' AND "channel"."producer_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "channel_read_state" (
	"channel_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"last_email_at" timestamp with time zone,
	CONSTRAINT "channel_read_state_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_user_id" text,
	"author_kind" "message_author_kind" NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"body" text,
	"payload" jsonb,
	"locale" text NOT NULL,
	"idempotency_key" text,
	"redacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_idempotency_per_channel" UNIQUE("channel_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "plot_street" text;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "plot_postal_code" text;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "plot_city" text;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "plot_region" text;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "client_message" text;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "assigned_advisor_id" text;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "stage" "case_stage" DEFAULT 'legacy_direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "waiting_on" "case_waiting_on";--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "finalist_offer_id" uuid;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "finalist_selected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "closed_reason" "case_closed_reason";--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "last_client_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "last_advisor_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_read_state" ADD CONSTRAINT "channel_read_state_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_read_state" ADD CONSTRAINT "channel_read_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_unique_per_inquiry_kind_producer" ON "channel" USING btree ("inquiry_id","kind",coalesce("producer_id", '00000000-0000-0000-0000-000000000000'::uuid));--> statement-breakpoint
CREATE UNIQUE INDEX "channel_one_wspolny_per_inquiry" ON "channel" USING btree ("inquiry_id") WHERE "channel"."kind" = 'wspolny';--> statement-breakpoint
CREATE INDEX "message_channel_created_idx" ON "message" USING btree ("channel_id","created_at","id");--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_assigned_advisor_id_users_id_fk" FOREIGN KEY ("assigned_advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Wiadomości są niezmienne (spec 0048 AC-31): trigger odrzuca DELETE i każdy
-- UPDATE poza jednym wyjątkiem, redakcją na prośbę klienta. Redakcja zeruje
-- wyłącznie body i payload i ustawia redacted_at; żadna inna kolumna nie może
-- się zmienić, więc autor, typ, czas i klucz idempotencji zostają jako ślad.
CREATE OR REPLACE FUNCTION message_enforce_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'message is immutable: DELETE is not allowed';
  END IF;

  IF NEW.body IS NULL
     AND NEW.payload IS NULL
     AND NEW.redacted_at IS NOT NULL
     AND (OLD.redacted_at IS NULL OR NEW.redacted_at = OLD.redacted_at)
     AND NEW.id = OLD.id
     AND NEW.channel_id = OLD.channel_id
     AND NEW.author_user_id IS NOT DISTINCT FROM OLD.author_user_id
     AND NEW.author_kind = OLD.author_kind
     AND NEW.type = OLD.type
     AND NEW.locale = OLD.locale
     AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
     AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'message is immutable: only redaction (body and payload set to NULL, redacted_at set) is allowed';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER message_immutable BEFORE UPDATE OR DELETE ON "message"
  FOR EACH ROW EXECUTE FUNCTION message_enforce_immutable();
--> statement-breakpoint

-- Audyt sprawy doradczej (spec 0048): pełny adres działki i wolny tekst
-- klienta leżą na wierszu "inquiry", który ma już trigger audytu. Bez tej
-- zmiany trafiałyby do audit_log w pełnej postaci, wbrew celowi funkcji (dane
-- osobowe tylko jako skrót md5). Reszta funkcji bez zmian względem 0014.
-- Tabela "message" celowo nie ma triggera audytu: treść rozmów nie może
-- lądować w audit_log.
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

  FOREACH sensitive_key IN ARRAY ARRAY['name', 'email', 'phone', 'nip', 'contact_name', 'contact_email', 'contact_phone', 'plot_street', 'plot_postal_code', 'plot_city', 'client_message'] LOOP
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
