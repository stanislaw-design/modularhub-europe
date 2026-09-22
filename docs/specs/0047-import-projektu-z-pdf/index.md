# 0047. Import projektu domu z PDF przez bezpiecznego asystenta AI

**Status**: Superseded by [0050](../0050-uproszczone-dodawanie-projektu-domu/index.md)
**Data**: 2026-09-19  
**Tryb**: FEATURE  
**Zakres**: panel producenta, kreator projektu, przetwarzanie asynchroniczne, Azure, prywatne przechowywanie dokumentów

## Summary

Producent może rozpocząć tworzenie projektu domu od jednego lub kilku dokumentów ofertowych PDF. System tworzy szkic produktu, analizuje dokumenty w tle, proponuje możliwie kompletne wartości w istniejącym kreatorze i pokazuje przy każdej propozycji jej pochodzenie, wiarygodność oraz dowód. Producent może każdą wartość zmienić, odrzucić lub zaakceptować. Zastosowanie zatwierdzonych danych aktualizuje wyłącznie szkic. Nigdy nie publikuje projektu automatycznie.

Rozwiązanie ma być wąskim, kontrolowanym procesem importu danych, a nie swobodnym agentem konwersacyjnym. Model nie otrzymuje narzędzi, dostępu do internetu ani możliwości wykonywania instrukcji znalezionych w dokumencie.

## Kontekst

Obecny kreator producenta ma sześć kroków i działa na prawdziwym zapleczu. Obejmuje dane podstawowe i układ pomieszczeń, zdjęcia i rzuty, warianty i cennik, dane techniczne i logistykę, FAQ oraz podsumowanie. Ten spec dodaje alternatywny początek procesu dla rodziny `dom`, ale nie zastępuje ręcznego wprowadzania danych.

Pierwsza wersja przyjmuje do pięciu dokumentów PDF na sesję, maksymalnie 25 MB na plik i 200 stron łącznie. Obsługuje dokumenty tekstowe oraz skany, a językami wejściowymi i docelowymi są polski, angielski, niemiecki i niderlandzki.

Określenie „w pełni bezpieczny” nie jest technicznie osiągalną gwarancją. Projekt ogranicza ryzyko przez separację uprawnień, prywatne przechowywanie, kontrolę człowieka, niezmienną historię, walidację i minimalizację danych. Szczególnie ważne ograniczenie dotyczy skanów: nie da się niezawodnie wykryć danych osobowych widocznych wyłącznie na obrazie przed wykonaniem OCR. Dlatego dokumenty muszą być oznaczone przez producenta jako niezawierające danych osobowych ani sekretów, a przypadkowe dane są przetwarzane w regionie europejskim na warunkach procesora danych. Wymóg absolutnego blokowania takich treści przed wysłaniem do Azure wymagałby dodatkowego lokalnego OCR i pozostaje osobną decyzją.

## Historie użytkownika

1. Jako producent chcę wybrać „Uzupełnij z PDF”, wgrać ofertę projektu domu i wrócić później do gotowego wyniku, żebym nie przepisywał ręcznie całej dokumentacji.
2. Jako producent chcę widzieć źródło, stronę, fragment i poziom pewności każdej wartości, żebym mógł szybko ocenić poprawność propozycji.
3. Jako producent chcę rozstrzygać konflikty, poprawiać propozycje i zachować swoje ręczne zmiany, żebym zawsze miał ostateczną kontrolę nad danymi produktu.
4. Jako producent chcę otrzymać propozycje opisu, FAQ i tłumaczeń, ale bez wymyślonych cen, parametrów technicznych, certyfikatów lub warunków handlowych.
5. Jako pracownik wsparcia chcę za zgodą organizacyjną odczytać stan sesji i dokument źródłowy z pełnym śladem audytowym, żebym mógł pomóc w diagnozie bez ukrytego dostępu.

## Requirements

### AC-1. Wejście i szkic produktu

Producent wybiera ręczne tworzenie albo „Uzupełnij z PDF”. Druga opcja od razu tworzy szkic produktu rodziny `dom` i przypina do niego nową sesję analizy. Import nie jest dostępny dla pozostałych rodzin produktów.

### AC-2. Limity dokumentów

Jedna sesja przyjmuje od jednego do pięciu plików PDF, maksymalnie 25 MB na plik i 200 stron łącznie. Ten sam skrót SHA 256 nie może wystąpić dwa razy w jednej sesji. Ten sam dokument może zostać świadomie użyty w kolejnej sesji ponownej analizy.

### AC-3. Walidacja przed przetwarzaniem

Serwer sprawdza rozszerzenie, magic bytes, rzeczywisty typ, rozmiar, liczbę stron, szyfrowanie, ochronę hasłem, złośliwe oprogramowanie oraz ryzyko bomby dekompresyjnej. Plik podejrzany, zaszyfrowany albo chroniony hasłem zostaje odrzucony. Wykryty w warstwie tekstowej sekret lub prawdopodobne dane osobowe blokują wysłanie do Document Intelligence i Azure OpenAI oraz wymagają od producenta usunięcia treści.

### AC-4. Przetwarzanie asynchroniczne

Analiza działa po zamknięciu przeglądarki. Kreator jest zablokowany do edycji podczas aktywnej analizy i pokazuje etap oraz postęp. Typowy wynik powinien być gotowy w czasie do pięciu minut. Po piętnastu minutach interfejs pokazuje ostrzeżenie. Po wyczerpaniu prób w czasie około trzydziestu minut zadanie trafia do kolejki błędów i może zostać ręcznie ponowione.

### AC-5. Zakres ekstrakcji

System próbuje uzupełnić wszystkie pola obecnego kreatora właściwe dla domu, jeżeli dokument dostarcza wystarczającej podstawy. Pierwsza wersja nie wycina i nie importuje zdjęć, wizualizacji ani rzutów z PDF. Dane znalezione poza znanym schematem trafiają do sekcji „Dodatkowe informacje znalezione w dokumencie” i nie są automatycznie wpisywane do produktu.

Dla ceny wariantu system bierze wyłącznie kwotę netto. Kwotę i walutę źródłową zachowuje w danych kandydata, a wartość produktu przelicza na EUR według najnowszego opublikowanego kursu referencyjnego EBC dostępnego w chwili normalizacji. Kurs, data kursu, czas pobrania, para walutowa i reguła zaokrąglenia są zapisywane razem z kandydatem. System nie zapisuje kwoty brutto i nie traktuje jej jako górnej granicy ceny. `priceMaxCents` pozostaje puste, jeżeli dokument nie podaje rzeczywistej maksymalnej ceny netto.

Kurs EBC oznacza liczbę jednostek waluty źródłowej za 1 EUR. Worker oblicza `kwota EUR = kwota źródłowa / kurs`, używa arytmetyki dziesiętnej i zaokrągla wynik do najbliższego eurocenta metodą half up dopiero po wykonaniu dzielenia. Dla ceny podanej w EUR kurs wynosi 1 i nie jest wykonywane zapytanie zewnętrzne. W weekendy, święta i przed publikacją bieżącego kursu używany jest najnowszy kurs EBC nie starszy niż siedem dni kalendarzowych. Brak obsługiwanej waluty albo odpowiednio świeżego kursu tworzy problem `FX_RATE_UNAVAILABLE` i blokuje automatyczne zastosowanie tej ceny. Producent widzi kwotę źródłową, datę kursu oraz przeliczoną cenę i może poprawić cenę w EUR przed zastosowaniem.

### AC-6. Zasady tworzenia treści

System może zaproponować opis, pytania i odpowiedzi FAQ oraz tłumaczenia na polski, angielski, niemiecki i niderlandzki. Dla tekstu obcojęzycznego najpierw tworzy polską wartość kanoniczną powiązaną z oryginałem. Tłumaczenia EN, DE i NL powstają dopiero po zaakceptowaniu lub ręcznej korekcie wartości polskiej. System nie może wymyślać parametrów technicznych, cen, zakresów handlowych, certyfikatów ani warunków gwarancji. Wartość wydedukowana jest dozwolona tylko wtedy, gdy można wskazać przesłanki i zostaje jawnie oznaczona jako dedukcja.

### AC-7. Pochodzenie wartości

Każdy kandydat ma jedno z pochodzeń: `extracted`, `inferred`, `generated`, `translated`. Wartości wyodrębnione i wydedukowane pokazują dokument, numer strony i krótki fragment. Treści wygenerowane pokazują dokumenty kontekstowe, ale nie otrzymują fikcyjnego numeru strony ani cytatu. Tłumaczenie wskazuje źródłowego kandydata. Każde pole encji powtarzalnej zachowuje `entity_key`. Pole rekordu zależnego, na przykład pozycji kosztowej lub etapu harmonogramu, zachowuje także `parent_entity_key` wariantu nadrzędnego. Oba klucze są przenoszone bez zmiany przez kandydatów, snapshoty, decyzje i żądania tłumaczeń.

### AC-8. Poziom pewności

Interfejs pokazuje poziom wysoki, średni albo niski. Poziom wynika z jakości OCR, jednoznaczności dowodu, zgodności między dokumentami i walidacji dziedzinowej. Nie jest surową oceną procentową zadeklarowaną przez model. Każda wartość o niskiej pewności wymaga jawnego przeglądu przed zastosowaniem sesji.

### AC-9. Braki, niejednoznaczności i konflikty

Brak wartości pozostawia pole puste i oznacza „Nie znaleziono”. Niejednoznaczna wartość otrzymuje status wymagający rozstrzygnięcia. Przy konflikcie system zachowuje wszystkich kandydatów wraz z dowodami. Producent wybiera jednego, wpisuje wartość ręcznie albo odrzuca wszystkich.

### AC-10. Błędy częściowe

Jeżeli jeden dokument lub wybrane strony są nieczytelne, analiza pozostałych dokumentów trwa dalej. Interfejs pokazuje numery stron oraz bezpieczny powód błędu. System nie dedukuje wartości z nieodczytanej treści. Zastosowanie wyniku jest zablokowane, dopóki producent nie potwierdzi świadomości brakującego dokumentu lub nie zastąpi go poprawnym plikiem.

### AC-11. Przegląd w kreatorze

Wszystkie propozycje pojawiają się bezpośrednio w aktualnym kreatorze jako edytowalne wartości z czytelną etykietą pochodzenia. Panel boczny pokazuje kandydatów i dowody dla aktywnego pola. Decyzje akceptacji, odrzucenia oraz ręcznej zmiany zapisują się automatycznie. Interfejs spełnia WCAG 2.2 AA, działa klawiaturą i nie opiera znaczenia wyłącznie na kolorze.

### AC-12. Bramka zastosowania

Przycisk zastosowania wyniku jest aktywny dopiero po rozstrzygnięciu wszystkich konfliktów, przejrzeniu wszystkich wartości o niskiej pewności i potwierdzeniu wszystkich błędów częściowych. Puste pola są dozwolone w szkicu.

### AC-13. Atomowe zastosowanie

Zastosowanie zatwierdzonych wartości odbywa się w jednej transakcji bazodanowej. Całość zostaje zapisana albo nie zostaje zapisana nic. Operacja aktualizuje tylko szkic produktu i nie wywołuje publikacji. Istniejące reguły gotowości do publikacji pozostają niezależne. Funkcja najpierw tworzy mapę `entity_key` wariantu na docelowy UUID, a potem zapisuje rekordy zależne i tłumaczenia przez ich `parent_entity_key`. Brak, niejednoznaczność lub wskazanie rodzica z innej sesji przerywa całą operację.

### AC-14. Ponowna analiza

Ponowne uruchomienie tworzy nową, niezmienną sesję i pozwala wybrać dokumenty. Poprzednia sesja, kandydaci, dowody i decyzje pozostają w historii. Ręczne wartości wpisane wcześniej przez producenta nie są nadpisywane bez nowej, jawnej decyzji.

### AC-15. Anulowanie i wznowienie

Sesja oczekująca może zostać anulowana od razu. Dla sesji przetwarzanej zapisuje się `cancel_requested`, a worker kończy pracę na najbliższej granicy etapu. Zamknięcie przeglądarki nie anuluje pracy. Po powrocie producent widzi aktualny stan bez wiadomości email.

### AC-16. Tożsamość i izolacja

Wszystkie operacje wyprowadzają `producerId` z sesji Auth.js i sprawdzają pełny łańcuch własności do produktu. Identyfikator z przeglądarki nigdy nie stanowi dowodu własności. Producent nie może poznać istnienia ani stanu sesji innego producenta.

### AC-17. Dostęp wsparcia

Uprawniony administrator wsparcia może odczytać sesję i dokument wyłącznie przez chronioną ścieżkę serwerową po utworzeniu jednokrotnego grantu z uzasadnieniem. Każdy taki dostęp zapisuje osobę, czas, zasób, cel i wynik operacji w audycie. PDF nie ma publicznego adresu ani podpisanego adresu GET przekazywanego do przeglądarki. Odpowiedź ma `Cache-Control: private, no-store`.

### AC-18. Prywatne przechowywanie

Źródłowe PDF trafiają do osobnego, prywatnego bucketa Cloudflare R2 w jurysdykcji europejskiej. Bucket używany do publicznych zdjęć produktu nie może być użyty do dokumentów źródłowych. Poświadczenia mają minimalne uprawnienia do pojedynczego bucketa i podlegają rotacji.

### AC-19. Granica Azure

Każda strona przechodzi przez Azure AI Document Intelligence Layout. Uporządkowana treść trafia do przypiętego wdrożenia Azure OpenAI GPT 5 mini w trybie Data Zone Standard w Unii Europejskiej. Worker korzysta z zarządzanej tożsamości, Key Vault i prywatnych punktów końcowych dla usług Azure. Brak automatycznego przełączenia na innego dostawcę.

### AC-20. Odporność na treść dokumentu

PDF jest niezaufanym wejściem. Polecenia, adresy URL i próby zmiany zasad znalezione w dokumencie są traktowane wyłącznie jako dane. Model nie ma narzędzi, nie wykonuje kodu i zwraca wynik wyłącznie w ścisłym schemacie JSON. Wynik przechodzi walidację Zod. Po jednej nieudanej próbie naprawy formatu sesja kończy się kontrolowanym błędem, bez częściowego zapisu niezwalidowanych danych.

### AC-21. Idempotencja i uprawnienia workera

Kolejka może dostarczyć komunikat więcej niż raz, ale identyfikator sesji i etap przetwarzania zapobiegają podwójnym kandydatom oraz podwójnemu zastosowaniu. Osobna rola bazy danych workera może zapisywać tylko tabele importu AI i wywoływać jawnie dozwolone funkcje. Nie może bezpośrednio aktualizować tabel produktu.

### AC-22. Prywatność logów

Logi aplikacji, Sentry i PostHog zawierają wyłącznie identyfikatory techniczne, etap, czas trwania, rozmiary, liczbę stron, zużycie tokenów i bezpieczne kody błędów. Nie zawierają nazwy pliku, tekstu PDF, fragmentów dowodowych, wartości pól ani surowej odpowiedzi modelu. Surowa odpowiedź dostawcy nie jest przechowywana.

### AC-23. Retencja i usuwanie

Dokumenty źródłowe są przechowywane tak długo jak szkic lub produkt, chyba że producent usunie je wcześniej. Twarde usunięcie następuje najpóźniej trzydzieści dni po usunięciu produktu. Propozycje, fragmenty i historia decyzji są przechowywane przez dwadzieścia cztery miesiące od ostatniej aktywności produktu, po czym wartości i fragmenty są usuwane, a pozostają tylko anonimowe metryki. Usunięcie produktu anuluje aktywną pracę i worker nie może odtworzyć skasowanych danych.

### AC-24. Limity i koszty

Jedno konto producenta może mieć jedną aktywną analizę i rozpocząć maksymalnie pięć analiz w kroczącym oknie 24 godzin. System jest zaprojektowany na nie więcej niż tysiąc analiz miesięcznie. Azure ma alerty budżetowe, ale nie automatycznie zatrzymuje importu po przekroczeniu budżetu.

### AC-25. Obserwowalność

Metryki obejmują czas kolejki i etapów, odsetek powodzeń, błędów i anulowań, liczbę stron, zużycie tokenów, koszt estymowany oraz długość kolejki błędów. Alert uruchamia się, gdy odsetek błędów przekracza 5 procent przez 15 minut, zadanie czeka ponad 10 minut albo kolejka błędów nie jest pusta.

## Decision

Wybrany przepływ to Azure AI Document Intelligence Layout, Azure OpenAI GPT 5 mini Data Zone Standard, Azure Functions i Azure Service Bus, z prywatnym Cloudflare R2 jako magazynem źródłowych PDF oraz Neon Postgres jako magazynem sesji, kandydatów i decyzji. Azure Service Bus jest rekomendowany zamiast Azure Queue Storage, ponieważ wbudowana kolejka błędów i kontrola ponowień lepiej odpowiadają wymaganiom stabilności.

Aplikacja Next.js wysyła do kolejki tylko identyfikator sesji przez poświadczenie z prawem `Send`. Worker pobiera PDF z prywatnego R2 przez TLS. Prywatne punkty końcowe obejmują komunikację wewnątrz Azure z Document Intelligence, Azure OpenAI, Service Bus i Key Vault. R2 pozostaje usługą zewnętrzną dostępną przez ograniczone poświadczenie i zaszyfrowane połączenie. Ta granica musi być jawna, ponieważ wdrożenie Next.js i R2 nie znajdują się w tej samej prywatnej sieci Azure.

Cena wariantu zachowuje kwotę netto i walutę źródłową jako audytowalne dane kandydata, natomiast pola produktu są normalizowane do EUR. Import nie oblicza VAT ani ceny brutto, ponieważ właściwa stawka zależy od kraju i warunków dostawy. Dla pojedynczej ceny netto worker przelicza kwotę po zapisanym kursie EBC, zapisuje wynik do `priceMinCents`, pozostawia `priceMaxCents` puste i ustawia `product.currency` na `EUR`.

## Rationale

Dokładne uzasadnienie, porównanie kosztów i źródła znajdują się w [rationale.md](rationale.md).

## Feature design

### Katalog pól

Zamknięty katalog wspieranych pól domu, ich typów, jednostek, lokalizacji, reguł pochodzenia, normalizacji, tolerancji konfliktu i mapowania do bazy znajduje się w [field-catalog.md](field-catalog.md). Katalog jest częścią kontraktu tej funkcji. `schema_version` sesji wskazuje jego wersję. Dodanie, usunięcie albo zmiana znaczenia pola kreatora wymaga aktualizacji katalogu, schematu Zod i złotego zestawu dokumentów w tym samym pull requeście.

Polski jest kanonicznym językiem rekordu `product`. Jeżeli dokument źródłowy jest obcojęzyczny, pipeline zachowuje kandydata w języku źródłowym i tworzy powiązaną propozycję polską. Tłumaczenia EN, DE i NL powstają dopiero z polskiej wartości zaakceptowanej lub ręcznie poprawionej przez producenta. Zmiana polskiej wartości unieważnia wcześniejsze tłumaczenia i uruchamia ich ponowne przygotowanie.

### Przepływ użytkownika i danych

1. Producent wybiera import PDF. Serwer uwierzytelnia użytkownika, ustala producenta i tworzy szkic produktu oraz sesję.
2. Przeglądarka otrzymuje krótkotrwały, jednorazowy adres podpisany wyłącznie do zapisu konkretnego klucza w prefiksie kwarantanny prywatnego R2. Po uploadzie serwer sprawdza obiekt, oblicza SHA 256, analizuje strukturę PDF i zleca izolowany skan ClamAV. Dopiero zaakceptowany obiekt może zostać przekazany do Document Intelligence. Adres podpisany nigdy nie daje prawa odczytu.
3. Serwer zapisuje dokumenty źródłowe i publikuje do Service Bus komunikat zawierający tylko identyfikator sesji.
4. Azure Function pobiera sesję przy użyciu ograniczonej roli, sprawdza stan anulowania i pobiera pliki z R2.
5. Document Intelligence Layout przetwarza każdą stronę. Worker zapisuje wyłącznie znormalizowany tekst, strukturę stron i metadane potrzebne do dalszej analizy.
6. Worker dzieli materiał na kontrolowane porcje i wysyła go do przypiętego wdrożenia Azure OpenAI wraz ze ścisłym schematem wyjścia i regułami traktowania treści jako niezaufanej.
7. Zod odrzuca dane spoza schematu. Deterministyczna warstwa normalizacji przypisuje ścieżki pól, pochodzenie, dowody, poziomy pewności i konflikty.
8. Sesja przechodzi do `review_ready`. Interfejs pobiera stan okresowo i wyświetla propozycje w kreatorze.
9. Producent zapisuje decyzje. Każda nowa decyzja wskazuje poprzednią i nie zmienia historii.
10. Po spełnieniu bramki zastosowania funkcja bazodanowa sprawdza najnowsze decyzje, waliduje wynik i atomowo aktualizuje szkic produktu.

### Model danych

#### `ai_extraction_session`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Identyfikator sesji i klucz idempotencji |
| `product_id` | uuid, FK do `product` | Szkic, którego dotyczy analiza |
| `producer_id` | uuid, FK do `producer` | Utrwalona granica tenantowa i podstawa limitów |
| `created_by_user_id` | uuid, FK do `users` | Użytkownik rozpoczynający sesję |
| `status` | enum | Stan procesu |
| `current_stage` | enum | Bieżący etap do postępu i diagnostyki |
| `progress` | integer | Wartość od 0 do 100, informacyjna |
| `attempt_count` | integer | Liczba wykonanych prób etapu |
| `last_heartbeat_at` | timestamptz, nullable | Wykrywanie zawieszonej pracy |
| `decision_revision` | integer | Wersja całego zestawu decyzji, zwiększana przy każdym zapisie |
| `schema_version` | text | Wersja schematu pól i walidacji |
| `base_locale` | text | Kanoniczny język produktu, w pierwszej wersji `pl` |
| `target_locales` | text[] | W pierwszej wersji `en`, `de`, `nl` |
| `provider` | text | W pierwszej wersji `azure` |
| `model` | text | Nazwa wdrożenia i przypięta wersja modelu |
| `safe_error_code` | text, nullable | Kod możliwy do pokazania bez treści dokumentu |
| `started_at`, `completed_at`, `created_at` | timestamptz | Czasy cyklu życia |

Indeksy obejmują `product_id, created_at`, `producer_id, created_at` oraz częściowy indeks gwarantujący najwyżej jedną aktywną sesję na producenta. `producer_id` jest wymagane, pochodzi z sesji i musi być zgodne z właścicielem `product_id`.

#### `ai_source_document`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Identyfikator dokumentu w sesji |
| `session_id` | uuid, FK | Sesja analizy |
| `document_id` | uuid, FK do `document` | Prywatny obiekt zapisany przez istniejącą warstwę dokumentów |
| `safe_filename` | text | Nazwa oczyszczona do wyświetlenia, nie do logów |
| `sha256` | text | Wykrywanie duplikatu i integralność |
| `page_count` | integer | Liczba stron |
| `detected_language` | text, nullable | Język główny |
| `pdf_kind` | enum | `text`, `scan`, `mixed` |
| `ocr_status` | enum | Stan OCR dokumentu |
| `sort_order` | integer | Stabilna kolejność dokumentów |

Unikalność `session_id, sha256` blokuje duplikat w sesji.

#### `ai_field_candidate`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Kandydat wartości |
| `session_id` | uuid, FK | Sesja analizy |
| `source_candidate_id` | uuid, nullable, FK do tej samej tabeli | Źródło tłumaczenia |
| `field_path` | text | Wersjonowana ścieżka pola kreatora |
| `entity_key` | text, nullable | Stabilny klucz encji, której dotyczy pole |
| `parent_entity_key` | text, nullable | Stabilny klucz wariantu nadrzędnego dla rekordu zależnego |
| `raw_value` | jsonb | Wartość przed normalizacją |
| `normalized_value` | jsonb | Wartość zgodna ze schematem dziedzinowym |
| `normalization_metadata` | jsonb, nullable | Deterministyczne metadane normalizacji, dla ceny: dostawca i seria kursu, kwota i waluta źródłowa, waluta docelowa, kurs, data kursu, czas pobrania oraz reguła zaokrąglenia |
| `origin` | enum | `extracted`, `inferred`, `generated`, `translated` |
| `confidence` | enum | `high`, `medium`, `low` |
| `created_at` | timestamptz | Czas utworzenia |

Po zakończeniu sesji kandydaci są niezmienni. Dozwolonych może być wielu kandydatów dla jednej ścieżki pola.

`entity_key` łączy pola jednego proponowanego wiersza listy, na przykład pomieszczenia, FAQ, wariantu, pozycji kosztowej albo etapu. Klucz powstaje deterministycznie z sesji, rodzaju encji, numeru dokumentu i stabilnego identyfikatora bloku Document Intelligence. Dla encji już istniejącej snapshot nadaje klucz z rodzaju encji i docelowego UUID, a normalizator ponownie używa tego klucza po dopasowaniu rekordu.

`parent_entity_key` opisuje bezpośredniego rodzica, nie bieżącą encję. Jest wymagane dla `variants[].costItems[]` i `variants[].timeline[]` oraz równe `entity_key` wariantu nadrzędnego. Dla wariantu i encji niezależnych ma wartość null. Kandydat `translated` kopiuje oba klucze z polskiego kandydata źródłowego. Pipeline i funkcja zastosowania nie mogą wyprowadzać rodzica z kolejności, etykiety wariantu, ścieżki pola ani podobieństwa tekstu.

#### `ai_candidate_evidence`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Dowód |
| `candidate_id` | uuid, FK | Kandydat |
| `source_document_id` | uuid, FK | Dokument źródłowy |
| `evidence_type` | enum | `source` albo `context` |
| `page_number` | integer, nullable | Numer strony liczony od 1 |
| `excerpt` | text, nullable | Krótki fragment ograniczony długością |

Kandydat `extracted` albo `inferred` musi mieć przynajmniej jeden dowód `source` z numerem strony i fragmentem. Kandydat `generated` może mieć wyłącznie `context`, dla którego strona i fragment są opcjonalne. Kandydat `translated` wskazuje `source_candidate_id`; nie kopiuje dowodów i nie udaje nowego źródła. Nie zapisujemy bounding box w pierwszej wersji.

#### `ai_field_snapshot`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Migawka pola przy starcie sesji |
| `session_id` | uuid, FK | Sesja analizy |
| `field_path` | text | Ścieżka z katalogu pól |
| `entity_key` | text, nullable | Identyfikator elementu listy |
| `parent_entity_key` | text, nullable | Identyfikator wariantu nadrzędnego dla rekordu zależnego |
| `snapshot_value` | jsonb | Znormalizowana wartość początkowa |
| `value_hash` | text | Kanoniczny SHA 256 wartości |

Unikalność z semantyką `NULLS NOT DISTINCT` dla `session_id, field_path, entity_key, parent_entity_key` zapewnia jedną migawkę. Snapshot rekordu zależnego zachowuje ten sam `parent_entity_key`, który wskazuje wariant w snapshotach tej sesji. Przed zastosowaniem funkcja porównuje migawkę z bieżącym produktem. Różnica tworzy blokadę `PRODUCT_FIELD_CHANGED`. Producent musi zachować bieżącą wartość, zastosować propozycję mimo konfliktu albo wpisać trzecią wartość. Żadna z tych decyzji nie może zostać podjęta automatycznie.

#### `ai_field_decision`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Decyzja producenta |
| `session_id` | uuid, FK | Sesja analizy |
| `selected_candidate_id` | uuid, nullable, FK | Wybrany kandydat |
| `previous_decision_id` | uuid, nullable, FK | Poprzednia decyzja dla historii |
| `field_path` | text | Ścieżka pola |
| `entity_key` | text, nullable | Klucz encji skopiowany z kandydata lub wskazany dla wartości ręcznej |
| `parent_entity_key` | text, nullable | Klucz wariantu nadrzędnego skopiowany bez zmiany |
| `final_value` | jsonb | Zaakceptowana albo ręczna wartość |
| `decision_type` | enum | `accepted`, `manual`, `rejected`, `not_applicable`, `keep_current`, `overwrite_changed` |
| `version` | integer | Monotoniczna wersja decyzji dla pola |
| `compared_value_hash` | text, nullable | Hash bieżącego pola, wobec którego rozstrzygnięto konflikt zmiany |
| `decided_by_user_id` | uuid, FK | Użytkownik podejmujący decyzję |
| `decided_at` | timestamptz | Czas decyzji |

Decyzje są dopisywane. Najnowsza decyzja dla pary `field_path, entity_key, parent_entity_key` stanowi bieżący widok. Unikalność z semantyką `NULLS NOT DISTINCT` dla `session_id, field_path, entity_key, parent_entity_key, version` i kontrola oczekiwanej wersji zapobiegają cichemu nadpisaniu między kartami. Decyzja `accepted` kopiuje oba klucze z wybranego kandydata. Decyzja `manual` dla pola istniejącej encji kopiuje je z przeglądanego pola. Utworzenie ręcznego rekordu zależnego wymaga jawnego `entity_key` i istniejącego w tej sesji `parent_entity_key` wariantu. Rozstrzygnięcie `PRODUCT_FIELD_CHANGED` zapisuje hash aktualnie porównanej wartości. Jeżeli pole zmieni się ponownie przed zastosowaniem, blokada wraca. Funkcja bazodanowa nie może dopuścić wybrania kandydata z innej sesji ani zmiany rodzica podczas zapisu decyzji.

#### `ai_translation_request`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Żądanie tłumaczenia aktualnej bazy |
| `session_id` | uuid, FK | Sesja analizy |
| `field_path`, `entity_key`, `parent_entity_key` | text, text nullable, text nullable | Pole lokalizowane wraz z pełną tożsamością encji |
| `source_decision_id` | uuid, FK | Zaakceptowana lub ręczna wartość PL |
| `target_locale` | enum | `en`, `de`, `nl` |
| `status` | enum | `queued`, `processing`, `ready`, `failed`, `superseded` |
| `candidate_id` | uuid, nullable, FK | Gotowy kandydat translated |
| `safe_error_code` | text, nullable | Bezpieczny kod błędu |

Unikalność aktywnego żądania obejmuje decyzję źródłową i locale. Żądanie kopiuje `entity_key` i `parent_entity_key` z decyzji źródłowej. Gotowy kandydat `translated` musi zachować oba klucze oraz wskazać tę decyzję przez żądanie i polskiego kandydata przez `source_candidate_id`. Nowa decyzja polska oznacza poprzednie żądania jako `superseded` i tworzy nowe. Stan oczekujący ma więc własne źródło, nawet zanim powstanie kandydat.

#### Propagacja relacji encji

1. Normalizator nadaje każdej encji powtarzalnej `entity_key`. Rekord zależny dostaje także `parent_entity_key` równe kluczowi wariantu, do którego należy.
2. `ai_field_candidate` przechowuje oba klucze przy każdym polu rekordu. Różni kandydaci tego samego pola zachowują tę samą tożsamość encji i rodzica.
3. `ai_field_snapshot` zapisuje oba klucze dla stanu istniejącego produktu. Dzięki temu konflikt zmiany jest liczony dla konkretnego rekordu w konkretnym wariancie.
4. `ai_field_decision` kopiuje oba klucze z wybranego kandydata albo z pola, które producent edytuje ręcznie. Zapis decyzji nie pozwala zmienić rodzica istniejącej encji.
5. `ai_translation_request` oraz kandydat `translated` kopiują oba klucze z polskiej decyzji źródłowej. Dla tłumaczenia samego wariantu `entity_key` wskazuje wariant, a `parent_entity_key` pozostaje null. Dla każdego przyszłego lokalizowanego rekordu zależnego oba klucze pozostają wymagane.
6. `applyAiExtraction` pobiera najnowsze decyzje i przed zapisem waliduje pełny graf. Następnie tworzy lub dopasowuje warianty, buduje mapę `entity_key` na UUID wariantu i dopiero potem zapisuje pozycje kosztowe, etapy oraz tłumaczenia. Rekord zależny odwołuje się do mapy wyłącznie przez `parent_entity_key`. Brak jednego pasującego rodzica, rodzic z innej sesji lub próba zmiany rodzica kończy funkcję błędem `INVALID_ENTITY_GRAPH` i wycofuje transakcję.

#### `ai_document_issue`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Problem dokumentu lub zakresu stron |
| `session_id` | uuid, FK | Sesja analizy |
| `source_document_id` | uuid, FK | Dokument z problemem |
| `page_from`, `page_to` | integer, nullable | Zakres stron, null dla całego dokumentu |
| `issue_code` | text | Kod z zamkniętej listy |
| `stage` | enum | Etap wykrycia |
| `created_at` | timestamptz | Czas wykrycia |

Tabela nie przechowuje surowego komunikatu dostawcy. Zakres stron pozwala pokazać dokładnie, czego nie udało się odczytać.

#### `ai_document_acknowledgement`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Potwierdzenie błędu częściowego |
| `session_id` | uuid, FK | Sesja analizy |
| `document_issue_id` | uuid, FK | Konkretny problem dokumentu lub stron |
| `acknowledged_by_user_id` | uuid, FK | Producent potwierdzający brak |
| `acknowledged_at` | timestamptz | Czas potwierdzenia |

Unikalność `session_id, document_issue_id` zapewnia jedno potwierdzenie problemu. Zastąpienie dokumentu unieważnia potwierdzenia starego dokumentu.

#### `ai_additional_observation`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Informacja spoza katalogu kreatora |
| `session_id` | uuid, FK | Sesja analizy |
| `source_document_id` | uuid, FK | Dokument źródłowy |
| `page_number` | integer | Strona źródłowa |
| `label`, `value`, `excerpt` | text | Nazwa, wartość i dowód |
| `confidence` | enum | `high`, `medium`, `low` |
| `review_status` | enum | `unreviewed`, `acknowledged`, `dismissed` |

Obserwacja jest tylko informacyjna i nigdy nie trafia do funkcji zastosowania produktu.

#### Audyt dostępu wsparcia

Odczyt administracyjny nie mieści się w obecnym audycie mutacji, dlatego powstają dwie małe tabele. `ai_support_access_grant` zawiera administratora, dokument, wymagane uzasadnienie, czas utworzenia, czas wygaśnięcia po pięciu minutach i czas jednokrotnego użycia. `ai_support_access_audit` zawiera aktora, rolę, sesję, dokument, akcję, uzasadnienie, czas oraz wynik. Żadna tabela nie przechowuje treści dokumentu.

#### `ai_usage_event`

| Pole | Typ | Znaczenie |
|---|---|---|
| `id` | uuid, PK | Zdarzenie rozliczeniowe |
| `session_id` | uuid, FK | Sesja analizy |
| `provider`, `service`, `region`, `meter` | text | Identyfikacja stawki |
| `quantity`, `unit` | numeric, text | Strony albo tokeny |
| `currency`, `unit_price` | text, numeric | Snapshot stawki, w pierwszej wersji USD |
| `rate_retrieved_at` | timestamptz | Wersja cennika |
| `estimated_cost` | numeric | Ilość razy stawka |

Metryki pochodzą z liczby rozliczonych stron Document Intelligence oraz pól usage odpowiedzi Azure OpenAI. Stawki są odświeżane raz dziennie z Azure Retail Prices API. Przy awarii można użyć ostatniej stawki nie starszej niż siedem dni. Bez aktualnej stawki UI pokazuje „koszt niedostępny”, nigdy zero.

### Maszyna stanów

Dozwolone stany sesji:

`uploading` → `queued` → `scanning` → `extracting` → `normalizing` → `review_ready` → `applying` → `applied`

Stany boczne:

`cancel_requested` → `cancelled`

Każdy aktywny etap może przejść do `failed`. Ręczne ponowienie po `failed` tworzy nową próbę tego samego etapu w tej sesji tylko wtedy, gdy nie powstał jeszcze wynik do przeglądu. Ponowna analiza zakończonego wyniku zawsze tworzy nową sesję.

Przejścia wykonuje wyłącznie serwer. Worker aktualizuje stan warunkowo, podając oczekiwany stan poprzedni. Dzięki temu opóźniony komunikat nie może cofnąć sesji ani odtworzyć anulowanej pracy.

### Powierzchnia serwerowa

| Operacja | Typ | Wejście | Wynik | Najważniejsze zabezpieczenia |
|---|---|---|---|---|
| `createAiProductDraft` | Server Action | tryb importu | `productId`, `sessionId` | tworzy wyłącznie `family=dom`, `base_locale=pl`, sesja producenta, limit aktywnej sesji i limit 24 godzin |
| `createAiSourceUpload` | Server Action | `sessionId`, nazwa, rozmiar, deklarowany typ | identyfikator dokumentu i krótkotrwały adres PUT | własność, limity, dokładny klucz kwarantanny, brak prawa GET |
| `finalizeAiSourceUpload` | Server Action | `sessionId`, `sourceDocumentId` | stan walidacji dokumentu | HEAD obiektu, magic bytes, parser PDF, SHA 256, ClamAV przed Document Intelligence |
| `startAiExtraction` | Server Action | `sessionId` | stan `queued` | kompletność uploadu, idempotencja, komunikat bez treści |
| `getAiExtractionStatus` | funkcja serwerowa | `sessionId` | stan i bezpieczny postęp | własność, brak treści dokumentu |
| `getAiExtractionReview` | funkcja serwerowa | `sessionId` | kandydaci, dowody, decyzje | własność, dane tylko gotowej sesji |
| `saveAiFieldDecision` | Server Action | pole, `entityKey`, `parentEntityKey`, kandydat lub wartość ręczna, oczekiwana wersja pola i zestawu | nowa decyzja i `decisionRevision` | Zod, kandydat i graf encji z tej samej sesji, niezmienny rodzic, append only, optymistyczna kontrola konkurencji |
| `requestAiTranslations` | wewnętrzna akcja serwerowa wywoływana po decyzji | `sessionId`, `sourceDecisionId` | rekordy `ai_translation_request` | tylko zaakceptowana lub ręczna wartość PL, stare tłumaczenia unieważnione |
| `applyAiExtraction` | Server Action | `sessionId`, `decisionRevision` | szkic produktu | blokada sesji, ponowna bramka i hashe pól, funkcja bazodanowa, jedna transakcja |
| `cancelAiExtraction` | Server Action | `sessionId` | nowy stan | warunkowe przejście stanu |
| `retryAiExtraction` | Server Action | `sessionId` | nowa próba | tylko stan `failed`, limit dzienny, idempotencja |
| `createAiSupportAccessGrant` | Server Action | dokument, uzasadnienie | jednorazowy `grantId` | wyłącznie rola wsparcia, audyt, ważność pięć minut |
| `GET /[locale]/producer/panel/products/[id]/ai-source/[documentId]` | Route Handler | identyfikator dokumentu, opcjonalny `grantId` | strumień PDF | właściciel albo jednorazowy grant administratora, audyt, `Cache-Control: private, no-store`, brak publicznego URL |

Przeglądarka nie wywołuje usług Azure. Stan jest odpytywany okresowo. WebSocket nie jest potrzebny przy zakładanej skali.

### Deterministyczna bramka przeglądu

Funkcja bazodanowa `get_ai_review_gate(session_id, producer_id)` zwraca `is_apply_ready`, liczbę blokad i listę zamkniętych kodów. Ten sam wynik jest używany przez UI i przez `applyAiExtraction`. UI nie odtwarza reguł samodzielnie.

| Kod blokady | Warunek | Sposób zamknięcia |
|---|---|---|
| `SESSION_NOT_REVIEWABLE` | sesja nie ma stanu `review_ready` | poczekać, ponowić albo utworzyć nową sesję |
| `UNRESOLVED_CONFLICT` | więcej niż jeden różny kandydat źródłowy bez najnowszej decyzji | wybrać, wpisać ręcznie albo odrzucić wszystkich |
| `LOW_CONFIDENCE_UNREVIEWED` | kandydat low wpływający na wynik nie ma jawnej decyzji | zaakceptować, poprawić albo odrzucić |
| `DOCUMENT_ISSUE_UNACKNOWLEDGED` | istnieje problem dokumentu bez potwierdzenia | potwierdzić brak albo zastąpić dokument |
| `PRODUCT_FIELD_CHANGED` | bieżący hash pola różni się od `ai_field_snapshot` | zachować bieżące, nadpisać jawnie albo wpisać nową wartość |
| `TRANSLATION_PENDING` | aktualna zaakceptowana wersja bazowa nie ma gotowych kandydatów EN, DE i NL | poczekać na tłumaczenia |
| `TRANSLATION_FAILED` | żądanie tłumaczenia zakończyło się błędem | ponowić albo jawnie oznaczyć konkretne tłumaczenie jako pominięte |
| `INVALID_ENTITY_GRAPH` | rekord zależny nie ma jednego wariantu wskazanego przez `parent_entity_key` w tej samej sesji | poprawić wynik przez ponowną analizę lub ręcznie przypisać rekord do wariantu |
| `SCHEMA_VERSION_MISMATCH` | sesja używa katalogu, którego aplikacja nie potrafi bezpiecznie zastosować | ponowna analiza na bieżącym schemacie |
| `DECISION_VALIDATION_ERROR` | najnowsza decyzja nie przechodzi aktualnego schematu pola | poprawić wartość |

Pola puste, dla których nie znaleziono kandydata, nie są blokadą. Informacje dodatkowe również nie blokują zastosowania.

### Polityka walidacji dokumentu

Plik najpierw trafia do prefiksu kwarantanny w prywatnym R2. Walidację wykonuje izolowany custom container Azure Functions Premium. Brak przejścia dowolnej kontroli blokującej uniemożliwia wywołanie Document Intelligence i Azure OpenAI.

| Kontrola | Narzędzie lub źródło | Próg | Kod błędu | Blokuje |
|---|---|---|---|---|
| liczba i rozmiar | metadane uploadu oraz R2 HEAD | do 5 plików, 25 MB na plik, 200 stron łącznie | `FILE_LIMIT_EXCEEDED` | tak |
| format | sygnatura `%PDF-`, `qpdf --check` w sandboxie | poprawny PDF, brak błędu struktury | `INVALID_PDF` | tak |
| hasło i szyfrowanie | `qpdf --show-encryption` | brak ochrony hasłem i brak nieobsługiwanego szyfrowania | `ENCRYPTED_PDF` | tak |
| malware | ClamAV z bazą sygnatur nie starszą niż 24 godziny | wynik clean | `MALWARE_DETECTED` albo `SCANNER_UNAVAILABLE` | tak |
| limity zasobów | limit kontenera per plik | 1 CPU, 512 MB RAM, 30 sekund, maksymalnie 250 MB rozwiniętych strumieni | `PDF_RESOURCE_LIMIT` | tak |
| tekst wstępny | `pdftotext` uruchomiony po skanie w tym samym sandboxie | zakończenie w limicie zasobów | `TEXT_PREFLIGHT_FAILED` | tak dla PDF tekstowego, nie dotyczy czystego skanu |
| sekrety | `gitleaks` plus zamknięte wzorce kluczy prywatnych i haseł | dowolne trafienie wysokiej pewności | `SECRET_DETECTED` | tak |
| dane osobowe w tekście | Microsoft Presidio z modelami PL, EN, DE, NL oraz walidatory IBAN, PESEL, kart, email i telefonu | dowolne trafienie wysokiej pewności | `PII_DETECTED` | tak |
| deklaracja producenta | wymagany checkbox przed startem | potwierdzenie braku PII i sekretów | `DECLARATION_REQUIRED` | tak |

Nie zapisujemy dopasowanego sekretu ani PII w logu lub kodzie błędu. Dla skanu bez warstwy tekstowej UI jawnie informuje, że preflight nie może sprawdzić treści obrazu przed OCR.

### Macierz pewności i konfliktu

Pewność jest wynikiem reguł, a nie polem przyjętym z odpowiedzi modelu.

| Poziom | Warunek |
|---|---|
| `high` | `extracted`, OCR co najmniej 0,90, jeden jednoznaczny dowód, walidacja dziedzinowa poprawna, brak konfliktu; albo co najmniej dwa niezależne zgodne dowody z OCR co najmniej 0,80 |
| `medium` | `extracted` z OCR od 0,75 do 0,89 i poprawną walidacją; każdy `inferred` z jawnymi przesłankami; `translated` albo `generated` o pełnym kontekście |
| `low` | OCR od 0,50 do 0,74, słaba etykieta, niepełny kontekst, częściowa walidacja albo rozbieżność możliwa do wyjaśnienia |

OCR poniżej 0,50 nie tworzy kandydata. Powstaje `ai_document_issue`. `inferred`, `generated` i `translated` nigdy nie otrzymują `high` przed decyzją człowieka.

Konflikt jest liczony po normalizacji. Enumy, wartości logiczne i tekst po normalizacji Unicode oraz białych znaków wymagają równości. Cena ma tolerancję 1 centa, czas 1 dnia, powierzchnia 0,1 m², długość 1 cm, a pozostałe liczby tolerancję określoną w katalogu pól. Dwie wartości poza tolerancją z co najmniej jednym dowodem źródłowym każda tworzą konflikt. Model nie może sam wybrać zwycięzcy.

### Postęp, timeouty i ponowienia

| Etap | Zakres postępu | Timeout próby | Ponowienia |
|---|---:|---:|---|
| kolejka i przygotowanie | 0 do 5 | ostrzeżenie po 10 minutach oczekiwania | Service Bus zgodnie z delivery count |
| walidacja i skan | 5 do 15 | 2 minuty na dokument | tylko błąd infrastruktury, maksymalnie 3 |
| Document Intelligence | 15 do 55 | 5 minut na próbę | maksymalnie 3, po 30 sekundach, 2 minutach i 8 minutach |
| mapowanie i Azure OpenAI | 55 do 90 | 5 minut na próbę | maksymalnie 3 dla błędu przejściowego; jedna dodatkowa naprawa formatu |
| walidacja i zapis kandydatów | 90 do 100 | 2 minuty | maksymalnie 3 dla konfliktu infrastruktury |

Worker zapisuje heartbeat co 30 sekund. Watchdog uznaje pracę za osieroconą po 3 minutach bez heartbeat, atomowo przejmuje lease i ponawia od ostatniego ukończonego etapu. Dwie instancje nie mogą posiadać aktywnego lease tej samej sesji. Po trzech próbach etapu albo po 30 minutach od pierwszego podjęcia, zależnie od tego co nastąpi wcześniej, wiadomość trafia do DLQ, a sesja otrzymuje `failed`. Błędy deterministyczne pliku i schematu nie są ponawiane.

### Value sourcing

| Wartość | Źródło | Reguła |
|---|---|---|
| `producerId` | sesja Auth.js i relacja użytkownika | nigdy z danych formularza |
| `productId` | nowo utworzony szkic w Neon | przypięty do producenta w tej samej operacji |
| lista wspieranych pól | `HOUSE_AI_FIELD_CATALOG` zgodny z [field-catalog.md](field-catalog.md) | rejestr TypeScript jest źródłem schematu, UI, normalizacji i mapowania |
| język kanoniczny | kontrakt produktu | zawsze `pl` w pierwszej wersji |
| język dokumentu | Document Intelligence per strona i agregacja workera | `pl`, `en`, `de`, `nl` albo problem nieobsługiwanego języka |
| języki docelowe | kontrakt sesji | zawsze `en`, `de`, `nl` w pierwszej wersji |
| limit uruchomień | `ai_extraction_session.created_at` dla `producer_id` | pięć rozpoczęć w kroczącym oknie 24 godzin |
| typ, rozmiar, liczba stron, SHA 256 | analiza binarna po stronie serwera | przed zapisem sesji do kolejki |
| tekst strony i jakość OCR | Azure Document Intelligence Layout | każda strona, numeracja od 1 |
| ścieżka pola i wartość surowa | przypięty schemat ekstrakcji | wyjście strukturalne, wersjonowane |
| cena wariantu netto | jawna kwota netto w dokumencie | kwota i waluta źródłowa trafiają do `raw_value`; po kursie zapisanym w `normalization_metadata` wynik w eurocentach trafia do `priceMinCents`; brak kwoty nie tworzy kandydata |
| waluta ceny | jawny symbol lub kod waluty przy cenie netto | normalizacja do ISO 4217 jako waluta źródłowa; `product.currency` ma wartość `EUR`; brak jednoznacznej waluty tworzy `PRICE_CURRENCY_AMBIGUOUS` |
| kurs do EUR | najnowsza dzienna obserwacja EBC `EXR.D.{SOURCE}.EUR.SP00.A` dostępna podczas normalizacji | kurs nie starszy niż siedem dni, zapisany razem z datą i czasem pobrania; brak kursu tworzy `FX_RATE_UNAVAILABLE` |
| maksymalna cena wariantu | jawna maksymalna kwota netto w dokumencie | przeliczenie tym samym snapshotem kursu i zapis do `priceMaxCents`; kwota brutto nigdy nie jest jej źródłem |
| cena brutto i VAT | poza zakresem importu | nie są przechowywane ani wyliczane; zależą od kraju i warunków dostawy |
| `entity_key` | normalizator encji w obrębie sesji | klucz istniejącego rekordu pochodzi ze snapshotu, klucz nowego rekordu z deterministycznej tożsamości bloku źródłowego |
| `parent_entity_key` | jawna relacja z wyniku strukturalnego, zweryfikowana względem wariantu w tej samej sesji | wymagane dla pozycji kosztowej i etapu harmonogramu, nigdy wyprowadzane z kolejności lub nazwy |
| wartość znormalizowana | deterministyczne reguły oraz Zod | jednostki, typy, zakresy, enumy |
| pochodzenie | reguła pipeline | dokładny dowód, dedukcja, generacja albo tłumaczenie |
| poziom pewności | funkcja regułowa | OCR, jednoznaczność, zgodność dokumentów, walidacja dziedzinowa |
| dowód | wynik Document Intelligence | dokument, strona i fragment, nie tekst wymyślony przez model |
| konflikt | porównanie znormalizowanych kandydatów tej samej ścieżki | różne wartości wspierane przez różne dowody |
| postęp | ukończone etapy i strony według stałych wag | nie jest wartością zadeklarowaną przez model |
| bezpieczny błąd | zamknięta lista kodów pipeline | komunikat dostawcy pozostaje poza UI i logami aplikacji |
| potwierdzenie błędu dokumentu | jawna akcja producenta | zapis w `ai_document_acknowledgement` |
| tłumaczenie | zaakceptowana lub ręczna polska wartość kanoniczna | generowane po decyzji, przechowuje `source_candidate_id`, wersję bazy, `entity_key` i `parent_entity_key` |
| konflikt z ręczną zmianą | `ai_field_snapshot` porównany z bieżącym produktem | różny hash blokuje zastosowanie do czasu jawnej decyzji |
| gotowość zastosowania | `get_ai_review_gate` | zamknięta lista kodów blokad, wspólna dla UI i funkcji zapisu |
| końcowe pola produktu | najnowsze decyzje producenta | ponowna walidacja istniejącymi schematami produktu |
| docelowy UUID wariantu rekordu zależnego | mapa zbudowana przez `applyAiExtraction` | `parent_entity_key` decyzji wskazuje `entity_key` wariantu, który funkcja utworzyła lub dopasowała |
| koszt sesji | `ai_usage_event` z ilością oraz snapshotem stawki | przechowywane bez treści, brak stawki nie daje kosztu zero |

### Spójność i niezmienniki

1. Postęp analizy ma spójność ostateczną i może być chwilowo opóźniony.
2. Decyzje producenta zapisują się ze spójnością silną i kontrolą wersji, żeby dwie karty nie nadpisały się po cichu.
3. Zastosowanie decyzji do produktu ma spójność silną i odbywa się w pojedynczej funkcji Postgres, ponieważ wielotabelowa operacja musi być atomowa.
4. Worker nie ma uprawnienia do bezpośredniej zmiany produktu.
5. Każdy kandydat, dowód i decyzja musi należeć do tej samej sesji i tego samego producenta.
6. Każdy rekord zależny ma własne `entity_key` i dokładnie jedno `parent_entity_key`, które wskazuje wariant z tej samej sesji. Tej relacji nie wolno zmienić między kandydatem, snapshotem, decyzją, tłumaczeniem i zastosowaniem.
7. Funkcja zastosowania waliduje cały graf encji przed pierwszym zapisem produktu. Najpierw zapisuje warianty i buduje mapę ich UUID, potem zapisuje rekordy zależne oraz tłumaczenia przez tę mapę.
8. Sesja `applied`, `cancelled` albo zakończona wynikiem do przeglądu jest niezmienna poza dopisywaniem decyzji i metryk retencji.
9. Usunięty produkt unieważnia sesję przed fizycznym czyszczeniem obiektów, żeby spóźniony worker nie mógł jej wznowić.
10. Cena wariantu oznacza kwotę netto i jest zapisywana w EUR. Kwota i waluta źródłowa oraz snapshot kursu pozostają niezmienne w kandydacie. Cena brutto nie może trafić do `priceMinCents`, `priceMaxCents` ani zostać wyliczona przez worker importu.
11. Ten sam kandydat cenowy zawsze daje ten sam wynik niezależnie od późniejszej zmiany kursu. Ponowne pobranie kursu wymaga nowej analizy, a ręczna korekta producenta zapisuje jego jawną decyzję zamiast ukrytej rekonwersji.

### Model bezpieczeństwa

1. Uwierzytelnienie i autoryzacja pozostają po stronie Next.js z `requireProducerActor()` oraz sprawdzeniem relacji do `product.producer_id`.
2. Azure Function korzysta z osobnej roli Neon ograniczonej do tabel `ai_*` oraz wybranych funkcji bazodanowych.
3. Azure Function używa Managed Identity do Azure Service Bus, Document Intelligence, Azure OpenAI i Key Vault.
4. Next.js posiada wyłącznie poświadczenie Service Bus z prawem `Send`, przechowywane w sekretach środowiska wdrożeniowego i rotowane.
5. R2 używa osobnych poświadczeń ograniczonych do prywatnego bucketa PDF. Te same klucze nie obsługują publicznych zdjęć produktu.
6. Połączenia są szyfrowane. Usługi Azure komunikują się przez VNet i prywatne punkty końcowe tam, gdzie usługa i plan to wspierają.
7. PDF, tekst OCR i wynik modelu są niezaufane. Prompt zawiera stałą instrukcję ignorowania poleceń dokumentu, ale główną ochroną jest brak narzędzi i ścisła walidacja wyjścia.
8. Dostęp administracyjny jest oddzielnym uprawnieniem, wymaga uzasadnienia i zawsze tworzy wpis audytu.
9. Logowanie, analityka i monitoring korzystają z listy dozwolonych pól. Nie wolno przesyłać całych obiektów błędów dostawcy bez wcześniejszej redakcji.
10. Dokumenty nie są używane do trenowania modeli. Umowy i ustawienia dostawcy muszą być sprawdzone przed produkcją.

### Retencja i czyszczenie

Źródłem „ostatniej aktywności produktu” jest największa z wartości `product.updated_at`, najnowszego `ai_field_decision.decided_at` i `ai_extraction_session.completed_at`. Każda encja otrzymuje wyliczone `retention_due_at`; job zapisuje `purged_at`. Usunięcie obiektu R2, rekordu lub wartości jest idempotentne i bezpieczne do ponowienia.

| Dane | Retencja | Operacja po terminie |
|---|---|---|
| pełny tekst OCR i struktura Azure | tylko pamięć lub szyfrowany dysk tymczasowy workera, maksymalnie 24 godziny po końcu próby | twarde usunięcie; nigdy nie trafia do logów ani stałej tabeli |
| surowa odpowiedź modelu | tylko pamięć procesu do zakończenia walidacji | natychmiastowe odrzucenie po zapisaniu zwalidowanych kandydatów |
| PDF w prywatnym R2 | do usunięcia przez producenta albo maksymalnie 30 dni po usunięciu produktu | twarde usunięcie obiektu i rekordu dokumentu |
| kandydaci, `raw_value`, `normalized_value`, dowody i fragmenty | 24 miesiące od ostatniej aktywności produktu | twarde usunięcie wartości i fragmentów |
| decyzje i snapshoty pól | 24 miesiące od ostatniej aktywności produktu | twarde usunięcie po zamknięciu okresu audytowego |
| problemy dokumentów, potwierdzenia i obserwacje dodatkowe | 24 miesiące od ostatniej aktywności produktu | twarde usunięcie |
| grant dostępu wsparcia | 30 dni | twarde usunięcie, audyt pozostaje |
| audyt dostępu wsparcia | 24 miesiące | twarde usunięcie po okresie audytowym |
| metryki i usage | 24 miesiące w formie sesyjnej | usunięcie identyfikatorów produktu i producenta, zachowanie agregatu anonimowego |

Usunięcie produktu najpierw ustawia tombstone oraz `cancel_requested`, następnie unieważnia lease workera i granty wsparcia. Dopiero później rozpoczyna się czyszczenie. Każdy zapis workera sprawdza tombstone w tej samej transakcji.

### Konfiguracja

| Zmienna | Miejsce | Znaczenie |
|---|---|---|
| `AI_IMPORT_ENABLED` | Next.js | flaga udostępnienia funkcji |
| `AI_IMPORT_MAX_RUNS_PER_24H` | Next.js | domyślnie 5 |
| `AZURE_SERVICE_BUS_NAMESPACE` | Next.js i worker | przestrzeń Service Bus |
| `AZURE_SERVICE_BUS_QUEUE` | Next.js i worker | nazwa kolejki |
| `AZURE_SERVICE_BUS_SEND_CONNECTION_STRING` | tylko Next.js | poświadczenie wyłącznie z prawem `Send` |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | worker | prywatny endpoint usługi |
| `AZURE_OPENAI_ENDPOINT` | worker | prywatny endpoint usługi |
| `AZURE_OPENAI_DEPLOYMENT` | worker | nazwa wdrożenia GPT 5 mini |
| `AZURE_OPENAI_MODEL_SNAPSHOT` | worker | przypięta wersja modelu |
| `AI_PRIVATE_R2_BUCKET_NAME` | Next.js i worker | oddzielny prywatny bucket PDF |
| `AI_PRIVATE_R2_ACCESS_KEY_ID` | sekrety wdrożenia i Key Vault | klucz ograniczony do bucketa |
| `AI_PRIVATE_R2_SECRET_ACCESS_KEY` | sekrety wdrożenia i Key Vault | sekret ograniczony do bucketa |

Azure OpenAI i Document Intelligence nie używają stałych kluczy API w workerze. Autoryzacja odbywa się przez Managed Identity.

### Critical test scenarios

1. Tekstowy PDF po polsku uzupełnia dane podstawowe, techniczne, logistykę i wariant, a każde pole pokazuje prawidłowy dokument, stronę i fragment. Weryfikuje **AC-5**, **AC-7**, **AC-11**.
2. Skan po niemiecku przechodzi OCR i tworzy polską wartość bazową oraz tłumaczenia EN, DE i NL bez wymyślania brakujących parametrów. Weryfikuje **AC-5**, **AC-6**, **AC-19**.
3. Dwa dokumenty podają różne powierzchnie. System zachowuje obu kandydatów i blokuje zastosowanie do czasu wyboru. Weryfikuje **AC-9**, **AC-12**.
4. Jedna wartość ma niski poziom pewności. Samo przejście przez krok nie wystarcza, producent musi jawnie zaakceptować, poprawić albo odrzucić propozycję. Weryfikuje **AC-8**, **AC-12**.
5. Jeden z pięciu dokumentów ma uszkodzone strony. Pozostałe są analizowane, a producent musi potwierdzić brak przed zastosowaniem. Weryfikuje **AC-10**.
6. PDF zawiera polecenie ujawnienia promptu i połączenia z adresem URL. Treść pozostaje danymi, model nie wywołuje narzędzi, a wyjście nadal przechodzi ścisły schemat. Weryfikuje **AC-20**.
7. Dwukrotne dostarczenie tego samego komunikatu Service Bus nie tworzy duplikatów. Weryfikuje **AC-21**.
8. Producent A próbuje odczytać sesję, dowód lub PDF producenta B. Otrzymuje odpowiedź nierozróżniającą braku zasobu od braku uprawnienia. Weryfikuje **AC-16**.
9. Administrator wsparcia otwiera PDF. Powstaje wpis audytu z uzasadnieniem, a adres obiektu R2 nie trafia do przeglądarki. Weryfikuje **AC-17**, **AC-18**.
10. Użytkownik zamyka przeglądarkę w trakcie analizy i wraca po zakończeniu. Widzi wynik, bez wiadomości email. Weryfikuje **AC-4**, **AC-15**.
11. Producent zmienia ręcznie pole, uruchamia nową analizę i nie traci wcześniejszej wartości. Weryfikuje **AC-14**.
12. Błąd podczas zapisu trzeciej tabeli produktu wycofuje całą operację zastosowania. Weryfikuje **AC-13**.
13. Dwa warianty mają własne pozycje kosztowe, etapy i tłumaczenia. Po przeglądzie i zastosowaniu każdy rekord trafia wyłącznie do wariantu wskazanego przez `parent_entity_key`, niezależnie od kolejności rekordów. Brakujący lub obcy rodzic daje `INVALID_ENTITY_GRAPH` i nie zapisuje nic. Weryfikuje **AC-7**, **AC-12**, **AC-13**.
14. Dokument podaje cenę netto 454 149 PLN i cenę brutto 490 481 PLN. Przy testowym kursie 4,5000 PLN za 1 EUR import zachowuje źródło 454 149 PLN, zapisuje `priceMinCents = 10092200`, `priceMaxCents = null` i `product.currency = EUR`; nie zapisuje ani nie wylicza kwoty brutto. Weryfikuje **AC-5**.
15. Złośliwy, zaszyfrowany i zduplikowany plik zostają odrzucone przed analizą. Weryfikuje **AC-2**, **AC-3**.
16. Usunięcie produktu w czasie aktywnej pracy anuluje sesję, a opóźniony worker nie odtwarza danych. Weryfikuje **AC-23**.
17. Test dostępności przechodzi obsługę klawiaturą, fokus, komunikaty błędów i kontrast bez zależności od koloru. Weryfikuje **AC-11**.

## Build plan

Podejście pozostaje zgodne z zasadą Facade dla warstwy interfejsu, ale bezpieczeństwo i zapis produktu są budowane end to end przed udostępnieniem funkcji. Fasada działa najpierw na kontrolowanych wynikach przykładowych i jest ukryta za flagą. Nie może zostać przedstawiona jako działający bezpieczny import, dopóki pełna ścieżka serwerowa nie przejdzie testów.

1. Zbudować fasadę wejścia „Uzupełnij z PDF”, ekran postępu, znaczniki pól, panel dowodów, konflikty i bramkę zastosowania na wersjonowanych fixture. Dodać testy dostępności. Satisfies **AC-1**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-15**.
2. Zbudować `HOUSE_AI_FIELD_CATALOG` zgodny z [field-catalog.md](field-catalog.md), schematy Zod kandydatów i decyzji, reguły normalizacji, jawny kontrakt `entity_key` i `parent_entity_key`, macierz pewności i konfliktów oraz test kontraktowy z aktualnym kreatorem. Dodać przeliczanie ceny netto do EUR po utrwalonym kursie EBC, arytmetykę dziesiętną, zaokrąglenie half up, pozostawianie `priceMaxCents` pustego bez jawnej maksymalnej ceny netto oraz odrzucanie brutto jako źródła ceny. Przygotować złoty zestaw PDF i oczekiwanych wyników z co najmniej dwoma wariantami i zależnymi rekordami. Satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-20**.
3. Dodać migrację Drizzle dla sesji, snapshotów pól, kandydatów, dowodów, decyzji, problemów i potwierdzeń dokumentów, dodatkowych obserwacji, żądań tłumaczeń, usage, grantów i audytu wsparcia. Kandydat dostaje `normalization_metadata` dla audytowalnego snapshotu kursu. Dodać `entity_key` i `parent_entity_key` do wszystkich etapów tożsamości pola, indeksy z właściwą semantyką null, ograniczenia tenantowe, `get_ai_review_gate` z `INVALID_ENTITY_GRAPH` i dwufazową funkcję atomowego zastosowania. Utworzyć ograniczoną rolę workera. Satisfies **AC-5**, **AC-7**, **AC-10**, **AC-12**, **AC-13**, **AC-14**, **AC-16**, **AC-17**, **AC-21**.
4. Utworzyć osobny prywatny bucket R2, rozszerzyć warstwę dokumentów o przeznaczenie źródłowego PDF oraz dodać bezpieczny upload do kwarantanny, ClamAV, SHA 256, sprawdzanie stron i chronione strumieniowanie. Satisfies **AC-2**, **AC-3**, **AC-17**, **AC-18**.
5. Zbudować akcje serwerowe sesji, snapshot pól, zapis decyzji z kontrolą wersji, `get_ai_review_gate`, okresowe odpytywanie, grant wsparcia, anulowanie, retry i atomowe zastosowanie. Na tym etapie worker może być deterministycznym adapterem testowym, ale wyłącznie poza produkcją. Satisfies **AC-4**, **AC-12**, **AC-13**, **AC-14**, **AC-15**, **AC-16**, **AC-17**.
6. Zdefiniować Azure przez infrastrukturę jako kod: Service Bus z kolejką błędów, Azure Function, Key Vault, Document Intelligence, Azure OpenAI, sieć, prywatne punkty końcowe, Managed Identity, role oraz budżet i alerty. Satisfies **AC-19**, **AC-21**, **AC-24**, **AC-25**.
7. Zbudować worker TypeScript jako maszynę etapów z lease, heartbeat, kontrolą anulowania, idempotencją, zdefiniowanymi timeoutami, trzema próbami i bezpiecznymi kodami błędów. Satisfies **AC-4**, **AC-10**, **AC-15**, **AC-21**, **AC-25**.
8. Podłączyć Document Intelligence Layout dla każdej strony, problemy zakresów stron, dodatkowe obserwacje oraz warstwę normalizacji dokumentu. Pełny OCR pozostaje wyłącznie w pamięci lub na szyfrowanym dysku tymczasowym. Satisfies **AC-5**, **AC-7**, **AC-10**, **AC-19**, **AC-22**, **AC-23**.
9. Podłączyć przypięte wdrożenie GPT 5 mini z wyjściem strukturalnym, ochroną przed instrukcjami dokumentu, jednym kontrolowanym retry formatu, walidacją Zod i tłumaczeniami tworzonymi po decyzji bazowej. Model rozróżnia ceny netto od brutto i zwraca jawną walutę, natomiast reguła deterministyczna decyduje o zapisie ceny i kodu ISO 4217. Satisfies **AC-5**, **AC-6**, **AC-7**, **AC-20**.
10. Dodać redakcję logów, metryki, alerty, `ai_usage_event` ze snapshotem stawki, macierz retencji, idempotentne zadania czyszczące i audyt administracyjny. Satisfies **AC-17**, **AC-22**, **AC-23**, **AC-24**, **AC-25**.
11. Uruchomić testy jednostkowe, integracyjne, kontraktowe, bezpieczeństwa, przeciążeniowe oraz E2E. Ocenić przypięty model na złotym zestawie przed każdą zmianą snapshotu. Weryfikuje **AC-1** do **AC-25**.
12. Włączyć funkcję najpierw dla kont wewnętrznych, potem dla małej grupy producentów. Rozszerzać dostęp dopiero po spełnieniu SLO, przeglądzie bezpieczeństwa i potwierdzeniu budżetu. Satisfies **AC-4**, **AC-19**, **AC-24**, **AC-25**.

## Umiejętności implementacyjne

1. `nextjs-app-router-patterns` z `wshobson/agents` dla akcji serwerowych, Route Handlerów, granic serwer klient i odpytywania stanu.
2. `drizzle` z `bobmatnyc/claude-mpm-skills` dla migracji, indeksów, relacji i transakcyjnej funkcji zastosowania.
3. `zod` z `pproenca/dot-skills` dla walidacji na każdej granicy i wersjonowanych schematów wyniku AI.
4. `aws-sdk-js-v3-usage` z `aws/agent-toolkit-for-aws` dla klienta S3 kompatybilnego z Cloudflare R2 oraz bezpiecznego strumieniowania.

Nie znaleziono wiarygodnej umiejętności społecznościowej obejmującej Azure Document Intelligence, Azure OpenAI i Service Bus jako jeden proces. Implementacja powinna korzystać z oficjalnej dokumentacji oraz, po przygotowaniu ograniczonej tożsamości Azure, z oficjalnego Azure MCP Server.

## Consequences

### Pozytywne

1. Producent zachowuje pełną kontrolę, a każda propozycja ma jawne pochodzenie.
2. System ogranicza ręczne przepisywanie bez automatycznej publikacji i bez cichego nadpisywania danych.
3. Niezmienna historia pozwala diagnozować błędy i oceniać jakość modelu.
4. Jedna chmura dla OCR, modelu, kolejki i workera upraszcza odpowiedzialność operacyjną.
5. Przypięty model i złoty zestaw dokumentów ograniczają niekontrolowany dryf jakości.

### Negatywne i kompromisy

1. Rozwiązanie jest droższe i operacyjnie cięższe niż bezpośrednie wysłanie PDF do jednego API modelu.
2. R2 poza Azure oznacza zaszyfrowany ruch między chmurami i wyklucza pełną prywatność sieciową na całej trasie.
3. Blokowanie podejrzanych danych przed wysłaniem jest niezawodne tylko dla treści możliwej do odczytania lokalnie. Skan może zawierać niewykryte dane osobowe.
4. Jedna aktywna analiza na konto podnosi stabilność i kontrolę kosztów, ale ogranicza pracę seryjną dużych producentów.
5. Brak automatycznego fallbacku zwiększa przewidywalność i audytowalność, lecz awaria Azure zatrzymuje proces.
6. Przechowywanie dowodów i historii przez 24 miesiące zwiększa wartość audytową, ale wymaga precyzyjnego czyszczenia i kontroli dostępu.

## Poza zakresem

1. Automatyczna publikacja produktu.
2. Import zdjęć, wizualizacji i rzutów z PDF.
3. Import rodzin innych niż `dom`.
4. Import z URL, XLSX, IFC, CAD albo wiadomości email.
5. Rozpoznawanie podpisów i prawna weryfikacja certyfikatów.
6. Swobodny czat z dokumentem.
7. Automatyczne przełączanie na OpenAI, Google albo AWS podczas awarii Azure.
8. Powiadomienia email o zakończeniu.
9. Lokalny OCR służący wyłącznie do wykrywania danych osobowych na obrazach przed chmurą.

## Follow up

1. Przed implementacją utworzyć europejskie zasoby Azure, podpisać odpowiednie umowy powierzenia, sprawdzić dostępność Data Zone Standard, limity i kwoty w wybranym regionie.
2. Po utworzeniu ograniczonej tożsamości Azure podłączyć oficjalny Azure MCP Server zgodnie z zasadą najmniejszych uprawnień. MCP ma pomagać w inspekcji i wdrożeniu, ale nie zastępuje infrastruktury jako kodu ani przeglądu zmian.
3. Przygotować co najmniej dwadzieścia legalnie używanych, zanonimizowanych dokumentów reprezentujących PL, EN, DE, NL, tabele, skany i sprzeczne oferty.
4. Ustalić biznesowo, czy deklaracja producenta i europejskie warunki przetwarzania wystarczą dla przypadkowych danych osobowych w skanach. Jeśli nie, przygotować osobny spec lokalnego OCR bezpieczeństwa.
5. Utworzyć prywatny bucket R2 w europejskiej jurysdykcji i osobne poświadczenia ograniczone do tego bucketa.
6. Dodać funkcję do właściwego pliku `docs/scope/` po zatwierdzeniu tego spec.
7. Przy najbliższym `/sync` poprawić nieaktualne fragmenty `components/producent/AGENTS.md` dotyczące identyfikacji producenta i opisać nową granicę `lib/ai-import/`.

## Plan migracji i wycofania

Migracja bazy jest addytywna. Nowe tabele i enumy nie zmieniają istniejących danych produktów. Flaga `AI_IMPORT_ENABLED` pozostaje wyłączona do czasu gotowości pełnej ścieżki. Wycofanie polega na wyłączeniu flagi, zatrzymaniu publikowania nowych komunikatów, dokończeniu albo anulowaniu istniejących sesji oraz zachowaniu danych zgodnie z retencją. Usunięcie tabel jest osobną, późniejszą migracją i nie stanowi elementu pierwszego rollbacku.
