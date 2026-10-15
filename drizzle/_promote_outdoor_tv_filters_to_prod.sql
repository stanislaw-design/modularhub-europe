-- Spec 0071: kolumny filtrów paska Outdoor TV na prod. Uruchom ręcznie w Neon SQL Editor
-- (projekt prod), jawnym osobnym krokiem. Migracja jest addytywna.
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "outdoor_tv_mounting" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "outdoor_tv_sun_exposure" text;
ALTER TABLE "product" ADD CONSTRAINT "product_outdoor_tv_mounting_values" CHECK ("outdoor_tv_mounting" IS NULL OR "outdoor_tv_mounting" IN ('na-sciane', 'w-szafie-z-winda'));
ALTER TABLE "product" ADD CONSTRAINT "product_outdoor_tv_sun_exposure_values" CHECK ("outdoor_tv_sun_exposure" IS NULL OR "outdoor_tv_sun_exposure" IN ('cien', 'czesciowe-slonce', 'pelne-slonce'));
ALTER TABLE "product" ADD CONSTRAINT "product_outdoor_tv_family_match" CHECK (("outdoor_tv_mounting" IS NULL AND "outdoor_tv_sun_exposure" IS NULL) OR "family" = 'outdoor-tv');

-- Uzupełnienie tylko dla produktów obecnych na prod (po id, rodzina outdoor-tv).
UPDATE "product" SET "outdoor_tv_mounting" = 'na-sciane', "outdoor_tv_sun_exposure" = 'cien' WHERE "id" = '9ca9dfbe-330f-4019-9fd7-2a2e24113d7e' AND "family" = 'outdoor-tv';
UPDATE "product" SET "outdoor_tv_mounting" = 'na-sciane', "outdoor_tv_sun_exposure" = 'czesciowe-slonce' WHERE "id" = '539c8b77-dc60-4487-8f22-c4a3bf84cd5c' AND "family" = 'outdoor-tv';
UPDATE "product" SET "outdoor_tv_mounting" = 'na-sciane', "outdoor_tv_sun_exposure" = 'pelne-slonce' WHERE "id" = '4387e68a-a132-4324-b10e-9dc6a165c007' AND "family" = 'outdoor-tv';
UPDATE "product" SET "outdoor_tv_mounting" = 'w-szafie-z-winda' WHERE "id" IN ('7d1c8d33-5a0f-4f0e-9b3e-1c6a8a52f0a1', 'c2f4e6a8-91b3-4d57-8a60-3f9d1e7b4c52', '19f6add0-0991-4737-852e-f3206b650775') AND "family" = 'outdoor-tv';
