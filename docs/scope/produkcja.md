# Epika: Produkcja (prawdziwe zaplecze i utwardzenie)

Drugi etap platformy ModularHub Europe. Zastępuje zaplecze epiki [Prototyp](prototyp.md) (dane mockowe, `localStorage`, brak logowania) prawdziwym, produkcyjnym zapleczem: kontami, bazą danych, płatnościami, przechowywaniem plików, silnikiem zgodności i wyceną transportu, razem z utwardzeniem jakości (RODO, bezpieczeństwo, wydajność, SEO, obserwowalność, CI/CD) wymaganym, zanim platforma obsłuży prawdziwych klientów i producentów.

Start jest pilotem na Polsce. Pozostałe kraje z mocka silnika zgodności i wersje językowe zostają odłożone do kolejnych etapów, patrz Deferred niżej.

**Build approach:** Tracer Bullet (dowieźć jeden prawdziwy wątek przez wszystkie warstwy, logowanie plus jeden produkt w bazie plus jedno zapytanie, zanim pogrubimy kolejne segmenty jak oferty, płatności, pliki, zgodność i transport).
**Weight profile:** większość funkcji `full` (dane osobowe, płatności, zgodność prawna, panel admina, weryfikacja firmy); utwardzenie jakości (SEO, wydajność, testy, CI/CD, obserwowalność) `medium`.

> ⚠️ **Reprioritized 2026-09-02** (nadal etap testowy, produkt jest przed inwestorami): strona klienta idzie teraz przed automatyzacją strony producenta. Dane producenta (konta, produkty) na start trafiają do bazy ręcznie, z pomocą Claude i Neon MCP, zamiast przez samoobsługowy formularz rejestracji/kreatora — pierwsze oferty i tak robi ręcznie zamawiający. Stąd nowy Slice 1 (funkcja 7, redefiniuje wcześniejszy „rdzeń pętli") i nowy Slice 2 (funkcje 8–10, dopracowanie klienta), przed dawną kolejnością Slice 1 (oferta, płatności, pliki, zgodność, transport, realizacja, powiadomienia, panel admina, weryfikacja firmy), która zostaje bez zmian w treści, tylko przesunięta niżej (dziś Slice 3–11).
>
> ⚠️ **Rozszerzenie zakresu produktowego 2026-09-02**: platforma rozszerza się z jednej rodziny produktu (dom) na trzy — domy, spa modułowe, pergole, każda z własnymi podkategoriami. To nowa funkcja 6 (Foundation, przed Slice 1), bo dotyka modelu danych, kreatora producenta i silnika zgodności naraz i musi być rozstrzygnięta raz, zanim funkcja 7 zacznie ręcznie zasiewać dane producentów.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Decyzja o zapleczu produkcyjnym | Foundation | done |
| 2 | Prawdziwy model danych | Foundation | done |
| 3 | CI/CD i środowiska | Foundation | in progress |
| 4 | Obserwowalność produkcyjna | Foundation | in progress |
| 5 | RODO i zgodność prawna | Foundation | planned |
| 6 | Rodziny produktów i kategorie (domy, spa modułowe, pergole) | Foundation | done |
| 7 | Klient na realnym zapleczu, dane producentów zasiane ręcznie | Slice 1 | in progress |
| 8 | Dopracowanie wyszukiwania i wyników (klient) | Slice 2 | done |
| 9 | Domknięcie wizualne ścieżki klienta (marka v4) | Slice 2 | in progress |
| 10 | Treść i luki funkcjonalne klienta | Slice 2 | planned |
| 11 | Realna oferta i jej przyjęcie | Slice 3 | done |
| 12 | Realne płatności | Slice 4 | planned |
| 13 | Realne przechowywanie plików | Slice 5 | done |
| 14 | Realny silnik zgodności (Polska, pilot) | Slice 6 | planned |
| 15 | Realna wycena transportu | Slice 7 | planned |
| 16 | Realizacja i statusy na prawdziwym zapleczu | Slice 8 | planned |
| 17 | Powiadomienia e mail | Slice 9 | planned |
| 18 | Panel administracyjny | Slice 10 | planned |
| 19 | Weryfikacja firmy producenta (realna) | Slice 11 | planned |
| 20 | SEO podstawowe stron publicznych | Utwardzenie | planned |
| 21 | Wydajność: cel i audyt Core Web Vitals | Utwardzenie | planned |
| 22 | Testy regresyjne ścieżek krytycznych | Utwardzenie | planned |
| 23 | Przegląd bezpieczeństwa przed startem | Utwardzenie | planned |
| 24 | Panel klienta (moje zapytania i ulubione) | Slice 2 | in progress |
| 25 | Wersje językowe (EN/NL/DE) i przełącznik języka | Slice 0 | in progress |
| 26 | Sekcja "Więcej niż dom": przewijana witryna kategorii | Slice 2 | in progress |
| 27 | Poprawki nagłówka i nawigacji klienta (SiteHeader) | Slice 2 | in progress |
| 28 | Panel producenta | Slice 2b | in progress |
| 29 | Przyklejony pasek wyszukiwania na wynikach (klient) | Slice 2 | in progress |
| 30 | Grupy wyszukiwania: Domy i Więcej niż dom (klient) | Slice 2 | in progress |
| 31 | Anglojęzyczne adresy URL i strona główna klienta bez segmentu klient | Foundation | in progress |
| 32 | Model danych dla dużych zamówień B2B | Slice 12 | in progress |
| 33 | Ekrany wejściowe dla dużych zamówień B2B | Slice 12 | in progress |
| 34 | Kontenery modułowe zamiast pergoli | Foundation | in progress |
| 35 | Poprawa flow logowania i rejestracji | Slice 2 | in progress |

## Foundations

### 1. Decyzja o zapleczu produkcyjnym · full · done
Wybór technicznego zaplecza (hosting, baza danych, dostawca autoryzacji, przechowywanie plików), zastępującego dzisiejsze dane mockowe i `localStorage`. Jedna decyzja, na której stoją wszystkie kolejne funkcje tej epiki.
**Done when:** decyzja o hostingu, bazie danych, dostawcy autoryzacji i przechowywaniu plików jest zapisana w spec, a środowisko deweloperskie łączy się z prawdziwą, pustą bazą.
- [x] Zaprojektuj (spec): [0017](../specs/0017-zaplecze-produkcyjne/index.md)
- [x] Zbuduj: `/develop zaplecze produkcyjne` (kod w `lib/db/client.ts`, `lib/db/schema.ts`, `drizzle.config.ts`, `.env.local.example`, `package.json`. Neon Postgres, region Frankfurt (UE), projekt `modularhub`, jeszcze bez schematu — schemat i pierwsza migracja to feature 2.)
- [x] Zweryfikuj: `/check verify zaplecze produkcyjne`
- [x] Testuj: `/test zaplecze produkcyjne` (`lib/db/client.test.ts`, 3 testy)

### 2. Prawdziwy model danych · full · done
Schemat encji zastępujący dzisiejsze fixture'y i `localStorage`: konta i role, projekty/produkty, zapytania, oferty, zamówienia i etapy realizacji, płatności, dokumenty, status zgodności per kraj.
**Done when:** schemat i relacje obsługują wszystkie funkcje tej epiki bez migracji łamiącej dane, migracja jest zastosowana na środowisku deweloperskim.
- [x] Zaprojektuj (spec): [0018](../specs/0018-prawdziwy-model-danych/index.md)
- [x] Build it: `/develop prawdziwy model danych` (kod w `lib/db/schema.ts`, `lib/db/queries.ts`, migracje `drizzle/0000_jittery_maverick.sql`, `drizzle/0001_seed_countries.sql`, `drizzle/0002_audit_log_trigger.sql`)
  - [x] Konta i profile: tabele Auth.js (users/accounts/sessions/verification_tokens) rozszerzone o rolę, plus producer/client/country, satisfies AC-1, AC-6
  - [x] Katalog i zgodność: product (połączenie Project+SavedProduct) i trzy tabele statusu zgodności, satisfies AC-1
  - [x] Zapytanie → oferta → zamówienie → płatność → dokument, satisfies AC-1, AC-4
  - [x] Ścieżka audytu: audit_log, trigger Postgres z redakcją pól osobowych, kolumny deletedAt, satisfies AC-2
  - [x] Zastosuj pierwszą migrację na deweloperskiej bazie Neon i sprawdź izolację danych per rola, satisfies AC-3, AC-5
- [x] Verify it: `/check verify prawdziwy model danych`
- [x] Test it: `/test prawdziwy model danych`

### 3. CI/CD i środowiska · in progress (budowana)
Zautomatyzowany pipeline (build, testy, wdrożenie) i osobne środowisko staging przed produkcją, zamiast ręcznych wdrożeń.
**Done when:** push na główną gałąź uruchamia build i testy automatycznie, wdrożenie na staging jest automatyczne, a wdrożenie na produkcję wymaga świadomego kroku.
- [x] Zaprojektuj (spec): [0019](../specs/0019-ci-cd-i-srodowiska/index.md)
- [x] Zbuduj: `/develop CI/CD i środowiska` (kod w `.github/workflows/ci.yml`, `deploy-staging.yml`, `deploy-production.yml`, `playwright.config.ts`; branch Neon `staging` założony. Zostały ręczne kroki poza kodem, patrz Follow-up w spec 0019: Vercel Custom Environments, wyłączenie auto deploy Vercela dla main, sekrety GitHub Actions, ochrona gałęzi main, podłączenie Vercel MCP.)

### 4. Obserwowalność produkcyjna
Śledzenie błędów w czasie rzeczywistym i podstawowa analityka zdarzeń biznesowych (rejestracja, zapytanie, oferta, płatność), żeby awarie i luki w lejku były widoczne od pierwszego dnia prawdziwego ruchu.
**Done when:** błąd w kodzie produkcyjnym trafia do narzędzia śledzenia błędów razem z kontekstem, a kluczowe zdarzenia biznesowe są rejestrowane i widoczne w jednym miejscu.
- [x] Zaprojektuj (spec): [0021](../specs/0021-obserwowalnosc-produkcyjna/index.md) (Sentry, region UE, dla błędów; PostHog, EU Cloud, bezciasteczkowo do czasu bannera zgody, dla zdarzeń; oba za jednym modułem `lib/observability/`)
- [ ] Zbuduj: `/develop obserwowalność produkcyjna` (kod w `lib/observability/`, `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts`, `app/global-error.tsx`, `eslint.config.mjs`; projekty Sentry i PostHog założone, klucze na Vercelu dodane; zostały jeszcze błąd z klienta/`proxy.ts` nie przetestowane na żywo, dostarczenie e maila alertu nie potwierdzone, i runbook usuwania danych, AC-7)
  - [ ] Śledzenie błędów: Sentry (region UE) zainicjalizowany dla klienta, serwera i edge (`proxy.ts`), filtrowanie danych osobowych, próbkowanie z ochroną przed skokiem błędów, moduł `lib/observability/errors.ts` — kod gotowy; dedykowany projekt Sentry założony (org `modularhub-europe`, projekt `modularhub-europe`, region `de` potwierdzony przez DSN; pierwszy, współdzielony projekt `javascript-nextjs` usunięty), błąd testowy z serwera potwierdzony na żywo w dashboardzie z poprawnym `path`/`release`/`role`/`user.id`, domyślna reguła alertu e mail włączona; zostało: błąd z klienta i z `proxy.ts` nie przetestowane na żywo, dostarczenie e maila nie potwierdzone, dodanie kluczy na Vercel staging/production, satisfies AC-1, AC-3, AC-6, AC-8
  - [x] Analityka zdarzeń: PostHog (EU Cloud) zainicjalizowany bez ciasteczek do czasu funkcji 5, moduł `lib/observability/events.ts` z siedmioma zdarzeniami i `identify()` — potwierdzone na żywo: wszystkich 7 zdarzeń plus `Identify` widoczne w PostHog Activity pod jedną osobą (`verify-test-distinct-id`, `library: posthog-node`), satisfies AC-4, AC-6
  - [x] Środowiska i wymuszenie konwencji: zmienne środowiskowe tylko na staging/production, reguła ESLint blokująca bezpośrednie importy SDK poza `lib/observability/` — reguła ESLint gotowa i zweryfikowana; zmienne dodane na Vercelu do Production i Preview (Preview stoi w miejsce Staging, bo prawdziwe Custom Environments czeka na zakup Vercel Pro, spec 0019 Follow-up; `resolveEnvironment()` już traktuje `VERCEL_ENV=preview` jako `staging`), dev/CI świadomie bez kluczy, satisfies AC-2, AC-5
  - [ ] Proces usuwania danych: udokumentowany i jednorazowo przetestowany runbook usuwania lub anonimizacji historii użytkownika w obu narzędziach, satisfies AC-7
- [ ] Zweryfikuj: `/check verify obserwowalność produkcyjna`
- [ ] Testuj: `/test obserwowalność produkcyjna`

### 5. RODO i zgodność prawna · needs a decision · full
Zgoda na cookies, polityka prywatności, regulamin i udokumentowana podstawa prawna przetwarzania danych klienta i producenta. Musi działać, zanim funkcja 7 zacznie zbierać pierwsze prawdziwe konta.
**Done when:** baner zgody na cookies blokuje niekonieczne śledzenie do momentu zgody, polityka prywatności i regulamin są opublikowane i podlinkowane, a każdy formularz zbierający dane osobowe wskazuje podstawę prawną przetwarzania (basis: RODO, Regulation (EU) 2016/679, art. 4 i 6; ePrivacy Directive 2002/58/EC dla zgody na cookies).
- [ ] Zaprojektuj (spec): `/architect RODO i zgodność prawna`

### 6. Rodziny produktów i kategorie (domy, spa modułowe, pergole) · full · done
Dziś `Project`/`ProjectCategory` zakłada wyłącznie jedną rodzinę produktu (dom) z trzema wariantami cyklu życia (całoroczny/rekreacyjny-całoroczny/mobilny) — nie ma pola rodziny produktu w ogóle; dwa istniejące komponenty kategorii na stronie startowej (`CategoryShowcase`, `CategoryFilterBar`) są dziś świadomie dekoracyjne, bez modelu danych za sobą (spec 0014). Platforma rozszerza się o dwie kolejne rodziny — spa modułowe i pergole — każda z własnymi podkategoriami (jeszcze do ustalenia). To dotyka naraz: modelu danych (nowe pole rodziny produktu, niezależne od dzisiejszego `category`), kreatora producenta (dziś jeden sztywny zestaw kroków technicznych — ściany, izolacja, współczynniki przenikania ciepła, odporność ogniowa/wiatrowa — zakładający ocieplony budynek ze ścianami, co nie pasuje do pergoli), i silnika zgodności/analizy działki (dziś w całości oparte o prawo budowlane domu — BENG, klasy odporności ogniowej, linie odsunięcia od granicy, nośność gruntu pod fundament — inny reżim prawny czeka pergole i spa). Rozstrzygana raz, przed ręcznym zasiewaniem danych producentów w funkcji 7, żeby nie migrować ich dwa razy.
**Done when:** model danych ma pole rodziny produktu (dom / spa modułowe / pergola) niezależne od dzisiejszego `category`, podkategorie per rodzina są ustalone i zapisane w spec, a decyzja jawnie mówi, które dzisiejsze pola/ekrany (kreator producenta, silnik zgodności, analiza działki) są wspólne dla wszystkich rodzin, a które wymagają wariantu per rodzina.
- [x] Zaprojektuj (spec): [0022](../specs/0022-rodziny-produktow-i-kategorie/index.md) (pole `family` niezależne od `category`, osobna kolumna podkategorii per rodzina, wspólny `technicalSpecs` jsonb walidowany Zod, `CHECK` chroniący przed pomieszaniem rodzin; kategorie kontroli zgodności per rodzina spisane, wdrożenie zostaje dla funkcji 14)
- [x] Zbuduj: `/develop rodziny produktów i kategorie` (kod w `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/product-technical-specs.ts`, `lib/data/types.ts`, `lib/producer-project-draft.ts`, `lib/producer-products.ts`, `lib/local-client-projects.ts`, `components/producent/ProjectWizard*.tsx`, `components/producent/ProductEditWizard.tsx`, `components/klient/CategoryShowcase.tsx`, `drizzle/0003_happy_princess_powerful.sql`, `drizzle/0004_black_karen_page.sql`; migracja wygenerowana w dwóch krokach — dodanie kolumn, potem usunięcie 8 starych — żeby ominąć interaktywny prompt drizzle-kit o zmianę nazwy kolumny, i zastosowana na realnej bazie Neon, schemat potwierdzony na żywo. `CategoryFilterBar` nietknięty, zgodnie z AC-9.)
  - [x] Migracja schematu (`family`, `spaSubcategory`, `pergolaSubcategory`, `technicalSpecs`, ograniczenie `CHECK`, usunięcie 8 płaskich kolumn domu) i schematy Zod per rodzina, satisfies AC-1, AC-2, AC-3, AC-4, AC-5
  - [x] Kreator producenta (rodzina/podkategoria w kroku 1, jeden krok techniczny zależny od rodziny, rodzina zablokowana w edycji) i widoki katalogu producenta zaktualizowane pod `technicalSpecs`, satisfies AC-5, AC-6, AC-7
  - [x] `getProductFamilyCounts()` i `CategoryShowcase` na realnych danych, satisfies AC-8
  - [x] `lib/data/types.ts` i fixture'y testowe zaktualizowane o `family`
- [x] Zweryfikuj: `/check verify rodziny produktów i kategorie`
- [x] Testuj: `/test rodziny produktów i kategorie` (kod w `lib/product-technical-specs.test.ts`, `lib/producer-products.test.ts`, `lib/local-client-projects.test.ts`, `components/klient/CategoryShowcase.test.tsx`, `components/producent/ProductEditWizard.test.tsx`, `components/producent/ProjectWizardTechnicalStep.test.tsx`, `components/producent/ProjectWizardPricingStep.test.tsx`, plus extensions to `ProjectWizardTechnicalField.test.tsx` i `lib/db/queries.test.ts` (real Neon integration test for `getProductFamilyCounts()`); 476/476 tests pass)

### 34. Kontenery modułowe zamiast pergoli · full · in progress
Rodzina produktu "pergola" (funkcja 6) została zbudowana hipotetycznie, bez prawdziwego producenta za sobą — w produkcyjnej bazie jest dziś 0 wierszy tej rodziny. Kierunek "styl życia" grupy "Więcej niż dom" (funkcja 26/30) przesuwa się z pergoli na kontenery modułowe, z trzema realnie różnymi zastosowaniami: gastronomiczne, usługowe, mieszkalne. Ta funkcja usuwa `pergola` całkowicie (enum, kolumnę podkategorii, `technicalSpecs`, UI, tłumaczenia) i wprowadza `kontenery-modulowe` w jej miejsce, z trzema własnymi, rozłącznymi kształtami danych technicznych per podkategoria — pierwszy przypadek w tym modelu danych, gdzie o kształcie `technicalSpecs` decyduje subcategory, nie tylko family.
**Done when:** `product.family` nie ma już wartości `pergola` (pełna przebudowa typu enum, nie dopisanie obok), nowa rodzina `kontenery-modulowe` z podkategoriami gastronomiczne/usługowe/mieszkalne działa w kreatorze producenta (własny zestaw pól technicznych per podkategoria), w wyszukiwaniu klienta (grupa "Więcej niż dom") i we wszystkich trzech językach, a migracja jest zweryfikowana na tymczasowej gałęzi Neon przed produkcją.
- [x] Zaprojektuj (spec): [0039](../specs/0039-kontenery-modulowe-zamiast-pergoli/index.md) (direct replace, bezpieczne bo 0 wierszy `family = 'pergola'`; trzy osobne kształty Zod per podkategoria zamiast jednego wspólnego na rodzinę)
- [x] Zbuduj: `/develop kontenery modułowe zamiast pergoli` (kod w `lib/db/schema.ts`, `lib/product-technical-specs.ts`, `lib/data/types.ts`, `lib/product-family-groups.ts`, `lib/results-filters.ts`, `lib/data/projects.ts`, `lib/db/queries.ts`, `lib/producer-product-actions.ts`, `lib/producer-project-draft.ts`, `components/klient/{SearchCard,FamilyTabs,CategoryShowcase,SubcategoryFilterBar,EmptyResults}.tsx`, `components/producent/{ProjectWizardBasicInfoStep,ProjectWizardTechnicalStep,ProjectWizardSummaryStep,ProducerProductList}.tsx`, `app/[locale]/producer/panel/products/[id]/edit/page.tsx`, `messages/{pl,en,nl}.json`, `drizzle/0015_young_justice.sql`, `drizzle/0016_clumsy_veda.sql`, `drizzle/0017_foamy_maximus.sql`; migracja wygenerowana w trzech przebiegach (dodanie `kontenery-modulowe`+`container_subcategory` → przebudowa enuma usuwająca `pergola` i podmiana `CHECK` → usunięcie `pergola_subcategory`) żeby ominąć interaktywny prompt drizzle-kit o zmianę nazwy wartości enuma, zweryfikowana na tymczasowej gałęzi Neon i zastosowana na produkcji, schemat potwierdzony na żywo)
  - [x] Migracja bazy (przebudowa enuma `product_family`, nowy enum/kolumna `container_subcategory`, `CHECK` zaktualizowany) i trzy nowe kształty Zod w `lib/product-technical-specs.ts`, satisfies AC-1, AC-2, AC-3, AC-4, AC-9
  - [x] Model danych aplikacji i warstwa filtrowania (`lib/data/types.ts`, `lib/product-family-groups.ts`, `lib/results-filters.ts`, `lib/data/projects.ts`, `lib/db/queries.ts`, `lib/producer-product-actions.ts`), satisfies AC-2, AC-4, AC-6, AC-7, AC-8, AC-9
  - [x] Kreator producenta (rodzina/podkategoria w kroku 1, pola techniczne per podkategoria w `lib/producer-project-draft.ts` i `ProjectWizardTechnicalStep.tsx`, nowy typ pola `boolean`), satisfies AC-5
  - [x] Wyszukiwanie klienta (`SearchCard`, `FamilyTabs`, `SubcategoryFilterBar`, `CategoryShowcase`) i tłumaczenia `pl`/`en`/`nl`, satisfies AC-6, AC-10
- [ ] Zweryfikuj: `/check verify kontenery modułowe zamiast pergoli`
- [ ] Testuj: `/test kontenery modułowe zamiast pergoli`

### 31. Anglojęzyczne adresy URL i strona główna klienta bez segmentu klient · full · in progress
Adresy platformy pod segmentami next intl (spec 0028: `/pl`, `/en`, `/nl`) są dziś w całości po polsku (`klient`, `producent`, `wyniki` i tak dalej), mimo że treść jest już przetłumaczona. Ta funkcja zmienia wszystkie segmenty adresów na angielskie i przenosi całą ścieżkę klienta, razem ze stroną główną, z `/klient` na sam adres główny danego języka, bo klient jest głównym odbiorcą tej międzynarodowej platformy; producent i panel administracyjny zachowują własny, rozróżniający prefiks. Każdy stary adres trwale przekierowuje na nowy.
**Done when:** każda trasa klienta, producenta i panelu administracyjnego jest dostępna pod nowym, angielskim adresem zgodnie ze spec 0036 (klient bez segmentu na poziomie głównym locale, producent pod `/producer`, panel administracyjny pod nowymi angielskimi segmentami zapytań i produktów), każdy stary polski adres trwale przekierowuje (kod 308) na nowy z zachowanym ciągiem zapytania, a strona szczegółów projektu niesie poprawne tagi hreflang na nowych adresach.
- [x] Zaprojektuj (spec): [0036](../specs/0036-anglojezyczne-adresy-url/index.md)
- [x] Zbuduj: `/develop anglojęzyczne adresy URL i strona główna klienta bez segmentu klient` (kod w `app/[locale]/(customer)/**` (nowa grupa tras, przeniesiona z `klient/`, strona główna renderuje się wprost bez przekierowania), `app/[locale]/producer/**` (przeniesione z `producent/`), `app/[locale]/internal/{inquiries,products}/**` (przeniesione z `zapytania`/`produkty`), `proxy.ts` (pełna tabela przekierowań 308, zakotwiczona i posortowana od najdłuższego prefiksu, plus specjalna reguła dla `producent/panel/produkty/[id]/edytuj` gdzie zmieniany segment leży po dynamicznym id, i scalenie blokady języka panelu administracyjnego z przekierowaniem segmentu w jeden skok), `components/klient/{SiteHeader,PanelTabs,...}.tsx`, `components/producent/{ProducerHeader,ProducerPanelTabs,...}.tsx`, `lib/panel-session.ts`, `lib/results-filters.ts`; ok. 90 plików zaktualizowanych łącznie (strony, komponenty, testy jednostkowe i end to end); build/typecheck/lint czyste, 671/672 testów przechodzi (jedyny fail, `lib/product-family-groups.test.ts`, niezwiązany z tą funkcją), zweryfikowane też na żywo w przeglądarce/curl (strona główna bez przekierowania, przekierowania 308 ze starych adresów klienta/producenta/panelu administracyjnego z zachowanym ciągiem zapytania)
  - [x] Cała ścieżka klienta (strona główna, wyniki, zapytanie, działka, projekt, realizacja, rejestracja, panel, logowanie) przeniesiona do grupy tras `(customer)` na poziom główny locale, z pełną mapą przekierowań w `proxy.ts`, satisfies AC-1, AC-2, AC-5, AC-6, AC-9
  - [x] Trasy producenta przeniesione pod `/producer` z nowymi angielskimi segmentami, satisfies AC-3, AC-5, AC-6
  - [x] Panel administracyjny przeniesiony na `internal/inquiries` i `internal/products`, przekierowania scalone z dzisiejszą blokadą języka, satisfies AC-4, AC-5, AC-6
  - [x] Hreflang strony szczegółów projektu i testy end to end zaktualizowane na nowe adresy, satisfies AC-7, AC-8
- [ ] Zweryfikuj: `/check verify anglojęzyczne adresy URL i strona główna klienta bez segmentu klient`
- [ ] Testuj: `/test anglojęzyczne adresy URL i strona główna klienta bez segmentu klient`

## Slice 0: Wersje językowe (PL/EN/NL/DE)

### 25. Wersje językowe (EN/NL/DE) i przełącznik języka · full · in progress
Rozszerzenie platformy z jednojęzycznego (polskiego) pilotu o pełne wersje angielską, holenderską i (od 2026-09-15) niemiecką, routing (next intl), przetłumaczona treść UI i danych producenta, oraz hreflang, razem z działającym przełącznikiem języka w nagłówku klienta i producenta (dziś wyłączony placeholder w `SiteHeader`; w toku projektowania okazało się, że osobnej stopki jeszcze nie ma, więc przełącznik zostaje w nagłówku zamiast czekać na nią). Numerowana jako 25 (dopisana po fakcie, kolejność budowy wyznacza miejsce w dokumencie, nie numer), ale budowana jako Slice 0, zaraz po fundamentach, przed dalszym ciągiem slice'ów transakcyjnych, na wyraźne życzenie zamawiającego. Dokumenty prawne z funkcji 5 (RODO, jeszcze nieistniejące) zostają odłożone, patrz Deferred; niemiecki był tam też odłożony, ale 2026-09-15 wrócił jako część tej samej funkcji (spec 0028 zaktualizowany, nie nowa specyfikacja).
**Done when:** każda publiczna i zalogowana strona klienta i producenta (poza panelem administratora, świadomie wyłącznie polskim) jest dostępna po `/en`, `/nl` i `/de` obok `/pl` z przetłumaczoną treścią UI oraz nazwą/opisem produktu (z fallbackiem do polskiego, gdy producent jeszcze nie przetłumaczył), przełącznik języka w nagłówku pozwala się przełączyć bez utraty kontekstu (ta sama strona, ten sam stan URL), a strony niosą poprawne tagi hreflang.
- [x] Zaprojektuj (spec): [0028](../specs/0028-wersje-jezykowe-en-nl/index.md) (next intl zastępujący `proxy.ts`, wykrywanie `Accept-Language` + ciasteczko, nowa tabela `product_translation` z fallbackiem do polskiego, przełącznik w `SiteHeader`/`ProducerHeader`, hreflang z `x-default`, rozszerzone 2026-09-15 o niemiecki jako czwarty język tego samego mechanizmu; dokumenty prawne funkcji 5 i tłumaczenie certyfikatów/podpisów galerii świadomie poza zakresem, bo te pola nie istnieją jeszcze w prawdziwej bazie)
- [ ] Zbuduj: `/develop wersje językowe (EN/NL) i przełącznik języka`
  - [ ] Fundament routingu next intl: middleware zastępujący `proxy.ts` z wykrywaniem `Accept-Language` i ciasteczkiem (`en`/`nl` wdrożone od razu, nie w dwóch krokach), wydobycie polskich stringów UI do katalogów komunikatów, satisfies AC-1 (fundament), AC-2, AC-3, AC-10 — **routing zrobiony i zweryfikowany na żywo (`/`→wykrycie języka, `/de/klient`→`/pl/klient`, `/en/internal/...`→`/pl/internal/...`); wydobycie stringów w toku (uruchomienie 2026-09-07): 21 z ok. 76 plików klienta/producenta z realną treścią przekonwertowane na `useTranslations`/`getTranslations` z prawdziwym tłumaczeniem EN/NL od razu (nie tymczasową kopią polskiego) — `components/ui/{FileUpload,StageTimeline}.tsx`, `app/[locale]/{klient,producent}/realizacja/page.tsx`, `components/producent/ProducerFulfillmentList.tsx`, oraz 15 komponentów `components/klient/*` (ResultCard, ResultsHeader, EmptyResults, PanelEmptyState, ProjectCertifications, InquiryConfirmationCard, PopularHomeCard, ProducerCard, PlotAnalysisRow, PlotDossierPanel, FavoriteButton, FavoriteCard, FavoriteCompareTable + pomocnicze namespace'y `FulfillmentStage`/`StageTimelineStatus`/`ProductFamilyNoun`/`CountryLocative`); ok. 43 pliki (głównie `components/producent/*` — kreator, zapytania/oferty, weryfikacja, gotowość eksportowa — i kilka stron `app/[locale]/klient/**`) wciąż mają zaszyty na sztywno polski tekst, do dokończenia w kolejnych uruchomieniach `/develop`, plik po pliku. Po drodze rozwiązany load bearing problem infrastruktury testowej (żaden test next-intl wcześniej nie istniał): `vitest.setup.ts` teraz mockuje `next-intl`/`next-intl/server` tak, że `t()` czyta realne stringi z `messages/pl.json` bez potrzeby `NextIntlClientProvider` w każdym teście; `test/resolve-async-tree.ts` rozwiązuje zagnieżdżone async Server Components (RTL `render()` nie potrafi ich wywołać samo) przed `render()`. Też ustalona zasada: komponent renderowany wyłącznie z rodzica `"use client"` (np. `ResultCard` z `ResultsSelection`) musi zostać `useTranslations` (sync, client), nigdy `getTranslations` (async, server) — inaczej React rzuca "async Client Component"; `StageTimeline` (generyczny prymityw `components/ui/`) przyjmuje `statusLabels` jako prop zamiast własnego tłumaczenia, zgodnie z konwencją "prymitywy nie niosą własnej treści". Uruchomienie 2026-09-07 (drugie tego dnia): cały kreator pierwszego projektu producenta (`components/producent/ProjectWizard.tsx` + jego siedem kroków `ProjectWizardBasicInfoStep`/`ProjectWizardTechnicalStep`/`ProjectWizardPricingStep`/`ProjectWizardFilesStep`/`ProjectWizardSummaryStep`/`ProjectWizardProgress`, plus `ProductEditWizard.tsx`, edycja produktu — reużywa te same kroki) przekonwertowany, z prawdziwym tłumaczeniem EN/NL od razu. Etykiety enumów/pól technicznych współdzielone między kreatorem i `components/klient/SubcategoryFilterBar.tsx` (przełącznik podkategorii na `/wyniki`, też przekonwertowany przy okazji) wyciągnięte z `lib/producer-project-draft.ts` do nowych `get*Options(t)`/`getTechnicalFieldsByFamily(t)` funkcji (namespace `ProjectOptions` w `messages/*.json`) zamiast statycznych polskich stałych — jedno źródło etykiety, nie duplikat per ekran; struktura pól (`TECHNICAL_FIELDS_BY_FAMILY`, `HEAT_SOURCE_OPTIONS` itd.) zostaje nietknięta dla walidacji i istniejących testów `lib/producer-project-draft.test.ts`. Zweryfikowane na żywo w przeglądarce (`/en/producent/projekt`): rodzina/kategoria/pola techniczne domu (w tym selecty źródła ciepła) po angielsku. Świadomie NIE w zakresie tego uruchomienia (odnotowane, nie zapomniane): domyślny placeholder "Wybierz…" w prymitywie `components/ui/Select.tsx` zostaje polski (dotyka dziesiątki ekranów, osobne zadanie), tak samo nazwy krajów z `lib/data/countries.ts` (osobne źródło danych, nie string UI). Po tym uruchomieniu ok. 60 plików (`components/producent/*` — zapytania/oferty, weryfikacja, gotowość eksportowa, katalog produktów, rejestracja — i strony `app/[locale]/klient/**`/`app/[locale]/producent/**`) wciąż mają zaszyty na sztywno polski tekst.** Uruchomienie 2026-09-07 (trzecie tego dnia): dokończone wydobycie stringów na całej reszcie odkrytych plików — strona szczegółów projektu klienta (`klient/projekt/[id]/page.tsx`, wraz z `ProjectTechnicalSpecs.tsx`, wcześniej całkowicie pominięta, zero wywołań `useTranslations`/`getTranslations`), cała strona startowa (`Hero`, `SearchCard`, `ComplianceEngineShowcase`, `CompareHomesTeaser`, `ProducerShowcase`, `PopularHomes`, plus już zrobione `Faq`/`Testimonials`/`ClosingCta`/`HowItWorksExplainer`/`CategoryShowcase`), reszta `components/klient/*` (`ResultsFilterBar`, `FamilyTabs`, `CategoryFilterBar`, `BindingOfferView`, `InquiryFlow`, `ProfileForm`, `PanelTabs`, `ProjectGallery`, `ResultsSelection`, `ShortlistActionBar`), reszta `components/producent/*` (`CompanyVerificationView`, `ExportReadinessCountryRow`/`Map`, `GapClosureView`/`UploadSection`/`PackageSection`, `ProducerInquiryRow`/`List`, `ProducerOfferForm`, `RegistrationForm`, `ProducerRegistrationBar`, `ProductCatalogList`, `DeleteProductDialog`), oraz nowo odkryty trzeci komponentowy katalog `components/auth/*` (`ClientRegistrationForm`, `LoginForm`, `ProducerRegistrationForm` — logowanie/rejestracja nie były w zakresie żadnego wcześniejszego przebiegu) i drobne strony (`producent/page.tsx`, `klient/panel/{zapytania,ulubione,profil}/page.tsx`). Po drodze naprawiona realna regresja: dodanie `getTranslations` do `producent/page.tsx` zdjęło ją ze statycznego renderowania (SSG) — poprawione dodaniem `setRequestLocale(locale)` w samej stronie, potwierdzone w buildzie (`● /pl|en|nl/producent` z powrotem). Rozszerzony `test/resolve-async-tree.ts`: wykrywanie błędu wywołania hooka poza renderem było za wąskie (łapało tylko komunikat "Invalid hook call"/"dispatcher", nie React 19-ową postać `Cannot read properties of null (reading 'useRef')` rzucaną przy `ScrollReveal` i podobnych) — rozszerzony regex, bez czego żaden test z zagnieżdżonym klienckim komponentem pod nowo-asynchronicznym rodzicem by nie przeszedł. Stan po tym uruchomieniu: pełny przegląd `git status` (pliki nietknięte przez żaden wcześniejszy przebieg) nie znalazł już żadnego pliku z realną, nieprzetłumaczoną treścią UI w `components/klient/`, `components/producent/`, `components/auth/` ani w stronach `app/[locale]/**/page.tsx` (poza świadomie polskim panelem administratora) — AC-1 uznane za funkcjonalnie kompletne dla całej odkrytej powierzchni, chociaż bez formalnego `/check verify`. Świadomie NIE w zakresie (te same dwa wyjątki co poprzednio, nieodkryte): domyślny placeholder "Wybierz…" w `components/ui/Select.tsx` i nazwy krajów z `lib/data/countries.ts`. Nowo odkryty, nietknięty gap: `lib/auth-registration.ts` (walidacja Zod + komunikaty błędów logowania/rejestracji) zostaje po polsku — schemat Zod budowany raz przy starcie modułu, nie per-request, więc nie może po prostu wywołać `getTranslations()`; wymaga przebudowy (budowanie schematu wewnątrz akcji serwerowej per wywołanie), świadomie odłożone jako osobne zadanie, nie blokuje reszty tej funkcji.**
  - [ ] Przełącznik, hreflang, testy: działający przełącznik w `SiteHeader`/`ProducerHeader`, `alternates.languages` + `x-default` na stronach z `generateMetadata`, test spójności katalogów, aktualizacja e2e, satisfies AC-4, AC-8, AC-9 — **przełącznik zrobiony w obu nagłówkach (`components/ui/LanguageSwitcher.tsx`), zweryfikowany w przeglądarce łącznie z zachowaniem query stringu (`/pl/klient/wyniki?sizeMin=80`→EN→`/en/klient/wyniki?sizeMin=80`); hreflang zrobiony na jedynej dzisiejszej stronie z `generateMetadata` (szczegóły projektu), zweryfikowany na żywo; test spójności katalogów zrobiony (`lib/i18n/messages.test.ts`) i przechodzi; aktualizacja testów e2e (10 plików w `e2e/`, dziś asertują gołe `/pl`) jeszcze nie zrobiona — uruchomienie 2026-09-07 (trzecie tego dnia) sprawdziło jeden z nich (`e2e/projekt-szczegoly.spec.ts`) na żywo i trafiło na osobny, wcześniejszy problem niezwiązany z tą funkcją: testy uderzają w prawdziwą bazę Neon (nie mock), a ich fixture'owe id (np. `prj-modulor-family-90`) nie są prawdziwymi `uuid` kolumny `product.id` od czasu migracji na realne zaplecze (spec 0023) — cały plik/wzorzec `prj-*` w e2e jest dziś martwy niezależnie od i18n, do naprawy osobno, nie w tej funkcji**
  - [ ] Tłumaczenie treści producenta: tabela `product_translation`, zakładki językowe w kreatorze, fallback do polskiego, backfill produktów, satisfies AC-5, AC-6, AC-7 — **migracja zrobiona i zweryfikowana na żywej bazie (`lib/db/schema.ts`, `drizzle/0009_warm_golden_guardian.sql`); strona odczytu zrobiona i zweryfikowana (`lib/data/projects.ts`: `getProjects`/`getProjectById`/`getFeaturedProjectByFamily` LEFT JOIN + fallback do polskiego, podłączone na `klient/page.tsx`, `klient/wyniki/page.tsx`, `klient/projekt/[id]/page.tsx`, `klient/dzialka/page.tsx`, `klient/zapytanie/page.tsx`); backfill zrobiony i zweryfikowany na żywej bazie (2026-09-07, Neon MCP): opis EN/NL dla wszystkich 53 opublikowanych produktów w bazie (nie tylko Budman/Cocomodule — też Baltyk Modular, Karpaty Haus, Modulor Systems, Steel House), nazwa świadomie NIE tłumaczona (zostaje polska nazwa modelu, fallback identyczny jak dla produktu bez tłumaczenia), satisfies AC-7 rozszerzone na cały dzisiejszy katalog. Strona zapisu do PRAWDZIWEJ bazy (kreator producenta zapisujący bezpośrednio do `product`/`product_translation`) świadomie odłożona: kreator producenta (funkcja 12) i katalog produktów (funkcja 18) zostają na `localStorage`/mocku, produkty w bazie zostają "przykładowe/pilotażowe" zarządzane ręcznie przez Neon MCP (decyzja zamawiającego 2026-09-07); realny zapis producenta do bazy to osobna, przyszła decyzja, nie blokuje już tej funkcji. Uruchomienie 2026-09-07 (trzecie tego dnia) jednak zrealizowało samą literę AC-5 (zakładki językowe zbierające `nameEn`/`nameNl`/`descriptionEn`/`descriptionNl` w kroku podstawowym kreatora, obok pól polskich) wewnątrz istniejącej architektury mock/`localStorage` — bez dotykania kwestii prawdziwego zapisu do bazy, którą powyższa decyzja świadomie odkłada: `ProjectDraft`/`SavedProduct` (`lib/data/types.ts`) i `lib/producer-project-draft.ts`/`lib/producer-products.ts` rozszerzone o te cztery pola, plus zakładki PL/EN/NL w `ProjectWizardBasicInfoStep.tsx` (współdzielony przez `ProjectWizard` i `ProductEditWizard`). To nie stoi w sprzeczności z decyzją o odłożeniu — dotyczy tylko UI/mocka, nie prawdziwego zapisu — ale skoro poprzednia notatka jawnie odnotowała AC-5 jako "świadomie nie zrealizowane", warto potwierdzić przy `/check verify`, czy ten zakres faktycznie był chciany, czy do wycofania.**
  - [ ] Właściwe tłumaczenie treści UI: zamiana tymczasowych polskich kopii w `en.json`/`nl.json` na prawdziwy tekst, strona po stronie, satisfies AC-1 (treść) — **`en.json`/`nl.json` nie są tymczasowymi kopiami `pl.json` (jak zakładał plan migracji), tylko od razu prawdziwym tłumaczeniem w każdym namespace w miarę wydobywania (34 namespace'y na 2026-09-07, patrz zadanie wyżej; kolejne ~35 namespace'ów dodanych w trzecim uruchomieniu tego samego dnia, też od razu z prawdziwym EN/NL, nie kopią); po trzecim uruchomieniu praktycznie cała odkryta treść UI ma prawdziwe tłumaczenie — pozostaje `lib/auth-registration.ts` (patrz notatka wyżej) i ewentualne, jeszcze nieodkryte pojedyncze stringi**
- [x] Rozszerzenie o niemiecki: `'de'` w `productTranslationLocaleEnum` i `routing.locales`, pełne tłumaczenie `messages/de.json` (nie tymczasowa kopia), test spójności katalogów rozszerzony, testy i e2e zaktualizowane na cztery języki, backfill DE dla wszystkich opublikowanych produktów, satisfies AC-1 do AC-9 rozszerzone o DE (spec 0028 zadania 12 do 18) — **uruchomienie 2026-09-15: zadania 12–18 zrobione. Kod zweryfikowany testami (`npx vitest run`, 836/839 zielone; 3 czerwone to przedistniejące, niezwiązane z i18n testy na żywej bazie Neon, potwierdzone przez `git stash`/porównanie przed i po tej zmianie). Migracja `'de'` w `productTranslationLocaleEnum` wygenerowana (`drizzle/0018_magical_chat.sql`, `ALTER TYPE ... ADD VALUE 'de'`, ten sam wzorzec co `0015_young_justice.sql`) i zastosowana na żywej bazie przez Neon MCP (`npm run db:migrate` nie działał w tym środowisku, CLI wisiał bez błędu na połączeniu WebSocket do Neon — obejście: `ALTER TYPE` wykonany bezpośrednio przez `run_sql`, potwierdzony `pg_enum`, i ręcznie dopisany do `drizzle.__drizzle_migrations` z hashem SHA-256 pliku migracji, żeby przyszły `db:migrate` nie próbował go powtórzyć). `"de"` dodane do `routing.locales` (`lib/i18n/routing.ts`) — przełącznik, blokada `/de/internal/...` i hreflang objęły niemiecki automatycznie, zweryfikowane testami `proxy.test.ts`/`LanguageSwitcher.test.tsx`, nie ręcznie w przeglądarce. Przykład nierozpoznanego języka w `proxy.ts`/`proxy.test.ts` zaktualizowany z `/de` na `/fr` (bo `/de` przestało być nierozpoznane), plus nowe testy regresyjne potwierdzające, że `/de/results` i `/de/internal/...` są teraz traktowane jak każdy inny rozpoznany język. `messages/de.json` utworzony jako pełne, prawdziwe tłumaczenie (nie kopia `pl.json`) w formalnym rejestrze (Sie/Ihr), z kluczem `LanguageSwitcher.de` dopisanym też do `pl.json`/`en.json`/`nl.json`; zgodność kluczy ze wszystkimi trzema pozostałymi katalogami potwierdzona skryptem porównującym spłaszczone klucze (0 brakujących, 0 nadmiarowych na 929 kluczy) i testem Vitest (`lib/i18n/messages.test.ts` rozszerzony o `de.json`). `LanguageSwitcher.test.tsx` rozszerzony na cztery opcje (PL/EN/NL/DE). Przegląd `e2e/` pod kątem założenia "dokładnie trzy języki" nie znalazł żadnego pliku odwołującego się do listy locale — nic do zmiany. Backfill (zadanie 18, przez Neon MCP po potwierdzeniu zamawiającego): żywa baza ma dziś 88 opublikowanych produktów, nie 53 jak zapisano w AC-7/rationale — 21 produktów Castor (dodane 2026-09-09) i 21 DomiHaus (import w toku, 2026-09-14, osobne niezwiązane zadanie) nigdy nie dostały EN/NL, więc backfill objął dokładnie te same 46 produktów, które już miały tłumaczenie EN/NL (Budman House, Cocomodule, StanAutomation, Steel House — nie 6 producentów jak w oryginalnej notatce, bo Baltyk Modular/Karpaty Haus/Modulor Systems zniknęły z żywej bazy od czasu tamtego backfillu), zachowując zasadę „ten sam zakres co EN/NL", nazwa świadomie NIE tłumaczona (ten sam fallback co EN/NL). Zweryfikowane zapytaniem `EXCEPT`: każdy `product_id` z tłumaczeniem `en` ma teraz też `de` (0 braków). AC-7 i notatka wyżej w tym pliku wymagają korekty liczby 53→46 i listy producentów przy najbliższym `/sync` — nie zrobione w tym uruchomieniu (poza zakresem `/develop`). **`/check verify` (2026-09-15) znalazł realny brak wykryty dopiero na żywo**: `lib/data/projects.ts` w czterech miejscach (`getProjects`, `getProjectById`, `getFeaturedProjectByFamily`, i czwarte wywołanie tej samej gałęzi) sprawdzało `locale === "en" || locale === "nl"` bez `"de"`, więc mimo poprawnych danych w bazie i poprawnego routingu/UI, `/de/project/[id]` zawsze pokazywał polski opis zamiast niemieckiego tłumaczenia — AC-5/AC-6/AC-7 były de facto niezastosowane dla niemieckiego. Naprawione tym samym uruchomieniem (`/develop`, ten sam dzień): dopisane `|| locale === "de"` do wszystkich czterech warunków, plus komentarz wyżej w pliku (`en/nl` → `en/nl/de`). Zweryfikowane ponownie na żywo w przeglądarce: `/de/project/328c13f1-...` (Pomerania 20, ma wiersz `de` w `product_translation`) teraz pokazuje prawdziwy niemiecki opis; `/de/project/c0240000-...` (DomiHaus, bez tłumaczenia) nadal poprawnie spada na polski, bez błędu. `npx tsc --noEmit` czysty, `npx vitest run` niezmienione 836/839 (te same 3 przedistniejące, niezwiązane czerwone testy na żywej bazie).**
- [ ] Zweryfikuj: `/check verify wersje językowe (EN/NL/DE) i przełącznik języka`
- [ ] Testuj: `/test wersje językowe (EN/NL/DE) i przełącznik języka`

## Slice 1: klient na realnym zapleczu

### 7. Klient na realnym zapleczu, dane producentów zasiane ręcznie · full
Zastępuje pierwotny plan symetrycznego „rdzenia pętli" (obie strony przez samoobsługowy formularz). Producent nie rejestruje się jeszcze sam: jego konto i produkty trafiają do bazy ręcznie, z pomocą Claude i Neon MCP, na bazie prawdziwych danych od pierwszych producentów (Budman House, Cocomodule), już z rodziną produktu ustaloną w funkcji 6. Klient dostaje realne konto i widzi te dane w wynikach pobranych z bazy zamiast z fixture'ów, a wysłane zapytanie jest trwale zapisane. Skupiamy się najpierw na kliencie, bo to jego dopracowujemy na pokaz inwestorom, a pierwsze oferty i tak robi ręcznie zamawiający (basis: podejście Tracer Bullet, jeden prawdziwy wątek przed rozbudową — tu jednak asymetryczny, nie oba końce naraz).
**Done when:** przynajmniej jeden prawdziwy producent i jego produkt(y) istnieją w bazie (dodane ręcznie, z przypisaną rodziną produktu), klient zakłada konto i widzi te produkty w wynikach pobranych z bazy zamiast z fixture'ów, a wysłane zapytanie jest trwale zapisane i widoczne (prosty widok wewnętrzny wystarczy — pełny panel admina to osobna, późniejsza funkcja 18).
- [x] Zaprojektuj (spec): [0023](../specs/0023-klient-na-realnym-zapleczu/index.md) (logowanie linkiem magicznym dla klienta i producenta, Resend; ręczne zasianie pierwszego producenta/produktu przez Neon MCP; `/wyniki` czytane z bazy z przełącznikiem rodziny produktu; zapytanie trwale zapisane z widokiem wewnętrznym dla roli administratora)
- [ ] Zbuduj: `/develop klient na realnym zapleczu` (kod w `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth-registration.ts`, `lib/auth-shared.ts`, `lib/auth-session-actions.ts`, `lib/inquiry-actions.ts`, `lib/db/schema.ts` (+ migracja `drizzle/0005_lonely_magik.sql`, zastosowana na realnej bazie Neon, schemat potwierdzony na żywo), `lib/data/projects.ts`, `lib/data/producer-mock-projects.ts` (nowy — pięć ekranów producenta, spec 0023 nie dotyka, dalej czyta stary fixture), `components/auth/*`, `components/klient/FamilyTabs.tsx`, `app/[locale]/logowanie/`, `app/[locale]/klient/rejestracja/`, `app/[locale]/producent/rejestracja/`, `app/[locale]/internal/zapytania/`; 483/483 testów przechodzi, build/typecheck/lint czyste)
  - [x] Migracja schematu (`product.cover_image_url`, `users.phone`, `inquiry.idempotency_key`, tabela `pending_registration`) i podłączenie Auth.js w wersji 5 (link magiczny, sesje w bazie, ochrona przed logowaniem na nieznany e mail), satisfies AC-2, AC-3, AC-8, AC-10, AC-11
  - [ ] Formularze rejestracji klienta i producenta gotowe; **ręczne zasianie pierwszego prawdziwego producenta i produktu przez Neon MCP jeszcze nie zrobione — czeka na prawdziwe dane (Budman House/Cocomodule) od Ciebie**, satisfies AC-1, AC-2, AC-3
  - [x] `/wyniki` czytane z bazy (przez `lib/data/projects.ts`) z przełącznikiem rodziny produktu, satisfies AC-4, AC-6
  - [x] Bramka logowania na `/klient/zapytanie` i trwały zapis zapytania (`submitInquiry`, błąd + ponów, ochrona przed duplikatem), satisfies AC-5, AC-6, AC-7, AC-8
  - [ ] Widok wewnętrzny zapytań (`/internal/zapytania`, rola administratora) gotowy; **ręczne oznaczenie własnego konta rolą admin jeszcze nie zrobione — czeka, aż zarejestrujesz się przez prawdziwy formularz**, satisfies AC-9
- [ ] Zweryfikuj: `/check verify klient na realnym zapleczu`
- [ ] Testuj: `/test klient na realnym zapleczu`

## Slice 2: dopracowanie strony klienta

### 8. Dopracowanie wyszukiwania i wyników (klient)
Rozszerzenie dzisiejszej strony wyników (epika Prototyp, funkcja 6 — dziś tylko kraj i widełki metrażu) o głębsze wyszukiwanie i filtrowanie na prawdziwych danych z funkcji 7, w tym filtrowanie po rodzinie produktu i podkategorii z funkcji 6: więcej kryteriów, sortowanie, ewentualnie wyszukiwanie tekstowe — konkretny zakres do ustalenia w spec.
**Done when:** klient może zawęzić i posortować wyniki więcej niż jednym kryterium (w tym rodziną produktu) na realnych danych z bazy, a pusta lista i błędne parametry URL zachowują dzisiejszy łagodny fallback (bez błędu).
- [x] Zaprojektuj (spec): [0026](../specs/0026-dopracowanie-wyszukiwania-i-wynikow/index.md) (enum dla heatSource/ventilation/energyClass, CategoryFilterBar i podkategorie podłączone do prawdziwych danych, filtr ceny, sortowanie, wyszukiwanie pełnotekstowe Postgres tsvector+GIN, jednorazowy backfill istniejących produktów przez Neon MCP)
- [x] Zbuduj: `/develop dopracowanie wyszukiwania i wyników` — code in `lib/results-filters.ts`, `lib/data/projects.ts`, `lib/product-technical-specs.ts`, `lib/producer-project-draft.ts`, `lib/db/schema.ts` + `drizzle/0008_cheerful_ben_urich.sql`, `components/klient/{CategoryFilterBar,SubcategoryFilterBar,ResultsFilterBar,EmptyResults}.tsx`, `components/producent/ProjectWizardTechnicalStep.tsx`, `app/[locale]/klient/wyniki/page.tsx`
  - [x] Fundament danych: migracja (enum technicalSpecs, kolumna search_vector + indeks GIN, indeksy family/floor_area_m2/price_min_cents/wyrażeniowe) i ręczny backfill istniejących produktów domu przez Neon MCP, satisfies AC-12, AC-13
  - [x] Filtrowanie i sortowanie serwerowe: rozszerzone `lib/results-filters.ts` i `getProjects()` (wszystkie filtry w SQL, wyszukiwanie prefiksowe, sortowanie), satisfies AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-10
  - [x] Kreator producenta: pola heatSource/ventilation/energyClass jako selektory zamiast wolnego tekstu
  - [x] UI wyników: CategoryFilterBar i podkategorie podłączone do danych, pole wyszukiwania i sortowanie w pasku filtra, pusty stan świadomy rodziny produktu, satisfies AC-7, AC-8, AC-9, AC-11
  - [x] Dostępność: chipy jako prawdziwe elementy interaktywne, WCAG 2.2 AA, satisfies AC-14
- [x] Zweryfikuj: `/check verify dopracowanie wyszukiwania i wyników`
- [x] Testuj: `/test dopracowanie wyszukiwania i wyników`

### 9. Domknięcie wizualne ścieżki klienta (marka v4)
Dziś tokeny marki v4 (spec 0013, epika Prototyp funkcja 17) konsumuje tylko strona startowa; reszta ścieżki klienta (wyniki, zapytanie, działka, oferta, realizacja, szczegóły projektu) zostaje na v3. Migracja całej ścieżki klienta na v4 dla spójnego, bliskiego finalnemu wyglądu, plus przegląd interakcji/mikroanimacji i dopracowanie pod telefon.

> ⚠️ Opis powyżej jest nieaktualny: spec [0027](../specs/0027-domkniecie-wizualne-sciezki-klienta/index.md) ustaliło, że właściwym celem jest v5 (jasny premium kierunek już używany przez stronę startową i nagłówek od spec 0015), nie v4 (który zostaje zarezerwowany dla zdjęciowych/ciemnych sekcji). Aktualizuj ten opis przy najbliższym `/scope`.

**Done when:** każdy z ośmiu ekranów ścieżki klienta (wyniki, zapytanie, oferta, szczegóły projektu, działka, realizacja, panel klienta, rejestracja) konsumuje tokeny v5, przechodzi ten sam kontrast i test dostępności co dziś, a układ jest dopracowany na wąskich ekranach.
- [x] Zaprojektuj (spec): [0027](../specs/0027-domkniecie-wizualne-sciezki-klienta/index.md) (v5 jako główny cel, v4 zarezerwowane dla zdjęciowych/ciemnych sekcji, nowy wariant `surface` na dziesięciu współdzielonych prymitywach żeby nie dotknąć strony producenta)
- [x] Zbuduj: `/develop domknięcie wizualne ścieżki klienta` (kod w `components/ui/{Button,Card,Input,Select,Checkbox,Label,Heading,Text,DataText,StageTimeline}.tsx` — nowy wariant `surface`; ośmiu ekranów klienta w `components/klient/*`, `components/auth/ClientRegistrationForm.tsx`, `app/[locale]/klient/{wyniki,zapytanie,oferta,projekt/[id],dzialka,realizacja,panel/*,rejestracja}/`; testy zaktualizowane, flaky `InquiryFlow.test.tsx` race naprawiony `findByRole`)
  - [x] Fundament: wariant `surface` na `Button`/`Card`/`Input`/`Select`/`Checkbox`/`Label`/`Heading`/`Text`/`DataText`/`StageTimeline`, zero zmiany na stronie producenta (satisfies AC-2, AC-3, AC-4)
  - [x] Ekrany priorytetowe: wyniki, zapytanie, oferta na v5 (satisfies AC-1, AC-5 do AC-9)
  - [x] Dokończenie: szczegóły projektu, działka, realizacja na v5 (satisfies AC-1, AC-5 do AC-9)
  - [x] Panel klienta i rejestracja na v5 (satisfies AC-1, AC-5 do AC-9)
  - [x] Przegląd WCAG 2.2 AA całości ośmiu ekranów (satisfies AC-9) — naprawiono kontrast tekstu `amber-strong` na białym (~2.5:1 → `ink`), patrz spec Follow-up dla tego samego problemu poza zakresem (SiteHeader/LoginForm/ProducerRegistrationForm/CategoryShowcase)
- [x] Zweryfikuj: `/check verify domknięcie wizualne ścieżki klienta` (wyniki/oferta/działka/szczegóły projektu/rejestracja i regresja producenta potwierdzone na żywo w przeglądarce; zapytanie, panel klienta i oś realizacji potwierdzone ręcznie przez Ciebie, poza zasięgiem tej sesji — sesja klienta/magic link i brak żywego zamówienia na realnym projekcie)
- [ ] Testuj: `/test domknięcie wizualne ścieżki klienta`

### 10. Treść i luki funkcjonalne klienta · needs a decision
Zbiera rozproszone dziś w Deferred obu epik pozycje wpływające na wiarygodność i kompletność strony klienta: stopka (kontakt, informacje prawne — treść częściowo pokryta przez funkcję 5 RODO, bez przełącznika języka, bo aktywny jest dziś tylko polski), decyzja o walucie natywnej producenta (PLN) obok EUR (realni producenci Budman/Cocomodule podają ceny w PLN, model `Project` jest dziś EUR-only), i wynikające z realnych danych producentów braki na stronie szczegółów projektu (certyfikaty, galeria, próg zgłoszenia uproszczonego).
**Done when:** stopka (kontakt, informacje prawne) jest widoczna na każdej stronie klienta, decyzja o walucie jest podjęta i zaimplementowana, a strona szczegółów projektu pokazuje certyfikaty/galerię dla produktów dodanych ręcznie w funkcji 7.
- [ ] Zaprojektuj (spec): `/architect treść i luki funkcjonalne klienta`

### 24. Panel klienta (moje zapytania i ulubione)
Miejsce dla zalogowanego klienta, żeby zobaczyć swoje wysłane zapytania i zapisywać domy do ulubionych. Dziś (funkcja 7) klient ma konto i może wysłać zapytanie, ale po wysłaniu nie ma żadnego miejsca, żeby je ponownie zobaczyć, i nie ma sposobu zapisania interesującego domu bez od razu wysyłania zapytania — a dom to zwykle duża inwestycja, więc klienci wracają do przeglądanych opcji więcej niż raz. Zakres (dane ulubionych to nowa tabela, struktura strony) do ustalenia w spec.
**Done when:** zalogowany klient widzi w jednym miejscu listę własnych wysłanych zapytań (produkty, status), może oznaczyć dowolny dom jako ulubiony z wyników lub ze strony szczegółów i przejrzeć listę ulubionych, a każdy klient widzi wyłącznie własne dane.
- [x] Zaprojektuj (spec): [0024](../specs/0024-panel-klienta/index.md) (trzy osobne podstrony pod wspólnym layoutem panelu, zapytania/ulubione/profil, nowa tabela `favorite`, porównanie side by side dla 2+ ulubionych, wejście z już istniejącego przycisku "Ulubione" w nagłówku)
- [x] Zbuduj: `/develop panel klienta` (kod w `app/[locale]/klient/panel/`, `lib/favorite-actions.ts`, `lib/profile-actions.ts`, `lib/panel-session.ts`, `components/klient/FavoriteButton.tsx`, `FavoriteCard.tsx`, `FavoriteCompareTable.tsx`, `FavoritesGrid.tsx`, `PanelTabs.tsx`, `PanelEmptyState.tsx`, `ProfileForm.tsx`; `favorite` w `lib/db/schema.ts`, migracja `drizzle/0006_clean_owl.sql`)
  - [x] Fundament: migracja `favorite` (+ trigger audytu, zdarzenie PostHog `product_favorited`), wspólny layout `/klient/panel/*` z bramką sesji (brak sesji/zła rola → przekierowanie), satisfies AC-4, AC-5, AC-10
  - [x] Ulubione: akcja `toggleFavorite` (idempotentna, insert/delete na docelowym stanie), serce na `ResultCard` i stronie szczegółów, strona `/klient/panel/ulubione` z oznaczeniem produktów niedostępnych i pustym stanem, satisfies AC-2, AC-3, AC-4, AC-8, AC-10, AC-11
  - [x] Nagłówek: włączenie przycisku "Ulubione" i link do profilu z menu konta, satisfies AC-9
  - [x] Porównanie: zaznaczenie do 3 ulubionych (parametr URL `compare`, walidowany po stronie serwera), tabela porównawcza, satisfies AC-6
  - [x] Zapytania i profil: strona `/klient/panel/zapytania` (własne zapytania z sesji) i `/klient/panel/profil` (podgląd e mail, edycja imienia/telefonu, błąd + ponów), satisfies AC-1, AC-7, AC-8, AC-10, AC-11
- [ ] Zweryfikuj: `/check verify panel klienta`
- [ ] Testuj: `/test panel klienta`

### 26. Sekcja "Więcej niż dom": przewijana witryna kategorii · medium · in progress
Dzisiejsza sekcja `CategoryShowcase` (spa modułowe, pergole) na stronie startowej to statyczny, dwukolumnowy układ (zdjęcie obok tekstu). Nowy kierunek: pełnoekranowe zdjęcie na kategorię, które płynnie zmienia się wraz ze scrollem strony (przypięty układ na desktopie), z etykietą w lewym górnym rogu, opisem w lewym dolnym, kartą oferty w prawym dolnym (zaokrąglenie `rounded-v5-card`) i kropkami pokazującymi liczbę kategorii. Dane bez zmian (te same dwie rodziny, te same prawdziwe wyróżnione projekty z funkcji 6); zmienia się wyłącznie prezentacja.
**Done when:** sekcja na desktopie przypina się i płynnie przechodzi między spa modułowym i pergolą wraz ze scrollem strony, na telefonie i przy `prefers-reduced-motion` działa jako zwykła karuzela dotykowa z kropkami i strzałką, a każda karta oferty pozostaje prawdziwym, dostępnym linkiem jak dziś.
- [x] Zaprojektuj (spec): [0029](../specs/0029-przewijana-sekcja-wiecej-niz-dom/index.md) (przypięty scroll na desktopie przez pakiet `motion` już obecny w projekcie, karuzela dotykowa poniżej `lg` i przy reduced motion, kropki + strzałka jako wspólna ręczna nawigacja, dane i granica serwer/klient bez zmian)
- [x] Zbuduj: `/develop sekcja "Więcej niż dom": przewijana witryna kategorii` (kod w `components/klient/CategoryShowcase.tsx` — serwerowy fetch/tłumaczenia bez zmian; `components/klient/CategoryShowcaseCarousel.tsx` — nowy komponent kliencki z obiema trybami; `app/globals.css` — poprawka `overflow-x` na `html`/`body`, patrz notka niżej; `messages/{pl,en,nl}.json` — usunięto nieużywane `eyebrow`/`intro`, dodano `nextCategory`/`dotLabel`; testy w `components/klient/CategoryShowcase.test.tsx`)
  - [x] Podział na serwerowy fetch danych i nowy komponent kliencki z mechaniką przypiętego scrolla (desktop), satisfies AC-1, AC-5, AC-8
  - [x] Wspólne kropki i strzałka jako ręczna nawigacja dla obu trybów, satisfies AC-3, AC-4
  - [x] Fallback: karuzela dotykowa poniżej `lg` i przy `prefers-reduced-motion`/braku `IntersectionObserver`, satisfies AC-2, AC-7
  - [x] Nakładka wizualna (etykieta, opis, karta oferty `rounded-v5-card`, bez scrim) i podłączenie w `app/[locale]/klient/page.tsx`, satisfies AC-5, AC-6, AC-9
  - Odkryte po drodze: `app/globals.css`'s `html, body { overflow-x: hidden }` (spec 0014/0015) łamało globalnie `position: sticky` (overflow-x/y coupling + brak propagacji z `body` na viewport, gdy `html` też ma ustawiony `overflow`) — przeniesione na samo `body`, zweryfikowane w przeglądarce (przypięcie działa, brak nowego poziomego scrolla)
- [ ] Zweryfikuj: `/check verify sekcja "Więcej niż dom": przewijana witryna kategorii`
- [ ] Testuj: `/test sekcja "Więcej niż dom": przewijana witryna kategorii`

### 27. Poprawki nagłówka i nawigacji klienta (SiteHeader) · in progress
Na telefonie przycisk hamburgera w `SiteHeader` wychodzi poza widoczny ekran (potwierdzone w przeglądarce), więc na najwęższych ekranach widać tylko przycisk "Zacznij"; ten sam hamburger jest jedynym dostępem do nawigacji na każdej szerokości ekranu, ale połowa pozycji menu (Producenci, Inspiracje, O nas) nie prowadzi nigdzie, a Ulubione, Zaloguj się/Mój profil i przełącznik języka są dziś dostępne tylko na komputerze.
**Done when:** hamburger jest widoczny i klikalny na telefonie od 320px szerokości, menu zawiera wyłącznie żywe pozycje nawigacji, a grupa akcji konta (Ulubione, logowanie/profil, panel administratora, język) jest dostępna z menu na każdej szerokości ekranu.
- [x] Zaprojektuj (spec): [0030](../specs/0030-poprawki-naglowka-i-nawigacji/index.md) (naprawa w miejscu: mniejsze logo/odstępy/padding poniżej `sm` zamiast samego `shrink-0`, przycięcie nawigacji do żywych pozycji, druga grupa "Konto" w istniejącym wysuwanym menu, hamburger na komputerze zostaje bez zmian)
- [x] Zbuduj: `/develop poprawki nagłówka i nawigacji klienta` (kod w `components/klient/SiteHeader.tsx`, `messages/{pl,en,nl}.json`)
  - [x] Naprawa przycinania hamburgera: mniejsze logo/odstępy/padding "Zacznij" poniżej `sm`, gwarantowany rozmiar dotykowy hamburgera, satisfies AC-1
  - [x] Uporządkowanie nawigacji: przycięcie `navItems` do Domy/Projekty/Jak to działa, usunięcie martwych kluczy tłumaczeń z `messages/{pl,en,nl}.json`, satisfies AC-3
  - [x] Grupa "Konto" w wysuwanym menu: Ulubione/logowanie/profil/panel administratora przeniesione z paska, przełącznik języka jako proste przyciski (nie rozwijana lista), satisfies AC-2, AC-4, AC-5
  - [x] Dostępność i weryfikacja wielojęzyczna: etykiety grup, fokus, sprawdzone przy 320px w `pl`/`en`/`nl`, testy `SiteHeader.test.tsx` i e2e, satisfies AC-6, AC-7
- [ ] Zweryfikuj: `/check verify poprawki nagłówka i nawigacji klienta`
- [ ] Testuj: `/test poprawki nagłówka i nawigacji klienta`

### 29. Przyklejony pasek wyszukiwania na wynikach · in progress
Na `/wyniki` cały blok wyszukiwania i filtrów (`FamilyTabs`, `ResultsFilterBar`, chipy atrybutów) stoi dziś raz, na samej górze strony; zmiana kryterium w trakcie przeglądania listy wymaga powrotu na górę. Nowy zadokowany pasek zostaje osiągalny przez cały scroll: pełny `ResultsFilterBar` wprost od `sm` w górę, skrócona pigułka (słowo kluczowe + przycisk "Filtruj") poniżej `sm`, a przycisk "Filtruj" na każdej szerokości otwiera panel z pełnym kompletem kryteriów (rodzina, pasek, chipy atrybutów).
**Done when:** klient na `/wyniki` może zmienić dowolne kryterium wyszukiwania w dowolnym momencie przewijania bez powrotu na górę strony, na desktopie wprost na zadokowanym pasku, na telefonie przez pigułkę i panel "Filtruj", bez skoku układu i bez naruszenia WCAG 2.2 AA.
- [x] Zaprojektuj (spec): [0034](../specs/0034-przyklejony-pasek-wyszukiwania-wynikow/index.md) (pełny pasek od `sm` w górę, pigułka słowo kluczowe + "Filtruj" poniżej `sm`, wspólny panel Headless UI `Dialog` jako bottom sheet/boczny panel, żadnych zmian w danych)
- [ ] Zbuduj: `/develop przyklejony pasek wyszukiwania na wynikach`
  - [ ] Mechanizm dokowania (sentinel + `IntersectionObserver`) i pełny `ResultsFilterBar` zadokowany od `sm` w górę, bez skoku układu, satisfies AC-1, AC-2, AC-8, AC-11
  - [ ] Skrócona pigułka poniżej `sm` i wspólny panel filtrów (bottom sheet/boczny panel) z `FamilyTabs`/`ResultsFilterBar`/chipami atrybutów, satisfies AC-3, AC-4, AC-5
  - [ ] Podłączenie przycisku "Filtruj", trwałość stanu panelu przy nawigacji filtra wewnątrz niego, zarządzanie fokusem i warstwy z-index względem `SiteHeader`/`ShortlistActionBar`, satisfies AC-6, AC-7, AC-9
  - [ ] Tłumaczenia nowych etykiet i przejście responsywności/dostępności od 320px, satisfies AC-10
- [ ] Zweryfikuj: `/check verify przyklejony pasek wyszukiwania na wynikach`
- [ ] Testuj: `/test przyklejony pasek wyszukiwania na wynikach`

### 30. Grupy wyszukiwania: Domy i Więcej niż dom (klient) · in progress
Hero na stronie głównej i `FamilyTabs` na `/wyniki` pokazują dziś trzy płaskie, równe zakładki rodziny produktu (Domy, Pergole, SPA), inny podział niż strona główna już dziś prezentuje niżej pod etykietą "Więcej niż dom" (`CategoryShowcase`, funkcja 26). Wyszukiwanie przechodzi na ten sam dwupoziomowy podział: dwa przyciski w hero (Domy / Więcej niż dom), z możliwością doprecyzowania do Spa modułowego albo Pergoli na stronie wyników. Przypisanie rodzin do grup trafia do jednego wspólnego, typowanego miejsca w kodzie, żeby przyszła kolejna rodzina "stylu życia" nie wymagała zmian w kilku komponentach naraz.
**Done when:** hero pokazuje dwa przyciski rodziny zamiast trzech, wybranie "Więcej niż dom" prowadzi na wyniki z produktami spa modułowymi i pergolą połączonymi, strona wyników pozwala dalej zawęzić do jednej konkretnej podkategorii, a żaden dzisiejszy link `/wyniki?family=...` się nie psuje.
- [x] Zaprojektuj (spec): [0035](../specs/0035-domy-i-wiecej-niz-dom/index.md) (jedna wartość `family` rozszerzona o sentinel grupy `wiecej-niz-dom`, rozwijany przez nową wspólną mapę `FAMILY_GROUPS`; żadnej zmiany w bazie danych)
- [x] Zbuduj: `/develop grupy wyszukiwania: domy i więcej niż dom` (code in `lib/product-family-groups.ts`, `lib/results-filters.ts`, `lib/data/projects.ts`, `components/klient/SearchCard.tsx`, `components/klient/FamilyTabs.tsx`; ripple do `ResultsSelection.tsx`/`ResultsHeader.tsx`/`EmptyResults.tsx` (typ `family` szerszy o sentinel) i `ProductFamilyNoun` w `messages/{pl,en,nl}.json`)
  - [x] Wspólny model grup (`FAMILY_GROUPS`, `FamilyFilterValue`) i warstwa danych (`lib/results-filters.ts`, `getProjects()` z `inArray` dla grupy), satisfies AC-2, AC-4, AC-7
  - [x] Hero: przebudowa `SearchCard.tsx` na dwa przyciski rodziny, bez zmian w Budżecie/Powierzchni, satisfies AC-1, AC-5
  - [x] Wyniki: przebudowa `FamilyTabs.tsx` na dwa poziomy (grupa plus doprecyzowanie podkategorii), satisfies AC-3, AC-6
  - [x] Tłumaczenia `pl`/`en`/`nl` i testy (`SearchCard`, `FamilyTabs`, `results-filters.ts`, `projects.test.ts`), satisfies AC-1, AC-3, AC-8
- [x] Zweryfikuj: `/check verify grupy wyszukiwania: domy i więcej niż dom` (PASS, patrz raport builda 2026-09-12)
- [ ] Testuj: `/test grupy wyszukiwania: domy i więcej niż dom`

### 35. Poprawa flow logowania i rejestracji · in progress
Dziś rejestracja stoi na dwóch osobnych, niepowiązanych stronach (klient, producent), nagłówek "Zacznij" kieruje wyłącznie do producenta, a link do rejestracji na ekranie logowania pokazuje się tylko po nieudanej próbie. Ta funkcja ujednolica wejście w jeden wspólny wizard pod `/registration` (krok 1: wybór Klient/Producent), poprawia kilka drobnych rzeczy na ekranie logowania, i dokłada rozróżnienie inwestor/klient prywatny (z warunkowym NIP, reużywając pól z funkcji 32) po stronie klienta oraz skalę produkcji po stronie producenta, usuwając przy okazji z rejestracji producenta pole "Technologia".
**Done when:** "Załóż konto" w nagłówku i na ekranie logowania prowadzą do jednego wspólnego wizarda z wyborem roli, klient może przy rejestracji zadeklarować się jako inwestor (NIP wymagany) albo zostać klientem prywatnym (NIP opcjonalny), a producent wybiera orientacyjną skalę produkcji zamiast dzisiejszego pola "Technologia".
- [x] Zaprojektuj (spec): [0040](../specs/0040-poprawa-flow-logowania-rejestracji/index.md) (jedna trasa `/registration` z krokiem w parametrze URL `role`; checkbox inwestora reużywa pola `client.nip`/`company_name`/`b2b_verification_status` z funkcji 32 zamiast nowej kolumny; stara `/producer/registration` zostaje cienkim przekierowaniem, nie znika)
- [x] Zbuduj: `/develop poprawa flow logowania i rejestracji` (code in `lib/db/schema.ts`, `drizzle/0019_sleepy_squadron_supreme.sql`, `lib/auth-shared.ts`, `lib/auth-registration.ts`, `lib/producer-production-scale.ts`, `auth.ts`, `components/auth/{ClientRegistrationForm,ProducerRegistrationForm,RegistrationRoleStep,LoginForm}.tsx`, `app/[locale]/(customer)/registration/page.tsx`, `app/[locale]/producer/registration/page.tsx`, `app/[locale]/producer/panel/page.tsx`, `components/klient/SiteHeader.tsx`, `messages/{pl,en,nl,de}.json`)
  - [x] Migracja (`producer.technology` nullable, nowa kolumna `producer.production_scale`) i mapowanie payloadu w `auth.ts`'s `createUser` (klient: `nip`/`companyName`/`b2bVerificationStatus`; producent: bez `technology`, z `productionScale`), satisfies AC-7, AC-8, AC-11
  - [x] Wspólny wizard: krok wyboru roli, przepisanie `/registration` na czytanie parametru `role` (z domyślnym `callbackUrl` per rola), link "zmień rolę", `/producer/registration` jako `redirect()`, satisfies AC-4, AC-5, AC-10
  - [x] Formularze kroku 2: checkbox "Jestem inwestorem" + warunkowe NIP/nazwa firmy w `ClientRegistrationForm`; usunięcie "Technologia" i dodanie skali produkcji w `ProducerRegistrationForm` (przeniesionym pod `surface="v5"`), satisfies AC-6, AC-8
  - [x] Ekran logowania i nagłówek: "Załóż konto" zamiast "Zacznij", zawsze widoczny wyśrodkowany link rejestracji, przycisk "Wyślij link" na szerokość pola e mail, łagodny pusty stan technologii w panelu producenta, tłumaczenia, satisfies AC-1, AC-2, AC-3, AC-9
- [ ] Zweryfikuj: `/check verify poprawa flow logowania i rejestracji`
- [ ] Testuj: `/test poprawa flow logowania i rejestracji`

## Slice 2b: panel producenta

### 28. Panel producenta · in progress
Cofa reprioritization z 2026-09-02 (funkcja 7): producent dostaje prawdziwe konto (logowanie linkiem magicznym, już gotowe od spec 0023) zamiast dzisiejszego formularza NIP w adresie i danych w `localStorage`. Nowy, chroniony panel `/producent/panel/*` pokazuje dane firmy z bazy i daje producentowi własny katalog produktów (dodawanie, edycja, usuwanie, zdjęcia) na realnej tabeli `product`, plus podgląd własnych zapytań. Stara mockowa ścieżka znika w tym samym buildzie. Trzy przyszłe funkcje producenta (11 Realna oferta, 16 Realizacja i statusy, 19 Weryfikacja firmy) zostają świadomie poza zakresem, ich ekrany dziś zostają oznaczone jako demo.
**Done when:** zalogowany producent widzi własne dane firmy i katalog produktów z bazy, może dodać/edytować/usunąć produkt ze zdjęciami, widzi własne zapytania bez ujawniania produktów innych producentów, a stara ścieżka NIP/`localStorage` jest usunięta.
- [x] Zaprojektuj (spec): [0032](../specs/0032-panel-producenta/index.md) (sesja producenta mirror spec 0024, katalog na tabeli `product` już zaprojektowanej w spec 0018/0022, zdjęcia na R2/`document` ze spec 0031; zastąpienie bezpośrednie starej ścieżki, nie strangler, bo brak żywego ruchu na dzisiejszym mocku)
- [x] Zbuduj: `/develop panel producenta` (code in `app/[locale]/producent/panel/`, `lib/producer-product-actions.ts`, `lib/product-photo-actions.ts`, `lib/panel-session.ts`, `lib/db/queries.ts`)
  - [x] Fundament: sesja producenta (`requirePanelProducerSession`), strona główna panelu z danymi firmy z bazy, przepięcie rejestracji na kreator, przepisanie `/producent` na marketing z przekierowaniem zalogowanego producenta, satisfies AC-1, AC-2, AC-9, AC-10
  - [x] Katalog: akcje CRUD produktu na realnej bazie (+ tłumaczenia EN/NL), własne zdjęcia (przebudowany krok kreatora, prawdziwy plik), poprawka filtra `deletedAt` na `/wyniki`, satisfies AC-3, AC-4, AC-5, AC-6, AC-7, AC-14
  - [x] Zapytania i sprzątanie: podgląd własnych zapytań bez ujawniania cudzych produktów, oznaczenie "wersja demonstracyjna" na czterech ekranach mock, usunięcie starej ścieżki NIP/`localStorage` i jej testów, satisfies AC-8, AC-11, AC-12
- [ ] Zweryfikuj: `/check verify panel producenta`
- [ ] Testuj: `/test panel producenta`

## Slice 3: oferta

### 11. Realna oferta i jej przyjęcie · done
Producent odpowiada na zapytanie prawdziwą ofertą zapisaną w bazie; klient ją przyjmuje, co tworzy zamówienie o śledzonym statusie zamiast dzisiejszego mocka „oferta wiążąca”.
**Done when:** oferta złożona przez producenta jest trwale zapisana i widoczna klientowi, a przyjęcie oferty tworzy zamówienie w bazie z pierwszym statusem realizacji.
- [x] Zaprojektuj (spec): [0033](../specs/0033-realna-oferta-i-jej-przyjecie/index.md) (tabele `offer`/`offer_item`/`order`/`order_stage_event` już zaprojektowane w spec 0018, ta funkcja zaczyna do nich realnie pisać; wymiana bezpośrednia dwóch dzisiejszych mocków — formularz producenta na `localStorage` i ekran „wiążącej oferty” klienta z pominięciem zapytania — bez okresu równoległego, bo brak żywego ruchu na obu)
- [x] Zbuduj: `/develop realna oferta i jej przyjęcie` (code in `lib/offer-actions.ts`, `lib/db/queries.ts`, `lib/db/schema.ts`, `drizzle/0011_dark_gertrude_yorkes.sql`, `drizzle/0012_offer_order_audit_triggers.sql`, `app/[locale]/producent/panel/zapytania/[id]/`, `app/[locale]/klient/panel/zapytania/[id]/`, `components/producent/OfferForm.tsx`, `components/klient/OfferCard.tsx`, `components/{producent,klient}/MarkOffer*Viewed.tsx`)
  - [x] Migracja i warstwa danych: dwie nowe kolumny na `offer` (sygnał przeczytane/nieprzeczytane) i cztery triggery audytowe, funkcje odczytu ofert per zapytanie dla producenta/klienta, satisfies AC-1, AC-6, AC-13, AC-14, AC-18
  - [x] Cienki wątek producent → klient → zamówienie: `submitOffer`, `/producent/panel/zapytania/[id]`, `respondToOffer` (przyjęcie), `/klient/panel/zapytania/[id]`, satisfies AC-1, AC-2, AC-6, AC-7, AC-13, AC-14, AC-15
  - [x] Rewizja, blokady i odrzucenie: kilka produktów na ofertę, rewizja zastępująca aktywną ofertę, blokada po `accepted`, odrzucenie, agregat `inquiry.status`, obsługa wyścigów (AC-4/AC-19) i produktu niedostępnego, satisfies AC-3, AC-4, AC-5, AC-8, AC-9, AC-10, AC-19
  - [x] Sygnały nieprzeczytane/przeczytane po obu stronach (klient i producent), satisfies AC-11, AC-12
  - [x] Sprzątanie starych mocków (i trzech dzisiejszych odnośników do nich) i rozwijane szczegóły oferty w panelu administratora, satisfies AC-16, AC-17
- [x] Zweryfikuj: `/check verify realna oferta i jej przyjęcie`
- [x] Testuj: `/test realna oferta i jej przyjęcie` (`lib/offer-actions.test.ts`, `lib/db/queries.test.ts`, `components/producent/OfferForm.test.tsx`, `components/klient/OfferCard.test.tsx`, `components/{producent,klient}/MarkOffer*Viewed.test.tsx`)

## Slice 4: płatności

### 12. Realne płatności · needs a decision · full
Prawdziwa integracja płatnicza za usługi jednorazowe (analiza działki, domykanie luk) i pobranie prowizji platformy od zaakceptowanej oferty, zastępująca dzisiejszą makietę „zapłać”.
**Done when:** płatność za usługę jednorazową i prowizja od zamówienia są realnie autoryzowane i rozliczone, a status płatności jest widoczny użytkownikowi i trwale zapisany (basis: PSD2, Directive (EU) 2015/2366, wymóg silnego uwierzytelnienia płatności elektronicznych; Consumer Rights Directive 2011/83/EU dla sprzedaży na odległość na terenie UE).
- [ ] Zaprojektuj (spec): `/architect realne płatności`

## Slice 5: pliki

### 13. Realne przechowywanie plików · full
Rzuty, zdjęcia i dokumenty producenta trwale przechowywane i pobieralne, zastępujące dzisiejszą makietę uploadu bez zapisu.
**Done when:** wgrany plik jest trwale zapisany, dostępny do pobrania po odświeżeniu strony i w kolejnej sesji, a niedozwolony typ lub rozmiar pliku jest odrzucany z komunikatem.
- [x] Zaprojektuj (spec): [0031](../specs/0031-realne-przechowywanie-plikow/index.md) (klient Cloudflare R2 plus tabela `document` już zaprojektowana w spec 0018; wąski zakres: skrypt migrujący dzisiejsze 65 realnych produktów z `public/images/houses/` do R2, i nowy ekran wewnętrzny `/internal/produkty` dla administratora do zarządzania zdjęciami idąc naprzód; ekrany producenta i zdjęcia producentów świadomie odłożone, patrz spec Follow-up)
- [x] Zbuduj: `/develop realne przechowywanie plików` (code in `lib/storage/`, `lib/product-photo-actions.ts`, `lib/db/queries.ts`, `lib/data/projects.ts`, `app/[locale]/internal/produkty/`, `scripts/migrate-existing-product-photos.ts`)
  - [x] Fundament magazynu: migracja indeksu (jedna okładka na produkt), kubełek R2 założony ręcznie, klient R2, walidacja pliku (typ/rozmiar, sygnatura bajtowa), satisfies AC-3, AC-4 — kubełek `modular-hub` (jurysdykcja UE, publiczny przez `r2.dev`) założony 2026-09-09
  - [x] Akcje serwerowe i ekran administratora: wgrywanie/okładka/kolejność/usuwanie za bramką roli `admin`, `/internal/produkty`, satisfies AC-2, AC-4, AC-5, AC-6, AC-9
  - [x] Odczyt po stronie klienta: `lib/data/projects.ts` czyta okładkę i galerię z `document` z fallbackiem do `coverImageUrl`/`_extraImageUrls`, satisfies AC-7, AC-8
  - [x] Skrypt migracyjny i jednorazowe uruchomienie na wszystkich 65 istniejących produktach, satisfies AC-1 — uruchomiony na realnej bazie 2026-09-09, 65/65 produktów, 204 wiersze `document`, zweryfikowano publicznie i na `/pl/klient/wyniki`
- [x] Zweryfikuj: `/check verify realne przechowywanie plików` — PASS 2026-09-09, wszystkie 9 kryteriów akceptacji potwierdzone na żywo (patrz `verify.md`)
- [x] Testuj: `/test realne przechowywanie plików` — 66 nowych testów (Vitest, real DB integration), 688/688 przechodzi; patrz raport /test 2026-09-09

## Slice 6: silnik zgodności

### 14. Realny silnik zgodności (Polska, pilot) · needs a decision · full
Rzeczywiste, aktualizowalne wymagania prawne dla Polski zamiast trzech statycznych wierszy mocka, z widoczną ścieżką aktualizacji, gdy przepisy się zmienią. Zakres per rodzina produktu (dom / spa modułowe / pergola) ustalony w funkcji 6 — różne rodziny mogą mieć różny reżim prawny (np. pergola bez pozwolenia poniżej pewnego metrażu).
**Done when:** status gotowości eksportowej dla Polski pochodzi z rzeczywistego źródła danych, nie z fixture'u, dla każdej rodziny produktu w zakresie funkcji 6, a zmiana źródłowych danych jest widoczna na ekranie bez zmiany kodu.
- [ ] Zaprojektuj (spec): `/architect realny silnik zgodności`

## Slice 7: transport

### 15. Realna wycena transportu · needs a decision
Wycena transportu z rzeczywistego źródła (sieć przewoźników lub API cenowe) zamiast stałej stawki per kraj dostawy.
**Done when:** widełki cenowe transportu na ofercie pochodzą z rzeczywistego źródła wyceny, a zmiana trasy lub kraju zmienia wynik bez zmiany kodu.
- [ ] Zaprojektuj (spec): `/architect realna wycena transportu`

## Slice 8: realizacja

### 16. Realizacja i statusy na prawdziwym zapleczu · needs a decision
Oś statusów (produkcja, transport, montaż, odbiór, gwarancja) czytana z bazy danych i aktualizowana przez producenta lub operatora, zamiast dzisiejszego mocka i `localStorage`.
**Done when:** zmiana statusu zamówienia przez producenta jest trwale zapisana i natychmiast widoczna klientowi na osi statusów, a historia zmian jest zachowana.
- [ ] Zaprojektuj (spec): `/architect realizacja i statusy na prawdziwym zapleczu`

## Slice 9: powiadomienia

### 17. Powiadomienia e mail · needs a decision
E mail przy kluczowych zdarzeniach transakcyjnych (nowe zapytanie, nowa oferta, zmiana statusu realizacji, potwierdzenie płatności), żeby użytkownik nie musiał ręcznie sprawdzać aplikacji.
**Done when:** każde z czterech zdarzeń wysyła e mail do właściwego odbiorcy w rozsądnym czasie, treść e maila odpowiada zdarzeniu, a błąd wysyłki nie blokuje głównej akcji użytkownika.
- [ ] Zaprojektuj (spec): `/architect powiadomienia e mail`

## Slice 10: panel admina

### 18. Panel administracyjny · needs a decision · full
Wewnętrzny panel do przeglądu i moderacji producentów, projektów i zapytań, chroniony osobną autoryzacją dla personelu.
**Done when:** uprawniony administrator widzi listę producentów, projektów i zapytań, może zablokować lub odblokować producenta, a dostęp do panelu jest niedostępny bez roli administratora.
- [ ] Zaprojektuj (spec): `/architect panel administracyjny`

## Slice 11: weryfikacja firmy

### 19. Weryfikacja firmy producenta (realna) · needs a decision · full
Rzeczywista weryfikacja dokumentów firmy producenta przed pierwszą wypłatą prowizji, zastępująca dzisiejszą listę wymaganych dokumentów bez weryfikacji.
**Done when:** producent wgrywa wymagane dokumenty firmowe, status weryfikacji zmienia się na podstawie rzeczywistego sprawdzenia, a wypłata jest zablokowana do czasu pozytywnej weryfikacji.
- [ ] Zaprojektuj (spec): `/architect weryfikacja firmy producenta`

## Slice 12: duże zamówienia B2B

### 32. Model danych dla dużych zamówień B2B · full · in progress
Fundament danych pod nową, dużą funkcję platformy: inwestorzy tacy jak Lammert (10 i więcej domów naraz, np. pod resort czy osiedle) mogą wysłać wolne zapytanie do wszystkich sprawdzonych, dużych producentów naraz albo zapytać o konkretny model w większej ilości sztuk, bez zakładania konta; producenci deklarują realną zdolność produkcyjną i odpowiadają wycenami. Sam model danych (tabele, pola, reguły) jest pierwszą z kilku zaplanowanych decyzji tej dużej inicjatywy; ekrany wejściowe, odznaka "Verified Volume Manufacturer" i inteligentne dopasowywanie producentów to osobne, przyszłe funkcje, patrz spec 0037 Follow-up.
**Done when:** inwestor może wysłać oba typy zapytań bez logowania, zweryfikowani wolumenowo producenci zostają automatycznie powiązani z wolnym zapytaniem w swoim kraju i mogą na nie odpowiedzieć wyceną, klient widzi odpowiedzi po zalogowaniu tym samym e mailem, a zaakceptowanie wyceny wymaga zatwierdzonej weryfikacji B2B klienta.
- [x] Zaprojektuj (spec): [0037](../specs/0037-model-danych-duzych-zamowien-b2b/index.md)
- [x] Zbuduj: `/develop model danych dla dużych zamówień B2B` (code in `lib/db/schema.ts`, `drizzle/0013_cynical_vance_astro.sql`, `drizzle/0014_bulk_request_limit_and_audit.sql`, `lib/project-request-specs.ts`, `lib/producer-capacity-profile-specs.ts`, `lib/project-request-actions.ts`, `lib/project-quote-actions.ts`, `auth.ts`, `lib/observability/types.ts`, `lib/db/pg-error.ts`; `/check verify` + `/debug` po pierwszym buildzie dorzuciły `submitClientB2bDetails` (brakująca połowa AC-8) i naprawiły błędną klasyfikację błędu bazy danych, patrz spec 0037 verify.md)
  - [x] Migracja i walidacja: nowe tabele, enumy i CHECK (progi liczby sztuk, ceny jako `bigint`, dwa częściowe unikalne indeksy na wycenie), schematy Zod dla pól jsonb, satisfies AC-1, AC-4, AC-6, AC-8, AC-9, AC-12
  - [x] Zapisywanie zapytań: wysłanie obu typów zapytań bez logowania, automatyczne powiązanie zweryfikowanych producentów, limit zgłoszeń na e mail, satisfies AC-1, AC-2, AC-4, AC-10
  - [x] Odpowiedzi i cykl życia: złożenie wyceny (i e mail z linkiem logującym), akceptacja z bramką weryfikacji B2B, powiązanie zapytań z kontem klienta przy logowaniu, ustawienia weryfikacji przez administratora, satisfies AC-3, AC-5, AC-7, AC-9, AC-11
- [ ] Zweryfikuj: `/check verify model danych dla dużych zamówień B2B`
- [x] Testuj: `/test model danych dla dużych zamówień B2B` (`lib/db/pg-error.test.ts`, `lib/producer-capacity-profile-specs.test.ts`, `lib/project-request-specs.test.ts`, `lib/project-request-actions.test.ts`, `lib/project-quote-actions.test.ts`, `lib/db/schema.test.ts`)

### 33. Ekrany wejściowe dla dużych zamówień B2B · full · in progress
Pierwsze widoczne wejście do modelu danych z funkcji 32: nowa sekcja na stronie głównej z dwoma kaflami (dla inwestora "10+ domów", dla producenta "Duże moce produkcyjne", zgodnie z dostarczonym obrazem referencyjnym), oraz pełna, publiczna strona formularza wolnego zapytania pod `/project-request`, wołająca wprost już istniejącą funkcję `submitProjectRequest`. Kafel producenta prowadzi dziś do zwykłej rejestracji; prawdziwy ekran zgłaszania zdolności produkcyjnej to osobna, przyszła decyzja (patrz spec 0038 Follow-up).
**Done when:** strona główna pokazuje sekcję z obydwoma kaflami zaraz po Hero, kafel inwestora prowadzi do `/project-request` z pełnym formularzem wysyłającym do istniejącego modelu danych, kafel producenta prowadzi do rejestracji producenta, formularz zawiera zdanie o udostępnieniu danych producentom, a oba ekrany mają prawdziwe tłumaczenia pl/en/nl i metadane SEO.
- [x] Zaprojektuj (spec): [0038](../specs/0038-ekrany-wejsciowe-duze-zamowienia-b2b/index.md)
- [x] Zbuduj: `/develop ekrany wejściowe dla dużych zamówień B2B` — code in `app/[locale]/(customer)/project-request/page.tsx`, `components/klient/{ProjectRequestFlow,ProjectRequestConfirmationCard,BulkOrdersShowcase}.tsx`, `app/[locale]/(customer)/page.tsx`, `components/ui/Textarea.tsx` (dodany wariant `surface="v5"`), `messages/{pl,en,nl}.json`
  - [x] Strona `/project-request` i formularz: trasa z metadanymi SEO/hreflang, `ProjectRequestFlow` (pola pogrupowane w trzy sekcje, bramka wymaganych pól, wywołanie `submitProjectRequest`, obsługa błędu limitu/walidacji/ogólnego, zdanie RODO nad przyciskiem, przycisk wyłączony w trakcie żądania), `ProjectRequestConfirmationCard`, satisfies AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10
  - [x] Sekcja strony głównej z dwoma kaflami: `BulkOrdersShowcase` (odznaka, podtytuł, dwa kafle fotograficzne z `public/images/b2b/`), CTA inwestora do `/project-request`, CTA producenta do `/producer/registration`, wstawiona zaraz po Hero, satisfies AC-1, AC-2, AC-3
  - [x] Tłumaczenia pl/en/nl i przegląd dostępności (WCAG 2.2 AA) na obu nowych ekranach, satisfies AC-11, AC-12
- [x] Zbuduj (aktualizacja spec 0038, kafel inwestora teraz prowadzi na ekran przeglądania producentów zamiast wprost do formularza): `/develop ekrany wejściowe dla dużych zamówień B2B` — code in `lib/project-request-actions.ts`, `lib/data/producers.ts`, `lib/data/projects.ts`, `app/[locale]/(customer)/verified-manufacturers/page.tsx`, `app/[locale]/(customer)/project/[id]/page.tsx`, `components/klient/{BulkProductInquiryModal,BulkOrdersShowcase}.tsx`, `messages/{pl,en,nl}.json`; Budman House zasiany jako zweryfikowany wolumenowo przez Neon MCP (za zgodą inżyniera)
  - [x] Zaplecze i dane: utwardzenie `submitBulkProductInquiry`, ręczne zasianie Budman House jako zweryfikowanego wolumenowo (Neon MCP, za zgodą inżyniera), przepisanie `getProducerById`/`getProducers` na realną bazę, satisfies AC-13, AC-14, AC-16, AC-17
  - [x] Ekran przeglądania: nowe funkcje odczytu producentów zweryfikowanych wolumenowo, nowa strona `/verified-manufacturers` (siatka projektów, nagłówek producenta, stan pusty, jeden duży przycisk "Zgłoś zapytanie"), satisfies AC-13, AC-14, AC-18
  - [x] Zapytanie o model i kafel: nowy modal "Zapytaj o większą ilość" na `/project/[id]`, zmiana celu kafla inwestora na `/verified-manufacturers`, satisfies AC-2, AC-15, AC-16
  - [x] Tłumaczenia, dostępność i testy dla wszystkich nowych/zmienionych ekranów, satisfies AC-11, AC-12
- [x] Zbuduj (aktualizacja spec 0038, pasek wyszukiwania i filtrów na `/verified-manufacturers`): `/develop ekrany wejściowe dla dużych zamówień B2B` — code in `lib/verified-manufacturers-filters.ts`, `lib/data/projects.ts` (`buildPrefixTsQuery` exported, `getVerifiedVolumeManufacturerProjects` rozszerzone o filtr), `components/klient/VerifiedManufacturersFilterBar.tsx`, `app/[locale]/(customer)/verified-manufacturers/page.tsx`, `messages/{pl,en,nl}.json`
  - [x] Zaplecze filtra: nowy moduł parsowania/budowania URL filtra, eksport wyszukiwania pełnotekstowego z `lib/data/projects.ts`, rozszerzenie `getVerifiedVolumeManufacturerProjects` o kraj dostawy/metraż/słowo kluczowe (kraj zawęża listę producentów przed zapytaniem o produkty; producent bez ani jednego pasującego projektu znika z wyniku), satisfies AC-19, AC-20, AC-21, AC-22, AC-23
  - [x] Pasek i podłączenie: nowy komponent `VerifiedManufacturersFilterBar` (zwykły, statyczny, bez dokowania), podłączony na `/verified-manufacturers` (renderuje się tylko gdy istnieje co najmniej jeden zweryfikowany wolumenowo producent), nowy stan pusty "brak projektów dla wybranych filtrów" odróżniony od stanu pustego AC-14, z linkiem czyszczącym filtry i tym samym przyciskiem "Zgłoś zapytanie", satisfies AC-19, AC-23
  - [x] Tłumaczenia pl/en/nl (prawdziwe, nie kopia polskiego) i dostępność (etykiety pól, `.focus-ring`, wzorzec SearchSegment już zgodny WCAG 2.2 AA) dla paska, satisfies rozszerzone AC-11, AC-12; testy: `lib/verified-manufacturers-filters.test.ts`, rozszerzenie `lib/data/projects.test.ts` (filtr kraju/metrażu/słowa kluczowego, producent znika przy zero dopasowań), `VerifiedManufacturersFilterBar.test.tsx`, satisfies AC-19 do AC-23
- [ ] Zweryfikuj: `/check verify ekrany wejściowe dla dużych zamówień B2B`
- [ ] Testuj: `/test ekrany wejściowe dla dużych zamówień B2B`

## Utwardzenie przed startem

### 20. SEO podstawowe stron publicznych · needs a decision
Metadane, sitemapa, dane strukturalne i obrazy OG na stronach publicznych (start, wyniki), żeby platforma była odkrywalna w wyszukiwarce.
**Done when:** każda publiczna strona ma unikalny tytuł i opis, sitemapa XML jest generowana automatycznie i zawiera publiczne strony, a strona wyników ma dane strukturalne dla listy ofert.
- [ ] Zaprojektuj (spec): `/architect SEO podstawowe stron publicznych`

### 21. Wydajność: cel i audyt Core Web Vitals · needs a decision
Konkretne progi wydajnościowe dla stron publicznych i jeden dedykowany audyt oraz utwardzenie przed startem, ważne dla SEO i konwersji.
**Done when:** strona startowa i wyniki spełniają zapisane progi Core Web Vitals w pomiarze produkcyjnym, nie tylko lokalnym, a wyniki audytu są zapisane (basis: web.dev, Core Web Vitals, progi LCP do 2,5 s, INP do 200 ms, CLS do 0,1 na 75 percentylu).
- [ ] Zaprojektuj (spec): `/architect wydajność: cel i audyt Core Web Vitals`

### 22. Testy regresyjne ścieżek krytycznych
Automatyczny test end to end obejmujący krytyczne ścieżki transakcyjne (logowanie, dodanie produktu, zapytanie, oferta, płatność, zmiana statusu realizacji) przechodzące przez prawdziwe zaplecze, łapiący regresje między modułami zamiast tylko wewnątrz jednej funkcji.
**Done when:** jeden lub więcej testów e2e pokrywa pełną ścieżkę klienta i producenta na prawdziwym zapleczu i jest uruchamiany automatycznie w pipeline (funkcja 3) przed wdrożeniem na produkcję.
- [ ] Napisz testy: `/test testy regresyjne ścieżek krytycznych`

### 23. Przegląd bezpieczeństwa przed startem · full
Świadomy punkt kontrolny bezpieczeństwa (autoryzacja, płatności, dane osobowe, panel admina) tuż przed uruchomieniem produkcyjnym, zamiast polegania wyłącznie na utwardzeniu per funkcja (basis: OWASP Application Security Verification Standard, jako struktura wymagań do weryfikacji przed startem).
**Done when:** przegląd bezpieczeństwa jest przeprowadzony na kompletnym, podłączonym zapleczu, a każde krytyczne lub wysokie ustalenie jest naprawione albo świadomie zaakceptowane przed startem.
- [ ] Uruchom przegląd: `/security-review`

## Deferred
Poza zakresem tej epiki, świadomie odłożone.
- **Rozszerzenie poza Polskę**: pozostałe kraje z dzisiejszego mocka silnika zgodności (np. Niemcy, Holandia) · needs a decision · full weight
- **Zawężenie mapy gotowości eksportowej do krajów rejestracji**: rozszerzenie kontraktu URL, który dziś przenosi tylko nazwę projektu, zostaje odłożone razem z rozszerzeniem poza Polskę · needs a decision
- **Aplikacja mobilna lub natywna** · needs a decision
- **Alternatywny model przychodu** (np. subskrypcja producenta zamiast prowizji), gdyby model prowizyjny z funkcji 12 okazał się niewystarczający · needs a decision
- **Automatyzacja usuwania danych obserwowalności**: proces usuwania historii użytkownika w Sentry/PostHog z funkcji 4 jest ręcznym runbookiem; automatyzacja odłożona do czasu realnego usuwania konta i większego wolumenu żądań (from spec 0021) · needs a decision
- **Konsolidacja śledzenia błędów i analityki do jednego narzędzia**: PostHog oferuje już własne śledzenie błędów; spec 0021 ocenił je dziś jako słabsze od Sentry (stack trace, source mapy, release), warte ponownej oceny później (from spec 0021) · needs a decision
- **Strona producenta na v5**: spec [0027](../specs/0027-domkniecie-wizualne-sciezki-klienta/index.md) migruje wyłącznie ścieżkę klienta; strona producenta zostaje na v3 bezterminowo, decyzja o ewentualnej migracji jest osobna i przyszła (from spec 0027) · needs a decision
- **Zapisane wyszukiwania z alertami e mail w panelu klienta**: częsty wzorzec na porównywalnych portalach nieruchomości (research w spec 0024 rationale.md), ale wymaga infrastruktury e mail z funkcji 17 (Powiadomienia e mail), której dziś nie ma; zaprojektuj jako osobną funkcję, gdy 17 będzie gotowa (from spec 0024) · needs a decision
- **Tłumaczenie certyfikatów produktu i podpisów galerii**: pola istnieją dziś tylko w warstwie mockowej (epika Prototyp), nie w prawdziwej tabeli `product`; jeśli zostaną kiedyś przeniesione do bazy, ich tłumaczenie EN/NL/DE wymaga osobnej decyzji (from spec 0028) · needs a decision
- **Wyszukiwanie i sortowanie po nazwie produktu, świadome języka**: `search_vector` (spec 0026) indeksuje wyłącznie polski tekst; funkcja 25 nie dodaje osobnego indeksu per język, więc `/en`/`/nl`/`/de` sortują/wyszukują po polskiej nazwie (from spec 0028) · needs a decision
- **Formatowanie liczb, dat i separatora dziesiętnego świadome języka**: next intl to umie, ale nikt dziś o to nie prosił (np. `120,5 m²` po polsku vs `120.5 m²` po angielsku) (from spec 0028) · needs a decision
- **Podłączenie konta do już istniejącego, ręcznie zasianego producenta** (Castro, Steel House, Budman, Cocomodule…): dziś bez konta do zalogowania; świadomie odłożone, testowanie idzie na nowym, samodzielnie zarejestrowanym koncie (from spec 0032) · needs a decision
- **Statystyki/analityka dla producenta** w panelu (np. liczba zapytań w czasie, popularność produktów) (from spec 0032) · needs a decision
- **Edycja profilu firmy przez producenta** (nazwa, telefon, kraje dostawy): panel producenta dziś pokazuje wyłącznie podgląd (from spec 0032) · needs a decision
- **Prawdziwy "konfigurator" zapytania o model w większej ilości**: ekran przeglądania producentów (spec 0038, funkcja 33) dostaje na razie prosty modal na `/project/[id]`; docelowy, bardziej prowadzący konfigurator to osobna decyzja (from spec 0038) · needs a decision

## References

_Poziom: źródła plus zweryfikowane linki, na życzenie zamawiającego (research przed większymi decyzjami)._

**Źródła projektowe:**
- [docs/scope/prototyp.md](prototyp.md), sekcja Deferred: pierwotna lista odłożonych możliwości, z której wywodzi się większość funkcji tej epiki.
- `AGENTS.md` w katalogu głównym: stack (Next.js 16, App Router, TypeScript), podejście Facade dzisiejszego prototypu, zasada asynchronicznych funkcji dostępu do danych.

**Praktyki i standardy (zweryfikowane linki):**
- RODO, Regulation (EU) 2016/679: [eur-lex.europa.eu/eli/reg/2016/679/oj](https://eur-lex.europa.eu/eli/reg/2016/679/oj), art. 4 i 6, zgoda jako podstawa prawna przetwarzania danych osobowych.
- ePrivacy Directive 2002/58/EC: [eur-lex.europa.eu/eli/dir/2002/58/oj/eng](https://eur-lex.europa.eu/eli/dir/2002/58/oj/eng), wymóg zgody na cookies przed zapisem na urządzeniu użytkownika.
- WCAG 2.2, W3C Recommendation: [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/), poziom AA jako obecny standard dostępności (kontynuacja praktyki z epiki Prototyp).
- Core Web Vitals, web.dev: [web.dev/articles/vitals](https://web.dev/articles/vitals), metryki i progi LCP, INP, CLS.
- OWASP Application Security Verification Standard: [owasp.org/www-project-application-security-verification-standard](https://owasp.org/www-project-application-security-verification-standard/), struktura wymagań do przeglądu bezpieczeństwa aplikacji z płatnościami i danymi osobowymi.
- PSD2, Directive (EU) 2015/2366, silne uwierzytelnienie płatności: [finance.ec.europa.eu, Strong Customer Authentication](https://finance.ec.europa.eu/publications/strong-customer-authentication-requirement-psd2-comes-force_en).
- Consumer Rights Directive 2011/83/EU: [eur-lex.europa.eu, CELEX 32011L0083](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011L0083), wymogi informacyjne i prawo odstąpienia przy sprzedaży na odległość w UE.

## Legend

**Pole decyzyjne.** Każda funkcja ma dokładnie jedno, podzadanie kończące się na „(spec)”. Reszta pól to zadania wykonawcze.

**Cykl życia funkcji:**

| Stan | Ustawia | Funkcja pokazuje |
|---|---|---|
| `planned` · needs a decision | `/scope` | jedno pole: `Zaprojektuj (spec): /architect <funkcja>` |
| `in progress` (zaprojektowana) | `/architect` przy zapisaniu spec | „Zaprojektuj” odhaczone; spec podlinkowany; `Zbuduj: /develop <funkcja>` z listą kamieni milowych ze spec |
| `in progress` (budowana) | `/develop` | kamienie milowe odhaczane po kolei |
| `in progress` (zweryfikowana) | `/check verify` | „Zbuduj” i kamienie milowe odhaczone; „Zweryfikuj” odhaczone |
| `done` | `/test`, potem `/sync` | wszystkie pola odhaczone |

- **Następny krok** = pierwsze nieodhaczone pole (zawsze polecenie albo śledzony kamień milowy).
- **needs a decision** = najpierw `/architect`, inaczej od razu `/develop` (albo `/test`/`/security-review` dla dwóch pozycji utwardzenia bez własnej decyzji).
- **Status**: `planned` do `in progress` do `done`, plus `dropped` (wypadło z zakresu, zachowane dla historii).
- **Znacznik wagi** `· full` = warto zrobić świeży `/check review`; `lean`/`medium` bez znacznika.
