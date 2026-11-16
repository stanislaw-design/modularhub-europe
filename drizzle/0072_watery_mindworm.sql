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
--> statement-breakpoint
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_project_request_id_project_request_id_fk" FOREIGN KEY ("project_request_id") REFERENCES "public"."project_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_bulk_product_inquiry_id_bulk_product_inquiry_id_fk" FOREIGN KEY ("bulk_product_inquiry_id") REFERENCES "public"."bulk_product_inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_project_quote_id_project_quote_id_fk" FOREIGN KEY ("project_quote_id") REFERENCES "public"."project_quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intent" ADD CONSTRAINT "upload_intent_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "upload_intent_r2_key_idx" ON "upload_intent" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX "upload_intent_open_expires_idx" ON "upload_intent" USING btree ("expires_at") WHERE "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;--> statement-breakpoint
CREATE INDEX "upload_intent_project_request_idx" ON "upload_intent" USING btree ("project_request_id") WHERE "upload_intent"."project_request_id" IS NOT NULL AND "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;--> statement-breakpoint
CREATE INDEX "upload_intent_bulk_inquiry_idx" ON "upload_intent" USING btree ("bulk_product_inquiry_id") WHERE "upload_intent"."bulk_product_inquiry_id" IS NOT NULL AND "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;--> statement-breakpoint
CREATE INDEX "upload_intent_project_quote_idx" ON "upload_intent" USING btree ("project_quote_id") WHERE "upload_intent"."project_quote_id" IS NOT NULL AND "upload_intent"."consumed_at" IS NULL AND "upload_intent"."purged_at" IS NULL;