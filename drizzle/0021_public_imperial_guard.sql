ALTER TABLE "producer" ADD COLUMN "inquiry_response_time_label" text;--> statement-breakpoint
ALTER TABLE "producer" ADD COLUMN "showroom_visit_available" boolean;--> statement-breakpoint
ALTER TABLE "producer" ADD COLUMN "showroom_visit_note" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "room_layout" jsonb;