# 0051. Rationale: cena od zamiast zakresu wariantu

## Context

> ⚠️ Uwaga wstępna: usunięcie `scopeSummary` razem z `excludedScope` idzie dalej niż wskazywała pierwotna obserwacja. `excludedScope` faktycznie dubluje tabelę pozycji kosztowych wszędzie tam, gdzie się dziś pokazuje (`ProjectCostComparisonTable`, strona projektu), bo obie żyją w tym samym miejscu obok siebie. `scopeSummary` nie miało tej wady: to jedyny opis na `ResultCard`/`ProjectCompareTable`, dwóch kartach, które nie pokazują tabeli pozycji kosztowych wcale. Zamawiający świadomie zaakceptował to szersze cięcie, pod warunkiem że w miejscu `scopeSummary` na tych dwóch kartach pojawi się coś obliczonego z pozycji kosztowych (do trzech etykiet ze statusem "w cenie"), a nie pusty ekran bez zamiennika.

Spec 0041 celowo dał każdemu nazwanemu standardowi wykonania (`product_variant`) własną, pełną parę `price_min_cents`/`price_max_cents`, żeby cena nigdy nie mogła być pokazana obok zakresu innego standardu. To był słuszny problem do rozwiązania (dwie różne oferty tego samego domu mieszające się w jedną cenę), ale rozwiązaniem stała się para cena minimalna/maksymalna na poziomie samego standardu, nie tylko separacja standardów od siebie.

Zamawiający wielokrotnie, w kilku wcześniejszych rozmowach (nieudokumentowanych do tej pory w pamięci ani w specyfikacji), prosił o przejście na model "cena od": jedna liczba per standard, nie przedział. Test ręczny kreatora `ProjectWizardVariantsStep` (ekran rozpoznawania standardu z materiału producenta) ujawnił, że ten postulat nigdy nie został zrealizowany: formularz i tak dalej pokazuje dwa pola ceny, a ekstrakcja AI (spec 0050) wypełnia oba tą samą liczbą, gdy źródło podaje tylko jedną cenę, co jest dokładnie tym zachowaniem, na które zamawiający zwrócił uwagę.

Sprawdzenie żywej bazy (Neon, projekt `modularhub`) w trakcie tej rozmowy: z 59 aktywnych wariantów 28 ma dziś prawdziwie różne `price_min_cents`/`price_max_cents` (rzeczywisty zakres), 27 ma obie wartości równe (najczęściej właśnie efekt ekstrakcji AI albo ręcznego wpisania tej samej liczby dwa razy), żaden nie ma `price_on_request`. Tylko 8 wariantów ma niepusty `scope_summary`, tylko 1 ma niepusty `excluded_scope`. Te liczby pokazują, że pole ceny jest szeroko używane (prawie połowa wariantów ma faktyczny zakres), a oba pola opisowe są w praktyce prawie puste, mimo że są renderowane na kilku ekranach klienta.

Druga, niezależna obserwacja z tej samej rozmowy: `product_variant_translation`, osobna tabela dodana w spec 0045 wyłącznie po to, żeby przechowywać tłumaczenia `scope_summary`/`excluded_scope`, nie ma żadnego innego powodu istnienia. Usunięcie tych dwóch kolumn z `product_variant` czyni całą tę tabelę bezprzedmiotową, razem z akcją `updateVariantTranslation` i sekcją wariantów kroku "Tłumaczenia" w obu kreatorach (spec 0050 AC-28 do AC-33), które istnieją wyłącznie po to, żeby tę tabelę zapisywać.

Trzecia obserwacja: etykiety pozycji kosztowych (`cost_line_item.label`) mają już dziś własny, niezależny słownik tłumaczeń (`cost_line_item_label_translation`, dopasowanie po dokładnym tekście polskiej etykiety, zbudowany poza numerowanym spec na wyraźne polecenie zamawiającego, opisany w `docs/scope/produkcja.md` przy funkcji 38). Przekierowanie ekstrakcji AI na pozycje kosztowe zamiast prozy oznacza więc, że nowo proponowane etykiety automatycznie korzystają z tego samego mechanizmu tłumaczenia co etykiety wpisywane ręcznie, bez budowania niczego nowego.

## Options considered

### Opcja 1: Zmiana tylko w warstwie aplikacji

Kolumny `price_min_cents`/`price_max_cents` zostają w bazie bez zmian; aplikacja przestaje pokazywać pole "cena max" w formularzu i zawsze zapisuje tę samą wartość w oba pola. `scope_summary`/`excluded_scope` zostają, ekstrakcja po prostu przestaje je wypełniać.

**Pros**:
- Zero migracji, zero ryzyka dla żywych danych, wdrożenie w jednym PR.

**Cons**:
- Zostawia martwą kolumnę i martwą tabelę (`product_variant_translation`) na stałe, dokładnie ten rodzaj ukrytego długu, który doprowadził do dzisiejszego pytania "czemu dalej pobieramy cenę maksymalną".
- Przyszły kod (albo przyszła sesja AI) czytająca `price_max_cents`/`scope_summary` wprost z bazy (na przykład ręczny skrypt przez Neon MCP) nie ma żadnego sygnału, że te pola są martwe.

### Opcja 2: Zachować zakres, ale uczynić go opcjonalnym

`price_max_cents` zostaje jako opcjonalne pole "do X" obok wymaganego "od X"; producent może, ale nie musi go wypełnić. `scope_summary`/`excluded_scope` zostają bez zmian.

**Pros**:
- Nie traci możliwości pokazania prawdziwego zakresu tam, gdzie producent rzeczywiście go zna (dziś 28 z 59 wariantów).

**Cons**:
- Nie odpowiada na właściwe pytanie zamawiającego: intencja "cena od" to jedna liczba, nie zakres z opcjonalnym drugim końcem. Zostawia dokładnie ten sam model, tylko z łagodniejszą walidacją.
- Nie rozwiązuje żadnego z dwóch pozostałych problemów (`excludedScope` dublujący tabelę pozycji kosztowych, martwa tabela tłumaczeń).

### Opcja 3: Pełna zmiana modelu (wybrana)

`product_variant`/`product` tracą `price_max_cents`; `product_variant` traci `scope_summary`/`excluded_scope`; `product_variant_translation` znika w całości; ekstrakcja AI (`extractStandardsFromMaterial`) proponuje teraz pozycje kosztowe zamiast prozy zakresu.

**Pros**:
- Model danych odpowiada dokładnie temu, co zamawiający opisuje jako "cena od", bez ukrytego drugiego pola.
- Usuwa realną duplikację (opis zakresu obok tabeli, która mówi to samo, tylko czytelniej) zamiast ją maskować.
- Usuwa martwą tabelę i jej ścieżkę zapisu zamiast zostawiać ją jako dług.

**Cons**:
- Migracja nieodwracalna przez sam rewert kodu (DROP COLUMN, DROP TABLE); wymaga sekwencji kod najpierw, potem migracja, tym samym wzorcem co 0041/0050.
- 28 z 59 żywych wariantów widocznie traci dziś pokazywaną górną granicę zakresu.
- Ekstrakcja AI musi teraz zwracać strukturalne pozycje kosztowe ze statusem zamiast jednego zdania prozy, trudniejsze zadanie dla modelu niż streszczenie tekstu.

## Rationale

Opcja 3 została wybrana, bo opcje 1 i 2 obie zostawiają dokładnie ten rodzaj cichego długu, który doprowadził do dzisiejszej rozmowy: pole w bazie, które nic już nie znaczy, ale nikt nie może być tego pewien bez czytania kodu aplikacji. `lib/db/AGENTS.md` już dziś dokumentuje jeden precedens tej zasady (`price_min_cents`/`price_max_cents` na `product` są pochodną wyzwalacza, nigdy wpisywane wprost), więc utrzymanie kolejnego, cichszego wyjątku (kolumna fizycznie istnieje, ale aplikacja ją ignoruje) byłoby niespójne z tym, jak ten projekt już zarządza podobnym ryzykiem gdzie indziej.

Nazewnictwo pól zostaje minimalne: `price_min_cents`/`priceMin` zostają dokładnie tymi nazwami (nie przechodzą na `price_cents`/`price`), bo już dziś czytają się poprawnie jako "cena od" nawet bez towarzyszącego `priceMax`, a `lib/results-filters.ts#sortResults` już dziś sortuje po pojedynczej wartości `project.priceMin`, nie po parze. Zmiana samej nazwy nie dodałaby żadnej jasności, tylko rozszerzyłaby migrację i diff bez potrzeby.

Migracja istniejących 59 wariantów bierze `price_min_cents` bez zmian (był już dolną granicą), po prostu przestaje istnieć `price_max_cents`: żaden z 59 wariantów nie traci swojej dzisiaj pokazywanej ceny "od", zgodnie z tym samym wzorcem bezstratnej migracji co spec 0041 AC-7 (88 produktów zachowuje identyczną cenę po migracji).
