CREATE TYPE "public"."ai_candidate_origin" AS ENUM('extracted', 'inferred', 'generated', 'translated');--> statement-breakpoint
CREATE TYPE "public"."ai_confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."ai_decision_type" AS ENUM('accepted', 'manual', 'rejected', 'not_applicable', 'keep_current', 'overwrite_changed');--> statement-breakpoint
CREATE TYPE "public"."ai_document_issue_stage" AS ENUM('security_scan', 'document_intelligence', 'model_extraction', 'normalization');--> statement-breakpoint
CREATE TYPE "public"."ai_evidence_type" AS ENUM('source', 'context');--> statement-breakpoint
CREATE TYPE "public"."ai_extraction_stage" AS ENUM('upload', 'queue', 'security_scan', 'document_intelligence', 'model_extraction', 'normalization', 'review', 'apply');--> statement-breakpoint
CREATE TYPE "public"."ai_extraction_status" AS ENUM('uploading', 'queued', 'scanning', 'extracting', 'normalizing', 'review_ready', 'applying', 'applied', 'cancel_requested', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_observation_review_status" AS ENUM('unreviewed', 'acknowledged', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."ai_ocr_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_pdf_kind" AS ENUM('text', 'scan', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."ai_support_access_result" AS ENUM('granted', 'denied', 'used', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_translation_locale" AS ENUM('en', 'de', 'nl');--> statement-breakpoint
CREATE TYPE "public"."ai_translation_status" AS ENUM('queued', 'processing', 'ready', 'failed', 'superseded');--> statement-breakpoint
ALTER TYPE "public"."document_purpose" ADD VALUE 'ai_source_pdf';--> statement-breakpoint
CREATE TABLE "ai_additional_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"excerpt" text NOT NULL,
	"confidence" "ai_confidence" NOT NULL,
	"review_status" "ai_observation_review_status" DEFAULT 'unreviewed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_additional_observation_page_positive" CHECK ("ai_additional_observation"."page_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_candidate_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"evidence_type" "ai_evidence_type" NOT NULL,
	"page_number" integer,
	"excerpt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_candidate_evidence_page_positive" CHECK ("ai_candidate_evidence"."page_number" IS NULL OR "ai_candidate_evidence"."page_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_document_acknowledgement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"document_issue_id" uuid NOT NULL,
	"acknowledged_by_user_id" text NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_document_issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"page_from" integer,
	"page_to" integer,
	"issue_code" text NOT NULL,
	"stage" "ai_document_issue_stage" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_document_issue_page_range" CHECK (("ai_document_issue"."page_from" IS NULL AND "ai_document_issue"."page_to" IS NULL) OR ("ai_document_issue"."page_from" > 0 AND "ai_document_issue"."page_to" >= "ai_document_issue"."page_from"))
);
--> statement-breakpoint
CREATE TABLE "ai_extraction_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"status" "ai_extraction_status" DEFAULT 'uploading' NOT NULL,
	"current_stage" "ai_extraction_stage" DEFAULT 'upload' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"decision_revision" integer DEFAULT 0 NOT NULL,
	"schema_version" text NOT NULL,
	"base_locale" text DEFAULT 'pl' NOT NULL,
	"target_locales" text[] DEFAULT ARRAY['en', 'de', 'nl']::text[] NOT NULL,
	"provider" text DEFAULT 'azure' NOT NULL,
	"model" text NOT NULL,
	"safe_error_code" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"retention_due_at" timestamp with time zone,
	"purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_extraction_session_progress_range" CHECK ("ai_extraction_session"."progress" BETWEEN 0 AND 100),
	CONSTRAINT "ai_extraction_session_attempt_nonnegative" CHECK ("ai_extraction_session"."attempt_count" >= 0),
	CONSTRAINT "ai_extraction_session_locale_contract" CHECK ("ai_extraction_session"."base_locale" = 'pl' AND "ai_extraction_session"."target_locales" = ARRAY['en', 'de', 'nl']::text[])
);
--> statement-breakpoint
CREATE TABLE "ai_field_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source_candidate_id" uuid,
	"field_path" text NOT NULL,
	"entity_key" text,
	"parent_entity_key" text,
	"raw_value" jsonb NOT NULL,
	"normalized_value" jsonb NOT NULL,
	"origin" "ai_candidate_origin" NOT NULL,
	"confidence" "ai_confidence" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_field_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"selected_candidate_id" uuid,
	"previous_decision_id" uuid,
	"field_path" text NOT NULL,
	"entity_key" text,
	"parent_entity_key" text,
	"final_value" jsonb NOT NULL,
	"decision_type" "ai_decision_type" NOT NULL,
	"version" integer NOT NULL,
	"compared_value_hash" text,
	"decided_by_user_id" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_field_decision_identity_version_unique" UNIQUE NULLS NOT DISTINCT("session_id","field_path","entity_key","parent_entity_key","version"),
	CONSTRAINT "ai_field_decision_version_positive" CHECK ("ai_field_decision"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_field_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"entity_key" text,
	"parent_entity_key" text,
	"snapshot_value" jsonb NOT NULL,
	"value_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_field_snapshot_identity_unique" UNIQUE NULLS NOT DISTINCT("session_id","field_path","entity_key","parent_entity_key")
);
--> statement-breakpoint
CREATE TABLE "ai_source_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"safe_filename" text NOT NULL,
	"sha256" text NOT NULL,
	"page_count" integer NOT NULL,
	"detected_language" text,
	"pdf_kind" "ai_pdf_kind" NOT NULL,
	"ocr_status" "ai_ocr_status" DEFAULT 'pending' NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_source_document_page_count_positive" CHECK ("ai_source_document"."page_count" > 0),
	CONSTRAINT "ai_source_document_sort_nonnegative" CHECK ("ai_source_document"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_support_access_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_role" "role" NOT NULL,
	"session_id" uuid,
	"source_document_id" uuid,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"result" "ai_support_access_result" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_support_access_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"administrator_user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_translation_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"entity_key" text,
	"parent_entity_key" text,
	"source_decision_id" uuid NOT NULL,
	"target_locale" "ai_translation_locale" NOT NULL,
	"status" "ai_translation_status" DEFAULT 'queued' NOT NULL,
	"candidate_id" uuid,
	"safe_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"service" text NOT NULL,
	"region" text NOT NULL,
	"meter" text NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"unit_price" numeric(18, 8) NOT NULL,
	"rate_retrieved_at" timestamp with time zone NOT NULL,
	"estimated_cost" numeric(18, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_additional_observation" ADD CONSTRAINT "ai_additional_observation_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_additional_observation" ADD CONSTRAINT "ai_additional_observation_source_document_id_ai_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_source_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_candidate_evidence" ADD CONSTRAINT "ai_candidate_evidence_candidate_id_ai_field_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."ai_field_candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_candidate_evidence" ADD CONSTRAINT "ai_candidate_evidence_source_document_id_ai_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_source_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_document_acknowledgement" ADD CONSTRAINT "ai_document_acknowledgement_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_document_acknowledgement" ADD CONSTRAINT "ai_document_acknowledgement_document_issue_id_ai_document_issue_id_fk" FOREIGN KEY ("document_issue_id") REFERENCES "public"."ai_document_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_document_acknowledgement" ADD CONSTRAINT "ai_document_acknowledgement_acknowledged_by_user_id_users_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_document_issue" ADD CONSTRAINT "ai_document_issue_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_document_issue" ADD CONSTRAINT "ai_document_issue_source_document_id_ai_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_source_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_session" ADD CONSTRAINT "ai_extraction_session_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_session" ADD CONSTRAINT "ai_extraction_session_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_extraction_session" ADD CONSTRAINT "ai_extraction_session_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_candidate" ADD CONSTRAINT "ai_field_candidate_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_candidate" ADD CONSTRAINT "ai_field_candidate_source_candidate_id_ai_field_candidate_id_fk" FOREIGN KEY ("source_candidate_id") REFERENCES "public"."ai_field_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_decision" ADD CONSTRAINT "ai_field_decision_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_decision" ADD CONSTRAINT "ai_field_decision_selected_candidate_id_ai_field_candidate_id_fk" FOREIGN KEY ("selected_candidate_id") REFERENCES "public"."ai_field_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_decision" ADD CONSTRAINT "ai_field_decision_previous_decision_id_ai_field_decision_id_fk" FOREIGN KEY ("previous_decision_id") REFERENCES "public"."ai_field_decision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_decision" ADD CONSTRAINT "ai_field_decision_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_field_snapshot" ADD CONSTRAINT "ai_field_snapshot_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_source_document" ADD CONSTRAINT "ai_source_document_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_source_document" ADD CONSTRAINT "ai_source_document_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_access_audit" ADD CONSTRAINT "ai_support_access_audit_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_access_audit" ADD CONSTRAINT "ai_support_access_audit_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_access_audit" ADD CONSTRAINT "ai_support_access_audit_source_document_id_ai_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_source_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_access_grant" ADD CONSTRAINT "ai_support_access_grant_administrator_user_id_users_id_fk" FOREIGN KEY ("administrator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_access_grant" ADD CONSTRAINT "ai_support_access_grant_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_support_access_grant" ADD CONSTRAINT "ai_support_access_grant_source_document_id_ai_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."ai_source_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_request" ADD CONSTRAINT "ai_translation_request_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_request" ADD CONSTRAINT "ai_translation_request_source_decision_id_ai_field_decision_id_fk" FOREIGN KEY ("source_decision_id") REFERENCES "public"."ai_field_decision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_request" ADD CONSTRAINT "ai_translation_request_candidate_id_ai_field_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."ai_field_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_event" ADD CONSTRAINT "ai_usage_event_session_id_ai_extraction_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_extraction_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_additional_observation_session_idx" ON "ai_additional_observation" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_candidate_evidence_candidate_idx" ON "ai_candidate_evidence" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_document_acknowledgement_issue_unique" ON "ai_document_acknowledgement" USING btree ("session_id","document_issue_id");--> statement-breakpoint
CREATE INDEX "ai_document_issue_session_idx" ON "ai_document_issue" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_extraction_session_product_created_idx" ON "ai_extraction_session" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_extraction_session_producer_created_idx" ON "ai_extraction_session" USING btree ("producer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_extraction_session_one_active_per_producer" ON "ai_extraction_session" USING btree ("producer_id") WHERE "ai_extraction_session"."status" IN ('uploading', 'queued', 'scanning', 'extracting', 'normalizing', 'applying', 'cancel_requested');--> statement-breakpoint
CREATE INDEX "ai_field_candidate_session_field_idx" ON "ai_field_candidate" USING btree ("session_id","field_path");--> statement-breakpoint
CREATE INDEX "ai_field_decision_session_decided_idx" ON "ai_field_decision" USING btree ("session_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_source_document_session_sha_unique" ON "ai_source_document" USING btree ("session_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_source_document_session_sort_unique" ON "ai_source_document" USING btree ("session_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_source_document_document_unique" ON "ai_source_document" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "ai_support_access_audit_created_idx" ON "ai_support_access_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_support_access_grant_expiry_idx" ON "ai_support_access_grant" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_translation_request_source_locale_unique" ON "ai_translation_request" USING btree ("source_decision_id","target_locale");--> statement-breakpoint
CREATE INDEX "ai_translation_request_session_status_idx" ON "ai_translation_request" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "ai_usage_event_session_idx" ON "ai_usage_event" USING btree ("session_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION save_ai_field_decision(
  p_session_id uuid,
  p_producer_id uuid,
  p_user_id text,
  p_field_path text,
  p_entity_key text,
  p_parent_entity_key text,
  p_selected_candidate_id uuid,
  p_final_value jsonb,
  p_decision_type text,
  p_expected_field_version integer,
  p_expected_revision integer,
  p_compared_value_hash text DEFAULT NULL
)
RETURNS TABLE(decision_id uuid, field_version integer, decision_revision integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_session ai_extraction_session%ROWTYPE;
  v_previous ai_field_decision%ROWTYPE;
  v_candidate ai_field_candidate%ROWTYPE;
  v_decision_id uuid;
  v_field_version integer;
BEGIN
  SELECT * INTO v_session
  FROM ai_extraction_session
  WHERE id = p_session_id
    AND producer_id = p_producer_id
    AND status = 'review_ready'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI_SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_session.decision_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'AI_DECISION_REVISION_CONFLICT' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_previous
  FROM ai_field_decision
  WHERE session_id = p_session_id
    AND field_path = p_field_path
    AND entity_key IS NOT DISTINCT FROM p_entity_key
    AND parent_entity_key IS NOT DISTINCT FROM p_parent_entity_key
  ORDER BY version DESC
  LIMIT 1;

  IF COALESCE(v_previous.version, 0) <> p_expected_field_version THEN
    RAISE EXCEPTION 'AI_FIELD_VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;

  IF p_selected_candidate_id IS NOT NULL THEN
    SELECT * INTO v_candidate
    FROM ai_field_candidate
    WHERE id = p_selected_candidate_id
      AND session_id = p_session_id
      AND field_path = p_field_path
      AND entity_key IS NOT DISTINCT FROM p_entity_key
      AND parent_entity_key IS NOT DISTINCT FROM p_parent_entity_key;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'AI_CANDIDATE_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_decision_type = 'accepted' AND p_selected_candidate_id IS NULL THEN
    RAISE EXCEPTION 'AI_ACCEPTED_REQUIRES_CANDIDATE' USING ERRCODE = '23514';
  END IF;

  v_field_version := COALESCE(v_previous.version, 0) + 1;
  INSERT INTO ai_field_decision (
    session_id, selected_candidate_id, previous_decision_id, field_path,
    entity_key, parent_entity_key, final_value, decision_type, version,
    compared_value_hash, decided_by_user_id
  ) VALUES (
    p_session_id, p_selected_candidate_id, v_previous.id, p_field_path,
    p_entity_key, p_parent_entity_key, p_final_value,
    p_decision_type::ai_decision_type, v_field_version,
    p_compared_value_hash, p_user_id
  ) RETURNING id INTO v_decision_id;

  UPDATE ai_extraction_session
  SET decision_revision = ai_extraction_session.decision_revision + 1
  WHERE id = p_session_id
  RETURNING ai_extraction_session.decision_revision INTO decision_revision;

  decision_id := v_decision_id;
  field_version := v_field_version;
  RETURN NEXT;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_ai_review_gate(p_session_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_codes text[] := ARRAY[]::text[];
  v_status ai_extraction_status;
  v_schema_version text;
BEGIN
  SELECT status, schema_version INTO v_status, v_schema_version
  FROM ai_extraction_session
  WHERE id = p_session_id;

  IF v_status IS NULL OR v_status <> 'review_ready' THEN
    v_codes := array_append(v_codes, 'SESSION_NOT_REVIEWABLE');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ai_field_candidate c
    WHERE c.session_id = p_session_id
    GROUP BY c.field_path, c.entity_key, c.parent_entity_key
    HAVING count(DISTINCT c.normalized_value::text) > 1
      AND NOT EXISTS (
        SELECT 1 FROM ai_field_decision d
        WHERE d.session_id = p_session_id
          AND d.field_path = c.field_path
          AND d.entity_key IS NOT DISTINCT FROM c.entity_key
          AND d.parent_entity_key IS NOT DISTINCT FROM c.parent_entity_key
      )
  ) THEN
    v_codes := array_append(v_codes, 'UNRESOLVED_CONFLICT');
  END IF;

  IF EXISTS (
    SELECT 1 FROM ai_field_candidate c
    WHERE c.session_id = p_session_id
      AND c.confidence = 'low'
      AND NOT EXISTS (
        SELECT 1 FROM ai_field_decision d
        WHERE d.session_id = p_session_id
          AND d.field_path = c.field_path
          AND d.entity_key IS NOT DISTINCT FROM c.entity_key
          AND d.parent_entity_key IS NOT DISTINCT FROM c.parent_entity_key
      )
  ) THEN
    v_codes := array_append(v_codes, 'LOW_CONFIDENCE_UNREVIEWED');
  END IF;

  IF EXISTS (
    SELECT 1 FROM ai_document_issue i
    WHERE i.session_id = p_session_id
      AND NOT EXISTS (
        SELECT 1 FROM ai_document_acknowledgement a
        WHERE a.session_id = p_session_id AND a.document_issue_id = i.id
      )
  ) THEN
    v_codes := array_append(v_codes, 'DOCUMENT_ISSUE_UNACKNOWLEDGED');
  END IF;

  IF EXISTS (
    SELECT 1 FROM ai_field_candidate child
    WHERE child.session_id = p_session_id
      AND child.parent_entity_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM ai_field_candidate parent
        WHERE parent.session_id = p_session_id
          AND parent.entity_key = child.parent_entity_key
          AND parent.parent_entity_key IS NULL
          AND parent.field_path LIKE 'variants[]%'
      )
  ) THEN
    v_codes := array_append(v_codes, 'INVALID_ENTITY_GRAPH');
  END IF;

  IF v_schema_version IS DISTINCT FROM 'house-import-v1' THEN
    v_codes := array_append(v_codes, 'SCHEMA_VERSION_MISMATCH');
  END IF;

  RETURN v_codes;
END;
$$;
