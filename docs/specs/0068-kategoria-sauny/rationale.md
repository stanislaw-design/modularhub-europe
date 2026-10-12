# 0068. Rationale: Strona kategorii Sauny

## Context

Adres `/{locale}/sauna` zwraca dziś 404. Istnieje wyłącznie `app/[locale]/(customer)/sauna/[slug]/page.tsx` (spec 0061), a nie ma `sauna/page.tsx`. Klient, który próbuje wejść w kategorię (z pamięci, z linku, z wyszukiwarki), trafia w ścianę, mimo że dwa realne produkty (Kora Relax 550 i Wooden Dream House Qube) i kilkanaście kolejnych modeli już są w bazie.

Wyniki wyszukiwania `/results` już obsługują sauny: `family=spa-modulowe&spaSubcategory=sauna` jest parsowane przez `parseResultsSearchParams`, filtrowane w `getProjects`, a `ResultCard` rozpoznaje saunę (`isSauna`). Brakuje więc trzech rzeczy: własnego adresu kategorii, filtrów dopasowanych do sauny i porównania. Dwa istniejące mechanizmy nie pasują wprost:

- Filtr ceny w `/results` używa progów 50 000 do 250 000 EUR, czyli skali domów. Sauny kosztują kilka do kilkunastu tysięcy EUR, więc ten filtr jest dla nich bezużyteczny.
- Porównanie (`/compare`, spec 0044) przyjmuje wyłącznie domy: strona sprawdza `project.family === "dom"`, a `ResultsSelection` ma `showCompare = family === "dom"`. Tabela `ProjectCompareTable` mówi o planie piętra i kosztach budowy.

Ograniczenia: dane techniczne sauny już mają typowany kształt (`saunaSpecsShape`, spec 0061) z liczbą miejsc, drewnem, ławkami, izolacją, przeszkleniem i wymaganiami elektrycznymi. Reguła projektu mówi, że stan interfejsu przeżywający zmianę trasy idzie przez parametry URL. Cel biznesowy to mieć kategorię gotową, zanim dojdą kolejni producenci.

## Options considered

### Option A: Przekierowanie `/sauna` na `/results` z filtrami

Plik `sauna/page.tsx` wywołuje `redirect()` do `/results?family=spa-modulowe&spaSubcategory=sauna`.

**Pros**:
- Jeden plik, kilka minut pracy.
- Zero duplikacji, wszystko działa tak jak dziś.

**Cons**:
- Adres w pasku zmienia się na `/results`, więc `/sauna` nie jest prawdziwą kategorią: nie ma własnego H1, tytułu ani canonical.
- Słabe SEO: nie da się wskazać `/sauna` jako strony do indeksowania.
- Nie rozwiązuje filtrów specyficznych dla sauny ani porównania.

### Option B: Dedykowana strona kategorii `/sauna` oparta na wspólnym zapytaniu i kartach

Własna trasa z własnym nagłówkiem, wstępem, filtrami sauny i SEO, ale z tym samym `getProjects` i tymi samymi `ResultsSelection`/`ResultCard` pod spodem. Porównanie przez rozszerzenie `/compare` o rodzinę.

**Pros**:
- Prawdziwy adres kategorii z własnym SEO (canonical, hreflang, JSON-LD, breadcrumb).
- Filtry dobrane do sauny, w URL, zgodnie z regułą projektu.
- Brak duplikacji kart i zapytań, więc zmiana karty działa w obu miejscach.
- Wzór da się powtórzyć dla innych kategorii "więcej niż dom" bez dużego refaktoru.

**Cons**:
- Najwięcej pracy z trzech opcji (kilkanaście zadań w trzech etapach).
- Dwie ścieżki do tych samych saun (`/results` i `/sauna`), które mogą się rozjechać.
- `ResultsSelection` i `CompareSelectionBar` dostają dodatkowe opcjonalne propsy.

### Option C: Dynamiczny segment `app/[locale]/(customer)/[category]/page.tsx`

Jedna trasa `/[category]` mapowana przez `FAMILY_GROUPS` i podkategorie na rodzinę i filtr.

**Pros**:
- Najbardziej skalowalne: jedna trasa obsługuje sauny, jacuzzi, kontenery, outdoor tv.
- Najmniej plików przy dodawaniu kolejnych kategorii.

**Cons**:
- Kolizje z istniejącymi segmentami (`results`, `project`, `panel`, `producer`, `internal`, `compare`, `login`…), więc potrzebny strażnik i dokładne testy.
- `outdoor-tv` i `sauna` mają już własne trasy `[slug]`, więc trzeba by uzgodnić dwa różne kształty adresów.
- Projektowanie pod kategorie, których jeszcze nie ma (jacuzzi bez realnego producenta, spec 0061 świadomie je pominął). Przedwczesne uogólnienie.

## Rationale

Wybór: **Option B**. Rozstrzygają trzy siły z Context.

Po pierwsze, problem jest o adres i o doświadczenie kategorii, a nie o brak danych. Option A usuwa sam 404, ale nie daje ani prawdziwej strony do indeksowania, ani miejsca na filtry i porównanie, więc po kilku tygodniach wracamy do tego samego tematu. Zostaje jednak dobrym pierwszym krokiem: etap 1 Option B jest w praktyce jej lepszą wersją, bo kosztuje niewiele więcej, a daje H1 i SEO.

Po drugie, dane i zapytania już istnieją. Zero migracji i ponowne użycie `getProjects`, `ResultsSelection` i `ResultCard` sprawiają, że koszt Option B jest dużo mniejszy, niż wygląda. Option C wymagałaby tej samej pracy plus uogólnienia, którego dziś nikt nie potrzebuje: jedyna kategoria, która ma realnych producentów, to sauny. Gdy jacuzzi czy kontenery dostaną producentów, wzór z Option B (mapa wierszy porównania, opcjonalne propsy, osobny parser filtrów) pozwala dojść do Option C bez przepisywania.

Po trzecie, ryzyko regresji. Rozszerzenia `getProjects` i `ResultsSelection` są opcjonalne i wstecznie zgodne, a filtry sauny mają własny parser (`lib/sauna-filters.ts`), zamiast rozbudowywać `ResultsFilter` o pola, które mają sens tylko dla jednej kategorii. Dzięki temu `/results` pozostaje nietknięte.

**Decyzje, które podjąłem sam (RECOMMEND)** i ich alternatywy:
- **Własny parser filtrów zamiast rozszerzania `ResultsFilter`.** Alternatywa: dodać `seatingMin` i `producer` do `ResultsFilter`. Odrzucone, bo `parseResultsSearchParams` obsługuje domy, spa i kontenery, a pola specyficzne dla jednej kategorii by go rozdęły (ten sam powód, dla którego `ResultsFilter` już zawiera cztery pola tylko dla domów i to bywa mylące).
- **Filtr miejsc przez `CASE WHEN jsonb_typeof(...) = 'number'`.** Alternatywa: zwykłe rzutowanie `::int`. Odrzucone, bo jeden zły rekord (tekst w jsonb) wywraca zapytanie całej listy. Wolę zgubić jeden produkt z filtra niż całą stronę.
- **Producent po id (uuid).** Alternatywa: slug producenta. Tabela `producer` nie ma sluga, a dodanie go to migracja, której ta specyfikacja unika. Id jest brzydkie w adresie, ale stabilne.
- **`noindex` dla widoków z filtrami i canonical na `/sauna`.** Alternatywa: indeksować każdą kombinację. Odrzucone, bo każda kombinacja to cienka, zduplikowana strona. Sama kategoria jest tym, co chcemy w wynikach wyszukiwania.
- **Strona renderuje własny H1, a `ResultsSelection` dostaje `hideHeader`.** Alternatywa: slot `heading` w środku `ResultsSelection`. Odrzucone po cross checku: przy pustej liście komponent robi wczesny return bez nagłówka, więc slot zniknąłby razem z jedynym `<h1>`.
- **Parametr `kind` w `/compare` zamiast `family`.** URL niesie rodzaj porównania (`dom`, `sauna`), a nie rodzinę, bo jacuzzi to ta sama rodzina `spa-modulowe` i nie powinno po cichu dostać tabeli saun. Alternatywa: `family=spa-modulowe` plus podkategoria, odrzucone jako dwa parametry na jedno pojęcie.
- **Chip "Sauny" jako jawny wyjątek od `FAMILY_GROUPS`.** (Spec 0060 AC-4 mówi, że chipy są sterowane z `FAMILY_GROUPS`, więc wyjątek jest opisany i skomentowany w kodzie.)
- **Link "Sauny" jako osobny chip w `SearchCard`.** W sekcji "Więcej niż dom" hero linki dziś prowadzą do rodzin (`results?family=spa-modulowe` itd.), a nie do podkategorii, więc nie ma istniejącego linku "Sauny" do przepięcia. Dodaję osobny chip "Sauny" obok "Spa modułowe". Alternatywa: przepiąć "Spa modułowe" na `/sauna`. Odrzucone, bo spa to też jacuzzi i wellness combo, a one nie mają jeszcze swojej strony.
- **Sitemap poza zakresem.** Użytkownik wskazał sitemapę jako miejsce linkowania, ale w projekcie nie ma `sitemap.ts` ani `robots.ts`. Zbudowanie ich to osobna funkcja o zasięgu całego serwisu, więc idzie do Follow-up, zamiast rosnąć po cichu ponad zakres tej specyfikacji.

Ustalenia użytkownika z rozmowy projektowej (traktowane jako stałe wymagania): etapowanie 3 etapami, `/results` zostaje bez zmian, filtry to liczba miejsc, cena i producent (rodzaj pieca odłożony), progi cen osobne dla saun, chipy minimum 2+/4+/6+/8+, chipy producentów z listy z bazy, porównanie do 3 saun przez rozszerzenie `/compare`, lista reużywa `ResultsSelection`, JSON-LD `ItemList`, pusty stan z `EmptyResults` (200, nigdy 404).

## References

**Project sources**:
- `AGENTS.md`: stan UI w parametrach URL, asynchroniczne funkcje dostępu do danych, trasy w `app/[locale]/(customer)/`
- `docs/specs/0061-strona-produktu-sauna/index.md`: `saunaSpecsShape`, trasa `/sauna/[slug]`, `resolveProductHref`
- `docs/specs/0044-porownywalna-oferta-domow/index.md`: wzorzec porównania, kolumna "niedostępne" (AC-10)
- `docs/specs/0026-dopracowanie-wyszukiwania-i-wynikow/index.md`: filtry w URL, chipy, reguła cen "od"
- `docs/specs/0060-podkategorie-wiecej-niz-dom-hero/index.md`, `lib/product-family-groups.ts`: `FAMILY_GROUPS`, `SearchCard`
- `lib/data/projects.ts` (`getProjects`), `lib/results-filters.ts`, `components/klient/ResultsSelection.tsx`, `components/klient/SubcategoryFilterBar.tsx`, `app/[locale]/(customer)/compare/page.tsx`

**Practices & standards**:
- Canonical URL i `noindex` dla stron z filtrami (kontrola zduplikowanej treści)
- Schema.org `ItemList` dla stron kategorii
- Rozszerzanie przez parametry opcjonalne, wstecznie zgodnie (zasada otwarte/zamknięte)
- Brak przedwczesnej optymalizacji (bez indeksu na jsonb, dopóki nie ma zmierzonego problemu)

**Links**: none verified (nie sprawdzano sieci w tej rozmowie).
