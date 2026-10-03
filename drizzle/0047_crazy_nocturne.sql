ALTER TYPE "public"."document_purpose" ADD VALUE 'project_quote_pdf';--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "project_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_quote_id_project_quote_id_fk" FOREIGN KEY ("project_quote_id") REFERENCES "public"."project_quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_one_quote_pdf_per_quote" ON "document" USING btree ("project_quote_id") WHERE "document"."purpose" = 'project_quote_pdf' AND "document"."deleted_at" IS NULL;