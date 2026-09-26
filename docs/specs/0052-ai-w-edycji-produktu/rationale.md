# 0052. Rationale

## Context

Spec 0050 zbudował dwie zdolności AI (rozpoznawanie pomieszczeń z rzutów, wydobywanie standardów z materiału) wyłącznie dla kreatora nowego projektu (`ProjectWizard`). `ProductEditWizard`, kreator edycji istniejącego produktu, współdzieli te same komponenty kroków (`ProjectWizardRoomLayoutStep`, `ProjectWizardVariantsStep`), ale świadomie nie przekazuje im propsów potrzebnych do pokazania kart AI (`productId`/`floorPlans` dla rozpoznawania, `enableStandardsExtraction` dla ekstrakcji). Spec 0050 nazwał to wprost w AC-41 i zostawił jako otwarty punkt Follow-up: rozważyć doprowadzenie tych zdolności też do edycji, jako osobną decyzję.

Powód tego pytania jest praktyczny: producent, który już opublikował produkt, dziś musi ręcznie przepisywać układ pomieszczeń i standardy wykończenia przy każdej zmianie, mimo że dokładnie te same narzędzia AI już istnieją i działają w kreatorze tworzenia. Otwarte pytanie z AC-41 brzmiało: czy obie zdolności wchodzą do edycji, czy tylko jedna, i czy dla już opublikowanego produktu potrzebne są dodatkowe zabezpieczenia (np. potwierdzenie przed nadpisaniem istniejących pokoi/wariantów).

Kluczowy fakt techniczny, sprawdzony w kodzie przed podjęciem decyzji: obie akcje serwerowe (`recognizeRoomLayout` w `lib/producer-room-layout-actions.ts`, `extractStandardsFromMaterial` w `lib/producer-standards-extraction-actions.ts`) już dziś przyjmują sam `productId` i sprawdzają własność produktu generycznie (`resolveProductOwnership`), bez żadnego założenia o stanie "produkt w trakcie tworzenia". Scalanie wyników też jest już nienadpisujące: `mergeRecognizedRooms` (`lib/room-layout-merge.ts`) dopisuje nowe pokoje i oznacza rozbieżności jako "do sprawdzenia", nigdy nie kasuje ani nie nadpisuje istniejącego wiersza po cichu; wydobywanie standardów wymaga ręcznego "zastosuj" na każdą propozycję z osobna. Innymi słowy, bariera, którą postawił AC-41, była wyłącznie w warstwie UI (brak przekazanych propsów), nie w logice.

## Options considered

### Option 1: Włączyć obie zdolności do edycji bez ograniczeń (samo dopięcie propsów)

Przekazać `productId`/`floorPlans` do `ProjectWizardRoomLayoutStep` i `enableStandardsExtraction` do `ProjectWizardVariantsStep` wewnątrz `ProductEditWizard.tsx`, bez żadnej dodatkowej logiki warunkującej dostępność czy dodatkowego potwierdzenia.

**Pros**:
- Zero nowego kodu logiki, wyłącznie wiring już istniejących, przetestowanych komponentów i akcji serwerowych.
- Spójne zachowanie między kreatorem tworzenia a edycją, producent uczy się jednego wzorca.
- Merge i flow zastosuj/pomiń już chronią przed nadpisaniem danych, więc dodatkowe zabezpieczenie nie ma realnego celu do spełnienia.

**Cons**:
- Producent może uruchomić rozpoznawanie/ekstrakcję na produkcie z już bogatą, ręcznie dopracowaną treścią i nie od razu zauważyć nowe, dopisane pozycje wymagające przeglądu (łagodzone przez to, że nic nie jest kasowane ani nadpisywane po cichu, tylko dopisywane albo oznaczane "do sprawdzenia").

### Option 2: Włączyć obie zdolności, ale z jednorazowym modalem potwierdzenia przy pierwszym użyciu na danym produkcie w sesji edycji

Jak Option 1, plus modal "to jest opublikowany produkt, wynik trzeba ręcznie zatwierdzić" przy pierwszym kliknięciu każdego z dwóch przycisków AI w danej sesji edycji danego produktu.

**Pros**:
- Dodatkowe, jawne przypomnienie kontekstu (produkt już opublikowany) w momencie użycia.

**Cons**:
- Dodatkowy stan UI i dodatkowa logika do zbudowania i przetestowania dla ochrony, którą merge/zastosuj-pomiń flow już zapewnia; realnie tylko spowalnia producenta bez zmiany zachowania systemu.
- Niespójne z kreatorem tworzenia, gdzie tego modala nie ma mimo identycznego mechanizmu bezpieczeństwa.

### Option 3: Włączyć tylko jedną z dwóch zdolności teraz, drugą odłożyć

Np. tylko rozpoznawanie układu pomieszczeń, wydobywanie standardów zostaje wyłącznie w kreatorze tworzenia (albo odwrotnie).

**Pros**:
- Mniejszy zakres zmiany na raz.

**Cons**:
- Nie odpowiada na pierwotną prośbę (obie zdolności), sztucznie dzieli spójną parę funkcji AI bez żadnego realnego powodu technicznego czy biznesowego, obie mają identyczny wzorzec bezpieczeństwa.

## Rationale

Silniejszy argument niż wygoda implementacji: bezpieczeństwo tej zmiany nie zależy od tego, czy producent edytuje nowy, czy już opublikowany produkt, bo obie zdolności AI nigdy nie nadpisują danych po cichu, niezależnie od kontekstu wywołania. `mergeRecognizedRooms` dopisuje albo oznacza "do sprawdzenia", nigdy nie kasuje; wydobywanie standardów zawsze przechodzi przez ręczne "zastosuj" per propozycja. Skoro ten sam mechanizm uznano za wystarczające zabezpieczenie w kreatorze tworzenia (gdzie produkt też może już mieć częściowo wypełnione dane, wprowadzone ręcznie przed uruchomieniem AI), nie ma podstawy, żeby uznać go za niewystarczający wyłącznie dlatego, że produkt jest już opublikowany. Dodatkowy modal z Option 2 dodaje koszt budowy i utrzymania bez adresowania realnego ryzyka: ryzyko nadpisania już jest wyeliminowane w warstwie danych, nie w warstwie UI.

Ownership check (`resolveProductOwnership`) jest już dziś generyczny po `productId`, bez żadnego założenia o "sesji tworzenia", co potwierdza, że AC-41 był wyłącznie decyzją produktową (świadome odłożenie), nigdy ograniczeniem technicznym. To wzmacnia wybór Option 1: nie ma tu bariery technicznej do obejścia, tylko prosta zmiana zakresu funkcji.
