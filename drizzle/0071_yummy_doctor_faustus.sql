CREATE TABLE "commercial_display_inquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_name" text NOT NULL,
	"company" text,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"country_code" text NOT NULL,
	"use_case" text NOT NULL,
	"interests" text[] NOT NULL,
	"screen_count" integer,
	"message" text NOT NULL,
	"contact_locale" text DEFAULT 'pl' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_display_inquiry_use_case" CHECK ("commercial_display_inquiry"."use_case" IN ('hotel', 'restaurant', 'pool-spa', 'residential', 'retail', 'other')),
	CONSTRAINT "commercial_display_inquiry_status" CHECK ("commercial_display_inquiry"."status" IN ('new', 'contacted', 'closed')),
	CONSTRAINT "commercial_display_inquiry_interests" CHECK (array_length("commercial_display_inquiry"."interests", 1) >= 1),
	CONSTRAINT "commercial_display_inquiry_screen_count" CHECK ("commercial_display_inquiry"."screen_count" IS NULL OR "commercial_display_inquiry"."screen_count" >= 1)
);
--> statement-breakpoint
ALTER TABLE "commercial_display_inquiry" ADD CONSTRAINT "commercial_display_inquiry_country_code_country_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."country"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commercial_display_inquiry_email_created_idx" ON "commercial_display_inquiry" USING btree ("contact_email","created_at");