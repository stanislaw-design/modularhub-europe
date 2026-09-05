-- search_vector is a Postgres-generated column (spec 0026 AC-6, AC-13): drizzle-kit
-- emitted the plain ADD COLUMN above the customType declaration in schema.ts asks
-- for; the GENERATED ALWAYS AS ... STORED clause below is hand-added the same way
-- 0002_audit_log_trigger.sql hand-writes DDL drizzle-kit's DSL can't express.
-- coalesce is mandatory: description is nullable and to_tsvector(NULL) is NULL.
ALTER TABLE "product" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
CREATE INDEX "product_status_family_idx" ON "product" USING btree ("status","family");--> statement-breakpoint
CREATE INDEX "product_floor_area_m2_idx" ON "product" USING btree ("floor_area_m2");--> statement-breakpoint
CREATE INDEX "product_price_min_cents_idx" ON "product" USING btree ("price_min_cents");--> statement-breakpoint
CREATE INDEX "product_technical_specs_heat_source_idx" ON "product" USING btree (("technical_specs"->>'heatSource'));--> statement-breakpoint
CREATE INDEX "product_technical_specs_ventilation_idx" ON "product" USING btree (("technical_specs"->>'ventilation'));--> statement-breakpoint
CREATE INDEX "product_technical_specs_energy_class_idx" ON "product" USING btree (("technical_specs"->>'heatTransferCoefficients'));--> statement-breakpoint
CREATE INDEX "product_search_vector_idx" ON "product" USING gin ("search_vector");