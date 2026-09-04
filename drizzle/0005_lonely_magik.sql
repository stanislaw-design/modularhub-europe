CREATE TABLE "pending_registration" (
	"email" text PRIMARY KEY NOT NULL,
	"role" "role" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_idempotency_key_unique" UNIQUE("idempotency_key");