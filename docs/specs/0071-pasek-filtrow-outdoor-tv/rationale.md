# 0071. Pasek filtrów dla rodziny Outdoor TV: uzasadnienie

Specyfikacja do budowy: [index.md](index.md).

## Context

Strona wyników `/results` ma jeden pasek (`ResultsFilterBar`) dla wszystkich rodzin: Kraj, Metraż od, Metraż do, Sortuj i Słowo kluczowe. Został zaprojektowany dla domów. Spa modułowe i kontenery używają go przez pewien czas bez bólu, bo mają metraż. Outdoor TV (telewizory i szafy z windą MirageVision, spec 0056) go nie ma.

Sprawdzone na dev 2026-10-13 dla `family=outdoor-tv`:
- Metraż nic nie robi: `sizeMin=60` dalej zwraca wszystkie produkty, bo telewizory nie mają `floor_area_m2`.
- Kraj szkodzi: `country=PL` i `country=DE` zostawiają tylko 2 z 7 produktów, bo reszta nie ma wierszy `product_country_eligibility`. Klient sądzi, że produktów nie ma.
- Sortuj ma opcje metrażu i ceny. Cena jest prawie wszędzie "na zapytanie", więc sortowanie nic nie daje.
- Nagłówek mówi "7 szafek TV ogrodowych", a w katalogu są telewizory (serie Silver, Gold, Platinum) i szafy z windą (Premium, Custom, Econo).

Katalog ma kilkanaście produktów, więc klient nie potrzebuje sortowania. Potrzebuje dwóch odpowiedzi: jak produkt kończy w jego miejscu (na ścianie czy w szafie) i czy będzie w cieniu, częściowym słońcu czy pełnym słońcu. Przy sprawdzaniu danych wyszło też, że produkt Platinum był w bazie dwa razy (starszy z 2026-09-30 z cenami i nowszy z importu). Duplikat usunięto przed tą specyfikacją, więc nie wpływa na decyzję.

Decyzje podjęte przez zlecającego przed spisaniem: bez filtra kraju (na razie tylko Europa, dostawa dojdzie później), bez filtra i sortowania po cenie (ceny odłożone), filtry "sposób montażu" i "przeznaczenie", słowo kluczowe zostaje, nagłówek do poprawy, chipy wielokrotnego wyboru, szafy bez przeznaczenia ukryte przez filtr, brak listy sortowania i stała kolejność, bez chipa przekątnej.

## Options considered

### Skąd filtry biorą wartości

**Opcja 1: dwie kolumny tekstowe z CHECK na `product`.** Nullable `outdoor_tv_mounting` i `outdoor_tv_sun_exposure`, dozwolone wartości w CHECK, ograniczenie, że wypełnia je tylko rodzina `outdoor-tv`. To ten sam wzorzec co `spa_subcategory` i `container_subcategory`, tylko z tekstem zamiast enuma.

**Pros**:
- Szybkie, proste zapytanie (`inArray` na kolumnie), bez rzutowania jsonb.
- Walidacja w bazie, więc ręczny wpis przez Neon MCP nie wprowadzi złej wartości.
- Zgodne z konwencją repozytorium dla filtrów rodzinowych.

**Cons**:
- Szersza tabela `product`, kolumny używane przez jedną rodzinę.
- Wymaga migracji na dev i prod oraz uzupełnienia istniejących produktów.

**Opcja 2: ukryte klucze w `technicalSpecs`.** Klucze z `_` w jsonb (jak `_priceOnRequest` i `_extraImageUrls`), czytane przez `technicalSpecs->>'_mounting'`.

**Pros**:
- Bez migracji, od razu działa.
- Pasuje do dzisiejszego, nieprzetypowanego jsonb tej rodziny.

**Cons**:
- Bez walidacji w bazie (literówka w imporcie ukrywa produkt przed filtrem).
- Indeks lub rzutowanie po jsonb, czytelność gorsza niż kolumna.
- Zaśmieca jsonb, który jest też źródłem tabeli specyfikacji na stronie produktu.

**Opcja 3: pełny schemat Zod dla `technicalSpecs` rodziny `outdoor-tv`.** To follow up spec 0056 (AC-7): ustalić prawdziwy kształt danych i walidować nim zapis, filtry czytają pola z jsonb.

**Pros**:
- Najbardziej poprawne długoterminowo, jedno miejsce prawdy o kształcie danych.

**Cons**:
- Dużo większe: dotyka kreatora producenta (który tę rodzinę świadomie pomija) i walidacji całej rodziny.
- Spec 0056 czeka na potwierdzenie, które SKU są w zakresie, więc kształt danych nie jest jeszcze ustalony.

### Gdzie żyje pasek

**Opcja A (wybrana): podmiana paska na stronie wyników dla `family=outdoor-tv`.** Własny komponent z chipami, reszta strony bez zmian.

**Pros**:
- Mały zakres, wykorzystuje istniejący wzorzec chipów z linków.
- Adresy `/results?family=outdoor-tv` (hero, `FamilyTabs`) dalej działają.

**Cons**:
- Strona wyników rozgałęzia się po rodzinie.

**Opcja B: osobna strona `/outdoor-tv` z własnym paskiem** (jak `/sauna`, spec 0068).

**Pros**:
- Czysty podział, własne SEO i nagłówek.

**Cons**:
- Znacznie więcej pracy (strona, trasa, linki z hero i `FamilyTabs`) dla katalogu o kilkunastu produktach.
- Dwa miejsca z listą Outdoor TV, dopóki stare linki nie zostaną przekierowane.

## Rationale

Opcja 1, bo filtr po sposobie montażu i przeznaczeniu jest dokładnie tym, czym `spa_subcategory` jest dla spa: małym, zamkniętym zbiorem wartości, po którym klient zawęża listę. Repozytorium już tak robi, a walidacja w bazie ma tu realną wartość, bo produkty tej rodziny wstawia się ręcznie (Neon MCP i skrypty), mijając walidację aplikacji (to uzasadnienie stoi w komentarzu nad `product_family_subcategory_match`). Opcja 2 jest tańsza dziś, ale miesza dane filtra z danymi do wyświetlenia i nie chroni przed literówką, a skutek (produkt znika z filtra) jest cichy. Opcja 3 jest właściwa kiedyś, ale zależy od niepotwierdzonego zakresu SKU i nie jest potrzebna, żeby filtry działały.

Tekst z CHECK zamiast enuma Postgresa, bo enum jest nieodwracalny (zasada już użyta przy `floor_level`). Wartości celowo są małym, zamkniętym zbiorem: dodanie nowej (np. wolnostojący) to zmiana jednego CHECK, nie przebudowa.

Opcja A, bo problem to dwa złe pola i zły nagłówek na jednej liście, a nie brak osobnej kategorii. Strona `/outdoor-tv` rozwiązałaby ten sam problem kosztem trasy, linków z hero i przekierowań, a przy kilkunastu produktach nic by nie dodała. Gdy katalog urośnie (akcesoria, więcej serii), osobna strona jest naturalnym następnym krokiem i ten spec jej nie blokuje (kolumny i `lib/outdoor-tv-filters.ts` przeniosą się bez zmian).

Wielokrotny wybór (LUB w grupie, ORAZ między grupami) wybrał zlecający. Kosztuje adres z powtórzonym kluczem i więcej testów parsowania, ale pozwala klientowi, który jeszcze nie wie, czy potrzebuje pełnego słońca czy częściowego, zobaczyć obie serie naraz. Szafy bez przeznaczenia ukrywane przez filtr "przeznaczenie" to uczciwe uproszczenie: szafa nie jest "przeciwsłoneczna", a udawanie, że pasuje do każdego przeznaczenia, wymagałoby osobnej reguły i wprowadzałoby w błąd.

Stała kolejność zamiast sortowania, bo bez ceny i metrażu nie ma nad czym sortować, a kolejność od cienia do pełnego słońca odpowiada rosnącej jasności serii, czyli temu, jak klient myśli o wyborze. Gdy wrócą ceny, sortowanie dostanie osobny spec.
