-- Ustawia prawdziwy adres e-mail na koncie właściciela producenta "Castor Domy Drewniane".
--
-- Stan przed (wynik zapytania inwentaryzacyjnego z produkcji, 2026-11-13):
--   Castor Domy Drewniane, kraj PL, 20 opublikowanych domów, jedyny adres to zastępczy
--   (domena example.modularhub.local), więc mail o nowym projekcie do niego nie dochodzi.
--
-- Co robi (w jednej transakcji): zmienia users.email właściciela producenta na castor@castor.net.pl.
-- Odbiorcami maili o projektach są właściciel i członkowie zespołu (lib/db/large-order-recipients.ts),
-- więc zmiana właściciela wystarcza. Producent zaloguje się linkiem wysłanym na ten adres.
--
-- Zabezpieczenia: każdy warunek sprawdza oczekiwany stan, w innym razie przerywa z błędem i nic nie zmienia.
--   - dokładnie jeden producent o tej nazwie (niezablokowany, nieusunięty)
--   - jego obecny adres jest zastępczy (.local, .invalid, .test), więc nie nadpiszemy prawdziwego
--   - nowy adres nie jest zajęty przez inne konto (users.email jest unikalne)
--
-- Uruchomienie (ręcznie, adres bazy tylko ze zmiennej, nigdy z .env.local):
--   SQL_TARGET_URL=<adres bazy prod> npx tsx scripts/run-sql-file.ts drizzle/_set_castor_email.sql

BEGIN;

DO $$
DECLARE
  v_user_id text;
  v_old_email text;
BEGIN
  IF (SELECT count(*) FROM producer WHERE name = 'Castor Domy Drewniane' AND deleted_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Oczekiwano dokladnie jednego producenta "Castor Domy Drewniane", przerywam';
  END IF;

  SELECT u.id, u.email INTO v_user_id, v_old_email
  FROM producer pr JOIN users u ON u.id = pr.user_id
  WHERE pr.name = 'Castor Domy Drewniane' AND pr.deleted_at IS NULL;

  IF v_old_email !~ '(\.(invalid|local|test)|@example\.[a-z]+)$' THEN
    RAISE EXCEPTION 'Wlasciciel Castora ma juz prawdziwy adres (%), przerywam', split_part(v_old_email, '@', 2);
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = lower('castor@castor.net.pl') AND id <> v_user_id) THEN
    RAISE EXCEPTION 'Adres castor@castor.net.pl jest juz uzyty przez inne konto, przerywam';
  END IF;

  UPDATE users
  SET email = 'castor@castor.net.pl', updated_at = now()
  WHERE id = v_user_id;
END $$;

COMMIT;

-- Sprawdz po uruchomieniu (powinien byc jeden wiersz z nowym adresem):
-- SELECT pr.name, u.email, u.blocked_at, u.deleted_at
-- FROM producer pr JOIN users u ON u.id = pr.user_id
-- WHERE pr.name = 'Castor Domy Drewniane';
