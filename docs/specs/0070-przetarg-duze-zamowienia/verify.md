# Verify: przetarg na duże zamówienia · spec 0070 · updated 2026-10-09
_Steps derived from spec 0070 acceptance criteria, tydzień 1 (zadania 1 do 6). `/check verify` runs these; `/test` locks the durable ones. Kroki tygodni 2 i 3 dochodzą po ich budowie._

## UI / manual
- [ ] Zaloguj się jako admin, wejdź na `/pl/internal/large-orders` → tabela z kolumnami rodzaj, kraj, domy, termin ofert, status, oferty, do publikacji, złożone; filtr statusu i rodzaju działa; przy ponad 25 wierszach jest paginacja → AC-1
- [ ] Zaloguj się jako klient lub producent, wejdź na `/pl/internal/large-orders` → przekierowanie na `/pl` → AC-1
- [ ] Otwórz „Szczegóły" zapytania z ofertą → widać pełny kontakt klienta, wszystkie oferty (także z pustym `published_to_client_at`), przycisk PDF otwiera podpisany link, znaczniki czasu → AC-2, AC-22
- [ ] `/pl/internal/producers/volume-verification` → lista profili `pending` z profilem zdolności i ostrzeżeniem o brakujących polach; „Zatwierdź" zmienia status na `approved`; „Odrzuć" bez powodu pokazuje błąd, z powodem odrzuca → AC-3
- [ ] Wpis w `audit_log` dla zmiany z poprzedniego kroku ma `actor_user_id` admina → AC-3
- [ ] `/pl/internal/clients/b2b-verification` → klient z NIP i nazwą firmy, zatwierdzenie i odrzucenie z powodem działają → AC-4
- [ ] Panel producenta `/pl/producer/panel/capacity`: zaznacz DE i NL, zapisz, odśwież → kraje zostają; „Wyślij do weryfikacji" zmienia status na „czeka na weryfikację", przycisk znika → AC-5
- [ ] `/pl/internal/producers/[id]`: sekcja „Kraje dostawy", zmień zaznaczenie, „Zapisz kraje" → zapis widoczny po odświeżeniu → AC-5
- [ ] Panel klienta, pozycja „Zweryfikuj konto” w menu (`/pl/panel/verification`): formularz „Dane firmy", wpisz `DE 123 456 789` → zapis, status „czekają na weryfikację"; wpisz `12345` → komunikat o formacie → AC-6
- [ ] Producent z niezatwierdzonym profilem na `/pl/producer/panel/board` → karta z linkiem „Uzupełnij profil zdolności" prowadzącym do `/pl/producer/panel/capacity` → AC-7
- [ ] Złóż zapytanie od 10 domów na `/de/...` (formularz zapytania) → w adminie szczegóły pokazują „Język maili: de"; termin ofert to około 14 dni od teraz → AC-9
- [ ] Z ustawionym `OPERATIONS_NOTIFY_EMAIL` i `RESEND_API_KEY` złożenie zapytania wysyła zespołowi polski mail z linkiem do `/pl/internal/large-orders/{id}?kind=request` → AC-24 (część)

- [ ] Moc przerobowa: na `/pl/producer/panel/capacity` pole „Moc przerobowa” jest na górze i oznaczone jako wymagane; „Wyślij do weryfikacji” bez wartości pokazuje komunikat, z wartością przechodzi; na liście weryfikacji wolumenowej w adminie widać moc obok profilu → AC-5
- [ ] Przyciski decyzji zależą od statusu: w zakładce „Zatwierdzone” jest tylko „Cofnij zatwierdzenie” (z powodem), w „Odrzucone” tylko „Zatwierdź”, w „Oczekujące” oba; sprawdź na weryfikacji B2B i wolumenowej → AC-3, AC-4
- [ ] Telefon klienta na `/pl/internal/clients/b2b-verification` jest linkiem `tel:`, e-mail linkiem `mailto:` → AC-4
- [ ] Lista dużych zamówień: pierwsza kolumna to inwestor (firma, imię i nazwisko, albo e-mail), potem plakietki rodzaju i statusu (każda w innym kolorze z ikoną), domy, termin ofert z „za X dni”; cały wiersz jest klikalny i prowadzi do szczegółów z `?kind=`; sprawdź jasny i ciemny motyw oraz wąski ekran → AC-1
- [ ] Panel klienta „Zapytania”: nagłówek to „Zapytania do ModularHub”, jest przycisk „Dodaj zapytanie o duże zamówienie” prowadzący do `/pl/project-request`; klient bez zatwierdzonego B2B widzi wskazówkę z linkiem do „Zweryfikuj konto”, zatwierdzony jej nie widzi → AC-6
- [ ] Zalogowany klient na `/pl/project-request`: krok „Kontakt” jest pominięty, kreator zaczyna od „O projekcie”, „Wstecz” pokazuje wypełnione dane; po wysłaniu w szczegółach admina „Konto klienta” to „Powiązane” → AC-9
- [ ] Zalogowany klient w oknie zapytania o produkt na stronie produktu: imię, e-mail i telefon są wypełnione; po zmianie e-maila na inny zapytanie zostaje niepowiązane z kontem → AC-21 (część), AC-9
- [ ] Konto bez logowania (wylogowany) składa zapytanie ręcznie wpisanymi danymi: działa jak dotąd, `clientId` puste → AC-9

## Commands
- [ ] `npx vitest run lib/project-quote-actions.test.ts lib/project-request-actions.test.ts lib/db/large-orders-queries.test.ts lib/notifications/large-order-team.test.ts lib/i18n "app/[locale]/internal/large-orders"` → wszystko zielone → AC-1 do AC-6, AC-9, AC-22, AC-24, AC-26
- [ ] Zapytanie do dev Neon: kolumny `deadline_at`, `contact_locale`, `selected_quote_id`, `closed_reason` na `project_request` i `bulk_product_inquiry`; `published_to_client_at`, `logistics` na `project_quote`; tabele `project_request_producer_override`, `project_notification_log`; wartość `published` w enumie `bulk_request_status` → migracja 0054 żywa → AC-9, AC-13
- [ ] `SELECT count(*) FROM project_quote WHERE published_to_client_at IS NULL` zaraz po migracji → 0 (default `now()` zachował widoczność ofert) → AC-13
- [ ] `npm run check:translations` → zero braków (nie dotyczy kluczy `messages/*.json`) → AC-26
- [ ] `npm run lint` i `npx tsc --noEmit` → bez błędów → wszystkie
- [ ] `npx vitest run lib/project-request-actions.test.ts components/klient/ProjectRequestFlow.test.tsx` → zielone, w tym powiązanie zapytania z kontem tylko przy zgodnym e-mailu z sesji i pominięcie kroku kontaktu → AC-9

## Acceptance-criteria coverage
- AC-1 (lista, filtr, paginacja, bramka admina) · AC-2 (szczegóły, PDF, znaczniki) · AC-3 (weryfikacja wolumenowa, audyt) · AC-4 (weryfikacja B2B) · AC-5 (profil zdolności, kraje, wysyłka) · AC-6 (NIP i firma) · AC-7 (pusty stan tablicy) · AC-9 (termin 14 dni i język zapisane przy składaniu; zmiana terminu przez admina dopiero w tygodniu 2) · AC-22 (ścieżka admina do PDF) · AC-24 (część: mail zespołu) · AC-26 (klucze i prawdziwe tłumaczenia nowych tekstów)
- AC-8, AC-10 do AC-21, AC-23 (link logujący), AC-24 (reszta), AC-25: tygodnie 2 i 3
