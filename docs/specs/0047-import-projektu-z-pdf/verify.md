# Verify: Import projektu domu z PDF · spec 0047 · updated 2026-09-21

_Kroki pochodzą z kryteriów akceptacji spec 0047. `/check verify` uruchamia je, a `/test` utrwala kontrole nadające się do automatyzacji._

## Upload, szkic i uruchomienie sesji

- [x] `npm test -- --run lib/house-ai-import-actions.test.ts lib/house-ai-import-contract.test.ts lib/house-ai-field-catalog.test.ts lib/house-ai-rules.test.ts lib/house-ai-review-groups.test.ts lib/house-ai-schemas.test.ts lib/ai/house-import-service-bus.test.ts lib/ai/house-import-worker.test.ts lib/ai/house-project-extraction.test.ts lib/ai/house-project-extraction-persistence.test.ts lib/storage/ai-private-r2-client.test.ts lib/storage/ai-source-pdf-validation.test.ts components/producent/HouseAiFieldReview.test.tsx components/ui/FileUpload.test.tsx azure-functions/house-import/src/house-import-message-handler.test.ts azure-functions/house-import/src/function-package.test.ts` → 109 testów przechodzi; regresja obejmuje pusty szkic `family=dom`, sesję `uploading`, deklarację producenta, podpisany PUT do kwarantanny prywatnego R2, walidację PDF, komunikat zawierający wyłącznie `sessionId`, worker oraz przegląd → zweryfikowano 2026-09-21 → AC-1 do AC-4, AC-11, AC-15, AC-16, AC-18, AC-21
- [x] `npx tsc --noEmit --pretty false` oraz ESLint zmienionych modułów uploadu, akcji, Service Bus i UI → bez błędów 2026-09-21
- [x] `npm run build` → produkcyjny build Next.js 16.3.0 zawiera trasę `/[locale]/producer/panel/project/import` i przechodzi 2026-09-21 → AC-1, AC-4, AC-11, AC-15
- [ ] Jako producent otwórz `/pl/producer/panel/products`, wybierz „Uzupełnij z PDF”, dodaj poprawny PDF i potwierdź deklarację → powstają nowy produkt `status=draft`, `family=dom` bez uzupełnionych pól oraz sesja `uploading`, a plik trafia pod losowy klucz `quarantine/<producerId>/<sessionId>/...` prywatnego bucketa → AC-1, AC-16, AC-18
- [ ] Po uploadzie odczytaj `ai_source_document` → `safe_filename`, SHA 256, liczba stron, rodzaj PDF i kolejność pochodzą z analizy serwerowej, a ten sam SHA 256 w tej sesji nie tworzy drugiego źródła → AC-2, AC-3
- [ ] Podeślij kolejno fałszywe rozszerzenie, MIME inne niż `application/pdf`, zawartość bez `%PDF-`, brak `%%EOF`, PDF z `/Encrypt`, plik większy niż 25 MB, szósty dokument oraz zestaw ponad 200 stron → każdy przypadek jest odrzucony przed wysłaniem do Azure, a odrzucona rezerwacja nie blokuje następnej próby → AC-2, AC-3
- [ ] Podejrzyj komunikat początkowy w Service Bus → body zawiera wyłącznie `{ sessionId }`, `messageId` jest deterministyczne dla sesji, a żaden klucz R2, tekst PDF ani identyfikator producenta nie trafia do wiadomości → AC-18, AC-21, AC-22
- [ ] Obserwuj gotową sesję od `queued` do `review_ready` → ekran odświeża postęp co pięć sekund, nie pokazuje przycisku omijającego analizę i automatycznie przechodzi do przeglądu po `review_ready` → AC-4, AC-11, AC-15
- [ ] Porównaj wiersz produktu przed analizą i po `review_ready` → poza metadanymi cyklu życia pozostaje pustym szkicem, a kandydaci żyją wyłącznie w tabelach `ai_*`; produkt zmienia się dopiero po decyzjach i późniejszym `applyAiExtraction` → AC-1, AC-11, AC-12, AC-13
- [ ] Przed oznaczeniem pełnej walidacji AC-3 podłącz i sprawdź zaplanowany izolowany etap `qpdf`, ClamAV, limit rozwiniętych strumieni, `pdftotext`, gitleaks i Presidio. Obecny etap wdraża walidację graniczną, sygnaturę, trailer, szyfrowanie, rozmiar, SHA 256 i liczbę stron, ale nie zastępuje tych skanerów → AC-3, AC-18, AC-20

## Stan obecnego wdrożenia

Warstwa przeglądu jest podłączona do Neon dla adresu z `sessionId`. Decyzje, potwierdzenia problemów oraz bramka przeglądu korzystają z bazy. Nazwy wszystkich pól przeglądu pochodzą z katalogu i mają kompletne tłumaczenia PL, EN, DE oraz NL; techniczne ścieżki pól nie są prezentowane użytkownikowi. Adaptery Azure OpenAI i Azure Document Intelligence korzystają z Microsoft Entra ID i przeszły test połączenia na prawdziwych usługach deweloperskich. Worker TypeScript spina pobranie źródła z prywatnego R2, Document Intelligence, Azure OpenAI, normalizację i atomowy zapis wyniku. Używa dzierżawy z fencing tokenem, heartbeat, trzech prób i kontroli `cancel_requested`. Adapter Azure Functions Node v4 odbiera komunikaty z Service Bus, ręcznie je rozlicza, planuje retry i przenosi wynik po wyczerpaniu prób do DLQ. Infrastruktura deweloperska jest wdrożona w Azure: host Function App działa, trigger `houseImportServiceBus` jest zarejestrowany, a wszystkie trzy referencje Key Vault mają stan `Resolved`. Kontrolowany smoke test przeszedł pełną ścieżkę od prywatnego R2 przez Service Bus i worker do Neon, zakończył sesję jako `review_ready` i potwierdził brak zmiany produktu. Bicep definiuje Function App, kolejkę, Managed Identity, role, storage wykonawczy oraz monitoring. Wynik ekstrakcji jest konsolidowany według pełnej tożsamości pola i ma atomowy zapis kandydatów, dowodów oraz problemów połączony ze zmianą sesji na `review_ready`. Żaden z tych zapisów nie zmienia produktu. Bezpieczny upload użytkownika z kwarantanną i ClamAV, test retry i DLQ oraz atomowe zastosowanie zaakceptowanych decyzji do całego szkicu pozostają wyłączone. Kroki zależne od tych części mają adnotację `po dalszej implementacji`.

## Worker i odporność przetwarzania

- [x] Komunikat workera przyjmuje wyłącznie `sessionId`; nadmiarowe albo niepoprawne dane są odrzucane przed dostępem do bazy → zweryfikowano testem jednostkowym 2026-09-21 → AC-20, AC-21
- [x] Aktywna dzierżawa blokuje równoległe przetwarzanie, `attempt_count` jest fencing tokenem wszystkich zapisów, heartbeat jest odnawiany co 30 sekund, a dzierżawa może zostać przejęta po 180 sekundach bez heartbeat → zweryfikowano implementacją warunkowych zapisów i testem podwójnego dostarczenia 2026-09-21 → AC-21
- [x] Błąd przejściowy zwalnia sesję do `queued`, zachowuje bezpieczny kod błędu i zwraca opóźnienie 30 sekund po pierwszej oraz 2 minuty po drugiej próbie. Trzecia nieudana próba kończy sesję kodem `AI_IMPORT_RETRIES_EXHAUSTED`; ręczne ponowienie zeruje budżet prób → zweryfikowano testami jednostkowymi i kontrolą typów 2026-09-21 → AC-10, AC-15, AC-21
- [x] `cancel_requested` jest sprawdzane na granicach dokumentów i etapów. Worker przechodzi do `cancelled`, a spóźniony zapis nie przechodzi kontroli fencing tokenu → zweryfikowano testem jednostkowym 2026-09-21 → AC-15, AC-23
- [x] Prywatny klient R2 używa oddzielnych poświadczeń ograniczonych do bucketa PDF, endpointu UE, ograniczenia 25 MB i pełnego odczytu strumienia przed analizą → 4 testy jednostkowe przeszły 2026-09-21 → AC-3, AC-17, AC-18
- [x] Adapter Azure Function odwzorowuje `retryAfterSeconds` na `scheduleMessages`, kończy bieżący komunikat dopiero po poprawnym zaplanowaniu następnego i wywołuje `deadletter` dla błędu deterministycznego albo wyczerpania prób → 6 testów jednostkowych, TypeScript, ESLint i bundle przeszły 2026-09-21 → AC-21, AC-25
- [x] Bicep definiuje Service Bus Standard z `maxDeliveryCount = 3`, TTL, wykrywaniem duplikatów i DLQ, Function App Flex Consumption, Managed Identity, bezkluczowy storage, Application Insights oraz role do kolejki, Key Vault, Document Intelligence i Azure OpenAI → implementacja 2026-09-21 → AC-19, AC-21, AC-25
- [x] `az bicep build --file infra/azure/house-import/main.bicep` → szablon kompiluje się bez błędów po instalacji Bicep CLI i usunięciu błędnej lokalnej zmiennej `REQUESTS_CA_BUNDLE`; walidacja TLS pozostała włączona → zweryfikowano 2026-09-21 → AC-19, AC-21, AC-25
- [x] Wdrożenie Bicep i paczki Function App zakończyło się powodzeniem; host ma stan `Running`, trigger `houseImportServiceBus` jest widoczny, a referencje `DATABASE_URL`, `AI_PRIVATE_R2_ACCESS_KEY_ID` i `AI_PRIVATE_R2_SECRET_ACCESS_KEY` mają stan `Resolved`. Ustawiono `keyVaultReferenceIdentity` na User Assigned Managed Identity → zweryfikowano 2026-09-21 → AC-19, AC-21, AC-25
- [x] `npm run smoke:house-import-worker` dla `_docs/treevia-do-testów.pdf` → Service Bus uruchomił wdrożony worker, sesja przeszła `queued` → `extracting/document_intelligence` → `extracting/model_extraction` → `review_ready`, zapisała 52 kandydatów, 56 dowodów i 4 problemy w pierwszej próbie, a hash produktu przed i po pozostał identyczny (`productUnchanged: true`) → zweryfikowano 2026-09-21 → AC-4, AC-5, AC-7, AC-9, AC-19, AC-21, AC-25
- [x] Końcowe testy wdrożonego workera dla korpusu PDF potwierdziły deterministyczną normalizację wariantów i cen. NORD, sesja `ab9fb962-25c1-4970-a16e-142eca78bc9f`, połączył nazwy pakietów do `BASIC` i `ALL-IN`, naprawił zgubione separatory kwot 454 149 i 536 195 PLN oraz nie utworzył ceny maksymalnej. MINI, sesja `7476c6c1-a9ca-4134-852d-13a4ee19743f`, zachował dwa pakiety i dwie niezależne ceny „od”, bez ceny maksymalnej. BARN po dodatkowej ochronie przed błędnym oznaczeniem kwoty brutto, sesja `7276deb5-84fc-49e5-a6a9-e96533ac5828`, zachował wyłącznie 746 055 PLN netto dla BASIC i 873 610 PLN netto dla ALL-IN, bez kwot brutto i bez pomocniczego wariantu montażu. Wszystkie sesje osiągnęły `review_ready` w pierwszej próbie i miały `productUnchanged: true` → zweryfikowano 2026-09-21 → AC-4, AC-5, AC-7, AC-9, AC-19, AC-20, AC-21, AC-25
- [ ] Wymuś błąd przejściowy i potwierdź zaplanowane retry, następnie wyczerp próby i potwierdź końcowy komunikat w DLQ → AC-21, AC-25
- [ ] Uruchom dwie instancje workera na tej samej sesji w środowisku integracyjnym → tylko jedna otrzymuje dzierżawę i zapisuje wynik → AC-21
- [ ] Przerwij instancję po zapisaniu heartbeat, odczekaj ponad 180 sekund i uruchom następną → nowa instancja przejmuje sesję, a stary fencing token nie może wykonać zapisu → AC-21, AC-23

## Połączenie z Azure

- [x] `npm run check:azure-ai -- "flow-klienta-i-producenta.pdf"` → Azure OpenAI przyjął żądanie przez Microsoft Entra ID dla wdrożenia `gpt-5-mini-global-dev`, model `gpt-5-mini`, wersja `2025-08-07` → zweryfikowano 2026-09-20
- [x] Ten sam test → Azure Document Intelligence `prebuilt-layout`, API `2024-11-30`, przeanalizował 8 stron i wykrył język `pl` → zweryfikowano 2026-09-20
- [x] Test nie wypisał treści PDF ani tokenów uwierzytelniających; raport zawierał wyłącznie metadane usług → zweryfikowano 2026-09-20
- [x] Ekstrakcja dzieli wynik `prebuilt-layout` na ograniczone paczki, nie generuje opisów ani FAQ, ogranicza dowód do jednego krótkiego cytatu i adaptacyjnie dzieli paczkę po `max_output_tokens` → 5 testów jednostkowych, TypeScript, ESLint i build przeszły 2026-09-20
- [x] `npm run check:house-import` dla `_docs/treevia-do-testów.pdf` → `ok: true`, 14 stron, 77 kandydatów przed konsolidacją i 7 problemów → zweryfikowano 2026-09-20
- [ ] Ponów `npm run check:house-import` po konsolidacji → raport zawiera `consolidatedCandidateCount`, `conflictCount` i `consolidatedEvidenceCount`, a pozostałe dane testu TREEVIA nadal kończą się `ok: true`. Dwie próby 2026-09-20 zatrzymały się wcześniej na przejściowym `AZURE_DOCUMENT_ANALYSIS_FAILED` z `retryable: true` → AC-5, AC-7, AC-9, AC-20
- [ ] Ten sam test przy zależnym rekordzie bez jednoznacznego wariantu → import kończy się `ok: true`, zachowuje kandydata i raportuje `VARIANT_ASSIGNMENT_REQUIRED` zamiast odrzucać pozostałe dane → AC-7, AC-9, AC-12, AC-13
- [ ] TREEVIA podaje 454 149 PLN netto i 490 481 PLN brutto → przy atrapowym kursie 4,5000 PLN za 1 EUR kandydat zachowuje 454 149 PLN jako źródło, ma `priceMinCents = 10092200`, `priceMaxCents = null`, `product.currency = EUR` i kompletny snapshot kursu; brutto nie jest zapisywane ani wyliczane → AC-5
- [ ] Kurs EBC jest niedostępny albo starszy niż siedem dni → cena nie jest automatycznie stosowana, a sesja raportuje `FX_RATE_UNAVAILABLE` → AC-5, AC-10
- [ ] Ponownie otwórz gotową sesję po publikacji nowego kursu → przeliczona cena i snapshot kursu nie zmieniają się; nowy kurs wymaga nowej analizy → AC-5, AC-14
- [ ] Przed wdrożeniem produkcyjnym zastąp deweloperskie wdrożenie OpenAI `GlobalStandard` wariantem zgodnym z wymaganiami rezydencji danych projektu; obecny test potwierdza integrację deweloperską, nie gotowość produkcyjną

## UI i ręczna weryfikacja

- [x] Każde pole katalogu ma etykietę PL, EN, DE i NL, komponent używa aktywnego locale także do liczb, waluty, daty, pochodzenia i pewności, a techniczny `fieldPath` nie jest wyświetlany → 6 testów katalogu i komponentu, TypeScript oraz ESLint przeszły 2026-09-21 → AC-6, AC-11
- [x] Pola wariantu są grupowane według pełnej tożsamości encji, a pola kosztów i harmonogramu według `parentEntityKey`. BASIC i ALL-IN mogą należeć do tego samego kanonicznego standardu `deweloperski` bez tworzenia fałszywego konfliktu między pakietami. Bez jawnych nazw pakietów model tworzy jedną opcję dla standardu → testy grupowania, bramki i komponentu przeszły 2026-09-21 → AC-7, AC-9, AC-11, AC-12, AC-13
- [x] Każdy pokój ma osobną encję obejmującą nazwę, powierzchnię, funkcję i antresolę. Tożsamość uwzględnia wersję układu, kondygnację, stronę rzutu i pozycję w tabeli, więc pokoje z dwóch pięter na jednej stronie oraz z alternatywnych rzutów nie kolidują. Ekran grupuje pola w osobne sekcje pomieszczeń → testy ekstrakcji i grupowania przeszły 2026-09-21 → AC-5, AC-7, AC-9, AC-11
- [ ] Otwórz `/pl/producer/panel/project/import?sessionId=<własna sesja>` jako właściciel → ekran pokazuje stan, dokumenty, kandydatów, dowody i wcześniejsze decyzje zapisane w Neon → AC-4, AC-7, AC-11, AC-15
- [ ] W aktywnej sesji obserwuj ekran przez co najmniej dwa cykle odpytywania → postęp odświeża się bez przeładowania ręcznego → AC-4, AC-15
- [ ] Zmień stan sesji na `review_ready`, `failed`, `cancelled` lub `applied` → okresowe odpytywanie zatrzymuje się i ekran pokazuje właściwy stan → AC-4, AC-15
- [ ] Wybierz kandydata pola → decyzja zapisuje się, po ponownym otwarciu strony nadal jest wybrana → AC-11, AC-12
- [ ] Otwórz tę samą sesję w dwóch kartach, zapisz dwie decyzje na tej samej wersji → druga karta dostaje bezpieczny konflikt wersji i nie nadpisuje pierwszej decyzji → AC-11, AC-12, AC-14
- [ ] Utwórz dwa warianty z tym samym `fieldPath`, ale innymi `entityKey` → wybór w jednym wariancie nie zmienia drugiego → AC-7, AC-12, AC-13
- [ ] Utwórz pozycje zależne z tym samym `entityKey`, ale różnymi `parentEntityKey` → każda pozycja pozostaje przypisana do właściwego wariantu → AC-7, AC-12, AC-13
- [ ] Pozostaw konflikt bez decyzji → bramka pokazuje `UNRESOLVED_CONFLICT` i nie pozwala zastosować wyniku → AC-9, AC-12
- [ ] Pozostaw wartość o niskiej pewności bez decyzji → bramka pokazuje `LOW_CONFIDENCE_UNREVIEWED` → AC-8, AC-12
- [ ] Potwierdź problem nieodczytanej strony → potwierdzenie pozostaje po odświeżeniu, a `DOCUMENT_ISSUE_UNACKNOWLEDGED` znika tylko dla tego problemu → AC-10, AC-12
- [ ] Zbuduj rekord zależny bez istniejącego wariantu nadrzędnego → bramka pokazuje `INVALID_ENTITY_GRAPH` → AC-7, AC-12, AC-13
- [ ] Otwórz sesję producenta A jako producent B → odpowiedź jest nierozróżnialna od braku zasobu i nie ujawnia stanu sesji → AC-16
- [ ] Sprawdź obsługę klawiaturą pól, dowodów, konfliktów i potwierdzeń → fokus jest widoczny, kolejność logiczna, a znaczenie nie zależy tylko od koloru → AC-11
- [ ] Sprawdź konsolę, Sentry i PostHog po błędzie zapisu decyzji → nie ma nazwy pliku, fragmentu PDF, wartości pola ani parametrów SQL → AC-22
- [ ] Po dalszej implementacji wgraj tekstowy PDF oraz skan → oba przechodzą pełną walidację, a skan trafia do OCR → AC-2, AC-3, AC-5
- [ ] Po dalszej implementacji zastosuj kompletny wynik → zmienia się wyłącznie szkic, a błąd dowolnego zapisu wycofuje całą operację → AC-13

## Baza danych i komendy

- [ ] `npx drizzle-kit check` → historia migracji jest spójna → AC-7, AC-12, AC-13, AC-16, AC-17, AC-21
- [ ] `npm run db:migrate` → migracja `0024_wandering_baron_zemo.sql` kończy się powodzeniem na docelowej gałęzi Neon → AC-7, AC-10, AC-12, AC-13, AC-14, AC-16, AC-17, AC-21
- [ ] Odczytaj `information_schema.tables` dla `ai_%` → istnieją sesje, dokumenty źródłowe, kandydaci, dowody, snapshoty, decyzje, tłumaczenia, problemy, potwierdzenia, obserwacje, usage oraz audyt wsparcia → AC-7, AC-10, AC-14, AC-17, AC-21
- [ ] Odczytaj `information_schema.routines` → istnieją `save_ai_field_decision` oraz `get_ai_review_gate` → AC-12, AC-14, AC-16
- [ ] Spróbuj utworzyć drugą aktywną sesję tego samego producenta → częściowy indeks unikalny odrzuca zapis → AC-24
- [ ] Zapisz dwa snapshoty tej samej pełnej tożsamości z wartościami `NULL` w kluczach encji → ograniczenie `NULLS NOT DISTINCT` odrzuca duplikat → AC-14
- [ ] Spróbuj zaakceptować kandydata z innej sesji → `save_ai_field_decision` odrzuca zapis → AC-16, AC-21
- [ ] Uruchom równoległe zapisy z tym samym `expectedDecisionRevision` → dokładnie jeden zapis przechodzi → AC-12, AC-14
- [x] `npm test -- --run lib/ai/house-project-extraction-persistence.test.ts lib/ai/house-project-extraction.test.ts` → 18 testów przechodzi; regresja obejmuje pełną tożsamość pola, scalanie identycznych wartości i dowodów, zachowanie konfliktów, idempotentny retry oraz odrzucenie niedozwolonego przejścia → zweryfikowano 2026-09-20 → AC-7, AC-9, AC-21
- [x] `npm test -- --run lib/ai/house-project-extraction.test.ts lib/house-ai-rules.test.ts lib/house-ai-review-groups.test.ts components/producent/HouseAiFieldReview.test.tsx` → 40 testów przechodzi; regresja rozdziela nazwę pakietu od kanonicznego standardu PL, EN, DE i NL, grupuje pola według wariantu i pokoju, odrzuca 82 046 PLN opisane jako różnica oraz zachowuje 454 149 PLN jako cenę BASIC → zweryfikowano 2026-09-21 → AC-5, AC-6, AC-7, AC-9, AC-11, AC-12
- [x] Regresja cen odrzuca brutto błędnie opisane przez model jako netto, pozostawia `priceMaxCents` puste bez jawnego górnego progu, zachowuje prawdziwy jawny zakres oraz naprawia zgubiony separator dziesiętny na podstawie podpisanego dowodu. Regresja pokojów rozdziela te same lokalne klucze na różnych stronach rzutu → zweryfikowano 2026-09-21 → AC-5, AC-7, AC-9, AC-20
- [x] Pięć plików `_docs/*-do-testów.pdf` tworzy jawny korpus referencyjny: Herdla i Trolltind rozdzielają kondygnacje oraz nie mapują `stanu zero` na `surowy zamknięty`; TREEVIA NORD i BARN zachowują osobne pakiety BASIC/ALL-IN bez fałszywej ceny maksymalnej; TREEVIA MINI rozdziela dwie alternatywne wersje parteru i traktuje antresolę jako jeden pokój. Techniczne warianty A/B ściany, ceny brutto także błędnie oznaczone przez model jako netto, różnice pakietów, montaż orientacyjny i opcje za m² są wykluczone z cen wariantów. Kontrolowany pojedynczy retry obejmuje zarówno nieparsowalną odpowiedź modelu, jak i odpowiedź odrzuconą przez deterministyczną normalizację → pełny zestaw regresyjny ekstrakcji, persystencji, workera, korpusu, grupowania, bramki i komponentu → 68 testów przechodzi; TypeScript, ESLint i bundle workera przechodzą 2026-09-21 → AC-5, AC-7, AC-9, AC-11, AC-12, AC-20, AC-21
- [x] `npm test -- --run lib/ai/house-import-worker.test.ts lib/storage/ai-private-r2-client.test.ts lib/ai/house-project-extraction-persistence.test.ts` → 20 testów przechodzi; regresja obejmuje pełny przebieg orkiestratora, anulowanie, oba opóźnienia retry, wyczerpanie prób, błąd deterministyczny, częściowy problem dokumentu, podwójne dostarczenie, prywatny odczyt R2 i zapis z fencing tokenem → zweryfikowano 2026-09-21 → AC-10, AC-15, AC-20, AC-21, AC-23
- [x] `npm test -- --run azure-functions/house-import/src/house-import-message-handler.test.ts lib/ai/house-import-worker.test.ts lib/storage/ai-private-r2-client.test.ts lib/ai/house-project-extraction-persistence.test.ts` → 26 testów przechodzi; obejmuje dodatkowo ręczne rozliczanie Service Bus, retry przed `complete`, błąd planowania, DLQ i odrzucenie niepoprawnego komunikatu → zweryfikowano 2026-09-21 → AC-20, AC-21, AC-25
- [x] `npm run build:house-import-function` → bundle Azure Function dla Node 22 powstaje poprawnie → zweryfikowano 2026-09-21
- [x] Paczka wdrożeniowa nie zawiera zależności `file:` prowadzącej z `node_modules` do katalogu repozytorium; test regresyjny blokuje ponowne utworzenie rekurencyjnego junction na Windows, a publikacja przez Azure Functions Core Tools zakończyła się powodzeniem → zweryfikowano 2026-09-21
- [x] `npx tsc --noEmit --pretty false` oraz ESLint zmienionych modułów workera, zapisu i R2 → bez błędów 2026-09-21
- [ ] `$env:RUN_DATABASE_INTEGRATION_TESTS='1'; npm test -- --run lib/ai/house-project-extraction-persistence.integration.test.ts` → zapisuje kandydata, dwa dowody i problem w jednym poleceniu SQL, zmienia sesję z `normalizing` na `review_ready`, drugi przebieg nie duplikuje danych, a nazwa produktu pozostaje bez zmian. Lokalna próba 2026-09-20 została zablokowana przez `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; nie wyłączaj walidacji TLS, ponów w środowisku z poprawnym łańcuchem CA → AC-7, AC-9, AC-21
- [ ] `npm test -- --run lib/house-ai-field-catalog.test.ts lib/house-ai-rules.test.ts lib/house-ai-schemas.test.ts components/producent/HouseAiFieldReview.test.tsx` → wszystkie testy przechodzą → AC-5, AC-7, AC-8, AC-9, AC-11, AC-12, AC-20
- [x] `npm run build` → produkcyjny build Next.js 16.3.0 przechodzi → ponownie zweryfikowano 2026-09-21 → AC-1, AC-11, AC-15

## Źródła wartości

- [ ] Zaloguj dwóch producentów i utwórz sesję każdym kontem → `producerId` zawsze pochodzi z Auth.js i relacji użytkownika, nigdy z formularza → AC-16
- [ ] Rozpocznij import → `productId` wskazuje nowy szkic `family=dom`, należący do zalogowanego producenta → AC-1
- [ ] Porównaj ścieżki zapisanych kandydatów z `HOUSE_AI_FIELD_CATALOG` → żadna ścieżka spoza katalogu nie przechodzi walidacji → AC-5, AC-20
- [ ] Sprawdź nową sesję → `baseLocale` ma wartość `pl` → AC-6
- [ ] Po dalszej implementacji przetwórz dokumenty PL, EN, DE i NL → język dokumentu pochodzi z Document Intelligence, a język spoza listy tworzy bezpieczny problem → AC-5, AC-19
- [ ] Sprawdź nową sesję → `targetLocales` zawiera dokładnie `en`, `de`, `nl` → AC-6
- [ ] Rozpocznij sześć analiz w kroczącym oknie 24 godzin → szósta próba jest odrzucona na podstawie `ai_extraction_session.created_at` → AC-24
- [ ] Po dalszej implementacji podmień rozszerzenie, MIME i zawartość pliku → typ, rozmiar, strony i SHA 256 pochodzą z analizy binarnej serwera → AC-2, AC-3
- [ ] Po dalszej implementacji użyj strony o słabej jakości → tekst strony i jakość OCR pochodzą z Document Intelligence dla właściwego numeru strony → AC-5, AC-7, AC-8
- [ ] Po dalszej implementacji zwróć nieznaną ścieżkę w odpowiedzi modelu → przypięty schemat ekstrakcji odrzuca wynik → AC-5, AC-20
- [ ] Przetwórz dwa rekordy powtarzalne → `entity_key` jest stabilny między kandydatem, snapshotem, decyzją i tłumaczeniem → AC-7, AC-13
- [ ] Przetwórz pozycję kosztową i etap harmonogramu → `parent_entity_key` pochodzi z jawnej relacji wyniku i wskazuje wariant tej samej sesji → AC-7, AC-13
- [ ] Podaj wartości z różnymi jednostkami i formatami → wartość znormalizowana pochodzi z reguł deterministycznych oraz Zod → AC-5, AC-20
- [ ] Sprawdź kandydatów extracted, inferred, generated i translated → pochodzenie wynika z reguły pipeline, a nie dowolnej deklaracji modelu → AC-6, AC-7
- [ ] Zmień jakość OCR, liczbę dowodów, konflikt i wynik walidacji → poziom pewności zmienia się zgodnie z funkcją regułową → AC-8
- [ ] Otwórz dowód kandydata → dokument, strona i fragment pochodzą z wyniku Document Intelligence → AC-7
- [ ] Podaj dwie różne wartości tej samej pełnej tożsamości → konflikt wynika z porównania wartości znormalizowanych → AC-9
- [ ] Zmień postęp zapisany przez worker bez zmiany odpowiedzi modelu → UI pokazuje wartość wynikającą z ukończonych etapów → AC-4
- [ ] Wymuś błąd dostawcy → UI pokazuje wyłącznie kod z zamkniętej listy, bez surowego komunikatu → AC-10, AC-22
- [ ] Potwierdź problem dokumentu → źródłem potwierdzenia jest jawna akcja producenta zapisana w `ai_document_acknowledgement` → AC-10
- [ ] Po dalszej implementacji zmień zaakceptowaną wartość polską → tłumaczenia powstają ponownie z najnowszej decyzji i zachowują pełną tożsamość encji → AC-6, AC-7
- [ ] Zmień ręcznie pole produktu po utworzeniu snapshotu → różny hash tworzy `PRODUCT_FIELD_CHANGED` → AC-14
- [ ] Porównaj UI z wynikiem `get_ai_review_gate` → gotowość zastosowania pochodzi wyłącznie z funkcji bazodanowej → AC-12
- [ ] Po dalszej implementacji spróbuj zastosować nieważną wartość → końcowe pola przechodzą ponownie istniejące schematy produktu → AC-13
- [ ] Po dalszej implementacji zastosuj dwa warianty z rekordami zależnymi → docelowe UUID powstają z mapy `entity_key`, a rekordy zależne trafiają przez `parent_entity_key` → AC-13
- [ ] Po dalszej implementacji wyłącz dostęp do aktualnego cennika Azure → koszt jest oznaczony jako niedostępny, nigdy jako zero → AC-24

## Pokrycie kryteriów akceptacji

AC-4, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-14, AC-15, AC-16, AC-20, AC-21, AC-22, AC-23 i AC-25 mają kontrole dla obecnego podpięcia bazy, wdrożonego workera i infrastruktury Azure. AC-1 do AC-3, AC-5, AC-6, AC-13 oraz AC-17 do AC-25 pozostają częściowo zależne od bezpiecznego uploadu do prywatnego R2, kontrolowanego testu całej kolejki, pełnej funkcji zastosowania, retencji, monitoringu i rollout.
