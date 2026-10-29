# Verify: projekt własny ModularHub, część A · spec 0077 · updated 2026-10-26
_Steps derived from spec 0077 acceptance criteria (część A). `/check verify` runs these; `/test` locks the durable ones. Części B, C, D nie są jeszcze zbudowane._

## UI / manual
- [ ] Jako admin otwórz `/pl/internal/large-orders`, kliknij "Załóż projekt własny ModularHub" → trafiasz na `/internal/large-orders/new-own`; link jest też na `/internal/large-orders/new` → AC-1
- [ ] Jako producent albo klient otwórz `/pl/internal/large-orders/new-own` → przekierowanie z ekranu admina → AC-1
- [ ] Na formularzu nie ma pola zgody klienta, języka klienta ani danych kontaktowych klienta → AC-1
- [ ] Zostaw nazwę 2 znaki albo liczbę sztuk 0, zapisz → komunikat błędu, nic nie powstaje; liczba sztuk 1 przechodzi → AC-2
- [ ] Usuń `PLATFORM_CONTACT_PHONE` z `.env.local`, zrestartuj dev, otwórz formularz → czerwony komunikat, przycisk zapisu wyłączony → AC-4
- [ ] Załóż projekt z dwoma producentami (jeden bez zatwierdzonej weryfikacji wolumenowej) → projekt zapisany, widać krok "Pliki", producenci dostają mail (w dev: log/Resend) → AC-3, AC-7, AC-8
- [ ] Załóż cztery projekty własne pod rząd → wszystkie przechodzą (brak limitu trzech) → AC-5
- [ ] Zaloguj się jako producent bez weryfikacji wolumenowej, który jest odbiorcą → `/producer/panel/board` pokazuje projekt z nazwą i "Zamawiający: ModularHub"; szczegół pokazuje kontakt ModularHub od razu → AC-9, AC-10
- [ ] To samo na zapytaniu klienta: kontakt klienta nadal ukryty, formularz oferty bez pola wariantu → AC-10, AC-13
- [ ] W szczególe projektu własnego: "Dodaj wariant", pole "Nazwa wariantu" jest obowiązkowe; złóż "Pod klucz" i "Stan surowy" → obie w tabeli "Twoje warianty oferty" → AC-11, AC-44
- [ ] "Popraw" przy wariancie otwiera formularz z danymi wariantu; zapis pod tą samą nazwą (inna wielkość liter) zastępuje wersję → AC-12, AC-44
- [ ] Dodaj do pięciu wariantów; przy piątym przycisk "Dodaj wariant" znika i jest komunikat; "Wycofaj" zwalnia miejsce → AC-12, AC-44
- [ ] Jako admin otwórz szczegół projektu własnego → tabela porównawcza z ofertami od razu (bez publikacji), kolumna na ofertę, netto/brutto oznaczone, brak przycisków publikacji i połączenia → AC-6, AC-15
- [ ] "Oznacz jako wybraną" na jednej ofercie, potem na innej → oznaczenie się zmienia, statusy ofert i projektu bez zmian, producent może dalej składać oferty → AC-16
- [ ] "Zakończ wybór i powiadom" bez oznaczenia jest wyłączony; z oznaczeniem pokazuje okno z liczbą producentów; po potwierdzeniu status "accepted", lista zakolejkowanych maili → AC-17, AC-18
- [ ] Jako producent po zakończeniu: wybrana oferta ma "Wybrana", pozostałe i projekt "Wybór zakończony", nigdzie "odrzucona"; brak sterowania wynikiem; w "Moje wyceny" tak samo → AC-19
- [ ] Zamknij inny projekt własny przyciskiem zamknięcia → producenci z aktywną ofertą dostają istniejący mail o zamknięciu → AC-20
- [ ] `/pl/internal/large-orders` ma filtr "Pochodzenie" (Własne, Klientów), znacznik "Własny" i nazwę projektu w pierwszej kolumnie → AC-22

## Commands
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/platform-project-actions.test.ts` → 17 testów przechodzi → AC-2 do AC-6, AC-9, AC-11 do AC-14, AC-16 do AC-18, AC-21, AC-44, AC-45
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/project-quote-actions.test.ts lib/large-order-admin-actions.test.ts lib/large-order-connect-admin.test.ts lib/large-order-reminders.test.ts lib/panel-login-link-actions.test.ts` → regresja ścieżki klienta bez zmian → AC-13, AC-6
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/i18n components/producent/QuoteForm.test.tsx` → tłumaczenia w czterech językach, brak "odrzucona/przegrana" → AC-19
- [ ] `npx tsc --noEmit` i `npx eslint lib components "app/[locale]"` → bez błędów
- [ ] Zapytanie do bazy dev: kolumny `project_request.is_platform_owned/title/platform_marked_quote_id`, `project_quote.variant_label`, wyzwalacze `project_quote_platform_variant_limit` i `project_request_email_limit` istnieją → AC-5, AC-12

## Acceptance-criteria coverage
- AC-1 UI krok 1 i 2 · AC-2 UI krok 4 + test · AC-3 test · AC-4 UI krok 5 + test · AC-5 UI krok 7 + test · AC-6 UI krok 12 + test (link do klienta, publikacja)
- AC-7, AC-8 UI krok 6 (mail: do sprawdzenia ręcznie w logu) · AC-9, AC-10 UI krok 8 i 9 + test · AC-11 do AC-14 UI krok 10 do 12 + test · AC-15 UI krok 13
- AC-16 UI krok 14 + test · AC-17, AC-18 UI krok 15 + test · AC-19 UI krok 16 + test tłumaczeń · AC-20 UI krok 17 (nie ma testu) · AC-21 test · AC-22 UI krok 18
- AC-44 UI krok 10 do 12 + test · AC-45 test (oznaczenie nieaktualne)
- Brak E2E całego wątku (Playwright) i brak testu komponentu tabeli porównawczej: do dopisania przez `/test`.

# Verify: część C, język komunikacji producenta · spec 0077 · updated 2026-10-27 (zweryfikowane; AC-31 bez przebiegu na żywo, decyzja właściciela)
_Kroki z kryteriów AC-29 do AC-33. `/check verify` je uruchamia, `/test` blokuje trwałe._
## UI / manual
- [x] Zaloguj się jako producent, `/pl/producer/panel/settings` → sekcja "Język komunikacji" z wyborem Polski, English, Deutsch, Nederlands; zmień na Deutsch, "Zapisz zmiany" → "Zapisano.", po odświeżeniu wybór zostaje, język panelu nadal polski → AC-29, AC-33
- [x] Zaloguj się jako admin, `/pl/internal/producers/<id>` → sekcja "Język komunikacji", ustaw `nl`, "Zapisz język" → zapisano, a w ustawieniach tego producenta widać Nederlands → AC-29
- [x] Założ projekt własny (lub zapytanie klienta) dla producenta z `de` → mail do niego po niemiecku, link `/de/producer/panel/board/...`, data po niemiecku; producent z `pl` dostaje ten sam mail po polsku → AC-30
- [x] Mail do zespołu o tym samym zapytaniu nadal po polsku, mail do klienta w `contact_locale` → AC-31
## Commands
- [x] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/producer-communication-locale.test.ts lib/producer-communication-locale-actions.test.ts lib/notifications/large-order-producer-locale.test.ts lib/i18n` → wszystko zielone → AC-29 do AC-33
- [x] Zapytanie do bazy dev: `select communication_locale, count(*) from producer group by 1` → istniejący producenci mają `pl`; `update producer set communication_locale='fr'` kończy się błędem CHECK → AC-29, AC-33
- [x] `npx tsc --noEmit` i `npx eslint lib components "app/[locale]"` → bez błędów
## Acceptance-criteria coverage
- AC-29 UI krok 1 i 2 + testy akcji i CHECK · AC-30 UI krok 3 + test maili w czterech językach (nowe zapytanie, przypomnienie, wynik wyboru) · AC-31 UI krok 4 (bez testu automatycznego, kod maili zespołu nietknięty) · AC-32 test przestrzeni nazw i tematów w `lib/i18n/large-order-messages.test.ts` · AC-33 test domyślnej wartości + migracja
- Nie pokryte testem: maile zamknięcia, "nie wybrano" i połączenia w czterech językach (ta sama pętla co pokryte, ale bez osobnego testu), formularz `CommunicationLocaleForm` (brak testu komponentu).
