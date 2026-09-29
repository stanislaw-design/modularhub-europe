ALTER TABLE "users" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_blocked_by_users_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;