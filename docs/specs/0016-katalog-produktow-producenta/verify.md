# Verify: katalog produktów producenta · spec 0016 · updated 2026-08-27

_Steps derived from spec 0016 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Zarejestruj się jako producent (`/pl/producent`), dojdź do kreatora, wypełnij wszystkie siedem kroków (włącznie z nowym „Cena i sprzedaż”: cena min/max, standard, terminy, gwarancja, kategoria) → krok Podsumowanie pokazuje sekcję „Cena i sprzedaż” z wpisanymi wartościami → AC-4, AC-7 (spec 0008)
- [ ] Kliknij „Zapisz projekt” → przekierowanie na `/producent/gotowosc-eksportowa` z `nazwa`, `nip`, `countries`, `technology` w URL, szkic kreatora usunięty z `localStorage` → AC-5
- [ ] Na ekranie gotowości eksportowej widoczny link „Zobacz swoje produkty”; wejście na `/producent/gotowosc-eksportowa` bez parametru `nip` (np. bezpośredni URL) → link niewidoczny → AC-6
- [ ] Kliknij „Zobacz swoje produkty” → `/producent/produkty?nip=...` pokazuje listę z jednym produktem (nazwa, metraż, sypialnie, kraj, data dodania) → AC-1
- [ ] Wejdź na `/producent/produkty?nip=<NIP który nigdy się nie rejestrował>` → redirect do `/producent`, bez błędu na stronie → AC-1
- [ ] Usuń jedyny produkt z listy (przez „Usuń” i potwierdzenie w modalu) → lista pokazuje stan pusty z przyciskiem „Dodaj produkt” → AC-2, AC-10
- [ ] Kliknij „Anuluj” w modalu usuwania na innym produkcie → produkt zostaje na liście, nic się nie zmienia → AC-10
- [ ] Kliknij „Dodaj produkt” z listy → kreator otwiera się z pełnym kompletem parametrów (`nip`, `countries`, `technology`) odtworzonym automatycznie → AC-3
- [ ] Kliknij „Edytuj” na produkcie → osobny ekran edycji, wszystkie siedem kroków od razu klikalne i wypełnione danymi produktu → AC-7
- [ ] Wejdź na adres edycji z nieistniejącym `id` (np. zmień UUID w URL) → redirect do `/producent/produkty?nip=...` → AC-7
- [ ] Zmień pole w edycji, odśwież stronę w połowie → wznawia z zachowanymi zmianami, na tym samym kroku → AC-8
- [ ] Zapisz zmiany w edycji → powrót do `/producent/produkty?nip=...` (bez przechodzenia przez gotowość eksportową), pozycja na liście zaktualizowana → AC-9
- [ ] Otwórz `/klient/wyniki` w tej samej przeglądarce, w której dodano produkt → lokalnie dodany produkt widoczny jako karta z etykietą „Twój dodany produkt (podgląd)”, bez checkboxa zaznaczenia → AC-11
- [ ] Ustaw filtr kraju na `/wyniki` na kraj spoza krajów dostawy zarejestrowanych przez producenta → lokalna karta znika z listy → AC-11
- [ ] Otwórz `/klient/wyniki` w przeglądarce bez żadnych lokalnie dodanych produktów → wygląd strony identyczny jak przed spec 0016 (liczba w nagłówku, stan pusty) → AC-11, AC-12
- [ ] Sprawdź czytnikiem ekranu albo DevTools: modal usuwania łapie fokus i zamyka się na Esc; jeden H1 na `/producent/produkty` i na ekranie edycji; doklejone karty na `/wyniki` mają `aria-live="polite"` ogłoszenie liczby dodanych pozycji → AC-14

## Commands

- [ ] `npm run test` → 364/364 zielone (w tym nowe testy `ProjectWizard.test.tsx`, `lib/producer-project-draft.test.ts`, `ExportReadinessMap.test.tsx`, `ResultsSelection.test.tsx`) → AC-1 do AC-14
- [ ] `npm run build` → kompiluje się czysto, `/producent/produkty` i `/producent/produkty/[id]/edytuj` widoczne w liście tras → wszystkie AC
- [ ] `npm run lint` → bez nowych błędów wprowadzonych przez tę funkcję (pre istniejący błąd w `components/klient/SearchCard.tsx` jest spoza zakresu tej specyfikacji)

## Acceptance-criteria coverage

- AC-1, AC-2, AC-3 … pokryte krokami listy produktów i redirectów powyżej
- AC-4 … pokryte krokiem wypełnienia siódmego kroku kreatora
- AC-5, AC-9 … pokryte krokami zapisu nowego produktu i edycji, włącznie z przypadkiem błędu opisanym w Feature design (nie odtworzonym ręcznie tutaj — wymaga symulacji przekroczenia limitu `localStorage`, patrz spec 0016 Critical test scenarios)
- AC-6 … pokryte krokiem widoczności linku na gotowości eksportowej
- AC-7, AC-8 … pokryte krokami ekranu edycji i wznowienia po odświeżeniu
- AC-10 … pokryte krokami modala usuwania (potwierdzenie i anulowanie)
- AC-11, AC-12 … pokryte krokami lokalnego podglądu na `/wyniki`, z filtrem i bez lokalnych produktów
- AC-13 … pokryte automatycznie przez istniejące testy fail soft w `lib/producer-project-draft.test.ts` (wzorzec reużyty przez nowe moduły magazynu)
- AC-14 … pokryte krokiem dostępności
