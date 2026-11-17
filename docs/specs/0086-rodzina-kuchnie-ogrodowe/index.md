# 0086. Rodzina produktów Kuchnie ogrodowe (outdoor-kitchen)

**Date**: 2026-11-16
**Status**: In Progress

## Summary

Dodajemy nową rodzinę produktów: kuchnie ogrodowe. Na start jest w niej 10 modeli z katalogu dla inwestora: 4 kuchnie w obudowie od Wooden Dream House i 6 zestawów modułowych sprzedawanych jako produkt ModularHub. To rodzina tylko do prezentacji. Produkty wgrywa skrypt importu, producent ich nie edytuje, a zapytanie idzie przez istniejący formularz. Powstają dwie publiczne strony: kategoria `/outdoor-kitchen` z dwiema sekcjami i strona produktu `/outdoor-kitchen/[slug]`.

## Requirements

**User stories**:
- Jako klient chcę zobaczyć wszystkie kuchnie ogrodowe na jednej stronie, podzielone na kuchnie w obudowie i zestawy modułowe, żeby od razu zrozumieć różnicę.
- Jako klient chcę na stronie kuchni zobaczyć zdjęcia, cenę od, wymiary, wyposażenie (co jest w cenie, co za dopłatą), opcje i warunki dostawy, a potem wysłać zapytanie.
- Jako ModularHub chcę wystawić zestawy modułowe pod własną marką, tak żeby nazwa ich dostawcy nigdzie się nie pojawiła.
- Jako Wooden Dream House chcę widzieć w panelu, które moje kuchnie są na stronie, nawet jeśli nimi nie zarządzam.

**Acceptance criteria**:

Rodzina i dane:
- **AC-1**: Typ `product_family` ma wartość `outdoor-kitchen`. Produkt tej rodziny przy publikacji przechodzi walidację schematu Zod `outdoorKitchenSpecsShape` (pola w *Feature design*). Szkic dostaje wersję `.partial()`. Zły kształt `technical_specs` jest odrzucany przez skrypt importu, zanim cokolwiek trafi do bazy.
- **AC-2**: `npm run import:outdoor-kitchens` zapisuje do bazy dev 10 opublikowanych produktów z tabeli *Dane produktów*: ceny w EUR dokładnie jak w katalogu, opcje, tłumaczenia en/de/nl i do 6 zdjęć na produkt w R2. Ponowne uruchomienie niczego nie dubluje: produkty, opcje, tłumaczenia, zdjęcia, użytkownik i producent są dopasowywane po stałych kluczach (slug, NIP, e-mail, klucz R2).
- **AC-3**: Po imporcie `npm run check:translations` nie zgłasza żadnej luki dla tych 10 produktów (pola produktu, tekstowe pola `technicalSpecs`, grupy i opcje).
- **AC-4**: Kuchnie WDH należą do istniejącego producenta Wooden Dream House. Zestawy modułowe należą do nowego producenta "ModularHub Europe" z `is_platform_brand = true`. Ten producent ma własne konto techniczne z rolą `producer`, adresem e-mail w domenie `.invalid` i NIP `MHE-OWN`, więc nie da się na nie zalogować.
- **AC-5**: Słowo "ELEEXA" (i "SMARTBOXY") nie występuje w żadnym tekście widocznym dla klienta ani w żadnym polu produktów ModularHub w żadnym języku: nazwa, opis, `technicalSpecs`, opcje, tekst alternatywny zdjęć, slug, nazwy plików w R2. Sprawdza to test skryptu importu na danych źródłowych.

Strona produktu:
- **AC-6**: `/{locale}/outdoor-kitchen/[slug]` zwraca 200 we wszystkich czterech językach (pl, en, de, nl) dla opublikowanego produktu `outdoor-kitchen`. Pokazuje galerię, nazwę, producenta, cenę od z tym samym oznaczeniem netto i dopiskiem o VAT co inne produkty, oraz przycisk zapytania. Nieznany lub nieopublikowany slug daje 404. Produkt innej rodziny pod tym adresem przekierowuje na adres z `resolveProductHref`, tak samo jak strona sauny.
- **AC-7**: Sekcja "Wymiary i wyposażenie" pokazuje wymiary zewnętrzne w formacie "D × S × W cm" (wewnętrzne tylko wtedy, gdy są w danych, a brakujący wymiar opuszcza) oraz pięć pozycji wyposażenia (grill, zlew, lodówka, szafki, oświetlenie), każdą jako "w cenie", "za dopłatą" albo "brak". Do tego "zamykana: tak/nie" i listę elementów standardu. Etykiety tych wartości pochodzą z `messages/*.json` i są kluczowane po wartości enum, nie po tekście.
- **AC-8**: Sekcja opcji używa `ProjectOptionsConfigurator` (spec 0059): wybór układu wyspowego przy Premium zmienia sumę o dopłatę, wybór koloru Azzurro przy Compact 240 o +326 €, a dodatki WDH pokazują się jako "na zapytanie" i nie zmieniają sumy.
- **AC-9**: Sekcja "Dostawa i montaż" pokazuje `deliveryNote`, a gdy są w danych, także `weightKg` i `foundationRequirement`. Sekcja bez żadnych danych się nie renderuje.
- **AC-10**: Przy produkcie producenta z `is_platform_brand = true` pole producenta pokazuje "ModularHub Europe" bez linku i bez sekcji partnera. JSON-LD `Product` ma `brand` "ModularHub Europe". Przy kuchniach WDH sekcja partnera i link do profilu działają jak przy saunach WDH.
- **AC-11**: Strona produktu ma `canonical` na siebie, `hreflang` dla czterech języków, `<title>` i `description` w języku strony oraz JSON-LD `Product` z ceną `offers` w EUR (wzorzec `/sauna/[slug]`).

Strona kategorii:
- **AC-12**: `/{locale}/outdoor-kitchen` zwraca 200 w czterech językach. Ma dokładnie jeden `<h1>` ("Kuchnie ogrodowe", "Outdoor kitchens", "Outdoorküchen", "Buitenkeukens"), krótki wstęp i breadcrumb (Strona główna, Kuchnie ogrodowe). Niżej są dwie sekcje z nagłówkiem `<h2>` i jednym zdaniem wstępu: "Kuchnie w obudowie" (`kitchenType = box`) i "Zestawy modułowe" (`kitchenType = modular`). Karty to `ResultCard` z linkiem z `resolveProductHref` i przyciskiem ulubionych, sortowane rosnąco po cenie od.
- **AC-13**: Sekcja bez produktów się nie renderuje. Gdy nie ma żadnego opublikowanego produktu, strona zwraca 200 i pokazuje pusty stan z linkiem do `/results`. Nigdy 404.
- **AC-14**: Strona kategorii ma lewy panel jak `/sauna` (spec 0068, decyzja właściciela 2026-11-17): od `lg` przyklejony w lewej kolumnie, niżej nad listą. W panelu jest przełącznik rodziny (`FamilyTabs` z `family="outdoor-kitchen"`), potem trzy listy: "Rodzaj kuchni" (wszystkie, w obudowie `box`, zestaw modułowy `modular`), "Cena od" (do 5 000 €, 5 000 do 7 500 €, 7 500 do 10 000 €, od 10 000 €, granice włącznie) i "Sortuj" (domyślnie, cena rosnąco, cena malejąco), oraz przycisk "Szukaj". Wybór zmienia tylko stan lokalny, adres zmienia się po kliknięciu "Szukaj". Stan filtra żyje wyłącznie w URL (`?type=`, `?priceMin=`, `?priceMax=`, `?sort=`, budowany przez `buildOutdoorKitchenHref`). Nieznany parametr, zła wartość i odwrócona para cen są pomijane po cichu. Filtr typu zostawia tylko jedną sekcję, sortowanie działa w każdej sekcji osobno, a produkt "na zapytanie" odpada przy filtrze ceny. Gdy jest aktywny filtr, panel pokazuje link "Wyczyść filtry". Filtr bez wyników daje komunikat "Żadna kuchnia nie pasuje do wybranych filtrów." z linkiem czyszczącym (to nie jest pusty stan z AC-13). SEO: `canonical` zawsze na `/{locale}/outdoor-kitchen` bez parametrów, `hreflang` dla czterech języków, tłumaczone `<title>` i `description`. Widok bez filtra ma JSON-LD `ItemList` z linkami do produktów. Widok z filtrem dostaje `<meta name="robots" content="noindex, follow">` i nie ma `ItemList`. Etykiety typu kluczowane po wartości enum.

Nawigacja i reszta serwisu:
- **AC-15**: Rodzina jest w `FAMILY_GROUPS["wiecej-niz-dom"]`, więc produkty pokazują się w `/results` w widoku "Więcej niż dom" i pod `?family=outdoor-kitchen`. Link "Kuchnie ogrodowe" w hero (`SearchCard`, sekcja "Więcej niż dom"), w menu nagłówka i w stopce prowadzi na `/{locale}/outdoor-kitchen`. Dotychczasowe linki pozostałych rodzin się nie zmieniają.
- **AC-16**: `app/sitemap.ts` wymienia `/outdoor-kitchen` w czterech językach i każdy opublikowany produkt tej rodziny pod adresem z `resolveProductHref`.
- **AC-17**: Zapytanie o kuchnię idzie przez istniejący `/inquiry` z neutralnymi etykietami (spec 0084 AC-1), a sprawa dostaje karty startowe z nowego wpisu `FAMILY_CARD_KEYS["outdoor-kitchen"] = ["miejsce_ustawienia", "liczba_sztuk", "termin"]`. To wyłącznie istniejące klucze kart (rodzina dopisana do ich listy `families`), bez nowych tekstów kart.
- **AC-18**: `/verified-manufacturers` (`getProducers`) i każda inna publiczna lista producentów pomija producenta z `is_platform_brand = true`. `/producers/[id]` dla tego producenta zwraca 404.

Panel producenta:
- **AC-19**: WDH widzi swoje kuchnie na liście produktów w panelu z oznaczeniem "Zarządza ModularHub" i bez akcji edycji ani usuwania. Każda akcja serwera, która zmienia produkt producenta (produkt, warianty, opcje, zdjęcia, tłumaczenia, rozpoznawanie układu, wyciąganie standardów, koperta), odmawia dla produktu z rodziny `outdoor-kitchen`, zwracając ten sam błąd co dla produktu, który nie istnieje. Kreator producenta nie oferuje tej rodziny.
- **AC-20**: Żadna zmiana nie wpływa na rodziny `dom`, `spa-modulowe`, `kontenery-modulowe` ani `outdoor-tv`: ich strony, wyniki, karty startowe, panel i lista producentów działają jak dziś. Dotychczasowe testy przechodzą bez zmian w oczekiwaniach.

## Decision

**Chosen option**: Option 2: osobna rodzina z własnymi stronami katalogowymi i danymi tylko ze skryptu importu.

Nowa wartość rodziny, schemat `technicalSpecs` z typem kuchni w środku, strony `/outdoor-kitchen` i `/outdoor-kitchen/[slug]` zbudowane z istniejących komponentów strony sauny, producent marki ModularHub oznaczony kolumną `is_platform_brand`, a cała edycja tylko przez skrypt.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (bez nowych tabel, jedna migracja):

| Element | Zmiana |
|---|---|
| typ `product_family` | `ALTER TYPE product_family ADD VALUE 'outdoor-kitchen'` |
| `producer.is_platform_brand` | `boolean NOT NULL DEFAULT false`. `true` tylko dla "ModularHub Europe" |
| `users` | 1 wiersz: rola `producer`, e-mail `platform-brand@modularhubeurope.invalid`, bez hasła ani linku logowania |
| `producer` | 1 wiersz "ModularHub Europe": `nip = 'MHE-OWN'` (unikalny), `country_code = 'PL'`, `verification_status` jak dla WDH, `description` pusty |
| `product` | 10 wierszy, `family = 'outdoor-kitchen'`, `status = 'published'`, `price_min_cents` w EUR z katalogu, `spa_subcategory`/`container_subcategory`/`category` puste (zgodne z `product_family_subcategory_match`) |
| `product_option_group` / `product_option` | grupy z tabeli *Dane produktów* (spec 0059), dopłaty w `price_cents`, dodatki WDH z `price_on_request = true` |
| `product_translation` i tłumaczenia opcji | en, de, nl dla nazwy, opisu, tekstowych pól `technicalSpecs`, grup i opcji (spec 0067) |
| zdjęcia | do 6 na produkt, ta sama ścieżka R2 i te same wiersze co we wcześniejszych importach katalogów |

`outdoorKitchenSpecsShape` (Zod, `lib/product-technical-specs.ts`, `.strict()`):

| Pole | Typ | Wymagane | Tłumaczone |
|---|---|---|---|
| `kitchenType` | `"box" \| "modular"` | tak | nie (etykieta z `messages`) |
| `externalDimensionsCm` | `{ length: number, width?: number, height?: number }` | tak (`length`) | nie |
| `internalDimensionsCm` | `{ length: number, width: number, height: number }` | nie (tylko box) | nie |
| `equipment` | `{ grill, sink, fridge, cabinets, lighting }`, każde `"included" \| "extra" \| "none"` | tak | nie (etykieta z `messages`) |
| `closable` | boolean | tak | nie |
| `bodyMaterial` | string | tak | tak |
| `worktopMaterial` | string | nie | tak |
| `standardFeatures` | string[] (min. 1) | tak | tak (cała lista w `product_translation.technical_specs`) |
| `weightKg` | number | nie | nie |
| `foundationRequirement` | string | nie | tak |
| `deliveryNote` | string | tak | tak |

`width`/`height` przy `externalDimensionsCm` są opcjonalne, bo katalog podaje dla zestawów Premium tylko długość.

Relacje bez zmian: producent 1:N produkt, produkt 1:N grupa opcji 1:N opcja, produkt 1:N tłumaczenie (po jednym na język).

**Dane produktów** (źródło: `_docs/kuchnie-ogrodowe-dla-inwestora/ModularHub-Outdoor-Kitchens-Catalog-2026.pdf`, `przeglad.md`, zdjęcia z `pdf-build/img` plus galerie producentów, prawa potwierdzone):

| # | Nazwa | Producent | Typ | Cena od | Wymiary zewn. (cm) | Opcje |
|---|---|---|---|---|---|---|
| 1 | Sky Kitchen Wood | WDH | box | 6 500 € | 340 × 90 × 240 (wewn. 300 × 80 × 220) | "Wyposażenie" (multi, na zapytanie): szafki HPL, szafki ze stali nierdzewnej, grill, zlew, lodówka, donice, siłowniki elektryczne, inny gatunek drewna |
| 2 | Sky Kitchen Slide | WDH | box | 6 500 € | jw. | "Wyposażenie": szafki HPL, szafki nierdzewne, grill, zlew, lodówka, donice na ścianie bocznej |
| 3 | Sky Kitchen Prestige | WDH | box | 7 500 € | jw. | "Wyposażenie": szafki HPL, szafki nierdzewne, grill, zlew, lodówka, donice |
| 4 | Sky Kitchen Prestige Set | WDH | box | 15 600 € | jw. | "Wyposażenie": lodówka, zlew, donice, kolor na zamówienie |
| 5 | Compact 240 | ModularHub | modular | 4 554 € | 242,5 × 77 × 125 | "Kolor" (single): Antracyt RAL 7016 0 €, RAL 9005 0 €, RAL 9001 0 €, RAL 7039 0 €, Azzurro +326 € |
| 6 | Compact 320 Marrone | ModularHub | modular | 7 328 € | 322,5 × 77 × 125 | brak |
| 7 | Compact 360 z lodówką | ModularHub | modular | 6 827 € | 362,5 × 77 × 125 | "Kolor" (single): RAL 9001, RAL 7016, RAL 9005, wszystkie 0 € |
| 8 | Premium 300 | ModularHub | modular | 7 448 € | 300 | "Układ" (single): przy ścianie 0 €, wyspa +1 503 € |
| 9 | Premium 360 | ModularHub | modular | 8 750 € | 360 | "Układ": przy ścianie 0 €, wyspa +1 804 € |
| 10 | Premium 420 | ModularHub | modular | 10 813 € | 420 | "Układ": przy ścianie 0 €, wyspa +2 104 € |

Wyposażenie: kuchnie WDH 1 do 3 mają grill, zlew, lodówkę i szafki "za dopłatą", oświetlenie "w cenie", `closable = true`, wagę 600 kg, wymóg płyty betonowej 15 cm większej o 10 cm z każdej strony. Prestige Set ma grill kamado i szafki HPL "w cenie". Zestawy ModularHub mają grill gazowy, zlew z baterią i szafki "w cenie", lodówkę "brak" (Compact 360: "w cenie"), oświetlenie "brak", `closable = false`, korpus ze stali ocynkowanej malowanej proszkowo, blat HPL 12 mm, dostawę złożoną (plug and play). Premium 420 ma dodatkowy palnik gazowy w standardzie.

**State transitions**: brak. Produkty powstają od razu jako `published`. Wycofanie produktu to zmiana `status` przez skrypt albo SQL, jak przy innych importach.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/{locale}/outdoor-kitchen` | GET | opcjonalnie `?type=box\|modular`, `?priceMin=`/`?priceMax=` (5000, 7500, 10000), `?sort=price-asc\|price-desc`; inne parametry i złe wartości pomijane | HTML z lewym panelem i jedną albo dwiema sekcjami, JSON-LD `ItemList` tylko bez filtra, `noindex, follow` z filtrem | publiczny | nigdy 404, pusty stan przy braku produktów, komunikat "brak dopasowań" przy filtrze bez wyników |
| `lib/outdoor-kitchen-filters.ts` | funkcje czyste | `searchParams`, `OutdoorKitchenFilter` | `parseOutdoorKitchenSearchParams`, `hasActiveOutdoorKitchenFilter`, `buildOutdoorKitchenHref`, `filterOutdoorKitchens` | czysta | zła wartość daje `undefined`, nie błąd |
| `/{locale}/outdoor-kitchen/[slug]` | GET | `slug` (albo `id`), `?options=` jak spec 0059 | HTML strony produktu, JSON-LD `Product` | publiczny | 404 nieznany lub nieopublikowany, redirect przy innej rodzinie |
| `getOutdoorKitchens(locale)` | funkcja (`lib/data/projects.ts`) | `locale` | `Project[]` z `outdoorKitchenTechnicalSpecs` | serwer | pusta lista zamiast błędu |
| `isProducerManagedFamily(family)` | funkcja (`lib/product-family-groups.ts`) | `ProductFamily` | `boolean` (`false` dla `outdoor-kitchen`) | czysta | brak |
| `npm run import:outdoor-kitchens` | skrypt (`scripts/import-outdoor-kitchens-catalog.ts`) | `DATABASE_URL` z `.env.local` (dev) | 10 produktów, producent, konto, zdjęcia | lokalnie | przerwanie przy błędzie walidacji Zod przed zapisem |
| `scripts/export-outdoor-kitchens-prod-sql.ts` | skrypt | dane z dev | plik SQL do `scripts/run-sql-file.ts` | lokalnie | |

**Key invariants**:
- Opublikowany produkt `outdoor-kitchen` ma `technical_specs` zgodne z `outdoorKitchenSpecsShape` (sprawdza import).
- Produkt `outdoor-kitchen` nigdy nie jest zmieniany przez akcję producenta (AC-19), sprawdzane na serwerze, nie tylko przez ukrycie przycisku.
- Producent z `is_platform_brand = true` nie pojawia się na żadnej publicznej liście producentów i nie ma publicznego profilu.
- Logika (sekcja kategorii, etykiety wyposażenia) kluczuje po `kitchenType` i wartościach enum, nigdy po przetłumaczonym tekście.
- `resolveProductHref` jest jedynym miejscem, które zna segment `outdoor-kitchen`.

**Security model**: obie strony są publiczne i tylko do odczytu, pokazują wyłącznie produkty `published`. Zapis danych tylko przez skrypty uruchamiane lokalnie przez zespół. Konto techniczne nie może się zalogować (adres `.invalid` nie odbierze linku). Akcje producenta odmawiają dla tej rodziny po stronie serwera. Brak danych osobowych.

**Configuration required**: brak nowych zmiennych. Skrypt importu używa istniejących `DATABASE_URL` i zmiennych R2 (`lib/storage/AGENTS.md`).

**Critical test scenarios**:
- Happy path: import na pustej bazie testowej, potem `/pl/outdoor-kitchen` ma dwie sekcje (4 i 6 kart, po cenie), a strona Premium 360 z wybraną wyspą pokazuje 10 554 €. Weryfikuje **AC-2**, **AC-8**, **AC-12**.
- Idempotencja: drugi import nie zmienia liczby wierszy w żadnej tabeli. Weryfikuje **AC-2**.
- Marka: żadne pole produktów ModularHub ani tekst strony nie zawiera "ELEEXA". `getProducers` nie zwraca ModularHub Europe, a `/producers/[id]` daje 404. Weryfikuje **AC-5**, **AC-10**, **AC-18**.
- Uprawnienia: zalogowany WDH wywołuje `updateProducerProduct` dla Sky Kitchen Wood i dostaje "Nie znaleziono produktu.", a w bazie nic się nie zmienia. Weryfikuje **AC-19**.
- Pusty stan: bez produktów `/outdoor-kitchen` zwraca 200 z pustym stanem. Weryfikuje **AC-13**.
- Regresja: `/results`, `/sauna`, `/commercial-displays`, karty startowe spec 0084 bez zmian. Weryfikuje **AC-20**.

## Build plan

Kolejność: najpierw cienki, pełny przepływ (migracja, schemat, jedna strona, jeden produkt), potem reszta danych i stron.

1. Migracja Drizzle: wartość `outdoor-kitchen` w `product_family` i kolumna `producer.is_platform_brand`. Aktualizacja `PRODUCT_FAMILIES`, typu `ProductFamily` i wszystkich map `Record<ProductFamily, …>`, które wskaże `tsc` (`FAMILY_LABEL` w obu formularzach admina, `READY_GROUP_LABEL`, `ResultsHeader`, `ProducerProductList`, `analytics-client`, `PageviewAttribution` z nowym `pageType` `outdoor_kitchen`). Spełnia **AC-1**, **AC-4**, **AC-20**.
2. `outdoorKitchenSpecsShape` (opublikowany i `.partial()`) w `lib/product-technical-specs.ts`, gałąź w `getTechnicalSpecsSchema`, odczyt i tłumaczenie tekstowych pól w `lib/data/projects.ts` (wzorzec `saunaTechnicalSpecs` i `resolveTranslatedSpecValue`), testy schematu. Spełnia **AC-1**, **AC-7**.
3. `resolveProductHref` z segmentem `outdoor-kitchen` i `isProducerManagedFamily`. Strona `/outdoor-kitchen/[slug]` złożona z komponentów strony sauny (`ProjectGalleryTabs`, `ProjectOptionsConfigurator`, `ProjectLogistics` albo nowa mała sekcja dostawy, `FavoriteButton`, sekcja partnera tylko gdy nie `is_platform_brand`), nowy `OutdoorKitchenSpecs` dla wymiarów i wyposażenia, metadane, JSON-LD, teksty pl/en/de/nl w `messages/*.json`. Spełnia **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**.
4. Skrypt importu, najpierw tylko Sky Kitchen Prestige Set na dev (producent WDH, zdjęcia, opcje, tłumaczenia), sprawdzenie strony z punktu 3 w przeglądarce. Spełnia **AC-2** (częściowo), **AC-6**.
5. Skrypt importu dla wszystkich 10 produktów: konto techniczne i producent ModularHub Europe, dane z tabeli *Dane produktów*, do 6 zdjęć na model, tłumaczenia en/de/nl, test na brak "ELEEXA"/"SMARTBOXY", `npm run check:translations` z wynikiem 0. Wpis `import:outdoor-kitchens` w `package.json`. Spełnia **AC-2**, **AC-3**, **AC-4**, **AC-5**.
6. Strona `/outdoor-kitchen`: `getOutdoorKitchens`, H1, wstęp, breadcrumb, dwie sekcje z `ResultCard` (ulubione jak w `/sauna`), pusty stan, metadane, JSON-LD `ItemList`. Lewy panel jak `/sauna`: `lib/outdoor-kitchen-filters.ts` (wzorzec `lib/sauna-filters.ts`, filtrowanie po już wczytanej liście, bez nowego zapytania do bazy), serwerowy `OutdoorKitchenFilterBar` z `FamilyTabs`, kliencki `OutdoorKitchenFilterFields` z przyciskiem "Szukaj", `splitOutdoorKitchenSections` z parametrem sortowania, `noindex, follow` i brak `ItemList` przy filtrze, komunikat "brak dopasowań", teksty pl/en/de/nl. Testy parsowania, budowania adresu i filtrowania. Spełnia **AC-12**, **AC-13**, **AC-14**.
7. Nawigacja: `FAMILY_GROUPS`, link w `SearchCard` (jawny wyjątek obok sauny i outdoor-tv), `SiteHeaderMenuNav`, `SiteFooter`, `FamilyTabs`, `app/sitemap.ts`, wpis w `FAMILY_CARD_KEYS`. Spełnia **AC-15**, **AC-16**, **AC-17**.
8. Producent marki: `getProducers` i inne publiczne listy pomijają `is_platform_brand`, `/producers/[id]` zwraca 404. Spełnia **AC-10**, **AC-18**.
9. Panel producenta: `isProducerManagedFamily` w każdej akcji zmieniającej produkt producenta (lista w AC-19, jedna wspólna kontrola przy odczycie produktu po `producerId`), oznaczenie "Zarządza ModularHub" i brak akcji na `ProducerProductList`, kreator bez tej rodziny, testy odmowy. Spełnia **AC-19**.
10. Testy regresji dla istniejących rodzin i pełny przegląd w przeglądarce na dev w czterech językach. Spełnia **AC-20**.
11. `scripts/export-outdoor-kitchens-prod-sql.ts` i plik `drizzle/_promote_outdoor_kitchens.sql` (produkty, producent, konto, opcje, tłumaczenia, wiersze zdjęć). R2 jest wspólne dla dev i prod, więc wystarczy SQL. Uruchomienie na prod ręcznie przez `scripts/run-sql-file.ts` po migracji z punktu 1. Spełnia **AC-2** na prod.

## Consequences

**Positive**:
- Kuchnie są na stronie szybko, bez budowania kreatora i panelu.
- Typ kuchni w `technicalSpecs` i wymiary jako liczby wystarczą później do filtra i porównywarki bez migracji danych.
- `is_platform_brand` to jedno źródło prawdy dla kolejnych produktów pod marką ModularHub.

**Negative / tradeoffs**:
- Każda zmiana ceny lub danych to zmiana w skrypcie i ponowny import albo ręczny SQL na prod. Nikt nie poprawi danych z panelu.
- Ceny producentów nie mają potwierdzonego netto/brutto, a strona pokazuje je jako netto, jak resztę katalogu. Może trzeba będzie je poprawić po ofertach.
- Przy Premium brakuje szerokości i wysokości, więc te karty pokażą tylko długość.
- Kontrola we wszystkich akcjach producenta to kilka miejsc. Pominięcie jednego otwiera edycję, dlatego jest test na każdą.
- `ALTER TYPE ... ADD VALUE` jest nieodwracalne (Postgres nie ma `DROP VALUE`).

**Neutral**:
- Nowy `pageType` w analityce (`outdoor_kitchen`), zdarzenia PostHog dostają rodzinę automatycznie.
- Strona kategorii nie ma koszyka zapytań na wiele produktów. Zapytanie wysyła się ze strony produktu.

## Follow-up

- [ ] Potwierdzić u producentów netto/brutto i pełne wymiary zestawów Premium, potem zaktualizować dane skryptem.
- [ ] Gdy kuchni będzie więcej niż kilkanaście: filtrowanie w zapytaniu do bazy zamiast po wczytanej liście, filtr producenta i `/compare?kind=outdoor-kitchen` (wzorzec spec 0068). Filtr typu, ceny i sortowanie są już w AC-14.
- [ ] Progi ceny (5 000, 7 500, 10 000 €) są dobrane do katalogu 2026. Przy nowych produktach sprawdzić, czy nadal dzielą listę sensownie.
- [ ] Dopisać rodzinę do scope (`docs/scope/`), jeśli ma być śledzona jak inne funkcje.
- [ ] Po wdrożeniu `/sync` dopisze do `AGENTS.md` regułę o `is_platform_brand` i rodzinie bez edycji producenta.
