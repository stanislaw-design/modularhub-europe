# Verify: analityka ruchu i maili, etap 2 (dziennik maili) · spec 0079 · updated 2026-11-02
_Steps derived from spec 0079 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Zaloguj się jako admin, wejdź na `/pl/internal/analytics?view=emails` → widać kafelki (wysłane, unikalne zapytania, dostarczone, odbite, skargi), tabelę według typu maila i według producenta, uwagę o otwarciach i kliknięciach niedostępnych do etapu 3 → AC-10
- [ ] Na tym widoku z ustawionym złym `POSTHOG_PERSONAL_API_KEY` strona nadal się renderuje z liczbami z bazy → AC-11
- [ ] W widoku Producenci kliknij nazwę producenta (albo w widoku Maile) → szczegół: trend dzienny, produkty po wyświetleniach (z nazwami), maile do tego producenta; przy złym kluczu PostHog sekcja ruchu pokazuje „niedostępne", sekcja maili działa → AC-9, AC-11
- [ ] Wejdź na `?view=producers&producer=nie-uuid` → zwykły ranking, bez błędu → AC-9
- [ ] Zakładka „Maile" jest obok Ruch, Strony, Producenci i zachowuje wybrany zakres 7/30/90 → AC-10
- [ ] Wyślij realne zapytanie o duże zamówienie (dev, z `RESEND_API_KEY`) → w `email_message` pojawia się wiersz na każdego odbiorcę producenta z `recipient_user_id`, po chwili z `resend_email_id`; w mailu linki do naszej domeny mają `utm_source=email&utm_medium=producer_mail&utm_campaign=large_order_producer_new_request` → AC-13
- [ ] W panelu Resend dodaj webhook `https://<domena>/api/webhooks/resend` (zdarzenia email.delivered, email.bounced, email.complained), wklej Signing Secret do `RESEND_WEBHOOK_SECRET`; po dostarczeniu maila `delivered_at` jest wypełnione, a mail logowania (bez tagu) nie zmienia niczego w bazie → AC-14
- [ ] Wyłącz bazę (zły `DATABASE_URL` na lokalnym serwerze) i wyślij mail do producenta → mail wychodzi bez tagu `message_id`, błąd w Sentry → AC-16

## Commands
- [ ] `npm run db:migrate` na dev → „No pending migrations", a zapytanie do `information_schema.columns` dla `email_message` zwraca 15 kolumn bez żadnej kolumny z adresem e-mail → AC-15
- [ ] `npx vitest run lib/notifications/send-tracking.test.ts lib/notifications/email-tracking.test.ts` → wiersz przed wysyłką, tag, UTM, usunięcie po porażce, awaria śledzenia nie blokuje, `login_link` i mail do klienta bez zmian co do bajta (migawka) → AC-13, AC-16
- [ ] `npx vitest run app/api/webhooks lib/analytics` → zły podpis 401, brak tagu 200 bez zmian, tag bez wiersza 503, powtórzone zdarzenie nie psuje liczb, agregaty na prawdziwej bazie dev → AC-14, AC-10, AC-15
- [ ] `npx tsc --noEmit -p . && npx eslint .` → bez błędów, reguła Sentry/PostHog bez wyjątków → AC-10

## Acceptance-criteria coverage
- AC-9 (maile w szczególe producenta) … szczegół producenta, kroki 3 i 4 UI · AC-10 … widok Maile, test agregatów · AC-11 … Maile z błędnym PostHog · AC-13 … test wysyłki i migawki, UTM · AC-14 … test trasy webhooka i test na bazie · AC-15 … kolumny w żywej bazie i test na schemacie · AC-16 … test awarii zapisu
- Poza etapem 2: AC-18 do AC-23 (etap 3), liczby HogQL na prawdziwych danych i AC-5 dla `/panel` i `/producer/panel` (luki etapu 1)

# Verify: analityka ruchu i maili, etap 3 (otwarcia i kliknięcia za zgodą) · spec 0079 · updated 2026-11-02
_Steps derived from spec 0079 acceptance criteria. Teksty zgody i polityki to szkic `draft-1`, do zatwierdzenia przez prawnika. Ustaw `EMAIL_TRACKING_SECRET` lokalnie, zrestartuj `next dev` po zmianie messages._

## UI / manual
- [ ] Wejdź na `/pl/producer/registration`, formularz producenta → pole zgody na pomiar otwarć i kliknięć jest niezaznaczone, bez gwiazdki "wymagane", oddzielone od innych pól; to samo w `/en`, `/nl`, `/de` → AC-18
- [ ] Załóż konto producenta bez zaznaczenia zgody, potwierdź link logowania → konto powstaje, w `user_consent` brak wiersza dla tego użytkownika → AC-18
- [ ] Załóż drugie konto z zaznaczoną zgodą → po pierwszym logowaniu w `user_consent` jest jeden wiersz `producer_email_tracking` z `text_version = draft-1` i pustym `withdrawn_at` → AC-18
- [ ] Zalogowany producent: `/pl/producer/panel/settings` → karta "Pomiar otwarć i kliknięć w mailach" pokazuje stan; "Wyrażam zgodę" zmienia go na aktywny, "Wycofaj zgodę" ustawia `withdrawn_at` i zostawia wiersz; ponowne udzielenie tworzy nowy wiersz → AC-19
- [ ] Wyślij zapytanie o duże zamówienie do producenta ze zgodą → HTML maila ma `<img ... /api/email/o/<id>>` na końcu i linki do naszej domeny przez `/api/email/c/<id>?u=...&s=...`, wiersz `email_message.tracked = true`; część tekstowa bez przepisanych linków → AC-13, AC-20
- [ ] To samo do producenta bez zgody → w HTML brak pikselki i linków `/api/email/`, są parametry `utm_*`, `tracked = false` → AC-13, AC-20
- [ ] Mail logowania (`login_link`) do dowolnego użytkownika → treść bez zmian, bez pikselki → AC-13
- [ ] Otwórz `/api/email/o/<id>` w przeglądarce po minucie od wysyłki → gif 1x1, w `email_event` wiersz `opened` z `likely_automatic = false`, `open_count = 1` → AC-21, AC-22
- [ ] Kliknij przepisany link w mailu → 302 na adres docelowy z UTM, wiersz `clicked`, `click_count = 1`, `first_clicked_at` ustawione → AC-20
- [ ] Zmień jeden znak w parametrze `s` albo podmień `u` na inny adres, także obcą domenę → 400, bez przekierowania; pikselka dla nieznanego id nadal zwraca gif → AC-21
- [ ] Wycofaj zgodę w ustawieniach, potem otwórz pikselkę i kliknij link z wcześniej wysłanego maila → brak nowych wierszy `email_event`, liczniki bez zmian, link nadal przekierowuje → AC-20
- [ ] Otwórz pikselkę 2 sekundy po wysyłce oraz kliknij dwa różne linki jednego maila w kilka sekund → wiersze mają `likely_automatic = true`, liczniki się nie podbijają, linki działają → AC-22
- [ ] `/pl/internal/analytics?view=emails` → kolumny Śledzone, Unikalne kliknięcia i Otwarcia (ludzkie), uwaga o próbce i zawyżonych otwarciach, brak starej notatki "niedostępne do etapu 3"; ze złym kluczem PostHog widok nadal działa → AC-10, AC-11
- [ ] `/pl/privacy` oraz `/en`, `/nl`, `/de` → sekcje o dzienniku maili i o dobrowolnym pomiarze otwarć i kliknięć, z opisem wycofania zgody → AC-17

## Commands
- [ ] `npm run db:migrate` na dev → "No pending migrations", a `information_schema.columns` dla `user_consent` i `email_event` pokazuje kolumny bez żadnej z adresem e-mail, `pg_indexes` ma `user_consent_one_active_per_kind` → AC-15
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/email-events-retention` → `{"deleted":N}`; wiersz `email_event` sprzed 14 miesięcy znika, `email_message` zostaje; bez nagłówka 401 → AC-23
- [ ] `npx vitest run lib/analytics lib/notifications app/api lib/producer-email-tracking-actions.test.ts components/auth` → wariant śledzony i nieśledzony, awarie nie blokują wysyłki, trasy, reguła automatu, zgoda, retencja → AC-13, AC-16, AC-18 do AC-23
- [ ] `npx tsc --noEmit && npx eslint .` → bez błędów → AC-10

## Acceptance-criteria coverage
- AC-13 (wariant śledzony) … test wysyłki, kroki UI 5 do 7 · AC-15 … migracja i `information_schema` · AC-16 … testy awarii w `send-tracking.test.ts` · AC-17 … krok UI polityki · AC-18 … kroki UI 1 do 3, test formularza · AC-19 … krok UI ustawień, test akcji · AC-20 … kroki UI 5, 6, 9, 11 · AC-21 … kroki UI 8, 10 · AC-22 … krok UI 12, testy reguły · AC-23 … krok Commands cron, test retencji · AC-10 … krok UI widoku Maile
- Poza etapem 3: liczby HogQL na prawdziwych danych, AC-5 dla `/panel` i `/producer/panel`, prawdziwa dostawa i webhook w panelu Resend, opinia prawnika przed produkcją
