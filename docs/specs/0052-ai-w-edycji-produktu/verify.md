# Verify: ai w edycji istniejącego produktu · spec 0052 · updated 2026-09-25
_Steps derived from spec 0052 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Otwórz edycję już opublikowanego produktu (`/producer/panel/products/[id]/edit`) z co najmniej jednym wgranym rzutem, przejdź do kroku "Układ pomieszczeń" → karta "Rozpoznaj układ pomieszczeń z rzutów" jest widoczna, z listą wgranych rzutów jako checkboxów (do pięciu zaznaczonych domyślnie) → AC-1, AC-7
- [ ] Zaznacz jeden lub więcej rzutów, kliknij "Rozpoznaj pomieszczenia" → nowe pokoje pojawiają się na liście z odpowiednim znacznikiem pewności, dokładnie jak w kreatorze nowego projektu → AC-1, AC-3
- [ ] Uruchom rozpoznawanie na produkcie, który już ma pokój o tej samej nazwie/powierzchni, ale innym piętrze niż rozpoznany → istniejący wiersz zostaje, dostaje tylko znacznik "do sprawdzenia", nic nie jest skasowane ani cicho nadpisane → AC-4, AC-6
- [ ] W tym samym produkcie przejdź do kroku "Warianty" → karta "Rozpoznaj standardy z materiału" jest widoczna (zakładki tekst/plik, informacja że materiał źródłowy nie jest zapisywany) → AC-2, AC-3
- [ ] Wklej tekst z cennikiem, uruchom wydobywanie, przejrzyj propozycję, kliknij "Zastosuj" na jednej → wariant się aktualizuje (cena/pozycje kosztowe), propozycja znika z listy do przeglądu, nic nie zapisuje się automatycznie przed kliknięciem "Zastosuj" → AC-2, AC-3, AC-6
- [ ] Spróbuj wywołać rozpoznawanie/ekstrakcję (przez UI albo bezpośrednio akcję serwerową) na produkcie należącym do innego producenta → żądanie odrzucone tym samym błędem co w kreatorze tworzenia → AC-5
- [ ] Sprawdź, że żaden dodatkowy ekran ani modal potwierdzenia nie pojawia się przy pierwszym użyciu żadnej z dwóch kart AI w sesji edycji → AC-6
- [ ] Sprawdź, że limit pozostaje wyłącznie pięć rzutów na jedno wywołanie rozpoznawania (szósty checkbox jest wyszarzony/disabled), bez żadnego dziennego limitu liczby wywołań → AC-7

## Commands
- [ ] `npx vitest run components/producent/ProductEditWizard.test.tsx components/producent/ProjectWizardRoomLayoutStep.test.tsx components/producent/ProjectWizardVariantsStep.test.tsx lib/room-layout-merge.test.ts lib/producer-room-layout-actions.test.ts lib/producer-standards-extraction-actions.test.ts` → wszystkie zielone → AC-1 do AC-9
- [ ] `npx tsc --noEmit` → czysty, brak nowych błędów typów po zmianie propsów w `ProductEditWizard.tsx` → AC-8
- [ ] `git grep -n "recognizeRoomLayout\|extractStandardsFromMaterial" lib/producer-room-layout-actions.ts lib/producer-standards-extraction-actions.ts` → sygnatury obu akcji niezmienione względem spec 0050 (sam `productId` plus materiał/rzuty, bez nowych parametrów) → AC-8

## Acceptance-criteria coverage
- AC-1 (karta rozpoznawania w edycji, identyczna jak w tworzeniu) — covered by UI steps 1-2, Commands step 1
- AC-2 (karta ekstrakcji standardów w edycji, identyczna jak w tworzeniu) — covered by UI steps 4-5, Commands step 1
- AC-3 (te same reguły co w tworzeniu, bez zmian w logice serwerowej) — covered by UI steps 2, 5
- AC-4 (merge nienadpisujący identyczny jak w tworzeniu) — covered by UI step 3, Commands step 1 (`lib/room-layout-merge.test.ts`)
- AC-5 (dostępność dla każdego własnego produktu, ownership check, brak nowej blokady po publikacji) — covered by UI step 6, Commands step 1 (`lib/producer-room-layout-actions.test.ts`/`lib/producer-standards-extraction-actions.test.ts`)
- AC-6 (brak dodatkowego ekranu/modala potwierdzenia) — covered by UI steps 3, 5, 7
- AC-7 (limit tylko pięć rzutów na wywołanie, bez limitu liczby wywołań) — covered by UI steps 1, 8
- AC-8 (żadna nowa tabela/endpoint/zmiana sygnatury) — covered by Commands steps 2-3
- AC-9 (istniejące testy przepisane z "brak" na "obecność i działanie") — covered by Commands step 1 (`ProductEditWizard.test.tsx` ma teraz dwa testy integracyjne zamiast braku pokrycia)
