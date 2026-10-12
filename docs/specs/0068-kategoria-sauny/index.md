# 0068. Strona kategorii Sauny z filtrami i porównaniem

**Date**: 2026-10-06
**Status**: Accepted

## Summary

Adres `/{locale}/sauna` dziś zwraca 404, bo istnieje tylko strona pojedynczego produktu `/sauna/[slug]`. Ta specyfikacja dodaje prawdziwą stronę kategorii: lista wszystkich saun, filtry (liczba miejsc, cena, producent) i porównanie do trzech saun. Całość wdrażamy w trzech etapach, tak żeby 404 zniknął od razu, a filtry i porównanie doszły osobno. Strona używa tych samych kart i tego samego zapytania do bazy co `/results`, więc nie powstaje druga kopia listy.

## Requirements

**Historie użytkownika**:
- Jako klient szukający sauny, chcę wejść na `/sauna` i zobaczyć wszystkie dostępne modele, żeby nie zgadywać adresu ani nie przechodzić przez ogólną wyszukiwarkę.
- Jako klient, chcę zawęzić sauny po liczbie miejsc, cenie i producencie, żeby szybko znaleźć pasujące modele, gdy będzie ich dużo.
- Jako klient, chcę zestawić obok siebie do trzech saun, żeby porównać miejsca, drewno, ławki, izolację, przeszklenie, prąd, cenę i producenta.
- Jako zespół platformy, chcę żeby kategoria działała zanim dojdą kolejni producenci, i żeby ten sam wzór dało się później powtórzyć dla jacuzzi, kontenerów i outdoor tv.

**Kryteria akceptacji** (kontrakt, każde da się sprawdzić osobno):

Etap 1, lista i SEO:
- **AC-1**: `/{locale}/sauna` zwraca 200 w każdym z czterech języków (pl, en, de, nl) i renderuje wszystkie opublikowane produkty `family = "spa-modulowe"` i `spaSubcategory = "sauna"`. Adres `/sauna/[slug]` działa bez zmian.
- **AC-2**: Gdy nie ma żadnej opublikowanej sauny albo filtry nic nie znajdują, strona zwraca 200 i pokazuje pusty stan z przyciskiem czyszczenia filtrów kierującym na `/sauna` bez parametrów (nie na `/results`, dlatego `EmptyResults` dostaje prop `clearHref`). Nigdy 404.
- **AC-3**: Strona ma dokładnie jeden `<h1>` ("Sauny" w danym języku, z liczbą modeli), renderowany przez samą stronę poza `ResultsSelection`, tak że jest też obecny w pustym stanie. Dalej krótki tekst wstępny, breadcrumb (Strona główna, Sauny), `<title>` i `description` tłumaczone w czterech językach.
- **AC-4**: `/sauna` ma `canonical` wskazujący na siebie bez parametrów filtrów, `hreflang` dla czterech języków (ten sam wzorzec co `/sauna/[slug]`), oraz JSON-LD typu `ItemList` z linkami do modeli. Widok z jakimkolwiek parametrem filtra dostaje `robots: noindex, follow` i canonical na `/sauna`.
- **AC-5**: Lista używa tych samych komponentów kart, ulubionych i koszyka zapytań co `/results` (`ResultsSelection`, `ResultCard`), a karta linkuje do `/sauna/[slug]` przez `resolveProductHref`. `/results?family=spa-modulowe&spaSubcategory=sauna` działa dokładnie jak dziś (zero regresji).
- **AC-6**: Link "Sauny" w sekcji "Więcej niż dom" hero (`SearchCard`) prowadzi na `/{locale}/sauna`. Istniejące linki do pozostałych rodzin zostają bez zmian.

Etap 2, filtry:
- **AC-7**: Filtr liczby miejsc: chipy minimum 2+, 4+, 6+, 8+ (parametr `seatingMin`). Pokazuje tylko sauny, których `technicalSpecs.seatingCapacity` jest liczbą i jest większa lub równa wybranemu progowi. Produkt bez tej liczby nie przechodzi filtra i nie powoduje błędu zapytania.
- **AC-8**: Filtr ceny: osobna skala progów dla saun (`5000`, `10000`, `15000`, `25000` EUR, parametry `priceMin` i `priceMax`), porównywana z ceną "od" produktu. Produkt z wyceną indywidualną nie pasuje, gdy filtr ceny jest aktywny (ta sama reguła co dziś w `/results`).
- **AC-9**: Filtr producenta: chipy z producentami, którzy mają co najmniej jedną opublikowaną saunę (parametr `producer` z id producenta, walidowany jako UUID, bo kolumna jest typu uuid). Ponowne kliknięcie chipa czyści filtr. Liczba chipów rośnie sama, gdy dojdzie producent z opublikowaną sauną, bez zmiany kodu.
- **AC-10**: Filtry łączą się logicznym ORAZ, żyją wyłącznie w URL (żadnego stanu klienta, zgodnie z regułą AGENTS.md), mają wspólne sortowanie `price-asc`, `price-desc`. Nieprawidłowa wartość parametru (w tym `producer=abc`, które nie jest UUID) jest po cichu pomijana, nigdy nie daje błędu 500 ani 404.
- **AC-11**: Rozszerzenie `getProjects` o `seatingMin` i `producerId` oraz zmiana typu `priceMin`/`priceMax` na liczbę nie zmienia wyników dla żadnego dotychczasowego wywołania (`/results`, strona główna, ulubione).

Etap 3, porównanie:
- **AC-12**: Na `/sauna` użytkownik może zaznaczyć od 2 do 3 saun i przejść do `/compare?kind=spa-modulowe&products=id1,id2`. Pasek zaznaczenia ma limit 3, tak samo jak dla domów.
- **AC-13**: `/compare` bez parametru `kind` działa dokładnie jak dziś (domy), a nieznana wartość `kind` wraca po cichu do domów. Z `kind=sauna` renderuje tabelę saun z wierszami: zdjęcie i nazwa, producent, cena od, liczba miejsc, drewno wnętrza, okładzina, materiał ławek, izolacja, przeszklenie, strefa przebieralni, wymagania elektryczne.
- **AC-14**: Produkt usunięty, nieopublikowany albo spoza `spa-modulowe`/`sauna` (warunek dostępności: `family === "spa-modulowe"` i `spaSubcategory === "sauna"`, więc jacuzzi nie dziedziczy tabeli saun) renderuje się jako kolumna "niedostępne" (wzorzec spec 0044 AC-10). Oba istniejące przekierowania (zły parametr `products` oraz zero dostępnych kolumn) i link powrotu w tabeli prowadzą na `/sauna` dla `kind=sauna`, a na `/results` dla domów.
- **AC-15**: Definicje wierszy porównania żyją w jednej mapie "rodzaj porównania (`dom`, `sauna`) na listę wierszy", a nie w warunkach wewnątrz `ProjectCompareTable`. Tabela domów nie zmienia zachowania (jej istniejące testy przechodzą bez zmian).

## Decision

**Chosen option**: Option B, dedykowana strona kategorii `/sauna` oparta na wspólnym zapytaniu i wspólnych kartach.

`/sauna` jest własną trasą z własnym H1 i SEO, a pod spodem używa `getProjects` i `ResultsSelection`, rozszerzonych o małe, wstecznie zgodne opcje. Porównanie rozszerza istniejące `/compare` o rodzinę, zamiast tworzyć nową trasę.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`)

## Rationale

Rozumowanie i rozważane opcje: patrz `rationale.md`.

## Feature design

**Data model sketch**:

Zero nowych tabel i zero migracji. Wszystko, czego potrzeba, już jest w bazie: `product.family`, `product.spa_subcategory`, `product.price_min_cents`, `product.producer_id`, `product.technical_specs` (jsonb z `seatingCapacity` w kształcie `saunaSpecsShape`, spec 0061) i `producer.name`.

Nowe typy w kodzie (nie w bazie):

| Element | Gdzie | Opis |
|---|---|---|
| `SaunaFilter` | `lib/sauna-filters.ts` (nowy) | `{ seatingMin?: 2\|4\|6\|8, priceMin?, priceMax?: SaunaPriceThreshold, producer?: string, sort?: "price-asc"\|"price-desc" }` |
| `SAUNA_PRICE_THRESHOLDS` | `lib/sauna-filters.ts` | `[5000, 10000, 15000, 25000]`, dobrane do cen Kory i WDH, do strojenia przy dojściu producentów |
| `parseSaunaSearchParams` | `lib/sauna-filters.ts` | Ten sam wzorzec co `parseResultsSearchParams`: każde pole czyszczone osobno, zła wartość odrzucana po cichu, odwrócona para ceny kasuje obie |
| `buildSaunaHref` | `lib/sauna-filters.ts` | Serializacja filtra do `/{locale}/sauna?...`, jedno miejsce dla wszystkich linków chipów |
| `GetProjectsFilters` | `lib/data/projects.ts` | Dochodzą `seatingMin?: number` i `producerId?: string`, a `priceMin`/`priceMax` z `PriceThreshold` na `PriceThreshold | SaunaPriceThreshold` |
| `getSaunaProducerOptions` | `lib/data/projects.ts` | Lista `{ id, name, count }` producentów z opublikowaną sauną |
| `COMPARE_ROWS_BY_KIND` | `lib/compare-rows.ts` (nowy) | Mapa rodzaju porównania (`dom`, `sauna`) na definicje wierszy, patrz niżej |

**Trasy i komponenty**:

- `app/[locale]/(customer)/sauna/page.tsx` (nowy), server component: `generateMetadata`, parsowanie parametrów, `getProjects({ family: "spa-modulowe", spaSubcategory: "sauna", ...filtr })`, `getSaunaProducerOptions()`, render H1, wstępu, breadcrumb, `SaunaFilterBar`, `ResultsSelection`, JSON-LD.
- `components/klient/SaunaFilterBar.tsx` (nowy), server component z `<Link>` jak `SubcategoryFilterBar` (prawdziwe linki, klawiatura, ponowne kliknięcie czyści).
- `ResultsSelection` dostaje trzy opcjonalne propsy: `hideHeader?: boolean` (pomija `ResultsHeader`, bo jego `<h1>` dublowałby nagłówek strony, a przy pustej liście i tak nie jest renderowany), `emptyClearHref?: string` (przekazywany do `EmptyResults` jako `clearHref`) i `compareKind?: "dom" | "sauna"` (zastępuje twarde `family === "dom"`). Bez nich zachowanie jest dzisiejsze.
- Strona `/sauna` odtwarza dane opakowujące wzorzec z `results/page.tsx`: `getCountries`, `auth()`, `getClientIdForUser`, `getFavoritedProductIds`, `sortResults`, oraz budowa `ResultItem` (`countryName`, `favorited`) i `isClientSession`.
- `CompareSelectionBar` dostaje opcjonalny prop `kind`, który dopisuje `kind=` do adresu `/compare` i zmienia etykietę przycisku ("Porównaj sauny").
- `app/[locale]/(customer)/compare/page.tsx` czyta `kind` (domyślnie `dom`), a widok wybiera komponent tabeli, warunek dostępności i adres powrotu po rodzaju. Tabela saun czyta dane wyłącznie przez `getProjectById`, które ładuje tłumaczenia `technicalSpecs` dla en/de/nl (gałąź tłumaczeń `getProjects` ich nie selektuje, więc lista kart pokazuje je po polsku, co jest znanym ograniczeniem).
- `components/klient/ProjectCompareTable.tsx` zostaje nietknięty (tabela domów). Nowy `SaunaCompareTable.tsx` czyta wiersze z `COMPARE_ROWS_BY_KIND`.
- `components/klient/SearchCard.tsx`: chip "Sauny" w sekcji "Więcej niż dom" jako jawny wyjątek obok listy sterowanej przez `FAMILY_GROUPS` (spec 0060 AC-4), z komentarzem w kodzie, dlaczego. Test w `SearchCard.test.tsx`.

**Wiersze porównania (etap 3)**:

| Wiersz | Źródło | Uwagi |
|---|---|---|
| Zdjęcie, nazwa | `Project` | link do `/sauna/[slug]` |
| Producent | `project.producerName` | |
| Cena od | `project.priceMin`, `priceOnRequest` | "Wycena indywidualna", gdy brak ceny |
| Liczba miejsc | `saunaTechnicalSpecs.seatingCapacity` | |
| Drewno wnętrza | `saunaTechnicalSpecs.interiorWoodType` | tłumaczone przez istniejący `resolveTranslatedSpecValue` |
| Okładzina | `saunaTechnicalSpecs.claddingMaterial` | |
| Materiał ławek | `saunaTechnicalSpecs.benchMaterial` | |
| Izolacja | `saunaTechnicalSpecs.insulationType` | |
| Przeszklenie | `saunaTechnicalSpecs.glazingType` | |
| Przebieralnia | `hasChangingArea`, `changingAreaDescription` | tak z opisem, albo nie |
| Wymagania elektryczne | `saunaTechnicalSpecs.electricalRequirement` | |

**State transitions**: brak. Strona jest bezstanowa poza zaznaczeniem do porównania, które żyje w stanie klienta komponentu `ResultsSelection` (jak dziś dla domów) i przechodzi do `/compare` przez URL.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/{locale}/sauna` | GET | `seatingMin`, `priceMin`, `priceMax`, `producer`, `sort` (wszystkie opcjonalne) | HTML listy saun, JSON-LD | publiczny | zły parametr pomijany; nigdy 404 z powodu filtrów |
| `/{locale}/compare` | GET | `products` (2 do 3 id), `kind` (opcjonalny: `dom` domyślnie, albo `sauna`) | HTML tabeli porównania | publiczny | `products` bez 2 do 3 id, albo zero dostępnych kolumn: redirect na listę właściwego rodzaju |
| `getProjects(filters)` | funkcja | `+ seatingMin`, `+ producerId`, `priceMin/Max: number` | `Project[]` | serwer | |
| `getSaunaProducerOptions()` | funkcja | brak | `{ id, name, count }[]` | serwer | pusta lista zamiast błędu |

**Key invariants**:
- Opublikowany produkt `spa-modulowe`/`sauna` pojawia się na `/sauna` bez żadnej dodatkowej akcji (żadnej ręcznej rejestracji kategorii).
- `/sauna` nigdy nie zwraca 404 z powodu pustej listy lub nieznanych parametrów.
- Filtry sauny nie przeciekają do `/results`: `ResultsFilter` i `parseResultsSearchParams` zostają bez zmian.
- Parsowanie jsonb liczby miejsc jest bezpieczne dla złych danych: zapytanie używa `CASE WHEN jsonb_typeof(technical_specs->'seatingCapacity') = 'number' THEN (technical_specs->>'seatingCapacity')::numeric >= $n ELSE false END`, żeby jeden zły rekord nie wywrócił całej listy rzutowaniem.
- `/compare` bez `kind` jest bajt w bajt dzisiejszym zachowaniem dla domów.

**Security model**: wszystko publiczne, tylko do odczytu, zgodnie z istniejącym `/results` i `/compare`. Zwracane są wyłącznie produkty ze statusem `published`. Parametry URL są walidowane przez listę dozwolonych wartości, a id producenta trafia do zapytania jako parametr (Drizzle), nigdy nie jest sklejane do SQL. Brak danych osobowych, brak zgodności regulacyjnej do nazwania.

**Configuration required**: brak nowych zmiennych środowiskowych ani sekretów.

**SEO i dostępność**:
- Metadane tak jak `/sauna/[slug]` (`canonical`, `alternates.languages` dla `routing.locales`), tytuł "Sauny | ModularHub Europe" w czterech językach.
- JSON-LD `ItemList` z `itemListElement` (pozycja, URL modelu). Tylko dla widoku bez filtrów.
- Jeden `<h1>`, widoczny `.focus-ring` na chipach, status zaznaczenia nie tylko kolorem (`aria-current`), zgodnie z `components/klient/AGENTS.md`.
- Tryb ciemny przez istniejące tokeny `.theme-klient` (spec 0043), bez nowych kolorów.
- Nowy namespace tłumaczeń `SaunaCategoryPage` w `messages/{pl,en,de,nl}.json` (H1, wstęp, breadcrumb, etykiety filtrów, pusty stan, etykiety wierszy porównania).

**Critical test scenarios** (każdy mapuje się na kryterium z `## Requirements`):
- Happy path: `/pl/sauna` zwraca 200 z saunami Kory i WDH (liczby w E2E nie sprawdzamy na sztywno, bo dev ma ich kilkanaście), jednym H1 i poprawnym canonical, verifies **AC-1**, **AC-3**, **AC-4**
- Happy path: `?seatingMin=4` zostawia tylko sauny z co najmniej 4 miejscami, `?producer=<id>` tylko tego producenta, oba razem to część wspólna, verifies **AC-7**, **AC-9**, **AC-10**
- Happy path: zaznaczenie dwóch saun i klik "Porównaj sauny" otwiera `/compare?kind=spa-modulowe&products=...` z tabelą 11 wierszy, verifies **AC-12**, **AC-13**
- Failure case: baza bez saun albo filtr bez wyników daje 200 i pusty stan z linkiem czyszczącym, verifies **AC-2**
- Failure case: produkt z `seatingCapacity` jako tekstem w jsonb nie wywraca zapytania i nie przechodzi filtra miejsc, verifies **AC-7**
- Failure case: `?seatingMin=abc&priceMin=99&producer=abc` jest po cichu pominięte (bez błędu uuid z bazy), lista pełna, verifies **AC-10**
- Happy path: progi cen filtrują po cenie "od", produkt z wyceną indywidualną odpada przy aktywnym filtrze, odwrócona para `priceMin`/`priceMax` kasuje obie, verifies **AC-8**
- Failure case: `/compare?kind=sauna` z id usuniętej sauny pokazuje kolumnę "niedostępne", a bez żadnej dostępnej (oraz przy złym `products`) przekierowuje na `/sauna`, verifies **AC-14**
- Regresja: `/results` (dom i spa) oraz `/compare?products=...` bez `kind` dają te same wyniki co przed zmianą, istniejące testy `projects.test.ts`, `ProjectCompareTable.test.tsx`, `results-filters.test.ts` przechodzą bez edycji, verifies **AC-5**, **AC-11**, **AC-13**, **AC-15**
- Dostęp: widok z filtrem ma `noindex` i canonical na `/sauna`, verifies **AC-4**

## Build plan

Podejście projektu to **Facade** (najpierw klikalny interfejs, backend ekran po ekranie), ale tu dane i zapytania już istnieją, więc kolejność wynika z etapowania: najpierw usunięcie 404, potem coraz grubsze warstwy. Brak migracji.

**Etap 1: lista i SEO (usuwa 404, wdrażalny sam)**
1. Dodaj do `ResultsSelection` propsy `hideHeader` i `emptyClearHref`, a do `EmptyResults` prop `clearHref`, z testem, że bez nich zachowanie jest dzisiejsze, satisfies AC-2, AC-5
2. Utwórz `app/[locale]/(customer)/sauna/page.tsx`: pobranie saun przez `getProjects({ family: "spa-modulowe", spaSubcategory: "sauna" })`, dane opakowujące jak w `results/page.tsx` (kraje, sesja, ulubione, `sortResults`), własny H1, wstęp, breadcrumb, `ResultsSelection` z `hideHeader`, pusty stan, satisfies AC-1, AC-2, AC-3, AC-5
3. `generateMetadata` (title, description, canonical, hreflang) i JSON-LD `ItemList`, satisfies AC-3, AC-4
4. Tłumaczenia namespace `SaunaCategoryPage` w czterech językach (zgodnie z wymogiem tłumaczeń, patrz pamięć projektu), satisfies AC-3
5. Chip "Sauny" w `SearchCard` (jawny wyjątek od `FAMILY_GROUPS`) z testem w `SearchCard.test.tsx`, satisfies AC-6
6. Testy strony (`page.test.tsx` obok wzorca `sauna/[slug]/page.test.tsx`), satisfies AC-1, AC-2, AC-3, AC-4

**Etap 2: filtry**
7. `lib/sauna-filters.ts`: `SAUNA_PRICE_THRESHOLDS`, `parseSaunaSearchParams` (w tym walidacja UUID producenta), `buildSaunaHref`, test jednostkowy, satisfies AC-7, AC-8, AC-9, AC-10
8. Rozszerz `getProjects`: `seatingMin` (bezpieczny `CASE WHEN`), `producerId`, `priceMin`/`priceMax` poszerzone do `PriceThreshold | SaunaPriceThreshold`; test regresji istniejących wywołań, satisfies AC-7, AC-8, AC-11
9. `getSaunaProducerOptions()` w `lib/data/projects.ts`, satisfies AC-9
10. `components/klient/SaunaFilterBar.tsx` (chipy: miejsca, cena, producent, sortowanie) podpięty do strony, `noindex` i canonical dla widoków z filtrem, satisfies AC-4, AC-7, AC-8, AC-9, AC-10

**Etap 3: porównanie**
11. `lib/compare-rows.ts` z mapą wierszy (`COMPARE_ROWS_BY_KIND`) i `SaunaCompareTable.tsx` (nowy komponent), satisfies AC-13, AC-15
12. `/compare/page.tsx`: parametr `kind`, wybór tabeli i warunku dostępności, kolumny "niedostępne", oba redirecty i link powrotu na właściwą listę, satisfies AC-13, AC-14
13. `ResultsSelection` (`compareKind`) i `CompareSelectionBar` (`kind`, etykieta), podpięcie na `/sauna`, satisfies AC-12
14. Testy porównania i test regresji domowego `/compare`, satisfies AC-12, AC-13, AC-14, AC-15
15. E2E Playwright: `/pl/sauna` bez 404, filtr miejsc, zaznaczenie dwóch saun i tabela porównania, satisfies AC-1, AC-7, AC-12, AC-13

## Consequences

**Dobre**:
- 404 na `/sauna` znika już w etapie 1, jeszcze przed dodaniem producentów.
- Zero migracji, zero zmian w schemacie bazy.
- Jedna lista i jedne karty dla `/results` i `/sauna`, więc poprawka wyglądu karty działa w obu miejscach.
- Mapa wierszy porównania i parametry opcjonalne dają gotowy wzór dla jacuzzi, kontenerów i outdoor tv.

**Złe i do zaakceptowania**:
- Dwie ścieżki do tych samych saun (`/results?family=spa-modulowe&spaSubcategory=sauna` i `/sauna`). Obie zostają, a treść może się rozjechać. Łagodzimy to wspólnym `getProjects` i wspólnymi kartami.
- Filtr miejsc czyta liczbę z jsonb bez indeksu. Przy kilkudziesięciu saunach koszt jest pomijalny, ale przy tysiącach produktów trzeba będzie wyciągnąć `seatingCapacity` do kolumny. Dopóki nie ma zmierzonego problemu, nie robimy tego (przedwczesna optymalizacja).
- Progi cen są ręcznie dobrane do dwóch producentów i trzeba je będzie przejrzeć, gdy katalog urośnie.
- `ResultsSelection` zyskuje dwa propsy, więc staje się trochę bardziej ogólny. Warunek na rodzinę przestaje być twardym `"dom"`.
- Utrzymujemy dwa komponenty tabeli porównania (domy i sauny), a nie jeden uniwersalny.

## Follow-up

- [ ] W projekcie nie ma `sitemap.ts` ani `robots.ts`. Punkt "dodaj `/sauna` do sitemapy" nie ma gdzie wylądować, więc potrzebna jest osobna funkcja: sitemapa całego serwisu (strona główna, `/results`, `/sauna`, `/sauna/[slug]`, `/project/[slug]`, `/outdoor-tv/[slug]`, cztery języki). Do zaprojektowania osobnym `/architect`.
- [ ] Wzór kategorii (H1, wstęp, pasek filtrów, porównanie) można powtórzyć dla jacuzzi (`/jacuzzi`), kontenerów i outdoor tv, gdy te rodziny dostaną realnych producentów. Dla każdej osobna decyzja o filtrach.
- [ ] Filtr rodzaju pieca (drewno, elektryczny) odłożony: `saunaSpecsShape` nie ma takiego pola (piec jest płatną opcją konfiguratora, spec 0061). Wymaga decyzji, czy piec to atrybut produktu, czy grupa opcji.
- [ ] Przejrzeć `SAUNA_PRICE_THRESHOLDS` po dojściu kolejnych producentów i po powtórzeniu zasiewu na bazie produkcyjnej.
- [ ] Karta sauny (`ResultCard`, `isSauna`) nie pokazuje liczby miejsc, więc klient filtruje po czymś, czego nie widzi na karcie. Dodać wiersz "N miejsc" na karcie sauny, albo świadomie zostawić.
- [ ] Lista kart w en/de/nl pokazuje `technicalSpecs` sauny po polsku (gałąź tłumaczeń `getProjects` ich nie selektuje). Porównanie jest bezpieczne, bo używa `getProjectById`. Brak paginacji jest świadomy przy kilkunastu saunach.
- [ ] Zdecydować, czy `SubcategoryFilterBar` na `/results` ma kiedyś przenosić chip "sauna" na `/sauna` (dziś świadomie nie).
- [ ] Rozważyć przeniesienie `seatingCapacity` do kolumny z indeksem, jeśli liczba saun przekroczy kilkaset.
- [ ] Wartości `seatingCapacity` Kory i WDH są szacunkami (spec 0061 Follow-up), więc filtr miejsc będzie tak dokładny jak te szacunki. Potwierdzić przy onboardingu producentów.
- [ ] Dodać wpis tego nowego pliku/trasy do `components/klient/AGENTS.md` (lista ekranów) i nowy test do dokumentacji, gdy etap będzie zbudowany (zadanie dla `/sync`).
