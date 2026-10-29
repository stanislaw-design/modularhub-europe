-- Usuwa dwoch ostatnich testowych producentow "Test Producer (product actions)" wraz z ich
-- 5 szkicami produktow "Modulor 28" (zasiane przez test 22.09.2026). Uruchom po
-- _delete_test_producers.sql.
--
-- Stan przed (sprawdzone na produkcji):
--   producenci a56dad95-663c-4315-a454-26f692b06bc8 (4 produkty), a521cbe7-b5ad-4c78-8cd0-a33374d38f0c (1 produkt)
--   wszystkie 5 produktow ma status draft, konta maja adres @example.test
--   do producentow podpiete tylko product (5) i producer_member (2)
--
-- Zabezpieczenie: liczby wierszy i statusy musza sie zgadzac, inaczej skrypt przerywa.
-- Jesli inna tabela odwoluje sie do produktu/producenta/konta bez ON DELETE CASCADE,
-- transakcja sie wycofa i blad poda ta tabele.

BEGIN;

CREATE TEMP TABLE _del ON COMMIT DROP AS
SELECT p.id AS producer_id, p.user_id
FROM producer p
JOIN users u ON u.id = p.user_id
WHERE p.id IN ('a56dad95-663c-4315-a454-26f692b06bc8', 'a521cbe7-b5ad-4c78-8cd0-a33374d38f0c')
  AND p.name = 'Test Producer (product actions)'
  AND u.email LIKE '%@example.test';

DO $$
DECLARE producers int; products int; published int;
BEGIN
  SELECT count(*) INTO producers FROM _del;
  SELECT count(*), count(*) FILTER (WHERE status <> 'draft')
    INTO products, published
    FROM product WHERE producer_id IN (SELECT producer_id FROM _del);
  IF producers <> 2 OR products <> 5 OR published <> 0 THEN
    RAISE EXCEPTION 'Oczekiwano 2 producentow i 5 szkicow, jest % producentow, % produktow, % nieszkicow',
      producers, products, published;
  END IF;
END $$;

DELETE FROM product WHERE producer_id IN (SELECT producer_id FROM _del);
DELETE FROM producer_member WHERE producer_id IN (SELECT producer_id FROM _del);
DELETE FROM producer WHERE id IN (SELECT producer_id FROM _del);
DELETE FROM users WHERE id IN (SELECT user_id FROM _del) AND email LIKE '%@example.test';

COMMIT;

-- Sprawdz po uruchomieniu (zostaje 16 producentow, zadnego testowego):
-- SELECT count(*) FROM producer WHERE deleted_at IS NULL;
-- SELECT count(*) FROM producer WHERE name ILIKE '%test%';
-- SELECT count(*) FROM users WHERE email LIKE '%@example.test' AND role = 'producer';
