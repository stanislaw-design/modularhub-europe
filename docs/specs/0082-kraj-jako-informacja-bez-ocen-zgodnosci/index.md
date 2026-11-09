# 0082. Kraj jako informacja zamiast filtra prawnego, bez ocen zgodności dla klienta

**Date**: 2026-11-05
**Status**: Accepted

## Summary

Dziś kraj w wyszukiwarce brzmi jak werdykt prawny („dopuszczone prawnie w Niemczech”), choć dane zgodności w bazie są w większości szablonem, a projekty w katalogu są ogólne, nie robione pod kraj. Ta zmiana robi z kraju zwykłą informację dla zespołu (gdzie ma powstać projekt), poszerza listę do sześciu krajów (dochodzą Belgia, Włochy, Francja) i przestaje pokazywać klientowi oceny zgodne lub niezgodne. System zgodności zostaje w bazie i w panelu admina, bo kiedyś do niego wrócimy. Wstępną ocenę zgodności klient dostanie dopiero w ofercie podsumowującej, ale jej budowa to osobny, późniejszy etap.

## Requirements

**User stories**:
- Jako klient chcę zobaczyć wszystkie modele bez względu na kraj, w którym będę budować, żeby nie odpadły mi projekty przez filtr, którego i tak nie umiem sprawdzić.
- Jako klient chcę wskazać kraj budowy z listy sześciu krajów w zapytaniu, żeby zespół wiedział, gdzie projekt ma powstać.
- Jako klient nie chcę czytać obietnic prawnych, których platforma dziś nie potrafi dotrzymać, więc ekrany mówią tylko to, co jest prawdą.
- Jako zespół ModularHub chcę zachować tabele i panel zgodności bez zmian, żeby wrócić do nich, gdy będą realne dane.
- Jako producent chcę nadal zapisywać kraje dostawy jako deklarację, ale bez wrażenia, że decydują o tym, jakie zapytania zobaczę.

**Acceptance criteria** (kontrakt, każde kryterium niezależnie sprawdzalne):
- **AC-1**: Istnieje jedna lista krajów `MARKET_COUNTRY_CODES` w `lib/countries.ts` z wartościami `PL`, `DE`, `NL`, `BE`, `IT`, `FR` i typ `CountryCode` z niej wyprowadzony. `lib/data/types.ts` ponownie eksportuje ten typ. `COMPLIANCE_COUNTRY_CODES` w `lib/product-envelope-parameters.ts` jest wyprowadzony z tej samej listy, a `COMPLIANCE_ONLY_COUNTRY_CODES` (BE, IT, FR jako „kraje tylko dla zgodności”) jest usunięty. To zastępuje w tym zakresie AC-8 ze specyfikacji 0075, która celowo nie pokazywała BE, IT i FR jako krajów dostawy. Poza `lib/countries.ts` nie ma w kodzie aplikacji (bez testów) osobnej tablicy ani mapy z listą krajów rynku, co pilnuje test (AC-14).
- **AC-2**: `getCountries(locale)` zwraca sześć krajów. Dla `pl` nazwy pochodzą z fikstury (Polska, Niemcy, Holandia, Belgia, Włochy, Francja), dla innych języków z `Intl.DisplayNames`. Żywe mapy tłumaczeń kluczowane kodem kraju (`ProducerCard.country`, `ProducerRealizationsSection.country`) mają sześć wpisów w pl, en, de i nl (`ProjectComplianceAssessments.country` ma już sześć). `CountryLocative` jest usunięty razem z jedyną linią, która go używała (AC-5). Mapy `Record<CountryCode, …>` w kodzie (`countryFlag` w `ProducerCard`, `ProducerRealizationsSection`, `VerifiedManufacturerProjectCard`, `countryLabel` w pierwszych dwóch oraz `MOCK_ASSEMBLY_PRICE_EUR_BY_COUNTRY` w `lib/pricing.ts`) mają sześć wpisów albo są wyprowadzone z jednej mapy, żeby `tsc` przeszedł. `npm run check:translations` pokazuje zero braków.
- **AC-3**: Wyniki nie zawężają się po kraju. `countryCode` jest usunięty z `GetProjectsFilters` razem z gałęzią `blocked` w `lib/data/projects.ts` (`getProjects` nie rozróżnia ścieżek, więc nie ma sensu zostawiać jej „poza klientem”). Funkcja `matchesResultsFilter` w `lib/results-filters.ts` (używana tylko w testach) jest usunięta. Dla każdego `country` (poprawnego lub nie) lista wyników i jej licznik są takie same jak bez parametru, a `country` nie trafia do klucza pamięci podręcznej wyników.
- **AC-4**: Parametr `country` w adresie nadal jest przyjmowany i przenoszony między stronami (strona główna, wyniki, zapytanie), ale służy tylko jako podpowiedź kraju w formularzu zapytania. Stare linki z `?country=DE` działają i pokazują pełną listę.
- **AC-5**: Klient nie widzi żadnej oceny zgodności. Usunięte z widoku klienta: znacznik „Wymaga dodatkowych dokumentów” na karcie wyniku, linia „Dopuszczone prawnie {kraj}” w nagłówku wyników, blok statusu kraju i `ProjectComplianceAssessments` na stronie produktu. Strony wyników i produktu nie wykonują już zapytań o dopuszczenia.
- **AC-6**: `/plot` (analiza działki) zwraca 404 dla każdego. Kod strony i komponentów zostaje w repozytorium.
- **AC-7**: Pole kraju w `SearchCard` na stronie głównej ma etykietę „Gdzie budujesz?”, jest opcjonalne, a przycisk szukania działa bez wybranego kraju. Wybrany kraj trafia do adresu jako `country`.
- **AC-8**: Pasek filtrów wyników (wersja stała i mobilna) nie ma pola kraju. Zmiana innego filtra zachowuje obecny `country` w adresie. Nagłówek wyników nie mówi nic o prawie ani o kraju, a tekst podpowiedzi jest przepisany w czterech językach.
- **AC-9**: Strona zweryfikowanych producentów nie ma filtra kraju, a lista nie zawęża się po krajach dostawy. Karty producentów pokazują kraje dostawy jako deklarację („Deklaruje dostawy do: …”). `countryCode` przestaje być liczony jako aktywny filtr na tej stronie.
- **AC-10**: W formularzach zapytań (`InquiryFlow`, `ProjectRequestFlow`, `BulkProductInquiryModal`) kraj jest wymagany, ma sześć opcji i podpowiedź z `country`. Rejestracja klienta nie ma pola kraju i go nie dostaje. Serwer odrzuca kod spoza sześciu krajów z czytelnym błędem: `submitProjectRequest` (dziś `z.string().min(1)`) i wspólny schemat zapytania o produkt (`submitBulkProductInquirySchema`, używany też przez `createRequestOnBehalf` w panelu admina); `case-actions.ts` sprawdza kraj przez `getCountries()` i poszerza się sam. Istniejące wiersze z innym krajem (np. `US`) nie są zmieniane.
- **AC-11**: Rejestracja producenta (kraj siedziby, dziś `z.enum(["PL","DE","NL"])` w `producerSchema`), profil zdolności (kraje dostawy) i panel produktu oferują te same sześć krajów. `getAllCountries()` przestaje wycinać BE, IT, FR i zwraca sześć krajów z listy rynku (nie `US`); kraj już zapisany poza sześcioma (np. `US` u MirageVision) pozostaje widoczny jako zaznaczony. Teksty nazywają kraje dostawy deklaracją informacyjną. Nieprawdziwe od 0070 teksty o dopasowaniu po kraju są przepisane w czterech językach: `ProducerPanelCapacityPage.deliveryCountriesHelp` i `intro`, `ProducerPanelBoardPage.intro`, `ProjectRequestFlow.intro`, `ProjectRequestConfirmationCard.message`, `VerifiedManufacturersPage.emptyStateBody`, `ProducentPage.benefitRegistrationDescription`. Logika przetargu bez zmian: kraj nie jest warunkiem dopasowania, znacznik „nie dowozisz do tego kraju” zostaje.
- **AC-12**: Strona główna nie obiecuje automatycznej oceny zgodności. Sekcja `ComplianceEngineShowcase`, krok trzeci w „Jak to działa” i pytanie w FAQ są przepisane w czterech językach: mówią, że wstępną ocenę zgodności klient dostaje w ofercie podsumowującej. Znika przykład „Nordic 126, 92%” i każde sformułowanie o automatycznym werdykcie. Ta sama zasada dotyczy pozostałych tekstów, które dziś obiecują sprawdzanie zgodności lub wybór kraju jako warunek: `Faq.howAnswer`, `HowItWorksExplainer.stage1Description` (kraj już nie jest krokiem obowiązkowym), `HomePage.metaDescription`, `SiteFooter.about`, `Testimonials.quote2` (sekcja jest dziś wyłączona stałą z 0073 AC-7; tekst poprawić przed jej włączeniem). Brak w `messages/pl.json` zdania obiecującego sprawdzenie zgodności z przepisami kraju budowy (sprawdzane przeszukaniem po „zgodno” i „dopuszczal”).
- **AC-13**: Żadna migracja nie usuwa ani nie zmienia `product_country_eligibility`, `product_compliance_assessment` ani `producer_delivery_country`. Panel admina z ocenami zgodności działa bez zmian. Wiersze `BE`, `IT`, `FR` w tabeli `country` (migracja `0061_envelope_parameters.sql`) są potwierdzone na produkcji przed wdrożeniem.
- **AC-14**: Testy jednostkowe i e2e dotknięte zmianą są zaktualizowane i przechodzą. Nowy test pilnuje, że w kodzie aplikacji (`app`, `components`, `lib`, `scripts`, bez plików testowych) nie ma tablicy ani mapy złożonej z kodów krajów rynku poza `lib/countries.ts`. Dane per producent w fiksturach (np. `deliveryCountries: ["PL", "DE"]`) nie są listą rynku i test ich nie dotyczy. Testy do aktualizacji: jednostkowe `lib/data/countries.test.ts`, `ResultsHeader.test.tsx`, `ResultCard.test.tsx`, `project/[slug]/page.test.tsx`, `lib/data/projects.test.ts`, `results-filters.test.ts`, `verified-manufacturers-filters.test.ts`, `pricing.test.ts`; e2e `wyniki`, `zapytanie`, `projekt-szczegoly`, `strona-glowna` (klika kraj przez `SearchCard.whereAriaLabel`) i `dzialka`. `tsc` i `npm run check:translations` są czyste.

## Decision

**Chosen option**: Option 2: Kraj jako informacja z jednej wspólnej listy, ukrycie ocen zgodności przy zachowaniu systemu.

Kraj przestaje być filtrem prawnym i staje się wymaganą informacją o miejscu budowy z jednej listy sześciu krajów, a oceny zgodności znikają z widoku klienta, ale zostają w bazie i panelu admina.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: bez nowych encji i bez migracji. Tabela `country` ma już `PL`, `DE`, `NL`, `BE`, `IT`, `FR` (oraz `US` dla jednego istniejącego producenta). Zmienia się tylko lista dostępna w kodzie.

**Wspólny moduł krajów** (`lib/countries.ts`):
- `MARKET_COUNTRY_CODES = ["PL", "DE", "NL", "BE", "IT", "FR"] as const` i `type CountryCode = (typeof MARKET_COUNTRY_CODES)[number]`.
- `isMarketCountryCode(value: unknown): value is CountryCode` dla parsowania adresów i walidacji serwera.
- `lib/data/types.ts` ponownie eksportuje `CountryCode`. `lib/data/fixtures/countries.ts` dostaje polskie nazwy dla BE, IT, FR. `getCountries(locale)` zwraca sześć krajów w kolejności z `MARKET_COUNTRY_CODES`.
- `getAllCountries()` (z bazy) przestaje wycinać BE, IT, FR (`COMPLIANCE_ONLY_COUNTRY_CODES` znika) i zwraca sześć krajów z listy rynku. Kraj zapisany poza sześcioma (np. `US` u MirageVision) nie jest oferowany do nowego wyboru, ale zostaje widoczny jako zaznaczony.

**Miejsca z literałem kraju do zamiany na moduł** (z mapowania kodu): `lib/data/types.ts`, `lib/results-filters.ts`, `lib/verified-manufacturers-filters.ts`, `app/[locale]/(customer)/inquiry/page.tsx`, `lib/auth-registration.ts` (`z.enum` w `producerSchema`, czyli kraj siedziby producenta; rejestracja klienta nie ma pola kraju), `lib/product-envelope-parameters.ts`, `lib/db/queries.ts` (`getAllCountries`), oraz mapy `Record<CountryCode, …>`: `countryFlag` i `countryLabel` w `ProducerCard`, `ProducerRealizationsSection`, `VerifiedManufacturerProjectCard` i `MOCK_ASSEMBLY_PRICE_EUR_BY_COUNTRY` w `lib/pricing.ts`. Dane per producent w fiksturach (`deliveryCountries`) nie są listą rynku i zostają.

**Tabela zmian zachowania** (widok klienta):

| Miejsce | Dziś | Po zmianie |
|---|---|---|
| Wyniki (`results`), filtr `country` | ukrywa produkty z `blocked`, nagłówek „Dopuszczone prawnie” | bez zawężania, `country` tylko do podpowiedzi |
| Karta wyniku | znacznik „Wymaga dodatkowych dokumentów” | bez znacznika |
| Strona produktu | blok statusu kraju i `ProjectComplianceAssessments` | bez obu |
| Strona główna `SearchCard` | kraj wymagany do szukania | „Gdzie budujesz?”, opcjonalne |
| Pasek filtrów wyników | pole kraju | bez pola, `country` zachowany w adresie |
| Zweryfikowani producenci | filtr kraju zawęża po krajach dostawy | bez filtra, karta: deklaracja |
| `/plot` | działa, dane z pliku przykładowego | 404 |
| Strona główna, teksty zgodności | obietnica automatycznej weryfikacji | wstępna ocena w ofercie podsumowującej |
| Panel producenta, kraje dostawy | „zapytania spoza kraju nie trafią do Ciebie” | deklaracja informacyjna |

**Key invariants**:
- Żaden ekran klienta nie wyświetla statusu `approved`, `conditional` ani `blocked` ani tekstu `reason` z tabel zgodności.
- `country` w adresie nigdy nie zmienia liczby wyników.
- Kod kraju w zapytaniu klienta należy do `MARKET_COUNTRY_CODES` (sprawdza serwer, nie tylko formularz).
- Dane zgodności i dostaw w bazie nie są zmieniane tą pracą.

**Security model**: bez zmian w rolach i dostępie. Walidacja kraju po stronie serwera dla zapytań klienta rośnie z „klucz obcy w bazie” do „lista sześciu” (zamyka możliwość podania `US` przez ręczne wywołanie akcji). Brak nowych danych osobowych.

**Edge cases**:
- Stary link `?country=XX` z kodem spoza listy: kraj jest ignorowany, lista pełna, formularz bez podpowiedzi.
- Zapytanie istniejącego klienta lub producenta z krajem `US`: wyświetla się bez zmian (dane nie są ruszane), nowych takich zapytań nie da się utworzyć z formularza.
- `Intl.DisplayNames` nie zna kodu (nie dotyczy sześciu krajów): zostaje nazwa polska z fikstury.
- Produkty, które miały `blocked` dla kraju, pojawiają się teraz w wynikach: to zamierzone, bo dane są szablonem.
- Wyniki rodziny `outdoor-tv` zerują `country` (pasek telewizorów nie ma kraju), więc podpowiedź kraju z AC-4 przy telewizorach nie jest przenoszona; to akceptowane, bo formularz zapyta o kraj.

**Critical test scenarios** (każdy mapuje się na kryterium):
- Happy path: klient wchodzi ze strony głównej bez kraju, wyszukuje, widzi pełną listę, dodaje projekt do zapytania i wybiera Belgię, zapytanie zapisuje się z `BE`, verifies **AC-4, AC-7, AC-10**.
- `?country=DE` i `?country=XX` dają tę samą liczbę wyników co brak parametru, verifies **AC-3, AC-4**.
- Strona produktu z istniejącymi wierszami `blocked` i `conditional` nie pokazuje żadnego statusu ani powodu, verifies **AC-5**.
- `/pl/plot` zwraca 404, verifies **AC-6**.
- Ręczne wywołanie akcji zapytania z krajem `US` kończy się czytelnym błędem, verifies **AC-10**.
- Producent z krajem dostawy `FR` zapisuje profil, a tekst pomocy nie zawiera zdania o niedocieraniu zapytań, verifies **AC-11**.
- `check:translations` i test literału listy krajów, verifies **AC-1, AC-2, AC-14**.

## Build plan

Podejście: Tracer Bullet (epika Produkcja). Część A (ukrycie ocen i koniec filtra) nie zmienia typu `CountryCode`, więc może wejść na produkcję osobno i od razu. Część B poszerza listę krajów.

**Część A: ukrycie ocen zgodności, kraj przestaje filtrować**

1. Wyniki i strona produktu: usunięcie `countryCode` z `GetProjectsFilters` i gałęzi `blocked`, usunięcie `matchesResultsFilter`, usunięcie pobierania dopuszczeń na stronach wyników i produktu, znacznika na karcie, linii w nagłówku (razem z kluczem `CountryLocative`) i bloków zgodności na stronie produktu, przepisanie podpowiedzi nagłówka, satisfies **AC-3, AC-5**
2. `/plot` zwraca 404 (`notFound()`), test e2e `dzialka.spec.ts` zastąpiony testem 404, satisfies **AC-6**
3. Teksty: strona główna (`ComplianceEngineShowcase`, krok trzeci i pierwszy, FAQ, metadane, stopka, cytat) i teksty o dopasowaniu po kraju (panel producenta, zapytanie ModularProjects, strona producentów) w czterech językach, satisfies **AC-12, AC-11 (część tekstowa)**
4. `SearchCard` (pole „Gdzie budujesz?”, szukanie bez kraju) i pasek filtrów wyników (bez kraju, `country` zachowany w adresie), satisfies **AC-4, AC-7, AC-8**
5. Strona zweryfikowanych producentów: bez filtra i bez zawężania, karta jako deklaracja, satisfies **AC-9**

**Część B: sześć krajów z jednego miejsca**

6. Moduł `lib/countries.ts`, ponowny eksport typu, `COMPLIANCE_COUNTRY_CODES` z tej samej listy, usunięcie `COMPLIANCE_ONLY_COUNTRY_CODES`, `getAllCountries` bez wycinania, polskie nazwy BE, IT, FR w fiksturze, `getCountries` zwraca sześć krajów, mapy `Record<CountryCode, …>` (flagi, etykiety, `lib/pricing.ts`) rozszerzone, satisfies **AC-1, AC-2**
7. Mapy tłumaczeń `ProducerCard.country` i `ProducerRealizationsSection.country` (sześć wpisów w pl, en, de, nl), `check:translations`, satisfies **AC-2**
8. Zamiana literałów w `results-filters`, `verified-manufacturers-filters`, `inquiry/page.tsx` i `producerSchema` na moduł, test pilnujący braku osobnej listy krajów, satisfies **AC-1, AC-14**
9. Zapytania: sześć opcji i podpowiedź z `country` w `InquiryFlow`, `ProjectRequestFlow`, `BulkProductInquiryModal`, walidacja serwera w `submitProjectRequest` i wspólnym schemacie zapytania o produkt, satisfies **AC-10**
10. Producent: kraj siedziby i kraje dostawy z sześciu w rejestracji, profilu zdolności i panelu produktu, satisfies **AC-11**
11. Aktualizacja testów jednostkowych i e2e z AC-14, weryfikacja `BE`, `IT`, `FR` w `country` na produkcji, satisfies **AC-13, AC-14**

## Consequences

**Positive**:
- Strona przestaje obiecywać prawo, którego dane nie potwierdzają (77 domów ma dziś identyczne zdania „zgodne z DIN i BENG”).
- Mniej zapytań do bazy na stronach wyników i produktu (znika pobieranie dopuszczeń).
- Jedna lista krajów zamiast siedmiu literałów, więc kolejny kraj to jedna zmiana.
- System zgodności zostaje nietknięty, powrót do niego jest tani.

**Negative / tradeoffs**:
- Klient z Niemiec zobaczy też domy, których producent dostarcza tylko do Polski. Informację o deklarowanych krajach dostawy niesie karta producenta, ale nie jest ona gwarancją.
- Produkty, które miały jawne `blocked` dla kraju, wracają do wyników.
- Strona główna traci mocny argument „sprawdzamy zgodność”, dopóki nie powstanie ocena w ofercie.
- Dopóki nie powstanie ocena w ofercie, zgodność w ogóle nie jest klientowi pokazana, więc cały ciężar leży na rozmowie zespołu z klientem.

**Neutral**:
- Producenci spoza sześciu krajów (np. MirageVision z USA) zostają w bazie, ale nowy producent nie wybierze innego kraju niż sześć.
- Kod analizy działki zostaje, tylko niedostępny.
- Sekcja parametrów przegród z 0075 (`ProjectEnvelopeParameters`) jawnie nie wnioskuje zgodności z liczb (pokazuje wartości i stan potwierdzenia), więc zostaje bez zmian.

## Migration plan

**Strategy**: no migration needed (zmiana tylko w kodzie, jedno wdrożenie).
**Phases**:
1. Część A (zadania 1 do 5): ukrycie ocen, koniec filtra, nowe teksty, 404 dla `/plot`. Typ krajów się nie zmienia, więc część wchodzi na produkcję osobno i od razu.
2. Część B (zadania 6 do 11): sześć krajów z jednego miejsca, formularze, panel producenta, testy, sprawdzenie produkcji.
**Rollback**: cofnięcie commitu danej części, bo baza nie jest zmieniana.
**Risks**: stare linki z `country` (obsłużone, AC-4), zapomniany literał listy (pilnuje test), brak wierszy `BE`, `IT`, `FR` na produkcji (AC-13, sprawdzić przed wdrożeniem, bo odczyt produkcji wymaga Twojej zgody).

## Follow-up

- [ ] **Osobna specyfikacja, zaraz po tej: widoczność przetargu.** Decyzja właściciela (2026-11-05): zapytanie o duże zamówienie widzą wszyscy producenci zweryfikowani wolumenowo (dziś tylko dopasowani po rodzinie, standardzie i mocy), a mail dostają tylko dopasowani. Widzieć znaczy móc złożyć ofertę. Pliki inwestora może pobrać każdy, kto może złożyć ofertę. To częściowo cofa AC-10 z 0070 i wymaga rozdzielenia funkcji `producerMatchesProjectRequestSql` na dwie role (kto widzi, kto dostaje mail, liczniki i alert o zerze dopasowanych) oraz testów dostępu do plików.
- [ ] **Osobna specyfikacja: wstępna ocena zgodności w ofercie podsumowującej** (forma, kto wypełnia, jak korzysta z istniejących ocen).
- [ ] **Przegląd danych zgodności, projekt po projekcie** (Steel House, Castor, Perfect Cube, Budman mają szablonowe zdania `approved` dla DE i NL), razem z właścicielem, przed ponownym pokazywaniem ocen komukolwiek.
- [ ] Specyfikacja 0075, AC-8 („BE, IT, FR tylko dla zgodności, nie jako kraje dostawy”) jest w tym zakresie zastąpiona przez tę specyfikację; po wdrożeniu części B zaktualizować jej treść lub status.
- [ ] Ewentualnie osobno: kanoniczny adres wyników bez `country` i brakujące tagi canonical (część przeglądu niezawodności i SEO).
- [ ] Sprawdzić na produkcji (odczyt `select code from country`) obecność `BE`, `IT`, `FR` przed wdrożeniem (AC-13).
