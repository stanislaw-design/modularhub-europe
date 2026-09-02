# 0022. Rodziny produktów i kategorie (domy, spa modułowe, pergole)

**Date**: 2026-09-02
**Status**: Accepted

## Summary

Dzisiejszy model danych zakłada jedną rodzinę produktu (dom) w ukryty sposób: pole `category` niesie tylko warianty cyklu życia domu, a osiem osobnych kolumn niesie techniczne dane domu (ściany, izolacja, odporność ogniowa). Ta decyzja dodaje jawne pole rodziny produktu (dom, spa modułowe, pergola), niezależne od `category`, ustala podkategorie dla każdej rodziny, i zmienia sposób przechowywania danych technicznych tak, żeby pasował do wszystkich trzech rodzin naraz. Zmienia też kolejność kroków w kreatorze producenta i spisuje, które kontrole zgodności prawnej (silnik zgodności) różnią się między rodzinami, bez budowania tego silnika teraz.

## Requirements

**User stories**:
- Jako producent, chcę sklasyfikować mój produkt rodziną i podkategorią, żeby kupujący trafiali na właściwy rodzaj produktu.
- Jako producent, chcę żeby kreator pytał mnie tylko o dane techniczne pasujące do rodziny mojego produktu, a nie o izolację ścian przy pergoli.
- Jako odwiedzający stronę główną, chcę widzieć prawdziwe kategorie i prawdziwe liczby produktów, żeby ufać, że katalog jest realny.
- Jako inżynier budujący na tym później (funkcja 7, ręczne zasiewanie danych przez Neon MCP), chcę żeby baza danych sama pilnowała spójności rodziny i podkategorii, bo ręczny insert SQL nie przejdzie przez walidację aplikacji.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: `product` ma kolumnę `family` (dom / spa-modulowe / pergola), `NOT NULL`, bez wartości domyślnej, niezależną od `category`. Ponieważ tabela ma dziś 0 wierszy (sprawdzone bezpośrednio w bazie, patrz Migration plan), migracja nie potrzebuje wartości domyślnej do backfillu; każdy przyszły insert, w tym ręczny insert funkcji 7 przez Neon MCP, musi jawnie podać `family`.
- **AC-2**: Żadne z pól `category` / `spaSubcategory` / `pergolaSubcategory` nie może być wypełnione dla rodziny, do której nie pasuje (np. `pergolaSubcategory` niepuste przy `family != 'pergola'` jest niemożliwe). Egzekwuje to ograniczenie `CHECK` w Postgresie, nie tylko walidacja aplikacji, bo funkcja 7 wstawia wiersze ręcznie przez Neon MCP, mijając kod aplikacji. Wymagalność dokładnie jednego wypełnionego pola podkategorii (dla `family = 'pergola'`, `pergolaSubcategory` musi być wypełnione) zostaje po stronie aplikacji, tak jak dziś dla innych pól wymaganych dopiero od `status = 'published'` (patrz AC-4, ta sama konwencja).
- **AC-3**: Podkategorie per rodzina są ustalone w tej decyzji: `dom` zachowuje dzisiejsze 3 wartości bez zmian; `spa-modulowe` dostaje `sauna` / `jacuzzi` / `wellness-combo`; `pergola` dostaje `bioklimatyczna` / `aluminiowa-stala` / `drewniana` / `wolnostojaca-przyscienna`.
- **AC-4**: `technicalSpecs` (jsonb, nullable jak inne pola techniczne w tej tabeli) niesie pola techniczne właściwe rodzinie (patrz Feature design). Kształt jest walidowany schematem Zod, po stronie formularza kreatora i po stronie zapisu do bazy.
- **AC-5**: Dzisiejsze 8 płaskich kolumn technicznych domu (`wallBuildUp`, `insulation`, `heatTransferCoefficients`, `windowClass`, `ventilation`, `heatSource`, `fireResistance`, `windResistance`) znika z `product`; ich miejsce przejmuje `technicalSpecs` dla `family = dom`.
- **AC-6**: Krok 1 kreatora producenta (`podstawowe`) zbiera `family` i podkategorię, zanim pojawi się jakikolwiek krok techniczny. Dzisiejsze trzy kroki techniczne domu (`konstrukcja`, `instalacje`, `odpornosc`) zwijają się w jeden krok techniczny, którego pola zależą od wybranej rodziny.
- **AC-7**: Rodziny nie można zmienić po utworzeniu produktu. Ścieżka edycji (spec 0016) nie pokazuje selektora rodziny, i akcja serwerowa obsługująca edycję produktu ignoruje/odrzuca pole `family` w payloadzie aktualizacji, więc ukrycie w UI nie jest jedyną linią obrony.
- **AC-8**: `CategoryShowcase` czyta prawdziwe liczby produktów per rodzina/podkategoria z nowej funkcji `getProductFamilyCounts()` zamiast dzisiejszej wpisanej na sztywno tablicy. Funkcja liczy tylko produkty ze `status = 'published'` i dopełnia zerem każdą z trzech rodzin, której `GROUP BY` nie zwrócił (rodzina z zerem produktów nadal pokazuje swoją kartę, z liczbą 0). Karty linkują dalej do dzisiejszego, nieprzefiltrowanego `/wyniki` (prawdziwe filtrowanie po rodzinie to zadanie funkcji 8).
- **AC-9**: `CategoryFilterBar` pozostaje nietknięty przez tę funkcję (dokładnie tak dekoracyjny/wyłączony jak dziś).
- **AC-10**: Spec spisuje, per rodzina, które kategorie kontroli zgodności/analizy działki mają zastosowanie (patrz Feature design, Kategorie kontroli zgodności), jako decyzję do wdrożenia przez funkcję 14. Ta funkcja nie zmienia kodu ani fixture'ów silnika zgodności.

## Options considered

### Option 1: Pole `family` + osobna kolumna podkategorii per rodzina + wspólny `technicalSpecs` jsonb (wybrane)

Nowe pole `family` klasyfikuje produkt. Każda rodzina ma własną, typowaną kolumnę podkategorii (`category` zostaje jak dziś, tylko ograniczona do `family = dom`; `spaSubcategory` i `pergolaSubcategory` są nowe). Dane techniczne, które różnią się kształtem między rodzinami, trafiają do jednej kolumny `jsonb`, walidowanej w aplikacji przez Zod.

**Pros**:
- Klasyfikacja (rodzina, podkategoria) zostaje w pełni typowana przez Postgresa (enumy), bo to pola po których się filtruje i po których baza ma pilnować spójności.
- Dodanie czwartej rodziny nie wymaga migracji istniejących kolumn technicznych, tylko rozszerzenia enuma `family` i gałęzi w schemacie Zod.
- Zero ryzyka utraty danych: `product` ma dziś 0 wierszy (sprawdzone bezpośrednio w bazie Neon, 2026-09-02).

**Cons**:
- `technicalSpecs` traci typowanie na poziomie kolumny Postgresa; poprawność zależy od zgodności schematu Zod ze stanem bazy, nie od gwarancji bazy danych.

### Option 2: Jedno uniwersalne pole podkategorii + płaskie kolumny per rodzina dopisywane w miarę potrzeb

Zamiast osobnych kolumn `spaSubcategory`/`pergolaSubcategory`, jedno pole tekstowe/enum `subcategory`, którego dozwolone wartości zależą od `family`. Dane techniczne zostają płaskimi kolumnami jak dziś, dopisywanymi dla każdej nowej rodziny.

**Pros**:
- Najmniejsza zmiana względem dzisiejszego schematu; brak nowej zależności (Zod niepotrzebny, walidacja podkategorii może zostać w aplikacji tak jak dziś).

**Cons**:
- Traci typowanie enum per rodzina (jedna kolumna `text` musi pomieścić wartości ze wszystkich rodzin naraz).
- Każda nowa rodzina dopisuje kolejny zestaw nullable kolumn do `product`, tabela rośnie bez końca (dziś już ma ~30 pól).

### Option 3: W pełni znormalizowane tabele per rodzina (`house_specs`, `spa_specs`, `pergola_specs`)

Osobna tabela 1:1 z `product` dla każdej rodziny, każda z własnymi, typowanymi kolumnami.

**Pros**:
- Najsilniejsze typowanie: każde pole techniczne ma swój prawdziwy typ Postgresa i może mieć własne ograniczenia `CHECK`.

**Cons**:
- Najcięższa migracja i najcięższy build teraz, dla rodzin (spa, pergola) bez jeszcze jednego prawdziwego producenta do zwalidowania kształtu danych.
- Każdy odczyt produktu wymaga joina do właściwej tabeli specyfikacji, warunkowego na `family`.

## Decision

**Chosen option**: Option 1: Pole `family` + osobna kolumna podkategorii per rodzina + wspólny `technicalSpecs` jsonb

Rodzina produktu i jej podkategoria zostają typowanymi kolumnami/enumami w Postgresie, egzekwowanymi ograniczeniem `CHECK`; dane techniczne, które faktycznie różnią się kształtem między rodzinami, trafiają do jednej kolumny `jsonb` walidowanej przez Zod.

**Implementation skills**: `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `adversarial-zod` (`pproenca/dot-skills`, `.agents/skills/adversarial-zod/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (zmiany w `product`, `lib/db/schema.ts`):

| Pole | Typ | Nullable | Uwagi |
|---|---|---|---|
| `family` | `pgEnum('product_family', ['dom','spa-modulowe','pergola'])` | `NOT NULL`, bez wartości domyślnej | nowe; brak wartości domyślnej jest celowy, patrz AC-1 |
| `category` | istniejący `productCategoryEnum` | nullable (bez zmian) | znaczące tylko gdy `family = 'dom'` |
| `spaSubcategory` | `pgEnum('spa_subcategory', ['sauna','jacuzzi','wellness-combo'])` | nullable | nowe; znaczące tylko gdy `family = 'spa-modulowe'` |
| `pergolaSubcategory` | `pgEnum('pergola_subcategory', ['bioklimatyczna','aluminiowa-stala','drewniana','wolnostojaca-przyscienna'])` | nullable | nowe; znaczące tylko gdy `family = 'pergola'` |
| `technicalSpecs` | `jsonb` | nullable (jak inne pola techniczne tej tabeli; wymagane dopiero od `status = 'published'`, tak samo jak dziś) | nowe; kształt zależy od `family`, patrz niżej |

`technicalSpecs`, kształt per rodzina. `family` jest osobną kolumną, nie polem wewnątrz samego JSON, więc `z.discriminatedUnion` (który wymaga dyskryminatora wewnątrz walidowanego obiektu) nie pasuje wprost. Zamiast tego: mapa `Record<Family, ZodObject>`, a wybór właściwego schematu Zod następuje na podstawie wartości kolumny `family` tego wiersza, po stronie formularza kreatora i po stronie zapisu do bazy. Każdy schemat jest `.strict()` (odrzuca nieznane pola) i, przy `status = 'published'`, wymaga wszystkich swoich pól (dopóki `status = 'draft'`, dopuszcza brak):
- `dom`: `wallBuildUp`, `insulation`, `heatTransferCoefficients`, `windowClass`, `ventilation`, `heatSource`, `fireResistance`, `windResistance` (wszystkie opcjonalne stringi, ten sam kształt co dzisiejsze kolumny)
- `spa-modulowe`: `seatingCapacity` (liczba miejsc), `waterVolumeLiters` (litry), `heatingType` (`electric` / `heat-pump` / `wood-fired`), `filtrationSystem` (tekst), `shellMaterial` (tekst), `electricalRequirement` (tekst), `foundationType` (tekst)
- `pergola`: `roofType` (`bioklimatyczny` / `staly` / `rozsuwany`), `roofMaterial` (tekst), `dimensions` (tekst), `windLoadRating` (tekst), `snowLoadRating` (tekst), `glazingType` (tekst), `foundationType` (tekst)

Osiem dzisiejszych płaskich kolumn domu (`wallBuildUp`...`windResistance`) znika z `product`; ich pola żyją dalej wewnątrz `technicalSpecs` dla `family = 'dom'`.

**Ograniczenie (CHECK, `product_family_subcategory_match`)**:
```sql
CHECK (
  (category IS NULL OR family = 'dom') AND
  (spa_subcategory IS NULL OR family = 'spa-modulowe') AND
  (pergola_subcategory IS NULL OR family = 'pergola')
)
```
Pilnuje, że podkategoria niepasująca do rodziny nigdy nie trafi do bazy, nawet przy ręcznym insercie SQL (np. `family = 'dom'` z niepustym `pergola_subcategory` jest niemożliwe). Celowo NIE wymusza, że dokładnie jedno pole podkategorii jest wypełnione, tylko że żadne nie jest wypełnione niewłaściwie: wszystkie trzy puste nadal przechodzą (wiersz w trakcie wypełniania, `status = 'draft'`). Pełna wymagalność (dokładnie jedno wypełnione, zgodnie z `family`) zostaje po stronie aplikacji, jak dziś dla pozostałych pól wymaganych dopiero od `status = 'published'`, patrz `lib/db/schema.ts:227-229`, spec 0018 (zbyt wiele warunkowo wymaganych pól na jeden `CHECK`). Ta wąska niesprzeczność (4 kolumny, jedna reguła "nie mieszaj rodzin") to celowy, ograniczony wyjątek od tamtej konwencji, uzasadniony konkretnym scenariuszem: funkcja 7 wstawia wiersze ręcznie przez Neon MCP, mijając każdą walidację aplikacji, a ta reguła jest jedyną, którą baza może i powinna pilnować sama.

**Dostęp do danych** (to nie jest publiczne REST API; wewnętrzne funkcje dostępu do danych):
| Funkcja | Gdzie | Wejście | Wyjście | Autoryzacja |
|---|---|---|---|---|
| `getProductFamilyCounts()` | `lib/db/queries.ts`, nowa | brak | `{family, subcategory, count}[]`, dopełnione zerem dla każdej z 3 rodzin bez wiersza | publiczna, filtruje po `status = 'published'`, zasila `CategoryShowcase` na stronie głównej |
| ścieżka zapisu kreatora | istniejąca akcja serwerowa kreatora, rozszerzona | `family`, podkategoria, `technicalSpecs` | zapisany/zaktualizowany `product` | producent, właściciel produktu (bez zmian względem dziś) |

**Kluczowe niezmienniki**:
- `family` jest niezmienna po utworzeniu produktu, egzekwowane zarówno w UI (brak selektora w edycji) jak i po stronie serwera (akcja aktualizacji ignoruje/odrzuca `family` w payloadzie) (AC-7).
- Żadne z `category`/`spaSubcategory`/`pergolaSubcategory` nie jest wypełnione dla rodziny, do której nie pasuje, egzekwowane przez `CHECK` na poziomie bazy (AC-2). Że dokładnie jedno jest wypełnione (nie zero), to wymóg publikacji, egzekwowany po stronie aplikacji jak inne pola wymagane od `status = 'published'`.
- `technicalSpecs` musi być niepuste i zgodne (`.strict()`, wszystkie pola obecne) ze schematem Zod właściwym dla `family`, zanim `status` przejdzie z `draft` na `published` (poziom aplikacji, ta sama konwencja co dziś dla pozostałych pól tej tabeli). Ten poziom walidacji chroni tylko zapisy idące przez aplikację; ręczny insert SQL (funkcja 7, przez Neon MCP) omija Zod całkowicie, patrz Follow-up.

**Model bezpieczeństwa**: bez zmian względem dziś. Odczyt `product` (w tym nowa `getProductFamilyCounts()`) zostaje publiczny, zasila publiczną stronę główną i katalog. Zapis zostaje ograniczony do producenta będącego właścicielem produktu, jak dziś.

**Konfiguracja**: brak nowych zmiennych środowiskowych.

**Kategorie kontroli zgodności per rodzina** (decyzja, dokumentacja na potrzeby funkcji 14 "Realny silnik zgodności"; ta funkcja nie zmienia kodu silnika ani fixture'ów `plot-analysis.ts`/`eligibility.ts`):
- **dom** (bez zmian): BENG (energochłonność budynku), klasa odporności ogniowej, linie odsunięcia od granicy działki, nośność gruntu pod fundament.
- **pergola** (nowe): próg zwolnienia z formalności, do 35 m² powierzchni zabudowy i maksymalnie 2 takie obiekty na 500 m² działki, bez zgłoszenia i bez pozwolenia (basis: Prawo budowlane, art. 29); powyżej progu, zgłoszenie albo pozwolenie na budowę (basis: Prawo budowlane, art. 30); standardowe linie odsunięcia od granicy działki, tak jak dziś dla domów. Próg pochodzi z researchu na stronach wyjaśniających prawo (nie z bezpośredniego tekstu ustawy), do zweryfikowania wobec aktualnego brzmienia ustawy, gdy funkcja 14 buduje prawdziwy silnik.
- **spa-modulowe** (nowe): pozwolenie na budowę, jeśli produkt jest trwale posadowiony na fundamencie; pozwolenie wodnoprawne przy odprowadzaniu wody (basis: ustawa Prawo wodne, procedura pozwolenia wodnoprawnego); certyfikacja instalacji elektrycznej. Wymogi sanitarne/elektryczne dla użytku współdzielonego lub najmu nie mają jednej, znalezionej w tym researchu ustawy; zostają otwarte, do ustalenia z lokalnym urzędem gminy albo prawnikiem, gdy funkcja 14 buduje prawdziwy silnik dla tej rodziny.

**Kluczowe scenariusze testowe** (każdy odwołuje się do kryterium z `## Requirements`):
- Happy path: producent wybiera `family = pergola` w kroku 1, kreator renderuje krok techniczny pergoli, po zapisie wiersz produktu ma ustawione `pergolaSubcategory`, `category` i `spaSubcategory` puste, `technicalSpecs` zgodne z kształtem pergoli, weryfikuje **AC-3**, **AC-4**, **AC-6**.
- Przypadek błędu: ręczny insert SQL ustawia `family = 'dom'`, ale `pergolaSubcategory` niepuste, baza odrzuca wiersz przez `CHECK`, weryfikuje **AC-2**.
- Edycja: producent otwiera istniejący produkt rodziny `dom` do edycji, selektor rodziny nie jest pokazany ani edytowalny, weryfikuje **AC-7**.
- `CategoryShowcase`: przy zerze produktów rodziny `spa-modulowe` w bazie, karta tej rodziny nadal się renderuje z liczbą 0 i linkuje do `/wyniki`, weryfikuje **AC-8**.

## Build plan

1. Migracja schematu: dodaj enumy i kolumny `family`/`spaSubcategory`/`pergolaSubcategory`, dodaj `technicalSpecs jsonb`, usuń 8 płaskich kolumn technicznych domu, dodaj ograniczenie `CHECK`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**
2. Schematy Zod: dyskryminowana unia dla `technicalSpecs` per rodzina, używana zarówno przez formularz kreatora jak i granicę zapisu po stronie serwera, satisfies **AC-4**
3. Kreator producenta: przenieś `family` i podkategorię do kroku 1 (`podstawowe`); zwiń `konstrukcja`/`instalacje`/`odpornosc` w jeden krok techniczny zależny od rodziny; zablokuj zmianę rodziny w ścieżce edycji, satisfies **AC-6**, **AC-7**
4. `lib/db/queries.ts`: dodaj `getProductFamilyCounts()`, satisfies **AC-8**
5. `CategoryShowcase`: zamień wpisaną na sztywno tablicę na prawdziwe liczby z `getProductFamilyCounts()`, linki zostają skierowane na nieprzefiltrowane `/wyniki`, satisfies **AC-8**
6. Zaktualizuj `lib/data/types.ts` oraz fixture'y testowe (`test/fixtures/project.ts`, `lib/data/fixtures/projects.ts`) o nowe pole `family`, domyślnie `"dom"`, wspiera pokrycie testowe **AC-1**
7. Zaktualizuj widoki katalogu producenta (spec 0016, lista i edycja produktów), które dziś czytają osiem usuwanych płaskich kolumn technicznych, tak żeby czytały `technicalSpecs`, satisfies **AC-5**
8. Spisz w tym spec (Feature design, Kategorie kontroli zgodności) kategorie kontroli per rodzina, bez zmian w kodzie silnika zgodności, satisfies **AC-10**

## Consequences

**Positive**:
- Platforma może realnie wystawiać 3 rodziny produktu bez kolejnej migracji modelu danych, kiedy pojawią się prawdziwi producenci spa i pergoli.
- Ograniczenie `CHECK` chroni spójność danych nawet dla ręcznych insertów przez Neon MCP, które zrobi funkcja 7.
- `CategoryShowcase` staje się uczciwy (prawdziwe liczby) zanim wystartują funkcje 7 i 8, bez czekania na nie.

**Negative / tradeoffs**:
- `technicalSpecs` traci typowanie na poziomie kolumny Postgresa dla wszystkich trzech rodzin, w tym dla domów (wcześniej typowane kolumny tekstowe); poprawność zależy teraz od zgodności schematu Zod ze stanem bazy, a nie od gwarancji bazy danych.
- Każda kolejna rodzina ponad te trzy nadal wymaga zmiany schematu (rozszerzenie enuma `family` i, jeśli potrzeba, własnego enuma podkategorii oraz gałęzi w Zod); ta decyzja nie czyni dodawania rodziny bezmigracyjnym, tylko czystszym niż dziś.
- Pola `technicalSpecs` dla spa i pergoli są zaprojektowane na podstawie ogólnego researchu (polskie prawo budowlane plus karty katalogowe producentów), nie na podstawie karty katalogowej prawdziwego producenta; prawdopodobnie będą wymagały korekty, gdy pojawi się pierwszy prawdziwy producent spa lub pergoli.

**Neutral**:
- 8 dzisiejszych płaskich kolumn znika ze schematu; każdy nieznany dziś zapis odwołujący się do nich bezpośrednio się zepsuje.
- Nowa zależność: `zod` (dziś już tranzytywna zależność przez `eslint-config-next`, teraz staje się bezpośrednia).

## Follow-up

- [ ] Funkcja 14 (realny silnik zgodności) wdraża prawdziwe kontrole per rodzina wymienione w Feature design, Kategorie kontroli zgodności; ta funkcja tylko je dokumentuje. Próg pergoli (35 m²) i otwarte wymogi sanitarne spa (patrz Feature design) wymagają weryfikacji wobec aktualnego tekstu ustawy, nie tylko stron wyjaśniających prawo.
- [ ] Funkcja 8 (dopracowanie wyszukiwania i wyników) podłącza linki `CategoryShowcase` do prawdziwego filtrowania `/wyniki?family=`; ta funkcja celowo zostawia linki nieprzefiltrowane.
- [ ] Gdy pojawi się prawdziwy producent spa lub pergoli (funkcja 7 lub później), zweryfikuj pola `technicalSpecs.spa-modulowe` / `.pergola` względem jego prawdziwej karty katalogowej; dzisiejsze pola pochodzą z ogólnego researchu rynkowego (patrz rationale.md, Referencje), nie z danych prawdziwego producenta.
- [ ] Ograniczenie `CHECK` chroni tylko spójność rodzina/podkategoria, nie kształt `technicalSpecs`; ręczny insert SQL funkcji 7 (przez Neon MCP) omija walidację Zod całkowicie. Funkcja 7 powinna wstawiać wiersze przez ścieżkę zwalidowaną (np. wywołanie tej samej akcji serwerowej co kreator) albo trzymać się udokumentowanego, ręcznie sprawdzonego wzorca JSON per rodzina.
- [ ] Kiedy zdarzenie analityczne `product_added` (funkcja 4, `lib/observability/types.ts`) zostanie podłączone do kreatora, jego payload powinien nieść `family` i podkategorię; dziś zdarzenie istnieje tylko jako typ, nieemitowany jeszcze nigdzie w kodzie.
- [ ] Konwencje `zod` nie są jeszcze w `## Agent skills` w głównym `AGENTS.md`; dopisz jedną linijkę, kiedy uruchomi się `/sync`.

## Migration plan

**Strategy**: bez migracji danych na żywo (tabela `product` ma dziś 0 wierszy, sprawdzone bezpośrednio w bazie Neon 2026-09-02); mimo to migracja kodu (schemat, kreator, `CategoryShowcase`) wymaga skoordynowanego wdrożenia, bo dzisiejsze płaskie kolumny znikają.

**Phases**:
1. Migracja bazy: dodaj enumy i kolumny `family` (`NOT NULL`, bez wartości domyślnej, bezpieczne bo 0 wierszy) /`spaSubcategory`/`pergolaSubcategory`/`technicalSpecs`, dodaj ograniczenie `CHECK`, usuń 8 płaskich kolumn technicznych domu w tej samej migracji (bezpieczne, bo 0 istniejących wierszy).
2. Wdróż razem: schematy Zod, zaktualizowany kreator (rodzina/podkategoria w kroku 1, jeden krok techniczny zależny od rodziny), zaktualizowane `queries.ts` (`getProductFamilyCounts`), zaktualizowany `CategoryShowcase`, zaktualizowane widoki katalogu producenta. Stary kod kreatora odwołujący się do usuniętych kolumn nie może wdrożyć się osobno od zmiany schematu.

**Rollback**: `drizzle-kit` nie generuje migracji cofających automatycznie; cofnięcie fazy 1 wymaga ręcznie napisanej migracji w dół (przywracającej 8 usuniętych kolumn, usuwającej nowe). Ponieważ nie istniały żadne dane na żywo, taka migracja w dół jest prosta do napisania (nie trzeba odtwarzać żadnych utraconych wartości), ale nie jest automatyczna. Revert commita/PR cofa kod; cofnięcie schematu bazy to osobny, ręczny krok.

**Risks**: brak ryzyka związanego z danymi (tabela pusta). Główne ryzyko to niedoszacowanie schematu Zod dla `technicalSpecs` spa/pergoli, zanim pojawią się prawdziwe dane producenta do porównania, oznaczone w Follow-up.
