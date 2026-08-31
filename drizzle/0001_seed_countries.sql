-- Wypełnia słownik country wierszami z dzisiejszego mocka
-- (lib/data/fixtures/countries.ts), satisfies AC-1 (spec 0018, build plan 1).
INSERT INTO "country" ("code", "name") VALUES
  ('PL', 'Polska'),
  ('DE', 'Niemcy'),
  ('NL', 'Holandia')
ON CONFLICT ("code") DO NOTHING;
