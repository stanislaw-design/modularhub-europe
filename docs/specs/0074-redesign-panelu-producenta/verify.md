# Verify: redesign panelu producenta · spec 0074 · updated 2026-10-20
_Steps derived from spec 0074 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Zaloguj się jako producent, wejdź w `/pl/producer/panel` → menu ma pięć pozycji w trzech grupach (Zlecenia, Oferta, Firma), bez "Konto", "Zapytania o produkt" i "Moje wyceny"; aktywna pozycja ma `aria-current="page"`   → AC-1
- [ ] Wejdź w `/inquiries/[id]` i `/product-inquiries/[id]` → "Zapytania" są aktywne; na `/board/[id]` i `/board-quotes` aktywna jest "Tablica ogłoszeń"   → AC-1
- [ ] Producent z zapytaniem `open`, zapytaniem o produkt bez wyceny i nieobejrzaną decyzją → w menu liczba 3 przy "Zapytania", bez słowa "nowe"; przy zerze znacznik znika   → AC-2
- [ ] Producent bez zatwierdzonej weryfikacji wolumenowej → brak znacznika przy "Tablica ogłoszeń"   → AC-2
- [ ] Pulpit pokazuje nagłówek, powitanie, przycisk "Dodaj produkt" i wiersze (a), (b), (c) z poprawnymi linkami; wiersze z zerem znikają; przy braku zadań widać "Nic nie czeka na Twoją reakcję"   → AC-3
- [ ] Producent bez zatwierdzenia widzi zamiast wiersza tablicy wiersz o stanie profilu zdolności (nie złożono, w trakcie, odrzucono) z linkiem do `/capacity`   → AC-4
- [ ] Trzy kafelki (Otwarte zapytania, Moje wyceny, Aktywne produkty) są linkami z poprawnymi liczbami i linijkami   → AC-5
- [ ] Karta "Dokończ profil" pokazuje "X z 4", zrobione zadania bez linku; po wykonaniu wszystkich karta znika; NIP, kraje i status nie są na pulpicie   → AC-6
- [ ] `/inquiries` pokazuje jedną listę z etykietami "Z shortlisty" i "O produkt", kolumnami produkt, źródło, kraj, status, wiek, akcja; filtr `?status=needs-offer|decision|offered|closed|all`; domyślnie "Wymaga oferty", a gdy pusto, wszystkie; brak danych kontaktowych klienta   → AC-7
- [ ] Zapytanie o produkt z własną wyceną `accepted` ma status "Decyzja klienta"   → AC-7
- [ ] `/pl/producer/panel/product-inquiries` przekierowuje na `/inquiries`; linki powrotne w obu szczegółach prowadzą do `/inquiries`   → AC-8
- [ ] `/board` i `/board-quotes` mają wspólny pasek dwóch zakładek z licznikami; przełącznik "Tylko moje kraje dostawy" ukrywa ogłoszenie spoza krajów i pokazuje "Ukryto N ogłoszeń spoza Twoich krajów dostawy"   → AC-9
- [ ] `/products` ma kolumnę "Kompletność": produkt bez zdjęcia pokazuje "Brak zdjęć" i "Uzupełnij", jest na górze; kompletny pokazuje "Kompletny" i "Edytuj"; nad listą podsumowanie i "Dodaj produkt"   → AC-10
- [ ] `/settings` pokazuje formularz nazwy i technologii, NIP i kraje tylko do odczytu z linkiem "Zmień", certyfikaty; nie ma statusu weryfikacji   → AC-11
- [ ] Nazwa z jednego znaku zwraca błąd w formularzu, poprawna zapisuje się i pokazuje "Zapisano."   → AC-11
- [ ] `/pl/producer/export-readiness`, `company-verification`, `fulfillment`, `fulfillments`, `gap-closure` zwracają 404; w panelu nie ma bloku "Materiały demonstracyjne"   → AC-12
- [ ] Pulpit i listy w trybie jasnym i ciemnym oraz na telefonie (menu jako szuflada); przyciski i linki mają co najmniej 44 px, tabele przewijają się poziomo w ramce   → AC-14
- [ ] Producent A nie widzi liczników ani wierszy producenta B   → AC-15

## Commands
- [ ] `npx tsc --noEmit` → bez błędów   → AC-12
- [ ] `npm run lint` → bez błędów   → AC-12
- [ ] `npm run build` → przechodzi   → AC-12
- [ ] `npx vitest run lib/producer-inquiry-list.test.ts components/producent "app/[locale]/producer"` → zielone   → AC-1, AC-7, AC-8, AC-9, AC-10, AC-11
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/producer-panel-summary.test.ts lib/producer-company-actions.test.ts` → zielone (dev baza)   → AC-2, AC-7, AC-10, AC-15
- [ ] `node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/panel-producenta-0074.spec.ts e2e/zapytanie-o-produkt-0070.spec.ts` → zielone   → AC-3, AC-7, AC-8, AC-9, AC-10, AC-11
- [ ] `rg "export-readiness|company-verification|gap-closure|fulfillments" app components e2e` → brak linków do usuniętych tras   → AC-12
- [ ] `npm run test` → komunikat o rozjazdach kluczy `PopularHomeCard.*.few/many` w `lib/i18n/messages.test.ts` jest starszy niż ten spec; poza nim brak nowych różnic kluczy w pl, en, de, nl   → AC-13

## Acceptance-criteria coverage
- AC-1 … kroki menu · AC-2 … znaczniki · AC-3, AC-4 … pulpit · AC-5 … kafelki · AC-6 … Dokończ profil · AC-7, AC-8 … zapytania · AC-9 … tablica · AC-10 … produkty · AC-11 … ustawienia · AC-12 … czyszczenie, komendy · AC-13 … test kluczy · AC-14 … tryby i 44 px · AC-15 … izolacja producentów
