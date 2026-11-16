-- Migracja 0072 (spec 0085, bezpośrednie wgrywanie plików do R2): tabela upload_intent na produkcji.
--
-- Po co ręcznie: spec 0085 wymaga, żeby tabela istniała przed wdrożeniem kodu, który z niej korzysta.
-- Workflow deploy-production.yml i tak uruchamia npm run db:migrate przed wdrożeniem, więc ten plik
-- jest opcjonalny. Jeśli go uruchomisz, wpis w drizzle.__drizzle_migrations (niżej) sprawia, że
-- db:migrate uzna 0072 za zastosowaną i nie spróbuje jej powtórzyć.
--
-- Uruchomienie (jedna transakcja, zatrzymuje się na pierwszym błędzie):
--   SQL_TARGET_URL=<adres bazy PROD, unpooled> npx tsx scripts/run-sql-file.ts drizzle/_promote_0072_upload_intent_to_prod.sql
--
-- Zabezpieczenia (błąd cofa wszystko):
--   - poprzednia migracja 0071 (created_at 1794301787432) musi być już zapisana. Gdyby jej brakowało,
--     wpis 0072 z większym created_at kazałby db:migrate pominąć 0071.
--   - tabela upload_intent nie może jeszcze istnieć (CREATE TABLE bez IF NOT EXISTS).
--   - wpis 0072 jest dodawany tylko raz.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1794301787432) THEN
    RAISE EXCEPTION 'Brak migracji 0071 w drizzle.__drizzle_migrations: najpierw zastosuj wcześniejsze migracje (npm run db:migrate).';
  END IF;
END
$$;

CREATE TABLE "upload_intent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"project_request_id" uuid,
	"bulk_product_inquiry_id" uuid,
	"project_quote_id" uuid,
	"actor_kind" text NOT NULL,
	"actor_user_id" text,
	"r2_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"declared_size_bytes" integer NOT NULL,
	"filename" text NOT NULL,
	"consent_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"purged_at" timestamp with time zone,
	CONSTRAINT "upload_intent_purpose" CHECK ("upload_intent"."purpose" IN ('inquiry_attachment', 'project_quote_pdf')),
	CONSTRAINT "upload_intent_actor_kind" CHECK ("upload_intent"."actor_kind" IN ('staff', 'client', 'guest', 'producer')),
	CONSTRAINT "upload_intent_guest_has_no_user" CHECK (("upload_intent"."actor_kind" = 'guest') = ("upload_intent"."actor_user_id" IS NULL)),
	CONSTRAINT "upload_intent_size_range" CHECK ("upload_intent"."declared_size_bytes" BETWEEN 1 AND 20971520),
	CONSTRAINT "upload_intent_target" CHECK ((
        "upload_intent"."purpose" = 'inquiry_attachment'
        AND (("upload_intent"."project_request_id" IS NOT NULL)::int + ("upload_intent"."bulk_product_inquiry_id" IS NOT NULL)::int) = 1
        AND "upload_intent"."project_quote_id" IS NULL
      ) OR (
        "upload_intent"."purpose" = 'project_quote_pdf'
        AND "upload_intent"."project_quote_id" IS NOT NULL
        AND "upload_intent"."project_request_id" IS NULL
        AND "upload_intent"."bulk_product_inquiry_id" IS NULL
      ))
);

ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_bulk_product_inquiry_id_bulk_product_inquiry_id_fk" FOREIGN KEY ("bulk_product_inquiry_id") REFERENCES "public"."bulk_product_inquiry"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_project_quote_id_project_quote_id_fk" FOREIGN KEY ("project_quote_id") REFERENCES "public"."project_quote"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "upload_intent_r2_key_idx" ON "upload_intent" USING btree ("r2_key");
CREATE INDEX "upload_intent_open_expires_idx" ON "upload_intent" USING btree ("expires_at") WHERE "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;
CREATE INDEX "upload_intent_project_request_idx" ON "upload_intent" USING btree ("project_request_id") WHERE "upload_intent"."project_request_id" IS NOT NULL AND "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;
CREATE INDEX "upload_intent_bulk_inquiry_idx" ON "upload_intent" USING btree ("bulk_product_inquiry_id") WHERE "upload_intent"."bulk_product_inquiry_id" IS NOT NULL AND "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;
CREATE INDEX "upload_intent_project_quote_idx" ON "upload_intent" USING btree ("project_quote_id") WHERE "upload_intent"."project_quote_id" IS NOT NULL AND "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '5e1a0cf59920fd55a0a255e9bda60c934475ebca33dfcbc16122cb0f6bf74b90', 1794818285209
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1794818285209);
