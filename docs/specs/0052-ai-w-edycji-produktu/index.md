# 0052. Dwie zdolności AI (rozpoznawanie układu pomieszczeń, wydobywanie standardów) także w edycji istniejącego produktu

**Date**: 2026-09-25
**Status**: In Progress

## Summary

Dwie zdolności AI, które dziś działają tylko w kreatorze nowego projektu, rozpoznawanie układu pomieszczeń z wgranych rzutów i wydobywanie standardów wykończenia z dowolnego materiału, trafiają teraz również do edycji już istniejącego, opublikowanego produktu. Zmiana jest wyłącznie dopięciem interfejsu: obie zdolności są dziś zbudowane generycznie po `productId`, więc nic w logice serwerowej się nie zmienia. Ten spec formalnie odwraca decyzję AC-41 ze spec [0050](../0050-uproszczone-dodawanie-projektu-domu/index.md), która świadomie wykluczyła edycję i zapowiedziała, że to osobna, przyszła decyzja.

## Requirements

**User stories**:
- Jako producent edytujący już opublikowany produkt, chcę uruchomić rozpoznawanie układu pomieszczeń z wgranych rzutów, tak samo jak przy tworzeniu nowego projektu, żeby nie przepisywać pokoi ręcznie po każdej zmianie rzutu.
- Jako producent edytujący już opublikowany produkt, chcę wydobyć dane standardu wykończenia z wklejonego materiału (tekst, tabela, zrzut, obraz, dokument), tak samo jak przy tworzeniu nowego projektu, żeby szybciej aktualizować warianty.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Krok "Układ pomieszczeń" w `ProductEditWizard` pokazuje tę samą kartę rozpoznawania AI co krok "Układ pomieszczeń" w `ProjectWizard` (wybór do pięciu wgranych rzutów, przycisk "Rozpoznaj układ pomieszczeń"), identyczne zachowanie, żaden nowy wariant UI.
- **AC-2**: Krok "Warianty" w `ProductEditWizard` pokazuje tę samą kartę wydobywania standardów co krok "Warianty" w `ProjectWizard` (wklejony tekst/tabela, wgrany obraz/dokument, przegląd propozycji z zastosuj/pomiń per pozycja), identyczne zachowanie, żaden nowy wariant UI.
- **AC-3**: Obie zdolności działają na dokładnie tych samych regułach co w kreatorze tworzenia, bez zmian w logice serwerowej: limit pięciu rzutów na jedno wywołanie rozpoznawania (`MAX_FLOOR_PLANS_FOR_RECOGNITION`), reguła czwartego standardu (spec 0050 AC-15), materiał źródłowy do ekstrakcji nigdy nie jest zapisywany.
- **AC-4**: Merge wyników rozpoznawania pomieszczeń w edycji zachowuje się identycznie jak w kreatorze: nowe pokoje są dopisywane, rozbieżna wartość istniejącego pokoja (inne piętro przy dopasowanej nazwie/powierzchni) dostaje tylko znacznik "do sprawdzenia", żaden istniejący wiersz nie jest kasowany ani cicho nadpisywany.
- **AC-5**: Obie zdolności są dostępne dla każdego produktu, do którego producent ma prawo edycji (ten sam ownership check co reszta `ProductEditWizard`), niezależnie od statusu publikacji produktu. Żaden nowy stan blokady na poziomie produktu nie jest wprowadzany.
- **AC-6**: Nie ma żadnego dodatkowego ekranu ani modala potwierdzenia przed uruchomieniem którejkolwiek z dwóch zdolności w edycji, ponad już istniejący flow (merge nienadpisujący dla pokoi, zastosuj/pomiń per propozycja dla standardów).
- **AC-7**: Limit liczby wywołań pozostaje dokładnie taki, jak w kreatorze tworzenia: bez dziennego ani żadnego innego twardego limitu liczby wywołań na produkt; jedyny limit to pięć rzutów na jedno wywołanie rozpoznawania (niezmieniony).
- **AC-8**: Żadna nowa tabela, kolumna, endpoint ani zmiana sygnatury `recognizeRoomLayout`/`extractStandardsFromMaterial`; jedyna zmiana to przekazanie już dostępnych danych (`productId`, `floorPlans`) jako propsów w `ProductEditWizard.tsx`.
- **AC-9**: Istniejące testy (Vitest, Playwright), które dziś asercjonują nieobecność przycisków AI w `ProductEditWizard` (spec 0050, Verify plan), są zaktualizowane, żeby zamiast tego asercjonować obecność i poprawne działanie obu kart AI w edycji.

## Decision

**Chosen option**: Option 1: Włączyć obie zdolności do edycji bez ograniczeń (samo dopięcie propsów)

Obie zdolności AI (rozpoznawanie układu pomieszczeń, wydobywanie standardów) trafiają do `ProductEditWizard` przez samo przekazanie już istniejących propsów do już istniejących, współdzielonych komponentów kroków, bez żadnej nowej logiki warunkującej ani dodatkowego ekranu potwierdzenia.

## Feature design

**Data model sketch**:
Brak zmian. Zdolności operują na już istniejących tabelach (`room_layout` przez `roomLayout` na produkcie, `product_variant`/`cost_line_item` przez warianty), bez nowych encji, pól ani relacji.

**API surface**:
Brak nowych endpointów ani zmian sygnatur. Ponownie użyte bez zmian:

| Akcja serwerowa | Wejście | Wyjście | Auth | Kluczowe błędy |
|---|---|---|---|---|
| `recognizeRoomLayout` (`lib/producer-room-layout-actions.ts`) | `productId`, `floorPlanDocumentIds[]` (max 5) | `{ ok, rooms?, error? }` | sesja producent/admin + ownership po `productId` | brak uprawnień, produkt nieznaleziony, zero/za dużo rzutów |
| `extractStandardsFromMaterial` (`lib/producer-standards-extraction-actions.ts`) | `productId`, materiał (tekst/plik) | lista `ExtractedStandard[]` | sesja producent/admin + ownership po `productId` | brak uprawnień, produkt nieznaleziony, błąd dostawcy AI |

**Key invariants**:
- Materiał źródłowy do ekstrakcji standardów nigdy nie jest zapisywany (niezmienione z spec 0050).
- Merge rozpoznanych pomieszczeń nigdy nie kasuje ani nie nadpisuje istniejącego wiersza po cichu (niezmienione, `lib/room-layout-merge.ts`).
- Ownership produktu (`resolveProductOwnership`) jest sprawdzany identycznie w edycji i w tworzeniu, bez rozróżnienia kontekstu.

**Security model**:
Bez zmian względem reszty `ProductEditWizard`: producent widzi i edytuje wyłącznie własne produkty (albo admin, wszystkie), ten sam mechanizm co pozostałe kroki kreatora edycji. Brak nowego stanu blokady związanego z publikacją produktu (AC-5).

**Configuration required**: brak nowych zmiennych środowiskowych ani poświadczeń, obie zdolności reużywają już skonfigurowanego klienta Azure OpenAI (`lib/ai/openai.ts`, `lib/ai/azure-config.ts`).

**Critical test scenarios** (każdy odwołuje się do kryterium z `## Requirements`):
- Happy path, rozpoznawanie: producent otwiera edycję opublikowanego produktu z wgranymi rzutami, wybiera do pięciu, uruchamia rozpoznawanie, nowe pokoje pojawiają się na liście z odpowiednim znacznikiem pewności, weryfikuje **AC-1, AC-3, AC-4**.
- Happy path, standardy: producent w edycji wkleja tekst z cennikiem, uruchamia wydobywanie, przegląda propozycje, zatwierdza jedną, wariant się aktualizuje, weryfikuje **AC-2, AC-3**.
- Merge nienadpisujący: rozpoznany pokój ma tę samą nazwę i powierzchnię co istniejący, ale inne piętro, istniejący wiersz zostaje z dodanym znacznikiem "do sprawdzenia", nic nie ginie, weryfikuje **AC-4, AC-6**.
- Auth/ownership: producent A próbuje wywołać rozpoznawanie/ekstrakcję na produkcie producenta B, żądanie odrzucone tym samym błędem co dziś w kreatorze tworzenia, weryfikuje **AC-5**.
- Regresja istniejących testów: dotychczasowe testy asercjonujące brak przycisków AI w `ProductEditWizard` przepisane na obecność i działanie, weryfikuje **AC-9**.

## Build plan

Projekt (epika Produkcja) korzysta z podejścia Tracer Bullet, ale ta zmiana jest już z natury cienkim, kompletnym wątkiem (samo dopięcie UI do w pełni zbudowanej, generycznej logiki serwerowej), więc kolejność zadań jest liniowa, bez osobnej fazy "pogrubiania":

1. W `ProductEditWizard.tsx` przekazać `productId` i `floorPlans` (już dostępny lokalny stan, zmapowany do `{ id, filename }`) do `ProjectWizardRoomLayoutStep` w kroku "uklad-pomieszczen", satisfies **AC-1, AC-3, AC-4, AC-5**. Zbudowane: `components/producent/ProductEditWizard.tsx`.
2. W `ProductEditWizard.tsx` przekazać `enableStandardsExtraction={true}` do `ProjectWizardVariantsStep` w kroku "warianty", satisfies **AC-2, AC-3, AC-5**. Zbudowane: `components/producent/ProductEditWizard.tsx`.
3. Usunąć albo zaktualizować komentarz w `ProjectWizardRoomLayoutStep.tsx` (linie 29 do 33), który dziś dokumentuje "wyłącznie w kreatorze nowego projektu, nigdy w edycji" jako nieaktualny po tej zmianie, satisfies **AC-1**. Zbudowane: `components/producent/ProjectWizardRoomLayoutStep.tsx` (i analogiczny komentarz w `ProjectWizardVariantsStep.tsx`).
4. Zaktualizować istniejące testy `ProductEditWizard.test.tsx` (i odpowiadający scenariusz Playwright, jeśli istnieje), które dziś asercjonują brak kart AI, żeby zamiast tego asercjonowały ich obecność i poprawne wywołanie akcji serwerowych (mock tym samym wzorcem co `ProjectWizard.test.tsx`), satisfies **AC-9**. Zbudowane: dwa nowe testy w `components/producent/ProductEditWizard.test.tsx`; brak scenariusza Playwright dla tego kroku w repo, więc pominięty. Dwie nieaktualne adnotacje "(edit wizard, AC-41)" w tytułach testów `ProjectWizardRoomLayoutStep.test.tsx`/`ProjectWizardVariantsStep.test.tsx` usunięte (testowały samo zachowanie komponentu przy braku propsów, nie konkretnie kreator edycji, więc same testy zostają, tylko tytuł).
5. Dopisać (albo rozszerzyć istniejące) testy merge nienadpisującego i ownership w kontekście edycji, jeśli obecne testy `lib/room-layout-merge.test.ts`/akcji serwerowych już nie pokrywają wywołania z poziomu edycji identycznie jak z tworzenia, satisfies **AC-4, AC-5, AC-6**. Sprawdzone: `lib/room-layout-merge.test.ts` testuje `mergeRecognizedRooms` generycznie, bez żadnego kontekstu tworzenie/edycja; `lib/producer-room-layout-actions.test.ts`/`lib/producer-standards-extraction-actions.test.ts` testują ownership generycznie po `productId`. Obie już pokrywają wywołanie z edycji identycznie jak z tworzenia, bez zmian potrzebnych.

## Consequences

**Positive**:
- Producent zyskuje spójne narzędzia AI niezależnie od tego, czy tworzy nowy produkt, czy edytuje istniejący, mniej ręcznego przepisywania danych po zmianie rzutu albo cennika.
- Zero nowego długu technicznego: brak nowych tabel, endpointów, zależności czy wzorców do utrzymania, wyłącznie reużycie już przetestowanej infrastruktury.

**Negative / tradeoffs**:
- Producent może przypadkowo uruchomić rozpoznawanie/ekstrakcję na produkcie z już starannie dopracowaną, ręczną treścią; ryzyko nadpisania jest wyeliminowane w warstwie danych (merge dopisujący, zastosuj per propozycja), ale ryzyko "szumu" w postaci nowych, niepotrzebnych pozycji do przejrzenia pozostaje, świadomie zaakceptowane (Rationale, Option 1 Cons).
- Brak twardego limitu liczby wywołań na produkt (AC-7, niezmienione z kreatora tworzenia) oznacza, że koszt Azure OpenAI rośnie proporcjonalnie do tego, jak często producenci edytują już opublikowane produkty, nie tylko nowe; świadomie zaakceptowane, zgodnie z tą samą decyzją co w spec 0050.

**Neutral**:
- Formalnie odwraca AC-41 spec 0050 (patrz Follow-up), bez zmiany treści samego spec 0050, ten spec jest źródłem prawdy dla nowego zakresu.

## Follow-up

- [ ] Zaktualizować AC-41 w [spec 0050](../0050-uproszczone-dodawanie-projektu-domu/index.md#linia-97) dopiskiem odsyłającym do tego spec (np. "chyba że spec 0052 stanowi inaczej"), przy okazji najbliższej edycji tamtego spec, żeby uniknąć sprzecznych zapisów w dwóch miejscach.
- [ ] Zamknąć punkt Follow-up ze spec 0050 ("Rozważyć, czy zdolności ekstrakcji AI... powinny trafić też do edycji"), ten spec jest na niego odpowiedzią.
