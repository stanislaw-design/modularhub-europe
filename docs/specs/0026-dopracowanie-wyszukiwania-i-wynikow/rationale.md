# 0026. Dopracowanie wyszukiwania i wyników — uzasadnienie

## Context

Ten spec realizuje funkcję 8 epiki Produkcja (`docs/scope/produkcja.md`), która wprost mówi: „więcej kryteriów, sortowanie, ewentualnie wyszukiwanie tekstowe — konkretny zakres do ustalenia w spec." Spec 0023 (klient na realnym zapleczu), który podłączył `/wyniki` do prawdziwej bazy i dodał filtr rodziny produktu, w swoim Follow-up wprost nazwał tę funkcję jako kolejny krok i zauważył, że filtr rodziny już częściowo zawęża jej zakres.

Zanim padła ta decyzja, zbadano dokładnie dzisiejszy stan kodu (agent eksploracyjny, cała ścieżka `/wyniki`):

- **Filtr rodziny produktu (`FamilyTabs`) jest już w pełni zbudowany i podłączony do bazy** (spec 0023), nie placeholder — nie wymaga ponownej decyzji.
- **`CategoryFilterBar` jest w całości dekoracyjny**: 12 chipów, wszystkie przyciski `disabled`, komentarz w kodzie wprost mówi „no filter data model backs these yet… wiring real filtering is a future decision."
- **Zero sortowania w UI** — tylko sztywne `sortResults()`: `featured`, potem cena rosnąco.
- **Zero wyszukiwania pełnotekstowego i zero indeksów** na jakiejkolwiek filtrowanej kolumnie (`family`, `floor_area_m2`, cena) — filtrowanie kraju i metrażu odbywa się częścią w SQL, częścią w pamięci JavaScript po stronie serwera.
- Osiem pól technicznych domu w `technicalSpecs` jest **wolnym tekstem** (`z.string()`) w `lib/product-technical-specs.ts`, nie zamkniętą listą — jedyny wyjątek to `spa-modulowe.heatingType` i `pergola.roofType`, już enumy.
- `EmptyResults.tsx` ma treść specyficzną dla domu („domów"), nieświadomą rodziny produktu — drobna, ale realna niespójność wobec już wprowadzonej (niescalonej jeszcze) poprawki `ResultsHeader.tsx` w tym samym duchu.

## Options considered

### Option 1: Enum + realne filtry + wyszukiwanie pełnotekstowe (wybrane)

Zamienia trzy pola techniczne domu z wolnego tekstu na zamknięte listy, podłącza `CategoryFilterBar` i podkategorie do prawdziwych danych, dodaje cenę i sortowanie, oraz kolumnę `search_vector` z indeksem GIN do wyszukiwania.

**Pros**:
- Wszystkie trzy obszary wymienione w wierszu zakresu (`docs/scope/produkcja.md`, funkcja 8) trafiają do jednej spójnej decyzji zamiast trzech osobnych przyszłych speców.
- Filtry są wiarygodne: każdy chip faktycznie odpowiada zamkniętej, sprawdzalnej wartości w bazie, nie zgadywaniu po wolnym tekście.
- Wyszukiwanie pełnotekstowe z indeksem GIN skaluje się razem z katalogiem, zamiast wymagać kolejnej migracji, gdy katalog urośnie.

**Cons**:
- Wymaga jednorazowego, ręcznego przepisania istniejących produktów (Budman House, Cocomodule) na nowe wartości enum, zanim filtry atrybutów zaczną działać poprawnie dla tych produktów.
- Największy zakres pracy z trzech opcji: migracja schematu, zmiana Zod, zmiana formularza kreatora producenta, plus cała warstwa UI.

### Option 2: Tylko pola już ustrukturyzowane, bez zmiany technicalSpecs

Filtry atrybutów ograniczone do pól, które już są liczbami/enumami dziś (`storeys`, `spaSubcategory`, `pergolaSubcategory`); `heatSource`/`ventilation`/`energyClass` zostają wolnym tekstem i nie stają się filtrami w tym specu.

**Pros**:
- Zero ryzyka migracji danych technicznych domu, zero ręcznego przepisywania istniejących produktów.
- Szybsze do zbudowania.

**Cons**:
- Tylko jeden z czterech planowanych chipów (Parterowy/Piętrowy) staje się realny; Pompa ciepła, Rekuperacja i Klasa A+ zostają dekoracyjne jeszcze jeden etap, mimo że to one budzą największe zainteresowanie na porównywalnych portalach nieruchomości.
- Odkłada tę samą decyzję o enumach na później, gdy katalog będzie większy i przepisywanie danych trudniejsze.

### Option 3: Wyszukiwanie przez `ILIKE` zamiast pełnotekstowego indeksu

Wyszukiwanie tekstowe realizowane prostym dopasowaniem podciągu (`ILIKE '%fraza%'`) na nazwie i opisie, bez nowej kolumny ani indeksu GIN.

**Pros**:
- Zero zmian w schemacie, najszybsze do wdrożenia.
- Wystarczające dla dzisiejszego małego katalogu.

**Cons**:
- Brak rankingu trafności (dopasowania nie są sortowane po jakości), brak odporności na odmianę wyrazów.
- Pełne skanowanie tabeli przy każdym wyszukiwaniu; wymaga kolejnej migracji, gdy katalog urośnie, zamiast zrobić to raz teraz.
- Silnie odrzucone w rozmowie projektowej na rzecz właściwej infrastruktury wyszukiwania.

## Rationale

Wybrano Opcję 1 (pełny zakres) zamiast Opcji 2 (tylko pola ustrukturyzowane), bo trzy z czterech chipów, które inżynier chciał zobaczyć jako realne (Pompa ciepła, Rekuperacja, Klasa A+), wymagają enumizacji pól technicznych — odkładanie tego do kolejnego speca oznaczałoby dwukrotne dotknięcie tego samego kreatora producenta i tej samej ścieżki backfillu, raz teraz (zakres węższy) i raz później (reszta pól). Katalog jest dziś mały (Budman House, Cocomodule), więc koszt ręcznego przepisania istniejących danych jest niski właśnie teraz — będzie tylko rósł wraz z katalogiem, co samo w sobie jest argumentem za działaniem teraz, nie później.

Wybrano tsvector z indeksem GIN (Opcja 1) zamiast `ILIKE` (Opcja 3) na wyraźne życzenie inżyniera w rozmowie projektowej, mimo mojej pierwotnej rekomendacji `ILIKE` jako prostszego rozwiązania adekwatnego do dzisiejszej skali katalogu. Inżynier świadomie wybrał właściwą infrastrukturę wyszukiwania zamiast tymczasowego rozwiązania, akceptując większy koszt migracji teraz w zamian za brak kolejnej migracji, gdy katalog urośnie — uzasadniony wybór, odnotowany jako świadomie przyjęty tradeoff, nie błąd w rozmowie.

Enumizacja `heatSource`/`ventilation`/`heatTransferCoefficients` (przemianowanego na `energyClass`) została zawężona do tych trzech pól, nie wszystkich ośmiu, bo tylko te trzy odpowiadają chipom, które inżynier chciał zobaczyć jako realne; pozostałe pięć (`wallBuildUp`, `insulation`, `windowClass`, `fireResistance`, `windResistance`) zostają opisowym tekstem wyświetlanym na stronie szczegółów projektu (spec 0020), bez zmiany — nie są dziś częścią żadnego planowanego filtra, więc enumizacja byłaby przedwczesną pracą bez odbiorcy.

## Design conversation trail

Poniższe decyzje zapadły w ustrukturyzowanej rozmowie projektowej (pytanie po pytaniu, z rekomendacją i wyborem inżyniera przy każdym):

1. **Zakres funkcji**: wszystkie cztery zaproponowane obszary wybrane (realne filtry atrybutów, sortowanie, filtr podkategorii, wyszukiwanie pełnotekstowe) — inżynier wybrał szerszy zakres niż tylko rekomendowane pozycje.
2. **Filtr ceny**: dodany do zakresu (rekomendacja przyjęta).
3. **Wyszukiwanie pełnotekstowe**: tsvector + GIN wybrane wprost wbrew mojej rekomendacji `ILIKE` (patrz Rationale wyżej).
4. **Fundament danych dla filtrów atrybutów**: enumizacja skupionego podzbioru pól wybrana (rekomendacja przyjęta) zamiast dopasowania po wolnym tekście albo ograniczenia do pól już ustrukturyzowanych.
5. **Które chipy stają się realne**: Parterowy/Piętrowy, Pompa ciepła, Rekuperacja, Klasa A+ (wszystkie cztery rekomendowane pozycje wybrane).
6. **Pozostałe sześć chipów bez pokrycia w danych**: usunięcie z paska wybrane (rekomendacja przyjęta) zamiast zachowania jako dalej dekoracyjnych.
7. **Klucze sortowania**: tylko cena i metraż (rosnąco/malejąco) wybrane; „najnowsze pierwsze" i „zachowaj dzisiejszy domyślny jako pozycję na liście" nie zostały wybrane z listy wielokrotnego wyboru.
8. **Domyślne sortowanie bez parametru**: zachowanie dzisiejszego zachowania (`featured`, potem cena) wybrane (rekomendacja przyjęta) w osobnym pytaniu doprecyzowującym po punkcie 7.
9. **UI filtra ceny**: zamknięty zestaw progów, ten sam wzorzec co metraż (rekomendacja przyjęta) zamiast dowolnego pola min/max.
10. **Filtr podkategorii teraz czy później**: zbudowany teraz mimo braku zasianych danych spa/pergola, ten sam precedens co `FamilyTabs` (rekomendacja przyjęta).
11. **Pole „Klasa A+" odwzorowuje**: `heatTransferCoefficients` (współczynnik przenikania ciepła całej bryły) wybrane zamiast `windowClass` (rekomendacja przyjęta).
12. **Enum źródła ciepła**: sześciowartościowa lista z rozbiciem pompy ciepła na dwa podtypy (powietrze-woda, grunt-woda) wybrana zamiast prostszej czterowartościowej (rekomendacja przyjęta).
13. **Enum wentylacji**: czterowartościowa lista z wyraźnym rozbiciem rekuperacji wybrana zamiast prostszego podziału naturalna/mechaniczna (rekomendacja przyjęta).
14. **Miejsce pola wyszukiwania**: wyłącznie `/wyniki`, nie strona startowa (rekomendacja przyjęta) — świadomie nie dotykamy `SearchCard`/hero drugi raz przed przyszłą funkcją 9 (domknięcie wizualne).
15. **Wielokrotny wybór w obrębie chipa**: pojedynczy wybór na atrybut (rekomendacja przyjęta) zamiast wielokrotnego wyboru z semantyką ORAZ/LUB.
16. **Zachowanie kliknięcia chipa**: natychmiastowe zastosowanie (rekomendacja przyjęta) zamiast panelu z osobnym zatwierdzeniem, mimo istniejącego (dekoracyjnego) przycisku „Filtry" sugerującego panel.
17. **Metoda przepisania istniejących danych**: ręczny przegląd przez Neon MCP (rekomendacja przyjęta) zamiast automatycznego dopasowania po słowach kluczowych.
18. **Dane niemożliwe do jednoznacznego dopasowania**: bezpieczna wartość domyślna listy (rekomendacja przyjęta) zamiast wykluczenia produktu z wyników do czasu poprawki.
19. **Poziom sekcji Referencje**: brak sekcji Referencje (rekomendacja przyjęta) — decyzja wewnętrzna, oparta na kodzie projektu, nie na zewnętrznych źródłach.

## Cross check

Spec przeszła niezależny przegląd (inny model, tryb tylko do odczytu) po pierwszym szkicu. Znalezione i naprawione bezpośrednio w spec:
- Chip „Pompa ciepła" był sprzeczny z regułą pojedynczego wyboru (dwa podtypy pompy ciepła pod jednym chipem) — naprawione przez skrót `heatSource=pompa-ciepla` rozwijany po stronie zapytania (AC-2).
- `energyClass` nie miał bezpiecznej wartości domyślnej dla backfillu — dodano `nieznana`.
- AC-6 obiecywało tolerancję na odmianę słów, której `plainto_tsquery` nie daje — poprawione na uczciwe dopasowanie prefiksowe (`to_tsquery` z `:*`).
- Semantyka filtra ceny (który dokładnie punkt porównywać, jednostki EUR kontra centy, produkty `priceOnRequest`) była niedopowiedziana — dopisana wprost.
- Backfill musi używać `jsonb_set` na trzech kluczach, nie nadpisania całego `technicalSpecs`, żeby nie stracić pól pomostowych `_priceOnRequest`/`_extraImageUrls`.
- Nowe indeksy B-drzewa same nie wystarczą: dodano indeks wyrażeniowy na kluczach jsonb faktycznie filtrowanych i przeniesienie filtrowania metrażu/ceny z JS do SQL, żeby indeksy były w ogóle używane.
- Nowa kolumna `search_vector` musi być zadeklarowana też w `lib/db/schema.ts`, nie tylko w ręcznej migracji SQL, inaczej kolejne `db:generate` próbowałoby ją usunąć.
- Dopisane ryzyko: `.strict()` Zod nie waliduje przy odczycie, tylko przy zapisie — backfill musi nastąpić zaraz po wdrożeniu schematu, zanim ktoś edytuje produkt ze starymi wartościami.

## References

Brak (poziom referencji: brak, wybrany w rozmowie projektowej — decyzja oparta w całości na dzisiejszym kodzie i konwencjach projektu, nie na zewnętrznych źródłach).
