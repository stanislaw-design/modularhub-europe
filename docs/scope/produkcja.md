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
| 8 | Dopracowanie wyszukiwania i wyników (klient) | Slice 2 | planned |
| 9 | Domknięcie wizualne ścieżki klienta (marka v4) | Slice 2 | planned |
| 10 | Treść i luki funkcjonalne klienta | Slice 2 | planned |
| 11 | Realna oferta i jej przyjęcie | Slice 3 | planned |
| 12 | Realne płatności | Slice 4 | planned |
| 13 | Realne przechowywanie plików | Slice 5 | planned |
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

### 8. Dopracowanie wyszukiwania i wyników (klient) · needs a decision
Rozszerzenie dzisiejszej strony wyników (epika Prototyp, funkcja 6 — dziś tylko kraj i widełki metrażu) o głębsze wyszukiwanie i filtrowanie na prawdziwych danych z funkcji 7, w tym filtrowanie po rodzinie produktu i podkategorii z funkcji 6: więcej kryteriów, sortowanie, ewentualnie wyszukiwanie tekstowe — konkretny zakres do ustalenia w spec.
**Done when:** klient może zawęzić i posortować wyniki więcej niż jednym kryterium (w tym rodziną produktu) na realnych danych z bazy, a pusta lista i błędne parametry URL zachowują dzisiejszy łagodny fallback (bez błędu).
- [ ] Zaprojektuj (spec): `/architect dopracowanie wyszukiwania i wyników`

### 9. Domknięcie wizualne ścieżki klienta (marka v4) · needs a decision
Dziś tokeny marki v4 (spec 0013, epika Prototyp funkcja 17) konsumuje tylko strona startowa; reszta ścieżki klienta (wyniki, zapytanie, działka, oferta, realizacja, szczegóły projektu) zostaje na v3. Migracja całej ścieżki klienta na v4 dla spójnego, bliskiego finalnemu wyglądu, plus przegląd interakcji/mikroanimacji i dopracowanie pod telefon.
**Done when:** każdy ekran ścieżki klienta konsumuje tokeny v4, przechodzi ten sam kontrast i test dostępności co dziś, a układ jest dopracowany na wąskich ekranach.
- [ ] Zaprojektuj (spec): `/architect domknięcie wizualne ścieżki klienta`

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

## Slice 3: oferta

### 11. Realna oferta i jej przyjęcie · needs a decision
Producent odpowiada na zapytanie prawdziwą ofertą zapisaną w bazie; klient ją przyjmuje, co tworzy zamówienie o śledzonym statusie zamiast dzisiejszego mocka „oferta wiążąca”.
**Done when:** oferta złożona przez producenta jest trwale zapisana i widoczna klientowi, a przyjęcie oferty tworzy zamówienie w bazie z pierwszym statusem realizacji.
- [ ] Zaprojektuj (spec): `/architect realna oferta i jej przyjęcie`

## Slice 4: płatności

### 12. Realne płatności · needs a decision · full
Prawdziwa integracja płatnicza za usługi jednorazowe (analiza działki, domykanie luk) i pobranie prowizji platformy od zaakceptowanej oferty, zastępująca dzisiejszą makietę „zapłać”.
**Done when:** płatność za usługę jednorazową i prowizja od zamówienia są realnie autoryzowane i rozliczone, a status płatności jest widoczny użytkownikowi i trwale zapisany (basis: PSD2, Directive (EU) 2015/2366, wymóg silnego uwierzytelnienia płatności elektronicznych; Consumer Rights Directive 2011/83/EU dla sprzedaży na odległość na terenie UE).
- [ ] Zaprojektuj (spec): `/architect realne płatności`

## Slice 5: pliki

### 13. Realne przechowywanie plików · needs a decision · full
Rzuty, zdjęcia i dokumenty producenta trwale przechowywane i pobieralne, zastępujące dzisiejszą makietę uploadu bez zapisu.
**Done when:** wgrany plik jest trwale zapisany, dostępny do pobrania po odświeżeniu strony i w kolejnej sesji, a niedozwolony typ lub rozmiar pliku jest odrzucany z komunikatem.
- [ ] Zaprojektuj (spec): `/architect realne przechowywanie plików`

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
- **Wersje językowe (EN/DE)**: rozszerzenie z samego polskiego pilotu · needs a decision
- **Rozszerzenie poza Polskę**: pozostałe kraje z dzisiejszego mocka silnika zgodności (np. Niemcy, Holandia) · needs a decision · full weight
- **Zawężenie mapy gotowości eksportowej do krajów rejestracji**: rozszerzenie kontraktu URL, który dziś przenosi tylko nazwę projektu, zostaje odłożone razem z rozszerzeniem poza Polskę · needs a decision
- **Przełącznik języka w stopce**: baner zgody i podstawowe dokumenty prawne pokrywa funkcja 5, kontakt i informacje prawne w stopce pokrywa funkcja 10; sam przełącznik języka zostaje odłożony razem z wersjami językowymi (EN/DE) powyżej · needs a decision
- **Aplikacja mobilna lub natywna** · needs a decision
- **Alternatywny model przychodu** (np. subskrypcja producenta zamiast prowizji), gdyby model prowizyjny z funkcji 12 okazał się niewystarczający · needs a decision
- **Automatyzacja usuwania danych obserwowalności**: proces usuwania historii użytkownika w Sentry/PostHog z funkcji 4 jest ręcznym runbookiem; automatyzacja odłożona do czasu realnego usuwania konta i większego wolumenu żądań (from spec 0021) · needs a decision
- **Konsolidacja śledzenia błędów i analityki do jednego narzędzia**: PostHog oferuje już własne śledzenie błędów; spec 0021 ocenił je dziś jako słabsze od Sentry (stack trace, source mapy, release), warte ponownej oceny później (from spec 0021) · needs a decision
- **Zapisane wyszukiwania z alertami e mail w panelu klienta**: częsty wzorzec na porównywalnych portalach nieruchomości (research w spec 0024 rationale.md), ale wymaga infrastruktury e mail z funkcji 17 (Powiadomienia e mail), której dziś nie ma; zaprojektuj jako osobną funkcję, gdy 17 będzie gotowa (from spec 0024) · needs a decision

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
