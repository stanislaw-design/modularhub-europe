-- Adds Jakub Lejman as a second member of Budman House (spec 0057, Build plan
-- task 8). Run this AFTER _catchup_0034_to_0038.sql has succeeded (needs the
-- producer_member table).
--
-- Pre-checked on production before writing this script:
--   - no existing users row for lejman.jakub@gmail.com (any case)
--   - Budman House = producer.id 11891027-da87-4e70-ad02-af90df3db675,
--     current sole owner user_id 287f1146-3215-45ba-8430-13d3f0f4ca23
--
-- The WHERE NOT EXISTS guards below make this safe to re-run: if it's already
-- applied, both inserts become no-ops instead of erroring.

BEGIN;

INSERT INTO "users" ("id", "email", "name", "phone", "role")
SELECT 'a1432066-e402-440f-b00a-46765abcb1a8', 'lejman.jakub@gmail.com', 'Jakub Lejman', '+48500356890', 'producer'
WHERE NOT EXISTS (
  SELECT 1 FROM "users" WHERE lower("email") = lower('lejman.jakub@gmail.com')
);

INSERT INTO "producer_member" ("producer_id", "user_id", "added_by")
SELECT '11891027-da87-4e70-ad02-af90df3db675', u."id", NULL
FROM "users" u
WHERE lower(u."email") = lower('lejman.jakub@gmail.com')
ON CONFLICT ("user_id") DO NOTHING;

COMMIT;

-- Verify after running:
-- SELECT pm.producer_id, pm.user_id, u.email, u.name, u.phone
-- FROM producer_member pm JOIN users u ON u.id = pm.user_id
-- WHERE pm.producer_id = '11891027-da87-4e70-ad02-af90df3db675';
-- -> should show two rows: the existing owner and Jakub Lejman.
