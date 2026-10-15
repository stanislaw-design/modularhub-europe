# 0071. Pasek filtrów dla rodziny Outdoor TV

**Date**: 2026-10-13
**Status**: In Progress

## Summary

Pasek wyszukiwania na stronie wyników jest dziś jeden dla wszystkich rodzin i filtruje po metrażu domu, kraju i cenie. Dla Outdoor TV (telewizory i szafy z windą MirageVision) dwa pola nic nie robią, a pole kraju ukrywa większość produktów. Ta specyfikacja zastępuje pasek dla tej rodziny własnym: chipy "sposób montażu" i "przeznaczenie" (cień, częściowe słońce, pełne słońce) oraz słowo kluczowe. Wartości filtrów trafiają do dwóch nowych kolumn w tabeli `product`, a nagłówek przestaje mówić "szafek".

## Requirements

**User stories**:
- Jako klient oglądający Outdoor TV chcę zawęzić listę do telewizorów na ścianę albo do szaf z windą, żeby widzieć tylko to, co pasuje do mojego sposobu montażu.
- Jako klient chcę wskazać, czy telewizor stanie w cieniu, w częściowym słońcu czy w pełnym słońcu, bo od tego zależy, którą serię wybrać.
- Jako klient nie chcę widzieć pól, które nic nie robią (metraż, kraj, cena), ani nagłówka, który nazywa telewizory szafkami.
- Jako zespół ModularHub chcę, żeby nowy produkt Outdoor TV dostawał te dwie wartości przy imporcie, bez ręcznego poprawiania w bazie.

**Acceptance criteria** (kontrakt, każdy punkt sprawdzalny osobno):
- **AC-1**: Dla `family=outdoor-tv` strona `/results` nie renderuje pól Kraj, Metraż od, Metraż do ani Sortuj. Zamiast `ResultsFilterBar` pokazuje pasek z dwiema grupami chipów (sposób montażu, przeznaczenie) i polem słowa kluczowego. Pasek dla pozostałych rodzin i dla grupy `wiecej-niz-dom` nie zmienia się.
- **AC-2**: Chipy w grupie są wielokrotnego wyboru. Wewnątrz grupy działa LUB, między grupami ORAZ, pusta grupa nie filtruje. Stan jest wyłącznie w URL (`?family=outdoor-tv&mounting=na-sciane&mounting=w-szafie-z-winda&purpose=cien`), chipy to prawdziwe linki, a ponowne kliknięcie aktywnego chipa zdejmuje tylko ten chip.
- **AC-3**: Wartości `mounting` i `purpose` spoza listy dozwolonych są po cichu odrzucane (nigdy błąd), tak jak w `parseResultsSearchParams`.
- **AC-4**: Gdy filtr `purpose` jest aktywny, produkty bez wartości przeznaczenia (szafy) nie przechodzą filtra. Gdy `purpose` jest pusty, szafy są widoczne.
- **AC-5**: Dla `family=outdoor-tv` parametry `country`, `sizeMin`, `sizeMax`, `priceMin`, `priceMax` i `sort` nie wpływają na wynik (nie ukrywają produktów). Zapytanie o produkty ignoruje je tak samo jak dziś ignoruje filtry domów dla innych rodzin.
- **AC-6**: Kolejność wyników dla `outdoor-tv` jest stała: najpierw produkty z przeznaczeniem w kolejności cień, częściowe słońce, pełne słońce, potem produkty bez przeznaczenia, a w obrębie grupy alfabetycznie po nazwie.
- **AC-7**: Nagłówek wyników dla `outdoor-tv` brzmi "N produkt/produkty/produktów Outdoor TV" z poprawną polską odmianą (oraz odpowiednikiem w en, de, nl) i nie mówi o szafkach. Podpowiedź pod nagłówkiem nie odsyła do wyboru kraju.
- **AC-8**: Tabela `product` ma dwie nowe nullable kolumny tekstowe, `outdoor_tv_mounting` (`na-sciane`, `w-szafie-z-winda`) i `outdoor_tv_sun_exposure` (`cien`, `czesciowe-slonce`, `pelne-slonce`), z ograniczeniami CHECK. Baza odrzuca wartość spoza listy oraz każdą z tych kolumn ustawioną dla rodziny innej niż `outdoor-tv`.
- **AC-9**: Dotychczasowe produkty Outdoor TV na dev mają wartości po migracji: Silver (`na-sciane`, `cien`), Gold (`na-sciane`, `czesciowe-slonce`), Platinum Series (`na-sciane`, `pelne-slonce`), Premium Lift, Custom Lift i Econo Lift (`w-szafie-z-winda`, bez przeznaczenia).
- **AC-10**: Skrypty `scripts/import-miragevision-tv.ts` i `scripts/import-miragevision-lift.ts` ustawiają obie kolumny, więc ponowny import nie zeruje wartości.
- **AC-11**: Słowo kluczowe działa razem z chipami (ORAZ), ta sama logika wyszukiwania pełnotekstowego co dziś.
- **AC-12**: Wszystkie nowe napisy (etykiety grup i chipów, nagłówek, podpowiedź, opis dla czytników ekranu) istnieją w pl, en, de i nl, a `npm run check:translations` zgłasza zero braków.
- **AC-13**: Aktywny chip ma `aria-current`, wszystkie chipy działają z klawiatury, na telefonie pasek jest dostępny bez poziomego przewijania całej strony. Gdy wynik jest pusty, pokazuje się istniejący stan pusty z linkiem czyszczącym filtry.

## Decision

**Chosen option**: Opcja 1 (patrz [rationale.md](rationale.md)): dwie kolumny tekstowe z CHECK na `product` plus osobny pasek chipów dla `outdoor-tv` na stronie wyników.

Dla `family=outdoor-tv` strona wyników renderuje `OutdoorTvFilterBar` zamiast `ResultsFilterBar`. Filtry czytają dwie nowe kolumny, a cała logika adresu, parsowania i kolejności siedzi w nowym `lib/outdoor-tv-filters.ts`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Powód wyboru i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch** (zmiana tabeli `product`, brak nowych tabel):

| Kolumna | Typ | Wartości | Null |
|---|---|---|---|
| `outdoor_tv_mounting` | text | `na-sciane`, `w-szafie-z-winda` | tak |
| `outdoor_tv_sun_exposure` | text | `cien`, `czesciowe-slonce`, `pelne-slonce` | tak |

Ograniczenia CHECK (tekst z CHECK zamiast enuma Postgresa, bo enum jest nieodwracalny, ta sama zasada co przy `floor_level`):
- `product_outdoor_tv_mounting_values`: wartość NULL albo jedna z dwóch dozwolonych.
- `product_outdoor_tv_sun_exposure_values`: wartość NULL albo jedna z trzech dozwolonych.
- `product_outdoor_tv_family_match`: obie kolumny mogą mieć wartość tylko, gdy `family = 'outdoor-tv'` (ta sama idea co `product_family_subcategory_match`).

Mapowanie produktów MirageVision (dev, po migracji):

| Produkt | `outdoor_tv_mounting` | `outdoor_tv_sun_exposure` |
|---|---|---|
| Silver | `na-sciane` | `cien` |
| Gold | `na-sciane` | `czesciowe-slonce` |
| Platinum Series | `na-sciane` | `pelne-slonce` |
| Premium Lift, Custom Lift, Econo Lift | `w-szafie-z-winda` | brak |

Indeks nie jest potrzebny: rodzina ma kilkanaście produktów, a filtr działa po `status` i `family` (istniejący indeks), reszta to skan kilku wierszy.

**API surface**: bez nowych endpointów, filtry to parametry URL strony `/[locale]/results`.

| Parametr | Wartości | Wielokrotny | Znaczenie |
|---|---|---|---|
| `family` | `outdoor-tv` | nie | warunek włączenia paska i filtrów (istniejący) |
| `mounting` | `na-sciane`, `w-szafie-z-winda` | tak (powtórzony klucz) | sposób montażu |
| `purpose` | `cien`, `czesciowe-slonce`, `pelne-slonce` | tak (powtórzony klucz) | przeznaczenie |
| `q` | tekst | nie | słowo kluczowe (istniejący) |

Zmiany w kodzie (nazwy z repo):
- `lib/outdoor-tv-filters.ts` (nowy): stałe wartości, `parseOutdoorTvSearchParams`, `buildOutdoorTvHref`, `toggleOutdoorTvValue`, `outdoorTvSortKey` (kolejność z AC-6). Ten sam wzorzec co `lib/sauna-filters.ts`, żeby filtry tej rodziny nie przeciekały do `ResultsFilter`.
- `lib/results-filters.ts`: `ResultsFilter` dostaje opcjonalne `mounting` i `purpose` (tablice), parsowane zawsze, stosowane tylko dla `family === "outdoor-tv"` (ta sama granica co `spaSubcategory`).
- `lib/data/projects.ts` `getProjects()`: dla `family === "outdoor-tv"` dokłada warunki `inArray` na dwóch kolumnach i pomija `country`, `sizeMin`, `sizeMax`, `priceMin`, `priceMax`. `Project` dostaje pola `outdoorTvMounting` i `outdoorTvSunExposure`.
- `lib/db/schema.ts`: dwie kolumny, trzy CHECK, migracja `drizzle/0057_*.sql`.
- `components/klient/OutdoorTvFilterBar.tsx` (nowy, komponent serwerowy): dwie grupy chipów jako `<Link>`, pole słowa kluczowego (formularz GET), aktywny chip z `aria-current`.
- `app/[locale]/(customer)/results/page.tsx`: dla `outdoor-tv` renderuje `OutdoorTvFilterBar` zamiast `ResultsFilterBar` i sortuje przez `outdoorTvSortKey`, pozostałe rodziny bez zmian.
- `components/klient/ResultsHeader.tsx` i `messages/*.json`: nowy rzeczownik "produkt Outdoor TV" dla `ProductFamilyNoun.outdoor-tv` i podpowiedź bez wyboru kraju.

**Key invariants**:
- `outdoor_tv_mounting` i `outdoor_tv_sun_exposure` mają wartość tylko dla `family = 'outdoor-tv'` (CHECK w bazie, nie tylko w aplikacji).
- `mounting` i `purpose` są parsowane niezależnie od rodziny, ale stosowane tylko dla `outdoor-tv` (ta sama granica co spec 0026).
- Filtr `purpose` nigdy nie pokazuje produktu bez przeznaczenia.
- Parametry kraju, metrażu i ceny nie ukrywają produktów `outdoor-tv` (inaczej wracałby błąd, który ukrywa 5 z 7 produktów po wyborze kraju).
- Zmiana nie dotyka `ResultsFilterBar` dla domów, spa modułowych, kontenerów ani grupy `wiecej-niz-dom`.

**Security model**: bez zmian. Strona jest publiczna, filtry to odczyt opublikowanych produktów. Wartości z URL przechodzą przez listę dozwolonych wartości i przez parametryzowane zapytanie Drizzle, więc nie ma wstrzyknięć.

**Configuration required**: brak nowych zmiennych ani sekretów.

**Critical test scenarios** (każdy mapuje się na kryterium):
- Happy path: wejście na `/pl/results?family=outdoor-tv`, kliknięcie "Na ścianę" i "Pełne słońce" zwęża listę do Platinum Series, adres zawiera oba parametry, verifies **AC-1**, **AC-2**
- Wielokrotny wybór: `mounting=na-sciane&mounting=w-szafie-z-winda` daje telewizory i szafy, `purpose=cien&purpose=czesciowe-slonce` daje Silver i Gold, verifies **AC-2**
- Szafy a przeznaczenie: `purpose=cien` nie zwraca żadnej szafy, bez `purpose` szafy są widoczne, verifies **AC-4**
- Zły parametr: `mounting=xyz&purpose=abc` zwraca pełną listę bez błędu, verifies **AC-3**
- Martwe parametry: `country=PL&sizeMin=60&priceMax=50000&sort=price-asc` nie zmienia wyniku dla `outdoor-tv`, verifies **AC-5**
- Kolejność: bez filtrów lista to Silver, Gold, Platinum Series, potem szafy alfabetycznie, verifies **AC-6**
- Nagłówek: 7 wyników mówi "7 produktów Outdoor TV", 1 wynik "1 produkt Outdoor TV", verifies **AC-7**
- Baza: próba zapisu `outdoor_tv_sun_exposure` dla produktu rodziny `dom` albo wartości `pelne` jest odrzucona przez CHECK, verifies **AC-8**
- Import: dwukrotne uruchomienie importu zostawia wartości kolumn, verifies **AC-9**, **AC-10**
- Słowo kluczowe: `q=gold&mounting=na-sciane` zwraca Gold, verifies **AC-11**
- Tłumaczenia i dostępność: `npm run check:translations` czysty, aktywny chip ma `aria-current`, verifies **AC-12**, **AC-13**
- Pozostałe rodziny: `/results?family=dom` i `family=spa-modulowe` renderują stary pasek bez zmian, verifies **AC-1**

## Build plan

Podejście budowy projektu: Tracer Bullet (cienki, kompletny przekrój przez wszystkie warstwy, potem pogrubianie), zgodnie ze specami 0035 i 0056 w epiku Produkcja. Najpierw jedna grupa chipów działa od bazy do ekranu, potem reszta.

1. Migracja `drizzle/0057_*.sql`: dwie nullable kolumny, trzy CHECK i dopisanie do `lib/db/schema.ts`, zastosowanie na `modularhub-dev`, satisfies **AC-8**
2. Skrypt uzupełnienia `scripts/backfill-outdoor-tv-filters.ts` (tylko dev, `assertDevDatabase`): ustawia wartości dla sześciu istniejących produktów po nazwie i rodzinie, satisfies **AC-9**
3. Tracer: `lib/outdoor-tv-filters.ts` z grupą `mounting` oraz warunek w `getProjects()`, pole w `Project`, minimalny `OutdoorTvFilterBar` z jedną grupą na stronie wyników, satisfies **AC-1**, **AC-2**, **AC-3**
4. Pogrubienie: druga grupa `purpose` z regułą wykluczającą szafy, satisfies **AC-2**, **AC-4**
5. Ignorowanie `country`, `sizeMin`, `sizeMax`, `priceMin`, `priceMax`, `sort` dla `outdoor-tv` w `getProjects()` i na stronie, satisfies **AC-5**
6. Stała kolejność `outdoorTvSortKey` użyta na stronie wyników, satisfies **AC-6**
7. Pole słowa kluczowego w pasku i współdziałanie z chipami, satisfies **AC-11**
8. Nagłówek i podpowiedź: nowy rzeczownik w `ProductFamilyNoun`, zmiana `ResultsHeader` dla tej rodziny, satisfies **AC-7**
9. Tłumaczenia pl, en, de, nl dla wszystkich nowych napisów i `npm run check:translations`, satisfies **AC-12**
10. Dostępność i widok mobilny: `aria-current`, klawiatura, zawijanie chipów na wąskim ekranie bez przewijania strony, satisfies **AC-13**
11. Skrypty importu `import-miragevision-tv.ts` i `import-miragevision-lift.ts` ustawiają kolumny z danych katalogu, satisfies **AC-10**
12. Testy: jednostkowe `lib/outdoor-tv-filters.test.ts` (parsowanie, href, kolejność), test warunków w `lib/data/projects` (wzorzec `queries.test.ts`), test komponentu `OutdoorTvFilterBar.test.tsx`, jeden test E2E ścieżki chipów, satisfies **AC-1** do **AC-7**, **AC-11**, **AC-13**
13. Plik `drizzle/_promote_outdoor_tv_filters_to_prod.sql` (migracja i uzupełnienie dla produktów obecnych na prod), wykonanie ręcznie osobnym, jawnym krokiem, satisfies **AC-8**, **AC-9**

## Consequences

**Positive**:
- Pasek odpowiada temu, jak klient naprawdę wybiera: sposób montażu i nasłonecznienie zamiast metrażu domu.
- Zniknęły dwa martwe pola i jedno szkodliwe (kraj, który ukrywał nowe produkty).
- Wartości filtrów są walidowane w bazie, więc błędny ręczny wpis (Neon MCP) nie przejdzie.
- Wzorzec (osobny plik filtrów, chipy jako linki) jest ten sam co dla saun, więc przyszła rodzina dostanie swój pasek tą samą drogą.

**Negative / tradeoffs**:
- Kolejna para kolumn w szerokiej tabeli `product` używana przez jedną rodzinę (tak samo jak `spa_subcategory` i `container_subcategory`).
- Dwa paski do utrzymania (ogólny i Outdoor TV) oraz kod rozgałęziający stronę wyników po rodzinie.
- Nowy produkt Outdoor TV musi dostać obie wartości przy imporcie, inaczej nie przejdzie filtra "przeznaczenie" (szafy tego celowo nie mają).
- Dla produktów z kilkoma przeznaczeniami (Econo według karty jest do cienia i częściowego słońca) jedna wartość jest uproszczeniem, więc Econo nie ma przeznaczenia.

**Neutral**:
- Migracja jest addytywna (nullable kolumny), nie wymaga okna koordynacji, a cofnięcie to usunięcie kolumn i CHECK.
- `ProductFamilyNoun.outdoor-tv` zmienia nazwę z "szafka TV ogrodowa" na "produkt Outdoor TV", co dotyka też grupy i tytułów, jeśli gdzieś są używane.

## Migration plan

**Strategy**: additive, bez okna koordynacji.
**Phases**:
1. Migracja dodaje dwie nullable kolumny i trzy CHECK na dev. Kod, który jeszcze o nich nie wie, działa bez zmian.
2. Skrypt uzupełnia sześć istniejących produktów na dev.
3. Kod filtrów, pasek, nagłówek i tłumaczenia trafiają na dev i są sprawdzane.
4. Osobnym, jawnym krokiem: `_promote_outdoor_tv_filters_to_prod.sql` na prod (migracja i uzupełnienie tylko dla produktów, które tam istnieją).
**Rollback**: usunięcie trzech CHECK i dwóch kolumn oraz powrót do poprzedniej wersji kodu. Nic poza tymi kolumnami nie zależy od nowych danych.
**Risks**: katalog prod różni się od dev (na prod jest dziś Econo, reszta dojdzie przy promocji), więc uzupełnienie musi być po identyfikatorach obecnych na prod, nie "po nazwie wszystkich"; produkt dodany bez wartości znika po wybraniu filtra, dopóki ktoś nie uzupełni kolumn.

## Follow-up

- [ ] Filtr kraju w widoku grupowym `family=wiecej-niz-dom` ("Wszystko") nadal ukrywa produkty bez wierszy `product_country_eligibility`, czyli MirageVision. Do rozstrzygnięcia przy dodawaniu dostawy: wiersze zgodności dla krajów albo wyłączenie filtra kraju dla `outdoor-tv` także w widoku grupowym.
- [ ] Filtr i sortowanie po cenie dla Outdoor TV wrócą, gdy produkty dostaną ceny (osobny spec, razem z regułą dla "cena na zapytanie").
- [ ] Chip "przekątna ekranu" został poza zakresem na życzenie. Dziś przekątne są tylko w etykietach wariantów, więc potrzebowałby osobnej kolumny albo tabeli.
- [ ] Wiele przeznaczeń na jednym produkcie (Econo: cień i częściowe słońce) wymaga tablicy zamiast jednej kolumny, jeśli kiedyś okaże się potrzebne.
- [ ] Schemat Zod dla `technicalSpecs` rodziny `outdoor-tv` (follow up spec 0056 AC-7) zostaje nierozstrzygnięty. Ta zmiana go nie wymaga.
- [ ] Panel admina produktów (`app/[locale]/internal/products/`) nie edytuje jeszcze obu kolumn. Dopóki nie ma tam pola, zmiana idzie skryptem lub przez Neon MCP.
- [ ] Zdecydować o przyszłym chipie "Akcesoria" w grupie sposobu montażu, gdy wejdą uchwyty i piloty.
