# 0073 część A. Treść i dane strony głównej

## Summary

Siedem poprawek treści strony głównej, które dziś wprowadzają w błąd: kraje po polsku w każdym języku, pole Budżet bez działania, wymyślony przykład zgodności bez oznaczenia, martwy przycisk, ceny zawsze w polskim formacie, dane realizacji wpisane w komponent i zakomentowane sekcje. Każda poprawka jest mała i niezależna. Kryteria AC-1 do AC-7 są w [index.md](index.md).

## Design

**Kraje (AC-1)**
- `lib/data/fixtures/countries.ts` zostaje z kodami PL, DE, NL (pole `name` zostaje jako polski fallback, żeby nie zmieniać typu `Country`).
- `lib/data/countries.ts`: `getCountries(locale: Locale = "pl")` buduje `name` z `new Intl.DisplayNames([locale], { type: "region" }).of(code)`. Bez argumentu zwraca polskie nazwy, więc pozostali wywołujący (inquiry, results, rejestracja i inne) działają bez zmian i mogą przejść na język stopniowo.
- `app/[locale]/(customer)/page.tsx` przekazuje `locale`. Nazwa kraju produkcji w `PopularHomes` dziedziczy to z listy krajów.
- Jeśli `Intl.DisplayNames` zwróci `undefined`, używamy polskiej nazwy z fixture'a.

**Budżet (AC-2)**
- W `SearchCard.tsx` zakresy: `any`, `upTo50k`, `50to100k`, `100to150k`, `150to250k`, `over250k`. Każdy ma pole `priceMin` i `priceMax` zgodne z `PRICE_THRESHOLDS` (50000, 100000, 150000, 250000), wartości w euro.
- `handleSearch` dopisuje `priceMin` i `priceMax` do `URLSearchParams`, gdy zakres ich ma. Stare klucze `100to200k` i `over200k` znikają z czterech katalogów, dochodzą `100to150k`, `150to250k`, `over250k` (etykiety w euro, w każdym języku).
- Komentarz "Mock ranges only" w komponencie jest usuwany.
- Ostrożność: przed zmianą sprawdzić w `lib/results-filters.ts`, czy `priceMin` i `priceMax` działają przy `family` innej niż `dom`. Budżet pokazuje się tylko w zakładce "Dom", więc zakres wystarczy dla tej rodziny.

**Dane realizacji (AC-3)**
- Nowy `lib/data/featured-showcase.ts` eksportuje typowany obiekt `FEATURED_SHOWCASE` z polami: `facts` (inwestor, producent, liczby), `gallery` (plik i klucz tłumaczenia). Komponent importuje go zamiast stałych `GALLERY`, `FACT_KEYS`, `FACT_VALUES`.
- Wygląd i klucze tłumaczeń bez zmian. Istniejący `FeaturedProjectShowcase.test.tsx` ma przechodzić bez zmiany asercji.

**Plakietka przykładu (AC-4)**
- Nowy klucz `ComplianceEngineShowcase.exampleBadge` ("Przykład ilustracyjny" i trzy tłumaczenia). Plakietka stoi w prawym górnym rogu karty, tekstowa (nie sam kolor), w kontraście zgodnym z paletą v5. Karta dostaje `aria-label` z tym samym tekstem.

**Przycisk producentów (AC-5)**
- Usuwamy `<button disabled>` z `ProducerShowcase.tsx` i klucz `viewAllButton` z czterech katalogów. Układ nagłówka sekcji upraszcza się do jednej kolumny.

**Format cen (AC-6)**
- Nowy `lib/format-price.ts`: `formatPriceEur(value: number, locale: string): string` na `Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })`. Używają go `PopularHomeCard.tsx` i `CompareHomesTeaser.tsx` (oba dziś mają stały `Intl.NumberFormat("pl-PL")`). `CompareHomesTeaser` już dostaje `locale`, `PopularHomeCard` dostanie go z `PopularHomes`.
- Testy komponentów aktualizują oczekiwany tekst ceny (polski format waluty zmienia się z "129 000 €" na wynik `Intl`, w Node bywa ze spacją nierozdzielającą, więc test porównuje przez ten sam helper).

**Wyłączone sekcje (AC-7)**
- W `page.tsx` jedna stała `HOME_SECTIONS = { categoryShowcase: false, testimonials: false } as const` z komentarzem, kiedy które wracają (kategorie: decyzja produktowa, opinie: gdy będą prawdziwe treści). Importy są zwykłe, renderowanie warunkowe `{HOME_SECTIONS.testimonials ? <Testimonials /> : null}`.

**Key invariants**
- Żaden komponent strony głównej nie zawiera już polskiego tekstu na sztywno w ścieżce widocznej w innym języku (poza nazwami własnymi i danymi realizacji).
- Ścieżki `/results` otrzymują tylko dopuszczone progi cen, więc `parsePriceValue` nie odrzuci parametrów z wyszukiwarki.

**Critical test scenarios**
- `/de`: lista krajów w `SearchCard` zawiera "Deutschland", verifies **AC-1**.
- Wybór "50 do 100 tys." i Szukaj prowadzi do `/de/results?country=...&priceMin=50000&priceMax=100000`, verifies **AC-2**.
- Wybór "dowolny" nie dodaje parametrów cen, verifies **AC-2**.
- Zmiana pliku danych realizacji zmienia render bez zmiany komponentu, verifies **AC-3**.
- Plakietka jest w drzewie dostępności w czterech językach, verifies **AC-4**.
- Brak przycisku "Zobacz wszystkich producentów", verifies **AC-5**.
- Cena w `/en` i `/de` formatuje się inaczej niż w `/pl`, verifies **AC-6**.
- Przy obu flagach `false` strona nie renderuje obu sekcji, verifies **AC-7**.

## Rationale (krótko)

Każda poprawka jest najmniejszą zmianą usuwającą wprowadzanie w błąd. Wszystkie zgodne z decyzjami zamawiającego z rozmowy projektowej 2026-10-19.
