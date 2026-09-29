-- Catch-up script for production (modularhub / spring-rain-58383710).
-- Applies migrations 0034-0038 in order (production's __drizzle_migrations
-- currently stops at 0033). All five are purely additive: new nullable
-- columns, one new enum value, one new table. Safe to run as a single
-- transaction; if anything fails, nothing is applied.
--
-- Run this in the Neon SQL editor (or psql) against the production database.

BEGIN;

-- 0034_late_jazinda
-- SKIPPED: "foundation_options" already exists on production (confirmed via
-- information_schema before writing this update) — a previous partial run of
-- the migrate command got this far before being interrupted, without ever
-- recording it in __drizzle_migrations. Only the tracking row is needed here.

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
VALUES ('fa9800a777a84ed1635f38916b6010e99f3f6127509d622faffee2f134956fad', 1790321820300);

-- 0035_amused_changeling
ALTER TABLE "users" ADD COLUMN "blocked_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "blocked_by" text;
ALTER TABLE "users" ADD COLUMN "blocked_reason" text;
ALTER TABLE "users" ADD CONSTRAINT "users_blocked_by_users_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
VALUES ('4dea3c6365679cc35b4a1a6e0f91d4a26f8e92f7d1a6c8a01fdde95f888bb1ea', 1790602371962);

-- 0036_even_eternity
ALTER TYPE "public"."product_family" ADD VALUE 'outdoor-tv';

-- Note: ALTER TYPE ... ADD VALUE cannot run in the same transaction as a
-- later statement that USES the new value, but nothing here uses it, so it's
-- fine inside this transaction.

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
VALUES ('82af6395982469a51e8eb69f683e9a5b3bcc871df71ba8c38d0947bfbba054c0', 1790621757080);

-- 0037_certain_hydra
ALTER TABLE "producer" ADD COLUMN "description" text;
ALTER TABLE "product" ADD COLUMN "video_url" text;

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
VALUES ('36f2924a4cef7ae7b3caa02b48181da86f5536cd079959f225801b7b5a7cc787', 1790673977427);

-- 0038_abnormal_shinko_yamashiro (spec 0057: producer_member table + backfill)
CREATE TABLE "producer_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "producer_member_user_id_unique" UNIQUE("user_id")
);
ALTER TABLE "producer_member" ADD CONSTRAINT "producer_member_producer_id_producer_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producer"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "producer_member" ADD CONSTRAINT "producer_member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "producer_member" ADD CONSTRAINT "producer_member_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "producer_member_producer_idx" ON "producer_member" USING btree ("producer_id");
INSERT INTO "producer_member" ("producer_id", "user_id")
SELECT "id", "user_id" FROM "producer"
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
VALUES ('e80b94876c26ead81fad86ffeb2846297cfae889eec16bca8a04853378c7366b', 1790674528392);

COMMIT;
