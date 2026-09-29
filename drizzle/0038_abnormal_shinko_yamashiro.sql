CREATE TABLE "producer_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_member_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "producer_member" ADD CONSTRAINT "producer_member_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_member" ADD CONSTRAINT "producer_member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producer_member" ADD CONSTRAINT "producer_member_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "producer_member_producer_idx" ON "producer_member" USING btree ("producer_id");--> statement-breakpoint
INSERT INTO "producer_member" ("producer_id", "user_id")
SELECT "id", "user_id" FROM "producer"
ON CONFLICT ("user_id") DO NOTHING;