CREATE TABLE "crm_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"preferred_channel" text,
	"language" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "crm_contact_id_partner_unique" UNIQUE("id","partner_id"),
	CONSTRAINT "crm_contact_channel_valid" CHECK ("crm_contact"."preferred_channel" IS NULL OR "crm_contact"."preferred_channel" IN ('phone', 'whatsapp', 'email')),
	CONSTRAINT "crm_contact_language_valid" CHECK ("crm_contact"."language" IS NULL OR "crm_contact"."language" IN ('pl', 'en', 'de', 'nl'))
);
--> statement-breakpoint
CREATE TABLE "crm_digest_log" (
	"digest_date" date PRIMARY KEY DEFAULT (now() AT TIME ZONE 'Europe/Warsaw')::date NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"recipient_count" integer
);
--> statement-breakpoint
CREATE TABLE "crm_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"thread_id" uuid,
	"contact_id" uuid,
	"author_user_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"direction" text NOT NULL,
	"channel" text NOT NULL,
	"body" text NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "crm_entry_direction_valid" CHECK ("crm_entry"."direction" IN ('outbound', 'inbound', 'internal')),
	CONSTRAINT "crm_entry_channel_valid" CHECK ("crm_entry"."channel" IN ('phone', 'whatsapp', 'email', 'meeting', 'platform', 'other')),
	CONSTRAINT "crm_entry_source_valid" CHECK ("crm_entry"."source" IN ('web', 'bot'))
);
--> statement-breakpoint
CREATE TABLE "crm_entry_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"r2_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "crm_entry_attachment_size_valid" CHECK ("crm_entry_attachment"."size_bytes" > 0 AND "crm_entry_attachment"."size_bytes" <= 20971520),
	CONSTRAINT "crm_entry_attachment_mime_valid" CHECK ("crm_entry_attachment"."mime_type" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
);
--> statement-breakpoint
CREATE TABLE "crm_partner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"website" text,
	"country_code" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"producer_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "crm_partner_kind_valid" CHECK ("crm_partner"."kind" IN ('producent', 'dostawca', 'klient', 'partner', 'inny'))
);
--> statement-breakpoint
CREATE TABLE "crm_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"thread_id" uuid,
	"title" text NOT NULL,
	"note" text,
	"due_date" date,
	"assignee_kind" text NOT NULL,
	"assignee_user_id" text,
	"external_contact_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_by" text NOT NULL,
	"link_kind" text,
	"link_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_task_status_valid" CHECK ("crm_task"."status" IN ('open', 'done', 'cancelled')),
	CONSTRAINT "crm_task_assignee_consistent" CHECK (("crm_task"."assignee_kind" = 'user' AND "crm_task"."assignee_user_id" IS NOT NULL AND "crm_task"."external_contact_id" IS NULL) OR ("crm_task"."assignee_kind" = 'external' AND "crm_task"."assignee_user_id" IS NULL)),
	CONSTRAINT "crm_task_link_consistent" CHECK (("crm_task"."link_kind" IS NULL AND "crm_task"."link_id" IS NULL) OR ("crm_task"."link_kind" IS NOT NULL AND "crm_task"."link_id" IS NOT NULL)),
	CONSTRAINT "crm_task_link_kind_valid" CHECK ("crm_task"."link_kind" IS NULL OR "crm_task"."link_kind" IN ('producer', 'project_request', 'bulk_product_inquiry', 'case', 'product'))
);
--> statement-breakpoint
CREATE TABLE "crm_thread" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"template_key" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"link_kind" text,
	"link_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_thread_id_partner_unique" UNIQUE("id","partner_id"),
	CONSTRAINT "crm_thread_link_consistent" CHECK (("crm_thread"."link_kind" IS NULL AND "crm_thread"."link_id" IS NULL) OR ("crm_thread"."link_kind" IS NOT NULL AND "crm_thread"."link_id" IS NOT NULL)),
	CONSTRAINT "crm_thread_link_kind_valid" CHECK ("crm_thread"."link_kind" IS NULL OR "crm_thread"."link_kind" IN ('producer', 'project_request', 'bulk_product_inquiry', 'case', 'product')),
	CONSTRAINT "crm_thread_closed_consistent" CHECK (("crm_thread"."closed_at" IS NULL AND "crm_thread"."closed_by" IS NULL) OR ("crm_thread"."closed_at" IS NOT NULL AND "crm_thread"."closed_by" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "crm_contact" ADD CONSTRAINT "crm_contact_partner_id_crm_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."crm_partner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_entry" ADD CONSTRAINT "crm_entry_partner_id_crm_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."crm_partner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_entry" ADD CONSTRAINT "crm_entry_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_entry" ADD CONSTRAINT "crm_entry_thread_partner_fk" FOREIGN KEY ("thread_id","partner_id") REFERENCES "public"."crm_thread"("id","partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_entry" ADD CONSTRAINT "crm_entry_contact_partner_fk" FOREIGN KEY ("contact_id","partner_id") REFERENCES "public"."crm_contact"("id","partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_entry_attachment" ADD CONSTRAINT "crm_entry_attachment_entry_id_crm_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."crm_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_entry_attachment" ADD CONSTRAINT "crm_entry_attachment_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_partner" ADD CONSTRAINT "crm_partner_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_partner" ADD CONSTRAINT "crm_partner_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_partner" ADD CONSTRAINT "crm_partner_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_partner_id_crm_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."crm_partner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_thread_partner_fk" FOREIGN KEY ("thread_id","partner_id") REFERENCES "public"."crm_thread"("id","partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_contact_partner_fk" FOREIGN KEY ("external_contact_id","partner_id") REFERENCES "public"."crm_contact"("id","partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_thread" ADD CONSTRAINT "crm_thread_partner_id_crm_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."crm_partner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_thread" ADD CONSTRAINT "crm_thread_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_thread" ADD CONSTRAINT "crm_thread_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_contact_partner_idx" ON "crm_contact" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "crm_entry_partner_occurred_idx" ON "crm_entry" USING btree ("partner_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX "crm_entry_thread_occurred_idx" ON "crm_entry" USING btree ("thread_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_entry_attachment_entry_idx" ON "crm_entry_attachment" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_partner_one_per_producer" ON "crm_partner" USING btree ("producer_id") WHERE "crm_partner"."producer_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "crm_partner_lower_name_idx" ON "crm_partner" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "crm_task_partner_idx" ON "crm_task" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "crm_task_thread_idx" ON "crm_task" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "crm_task_open_due_idx" ON "crm_task" USING btree ("due_date") WHERE "crm_task"."status" = 'open';--> statement-breakpoint
CREATE INDEX "crm_thread_partner_idx" ON "crm_thread" USING btree ("partner_id");