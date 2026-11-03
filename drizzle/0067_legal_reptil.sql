CREATE TABLE "email_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resend_email_id" text,
	"email_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"producer_id" uuid NOT NULL,
	"recipient_user_id" text,
	"tracked" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"complained_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"first_clicked_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "email_message_resend_email_id_unique" UNIQUE("resend_email_id")
);
--> statement-breakpoint
ALTER TABLE "email_message" ADD CONSTRAINT "email_message_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_message" ADD CONSTRAINT "email_message_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_message_producer_sent_idx" ON "email_message" USING btree ("producer_id","sent_at");--> statement-breakpoint
CREATE INDEX "email_message_type_sent_idx" ON "email_message" USING btree ("email_type","sent_at");