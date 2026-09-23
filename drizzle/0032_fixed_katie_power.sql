CREATE TYPE "public"."case_field_source" AS ENUM('client_card', 'client_form', 'advisor');--> statement-breakpoint
CREATE TYPE "public"."case_field_state" AS ENUM('confirmed', 'assumption', 'missing', 'not_applicable');--> statement-breakpoint
CREATE TABLE "case_field" (
	"inquiry_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"state" "case_field_state" NOT NULL,
	"source" "case_field_source" NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_field_inquiry_id_key_pk" PRIMARY KEY("inquiry_id","key")
);
--> statement-breakpoint
ALTER TABLE "case_field" ADD CONSTRAINT "case_field_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_field" ADD CONSTRAINT "case_field_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;