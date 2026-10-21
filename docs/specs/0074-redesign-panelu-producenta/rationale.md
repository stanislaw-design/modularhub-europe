# 0074. Redesign panelu producenta: uzasadnienie

## Context

Po zalogowaniu producent trafia na stronę "Konto", która pokazuje nazwę firmy, NIP, kraje dostawy, technologię i status weryfikacji. To dane, które producent sam wpisał, więc nie niosą żadnej informacji o tym, co dzieje się na platformie. Pozostałe zakładki są płaską listą siedmiu pozycji, która miesza trzy różne rzeczy: pracę na zleceniach (Zapytania, Zapytania o produkt, Tablica ogłoszeń, Moje wyceny), ofertę (Produkty, Profil zdolności) i dane firmy (Konto).

Dwie zakładki "Zapytania" i "Zapytania o produkt" łatwo pomylić, bo to dwa źródła leadów o różnym modelu: zapytania z listy porównań klienta (tabele `inquiry`, `offer`) i zapytania wolumenowe o produkt (`bulk_product_inquiry`, `project_quote`). "Tablica ogłoszeń" i "Moje wyceny" to jeden przepływ rozbity na dwa ekrany. Tablica jest dostępna wyłącznie dla producentów zatwierdzonych wolumenowo (spec 0070), a ogłoszenia są już dopasowane regułą profilu, więc filtr "pasujące do profilu" nic by nie zmieniał. Strona główna linkuje do czterech ekranów demo na danych przykładowych, które mają dziś swoje prawdziwe odpowiedniki gdzie indziej.

Na starcie wolumen jest mały, a producent zagląda do panelu z jednym z dwóch powodów: sprawdzić nowe ogłoszenia na tablicy albo dodać produkt. Prostota jest ważniejsza od gęstości informacji. Pomiar wyświetleń produktów jeszcze nie istnieje i wymaga osobnego kroku.

Brak decyzji oznacza, że producent dalej musi sam szukać, co wymaga reakcji, a niezatwierdzony wolumenowo producent nie dowiaduje się, że to właśnie profil zdolności blokuje mu tablicę.

## Options considered

### Option 1: Tylko zmiana nawigacji i nowa strona główna

Przestawiamy menu i budujemy pulpit, a listy zostają takie, jakie są (osobne zapytania, osobne wyceny, bez kolumny kompletności).

**Pros**:
- Najmniejszy diff, szybkie wdrożenie.
- Niskie ryzyko dla działających ekranów.

**Cons**:
- Dwie zakładki zapytań zostają, więc pulpit linkuje do dwóch miejsc na ten sam typ pracy.
- Producent dalej szuka braków w produktach ręcznie.
- Dane firmy nie mają docelowego miejsca z edycją.

### Option 2: Przebudowa na istniejących danych, trasa po trasie

Nowa nawigacja, pulpit, scalona lista zapytań, wspólny pasek zakładek tablicy i wycen, kolumna kompletności, Ustawienia firmy z edycją nazwy i technologii oraz usunięcie ekranów demo. Bez migracji, jeden ekran na krok.

**Pros**:
- Cały panel spójny wokół pytania "co jest do zrobienia".
- Brak zmian schematu, więc łatwy rollback.
- Każdy krok można wdrożyć osobno.

**Cons**:
- Większy zakres niż Option 1, dotyka wielu stron i testów e2e.
- Liczniki to dodatkowe zapytania przy każdym wejściu w panel.

### Option 3: Przebudowa ze zmianą schematu (śledzenie wizyt, telefon, scalona tabela zapytań)

To samo co Option 2, plus kolumna "ostatnia wizyta na tablicy" (liczba "nowych"), kolumna `producer.phone` i wspólna tabela zapytań dla obu źródeł.

**Pros**:
- Dokładniejsze "nowe od ostatniej wizyty".
- Jedna lista bez łączenia dwóch zapytań w kodzie.

**Cons**:
- Migracje i ryzyko na tabelach używanych przez przepływ wolumenowy.
- Wspólna tabela zapytań łączy dwa różne modele (oferta kontra wycena) i duplikuje logikę z spec 0070.
- Znacznie większy zakres przy małym wolumenie, bez wyraźnej korzyści.

## Rationale

Wybieramy Option 2. Option 1 zostawia największy problem z Context: producent nadal musi wiedzieć, że istnieją dwie listy zapytań i sam szukać braków. Option 3 rozwiązuje drobne niedokładności (liczba "nowych") kosztem migracji na tabelach przepływu z specu 0070, a przy małym wolumenie liczba ogłoszeń bez własnej wyceny odpowiada na to samo pytanie ("czy jest coś do zrobienia") i spada sama po złożeniu wyceny.

Scalamy listy w warstwie widoku, nie w danych, bo dwa źródła mają różne modele (oferta z decyzją klienta oraz wycena z wynikiem producenta). Wspólny mianownik to status z punktu widzenia producenta ("wymaga oferty", "decyzja klienta", "oferta wysłana", "zamknięte"), a szczegóły zostają na istniejących ekranach. Zakładki "Dostępne ogłoszenia" i "Moje wyceny" zostają osobnymi trasami połączonymi paskiem, bo scalenie stron zmieniłoby dwa działające ekrany, a zysk to jedno przejście mniej.

Weryfikację firmy z checklisty zastępuje weryfikacja wolumenowa, bo tylko ona ma prawdziwy przepływ (producent składa profil zdolności, administrator zatwierdza w `internal/producers/volume-verification`) i tylko ona faktycznie blokuje funkcję (tablicę). Stary status firmy nie ma żadnej akcji po stronie producenta ani administratora, więc zostawienie go dawałoby wiersz, na który nikt nie ma wpływu.

Edycja ogranicza się do nazwy i technologii, bo obie kolumny istnieją, a technologia jest nullable właśnie dlatego, że ekran edycji miał dopiero powstać (spec 0040). Kraje dostawy zostają w jednym miejscu, w Profilu zdolności, który zapisuje do `producer_delivery_country` i wpływa na dopasowanie do tablicy. Druga edycja tej samej tabeli z Ustawień groziłaby rozjazdem. Telefon wymaga nowej kolumny i decyzji, gdzie jest widoczny, a obowiązuje reguła zakazu kontaktu w opisie producenta, więc idzie do Follow-up.

Przełącznik krajów na tablicy jest domyślnie wyłączony (decyzja właściciela produktu): reguła dopasowania z specu 0070 nie traktuje kraju jako twardego kryterium, więc ukrycie ogłoszeń spoza krajów domyślnie mogłoby schować realne zlecenia. Dzięki komunikatowi o liczbie ukrytych producent widzi, co przełącznik robi.

Ekrany demo usuwamy w całości (decyzja właściciela produktu), razem z testami i specyfikacjami e2e, które sprawdzają tylko je. Ryzyko jest w testach e2e i komponentach współdzielonych z klientem, dlatego krok czyszczenia zaczyna się od sprawdzenia użycia każdego komponentu.

## Evidence

**Stan kodu (2026-10-20)**:
- `app/[locale]/producer/panel/page.tsx` renderuje dane konta, certyfikaty, przycisk "Zapytania i oferty" i blok "Materiały demonstracyjne" z trzema linkami (gotowość eksportowa, weryfikacja firmy, realizacje).
- `components/producent/ProducerPanelSidebar.tsx` ma siedem pozycji (konto, produkty, zapytania, tablica, zapytania o produkt, moje wyceny, profil zdolności) i kropkę nieobejrzanej decyzji przy "Zapytania".
- `app/[locale]/producer/panel/board/page.tsx` pokazuje tablicę tylko przy `getProducerVolumeVerificationStatus === "approved"`, inaczej komunikat z linkiem do `/capacity`.
- `getOpenProjectRequestsForBoard` zwraca wyłącznie ogłoszenia z `producerMatchesProjectRequestSql(producerId)`, z polem `deliversToCountry` (brak kraju nie ukrywa ogłoszenia, tylko włącza znacznik).
- `getInquiriesForProducer` czyta tylko zapytania w stanie `legacy_direct`. `getProductInquiriesForProducer` czyta `bulk_product_inquiry` z limitem 100, z `acceptingQuotes` i `ownQuoteStatus`.
- `getProjectQuotesForProducer` łączy wyceny z obu ścieżek (tablica i zapytanie o produkt), dlatego "Moje wyceny" pokrywa oba źródła.
- Administrator zatwierdza tylko weryfikację wolumenową (`app/[locale]/internal/producers/volume-verification/`). `producer.verification_status` jest wyłącznie wyświetlany (`internal/producers/page.tsx`, `lib/data/producers.ts` jako flaga `verified`).
- Producent nie ma kolumny telefonu. Kraje dostawy zapisuje formularz profilu zdolności (`lib/project-quote-actions.ts`, tabela `producer_delivery_country`).
- Klucze `ProducerPanelSidebar` i `ProducerPanelPage` istnieją w `pl`, `en`, `de` i `nl`.

**Decyzje właściciela produktu w tej sesji**: priorytet to prostota; układ makiety zachowany; znacznik tablicy to sama liczba; ekrany demo usuwamy z kodem i testami; zapytania scalamy; pomiar wyświetleń na później; liczba przy tablicy to otwarte ogłoszenia bez własnej wyceny; przełącznik krajów domyślnie wyłączony; checklista oparta o weryfikację wolumenową; kryteria kompletności: zdjęcia, cena, tłumaczenia, szkic; edycja nazwy i technologii, kraje tylko linkiem; źródłem projektu wizualnego jest zatwierdzona makieta.
