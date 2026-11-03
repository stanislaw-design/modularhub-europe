CREATE TYPE "public"."email_event_kind" AS ENUM('opened', 'clicked');--> statement-breakpoint
CREATE TYPE "public"."user_consent_kind" AS ENUM('producer_email_tracking');--> statement-breakpoint
CREATE TABLE "email_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"kind" "email_event_kind" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"target_url" text,
	"likely_automatic" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "user_consent_kind" NOT NULL,
	"text_version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "email_event" ADD CONSTRAINT "email_event_message_id_email_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consent" ADD CONSTRAINT "user_consent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_event_message_kind_idx" ON "email_event" USING btree ("message_id","kind");--> statement-breakpoint
CREATE INDEX "user_consent_user_kind_idx" ON "user_consent" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "user_consent_one_active_per_kind" ON "user_consent" USING btree ("user_id","kind") WHERE "user_consent"."withdrawn_at" IS NULL;