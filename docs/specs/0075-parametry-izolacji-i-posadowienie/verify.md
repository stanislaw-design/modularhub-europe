# Verify: parametry izolacji przegród, posadowienie i planowane użytkowanie · spec 0075 · updated 2026-10-24
_Steps derived from spec 0075 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Przed ręczną weryfikacją strony i porównania ustaw lokalnie `ENVELOPE_SECTION_ENABLED = true` w `lib/product-envelope-parameters.ts` (domyślnie `false`, wraca na `false` przed commitem do czasu weryfikacji merytorycznej). Po dodaniu kluczy `messages/*.json` zrestartuj `next dev`.

## UI / manual
- [ ] Zaloguj się jako administrator, otwórz `/internal/producers/[id]` producenta z domem, w sekcji "Izolacja przegród i posadowienie" dodaj U ściany 0,22 metodą obliczeń z datą → wiersz widoczny jako "Niepotwierdzone przez platformę"        → AC-10, AC-1
- [ ] Kliknij "Potwierdź parametr", odśwież → "Potwierdzone przez platformę" z datą        → AC-10, AC-3
- [ ] Otwórz `/pl/project/[slug]` tego domu → sekcja "Izolacja przegród" z wartością, jednostką W/m²K, metodą, "Stan na dzień" oraz tekstem i ikoną stanu; pod sekcją zastrzeżenie        → AC-11, AC-17
- [ ] Ta sama strona w `/en`, `/de`, `/nl` → wszystkie etykiety i opisy przetłumaczone, bez polskiego tekstu        → AC-16
- [ ] Rozwiń "Co to znaczy?" klawiaturą (Tab, Enter) → pokazuje wyjaśnienie U, Rc, "to nie to samo", Ug i Uw, stanu na dzień, deklaracji i potwierdzenia        → AC-12, AC-17
- [ ] Zaloguj się jako producent tego domu, na ekranie edycji produktu zmień wartość potwierdzonego wiersza → wiersz wraca do "Deklaracja producenta, niepotwierdzona"        → AC-9
- [ ] Jako producent ustaw posadowienie "Tymczasowe" → strona produktu pokazuje "Posadowienie: tymczasowe"        → AC-5, AC-11
- [ ] Jako producent spa-modulowe otwórz edycję produktu → brak sekcji "Izolacja i posadowienie"        → AC-4, AC-9
- [ ] Dodaj ten sam parametr (ściana, U) drugi raz → komunikat "już istnieje", bez surowego błędu bazy        → AC-9
- [ ] Dom o powierzchni 52 m² z wierszami → notka o progu 50 m²; dom 120 m² bez notki        → AC-14
- [ ] Dom bez żadnego wiersza → strona bez sekcji, wygląda jak dotąd        → AC-11, AC-15
- [ ] `/pl/compare` z dwoma domami (jeden z danymi, drugi bez) → wiersze "Ściany", "Dach", "Podłoga" z wartością i oznaczeniem; brak danych pokazuje "Nie podano", nigdy 0        → AC-13
- [ ] Formularze: zwykłe zapytanie, zapytanie projektowe B2B i zapytanie hurtowe → "Planowane użytkowanie" nieobowiązkowe; "Sezonowo" pokazuje pole miesięcy 1 do 11; wysyłka bez odpowiedzi działa        → AC-7
- [ ] Wyślij zapytanie z "Sezonowo" i 5 miesiącami → widoczne w `/producer/panel/board/[id]` albo `product-inquiries/[id]` oraz `/internal/cases/[id]`        → AC-7, AC-6
- [ ] Administrator dodaje ocenę zgodności dla Belgii, Włoch i Francji z listą przepisów oraz opcją "Inny" → zapis się udaje, strona produktu pokazuje nazwę kraju w czterech językach i rozwijany opis HLL i logiesfunctie przy FR i NL        → AC-8, AC-12, AC-16
- [ ] Wybierajki krajów dostawy w panelu producenta (pojemność, tablica) i na `/internal/producers/[id]` → bez Belgii, Włoch i Francji        → AC-8

## Commands
- [ ] `npx tsc --noEmit` → bez błędów        → AC-1 do AC-18
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/product-envelope-actions.test.ts lib/product-envelope-parameters.test.ts components/klient/ProjectEnvelopeParameters.test.tsx` → wszystkie zielone        → AC-2, AC-4, AC-5, AC-9, AC-10, AC-11, AC-12, AC-14, AC-16, AC-18
- [ ] Zapytanie do dev bazy: `select count(*) from country where code in ('BE','IT','FR')` → 3        → AC-8
- [ ] Zapytanie do dev bazy: `select tgname from pg_trigger where tgname = 'product_envelope_parameter_audit'` → 1 wiersz        → AC-3
- [ ] `npm run build` → przechodzi        → AC-15
- [ ] `npx vitest run` → istniejące testy bez zmian (jedyna zmiana: test nieznanego kraju w `product-compliance-assessment-specs.test.ts` używa teraz "US", bo FR jest już poprawny)        → AC-15

## Acceptance-criteria coverage
- AC-1, AC-2, AC-3 … migracja `0061_envelope_parameters.sql`, kroki UI administratora, testy bazy i akcji · AC-4, AC-5 … test akcji (spa, gastronomiczny, czyszczenie podkategorii) · AC-6, AC-7 … formularze i widoki zapytań · AC-8 … ocena zgodności BE, IT, FR, wybierajki krajów · AC-9, AC-18 … test akcji producenta · AC-10 … test akcji administratora · AC-11, AC-12, AC-14, AC-17 … test komponentu i kroki UI · AC-13 … porównanie · AC-15 … strona bez wierszy, build, istniejące testy · AC-16 … test kluczy i fraz w `messages/*.json`

## Nie pokryte automatycznie (do uzupełnienia w /test)
- E2E ścieżki producent wpisuje, administrator potwierdza, klient widzi (spec zadanie 11)
- Zapis produktu przez `updateProducerProduct` ze zmianą podkategorii kontenera czyści posadowienie (AC-5): pokryty tylko na poziomie bazy i akcji posadowienia, nie przez cały kreator
- Zapis `intended_use` w trzech akcjach i walidacja Zod (AC-6, AC-7): brak testów akcji zapytań dla nowych pól
