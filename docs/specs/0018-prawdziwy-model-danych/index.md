# 0018. Prawdziwy model danych

**Date**: 2026-08-28
**Status**: In Progress

## Summary

Ta decyzja projektuje prawdziwy schemat bazy danych (Postgres przez Drizzle ORM, ustalone w spec 0017), który zastąpi dzisiejsze dane przykładowe i localStorage. Obejmuje wszystkie encje epiki Produkcja: konta i role, katalog produktów, zapytania, oferty, zamówienia z historią etapów realizacji, płatności, dokumenty i status zgodności per kraj. Schemat jest projektowany w całości teraz (Foundation), żeby kolejne funkcje epiki (6 do 15) nie wymagały migracji łamiącej dane, choć realnie zapisywać dane zaczną dopiero pojedynczo, w kolejności ustalonej podejściem Tracer Bullet.

## Context

Dzisiejszy prototyp trzyma wszystkie dane w plikach przykładowych (`lib/data/fixtures/*`) i w `localStorage` przeglądarki, opisane typami w `lib/data/types.ts` i kilku osobnych plikach `lib/*.ts`. Ten model narósł organicznie, funkcja po funkcji (spec 0004 do 0016), i ma realne pęknięcia: tożsamość producenta jest rozbita na dwa niepowiązane typy (`Producer` z fixture i `RegistrationDetails` kluczowany NIP-em), oferta istnieje w dwóch niepołączonych miejscach (odpowiedź producenta na zapytanie w `localStorage` i osobny, nietrwały stan "przyjęcia" po stronie klienta), zapytanie klienta nigdy się nie zapisuje, a trzy różne miejsca (kwalifikowalność prawna projektu per kraj, wynik analizy działki, samoocena gotowości eksportowej producenta) powielają ten sam kształt `{status, reason}` bez wspólnego źródła prawdy.

Spec 0017 wybrał narzędzia (Neon Postgres w regionie Frankfurt, Drizzle ORM, Auth.js w wersji 5 z sesjami w bazie danych, Cloudflare R2), ale świadomie zostawił schemat pusty i wskazał tę decyzję jako miejsce, gdzie muszą się rozstrzygnąć dwie sprawy wymagane przez RODO: ścieżka audytu dostępu do danych osobowych i strategia usuwania danych (prawo do bycia zapomnianym) w obecności historii branchy/PITR Neon i osieroconych plików w R2. Te dwie sprawy nie są opcjonalne, muszą być rozstrzygnięte tutaj, nie odłożone do funkcji 5 (RODO i zgodność prawna).

Epika Produkcja idzie podejściem Tracer Bullet: funkcja 6 dowozi jeden cienki wątek (logowanie, jeden produkt, jedno zapytanie) przez wszystkie warstwy, zanim kolejne funkcje pogrubią kolejne segmenty (oferta, płatność, pliki, zgodność, transport, realizacja). Żeby to działało bez migracji łamiącej dane po drodze, schemat musi być zaprojektowany dla całej epiki teraz, nawet jeśli większość tabel zacznie być realnie zapisywana dopiero przy swojej funkcji.

## Requirements

**User stories**:
- Jako inżynier budujący funkcję 6 (rdzeń pętli), chcę gotowy schemat kont, produktów i zapytań, żeby zbudować pierwszy prawdziwy wątek bez projektowania tabel po drodze.
- Jako inżynier budujący funkcje 7 do 15, chcę, żeby potrzebne im tabele (oferta, zamówienie, płatność, dokument, zgodność) już istniały w schemacie, żeby ich migracja tylko rozszerzała dane, nigdy ich nie łamała.
- Jako osoba odpowiedzialna za zgodność z RODO, chcę wbudowaną ścieżkę audytu i jasną strategię usuwania danych osobowych, zanim jakiekolwiek prawdziwe konto zacznie istnieć.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: Schemat Drizzle w `lib/db/schema.ts` definiuje każdą encję nazwaną w funkcji 2 zakresu (konta i role, katalog produktów, zapytania, oferty, zamówienia z etapami realizacji, płatności, dokumenty, status zgodności per kraj).
- **AC-2**: Każda tabela niosąca dane osobowe ma ścieżkę audytu (wpis w `audit_log` przy tworzeniu/zmianie) i jasno określoną strategię usuwania (anonimizacja w miejscu dla rekordów z zależnościami, twarde usunięcie tylko dla rekordów bez zależności).
- **AC-3**: Pierwsza migracja (`drizzle-kit generate` + `drizzle-kit migrate`) stosuje się bezbłędnie na pustej, deweloperskiej bazie Neon.
- **AC-4**: Żadna tabela nie wymaga przewidywalnej, łamiącej migracji dla funkcji 6 do 15: relacje i pola uwzględniają znane przyszłe potrzeby (rewizje ofert, historia etapów zamówienia, cele płatności, metadane dokumentów) bez zmiany schematu, gdy te funkcje zaczną budować.
- **AC-5**: Każda rola (klient, producent, admin) może być ograniczona do własnych danych przez łańcuch kluczy obcych (`producer_id`, `client_id`, `user_id`), wystarczający do zapytań na poziomie aplikacji bez Row Level Security.
- **AC-6**: Tabele wymagane przez adapter Drizzle dla Auth.js w wersji 5 (`users`, `accounts`, `sessions`, `verification_tokens`) mają kształt zgodny z konwencją adaptera, rozszerzony o kolumnę roli i powiązania z profilami, żeby funkcja 6 mogła podłączyć prawdziwe logowanie bez zmiany schematu.

## Decision

**Chosen option**: Option 1: Pełny schemat całej epiki teraz, wdrażany stopniowo

Schemat obejmuje wszystkie dwadzieścia jeden tabel od razu (konta, katalog, zapytania, oferty, zamówienia, płatności, dokumenty, zgodność), ale kolejne funkcje epiki (6 do 15) zapisują do nich dane stopniowo, w kolejności ustalonej podejściem Tracer Bullet.

**Implementation skills**: `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`)

## Rationale

Pełne uzasadnienie, rozważane opcje i kontekst decyzji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Wszystkie klucze główne to `uuid` (`gen_random_uuid()`), poza tabelami Auth.js i tabelami z naturalnym kluczem złożonym (oznaczone niżej). Wszystkie kwoty pieniężne to liczby całkowite w najmniejszej jednostce (grosze/centy), nie liczby zmiennoprzecinkowe. Każda tabela ma `created_at`, tabele mutowalne mają też `updated_at`; tabele niosące dane osobowe mają dodatkowo `deleted_at` jako znacznik anonimizacji (patrz Security model).

*Autoryzacja (Auth.js w wersji 5, adapter Drizzle, kształt tabel zgodny z konwencją adaptera):*
- **users**: id, name, email (unique, wymagane), emailVerified (timestamp, nullable), image, `role` (enum: client | producer | admin), createdAt, updatedAt, deletedAt (anonimizacja)
- **accounts**: id, userId → users, provider, providerAccountId, tokeny OAuth (kształt standardowy adaptera Auth.js, bez zmian)
- **sessions**: sessionToken (pk), userId → users, expires (sesje w bazie danych, zgodnie ze spec 0017)
- **verification_tokens**: identifier, token, expires (pk złożony identifier+token) — link magiczny

*Profile:*
- **producer**: id, userId → users (unique, 1:1), nip (unique, wymagane), name, countryCode → country, rating, reviewCount, technology (enum, 4 wartości z dzisiejszego mocka), verificationStatus (enum: not_submitted | pending | approved | rejected), createdAt, updatedAt, deletedAt
- **producer_delivery_country**: producerId → producer, countryCode → country (klucz złożony, zastępuje dzisiejsze `deliveryCountries[]`)
- **client**: id, userId → users (unique, 1:1), createdAt, updatedAt, deletedAt (minimalna, miejsce na przyszłe pola)
- **country**: code (pk, np. `PL`), name (tabela słownikowa, patrz Rationale dla uzasadnienia wyboru nad ENUM-em)

*Katalog:*
- **product**: id, producerId → producer (wymagane), `status` (enum: draft | published), name, countryOfProduction → country, floorAreaM2, builtUpAreaM2, description + 8 pól technicznych (wallBuildUp, insulation, heatTransferCoefficients, windowClass, ventilation, heatSource, fireResistance, windResistance), completionStandard (enum), productionLeadTimeWeeksMin/Max, onSiteAssemblyDaysMin/Max, housePriceMinCents/MaxCents (cena samego domu), structuralWarrantyYears, category (enum), createdAt, updatedAt, deletedAt — pola powyżej tej linii są **nullable dopóki `status = draft`**, wymagane od momentu `status = published`
  — pola obecne tylko w dzisiejszym fixture `Project`, których kreator producenta (spec 0016) jeszcze nie zbiera, dodane jako **nullable, wypełniane później**: rooms, bedrooms, bathrooms, storeys, externalDimensions, roofType, constructionSystem, foundationOptions, customizationScope, priceMinCents/MaxCents (cena całego pakietu z logistyką, osobno od `housePriceMinCents/MaxCents`), currency (na razie stała `EUR`), priceIncludes/priceExcludes (jsonb, lista tekstów), featured (bool)
  <!-- Łączy dzisiejsze Project (fixture, widok klienta) i SavedProduct (localStorage, katalog producenta) w jedną tabelę: produkt istnieje raz, klient widzi to, co zapisał producent. Kreator producenta dziś nie zbiera części pól z fixture (patrz Follow-up); status=draft odwzorowuje dzisiejszy stan "szkic w localStorage" wprost w bazie, żeby producent mógł wrócić do edycji z innego urządzenia. -->

*Zgodność (trzy osobne tabele, patrz Rationale):*
- **product_country_eligibility**: productId → product, countryCode → country (klucz złożony), status (enum: approved | conditional | blocked), reason, updatedAt
- **plot_analysis_result**: id, productId → product, clientId → client (oba wymagane), status (enum), reason, createdAt — unikalny per (productId, clientId), nie per productId samo; dwóch różnych klientów analizujących ten sam produkt dla różnych działek to dwa osobne wiersze
- **producer_export_readiness**: producerId → producer, countryCode → country (klucz złożony), status (enum), reason, gaps (jsonb, lista tekstów), updatedAt

*Zapytanie → oferta → zamówienie:*
- **inquiry**: id, clientId → client (wymagane), name/email/phone (migawka danych kontaktowych w chwili wysłania, patrz Rationale), deliveryCountryCode → country, status (enum: open | offered | closed), receivedAt, createdAt
- **inquiry_item**: inquiryId → inquiry, productId → product (klucz złożony, 1 do 3 produktów na zapytanie)
- **offer**: id, inquiryId → inquiry, producerId → producer, currency, installationPriceCents, transportPriceCents (zapisana migawka w chwili złożenia oferty, nie liczona na żywo jak dziś), status (enum: active | accepted | rejected | superseded), submittedAt, createdAt
  <!-- Unikalność częściowa: najwyżej jedna oferta ze status='active' na parę (inquiryId, producerId). Producent odpowiada tylko na te elementy zapytania, które zawierają jego produkty; wielu producentów może złożyć osobne oferty na to samo zapytanie, jeśli obejmuje produkty od różnych producentów. -->
- **offer_item**: offerId → offer, productId → product (klucz złożony), housePriceCents — cena każdego produktu w ofercie osobno, żeby zapytanie obejmujące kilka produktów tego samego producenta miało cenę per produkt, nie jedną spłaszczoną kwotę
- **order**: id, offerId → offer (unique, 1:1), currentStage (enum: produkcja | transport | montaz | odbior | gwarancja), createdAt, updatedAt
  <!-- Produkty zamówienia pochodzą z offer_item przez offer_id; jedno zamówienie może obejmować kilka produktów tego samego producenta, dostarczanych i montowanych razem. -->
- **order_stage_event**: id, orderId → order, stage (enum, jak wyżej), reachedAt, changedByUserId → users (nullable), note, createdAt (append-only, historia zmian nigdy nie jest nadpisywana)

*Płatność i dokumenty:*
- **payment**: id, purpose (enum: plot_analysis_fee | platform_commission), amountCents, currency, status (enum: pending | paid | failed | refunded), providerReference (nullable, wypełniane przez funkcję 8), orderId → order (nullable), plotAnalysisResultId → plot_analysis_result (nullable), paidByUserId → users, createdAt, updatedAt
- **document**: id, r2Key, filename, mimeType, sizeBytes, purpose (enum: product_photo | product_floor_plan | order_stage | company_verification | producer_photo), isCover (bool, default false, dla product_photo — zastępuje dzisiejsze `coverImageUrl`/`featuredPhotoUrl`), sortOrder (int, nullable), ownerUserId → users, productId → product (nullable), orderStageEventId → order_stage_event (nullable), producerId → producer (nullable, dla company_verification i producer_photo), createdAt, deletedAt

*Audyt:*
- **audit_log**: id, actorUserId → users (nullable, akcje systemowe), action (enum: create | update | delete), tableName, recordId, oldValues (jsonb, nullable, **pola osobowe zredagowane**, patrz niżej), newValues (jsonb, nullable, tak samo zredagowane), createdAt (append-only)
  <!-- Wypełniane triggerem Postgres (AFTER INSERT/UPDATE/DELETE) na każdej tabeli niosącej dane osobowe, nie dyscypliną kodu aplikacji przy każdym miejscu wywołania — jeden trigger, nie do zapomnienia w nowym punkcie dostępu. Ten sam trigger redaguje kolumny osobowe (imię, e-mail, telefon, NIP) do skrótu/maski zamiast pełnej wartości w jsonb, żeby `audit_log` samo nie stało się miejscem, gdzie "usunięte" dane osobowe wciąż istnieją w pełnej postaci po anonimizacji źródłowego wiersza. -->

**State transitions**:
- **order.currentStage**: produkcja → transport → montaz → odbior → gwarancja (sekwencyjne, zgodnie z dzisiejszym mockiem; każde przejście dopisuje wiersz do `order_stage_event`, nigdy nie nadpisuje poprzedniego)
- **offer.status**: active → (accepted | rejected | superseded); nowa oferta od tego samego producenta na to samo zapytanie ustawia poprzednią na `superseded` i tworzy nowy wiersz `active`
- **producer.verificationStatus**: not_submitted → pending (po wgraniu dokumentów, funkcja 15) → (approved | rejected)
- **payment.status**: pending → (paid | failed); paid → refunded (możliwe zwroty)

**Key invariants**:
- Najwyżej jedna aktywna oferta (`status='active'`) na parę (inquiry, producer): unikalny indeks częściowy.
- Najwyżej jedno `plot_analysis_result` na parę (product, client): unikalny indeks złożony, nie na samym `productId`.
- `order` istnieje wyłącznie jako efekt `offer.status = 'accepted'`; nie da się utworzyć zamówienia bez zaakceptowanej oferty (klucz obcy `order.offerId` wymagany i unikalny). Jedno zapytanie może skończyć się kilkoma zamówieniami (jednym na każdego producenta, którego oferta została zaakceptowana), nie tylko jednym.
- `order_stage_event` jest tylko do dopisywania (insert-only); żaden kod aplikacji nie aktualizuje ani nie usuwa istniejącego wiersza. `order.currentStage` jest zdenormalizowaną kopią najnowszego wpisu, ustawianą w tej samej transakcji co nowy `order_stage_event`, nigdy osobno.
- Każda mutacja tabeli niosącej dane osobowe (`users`, `producer`, `client`, `inquiry`, `payment`, `document`) zapisuje wiersz w `audit_log` przez trigger Postgres, nie przez kod aplikacji (patrz Feature design > Audyt).
- `deletedAt` oznacza anonimizację (pola osobowe wyzerowane), nie usunięcie wiersza, dla każdej tabeli z zależnościami (`users`, `producer`, `client`, `inquiry`); twarde usunięcie dopuszczalne tylko dla tabel bez zależnych rekordów (np. `verification_tokens` po wygaśnięciu). Anonimizacja źródłowego wiersza nie usuwa istniejących wpisów `audit_log`, ale te wpisy mają już zredagowane pola osobowe (patrz wyżej), więc nic pełnego nie zostaje.
- `product.status = 'published'` wymaga wypełnionych pól opisanych jako wymagane od publikacji (patrz Feature design > Katalog); walidacja na poziomie aplikacji, nie CHECK constraint (zbyt wiele pól, żeby to było czytelne w SQL).

**Security model**:
Ta funkcja dotyka danych osobowych klientów i producentów (imię, e-mail, telefon, NIP) oraz przyszłych płatności, więc zakres RODO (Rozporządzenie UE 2016/679) jest aktywny wprost.

- Autoryzacja na poziomie aplikacji, nie Row Level Security (decyzja inżyniera): każde zapytanie filtruje po `producer_id`/`client_id`/`user_id` uwierzytelnionego konta we wspólnym helperze warstwy Drizzle, nie na poziomie Postgres.
- Rola `admin` istnieje w enumie `users.role` od teraz, ale nie ma jeszcze ścieżki samodzielnego uzyskania jej ani panelu (funkcja 14); do tego czasu przypisywana ręcznie w bazie.
- Ścieżka audytu (`audit_log`) nie jest opcjonalna: każda mutacja (create/update/delete) tabeli z danymi osobowymi jest logowana triggerem Postgres, zgodnie z wymogiem RODO wskazanym w spec 0017, z polami osobowymi zredagowanymi w samym logu (patrz Feature design > Audyt), żeby log nie stał się nowym miejscem przechowywania "usuniętych" danych.
  <!-- Świadome zawężenie zakresu: spec 0017 mówił o "kto, kiedy, do jakiego rekordu", co obejmuje też odczyt, nie tylko zapis. Ta funkcja loguje zapisy (create/update/delete); logowanie odczytu przez personel (kluczowe dla panelu administracyjnego, funkcja 14) jest odłożone do tamtej funkcji, patrz Follow-up. Zwykły użytkownik czytający własne dane nie jest zdarzeniem audytowym w rozumieniu RODO; ryzykiem jest odczyt cudzych danych przez personel, co dziś nie istnieje (nie ma jeszcze panelu). -->
- Usuwanie danych osobowych: anonimizacja w miejscu dla rekordów z zależnościami (patrz Key invariants), akceptując, że historia Neon PITR i branchy przez pewien czas nadal zawiera dane sprzed anonimizacji — to udokumentowane, świadome ryzyko szczątkowe (patrz Consequences), nie luka.

**Configuration required**:
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`: już ustalone w spec 0017, bez zmian.
- `AUTH_SECRET`: podpisywanie sesji/tokenów Auth.js, generowanie już oznaczone jako zadanie w spec 0017 Follow-up, teraz realnie potrzebne skoro logowanie linkiem magicznym jest tu ustalone.
- Dane dostawcy poczty dla linku magicznego (np. `EMAIL_SERVER`/`EMAIL_FROM` albo klucz API dostawcy transakcyjnego e-mail, konkretny dostawca ustala funkcja 6): bez tego link magiczny nie ma jak wysłać wiadomości.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`: już oznaczone jako zadanie w spec 0017 Follow-up, teraz realnie potrzebne skoro `document.r2Key` zakłada istniejący kubełek (funkcja 9 je realnie wykorzysta, ale kolumna istnieje od tej migracji).

**Critical test scenarios** (każdy odwołuje się do kryterium w ## Requirements):
- Happy path: `drizzle-kit generate` tworzy migrację ze wszystkich tabel, `drizzle-kit migrate` stosuje ją na pustej bazie deweloperskiej bez błędu, weryfikuje **AC-1**, **AC-3**.
- Audyt: aktualizacja wiersza `producer` w teście tworzy dokładnie jeden nowy wiersz w `audit_log` (przez trigger, nie kod aplikacji) z poprawnym, zredagowanym `oldValues`/`newValues`, weryfikuje **AC-2**.
- Anonimizacja: oznaczenie `users.deletedAt` zeruje pola osobowe, ale nie usuwa powiązanych wierszy `inquiry`/`order`, ani wcześniejszych wpisów `audit_log` (które już mają zredagowane dane), weryfikuje **AC-2**.
- Uprawnienia: zapytanie warstwy dostępu filtrowane po `producerId` innego producenta zwraca pusty wynik, nie błąd i nie cudze dane, weryfikuje **AC-5**.

## Build plan

1. Zdefiniuj tabelę słownikową `country` i wypełnij ją wierszami PL/DE/NL, satisfies **AC-1**
2. Zdefiniuj tabele rdzenia Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`) rozszerzone o `role` i relacje do profili, satisfies **AC-1**, **AC-6**
3. Zdefiniuj `producer`, `producer_delivery_country`, `client`, satisfies **AC-1**
4. Zdefiniuj `product` (połączenie dzisiejszego Project i SavedProduct), satisfies **AC-1**
5. Zdefiniuj tabele zgodności: `product_country_eligibility`, `plot_analysis_result` (kluczowane per product+client), `producer_export_readiness`, satisfies **AC-1**
6. Zdefiniuj `inquiry`, `inquiry_item`, `offer`, `offer_item`, `order`, `order_stage_event`, satisfies **AC-1**, **AC-4**
7. Zdefiniuj `payment`, satisfies **AC-1**, **AC-4**
8. Zdefiniuj `document`, satisfies **AC-1**, **AC-4**
9. Zdefiniuj `audit_log`, kolumny `deletedAt` na wszystkich tabelach z danymi osobowymi, i trigger Postgres (AFTER INSERT/UPDATE/DELETE) wypełniający `audit_log` z redakcją pól osobowych, satisfies **AC-2**
10. Wygeneruj i zastosuj pierwszą migrację Drizzle na deweloperskiej bazie Neon (`npm run db:generate`, `npm run db:migrate`), satisfies **AC-3**
11. Napisz test warstwy dostępu potwierdzający, że zapytanie ograniczone po `producer_id`/`client_id` nie zwraca cudzych danych, satisfies **AC-5**

## Consequences

**Positive**:
- Wszystkie kolejne funkcje epiki (6 do 15) mają gotowe tabele; żadna nie powinna wymagać migracji łamiącej istniejące dane, tylko rozszerzeń (nowe kolumny nullable, nowe tabele).
- Ścieżka audytu i strategia anonimizacji są wbudowane od pierwszej migracji, nie doklejane później pod presją audytu RODO.
- Trzy dzisiejsze, rozbite koncepcje (tożsamość producenta, oferta, zapytanie) stają się spójnymi tabelami z prawdziwymi relacjami, kończąc rozjazd między `lib/data/*` a `lib/producer-*`/`lib/local-*`.
- Tabele Auth.js są od razu w kształcie zgodnym z adapterem, więc funkcja 6 podłącza logowanie bez projektowania schematu kont po drodze.

**Negative / tradeoffs**:
- Dwadzieścia jeden tabel zaprojektowanych naraz, zanim jakikolwiek prawdziwy kod je zapisuje, to realne ryzyko: część założeń (np. kształt `offer`/`offer_item` przy wielu produktach i wielu producentach na wspólnym zapytaniu) zostanie sprawdzona dopiero przy budowie funkcji 7, nie teraz.
- Ścieżka audytu (`audit_log` przy każdej mutacji) dodaje zapis do każdej operacji na tabelach z danymi osobowymi; przy darmowym poziomie Neon to dodatkowe zapytanie, nie tylko dodatkowy wiersz.
- Anonimizacja zamiast twardego usuwania oznacza, że baza rośnie i nigdy nie kurczy się przy usunięciu konta; wymaga osobnego, przyszłego zadania porządkowego (np. cykliczne czyszczenie w pełni zanonimizowanych, starych wierszy), nieujętego w tej funkcji.
- Autoryzacja na poziomie aplikacji (nie Row Level Security) oznacza, że każdy nowy punkt dostępu do danych (nowa funkcja API) musi pamiętać o filtrze właściciela; nic nie wymusi tego na poziomie bazy, jeśli ktoś zapomni.
- Historia Neon PITR i branchy przez pewien czas nadal zawiera dane sprzed anonimizacji; to świadomie zaakceptowane ryzyko szczątkowe (patrz Security model), nie zamknięta sprawa.

**Neutral**:
- Ceny są teraz przechowywane w groszach/centach (liczby całkowite), co wymaga konwersji na granicy UI (dziś `Project.priceMin` to zwykła liczba EUR); to zmiana konwencji w każdym miejscu, które dziś czyta ceny z fixture'ów.
- `country` jako tabela słownikowa zamiast literału TypeScript oznacza, że dodanie kraju to operacja na danych, nie na kodzie; ale też, że walidacja kraju w formularzach musi czytać z bazy (lub cache'u), nie z importu stałej.

## Follow-up

- [ ] Skanowanie okresowe albo procedura ręczna do czyszczenia w pełni zanonimizowanych, starych wierszy (`users.deletedAt` starsze niż X), żeby baza nie rosła bez końca; nieujęte w tej funkcji, do zaprojektowania razem z funkcją 5 (RODO i zgodność prawna).
- [ ] Funkcja 9 (realne przechowywanie plików) musi doprecyzować politykę osieroconych plików R2 po usunięciu wiersza `document` (dziś `document.deletedAt` tylko oznacza wiersz, nie usuwa pliku z R2 automatycznie).
- [ ] Funkcja 6 (rdzeń pętli) jako pierwsza faktycznie zapisuje dane przez ten schemat (users, producer, client, product, inquiry); jeśli w praktyce ujawni się rozjazd między tym projektem a rzeczywistą potrzebą, wraca tu jako aktualizacja spec, nie cichą poprawkę w kodzie.
- [ ] Rola `admin` (`users.role = 'admin'`) nie ma jeszcze ścieżki nadania; do funkcji 14 (panel administracyjny) przypisywana ręcznie w bazie danych, udokumentuj tę procedurę operacyjnie przed pierwszym użyciem.
- [ ] `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) i `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) konwencje nie są jeszcze w `lib/db/AGENTS.md` poza ogólną wzmianką; po zbudowaniu tej funkcji `lib/db/AGENTS.md` powinien opisać rzeczywisty schemat (zadanie dla `/sync`, nie do zrobienia teraz).
- [ ] Kreator producenta (spec 0016) dziś nie zbiera kilku pól, które ma tylko dzisiejszy fixture `Project` (rooms, bedrooms, bathrooms, storeys, externalDimensions, roofType, constructionSystem, foundationOptions, customizationScope, cena pakietu z logistyką, `priceIncludes`/`priceExcludes`, `featured`). Te kolumny są w schemacie jako nullable; funkcja 6 lub 7 musi albo rozszerzyć kreator o te pola, albo świadomie zdecydować, że część z nich wypełnia platforma, nie producent.
- [ ] Logowanie odczytu danych osobowych przez personel (nie tylko zapis) jest wymogiem RODO wskazanym w spec 0017, ale odłożone tu do funkcji 14 (panel administracyjny), bo dziś nie ma jeszcze roli, która czyta cudze dane. Rozszerz `audit_log.action` o `read` i podłącz logowanie w warstwie dostępu panelu, zanim panel trafi do użytku.

## Migration plan

**Strategy**: no migration needed (brak istniejących danych do przeniesienia)
**Phases**:
1. Zastosuj pierwszą migrację (wszystkie 21 tabel naraz) na pustej, deweloperskiej bazie Neon ustanowionej w spec 0017; nie istnieją żadne prawdziwe dane do przeniesienia z dzisiejszych fixture'ów/`localStorage` (te pozostają nietknięte, obsługują dalej epikę Prototyp, aż kolejne funkcje Produkcji podmienią je jedna po drugiej).
**Rollback**: cofnięcie pojedynczego commita z migracją; baza deweloperska jest pusta, więc nie ma ryzyka utraty danych.
**Risks**: żadne, baza docelowa nie ma dziś żadnych wierszy.
