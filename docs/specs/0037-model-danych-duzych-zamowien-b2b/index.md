# 0037. Model danych dla dużych zamówień B2B

**Date**: 2026-09-13
**Status**: In Progress

## Summary

Ta decyzja dodaje model danych pod nową, dużą funkcję platformy: inwestorzy tacy jak Lammert (klienci chcący 10 i więcej domów naraz, na przykład pod resort czy osiedle) mogą albo przejrzeć ofertę sprawdzonych, dużych producentów i wybrać konkretny model, albo wysłać jedno wolne zapytanie do wszystkich takich producentów naraz, bez zakładania konta. Producenci deklarują swoją realną zdolność produkcyjną (ile domów miesięcznie, w jakim czasie, jakie certyfikaty) i odpowiadają realnymi wycenami. Ten spec ustala tylko fundament danych (tabele, pola, reguły); ekrany, odznaka "Verified Volume Manufacturer" i inteligentne dopasowywanie producentów to osobne, przyszłe decyzje.

## Requirements

**User stories**:
- Jako inwestor planujący duży projekt (10 i więcej domów), chcę wysłać jedno zapytanie opisujące moje potrzeby do wszystkich sprawdzonych, dużych producentów, bez zakładania konta, żeby szybko dostać kilka realnych wycen.
- Jako inwestor, chcę też móc po prostu przejrzeć konkretny model domu od dużego producenta i zapytać o niego w większej ilości sztuk.
- Jako producent obsługujący duże zamówienia, chcę opisać swoją realną zdolność produkcyjną (ile domów miesięcznie, jakie certyfikaty, jakie standardy), żeby dostawać dopasowane, duże zapytania i budować zaufanie inwestorów.
- Jako producent, chcę odpowiadać na zapytania konkretną wyceną (cena za sztukę, cena całkowita, termin).
- Jako administrator, chcę zatwierdzać zgłoszoną zdolność produkcyjną producenta, zanim pokaże się jako odznaka "Verified Volume Manufacturer".

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Inwestor może wysłać wolne zapytanie o duży projekt (`project_request`) bez logowania: kraj, liczba domów (minimum wymagane, maksimum opcjonalne), typ przedsięwzięcia (stała lista plus "inne"), potrzebne rodziny produktu (dom, spa modułowe, pergola, wiele naraz), zakres powierzchni domów, standard wykończenia, okno startu produkcji, okno dostawy, oraz dane kontaktowe (imię i nazwisko, e mail wymagane, telefon opcjonalny).
- **AC-2**: Wysłanie `project_request` automatycznie tworzy jeden wiersz `project_request_target_producer` na każdego producenta ze statusem "Verified Volume Manufacturer", który dostarcza do kraju z zapytania. Jeśli takiego producenta nie ma, zapytanie i tak zapisuje się ze statusem `open` i zero wierszy powiązanych (widoczne wewnętrznie do ręcznej obsługi, patrz Follow-up).
- **AC-3**: Producent powiązany z danym `project_request` (ma wiersz w `project_request_target_producer`) może złożyć wycenę (`project_quote`: cena za sztukę, cena całkowita, proponowany termin, notatka). W danej chwili może istnieć tylko jedna aktywna wycena tego producenta na to zapytanie, nowa zastępuje poprzednią.
- **AC-4**: Inwestor może też wysłać zapytanie o konkretny, istniejący, opublikowany produkt dużego producenta (`bulk_product_inquiry`), podając pożądaną liczbę sztuk (minimum wymagane, maksimum opcjonalne), kraj dostawy, okna czasowe i dane kontaktowe, bez logowania. Odbiorcą jest bezpośrednio producent tego konkretnego produktu.
- **AC-5**: Producent może odpowiedzieć wyceną na `bulk_product_inquiry` dotyczący jego własnego produktu, tym samym mechanizmem wyceny co w AC-3 (jedna współdzielona tabela `project_quote`, dokładnie jedno z dwóch możliwych powiązań ustawione).
- **AC-6**: Producent może prowadzić własny profil zdolności produkcyjnej (`producer_capacity_profile`): zdolność miesięczna, liczba linii produkcyjnych, czasy realizacji przy różnych wolumenach, maksymalny rozmiar modułu, obsługiwane standardy wykończenia, certyfikaty, możliwość dostosowania projektu klienta, możliwość transportu i montażu, referencje z projektów seryjnych. Administrator może ustawić status weryfikacji wolumenowej na "zatwierdzony": to jest dana stojąca za przyszłą odznaką "Verified Volume Manufacturer" (sam wygląd odznaki to osobna, przyszła decyzja).
- **AC-7**: Gdy klient loguje się pierwszy raz istniejącym mechanizmem (link magiczny) z adresem e mail, który pasuje do jednego lub więcej `project_request`/`bulk_product_inquiry`, te zapytania zostają powiązane z jego kontem (uzupełnione `clientId`) i widoczne dla niego.
- **AC-8**: Klient może uzupełnić w swoim profilu NIP i nazwę firmy; to przenosi jego status weryfikacji B2B na "oczekujący". Administrator może go zatwierdzić lub odrzucić.
- **AC-9**: Zaakceptowanie wyceny (`project_quote` na status `accepted`) jest możliwe tylko, gdy status weryfikacji B2B klienta to "zatwierdzony"; w przeciwnym razie akcja jest odrzucana z jasnym powodem. Do tego momentu klient może swobodnie przeglądać i odpowiadać na wyceny bez tego ograniczenia. Zaakceptowanie jednej wyceny automatycznie odrzuca (`rejected`) pozostałe aktywne wyceny na to samo zapytanie; najwyżej jedna wycena na zapytanie może mieć status `accepted`.
- **AC-10**: Ten sam adres e mail (znormalizowany: małe litery, bez białych znaków na końcach) nie może mieć więcej niż 3 jednocześnie nierozstrzygnięte (`status` w `open` lub `quoted`, czyli jeszcze nie `accepted` ani `closed`) wiersze `project_request`/`bulk_product_inquiry` łącznie; czwarte zgłoszenie jest odrzucane z jasnym komunikatem. Licząc tylko `open` dostanie producenta pierwszej wyceny zwolniłoby slot bez żadnego rozstrzygnięcia, więc `quoted` też się liczy.
- **AC-11**: Gdy producent złoży `project_quote`, na `contactEmail` zapytania wysyłany jest e mail z linkiem logującym (ten sam mechanizm linku magicznego co dzisiejsze logowanie, spec 0023), żeby inwestor bez założonego konta mógł zobaczyć odpowiedź bez zgadywania, że ma się zalogować tym samym adresem. Kliknięcie linku loguje i tym samym wykonuje AC-7 (powiązanie zapytań po e mailu).
- **AC-12**: `unitCountMax` (gdy podane) jest większe lub równe `unitCountMin`; każde okno czasowe "do" (gdy podane) jest równe lub późniejsze niż jego "od"; `project_request.families` nie może być puste; `unitCountMin` na obu tabelach musi być co najmniej 10 (dolny próg "dużego zamówienia" ustalony w rozmowie projektowej).

## Decision

**Chosen option**: Option 2: Dwa osobne wejścia (`project_request` na wolne zapytanie i `bulk_product_inquiry` na zapytanie o konkretny produkt), jedna współdzielona tabela wyceny (`project_quote`), oraz `producer_capacity_profile` jako rozszerzenie istniejącego producenta.

Nowe encje żyją obok dzisiejszego modelu (`inquiry`/`offer` zostają nietknięte dla zwykłych, małych zapytań), bo dzisiejszy `inquiry` zakłada zalogowanego klienta i 1 do 3 konkretnych produktów, co nie pasuje do żadnej z tych dwóch nowych ścieżek.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`)

## Rationale

Pełne uzasadnienie, rozważane opcje i źródła: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

- **`project_request`** (ścieżka B, wolne zapytanie, bez logowania)
  - `id` uuid PK
  - `clientId` uuid, nullable, FK → `client.id` (uzupełniane dopiero przy pierwszym logowaniu z pasującym e mailem, AC-7)
  - `contactName` text, wymagane
  - `contactEmail` text, wymagane, znormalizowany (małe litery, przycięte białe znaki) przed zapisem, żeby AC-7/AC-10 dopasowywały się niezawodnie
  - `contactPhone` text, nullable
  - `countryCode` text, wymagane, FK → `country.code`
  - `locationDetail` text, nullable (region, miasto)
  - `projectType` enum (`resort`, `holiday-park`, `housing-development`, `student-housing`, `senior-living`, `workforce-accommodation`, `other`), wymagane
  - `families` jsonb, lista wartości `productFamilyEnum` (`dom`, `spa-modulowe`, `pergola`), wymagane, `CHECK` niepusta (AC-12)
  - `unitCountMin` integer, wymagane, `CHECK >= 10` (AC-12)
  - `unitCountMax` integer, nullable, `CHECK >= unitCountMin` gdy ustawione (AC-12)
  - `floorAreaM2Min` / `floorAreaM2Max` real, nullable
  - `completionStandard` (reużywa istniejący `completionStandardEnum`), nullable
  - `startWindowFrom` / `startWindowTo` date, nullable, `CHECK startWindowTo >= startWindowFrom` gdy oba ustawione (AC-12)
  - `deliveryWindowFrom` / `deliveryWindowTo` date, nullable, `CHECK deliveryWindowTo >= deliveryWindowFrom` gdy oba ustawione (AC-12)
  - `extrasNote` text, nullable (dodatkowe potrzeby jak sauna czy wellness, opisowo)
  - `status` (nowy `bulkRequestStatusEnum`: `open`, `quoted`, `accepted`, `closed`), wymagane, domyślnie `open`
  - `createdAt`, `updatedAt` timestamp

- **`project_request_target_producer`** (tabela łącząca, kto został powiadomiony)
  - `projectRequestId` uuid, wymagane, FK → `project_request.id`
  - `producerId` uuid, wymagane, FK → `producer.id`
  - `status` (nowy `targetProducerStatusEnum`: `invited`, `viewed`, `quoted`, `declined`), wymagane, domyślnie `invited`
  - `notifiedAt` timestamp, wymagane, domyślnie teraz
  - `viewedAt` timestamp, nullable
  - PK złożony (`projectRequestId`, `producerId`)

- **`bulk_product_inquiry`** (ścieżka A, konkretny produkt, bez logowania)
  - `id` uuid PK
  - `clientId` uuid, nullable, FK → `client.id` (jak wyżej)
  - `productId` uuid, wymagane, FK → `product.id` (odbiorca to `product.producerId`, bez osobnej tabeli łączącej)
  - `contactName` / `contactEmail` (wymagane, znormalizowany jak wyżej) / `contactPhone` (nullable)
  - `unitCountMin` integer wymagane, `CHECK >= 10`; `unitCountMax` integer nullable, `CHECK >= unitCountMin` gdy ustawione (AC-12)
  - `deliveryCountryCode` text wymagane, FK → `country.code`
  - `startWindowFrom/To`, `deliveryWindowFrom/To` date, nullable, te same `CHECK` "do większe lub równe od" co w `project_request` (AC-12)
  - `note` text, nullable
  - `status` (reużywa `bulkRequestStatusEnum`), wymagane, domyślnie `open`
  - `createdAt`, `updatedAt` timestamp

- **`project_quote`** (współdzielona odpowiedź producenta dla obu ścieżek)
  - `id` uuid PK
  - `projectRequestId` uuid, nullable, FK → `project_request.id`
  - `bulkProductInquiryId` uuid, nullable, FK → `bulk_product_inquiry.id`
  - `CHECK`: dokładnie jedno z dwóch powyższych pól jest ustawione
  - `producerId` uuid, wymagane, FK → `producer.id`
  - `currency` text, wymagane, domyślnie `EUR`
  - `unitPriceCents` bigint, nullable, `CHECK > 0` gdy ustawione (cena za jedną sztukę, może nie mieć sensu przy mieszanych rodzinach produktu)
  - `totalPriceCents` bigint, wymagane, `CHECK > 0` (zwykły `integer` (do około 21,4 mln EUR w groszach) jest zbyt ciasny dla projektu 100 i więcej domów; `bigint` zamiast tego)
  - `proposedLeadTimeWeeks` integer, nullable
  - `notes` text, nullable
  - `status` (reużywa istniejący `offerStatusEnum`: `active`, `accepted`, `rejected`, `superseded`), wymagane, domyślnie `active`
  - `submittedAt`, `createdAt` timestamp
  - Unikalny częściowy indeks: najwyżej jedna wycena `status = active` na parę (producent, `project_request` lub `bulk_product_inquiry`), ten sam wzorzec co dzisiejsze `offer_active_per_inquiry_producer`
  - Drugi unikalny częściowy indeks: najwyżej jedna wycena `status = accepted` na samo zapytanie (`project_request` lub `bulk_product_inquiry`), niezależnie od producenta, żeby dwie równoległe akceptacje nie mogły obie się powieść (AC-9)

- **`producer_capacity_profile`** (rozszerzenie producenta jeden do jednego)
  - `producerId` uuid, PK i FK → `producer.id` (bez osobnego id, ścisłe rozszerzenie jeden do jednego)
  - `unitsPerMonth` integer, nullable
  - `productionLines` integer, nullable
  - `leadTimeTiers` jsonb, lista obiektów `{units, weeks}`, wymagane, domyślnie `[]`, walidowana schematem Zod (ten sam wzorzec co `technicalSpecs`, spec 0022)
  - `maxModuleSizeM2` real, nullable
  - `completionStandardsSupported` jsonb, lista wartości standardu, wymagane, domyślnie `[]`
  - `certifications` jsonb, lista tekstów, wymagane, domyślnie `[]`
  - `canCustomizeClientDesign` boolean, wymagane, domyślnie `false`
  - `customizationNote` text, nullable
  - `canHandleTransport` boolean, wymagane, domyślnie `false`
  - `canHandleAssembly` boolean, wymagane, domyślnie `false`
  - `capabilityNote` text, nullable
  - `pastProjectReferences` jsonb, lista tekstów, wymagane, domyślnie `[]`
  - `volumeVerificationStatus` (reużywa istniejący `producerVerificationStatusEnum`), wymagane, domyślnie `not_submitted`
  - `createdAt`, `updatedAt` timestamp
  - Rynki eksportu: reużywa istniejącą tabelę `producerDeliveryCountry`, bez nowej kolumny

- **Rozszerzenie istniejącej tabeli `client`**:
  - `nip` text, nullable
  - `companyName` text, nullable
  - `b2bVerificationStatus` (nowy `clientVerificationStatusEnum`: `not_submitted`, `pending`, `approved`, `rejected`), wymagane, domyślnie `not_submitted`

**State transitions**:
- `project_request.status` / `bulk_product_inquiry.status`: `open` → `quoted` (gdy przyjdzie pierwsza wycena) → `accepted` (gdy klient zaakceptuje jedną z wycen) lub `closed` (wycofane albo wygasłe)
- `project_quote.status`: `active` → `accepted` / `rejected` / `superseded` (nowa wycena tego producenta zastępuje poprzednią)
- `client.b2bVerificationStatus`: `not_submitted` → `pending` (po uzupełnieniu NIP i nazwy firmy) → `approved` / `rejected`
- `producer_capacity_profile.volumeVerificationStatus`: `not_submitted` → `pending` → `approved` / `rejected`

**API surface** (minimalna powierzchnia, którą ten spec wymaga do sprawdzenia modelu; pełne ekrany to przyszłe specyfikacje):

| Endpoint | Metoda | Kluczowe dane wejściowe | Kluczowe dane wyjściowe | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| /api/project-requests | POST | countryCode, unitCountMin, projectType, families, contactEmail (wymagane) | id, status | brak (publiczne) | 422 nieprawidłowe dane, 429 przekroczony limit (AC-10) |
| /api/bulk-product-inquiries | POST | productId, unitCountMin, deliveryCountryCode, contactEmail (wymagane) | id, status | brak (publiczne) | 404 produkt nieopublikowany, 429 przekroczony limit |
| /api/producer/capacity-profile | PUT | unitsPerMonth, leadTimeTiers, certifications, itd. | producerId, updatedAt | rola producent, właściciel | 401, 422 |
| /api/producer/quotes | POST | dokładnie jedno z projectRequestId/bulkProductInquiryId, totalPriceCents | id, status | rola producent, musi być powiązany (AC-3/AC-5) | 403 brak powiązania, 422 nieprawidłowe dane. Uwaga: druga wycena tego samego producenta na to samo zapytanie **nie** jest błędem, zastępuje poprzednią (poprzednia dostaje `superseded`), zwraca 201 |
| /api/producer/project-requests/:id | PATCH | status: `viewed` lub `declined` | projectRequestId, status | rola producent, musi mieć wiersz w project_request_target_producer (AC-2) | 403, 404 |
| /api/admin/producer-capacity-profile/:producerId/verify | PATCH | volumeVerificationStatus | producerId, volumeVerificationStatus | rola administrator | 401, 404 |
| /api/client/quotes/:id/accept | POST | brak | project_quote.status | rola klient, właściciel przez powiązany e mail | 403 b2bVerificationStatus nie jest `approved` (AC-9) |
| (wewnętrzny trigger, nie endpoint) po zapisaniu project_quote | — | brak | e mail z linkiem logującym na contactEmail zapytania (AC-11) | — (wyzwalane przez POST /api/producer/quotes) | dostarczenie e maila poza zakresem tego sprawdzenia |

**Key invariants**:
- Dokładnie jedno z `project_quote.projectRequestId` / `bulkProductInquiryId` jest ustawione (CHECK).
- Najwyżej jedna wycena `status = active` na parę (producent, zapytanie), niezależnie od typu zapytania; nowa wycena tego samego producenta zastępuje poprzednią (`superseded`), nie jest błędem.
- Najwyżej jedna wycena `status = accepted` na całe zapytanie (drugi częściowy unikalny indeks, niezależny od producenta); zaakceptowanie jednej automatycznie ustawia pozostałe aktywne wyceny tego zapytania na `rejected` w tej samej operacji (AC-9).
- `project_request_target_producer` istnieje tylko dla producentów, których `producer_capacity_profile.volumeVerificationStatus = approved` w chwili wysłania zapytania i którzy dostarczają do jego kraju (`producerDeliveryCountry`); brak dopasowanych producentów nie jest błędem, zapytanie zostaje `open` z zero powiązań.
- `clientId` na `project_request`/`bulk_product_inquiry` jest ustawiane wyłącznie przy logowaniu (dopasowanie po znormalizowanym e mailu), nigdy przy samym wysłaniu formularza; do tego czasu jedyny sposób inwestora na zobaczenie odpowiedzi to link logujący wysyłany przy każdej nowej wycenie (AC-11), nie samo zgadywanie że trzeba się zalogować.
- `contactEmail` jest zawsze zapisywany znormalizowany (małe litery, przycięty), żeby dopasowanie przy logowaniu (AC-7) i liczenie limitu (AC-10) nie ominęło wariantów wielkości liter tego samego adresu.
- Zaakceptowanie wyceny wymaga `client.b2bVerificationStatus = approved`; sam wgląd i odpowiadanie na wyceny nie wymaga tego statusu.
- Ten sam znormalizowany e mail nie może mieć więcej niż 3 jednocześnie nierozstrzygnięte (`open` lub `quoted`) wiersze `project_request`/`bulk_product_inquiry` łącznie; to sprawdzenie musi być egzekwowane atomowo (transakcja z blokadą albo unikalny licznik), nie samym odczytaniem liczby przed zapisem, inaczej równoległe zgłoszenia mogą ominąć limit (patrz Follow-up dla konkretnej techniki).
- `unitCountMin >= 10` na obu tabelach, `unitCountMax >= unitCountMin` gdy podane, każde okno "do" większe lub równe "od" gdy oba podane, `project_request.families` niepuste (wszystko jako CHECK w bazie, AC-12).
- Ktoś może zgłosić zapytanie pod cudzym adresem e mail; skutek jest ograniczony, bo zobaczyć odpowiedzi i tak może wyłącznie ten, kto kliknie link logujący wysłany na tę skrzynkę (AC-11) — prawdziwy właściciel adresu po zalogowaniu zobaczyłby nieswoje zapytanie i mógłby je zignorować/usunąć; jedyne realne ryzyko to zajęcie jednego z 3 slotów limitu (AC-10), złagodzenie tego (np. weryfikacja e maila przed policzeniem do limitu) zostaje w Follow-up.
- Powiązanie z realnym zamówieniem i realizacją (`order`/`order_stage_event`/`payment`) jest świadomie poza zakresem tej decyzji, patrz Follow-up.

**Security model**:
- Wysłanie `project_request` i `bulk_product_inquiry` jest publiczne, bez logowania; podstawa prawna przetwarzania danych kontaktowych to art. 6 ust. 1 lit. b RODO (czynności przed zawarciem umowy, podjęte na żądanie osoby, której dane dotyczą, bo to ona sama inicjuje kontakt prosząc o wycenę), patrz References. To obejmuje też udostępnienie danych kontaktowych (imię, e mail, telefon) dopasowanym producentom (`project_request_target_producer`): to nie jest osobny cel przetwarzania, tylko bezpośrednia, oczekiwana konsekwencja zgłoszenia, o które sama osoba poprosiła (bez tego udostępnienia zapytanie nie mogłoby zostać wycenione). Jasna informacja o tym udostępnieniu w treści formularza (kopia UI) to zadanie osobnego, przyszłego ekranu, nie tego spec, patrz Follow-up.
- Odczyt i odpowiadanie na własne zapytania i wyceny wymaga roli klienta i powiązania przez e mail (AC-7); zaakceptowanie wyceny dodatkowo wymaga `b2bVerificationStatus = approved` (AC-9).
- Złożenie i edycja `producer_capacity_profile` oraz złożenie wyceny wymaga roli producenta i własności (producent może edytować tylko swój profil, i może wycenić tylko zapytanie, do którego jest przypisany albo którego produkt jest jego).
- Ustawienie `volumeVerificationStatus` (producent) i `b2bVerificationStatus` (klient) wymaga roli administratora.
- To pierwsza funkcja platformy zbierająca dane osobowe (imię, e mail, telefon) od osoby bez konta; pełna polityka RODO i podstawy prawne dla całej platformy to wciąż otwarta, osobna decyzja (funkcja 5 epiki Produkcja, "RODO i zgodność prawna"), patrz Follow-up.

**Configuration required**: brak nowych zmiennych środowiskowych ani poświadczeń; ta decyzja rozszerza istniejące zaplecze Neon/Drizzle bez nowego dostawcy.

**Critical test scenarios**:
- Happy path: inwestor wysyła `project_request` na Holandię, dwóch zweryfikowanych producentów zostaje automatycznie powiązanych, obaj wysyłają wyceny (każda wywołuje e mail z linkiem logującym), klient klika link, widzi obie wyceny, uzupełnia NIP i firmę, czeka na zatwierdzenie, akceptuje jedną wycenę po zatwierdzeniu (druga automatycznie dostaje `rejected`), weryfikuje **AC-1, AC-2, AC-3, AC-7, AC-8, AC-9, AC-11**.
- Failure case: ten sam producent wysyła dwa żądania "złóż wycenę" na to samo zapytanie niemal jednocześnie (na przykład podwójne kliknięcie albo ponowienie po timeout sieci); dokładnie jedna wycena tego producenta kończy status `active`, druga go zastępuje (`superseded`), żadna z operacji się nie wywraca, weryfikuje **AC-3**. Osobno: dwie równoległe próby akceptacji różnych aktywnych wycen tego samego zapytania, tylko jedna faktycznie ustawia `accepted` dzięki unikalnemu indeksowi, druga dostaje jasny błąd zamiast cichego nadpisania, weryfikuje **AC-9**. Osobno: ten sam znormalizowany e mail próbuje wysłać czwarte nierozstrzygnięte zapytanie, zostaje odrzucone, weryfikuje **AC-10**.
- Auth/permission: producent bez wiersza w `project_request_target_producer` (i bez własnego produktu w `bulk_product_inquiry`) próbuje wysłać wycenę na cudze zapytanie, dostaje 403, weryfikuje **AC-3, AC-5**. Klient ze statusem `pending` próbuje zaakceptować wycenę, dostaje jasny błąd zamiast akceptacji, weryfikuje **AC-9**.

## Build plan

1. Migracja: nowe enumy (`bulk_request_status`, `target_producer_status`, `client_verification_status`; reużycie istniejących `offer_status` i `producer_verification_status`), nowe tabele `project_request`, `project_request_target_producer`, `bulk_product_inquiry`, `project_quote` (`bigint` na cenach, CHECK dokładnie jedno powiązanie, dwa częściowe unikalne indeksy: jedna `active` i jedna `accepted` wycena na zapytanie), `producer_capacity_profile`, wszystkie CHECK z AC-12 (progi liczby sztuk, kolejność okien dat, niepuste `families`), oraz rozszerzenie `client` o `nip`/`companyName`/`b2bVerificationStatus`, satisfies **AC-1, AC-4, AC-6, AC-8, AC-9, AC-12**
2. Schematy Zod dla pól jsonb (`leadTimeTiers`, `completionStandardsSupported`, `certifications`, `pastProjectReferences`, `families`), tym samym wzorcem co `lib/product-technical-specs.ts` (spec 0022), satisfies **AC-1, AC-6**
3. Funkcje zapisu: `submitProjectRequest`, `submitBulkProductInquiry` (obie normalizują `contactEmail` i egzekwują atomowo limit 3 nierozstrzygniętych zgłoszeń na e mail, AC-10), oraz `autoTargetProducers` (reguła wyszukania zweryfikowanych wolumenowo producentów dostarczających do danego kraju, AC-2), satisfies **AC-1, AC-2, AC-4, AC-10, AC-12**
4. Funkcje odpowiedzi: `submitProjectQuote` (współdzielona dla obu ścieżek, sprawdza powiązanie/własność producenta, zastępuje poprzednią aktywną wycenę tego producenta, wysyła e mail z linkiem logującym na `contactEmail`, AC-11), `markProjectRequestViewedOrDeclined` (producent), `acceptProjectQuote` (sprawdza `b2bVerificationStatus`, ustawia pozostałe aktywne wyceny tego zapytania na `rejected`), `linkRequestsToClientOnLogin` (dopasowanie po znormalizowanym e mailu przy logowaniu, AC-7), `setProducerVolumeVerification` i `setClientB2bVerification` (obie administracyjne), satisfies **AC-3, AC-5, AC-7, AC-8, AC-9, AC-11**
5. Testy: migracja i CHECK/oba unikalne indeksy, walidacja Zod, reguła limitu zgłoszeń pod równoległymi żądaniami, reguła dopasowania producentów, wysyłka e maila przy nowej wycenie, brama akceptacji wyceny po weryfikacji i jednoczesność dwóch akceptacji, satisfies wszystkie powyższe AC

## Consequences

**Positive**:
- Duże zamówienia dostają realny, trwały model danych zamiast być doklejone do dzisiejszego `inquiry`, który zakłada co innego (logowanie, 1 do 3 konkretnych produktów).
- Reużycie istniejących enumów (`offerStatusEnum`, `producerVerificationStatusEnum`, `completionStandardEnum`) i wzorców (jsonb plus Zod, CHECK na warianty, częściowy unikalny indeks aktywnej wyceny) trzyma nową część schematu spójną z resztą bazy zamiast wymyślać nowy styl.
- Zapytanie bez logowania obniża barierę wejścia dla klienta typu Lammert, dokładnie zgodnie z opisanym pomysłem.

**Negative / tradeoffs**:
- `project_quote` z dwoma opcjonalnymi kluczami obcymi (dokładnie jeden ustawiony) jest mniej czyste niż jedna, prosta relacja; to świadomy kompromis zamiast dublowania całej tabeli wyceny dla obu ścieżek (patrz rationale.md, Option 3).
- Dopóki funkcja 5 epiki Produkcja (RODO i zgodność prawna) nie jest zaprojektowana, ta funkcja zbiera dane osobowe bez formalnie spisanej, całościowej polityki retencji i usuwania; podstawa prawna jest tu jasna (art. 6 ust. 1 lit. b), ale proces usuwania na żądanie jeszcze nie istnieje dla tych konkretnie tabel.
- Reguła automatycznego dopasowania producentów (kraj plus status zweryfikowany) jest celowo prosta; nie jest to jeszcze prawdziwy silnik dopasowania (cena, certyfikat, termin), więc pierwsza wersja może wysłać zapytanie do producenta, który i tak go odrzuci.

**Neutral**:
- Rozszerzenie `client` o trzy nowe, nullable pola nie wpływa na dzisiejszych, zwykłych klientów detalicznych, dopóki nie wejdą w ścieżkę B2B.
- Zaakceptowanie wyceny świadomie NIE tworzy jeszcze prawdziwego zamówienia w `order`/`order_stage_event`; to zostaje zapisane jako otwarty follow up, nie cichy brak.

## Follow-up

- [ ] Ekrany wejściowe na stronie głównej ("10+ domów" dla inwestorów, "Zostań producentem B2B") to osobna, przyszła decyzja `/architect`, korzystająca z tego modelu danych.
- [ ] Wyświetlanie odznaki "Verified Volume Manufacturer" (jak dokładnie wygląda, jakie progi `unitsPerMonth` ją włączają poza samym `volumeVerificationStatus`) to osobna, przyszła decyzja.
- [ ] Prawdziwy silnik dopasowania producentów ("Request for Project": cena, moc produkcyjna, certyfikat, kraj, termin naraz) to najbardziej wartościowa, ale też najbardziej złożona przyszła decyzja; dzisiejsza reguła (AC-2) jest świadomie prosta i tymczasowa.
- [ ] Integracja zaakceptowanej wyceny z realnym potokiem zamówienia i realizacji (`order`, `order_stage_event`, `payment`) jest poza zakresem tej decyzji; duży projekt (dziesiątki domów, fazowana dostawa) prawdopodobnie potrzebuje własnego, dostosowanego modelu etapów, różnego od dzisiejszego pojedynczego domu.
- [ ] Pełna polityka RODO (retencja, usuwanie na żądanie, baner zgody) dla danych zbieranych bez logowania powinna zostać uwzględniona przy projektowaniu funkcji 5 epiki Produkcja ("RODO i zgodność prawna"), która i tak czeka na `/architect`.
- [ ] Wewnętrzny widok administratora dla `project_request` bez dopasowanych producentów (AC-2, kraj bez zweryfikowanego producenta) mógłby rozszerzyć istniejący widok `/internal/zapytania` (spec 0023) zamiast być nowym ekranem; do potwierdzenia przy projektowaniu tamtego ekranu.
- [ ] Mechanizm limitu zgłoszeń na e mail (AC-10) musi być egzekwowany atomowo (nie samym odczytaniem liczby przed zapisem); konkretna technika (transakcja z blokadą, unikalny licznik w bazie, zewnętrzna usługa rate limitingu) to szczegół implementacyjny do rozstrzygnięcia przy budowie.
- [ ] Utwardzenie przed nadużyciem cudzego adresu e mail: dziś każdy może wysłać zapytanie pod adresem, którego nie kontroluje (zajmuje jeden z 3 slotów limitu, AC-10, choć zobaczyć odpowiedź może wyłącznie prawdziwy właściciel skrzynki dzięki linkowi logującemu, AC-11). Rozważyć weryfikację e maila (kliknięcie potwierdzające) przed policzeniem zgłoszenia do limitu, przy projektowaniu ekranu formularza.
- [ ] Jasna informacja w treści formularza (kopia UI), że dane kontaktowe zostaną udostępnione dopasowanym, zweryfikowanym producentom: treść tej informacji to zadanie przyszłego ekranu (kafle i formularz), nie tego spec, patrz Security model.
