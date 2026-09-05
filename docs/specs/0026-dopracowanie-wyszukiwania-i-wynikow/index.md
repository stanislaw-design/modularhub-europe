# 0026. Dopracowanie wyszukiwania i wyników

**Date**: 2026-09-04
**Status**: Accepted

## Summary

Ten spec rozszerza stronę `/pl/klient/wyniki`, która dziś filtruje tylko po kraju, metrażu i rodzinie produktu, o głębsze wyszukiwanie: filtry atrybutów technicznych (źródło ciepła, wentylacja, klasa energetyczna, liczba kondygnacji), filtr ceny, filtr podkategorii (spa, pergola), sortowanie i wyszukiwanie tekstowe. Dziś `CategoryFilterBar` jest w całości dekoracyjny (przyciski wyłączone), a strona nie ma żadnego sortowania poza sztywnym „polecane, potem cena". Wymaga to zmiany trzech pól technicznych domu z wolnego tekstu na zamknięte listy wartości, jednorazowego przepisania istniejących produktów na te wartości, i nowej kolumny do wyszukiwania pełnotekstowego.

## Requirements

**User stories**:
- Jako klient przeglądający wyniki, chcę zawęzić listę po źródle ciepła, wentylacji, klasie energetycznej i liczbie kondygnacji, żeby zobaczyć tylko domy spełniające moje wymagania techniczne.
- Jako klient, chcę zawęzić wyniki po przedziale cenowym, tak samo jak dziś po metrażu, żeby zmieścić się w budżecie.
- Jako klient przeglądający spa modułowe albo pergole, chcę zawęzić wyniki po podkategorii (np. sauna kontra jacuzzi), żeby szybciej trafić na właściwy produkt.
- Jako klient, chcę posortować wyniki po cenie albo metrażu, rosnąco lub malejąco, zamiast polegać wyłącznie na domyślnej kolejności.
- Jako klient, chcę wpisać słowo kluczowe i znaleźć pasujące produkty po nazwie lub opisie.
- Jako klient, który wpisze błędny albo nierozpoznany parametr filtra w adresie URL, chcę, żeby strona łagodnie zignorowała ten jeden filtr, tak jak dziś działa to dla kraju i metrażu, zamiast pokazać błąd.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Strona `/pl/klient/wyniki` przyjmuje nowe parametry URL: `heatSource`, `ventilation`, `energyClass`, `storeys`, `priceMin`, `priceMax`, `spaSubcategory`, `pergolaSubcategory`, `sort`, `q`, obok dzisiejszych `country`/`sizeMin`/`sizeMax`/`family`.
- **AC-2**: `heatSource`, `ventilation`, `energyClass`, `storeys` działają wyłącznie w obrębie rodziny „dom"; `spaSubcategory` wyłącznie dla „spa-modulowe"; `pergolaSubcategory` wyłącznie dla „pergola" (ta sama granica co dzisiejsze pole `category`, spec 0022). Każdy filtr atrybutu przyjmuje dokładnie jedną wartość parametru URL naraz (pojedynczy wybór). Wyjątek celowy: chip „Pompa ciepła" ustawia skróconą wartość `heatSource=pompa-ciepla` (nie pełną wartość enuma), którą zapytanie rozwija po stronie serwera do dopasowania `pompa-ciepla-powietrze-woda` LUB `pompa-ciepla-grunt-woda` — nadal jedna wartość w URL, nie wielokrotny wybór.
- **AC-3**: Nieprawidłowa albo nierozpoznana wartość dowolnego nowego parametru jest niezależnie ignorowana pole po polu (ten sam wzorzec co dziś dla `country`/`sizeMin`/`sizeMax`), nigdy błąd, nigdy pusta strona bez wyjaśnienia.
- **AC-4**: Filtr ceny działa jak filtr metrażu: zamknięty zestaw progów w EUR (te same jednostki co ceny widoczne na kartach), niezależne łagodne odrzucanie pola po polu, a odwrócony przedział (`priceMin > priceMax`) odrzuca oba pola. Filtr porównuje `priceMin` produktu (cenę „od", ten sam sposób co dziś na karcie), nie parę `priceMin`–`priceMax` produktu jako zakres; produkt z `priceOnRequest = true` nigdy nie pasuje do filtra ceny (cena nieznana, nie do porównania).
- **AC-5**: Parametr `sort` przyjmuje `price-asc`, `price-desc`, `size-asc`, `size-desc` i kontroluje kolejność wyników; brak parametru zachowuje dzisiejsze domyślne sortowanie (najpierw `featured`, potem cena rosnąco).
- **AC-6**: Parametr `q` dopasowuje nazwę lub opis produktu przez pełnotekstowe wyszukiwanie Postgresa (bez rozróżniania wielkości liter, każdy wpisany wyraz dopasowuje też jako prefiks, np. „dom" dopasuje „domek"); pusty albo składający się z samych spacji `q` działa jak brak filtra wyszukiwania.
- **AC-7**: `CategoryFilterBar` staje się prawdziwym, podłączonym paskiem filtrów dla czterech chipów opartych na danych (Parterowy/Piętrowy, Pompa ciepła, Rekuperacja, Klasa A+); kliknięcie chipa od razu aktualizuje URL i wyniki, bez osobnego kroku zatwierdzenia. Sześć chipów bez pokrycia w danych (Fotowoltaika, Tereny górskie, Nad wodą, Ogród, Garaż, Bez barier, Konstrukcja CLT) i przycisk „Filtry" znikają z paska.
- **AC-8**: Dla zakładek rodziny spa modułowe i pergola pojawia się rząd chipów podkategorii (spa: sauna/jacuzzi/wellness-combo; pergola: cztery typy), podłączony tym samym wzorcem co pozostałe filtry, mimo że te rodziny dziś zwracają puste wyniki (brak zasianych produktów).
- **AC-9**: Pole wyszukiwania tekstowego renderuje się w pasku filtrów `/wyniki` (nie na stronie startowej), aktualizując URL tym samym wzorcem nawigacji co `ResultsFilterBar`.
- **AC-10**: Wszystkie filtry (rodzina, podkategoria, kraj, metraż, cena, atrybuty, wyszukiwanie, sortowanie) łączą się logicznym ORAZ i mogą być stosowane jednocześnie bez błędu.
- **AC-11**: Treść pustego wyniku (`EmptyResults`) jest świadoma rodziny produktu (ten sam wzorzec `FAMILY_NOUN`, jaki `ResultsHeader` już wprowadził), więc pusty stan dla spa/pergola nie mówi „domów".
- **AC-12**: Istniejące opublikowane produkty domu (Budman House, Cocomodule) mają swoje wartości `heatSource`/`ventilation`/`energyClass` przepisane na nowe zamknięte listy przez ręczny przegląd (Neon MCP), aktualizując wyłącznie te trzy klucze wewnątrz `technicalSpecs` (`jsonb_set`, nigdy nadpisanie całego obiektu — patrz Key invariants o polach `_priceOnRequest`/`_extraImageUrls`); wartość, której nie da się jednoznacznie dopasować, dostaje bezpieczną wartość domyślną listy („inne" dla `heatSource`, „brak" dla `ventilation`, „nieznana" dla `energyClass`) zamiast blokować produkt. Po przepisaniu zapytanie weryfikacyjne potwierdza, że żaden opublikowany produkt domu nie ma wartości spoza nowych enumów.
- **AC-13**: W bazie istnieją nowe indeksy: `family`, `floor_area_m2`, `price_min_cents` (indeks B-drzewa) oraz indeks GIN na nowej kolumnie `search_vector`.
- **AC-14**: Strona nadal spełnia WCAG 2.2 AA: chipy są prawdziwymi, klawiaturowo obsługiwanymi elementami (nie wyłączonymi przyciskami), z widocznym `.focus-ring`; pozostaje dokładnie jeden prawdziwy `<h1>`.

## Decision

**Chosen option**: Option 1, enum plus realne filtry plus wyszukiwanie pełnotekstowe.

`CategoryFilterBar` i podkategorie stają się prawdziwymi filtrami opartymi o zamknięte listy wartości, dochodzi filtr ceny i sortowanie, a wyszukiwanie tekstowe korzysta z kolumny `search_vector` z indeksem GIN, zgodnie z decyzją podjętą w rozmowie projektowej (Postgres tsvector, nie `ILIKE`).

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`)

## Rationale

Pełne uzasadnienie i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch** (zmiany na istniejącej tabeli `product`, `lib/db/schema.ts`; żadnych nowych encji):
- `technicalSpecs` (jsonb, kształt „dom" w `lib/product-technical-specs.ts`), trzy pola zmienione z `z.string()` na zamknięte enumy:
  - `heatSource`: `pompa-ciepla-powietrze-woda | pompa-ciepla-grunt-woda | gazowe | elektryczne | biomasa-pellet | inne` (chip „Pompa ciepła" dopasowuje obie wartości pompy ciepła naraz, patrz AC-2)
  - `ventilation`: `grawitacyjna | mechaniczna-nawiewno-wywiewna | rekuperacja | brak`
  - `heatTransferCoefficients` przemianowane znaczeniowo na pasmo klasy energetycznej `energyClass`: `A+ | A | B | C | D | nieznana` (bezpieczna wartość domyślna dla backfillu, AC-12)
  - Zmiana na poziomie Zod/aplikacji, nie kolumny Postgresa, zgodnie z istniejącym wzorcem (`spa-modulowe.heatingType`, `pergola.roofType` już są enumami wewnątrz tego samego jsonb). `technicalSpecs` nie jest ponownie walidowane przy odczycie, tylko przy zapisie (`lib/db/AGENTS.md`) — istniejące produkty z wolnym tekstem nie zaczną nagle rzucać błędu, po prostu nie trafią w żaden filtr atrybutu do czasu backfillu (krok 2 Build plan).
- Nowa kolumna `product.search_vector` (`tsvector`, generowana kolumna Postgresa, `GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED` — `coalesce` obowiązkowy, `description` jest `nullable`), plus indeks GIN. Kolumna musi być zadeklarowana też w `lib/db/schema.ts` (nie tylko w ręcznej migracji SQL), żeby kolejne `db:generate` nie próbowało jej usunąć jako niewidocznej dla drizzle-kit; jeśli zainstalowana wersja `drizzle-orm` nie wspiera `.generatedAlwaysAs()` dla Postgresa, zadeklarować jako zwykłą kolumnę tylko do odczytu z komentarzem ostrzegającym przed automatycznym `db:generate` na tej tabeli.
- Nowe indeksy: złożony B-drzewa `(status, family)` (dziś każde zapytanie filtruje po obu), B-drzewa na `floor_area_m2` i `price_min_cents`, indeks wyrażeniowy (GIN albo B-drzewa na wyrażeniu) na kluczach jsonb faktycznie filtrowanych: `(technicalSpecs->>'heatSource')`, `(technicalSpecs->>'ventilation')`, `(technicalSpecs->>'heatTransferCoefficients')` — bez nich nowe filtry atrybutów skanowałyby całą tabelę mimo dodania enumów.
- Bez zmian w `spaSubcategory`/`pergolaSubcategory` (już enumy, tylko dochodzi filtr UI po istniejącym polu).
- Bez zmian w `storeys` (już liczba całkowita); Parterowy = `storeys = 1`, Piętrowy = `storeys >= 2`.

**API surface** (interfejs strony, brak osobnego endpointu, ten sam wzorzec co spec 0004):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → strona wyników | Nawigacja (chipy, pasek filtra, sortowanie, ręcznie wpisany URL) | `heatSource?`, `ventilation?`, `energyClass?`, `storeys?` (`parterowy`\|`pietrowy`), `priceMin?`, `priceMax?`, `spaSubcategory?`, `pergolaSubcategory?`, `sort?`, `q?`, plus istniejące `country?`/`sizeMin?`/`sizeMax?`/`family?` | Lista projektów po zastosowaniu wszystkich filtrów, w wybranej kolejności | Brak (strona publiczna) | Nieprawidłowe wartości łagodnie ignorowane pole po polu, nigdy błąd |
| `parseResultsSearchParams(searchParams)` (rozszerzone, `lib/results-filters.ts`) | Wywołanie w `page.tsx` (serwer) | surowe wartości `searchParams` | rozszerzony `ResultsFilter` (oczyszczony) | Nie dotyczy | Zwraca pola `undefined` zamiast rzucać wyjątek |
| `getProjects(filters)` (rozszerzone, `lib/data/projects.ts`) | Wywołanie funkcji dostępowej (serwer) | rozszerzony `ResultsFilter` (bez `sort` — sortowanie nie jest jej odpowiedzialnością) | `Project[]` po wszystkich filtrach zastosowanych w SQL (rozmiar i cena też przenoszą się do `WHERE`, nie zostają w JS jak dziś), nieposortowane | Nie dotyczy | Pusta tablica gdy nic nie pasuje |
| `sortResults(projects, sort)` (rozszerzone, `lib/results-filters.ts`, jedyne miejsce sortowania) | Wywołanie w `page.tsx`/`ResultsSelection`, zawsze po `getProjects()` | `Project[]`, opcjonalny `sort` | posortowana `Project[]` | Nie dotyczy | Brak/nierozpoznany `sort` → dzisiejsze domyślne sortowanie |
| `CategoryFilterBar` → URL wyników | Kliknięcie chipa (klient) | nowa wartość jednego atrybutu | aktualizacja URL, natychmiastowa nawigacja | Brak | Ponowne kliknięcie tego samego chipa czyści filtr (toggle) |
| Pole wyszukiwania w `ResultsFilterBar` → URL wyników | Wpisanie i zatwierdzenie (klient) | `q` (tekst) | aktualizacja URL, nawigacja | Brak | Puste/białe znaki → brak parametru `q` |

**Key invariants**:
- `heatSource`/`ventilation`/`energyClass`/`storeys`, jeśli obecne po parsowaniu, są zawsze jedną z zamkniętych wartości (albo skrótem `pompa-ciepla` dla `heatSource`, patrz AC-2) i stosowane tylko gdy `family = "dom"`.
- `spaSubcategory` stosowane tylko gdy `family = "spa-modulowe"`; `pergolaSubcategory` tylko gdy `family = "pergola"` (ta sama granica co pole `category`, spec 0022).
- `priceMin`/`priceMax`, jeśli oba obecne po parsowaniu, spełniają `priceMin <= priceMax`; oba z tego samego zamkniętego zestawu progów (EUR); porównywane z `priceMin` produktu, nie z jego przedziałem; produkt `priceOnRequest = true` nigdy nie pasuje, gdy filtr ceny jest obecny.
- `q`, po przycięciu białych znaków, jeśli pusty, jest traktowany jak brak filtra wyszukiwania; niepusty `q` dopasowuje przez prefiks każdego wpisanego słowa (`to_tsquery` budowane z sanitizowanych tokenów zakończonych `:*`), nie tylko całe słowa.
- Widoczność projektu = koniunkcja (ORAZ) wszystkich obecnych filtrów, wszystkie zastosowane w jednym zapytaniu SQL; brak danego parametru nigdy nie zawęża wyników po tym wymiarze.
- `sort` steruje wyłącznie kolejnością, nigdy widocznością, i jest stosowane zawsze po `getProjects()`, nigdy wewnątrz niej; brak/nierozpoznana wartość → domyślne sortowanie (dzisiejsze: `featured`, potem cena rosnąco).
- Backfill (AC-12) modyfikuje wyłącznie trzy klucze `heatSource`/`ventilation`/`heatTransferCoefficients` wewnątrz `technicalSpecs` przez `jsonb_set`, nigdy przez nadpisanie całego obiektu — inaczej nadpisałby pola pomostowe `_priceOnRequest`/`_extraImageUrls` (`lib/data/projects.ts`, `TechnicalSpecsBridgeFields`), które te same produkty (Budman House) już dziś niosą.

**Security model**: Strona publiczna, bez logowania, bez zmian względem spec 0004. Tekst wyszukiwania nie jest przechowywany trwale poza zapytaniem SQL (parametryzowanym przez Drizzle, bez ryzyka wstrzyknięcia SQL) i nie jest traktowany jako dana osobowa.

**Configuration required**: Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: `family=dom&heatSource=pompa-ciepla-powietrze-woda&priceMin=200000&priceMax=400000&sort=price-asc` zwraca tylko domy z pompą ciepła powietrze-woda w tym przedziale cenowym, posortowane rosnąco po cenie, sprawdza **AC-1**, **AC-2**, **AC-4**, **AC-5**, **AC-10**.
- Przypadek brzegowy: `heatSource=nieznana-wartosc` (spoza enuma) — filtr ignorowany, reszta filtrów nadal działa, sprawdza **AC-3**.
- Przypadek brzegowy: `priceMin=400000&priceMax=200000` (odwrócone) — oba odrzucone, brak filtra ceny, sprawdza **AC-4**.
- Wyszukiwanie: `q=Baltyk` dopasowuje produkt „Baltyk Studio 38" po nazwie, `q=%20%20` (same spacje) zwraca wszystkie wyniki bez filtra, sprawdza **AC-6**.
- Podkategoria bez danych: `family=spa-modulowe&spaSubcategory=sauna` pokazuje pusty stan świadomy rodziny („Brak spa modułowych…", nie „domów"), bez błędu, sprawdza **AC-8**, **AC-11**.
- Chipy: kliknięcie „Pompa ciepła" na `/wyniki` (bez wcześniejszych filtrów) od razu nawiguje do `?heatSource=...` i odświeża listę; ponowne kliknięcie czyści filtr, sprawdza **AC-7**.
- Auth/permission: brak autoryzacji, strona dostępna dla każdego odwiedzającego bez logowania, sprawdza **AC-1**.

## Build plan

Kolejność odzwierciedla podejście Tracer Bullet epiki Produkcja: najpierw fundament, na którym stoi wszystko inne (migracja schematu), potem jedno pełne przejście przez warstwy dla nowych filtrów (parsowanie → zapytanie → UI) zanim rozszerzy się na kolejne chipy, na końcu polerowanie.

1. [x] Migracja bazy: enum `heatSource`/`ventilation`/`energyClass` w `lib/product-technical-specs.ts` (Zod, z wartością `nieznana` dla `energyClass`), nowa kolumna generowana `search_vector` (`GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''))) STORED`, zadeklarowana też w `lib/db/schema.ts`) z indeksem GIN, złożony indeks B-drzewa `(status, family)`, B-drzewa na `floor_area_m2`/`price_min_cents`, indeks wyrażeniowy na `(technicalSpecs->>'heatSource')`/`(technicalSpecs->>'ventilation')`/`(technicalSpecs->>'heatTransferCoefficients')` (`drizzle/0008_cheerful_ben_urich.sql`, wygenerowana przez `db:generate` i ręcznie wzbogacona o klauzulę `GENERATED ALWAYS AS ... STORED`, zweryfikowana na jednorazowej gałęzi Neon przed zastosowaniem na głównej; ten sam wzorzec co `drizzle/0002_audit_log_trigger.sql` dla elementów spoza czystego DSL drizzle-kit), satisfies **AC-13**
2. [x] Ręczny przegląd i przepisanie istniejących opublikowanych produktów domu (Budman House, Cocomodule) na nowe wartości enum przez Neon MCP, wyłącznie przez `jsonb_set` na trzech kluczach (nigdy nadpisanie całego `technicalSpecs`, żeby nie stracić pól `_priceOnRequest`/`_extraImageUrls`); niejednoznaczne przypadki → bezpieczna wartość domyślna; zapytanie weryfikacyjne po przepisaniu potwierdza zero wartości spoza nowych enumów, satisfies **AC-12**. 24 wiersze domu przepisane: 18 bez oryginalnych danych źródła ciepła/wentylacji (katalog Budman House importowany bez tych pól, plus Cocomodule z klimatyzacją zamiast dedykowanej wentylacji) dostały wartości domyślne `inne`/`brak`/`nieznana`; pozostałe 6 (Baltyk, Karpaty, Modulor) zmapowane z opisowego tekstu producenta na konkretne wartości enum, klasa energetyczna odczytana z pola `windowClass`.
3. [x] Rozszerz `lib/results-filters.ts`: parsowanie i niezależne łagodne odrzucanie `heatSource`/`ventilation`/`energyClass`/`storeys`/`priceMin`/`priceMax`/`spaSubcategory`/`pergolaSubcategory`/`sort`/`q`, nowy `PRICE_THRESHOLDS` (EUR), `heatSource=pompa-ciepla` jako skrót obu podtypów, rozszerzony `sortResults()` jako jedyne miejsce sortowania, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**
4. [x] Rozszerz `getProjects()` w `lib/data/projects.ts`: przenieś filtrowanie metrażu (dziś w JS) do `WHERE` razem z nowymi filtrami atrybutów/podkategorii/ceny (cena porównywana z `priceMin` produktu w centach, produkty `priceOnRequest` wykluczone gdy filtr ceny obecny), dopasowanie `search_vector @@ to_tsquery('simple', <sanitizowane tokeny>:*)` dla wyszukiwania (prefiks, nie tylko całe słowo), funkcja przestaje sortować (przenosi się w całości do `sortResults()`), satisfies **AC-1**, **AC-4**, **AC-6**, **AC-10**. Zweryfikowane ręcznie (tymczasowy skrypt smoke test, usunięty) na realnym dev DB: skrót `pompa-ciepla` poprawnie rozwija się na oba podtypy, przedział cenowy, wyszukiwanie tekstowe z prefiksem, `q` z samych spacji zwraca wszystko, wykluczenie `priceOnRequest`.
5. [x] Zaktualizuj `lib/producer-project-draft.ts` i krok techniczny kreatora producenta (`components/producent/ProjectWizardTechnicalStep.tsx`), żeby pola `heatSource`/`ventilation`/`energyClass` były selektorami z zamkniętej listy, nie polami tekstowymi, spójnie z nowym schematem Zod. `energyClass` (`heatTransferCoefficients`) celowo bez opcji `nieznana` w kreatorze — to tylko wartość domyślna backfillu (AC-12).
6. [x] Przebuduj `CategoryFilterBar.tsx`: cztery chipy oparte na danych (Parterowy/Piętrowy, Pompa ciepła, Rekuperacja, Klasa A+) jako prawdziwe linki/przyciski aktualizujące URL od razu po kliknięciu (toggle), usunięcie sześciu chipów bez pokrycia w danych i przycisku „Filtry", satisfies **AC-7**. Nowe współdzielone `buildResultsHref`/`toggleFilterValue` w `lib/results-filters.ts` (jedno miejsce serializacji filtra do URL, reużyte też przez `SubcategoryFilterBar`/`EmptyResults`/`ResultsFilterBar`).
7. [x] Dodaj rząd chipów podkategorii dla `family=spa-modulowe` i `family=pergola`, ten sam wzorzec co krok 6, satisfies **AC-8**. Nowy `components/klient/SubcategoryFilterBar.tsx`; bez dedykowanych ikon per podkategoria (brak źródła projektowego), zwykłe pigułki tekstowe.
8. [x] Dodaj pole wyszukiwania tekstowego i rozwijane sortowanie do `ResultsFilterBar.tsx` (sortowanie jako `SearchSegment`/Headless UI Listbox, spójnie z resztą paska), satisfies **AC-5**, **AC-9**. `ResultsFilterBar` przyjmuje teraz cały `filter: ResultsFilter` (zamiast pojedynczych pól) i zachowuje nietknięte filtry atrybutów/podkategorii/ceny ustawione przez chipy przy kliknięciu „Szukaj".
9. [x] Zaktualizuj `EmptyResults.tsx`, żeby treść była świadoma rodziny produktu (reużycie wzorca `FAMILY_NOUN` z `ResultsHeader.tsx`), satisfies **AC-11**. Link „Wyczyść filtry" zachowuje aktywną rodzinę zamiast cichego powrotu do „dom".
10. [x] Przejście dostępności: chipy jako prawdziwe elementy interaktywne (nie `disabled`), kolejność fokusa, `.focus-ring`, weryfikacja WCAG 2.2 AA, satisfies **AC-14**. Poprawiony jeden przypadek koloru jako jedynego nośnika informacji (`CategoryFilterBar` aktywny chip miał tylko zmianę koloru tekstu — dodano `border-b-2`/`font-semibold`); zweryfikowane ręcznie w przeglądarce (Playwright), że `aria-current="true"` i klasy aktywnego stanu trafiają do DOM na obu paskach chipów.

## Consequences

**Positive**:
- Wszystkie trzy obszary z wiersza zakresu (więcej kryteriów, sortowanie, wyszukiwanie tekstowe) domknięte w jednej spójnej decyzji zamiast rozjeżdżających się przyszłych speców.
- Filtry atrybutów są teraz wiarygodne (zamknięta lista, sprawdzalna wartość), a nie dekoracją udającą funkcję.
- Nowe indeksy (rodzina, metraż, cena, wyszukiwanie) przygotowują stronę na większy katalog, zanim wzrost katalogu zrobi z braku indeksów prawdziwy problem wydajnościowy.
- Kreator producenta zaczyna zbierać `heatSource`/`ventilation`/`energyClass` jako wybór z listy, więc każdy kolejny produkt trafia do bazy już w poprawnym kształcie, bez przyszłego przepisywania.

**Negative / tradeoffs**:
- Jednorazowy ręczny koszt: ktoś musi przejrzeć i przepisać istniejące produkty domu na nowe wartości enum, zanim ich filtry atrybutów zaczną trafnie działać; do tego czasu te konkretne produkty mogą nie pojawiać się pod filtrem, którym rzeczywiście powinny odpowiadać.
- Konfiguracja wyszukiwania pełnotekstowego `simple` nie rozumie polskiej odmiany wyrazów (brak stemmingu) — wyszukiwanie „domek" nie dopasuje „domku"; akceptowalne przy dzisiejszym małym katalogu, ale prawdziwe ograniczenie.
- Podkategorie spa/pergola są w pełni podłączone, ale niewidoczne w praktyce, dopóki funkcja 7 nie zasieje produktów tych rodzin — kod gotowy wcześniej niż dane, ten sam wzorzec co `FamilyTabs` dziś.
- Sześć chipów bez pokrycia w danych znika z paska; jeśli te atrybuty (fotowoltaika, dostępność bez barier, itd.) okażą się ważne, wymagają osobnej, przyszłej decyzji o rozszerzeniu modelu danych.

**Neutral**:
- `heatTransferCoefficients` zmienia znaczenie z opisowego tekstu współczynnika U na pasmo klasy energetycznej; nazwa pola w kodzie zostaje dla ciągłości historii Zod/bazy, ale czytelnie odwzorowuje nowe znaczenie w komentarzu.
- Nowa kolumna `search_vector` jest generowana automatycznie przez Postgresa z `name`/`description`; nie wymaga ręcznego utrzymania przy każdej zmianie tych pól.

## Follow-up

- [ ] Sześć chipów bez pokrycia w danych (Fotowoltaika, Tereny górskie, Nad wodą, Ogród, Garaż, Bez barier) i „Konstrukcja CLT": jeśli mają wrócić, wymagają osobnej decyzji o rozszerzeniu modelu danych (nowe pola albo osobna tabela udogodnień), nie tylko UI.
- [ ] Wyszukiwanie pełnotekstowe używa konfiguracji `simple` (bez polskiego stemmingu); jeśli katalog urośnie i jakość dopasowań stanie się problemem, sprawdzić dostępność konfiguracji `polish` na Neon i rozważyć migrację.
- [ ] Rozważyć zdarzenie PostHog (`lib/observability/`, spec 0021) przy użyciu wyszukiwania i filtrów atrybutów, żeby było widać, których kryteriów klienci faktycznie szukają — nieobjęte tym specem, osobna decyzja obserwowalności.
- [ ] Zapisane wyszukiwania z alertami e mail (odłożone już w spec 0024 Follow-up i `docs/scope/produkcja.md` Deferred) zyskują dodatkową wartość teraz, gdy kryteriów wyszukiwania jest więcej; wciąż czeka na infrastrukturę e mail (funkcja 17).

## Migration plan

**Strategy**: feature-flagged w praktyce przez kolejność wdrożenia (schemat i kod działają ze starymi danymi zanim backfill je poprawi), nie prawdziwy feature flag.

**Phases**:
1. Wdróż migrację schematu (nowa kolumna `search_vector` z indeksem GIN, nowe indeksy B-drzewa) i nowy Zod z enumami — kod aplikacji akceptuje nowe wartości enum, ale istniejące produkty z wolnym tekstem po prostu nie trafiają w żaden filtr atrybutu, dopóki nie zostaną przepisane (nie błąd, zgodnie z AC-3).
2. Ręcznie przejrzyj i przepisz istniejące opublikowane produkty domu (Budman House, Cocomodule) na nowe wartości enum przez Neon MCP (AC-12).
3. Wdróż UI (chipy, podkategorie, wyszukiwanie, sortowanie), które korzysta z już poprawionych danych.
4. Zweryfikuj: każdy chip atrybutu zwraca oczekiwane produkty, wyszukiwanie trafia w nazwę/opis, sortowanie działa w obu kierunkach.

**Rollback**: Cofnięcie kodu (kroki 1 i 3) jednym rewertem commitów jest bezpieczne, bo `search_vector` i nowe indeksy są czysto addytywne, a stare wolnotekstowe wartości `technicalSpecs` nigdy nie są usuwane, tylko nadpisywane przy przepisaniu (krok 2) — cofnięcie kodu nie niszczy danych. Jeśli backfill (krok 2) wprowadzi błędną wartość, popraw ją ponownie przez Neon MCP; nie wymaga cofania migracji schematu.

**Risks**: Ręczne przepisywanie (krok 2) jest podatne na błąd ludzki przy większym katalogu niż dzisiejszy; przy wzroście katalogu warto rozważyć zautomatyzowane mapowanie ze wskazaniem niepewnych przypadków do ręcznej weryfikacji (odrzucona dziś jako Opcja w rozmowie projektowej, ale zyskuje na wartości wraz ze skalą). Dodatkowe ryzyko: nowy, ścisły schemat Zod (`.strict()`, wymaga wszystkich pól przy `status = "published"`) waliduje tylko przy zapisie, nie przy odczycie — jeśli ktoś edytuje i zapisuje produkt domu z wolnotekstowymi wartościami zanim backfill (krok 2) się skończy, zapis może zostać odrzucony przez nowy schemat. Backfill (krok 2) musi więc nastąpić bezpośrednio po wdrożeniu schematu (krok 1), zanim jakakolwiek ścieżka edycji producenta dotknie tych produktów.
