# 0077 Część A: projekt własny, oferty z wariantami i wybór

## Summary

Admin zakłada w panelu projekt, w którym zamawiającym jest sam ModularHub. Wskazani producenci widzą go na swojej tablicy z naszym wspólnym kontaktem i składają jedną lub kilka wycen (warianty). Admin widzi wszystkie oferty od razu w tabeli porównawczej, oznacza wybraną, a przyciskiem "Zakończ wybór i powiadom" zamyka projekt i wysyła do wszystkich producentów jeden neutralny mail.

## Requirements

**User stories**:
- Jako administrator ModularHub, chcę założyć własny projekt bez udawania klienta (bez zgody, B2B, publikacji podsumowania i limitu), żeby szybko zebrać oferty od wybranych producentów.
- Jako producent, chcę wiedzieć, że pyta ModularHub, widzieć jego kontakt od początku i móc złożyć kilka wariantów oferty (np. stan surowy i pod klucz).
- Jako administrator, chcę porównać wszystkie oferty obok siebie, wybrać najlepszą i zakończyć wybór jednym kliknięciem, wiedząc, że producenci dostaną neutralną informację.
- Jako producent, który przegrał, nie chcę dostać maila o odrzuceniu z cenami i nazwą zwycięzcy, tylko informację, że wybór został dokonany.

**Acceptance criteria**:

Zakładanie projektu:
- **AC-1**: Strona `/internal/large-orders/new-own` (tylko rola `admin`, ten sam wzorzec przekierowania co inne ekrany admina) pokazuje formularz projektu własnego. Z listy `/internal/large-orders` i ze strony `/internal/large-orders/new` jest do niej link. Formularz zawiera: nazwę projektu, kraj, opis lokalizacji, typ projektu, rodziny produktów, liczbę sztuk, metraż od i do, standard wykończenia, okna startu i dostawy, uwagi, planowane użytkowanie, termin składania ofert, odbiorców (patrz AC-7) i opcjonalne pliki. Nie ma w nim notatki o zgodzie klienta, wyboru języka klienta ani pól kontaktu klienta.
- **AC-2**: Nazwa projektu jest obowiązkowa (3 do 120 znaków po przycięciu). Liczba sztuk to liczba całkowita od 1, bez górnej granicy poza zdrowym rozsądkiem (do 10000), dla dowolnej rodziny (dom, sauna, kontener, outdoor TV, pojedynczy obiekt). Pozostałe pola walidowane jak w `submitProjectRequest`.
- **AC-3**: Zapis tworzy wiersz `project_request` z `is_platform_owned = true`, `client_id` pustym, `created_by_staff_user_id` ustawionym na admina, `staff_consent_note` pustym, `contact_locale = 'pl'` i danymi kontaktowymi (`contact_name`, `contact_email`, `contact_phone`) skopiowanymi w chwili zapisu ze zmiennych `PLATFORM_CONTACT_*`. Termin ofert (`deadline_at`) domyślnie teraz plus 14 dni, admin może wpisać inną przyszłą datę, nie dalszą niż za 90 dni. Zapis idzie przez `withAdminActor`.
- **AC-4**: Gdy któraś ze zmiennych `PLATFORM_CONTACT_NAME`, `PLATFORM_CONTACT_EMAIL`, `PLATFORM_CONTACT_PHONE` jest pusta, formularz pokazuje czytelny komunikat dla admina i nie zapisuje projektu. Adres e mail jest sprawdzany jako poprawny i normalizowany (małe litery, przycięty) przed zapisem.
- **AC-5**: Limit trzech aktywnych zapytań nie dotyczy projektów własnych: admin może mieć dowolnie wiele aktywnych (trigger w bazie pomija je przy wstawieniu i przy zliczaniu), a ich obecność nie zmienia limitu zwykłych klientów korzystających z adresu e mail zespołu.
- **AC-6**: Projekt własny nie uruchamia żadnej ścieżki klienta: nie wysyła maila do klienta (`notifyClientOfRequestReceived`, `notifyClientOfRequestOnBehalf` nie są wołane), nie tworzy rejestracji oczekującej klienta, nie wymaga zatwierdzenia B2B i nie przechodzi przez publikację podsumowania. Status `published` nie występuje dla projektu własnego. Akcje `reopenRequest`, `publishSummary`, `unpublishQuote`, `connectSelectionAsAdmin` oraz automatyczne `connectSelection` (zadanie godzinne, lista oczekujących na B2B) odrzucają projekt własny lub go pomijają w samej akcji, nie tylko w interfejsie. Publiczna akcja `requestPanelLoginLink` nie znajduje projektu własnego po adresie zespołu i nie wysyła zespołowi linku logowania klienta.
- **AC-7**: Odbiorców admin wybiera przez dowolną liczbę grup (gotowych po rodzinie i własnych, część B) oraz pojedynczych producentów. Wymagany jest co najmniej jeden producent po rozwinięciu. W chwili zapisu wybór rozwija się do wierszy `project_request_producer_override` z trybem `include` (zdjęcie stanu, późniejsza zmiana grupy nie rusza istniejących projektów). Producenci zablokowani lub usunięci są pomijani, a lista pominiętych jest pokazana adminowi po zapisie. Po założeniu admin może dodać lub wykluczyć producenta wyjątkiem, jak dziś.
- **AC-8**: Każdy rozwinięty producent dostaje dokładnie jeden mail o nowym projekcie (bez dubli, gdy jest w kilku grupach), w swoim języku komunikacji (część C), z tytułem projektu, krajem, liczbą sztuk, terminem i linkiem do szczegółu na tablicy. W mailu nie ma danych klienta, bo go nie ma, a ModularHub jest nazwany zamawiającym. Błąd wysyłki trafia do Sentry i nie cofa zapisu projektu.

Dopasowanie i widok producenta:
- **AC-9**: Dla projektu własnego producent pasuje wtedy i tylko wtedy, gdy ma wiersz `include`, nie jest usunięty i nie ma zablokowanego członka. Reguły mocy produkcyjnej, rodziny produktu i weryfikacji wolumenowej nie obowiązują. Wiersz `exclude` wyłącza producenta. Ta sama funkcja (`producerMatchesProjectRequestSql` i `doesProducerMatchProjectRequest`) steruje listą na tablicy, szczegółem, walidacją w `submitProjectQuote`, przypomnieniami i widokiem admina. Bramka weryfikacji wolumenowej leży dziś poza tą funkcją, więc trzeba ją obejść także w trzech miejscach: w `submitProjectQuote` (sprawdza `volumeVerificationStatus` osobno), w przekierowaniach obu stron tablicy producenta (`board/page.tsx`, `board/[id]/page.tsx`) oraz w `getProducerMatchesForAdmin`, który łączy `producer_capacity_profile` wewnętrznie i nie pokazuje producentów bez profilu. Dla projektu własnego producent bez profilu wolumenowego widzi tablicę i składa ofertę. Dla zapytań klientów wszystko działa dokładnie jak dziś.
- **AC-10**: Na tablicy producenta i w szczególe projekt własny pokazuje nazwę projektu, informację "Zamawiający: ModularHub" i wspólny kontakt (imię, e mail, telefon) od razu, bez czekania na `contact_revealed_at`. Dla zapytań klientów kontakt dalej jest ukryty do połączenia stron (spec 0070 AC-22).

Oferty z wariantami:
- **AC-11**: Formularz oferty dla projektu własnego ma obowiązkowe pole "Nazwa wariantu" (1 do 60 znaków po przycięciu), a resztę formatu oferty bez zmian (spec 0070 AC-11). Dla zapytań klientów pola wariantu nie ma i `variant_label` jest puste. Akcja odrzuca etykietę przy zapytaniu klienta i brak etykiety przy projekcie własnym.
- **AC-12**: Producent może mieć do pięciu aktywnych wariantów w jednym projekcie. Złożenie wariantu o tej samej nazwie (bez względu na wielkość liter i spacje na brzegach) zastępuje poprzednią wersję tego wariantu (stara oferta dostaje status `superseded`, nowa `active`, w jednym `db.batch`), a wariant o innej nazwie istnieje obok. Krok zastępowania w `submitProjectQuote` dziś zastępuje wszystkie aktywne oferty producenta, więc dla projektu własnego musi filtrować po znormalizowanej etykiecie (inaczej wariant B skasuje wariant A). Szósty wariant jest odrzucany z komunikatem, także przy dwóch równoległych zapisach (zabezpiecza to wyzwalacz w bazie, nie tylko kod), a błąd wyzwalacza (`P0001`) jest mapowany na ten komunikat, nie na ogólny błąd.
- **AC-13**: Dla zapytań klientów zasada "jedna aktywna oferta na producenta" działa bez zmian (indeks z pustą etykietą), a zachowanie ofert przy publikacji i wyborze klienta jest nietknięte.
- **AC-14**: Oferty projektu własnego są dostępne do `deadline_at`, dopóki projekt nie ma statusu `accepted` lub `closed`. Oznaczenie wybranej oferty przez admina (AC-16) nie blokuje składania kolejnych. Producent nie może złożyć oferty po terminie, po zakończeniu wyboru ani po zamknięciu projektu (warunki sprawdzane w SQL obu kroków zapisu, jak w spec 0070 AC-12).

Widok admina i wybór:
- **AC-15**: Szczegóły projektu własnego w adminie (`/internal/large-orders/[id]`) pokazują tabelę porównawczą wszystkich aktywnych ofert od razu po ich złożeniu, bez publikacji. Kolumna na ofertę: producent, wariant, tryb ceny (netto lub brutto) ze stawką VAT, cena łączna, cena za sztukę, waluta, zakres w cenie, zakres poza ceną, transport, montaż i dźwig, plan płatności, ważność oferty, gwarancja, termin produkcji, okno dostawy, notatki producenta, link do PDF i pole komentarza ModularHub (`advisor_note`, istniejąca akcja). Waluty nie są przeliczane, a cena brutto i netto jest jasno oznaczona. Oferty zastąpione nie są pokazywane.
- **AC-16**: Admin oznacza jedną ofertę jako wybraną akcją `selectPlatformQuote`, która zapisuje wyłącznie `platform_marked_quote_id` (nie `selected_quote_id`, bo ten blokuje oferty, przypomnienia i załączniki oraz uruchamia automatyczne łączenie), i może to zmienić dowolną liczbę razy do zakończenia wyboru. Oznaczenie nie wysyła maila, nie zmienia statusów ofert i nie wpływa na nic poza widokiem admina.
- **AC-17**: Akcja `finishPlatformSelection` ("Zakończ wybór i powiadom") wymaga oznaczonej oferty i potwierdzenia w oknie z liczbą producentów, którzy dostaną mail. W jednym `db.batch` ustawia wybraną ofertę na `accepted`, pozostałe aktywne oferty tego projektu na `rejected` i projekt na `accepted`. Akcja jest idempotentna (drugie kliknięcie nic nie zmienia i nie wysyła ponownie), nie wymaga zatwierdzenia B2B ani `contact_revealed_at`, i jest dozwolona także po minięciu terminu ofert. Dopiero tu ustawiane są `selected_quote_id` i `selected_at`. Po niej wyboru nie można zmienić. Nie woła `connectSelection` ani `notifyProducersOfOtherSelected` (to ścieżka klienta).
- **AC-18**: Po zakończeniu wyboru wychodzi jeden mail na producenta, który ma co najmniej jedną ofertę w projekcie (dowolny wariant), z identycznym, neutralnym tekstem: tytuł projektu, informacja, że wybór został dokonany, podziękowanie, informacja, że ModularHub wróci z dalszymi krokami. Mail nie zawiera nazwy wybranego producenta, cen, powodu ani informacji, czy dany producent wygrał. Jest w języku komunikacji producenta (część C), logowany w `project_notification_log` (nigdy dwa razy) i wysyłany na zasadzie "najlepszy wysiłek": błąd trafia do Sentry i nie cofa zakończenia wyboru. Po zakończeniu admin widzi listę producentów, do których mail został zakolejkowany. Licznik udanych wysyłek jest w Follow-up, bo wpis w `project_notification_log` powstaje przed wysyłką.

Widok producenta po wyborze:
- **AC-19**: W panelu producenta oferta wybrana ma etykietę "Wybrana" (bez zobowiązań), a pozostałe oferty i projekt pokazują neutralne "Wybór zakończony", bez słów "odrzucona" lub "przegrana". Sterowanie wynikiem (`QuoteOutcomeControl`: podpisano, brak porozumienia, wycofano) jest ukryte dla projektów własnych, bo ModularHub nie jest stroną umowy.
- **AC-20**: Projekt własny zamknięty bez wyboru (`closeRequest`, powód `staff_closed`, `no_offers` lub `expired`) wysyła producentom z ofertą istniejący mail o zamknięciu, w ich języku. Wznowienie zamkniętego projektu własnego przez admina jest poza zakresem (zakłada się nowy projekt).

Spójność i bezpieczeństwo:
- **AC-21**: Projekt własny nigdy nie dostaje `client_id` z dopasowania e maila. Filtr `NOT is_platform_owned` jest w `linkRequestsToClientOnLogin` (wołanej przy logowaniu oraz z `cancelRequest` i `reopenRequest`), więc osoba z kontem o adresie zespołu nie "przejmuje" projektu jako klient. Ten sam filtr jest w publicznej akcji `requestPanelLoginLink` (AC-6).
- **AC-22**: Lista `/internal/large-orders` oznacza projekty własne znacznikiem "Własny", ma filtr rodzaju (własne i klientów) i pokazuje nazwę projektu. Zapisy admina na projekcie, ofertach i wyjątkach są w dzienniku audytu z autorem. Admin dodaje pliki do projektu własnego istniejącym przepływem załączników (spec 0070 część D), bez pola zgody "w plikach nie ma moich danych kontaktowych" (kontakt jest naszym własnym), a producenci widzą je według istniejących reguł widoczności dla dopasowanych.
- **AC-44**: W szczególe projektu własnego producent widzi listę swoich aktywnych wariantów (nazwa, cena łączna, data złożenia), może wybrać wariant do poprawienia (formularz wypełnia się danymi wariantu) i może wycofać wariant akcją `withdrawProjectQuoteVariant` (oferta dostaje status `superseded`, bez zmiany typu w bazie). Bez wycofania producent z pięcioma wariantami nie mógłby dodać lepszej oferty. Wycofanie jest niemożliwe po zakończeniu wyboru lub zamknięciu projektu. Wycofany wariant znika z tabeli admina, a jeśli był oznaczony (`platform_marked_quote_id`), oznaczenie jest czyszczone.
- **AC-45**: `finishPlatformSelection` używa tej samej blokady doradczej (`pg_advisory_xact_lock` na identyfikatorze projektu) co składanie ofert, a kroki 2 i 3 jej partii zależą od kroku 1 (wzorzec `EXISTS` jak w `connectSelection`). Gdy oznaczona oferta przestała być aktywna (producent zastąpił lub wycofał wariant), akcja zwraca komunikat "oznaczenie nieaktualne" i niczego nie zmienia, a admin oznacza ofertę ponownie. Oferta złożona w tej samej chwili nie może zostać `active` po zakończeniu wyboru.

## Decision

Patrz [index.md](index.md#decision). Ta część realizuje wybór opcji 1 (flaga na istniejących tabelach).

## Feature design

**Data model sketch**: zmiany `project_request` i `project_quote` w [index.md](index.md#cross-part-contract). W tej części nie ma własnych tabel.

**State transitions** (projekt własny):
- `open` → `quoted` (pierwsza oferta) → `accepted` (zakończenie wyboru, które dopiero ustawia `selected_quote_id`).
- Z dowolnego stanu poza `accepted` i `closed` → `closed` (`closeRequest`, powód z istniejącej listy).
- `published` nie występuje. Oznaczenie wybranej oferty (`platform_marked_quote_id`) nie zmienia statusu ani nie dotyka `selected_quote_id`.
- Oferta: `active` → `superseded` (nowa wersja tego samego wariantu), `active` → `accepted` lub `rejected` (zakończenie wyboru).

**API surface** (akcje serwerowe, wszystkie nowe w `lib/platform-project-actions.ts`, plus zmiany w istniejących):

| Akcja | Kto | Wejście | Wynik | Główne błędy |
|---|---|---|---|---|
| `createPlatformProject` | admin | pola z AC-1, odbiorcy, pliki | id projektu, lista pominiętych producentów | brak konfiguracji kontaktu, zero odbiorców, walidacja |
| `submitProjectQuote` (zmiana) | producent | format oferty, `variantLabel` | id oferty | wariant wymagany lub zakazany, szósty wariant, termin minął, projekt zakończony, brak dopasowania |
| `selectPlatformQuote` | admin | `requestId`, `quoteId` | ok | oferta nie należy do projektu, nie jest aktywna, projekt zakończony |
| `withdrawProjectQuoteVariant` | producent | `quoteId` | ok | nie jego oferta, projekt zakończony lub zamknięty, oferta nie jest aktywna |
| `finishPlatformSelection` | admin | `requestId`, potwierdzenie | liczba wysłanych i nieudanych maili | brak wybranej oferty, już zakończony |
| `producerMatchesProjectRequestSql` (zmiana) | wewnętrzna | projekt, producent | pasuje lub nie | dwie ścieżki: klient (reguły) i własny (`include`) |

Istniejące akcje wykorzystywane bez zmian: `setProducerOverride`, `extendDeadline`, `closeRequest`, `setAdvisorNote`, akcje załączników. Wszystkie zapisy admina przez `withAdminActor`.

**Key invariants**:
- Projekt własny: `title` niepusty, `client_id` pusty, `status` nigdy `published`, kontakt zawsze ze zmiennych konfiguracji w chwili założenia.
- Etykieta wariantu jest wymagana wtedy i tylko wtedy, gdy projekt jest własny (akcja plus warunek w SQL wstawienia).
- Co najwyżej pięć aktywnych ofert jednego producenta w projekcie własnym (wyzwalacz w bazie), co najwyżej jedna aktywna oferta na (projekt, producent, znormalizowana etykieta).
- Co najwyżej jedna oferta `accepted` na projekt (istniejący indeks `project_quote_accepted_per_request`).
- Po `accepted` lub `closed` nowe oferty i zmiana wyboru są odrzucane w SQL.
- Zakończenie wyboru i składanie ofert wykluczają się wzajemnie przez wspólną blokadę `pg_advisory_xact_lock` na identyfikatorze projektu w obu partiach `db.batch`.
- Mail końcowy: najwyżej jeden na producenta i projekt (`project_notification_log`).

**Security model**: tworzenie, wybór i zakończenie tylko dla roli `admin` (sprawdzane w akcji, nie tylko w UI). Producent widzi tylko projekty, do których ma wiersz `include`, i tylko własne oferty. Producent nigdy nie widzi cudzych ofert, liczby ofert ani tego, kto wygrał (neutralny tekst, AC-18 i AC-19). Dane osobowe: kontakt ModularHub jest danymi firmowymi, nie osobowymi klienta. Nie ma tu danych klienta, więc zakres RODO nie rośnie, ale e mail do producentów to nadal wiadomość transakcyjna z istniejącym nadawcą.

**Configuration required**:
- `PLATFORM_CONTACT_NAME`, `PLATFORM_CONTACT_EMAIL`, `PLATFORM_CONTACT_PHONE` (patrz [index.md](index.md#cross-part-contract)).

**Critical test scenarios**:
- Happy path: admin zakłada projekt z jednym producentem, producent składa dwa warianty, admin widzi je w tabeli, oznacza jeden, kończy wybór, producent dostaje mail i widzi "Wybrana", verifies **AC-1**, **AC-3**, **AC-8**, **AC-11**, **AC-15** do **AC-19**.
- Limit i próg: admin zakłada czwarty aktywny projekt własny i projekt na 1 sztukę, a zwykły klient nadal dostaje błąd po trzech zapytaniach i błąd przy 2 domach, verifies **AC-2**, **AC-5**.
- Warianty: ten sam wariant (inna wielkość liter) zastępuje poprzedni, szósty jest odrzucany także przy dwóch równoległych zapisach, oferta klienta z etykietą jest odrzucona, wariant B nie zastępuje wariantu A, producent z pięcioma wariantami wycofuje jeden i dodaje nowy, verifies **AC-11** do **AC-13**, **AC-44**.
- Oznaczenie i wyścig: oznaczenie oferty nie blokuje składania kolejnych ani przypomnień, zakończenie wyboru po zastąpieniu oznaczonego wariantu zwraca "oznaczenie nieaktualne", oferta złożona równolegle do zakończenia nie zostaje aktywna, verifies **AC-16**, **AC-45**.
- Dopasowanie: producent bez weryfikacji wolumenowej, ale z wierszem `include`, składa ofertę; producent bez wiersza dostaje odmowę; producent z `exclude` znika z listy; to samo dla zapytania klienta jak przed zmianą, verifies **AC-9**.
- Kontakt: tablica pokazuje kontakt ModularHub od razu dla projektu własnego, a dla zapytania klienta dalej go ukrywa, verifies **AC-10**.
- Zakończenie: drugie kliknięcie "Zakończ" nie wysyła maili ponownie, po zakończeniu nowa oferta i zmiana wyboru są odrzucone, producent z dwoma wariantami dostaje jeden mail, treść maila nie zawiera nazwy zwycięzcy ani ceny, verifies **AC-14**, **AC-17**, **AC-18**.
- Brak konfiguracji kontaktu blokuje założenie projektu, verifies **AC-4**.
- Przypisanie klienta: logowanie osoby z adresem zespołu nie ustawia `client_id` na projekcie własnym, verifies **AC-21**.
- Uprawnienia: producent i klient są przekierowani z `/internal/large-orders/new-own`, akcje admina odrzucają wywołanie bez roli, verifies **AC-1**, **AC-16**, **AC-17**.
- Tłumaczenia: teksty producenta (formularz wariantu, etykiety "Wybrana" i "Wybór zakończony", maile) mają prawdziwe wartości w czterech językach i nie zawierają słów "odrzucona" ani "przegrana", verifies **AC-18**, **AC-19**.

## Build plan

Migracja i konfiguracja to zadania 1 i 2 z [index.md](index.md#build-plan). Dalej wątek Tracer Bullet:

1. Funkcja dopasowania z dwiema ścieżkami (`producerMatchesProjectRequestSql`, `doesProducerMatchProjectRequest`), obejście bramki weryfikacji wolumenowej w `submitProjectQuote`, na obu stronach tablicy producenta i w `getProducerMatchesForAdmin`, oraz test regresji klienta, satisfies **AC-9**
2. Akcja `createPlatformProject`, odczyt konfiguracji kontaktu i formularz `/internal/large-orders/new-own` z odbiorcami wskazywanymi na razie pojedynczo (grupy w części B), satisfies **AC-1** do **AC-4**, **AC-6**, **AC-7**
3. Pominięcie projektów własnych w limicie zapytań (trigger), w `linkRequestsToClientOnLogin`, w `requestPanelLoginLink` oraz w akcjach ścieżki klienta (`reopenRequest`, `publishSummary`, `unpublishQuote`, łączenie i zadanie godzinne), satisfies **AC-5**, **AC-6**, **AC-21**
4. Mail do producentów o nowym projekcie własnym (w pl, język producenta dochodzi w części C), satisfies **AC-8**
5. Widok producenta: tablica i szczegół z kontaktem ModularHub, pole nazwy wariantu w `QuoteForm`, satisfies **AC-10**, **AC-11**
6. Zmiana `submitProjectQuote`: warianty, normalizacja, filtr zastępowania po etykiecie, mapowanie błędu limitu pięciu, warunki terminu i zakończenia w SQL; lista wariantów producenta i `withdrawProjectQuoteVariant`, satisfies **AC-11** do **AC-14**, **AC-44**
7. Widok admina: tabela porównawcza w `/internal/large-orders/[id]`, `selectPlatformQuote` (zapis `platform_marked_quote_id`), satisfies **AC-15**, **AC-16**
8. Akcja `finishPlatformSelection` (blokada doradcza, zależne kroki partii, komunikat o nieaktualnym oznaczeniu), mail końcowy, wpis w `project_notification_log`, lista zakolejkowanych maili, satisfies **AC-17**, **AC-18**, **AC-45**
9. Widok producenta po wyborze ("Wybrana", "Wybór zakończony", ukrycie sterowania wynikiem), mail o zamknięciu bez wyboru, satisfies **AC-19**, **AC-20**
10. Lista admina: znacznik, filtr rodzaju, nazwa; pliki bez zgody kontaktowej; audyt, satisfies **AC-22**
11. Testy: jednostkowe (dopasowanie, normalizacja wariantu, limit, zakończenie), komponentów (formularz oferty, tabela porównawcza), integracyjne na bazie dev (indeks, wyzwalacze) i E2E (wątek z "Critical test scenarios"), tłumaczenia, satisfies **AC-1** do **AC-22**, **AC-44**, **AC-45**

## Consequences

**Positive**:
- Admin zbiera i porównuje oferty od razu, bez udawania klienta.
- Producent składa warianty w znanym formacie oferty.

**Negative / tradeoffs**:
- Pięć miejsc z rozgałęzieniem "projekt własny" (dopasowanie, kontakt, indeks, limit, przypisanie klienta) zwiększa koszt każdej przyszłej zmiany przetargu.
- Wymiana indeksu ofert dotyka ścieżki klientów (test regresji obowiązkowy).
- Producent, który przegrał, nie dowie się jawnie, że przegrał (tylko "Wybór zakończony"), co jest zamierzone, ale może zostać zauważone jako brak informacji.

**Neutral**:
- Przypomnienia o terminie (3 dni, 1 dzień, dzień terminu) działają dla projektów własnych bez zmian, bo korzystają z funkcji dopasowania.

## Follow-up

- [ ] Sprawdzić przy budowie, czy zablokowane konto rzeczywiście nie może się logować (dotyczy części D), oraz czy `requestLogin` nie nadpisuje oczekującego zaproszenia admina.
- [ ] Zdecydować później, czy projekt własny ma mieć wznowienie (dziś nowy projekt).
- [ ] Osobne maile dla zwycięzcy i pozostałych (wspólny Follow-up z [index.md](index.md#follow-up)).
