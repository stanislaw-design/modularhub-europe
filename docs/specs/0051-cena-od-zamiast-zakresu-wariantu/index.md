# 0051. Cena od zamiast zakresu wariantu

**Date**: 2026-09-23
**Status**: Proposed

## Summary

Każdy standard wykończenia domu (`product_variant`) ma dziś dwie ceny, minimalną i maksymalną, mimo że w praktyce prawie nikt nie wypełnia obu różnymi liczbami. Ta decyzja zmienia to na jedną cenę ("cena od"), usuwa opisową prozę o zakresie standardu na rzecz już istniejącej tabeli pozycji kosztowych (co wchodzi w cenę, co nie), i przełącza rozpoznawanie AI z cennika producenta tak, żeby wypełniało tę samą tabelę zamiast pisać osobny opis. W praktyce oznacza to jedno pole ceny w formularzu producenta zamiast dwóch, oraz usunięcie kilku pól i jednej całej tabeli z bazy danych.

## Context

Zobacz [rationale.md](rationale.md).

## Requirements

**Historie użytkownika**:
- Jako producent wypełniający standard wykończenia, chcę wpisać jedną cenę "od", żeby formularz odpowiadał temu, jak faktycznie wyceniam dom, bez drugiego pola, które i tak zawsze wpisuję tak samo jak pierwsze.
- Jako producent wgrywający cennik do rozpoznania AI, chcę żeby wynik od razu trafiał do tabeli pozycji kosztowych, którą i tak wypełniam ręcznie dla pozostałych standardów, zamiast do osobnego opisu, który potem i tak muszę powtórzyć w tabeli.
- Jako klient przeglądający kartę projektu albo wyniki wyszukiwania, chcę widzieć jedną, jasną cenę "od" i spójną listę tego, co wchodzi w cenę, bez dwóch różnych miejsc mówiących to samo innymi słowami.

**Kryteria akceptacji** (kontrakt, każde osobno sprawdzalne):
- **AC-1**: `product_variant` ma jedno pole ceny (`price_min_cents`, kolumna `price_max_cents` usunięta); `product` (pochodna wariantu domyślnego, bez zmian w tej zasadzie z spec 0041) traci `price_max_cents` tym samym sposobem. Karta klienta, wyniki wyszukiwania i tabela porównania zawsze pokazują "cena od X", nigdy zakres.
- **AC-2**: CHECK `product_variant_price_order` (porównanie min/max) jest usuwany jako pierwszy krok migracji, przed jakimkolwiek wdrożeniem kodu (patrz Migration plan faza 1): 28 z 59 żywych wariantów ma dziś `price_max_cents` różne od `price_min_cents`, więc zwykłe podniesienie ceny przez producenta w okresie między "kod przestał pisać max" a "kolumna max zniknęła" naruszyłoby ten CHECK przeciwko już nieaktualnej wartości. CHECK `product_variant_price_on_request` jest przepisywany na `price_on_request = false OR price_min_cents IS NULL` w tym samym, wczesnym kroku.
- **AC-3**: `price_sync_trigger` (opisany w `lib/db/AGENTS.md`, spec 0041) jest przepisywany funkcją `CREATE OR REPLACE` (nazwa i sygnatura bez zmian, więc bez `DROP TRIGGER`) w tym samym wczesnym kroku co AC-2, żeby przestać czytać i pisać `price_max_cents` na obu tabelach zanim ta kolumna fizycznie zniknie: kopiuje `price_min_cents` wariantu z `is_default = true` na `product.price_min_cents`, wraca do pustego, gdy produkt nie ma aktywnego wariantu domyślnego. Reszta reguły wyzwalacza (jedno polecenie SQL przy przełączaniu domyślnego wariantu) zostaje bez zmian.
- **AC-4**: Migracja destrukcyjna (Migration plan faza 3, na końcu, po pełnym wdrożeniu kodu): `price_max_cents` (`product_variant`, `product`) przestaje istnieć; `price_min_cents` zostaje dokładnie taki, jaki jest dziś. Żaden dziś aktywny wariant nie zmienia swojej pokazywanej ceny "od" w wyniku tej migracji.
- **AC-5**: `product_variant.scope_summary`, `product_variant.excluded_scope` oraz cała tabela `product_variant_translation` (istniała wyłącznie dla tłumaczeń tych dwóch pól, spec 0045) zostają usunięte z bazy.
- **AC-6**: `ResultCard` i `ProjectCompareTable` pokazują w miejscu dawnego `scopeSummary` do trzech etykiet pozycji kosztowych danego wariantu ze statusem "w cenie", posortowanych po `sort_order` rosnąco (puste `sort_order` na końcu, ten sam porządek co dziś w `cost_line_item`), oddzielonych przecinkami, z dopiskiem "+N więcej" gdy jest ich więcej niż trzy. Wariant bez żadnej pozycji "w cenie" (zero pozycji w ogóle albo zero z tym akurat statusem, oba przypadki traktowane tak samo) pokazuje dzisiejszy fallback (tekst "do potwierdzenia"). Te dwie karty czytają dziś warianty przez `resolveProductVariants` bez `withDetails` (`lib/data/projects.ts`), gdzie pozycje kosztowe w ogóle się nie ładują; ten krok musi rozszerzyć właśnie tę, "lekką" ścieżkę odczytu o same `label`/`status`/`sort_order` pozycji kosztowych (nie pełny `cost_line_item` ze wszystkimi polami), nie tylko `withDetails`.
- **AC-7**: `ProjectCostComparisonTable` i strona szczegółów projektu klienta przestają renderować `scopeSummary`/`excludedScope` (pola nie istnieją); pełna tabela pozycji kosztowych (bez zmian z spec 0041/0045) zostaje jedynym miejscem tej informacji tam, gdzie już się pokazuje.
- **AC-8**: `extractStandardsFromMaterial` zwraca dla każdego rozpoznanego standardu jedną cenę (`priceEur`, zastępuje `priceMinEur`/`priceMaxEur`) oraz proponowane pozycje kosztowe (`costLineItems: { label: string, status: CostLineItemStatus }[]`, ten sam zestaw pięciu statusów co dziś w `cost_line_item`) zamiast `scopeSummary`/`excludedScope` jako wolnego tekstu. Etykiety są zawsze zwracane po polsku, niezależnie od języka materiału źródłowego (ten sam wymóg co reszta pól standardu), żeby od razu trafiały do już istniejącego słownika `cost_line_item_label_translation` (dopasowanie po dokładnym tekście, AC-10), zamiast omijać go etykietami w obcym języku.
- **AC-9**: Krok wariantów w kreatorze (`ProjectWizardVariantsStep`) pokazuje jedno pole ceny na standard (bez pola "cena max"); pozycje kosztowe zaproponowane przez AI trafiają do tej samej, edytowalnej listy pozycji kosztowych, którą producent i tak wypełnia ręcznie dla pozostałych standardów, dopisywane do listy istniejącego wariantu (nigdy nie zastępują ręcznie wpisanych pozycji) i odfiltrowane od duplikatów po dokładnym tekście etykiety.
- **AC-10**: Krok "Tłumaczenia" przestaje tłumaczyć `scopeSummary`/`excludedScope` (pola nie istnieją) i przestaje wywoływać `updateVariantTranslation` (akcja usunięta razem z sekcją wariantów tego kroku). Etykiety pozycji kosztowych nadal tłumaczą się przez już istniejący, niezależny słownik `cost_line_item_label_translation` (dopasowanie po dokładnym tekście polskiej etykiety), bez żadnej zmiany w tym mechanizmie.
- **AC-11**: Filtr i sortowanie ceny na liście wyników (`lib/results-filters.ts`) działają bez zmiany sygnatury: już dziś porównują pojedynczą wartość (`project.priceMin`), nie parę.
- **AC-12**: Żaden test ani żaden ekran nie odwołuje się już do `priceMaxEur`, `priceMaxCents`, `scopeSummary`/`excludedScope` na wariancie, tabeli `product_variant_translation`, ani akcji `updateVariantTranslation`.
- **AC-13**: Każde miejsce pokazujące dziś zakres ceny na podstawie pary min/max pokazuje po tej zmianie pojedynczą cenę: `FavoriteCompareTable` (dziś renderuje `priceMin–priceMax €`) i dane strukturalne JSON-LD na stronie szczegółów projektu (dziś `AggregateOffer` z `lowPrice`/`highPrice`, zastąpione zwykłym `Offer` z jednym `price` równym `priceMin`).

## Options considered

Zobacz [rationale.md](rationale.md).

## Decision

**Wybrana opcja**: Opcja 3, pełna zmiana modelu: jedna cena per wariant, usunięcie opisu zakresu na rzecz istniejącej tabeli pozycji kosztowych, przekierowanie ekstrakcji AI na tę tabelę.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Rationale

Zobacz [rationale.md](rationale.md).

## Feature design

**Podejście budowy**: Tracer Bullet (domyślne w epice Produkcja, `docs/scope/produkcja.md`, ten sam wzorzec co spec 0041/0050). Migracja idzie w trzech krokach, nie dwóch: najpierw mały, bezpieczny krok bazy (usunięcie CHECK `product_variant_price_order`, przepisanie `price_sync_trigger`), dopiero potem kod aplikacji, dopiero na końcu migracja destrukcyjna (DROP COLUMN/DROP TABLE), dokładnie w tej kolejności co Migration plan niżej. Ta trzyczęściowa kolejność (zamiast dwuczęściowej z 0041/0050) jest konieczna, bo w tym wypadku sam stary CHECK, nie tylko stare kolumny, blokowałby normalną pracę producenta w oknie między wdrożeniem kodu a migracją destrukcyjną (patrz AC-2).

### Szkic modelu danych

| Zmiana | Tabela | Szczegół |
|---|---|---|
| Usunięcie CHECK `product_variant_price_order` | `product_variant` | **krok wczesny** (Migration plan faza 1, przed kodem): porównanie min/max nie ma już sensu, i musi zniknąć zanim aplikacja przestanie pisać `price_max_cents`, inaczej normalna podwyżka ceny na jednym z 28 wariantów z realnym zakresem naruszy ten CHECK przeciwko nieaktualnej wartości |
| Przepisanie CHECK `product_variant_price_on_request` | `product_variant` | **krok wczesny**, ten sam moment: `price_on_request = false OR price_min_cents IS NULL` |
| Przepisanie funkcji wyzwalacza (`CREATE OR REPLACE`, bez `DROP TRIGGER`) | `price_sync_trigger` | **krok wczesny**, ten sam moment: kopiuje `price_min_cents` (nie parę) z wariantu domyślnego, przestaje czytać/pisać `price_max_cents` na obu tabelach zanim ta kolumna fizycznie zniknie |
| Usunięcie kolumny `price_max_cents` | `product_variant` | **krok późny** (Migration plan faza 3, po pełnym wdrożeniu kodu): `price_min_cents` zostaje bez zmian nazwy ani wartości |
| Usunięcie kolumny `price_max_cents` | `product` | **krok późny**, ten sam moment: pochodna wyzwalacza, bez zmian w tej zasadzie |
| Usunięcie kolumn `scope_summary`, `excluded_scope` | `product_variant` | **krok późny**, ten sam moment: zastąpione przez `cost_line_item` |
| Usunięcie całej tabeli | `product_variant_translation` | **krok późny**, ten sam moment: istniała wyłącznie dla tłumaczeń dwóch kolumn wyżej |
| Bez zmian w kształcie, nowy pisarz i nowy czytelnik | `cost_line_item` | ekstrakcja AI zapisuje (AC-8, AC-9); `ResultCard`/`ProjectCompareTable` zaczynają je czytać przez "lekką" ścieżkę odczytu, która dziś ich nie ładuje (AC-6) |

### Powierzchnia serwerowa

| Akcja | Zmiana | Kluczowe wejście | Wynik |
|---|---|---|---|
| `extractStandardsFromMaterial` | zmieniony kształt wyniku | jak dziś (`productId`, materiał) | `priceEur` (zamiast pary), `costLineItems: {label, status}[]` (zamiast `scopeSummary`/`excludedScope`), `proposedStandard`, `confidence` bez zmian |
| `createVariant` / `updateVariant` / `cloneVariant` | zmieniony kształt wejścia | jedno pole `priceEur` zamiast pary; brak `scopeSummary`/`excludedScope` | jak dziś |
| `updateVariantTranslation` | usunięta | — | — |
| `generateProjectTranslations` | zmieniony zakres | jak dziś (`productId`, `locales`) | przestaje zbierać `scopeSummary`/`excludedScope` wariantów do tłumaczenia (pola nie istnieją); reszta zakresu (opis, pomieszczenia, FAQ, wymagania klienta) bez zmian |

### Kluczowe niezmienniki

- `product_variant.price_min_cents` jest jedynym polem ceny; żaden kod aplikacji ani przyszły ręczny zapis przez Neon MCP nie ma już drugiego pola do zsynchronizowania.
- Pozycje kosztowe proponowane przez AI (AC-8) nigdy nie zapisują się same z siebie: trafiają do tej samej, edytowalnej listy formularza co pozycje wpisane ręcznie, zapis idzie dopiero przy zatwierdzeniu kroku (ten sam wzorzec co reszta ekstrakcji AI, spec 0050 Kluczowe niezmienniki).
- Lista do trzech etykiet pozycji kosztowych na `ResultCard`/`ProjectCompareTable` (AC-6) jest czystą funkcją nad już pobranymi danymi (ten sam wzorzec co `getDefaultProjectVariant` w `lib/data/project-variants.ts`, `lib/data/AGENTS.md`); dane same w sobie wymagają rozszerzenia wszystkich pięciu wywołań `resolveProductVariants` bez `withDetails` (`getProjects`, `getProjectById` ×2, `getFeaturedProjectByFamily` ×2, `getVerifiedVolumeManufacturerProjects`) o same `label`/`status`/`sort_order` pozycji kosztowych, nie o pełny szczegółowy odczyt.
- Migracja bazy jest trzyetapowa, nie dwuetapowa jak w 0041/0050 (patrz Migration plan): usunięcie CHECK i przepisanie wyzwalacza idzie przed kodem aplikacji, nie razem z usunięciem kolumn/tabeli na końcu.

### Model bezpieczeństwa

Bez zmian względem dzisiejszego stanu: każda z akcji serwerowych nadal sprawdza własność produktu tym samym łańcuchem (`resolveProductOwnership`, `requireProducerActor`) co dziś; ta decyzja nie zmienia, kto może co zrobić.

### Wymagana konfiguracja

Brak nowych zmiennych środowiskowych ani danych dostępowych.

**Krytyczne scenariusze testowe** (każdy odpowiada kryterium wyżej):
- Migracja bezstratna: dla wszystkich 59 dziś aktywnych wariantów, `price_min_cents` przed i po migracji jest identyczny. Weryfikuje **AC-4**.
- Ekstrakcja AI: materiał z jedną ceną i listą "w cenie: fundament, transport" zwraca `priceEur` plus dwie pozycje kosztowe ze statusem `w-cenie`, nigdy `scopeSummary`/`excludedScope`. Weryfikuje **AC-8**.
- Karta wyników bez opisu: wariant bez żadnej pozycji kosztowej ze statusem "w cenie" pokazuje dzisiejszy fallback, nie pustą linię ani błąd. Weryfikuje **AC-6**.
- Krok tłumaczeń: zapisanie kroku "Tłumaczenia" dla produktu z dwoma wariantami nie wywołuje już `updateVariantTranslation` i nie odwołuje się do `product_variant_translation`. Weryfikuje **AC-10**.
- Sprzątanie: żaden test ani strona nie odwołuje się do usuniętych pól/tabeli/akcji. Weryfikuje **AC-12**.
- Podwyżka ceny w oknie migracji: po fazie 0 (CHECK usunięty, wyzwalacz przepisany) i przed fazą 2 (kolumny jeszcze fizycznie istnieją), producent podnosi cenę wariantu z realnym zakresem (np. `price_min_cents` z 200000 na 350000, `price_max_cents` wciąż 300000 w bazie) bez błędu zapisu. Weryfikuje **AC-2**.
- Dane strukturalne i porównanie ulubionych: strona szczegółów projektu emituje `Offer.price` zamiast `AggregateOffer.lowPrice`/`highPrice`; `FavoriteCompareTable` pokazuje "od X", nigdy "X–Y". Weryfikuje **AC-13**.

## Build plan

1. Migracja, faza 1 (mała, bezpieczna, w pełni odwracalna, idzie pierwsza): usunięcie CHECK `product_variant_price_order`, przepisanie CHECK `product_variant_price_on_request`, przepisanie funkcji `price_sync_trigger` (`CREATE OR REPLACE`, bez `DROP TRIGGER`) żeby przestała czytać/pisać `price_max_cents`. Zweryfikowana na tymczasowej gałęzi Neon. satisfies **AC-2, AC-3**
2. `extractStandardsFromMaterial` (`lib/producer-standards-extraction-actions.ts`): nowy kształt `ExtractedStandard` (`priceEur`, `costLineItems`), zaktualizowany prompt ekstrakcji (jedna cena, pozycje kosztowe, etykiety zawsze po polsku), nowy schemat Zod, testy. satisfies **AC-8**
3. `lib/producer-product-variant-actions.ts`: `createVariant`/`updateVariant`/`cloneVariant` na jedno pole ceny; usunięcie `updateVariantTranslation` i jego testu, w tym `lib/db/queries.ts#getProducerVariantsForEdit` i jego test, jeśli odwołują się do usuniętych pól. satisfies **AC-1, AC-9, AC-10**
4. `ProjectWizardVariantsStep.tsx`: usunięcie pola "cena max" z formularza, wpięcie proponowanych przez AI pozycji kosztowych do istniejącej, edytowalnej listy `costLineItems` (dopisywane, odfiltrowane od duplikatów po dokładnej etykiecie, nigdy nie zastępują ręcznie wpisanych). satisfies **AC-9**
5. `ProjectWizardTranslationsStep.tsx` i `lib/producer-project-translation-actions.ts`: usunięcie sekcji wariantów (`scopeSummary`/`excludedScope`) z kroku tłumaczeń. satisfies **AC-10**
6. `lib/data/types.ts`, `lib/data/projects.ts`, `lib/data/project-variants.ts`, `lib/data/fixtures/projects.ts`: `ProjectVariant`/`Project` tracą `priceMax`/`scopeSummary`/`excludedScope`; rozszerzenie wszystkich pięciu wywołań `resolveProductVariants` bez `withDetails` o same `label`/`status`/`sort_order` pozycji kosztowych; nowy czysty helper liczący do trzech etykiet ze statusem "w cenie", posortowanych po `sort_order`, dla AC-6. satisfies **AC-1, AC-6**
7. `ResultCard.tsx`, `ProjectCompareTable.tsx`, `FavoriteCompareTable.tsx`: renderowanie listy pozycji kosztowych z zadania 6 zamiast `scopeSummary`; `FavoriteCompareTable` na pojedynczą cenę zamiast `priceMin–priceMax €`. satisfies **AC-6, AC-13**
8. `ProjectCostComparisonTable.tsx`, `app/[locale]/(customer)/project/[id]/page.tsx`: usunięcie renderowania `scopeSummary`/`excludedScope`; zamiana danych strukturalnych JSON-LD z `AggregateOffer` (`lowPrice`/`highPrice`) na `Offer` z jednym `price`. satisfies **AC-7, AC-13**
9. Testy: aktualizacja wszystkich istniejących testów odwołujących się do usuniętych pól/tabeli/akcji: `ProjectWizardVariantsStep.test.tsx`, `ProjectWizardTranslationsStep.test.tsx`, `ProductEditWizard.test.tsx`, `ProjectWizard.test.tsx`, `lib/producer-product-variant-actions.test.ts`, `lib/producer-project-translation-actions.test.ts`, `lib/data/projects.test.ts`, `lib/data/project-variants.test.ts`, `lib/db/schema.test.ts` (testy usuniętego CHECK i przepisanego wyzwalacza), `lib/db/queries.test.ts`, `components/klient/ResultCard.test.tsx`, `components/klient/ProjectCostComparisonTable.test.tsx`, `test/fixtures/project.ts`, `messages/{pl,en,de,nl}.json` (usunięcie klucza etykiety `scopeSummary`, dodanie klucza "+N więcej" dla AC-6), `scripts/import-domihaus-catalog.ts`, jeśli zapisuje którekolwiek z usuwanych pól. Playwright regresja na kreatorze wariantów i karcie wyników. satisfies **AC-11, AC-12**
10. Migracja, faza 3 (destrukcyjna, na końcu, dopiero po pełnym wdrożeniu zadań 2 do 9 na produkcji): usunięcie `price_max_cents` (`product_variant`, `product`), `scope_summary`/`excluded_scope` (`product_variant`), całej tabeli `product_variant_translation`. Zweryfikowana najpierw na tymczasowej gałęzi Neon z zapytaniem potwierdzającym niezmienione `price_min_cents` na wszystkich 59 wariantach. satisfies **AC-1, AC-4, AC-5**

## Consequences

**Pozytywne**:
- Model danych odpowiada dokładnie temu, o co zamawiający wielokrotnie prosił: jedna cena "od" per standard, bez drugiego pola bez pokrycia w rzeczywistym użyciu (27 z 59 wariantów miało je i tak równe pierwszemu).
- Koniec z dwoma równoległymi opisami tego, co wchodzi w cenę standardu (proza kontra tabela pozycji kosztowych): zostaje jedna, czytelna tabela.
- Usunięcie martwej tabeli `product_variant_translation` i jej jedynej ścieżki zapisu upraszcza krok tłumaczeń w obu kreatorach.
- Ekstrakcja AI trafia teraz do tego samego modelu, którego producent i tak używa ręcznie, zamiast do równoległego, jednorazowego pola prozy.

**Negatywne / kompromisy**:
- 28 z 59 żywych wariantów widocznie traci dziś pokazywaną górną granicę zakresu; klient widzący dziś "X do Y" zobaczy po migracji tylko "od X".
- Ekstrakcja AI musi teraz zwracać strukturalne pozycje kosztowe ze statusem per pozycja, trudniejsze zadanie dla modelu niż jedno zdanie streszczenia; błędnie dobrany status jest bardziej widoczny niż niedoprecyzowane zdanie prozy.
- 8 wariantów traci dziś wypełniony `scopeSummary` bez automatycznego zastępstwa, dopóki producent nie doda własnych pozycji kosztowych; do tego czasu `ResultCard` pokazuje dla nich sam fallback zamiast dotychczasowego opisu.
- Migracja usuwa kolumny i całą tabelę nieodwracalnie przez sam rewert kodu; wycofanie po zastosowaniu wymaga przywrócenia z backupu (Point in Time Recovery Neon), nie samego cofnięcia commitu.
- `ResultCard`/`ProjectCompareTable` (AC-6) zaczynają ładować pozycje kosztowe na wszystkich pięciu "lekkich" ścieżkach odczytu (dziś tego nie robią), więc lista wyników i strona główna dostają dodatkowe złączenie do `cost_line_item`; małe (limit trzech etykiet, bez `responsible_party`), ale realne, do obserwacji przy dużym katalogu.

**Neutralne**:
- Nazwy pól zostają minimalne (`price_min_cents`/`priceMin`, bez zmiany na `price`/`price_cents`), więc filtr i sortowanie wyników (`lib/results-filters.ts`) nie wymagają żadnej zmiany.
- Tłumaczenia etykiet pozycji kosztowych nadal idą przez już istniejący, niezależny słownik `cost_line_item_label_translation` (spoza tej decyzji); nowo proponowane przez AI etykiety nie mają automatycznego tłumaczenia, dopóki nie trafią do tego słownika, dokładnie tak samo jak dziś przy etykietach wpisanych ręcznie.

## Follow-up

- [ ] `docs/specs/0050-uproszczone-dodawanie-projektu-domu/index.md`: zaktualizować AC-13, AC-24, AC-28, AC-36 i szkic modelu danych zgodnie z tą decyzją (ta specyfikacja zastępuje ten wąski wycinek); wykonane razem z tą specyfikacją.
- [ ] `docs/specs/0041-model-danych-karty-projektu/index.md`: adnotacja przy parze `price_min_cents`/`price_max_cents` per wariant, że ta część decyzji jest zastąpiona przez 0051; wykonane razem z tą specyfikacją.
- [ ] Przy najbliższym `/sync`: `lib/db/AGENTS.md`, usunąć wzmiankę o `product.price_max_cents` (kolumna nie istnieje już).
- [ ] Obserwować, czy AI regularnie proponuje etykiety pozycji kosztowych, których nie ma jeszcze w `cost_line_item_label_translation`; jeśli tak, rozważyć dopisanie ich przy okazji następnego backfillu tłumaczeń.
- [ ] Wpisać tę poprawkę do `docs/scope/produkcja.md`, funkcja 40 (ten sam wiersz co spec 0050, bo dotyczy dokładnie tego samego, wciąż budowanego kreatora), przy najbliższym `/scope`.

## Migration plan

**Strategia**: trzyetapowa (nie dwuetapowa jak spec 0041/0050, `lib/db/AGENTS.md`): mały bezpieczny krok bazy najpierw, potem kod, potem migracja destrukcyjna. Trzeci krok jest konieczny, bo tu, inaczej niż w 0041/0050, sam stary CHECK (nie tylko stare kolumny) blokowałby normalną pracę producenta w oknie między wdrożeniem kodu a usunięciem kolumn (patrz AC-2, Krytyczne scenariusze testowe).

**Fazy**:
1. Migracja, faza 1 (Build plan zadanie 1): usunięcie CHECK `product_variant_price_order`, przepisanie CHECK `product_variant_price_on_request`, przepisanie funkcji `price_sync_trigger`. Mała, addytywna w skutkach (nic nie usuwa danych), zweryfikowana na tymczasowej gałęzi Neon.
2. Wdrożenie kodu (Build plan zadania 2 do 9): aplikacja przestaje czytać i pisać `price_max_cents`, `scope_summary`, `excluded_scope`, `product_variant_translation`. Kolumny i tabela nadal fizycznie istnieją w bazie (puste dla aplikacji, ale obecne), więc nic więcej nie jest jeszcze usunięte.
3. Migracja destrukcyjna (Build plan zadanie 10, na końcu, dopiero po potwierdzeniu fazy 2 na produkcji): usunięcie `price_max_cents` (obie tabele), `scope_summary`/`excluded_scope`, całej tabeli `product_variant_translation`, zweryfikowane najpierw na tymczasowej gałęzi Neon z zapytaniem potwierdzającym niezmienione `price_min_cents`.

**Wycofanie**: fazy 1 i 2 w pełni odwracalne (CHECK/funkcję można przywrócić, rewert kodu jest bezpieczny, kolumny i tabela nietknięte). Faza 3 nieodwracalna przez sam rewert kodu (DROP COLUMN, DROP TABLE); jedyne wycofanie po jej uruchomieniu to Point in Time Recovery Neon.

**Ryzyka**: uruchomienie fazy 3 zanim faza 2 jest w pełni wdrożona na produkcji (ten sam wzorzec ryzyka co spec 0050 zadanie 11), stąd wymóg zapytania weryfikującego i gałęzi Neon jako warunku wstępnego DROP. Uruchomienie fazy 2 (kod) przed fazą 1 (CHECK/wyzwalacz) zablokowałoby podwyżki ceny na 28 wariantach z realnym zakresem (patrz AC-2); kolejność faz w tym planie jest twarda, nie sugerowana.
