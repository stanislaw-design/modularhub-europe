-- Usuwa testowych producentow bez produktow z produkcji (zasiane przez testy 13-23.09.2026).
--
-- Obejmuje: "Project Request Actions Test Producer" (69), "Audit BPI Producer" (1),
-- "Schema Check Producer" (1) = 71 wierszy, o ile nie maja produktow i ich konto ma adres
-- @example.test. NIE obejmuje "Test Producer (product actions)" (2 wiersze, 5 produktow),
-- Modular Goldi ani StanAutomation.
--
-- Stan przed (sprawdzone na produkcji): do tych producentow podpiete sa tylko
-- producer_member i co najwyzej jeden producer_capacity_profile. Jesli FK z innej tabeli
-- zablokuje usuniecie, transakcja sie wycofa i blad poda tabele.
--
-- Zabezpieczenie: liczba wierszy musi sie zgadzac, inaczej skrypt przerywa.

BEGIN;

CREATE TEMP TABLE _del ON COMMIT DROP AS
SELECT p.id AS producer_id, p.user_id
FROM producer p
JOIN users u ON u.id = p.user_id
WHERE p.name IN ('Project Request Actions Test Producer', 'Audit BPI Producer', 'Schema Check Producer')
  AND u.email LIKE '%@example.test'
  AND NOT EXISTS (SELECT 1 FROM product pr WHERE pr.producer_id = p.id);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _del;
  IF n <> 71 THEN
    RAISE EXCEPTION 'Oczekiwano 71 producentow do usuniecia, jest %', n;
  END IF;
END $$;

DELETE FROM producer_member WHERE producer_id IN (SELECT producer_id FROM _del);
DELETE FROM producer_capacity_profile WHERE producer_id IN (SELECT producer_id FROM _del);
DELETE FROM producer WHERE id IN (SELECT producer_id FROM _del);
DELETE FROM users WHERE id IN (SELECT user_id FROM _del) AND email LIKE '%@example.test';

COMMIT;

-- Sprawdz po uruchomieniu (z 89 producentow zostaje 18: 16 prawdziwych + 2 testowych z produktami):
-- SELECT count(*) FROM producer WHERE deleted_at IS NULL;
-- SELECT name, count(*) FROM producer WHERE name ILIKE '%test%' OR name LIKE '%Audit%' OR name LIKE '%Schema%' GROUP BY name;
