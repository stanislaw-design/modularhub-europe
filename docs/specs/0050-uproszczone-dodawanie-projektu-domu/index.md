# 0050. Uproszczone dodawanie projektu domu, ręczne dane plus celowana pomoc AI

**Status**: Proposed
**Data**: 2026 09 22
**Tryb**: ENHANCEMENT
**Zakres**: panel producenta, kreator nowego projektu i edycja produktu (rodzina `dom`), Azure OpenAI (ponowne użycie), Cloudflare R2

## Summary

Zamiast prosić producenta o cały PDF oferty i próbować automatycznie wypełnić wszystkie pola (spec 0047), nowy kreator zaczyna od kilku pól wpisanych ręcznie. AI pomaga tylko w dwóch wąskich miejscach: rozpoznaje układ pomieszczeń z wgranych rzutów i wydobywa dane standardu/wariantu z dowolnego wgranego materiału (tekst, tabela, zrzut ekranu, obraz albo dokument). Producent zawsze sprawdza i poprawia wynik wprost w formularzu, bez osobnego ekranu przeglądu z dowodami. Ten spec zastępuje spec 0047 w całości: cała infrastruktura tamtego pipeline'u (Azure Document Intelligence, Service Bus, tabele sesji i kandydatów) zostaje usunięta razem z jej danymi.

## Kontekst

> ⚠️ Uwaga wstępna: ten temat obejmuje siedem powiązanych obszarów kreatora (dane podstawowe, rozpoznawanie pomieszczeń, standardy, pola techniczne, wymagania klienta, dokumenty, tłumaczenia). Trzymam je w jednym spec, bo dzielą jeden build (jedna zmiana `ProjectWizard`) i jedną decyzję (ręczne dane plus celowana AI zamiast pełnego importu AI). Kolejność zadań w Build plan pozwala jednak budować i wdrażać je osobno, jeśli praca okaże się większa niż zakładano.

Spec 0047 miał status "In Progress": migracje 0024 i 0027 (tabele `ai_extraction_session` i dwanaście pokrewnych, funkcje `apply_ai_extraction`, `save_ai_field_decision`, `get_ai_review_gate`) są już zastosowane na żywej bazie Neon, a znaczna część kodu fasady (`HousePdfImportFlow`, `HouseAiReviewGate`, `HouseAiFieldReview`, cały `lib/house-ai-*.ts`, `lib/ai/house-project-extraction.ts` i pokrewne pliki) istnieje w repo.

Sprawdzone bezpośrednio na żywej bazie przy pisaniu tego spec: wejście "Uzupełnij z PDF" (`/producer/panel/project/import`) jest dziś odblokowane dla każdego producenta, żadna flaga `AI_IMPORT_ENABLED` nie istnieje w kodzie (to był błędny zapis we wcześniejszej wersji tego dokumentu, poprawiony po cross checku). Na żywej bazie są realne wiersze: 20 sesji `ai_extraction_session`, 25 dokumentów `document` z `purpose = 'ai_source_pdf'`, 92 wiersze `ai_field_decision`. Potwierdzone z inżynierem: to jego własne dane testowe (widoczne też jako pliki `_docs/*-do-testów.pdf` w git status), bezpieczne do usunięcia razem z tabelami, bez potrzeby eksportu. Migracja usuwająca (AC-40) mimo to jest budowana tak, jakby dane mogły być realne: zweryfikowana najpierw na tymczasowej gałęzi Neon, z jawnym zapytaniem liczącym wiersze przed usunięciem.

W praktyce PDF oferty producenta rzadko da się bezpiecznie i w pełni zautomatyzować: cena bywa niejednoznaczna (netto kontra brutto, różne waluty), układ dokumentu różni się między producentami, a dziewięć pól technicznych zostało już wcześniej uznanych za zbyt szczegółowe do osobnego formularza (spec 0049). Pełny pipeline (OCR, ekstrakcja całego dokumentu, dowody per pole, konflikt między dokumentami, tłumaczenie na cztery języki) był zaprojektowany pod ten trudny przypadek i przez to jest ciężki operacyjnie (Azure Document Intelligence, Service Bus, worker, trzynaście nowych tabel) w stosunku do korzyści.

Nowe podejście zawęża AI do dwóch miejsc, gdzie ręczne przepisywanie jest najbardziej uciążliwe: układ pomieszczeń z rzutu i zestaw standardów z cennika. Reszta danych (nazwa, opis, metraż, pola techniczne, wymagania wobec klienta) jest krótka i lepiej wpisana wprost, bez pośrednika AI.

To rozszerzenie zakłada też jedną zmianę w istniejącej, współdzielonej funkcji `lib/ai/product-translation.ts` (spec 0028): dziś zakłada ona, że tekst źródłowy jest zawsze polski. Rozpoznawanie układu pomieszczeń może zwrócić nazwę w języku rzutu (polski, angielski, niemiecki albo niderlandzki), nie tylko po polsku, więc funkcja generująca pozostałe języki musi umieć wykryć rzeczywisty język źródłowy zamiast zakładać go na sztywno. To założenie jest jawnie odnotowane tu i w Follow up, bo dotyka kodu współdzielonego z innymi funkcjami (backfill tłumaczeń, spec 0028).

Drugie takie założenie: skonsolidowany etap tłumaczeń (AC-28 do AC-34) zastępuje dzisiejsze zakładki językowe w krokach kreatora, które są **wspólne** dla nowego projektu (`ProjectWizard`) i edycji istniejącego produktu (`ProductEditWizard`, patrz `components/producent/ProductEditWizard.tsx`). Nie da się usunąć zakładek tylko z jednego kreatora bez duplikowania tych kroków, więc nowy etap tłumaczeń trafia do obu, mimo że dwie zdolności AI ekstrakcji (rozpoznawanie pomieszczeń, standardy) zostają wyłącznie w nowym projekcie (AC-41).

## Requirements

**Historie użytkownika**:
- Jako producent, chcę wpisać kilka najważniejszych danych projektu ręcznie, żeby szybko zacząć, bez czekania na analizę całego PDF.
- Jako producent, chcę wgrać rzuty i dostać gotową propozycję listy pomieszczeń do sprawdzenia, żeby nie przepisywać jej ręcznie z obrazka.
- Jako producent, chcę wkleić albo wgrać cennik w dowolnej formie i dostać gotowe wpisy standardów do sprawdzenia, zamiast wpisywać każdy standard od zera.
- Jako producent, chcę zebrać w jednym miejscu wszystko, co musi zapewnić klient niezależnie od standardu, żeby nie powtarzać tego w opisie każdego wariantu.
- Jako producent, chcę zobaczyć i poprawić wszystkie tłumaczenia projektu na jednym ekranie na końcu, zamiast przełączać zakładki językowe przy każdym polu, także wtedy gdy poprawiam już opublikowany produkt.
- Jako klient, chcę zobaczyć na karcie projektu, co muszę zapewnić sam, oraz czy standard ma stałą cenę czy wycenę indywidualną, żeby ocenić pełny koszt, nie tylko cenę domu.

**Kryteria akceptacji** (kontrakt, każde osobno sprawdzalne):

*Dane podstawowe*
- **AC-1**: Krok "Dane podstawowe" zostaje bez zmian względem dzisiejszego kroku (nazwa, opis, powierzchnia użytkowa, wymiary zewnętrzne, liczba kondygnacji, liczba sypialni, rodzaj domu, kraj, kategoria, układ pomieszczeń), poza jednym dodatkiem: polem kondygnacji (`floorLevel`) przy każdej pozycji układu pomieszczeń (AC-8).
- **AC-2**: Krok "Dane podstawowe" (w obu kreatorach, AC-31) nie pokazuje już osobnych zakładek językowych dla nazwy ani opisu. Nazwa jest jedna, wspólna dla wszystkich języków (jak dziś). Opis jest wpisywany raz, tłumaczenia dochodzą w nowym, jednym etapie (AC 28 do AC 34).

*Rozpoznawanie układu pomieszczeń*
- **AC-3**: Rzuty można wgrać jako obraz (JPEG, PNG, WebP, jak dziś) albo jako dokument PDF (nowość), do 10 MB na plik, bez sztywnego limitu liczby wgranych plików.
- **AC-4**: Rozpoznawanie jest uruchamiane z kroku "Dane podstawowe" (nie z kroku plików, bo tam żyje `roomLayout`), na maksymalnie pięciu wybranych, już wgranych rzutach naraz (limit kosztu i czasu jednego wywołania modelu). Producent wybiera, które rzuty wysłać do rozpoznania, jeśli wgrał więcej niż pięć.
- **AC-5**: Wynik to proponowana lista pomieszczeń (nazwa, powierzchnia, kondygnacja: parter, piętro, poddasze).
- **AC-6**: Każda rozpoznana wartość ma prosty znacznik pewności: "niska", gdy wartość jest dedukowana zamiast wprost odczytana, gdy pole jest nieobecne w źródle, albo gdy model nie zwraca jej jako swojej najpewniejszej odpowiedzi; w każdym niejasnym przypadku domyślnie "niska". "Wysoka" tylko gdy wartość jest wprost i jednoznacznie odczytana z rzutu. Znacznik jest pokazany wprost przy polu w formularzu. Żaden dokument, strona ani fragment dowodowy nie jest zapisywany w bazie.
- **AC-7**: Scalanie z listą już wpisaną w kreatorze dopasowuje pozycje po znormalizowanej nazwie i zbliżonej powierzchni. Dopasowana istniejąca pozycja o innej wartości dostaje tylko znacznik "do sprawdzenia", nigdy nie jest cicho nadpisana. Niedopasowana pozycja jest dodawana jako nowa. Powtórne uruchomienie rozpoznawania na tych samych albo nowych rzutach nie tworzy duplikatów już zaakceptowanych pozycji.
- **AC-8**: Nowe pole `floorLevel` zastępuje dzisiejsze `isMezzanine`. Przy odczycie istniejącego produktu `isMezzanine: true` jest jednorazowo, na poziomie aplikacji (nie migracją bazy, bo `room_layout` jest jsonb), odczytywane jako `floorLevel: "poddasze"`; `isMezzanine` przestaje być zapisywane przez nowy kreator.
- **AC-9**: Nazwa pomieszczenia wraca w języku źródłowym rzutu, jeżeli ten język to polski, angielski, niemiecki albo niderlandzki. W przeciwnym razie wraca po angielsku.
- **AC-10**: Rozpoznawanie jest synchroniczne: producent czeka na wynik w tym samym żądaniu, bez sesji, kolejki ani workera w tle.
- **AC-11**: Sam plik rzutu zostaje zapisany jako załącznik produktu, dokładnie tak jak dziś (rzuty są już trwałym elementem karty produktu).
- **AC-12**: Rozpoznawanie nie tworzy żadnej nowej tabeli bazy danych. Wynik trafia bezpośrednio do stanu formularza kreatora i jest zapisywany dopiero razem z resztą kroku.

*Standardy i warianty*
- **AC-13**: Każdy standard jest osobnym wariantem (dzisiejszy `product_variant`) z: nazwą, ceną albo jawną flagą "wycena indywidualna" (`priceOnRequest`), opisem tego co zawiera standard, opisem elementów, które nie wchodzą w cenę (`excludedScope`).
- **AC-14**: Dane standardu można wpisać ręcznie albo wgrać materiał źródłowy: wolny tekst, wklejoną tabelę, zrzut ekranu, obraz albo dokument.
- **AC-15**: Wariant produktu ma dziś dokładnie trzy możliwe wartości standardu (`surowy-zamknięty`, `deweloperski`, `pod klucz`), każda co najwyżej raz aktywna na produkt. Każdy wydobyty standard dostaje proponowane dopasowanie do jednej z tych trzech wartości (z niskim znacznikiem pewności, jeśli niejednoznaczne); producent zawsze potwierdza albo poprawia to dopasowanie przed zapisem, nigdy nie jest ono zapisywane automatycznie. Czwarty i kolejny wydobyty standard nie może utworzyć nowego, czwartego wariantu: producent musi go połączyć z jedną z trzech istniejących wartości albo pominąć.
- **AC-16**: Jedno wywołanie rozpoznawania może zwrócić kilka proponowanych standardów naraz, jeżeli jeden materiał (na przykład tabela cennika) opisuje więcej niż jeden standard. Każdy trafia do osobnego przejrzenia, z osobną propozycją dopasowania z AC-15.
- **AC-17**: Materiał źródłowy wgrany do rozpoznawania standardów nie jest zapisywany nigdzie. Trafia tylko do jednorazowego wywołania AI i jest odrzucany zaraz po zwróceniu wyniku. Pole wgrywania materiału ma widoczną informację, że plik nie zostanie zapisany (żeby producent nie mylił go z trwałym wgrywaniem dokumentów w kroku plików, AC-25).
- **AC-18**: Przy sekcji standardów jest widoczna pomoc kontekstowa z przykładem oczekiwanych informacji.
- **AC-19**: Rozpoznane wartości są od razu edytowalne wprost w formularzu wariantu, z takim samym prostym znacznikiem pewności jak w AC-6.

*Minimalna specyfikacja techniczna*
- **AC-20**: Krok techniczny zbiera: źródło ogrzewania (lista z opcją "Inne" i własną wartością), rodzaj wentylacji (lista z opcją "Inna" i własną wartością), technologię konstrukcji (nowe pole, lista z opcją podania własnej wartości), gwarancję konstrukcyjną w latach (istniejące pole), efektywność energetyczną (opcjonalna, z jawną wartością "Nie podano").
- **AC-21**: Pole dotyczące uproszczonego pozwolenia (`simplifiedPermitEligible`) oraz gwarancji montażu (`installationWarrantyYears`) znikają z kreatora i ze strony klienta. Dane już zapisane w bazie zostają nietknięte, żadna migracja ich nie usuwa (ten sam wzorzec co spec 0049).
- **AC-22**: Dziewięć pól ukrytych wcześniej przez spec 0049 (`wallBuildUp`, `insulation`, `windowClass`, `fireResistance`, `windResistance`, `transportDimensions`, `craneRequirements`, `minPlotWidthM`, `serviceScopeDescription`) zostaje ukrytych bez zmian.

*Wymagania wobec klienta*
- **AC-23**: Nowa sekcja "Co musi zapewnić klient" istnieje raz na produkt, niezależnie od wybranego standardu. Ma gotowy katalog pozycji (fundament, przygotowanie działki, dojazd dla transportu, miejsce dla dźwigu, przyłącza, formalności, prace niewchodzące w zakres producenta) do zaznaczenia oraz pozwala dodać własne pozycje.
- **AC-24**: Opis tego, co nie wchodzi w cenę danego standardu (`excludedScope`, AC-13), zostaje osobnym, krótkim tekstem opisowym per standard i nie jest łączony z katalogiem z AC-23.

*Dokumenty*
- **AC-25**: Materiały produktu są rozdzielone według przeznaczenia: zdjęcia i wizualizacje do galerii (bez zmian), rzuty do rozpoznawania układu (AC-3), PDF specyfikacji technicznej do pobrania przez klienta (bez zmian, spec 0049), opcjonalny PDF sprzedażowy jako dodatkowe źródło informacji (nowość).
- **AC-26**: PDF sprzedażowy jest publicznie pobieralny z karty produktu, tym samym wzorcem co PDF specyfikacji (spec 0049): najwyżej jeden plik na produkt, wgranie nowego zastępuje poprzedni atomowo, producent może go usunąć bez wgrywania nowego.
- **AC-27**: PDF sprzedażowy i PDF specyfikacji zostają w języku, w jakim zostały wgrane. Nie są tłumaczone ani składane ponownie.

*Automatyczne tłumaczenia*
- **AC-28**: Nowy, pojedynczy etap "Tłumaczenia" tłumaczy zatwierdzone treści: opis projektu, opis standardu i opis elementów poza ceną (`scopeSummary`, `excludedScope`), nazwy pomieszczeń, własne pozycje sekcji "Co musi zapewnić klient", oraz pytania i odpowiedzi FAQ (`product_translation.faq`, dziś edytowane przez usuwane zakładki, patrz AC-2). Aktywne języki docelowe to angielski, niemiecki i niderlandzki (`en`, `de`, `nl`), źródłem jest polska treść wpisana przez producenta.
- **AC-29**: Etap czeka synchronicznie na wynik tłumaczenia, dopiero potem pokazuje ekran przeglądu wszystkich aktywnych języków naraz.
- **AC-30**: Producent może zaufać automatycznym tłumaczeniom i przejść dalej bez zmian, albo poprawić dowolny język przed publikacją.
- **AC-31**: Etap "Tłumaczenia" zastępuje zakładki językowe w obu miejscach, gdzie one dziś żyją: w kreatorze nowego projektu i w edycji istniejącego, opublikowanego produktu (`ProductEditWizard`), bo oba współdzielą te same komponenty kroków. Dwie zdolności ekstrakcji AI (rozpoznawanie pomieszczeń AC-4, standardy AC-14) zostają wyłącznie w kreatorze nowego projektu (AC-41).
- **AC-32**: Poza tym jednym etapem żaden krok żadnego z dwóch kreatorów nie pokazuje osobnych zakładek językowych.
- **AC-33**: Etap "Tłumaczenia" jest jedynym pisarzem `product_translation`/`product_variant_translation` dla treści, które sam wygenerował lub które producent w nim poprawił (te same kolumny własności `ai_generated_*`/`ai_translated_from_*` co dziś, spec 0028). Istniejący, asynchroniczny backfill `generateMissingProductTranslations` (wywoływany przez `after()` przy zapisie, spec 0028) zostaje jako siatka bezpieczeństwa wyłącznie dla pól, które nie mają żadnej wartości w danym języku; nigdy nie nadpisuje treści zapisanej przez etap "Tłumaczenia" ani ręcznie poprawionej przez producenta.
- **AC-34**: Jeżeli generowanie tłumaczenia zawiedzie albo przekroczy limit czasu, producent może opublikować projekt bez tłumaczeń tego etapu (istniejący backfill z AC-33 spróbuje je uzupełnić później) albo ponowić generowanie dla pojedynczego języka bez powtarzania całego etapu.

*Widoczność u klienta*
- **AC-35**: Karta projektu klienta pokazuje sekcję "Co musi zapewnić klient" z pozycjami wybranymi przez producenta (AC-23), jeśli lista nie jest pusta.
- **AC-36**: Opis elementów poza ceną (`excludedScope`, AC-24) jest widoczny przy każdym standardzie na karcie projektu klienta, obok dzisiejszego opisu tego, co standard zawiera.
- **AC-37**: Standard oznaczony jako "wycena indywidualna" (`priceOnRequest`) pokazuje ten tekst zamiast liczby wszędzie, gdzie dziś pokazywana jest cena (karta produktu, porównanie, wyniki wyszukiwania), i jest wykluczony z filtrowania oraz sortowania po cenie zamiast zniekształcać zakres cen innych produktów.

*Zamknięcie starego przepływu*
- **AC-38**: Wejście "Uzupełnij z PDF" oraz cały poprzedni przepływ pełnego importu (sesja, ekran przeglądu z dowodami, kandydaci, konflikty) znika. Kreator zawsze zaczyna się od ręcznego wprowadzenia, z celowaną pomocą AI opisaną w AC-4 do AC-19.
- **AC-39**: Cały kod i infrastruktura spec 0047 (komponenty `House*`, akcje `house-ai-*`, integracja Azure Document Intelligence i Service Bus, powiązane zależności i zmienne środowiskowe) zostają usunięte z repo, pełna lista w Build plan zadanie 2.
- **AC-40**: Trzynaście tabel `ai_*`, trzy funkcje bazodanowe i trzynaście typów enum ze spec 0047 zostają usunięte migracją, zweryfikowaną najpierw na tymczasowej gałęzi Neon, z zapytaniem liczącym wiersze jako krokiem poprzedzającym usunięcie. Wartość `ai_source_pdf` w `document_purpose` zostaje w typie na stałe (Postgres nie pozwala usunąć pojedynczej wartości enum bez przebudowy typu), oznaczona komentarzem jako martwa; wiersze `document` z tym `purpose` zostają usunięte razem z odpowiadającymi obiektami w prywatnym buckecie R2.
- **AC-41**: Zdolności ekstrakcji AI z tego spec (rozpoznawanie układu, wydobywanie standardów) dotyczą wyłącznie kreatora nowego projektu. Edycja istniejącego, opublikowanego produktu nie zyskuje tych dwóch zdolności w tym spec, ale zyskuje ten sam, jeden etap tłumaczeń (AC-31).

## Decision

**Wybrana opcja**: Opcja 3, zastąpić bezpośrednio: usunąć nieużywaną infrastrukturę spec 0047 (potwierdzone: tylko dane testowe inżyniera, żadnego prawdziwego producenta) i zbudować dwa wąskie, synchroniczne wywołania Azure OpenAI, reużywające istniejącego klienta (`lib/ai/openai.ts`, `lib/ai/azure-config.ts`), zamiast naprawiać albo stopniowo wygaszać pełny pipeline importu.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`) · `react-hook-form` już w użyciu w `ProjectWizard`

## Rationale

Uzasadnienie decyzji, rozważone opcje, pełny wykaz kodu 0047 do usunięcia: patrz [rationale.md](rationale.md).

## Feature design

**Podejście budowy**: Tracer Bullet (domyślne w epice Produkcja, `docs/scope/produkcja.md`). Build plan stawia najpierw jeden działający, cienki wątek na każdą z dwóch zdolności AI (rozpoznawanie pomieszczeń, wydobywanie standardów), zanim rozbuduje resztę kreatora. Sprzątanie starego kodu idzie od razu na początku, żeby nie utrzymywać dwóch równoległych ścieżek AI w tym samym kreatorze. Destrukcyjna migracja (usunięcie tabel) idzie na samym końcu, dopiero po wdrożeniu kodu, który przestaje ich używać.

### Szkic modelu danych

Same zmiany dodatkowe po stronie nowych danych (wynik AI jest ulotny, nie zapisywany osobno, patrz AC-12 i AC-17), plus jedna duża migracja usuwająca po stronie starych danych.

| Zmiana | Tabela | Szczegół |
|---|---|---|
| Nowa kolumna `price_on_request` | `product_variant` | boolean, jawna "wycena indywidualna". CHECK: `price_on_request = false OR (price_min_cents IS NULL AND price_max_cents IS NULL)` (AC-13, AC-37) |
| Nowa kolumna `excluded_scope` | `product_variant` | text, ten sam wzorzec typu co istniejące `scope_summary`, treść z AC-13, AC-24 |
| Nowa kolumna `excluded_scope` | `product_variant_translation` | text, tłumaczenie kolumny wyżej (AC-28) |
| Nowa kolumna `client_requirements` | `product` | jsonb, tablica `{ id: string, key: string \| null, label: string, custom: boolean }[]`, jedna lista na produkt (AC-23); `id` stabilny per wpis, tym samym wzorcem dopasowania co dzisiejsze `room_layout` (spec 0042/0045); katalog gotowych `key` żyje w kodzie, tym samym wzorcem co dzisiejsze `HEAT_SOURCE_OPTIONS` w `lib/producer-project-draft.ts` |
| Nowa kolumna `client_requirements` | `product_translation` | jsonb, tablica `{ id, label }[]` dopasowana po `id` do wpisów własnych (`custom: true`) z kolumny wyżej; pozycje z katalogu (`custom: false`) mają etykietę tłumaczoną z katalogu opcji, nie z tej kolumny |
| Rozszerzenie kształtu `room_layout` (bez migracji, jsonb) | `product` | dodanie `floorLevel?: string` do każdego wpisu, zastępuje `isMezzanine` (AC-8) |
| Rozszerzenie kształtu `technical_specs` dla `dom` (bez migracji, jsonb, walidacja Zod) | `product` | `constructionTechnology` (enum z opcją "inna" i osobnym polem tekstowym), `heatSource`/`ventilation` dostają wariant "inne"/"inna" z osobnym polem tekstowym, `heatTransferCoefficients` staje się opcjonalne z jawną wartością "nie podano" (AC-20) |
| Nowa wartość enum `product_sales_pdf` w `document_purpose` plus częściowy indeks unikalny `document_one_sales_pdf_per_product` | `document` | ten sam wzorzec co `product_specification` ze spec 0049 (AC-25, AC-26) |
| Brak zmiany, tylko ukrycie w UI | `product.installation_warranty_years`, `product.simplified_permit_eligible` | AC-21 |
| Usunięcie (migracja DROP, dopiero po wdrożeniu kodu z Build plan zadania 2 do 10) | 13 tabel: `ai_extraction_session`, `ai_source_document`, `ai_field_candidate`, `ai_candidate_evidence`, `ai_field_snapshot`, `ai_field_decision`, `ai_translation_request`, `ai_document_issue`, `ai_document_acknowledgement`, `ai_additional_observation`, `ai_usage_event`, `ai_support_access_grant`, `ai_support_access_audit`; 3 funkcje: `apply_ai_extraction`, `save_ai_field_decision`, `get_ai_review_gate`; 13 typów enum: `ai_candidate_origin`, `ai_confidence`, `ai_decision_type`, `ai_document_issue_stage`, `ai_evidence_type`, `ai_extraction_stage`, `ai_extraction_status`, `ai_observation_review_status`, `ai_ocr_status`, `ai_pdf_kind`, `ai_support_access_result`, `ai_translation_locale`, `ai_translation_status` | AC-40 |
| Usunięcie wierszy, enum zostaje (Postgres nie usuwa pojedynczej wartości) | `document` z `purpose = 'ai_source_pdf'`, plus odpowiadające obiekty w prywatnym buckecie R2 | AC-40 |

### Powierzchnia serwerowa

| Akcja | Typ | Kluczowe wejście | Wynik | Kluczowe błędy |
|---|---|---|---|---|
| `recognizeRoomLayout` | Server Action | `productId`, do pięciu identyfikatorów już wgranych rzutów | proponowana lista pomieszczeń z pewnością i kondygnacją, dopasowana do istniejącej listy (AC-7) | zły typ pliku, więcej niż pięć rzutów wybranych naraz, produkt nie należy do producenta, błąd dostawcy AI (zwraca błąd, formularz zostaje wypełniony ręcznie) |
| `extractStandardsFromMaterial` | Server Action | `productId`, materiał (`text` \| `table` \| `image` \| `document`) | lista proponowanych wariantów z pewnością i proponowanym dopasowaniem do `completionStandard` | zły typ lub rozmiar materiału, błąd dostawcy AI, proponowany standard koliduje z już istniejącym aktywnym wariantem (producent łączy albo pomija, AC-15) |
| `generateProjectTranslations` | Server Action | `productId` | szkic tłumaczeń dla `en`/`de`/`nl` (opis, standardy, pomieszczenia, wymagania klienta, FAQ), do przeglądu | brak zatwierdzonej treści źródłowej, błąd dostawcy AI albo przekroczenie czasu (AC-34, nie blokuje publikacji) |
| `uploadProductSalesPdf` / `deleteProductSalesPdf` | Server Action | `productId`, plik / `documentId` | `documentId`, `url` / potwierdzenie | zły typ lub sygnatura pliku, plik powyżej limitu, produkt nie należy do producenta (ten sam wzorzec co `uploadProductSpecificationPdf` ze spec 0049) |
| `uploadFloorPlan` (rozszerzona) | Server Action | `productId`, plik (obraz albo PDF), opcjonalny `variantId` | `documentId`, `url` | zły typ lub sygnatura pliku (bez zmian poza akceptacją PDF) |

Przeglądarka nie wywołuje Azure bezpośrednio. Wszystkie trzy nowe akcje AI są synchroniczne: producent czeka na odpowiedź w tym samym żądaniu (AC-10, AC-29).

### Kluczowe niezmienniki

- Każda z trzech akcji AI sprawdza własność produktu tym samym wzorcem co `resolveProductOwnership` w `lib/product-photo-actions.ts`, zanim cokolwiek wyśle do Azure OpenAI.
- Materiał wgrany do `extractStandardsFromMaterial` nigdy nie trafia do R2 ani do żadnej tabeli. Żyje tylko przez czas jednego żądania serwerowego.
- Treść dokumentu, obrazu albo tekstu wysłana do modelu jest zawsze danymi, nie instrukcją: model nie ma narzędzi, nie wykonuje kodu, a wyjście jest walidowane schematem Zod przed pokazaniem w formularzu (ten sam ostrożny nawyk co spec 0047 AC-20, mimo dużo mniejszego zakresu).
- Wynik AI (rozpoznane pomieszczenia, proponowane warianty, projekt tłumaczenia) nigdy nie zapisuje się do bazy sam z siebie. Zapis następuje dopiero wtedy, gdy producent zatwierdzi krok kreatora, tym samym mechanizmem co dziś dla reszty formularza.
- Scalanie rozpoznanych pomieszczeń jest idempotentne: dopasowanie po znormalizowanej nazwie i zbliżonej powierzchni, nigdy po samej kolejności (AC-7).
- `generateProjectTranslations` tłumaczy z rzeczywiście wykrytego języka źródłowego tekstu, nie zakłada na sztywno polskiego (patrz Kontekst i Follow up), żeby rozpoznane po angielsku czy niemiecku nazwy pomieszczeń trafiły poprawnie do pozostałych języków.
- Etap "Tłumaczenia" jest jedynym pisarzem treści, które sam wygenerował; istniejący `after()`-owy backfill (`generateMissingProductTranslations`) nigdy nie nadpisuje wartości zapisanej przez ten etap albo poprawionej ręcznie (AC-33).
- Standard wyodrębniony przez AI nigdy nie tworzy czwartego aktywnego wariantu: musi zostać zmapowany na jedną z trzech wartości `completionStandard` (potwierdzoną przez producenta) albo pominięty (AC-15).

### Model bezpieczeństwa

- Uwierzytelnienie i autoryzacja idą przez istniejący `requirePhotoActor`/`resolveProductOwnership` (albo równoważny producentowi wzorzec), nie przez nowy mechanizm.
- Pliki wysyłane do rozpoznawania (rzuty, materiały standardów) trafiają do tego samego wdrożenia Azure OpenAI w regionie UE (Data Zone Standard), które spec 0047 już uzasadnił pod RODO. Materiał standardów nigdy nie zostaje zapisany (patrz Kluczowe niezmienniki), więc nie ma dla niego osobnej retencji do zaprojektowania.
- Rzuty zapisane do R2 są publiczne, tym samym wzorcem co dziś (`product_floor_plan`), rozszerzonym tylko o dopuszczenie PDF z takim samym sprawdzeniem sygnatury bajtowej jak istniejące `document-pdf-validation.ts`.
- Bez malware skanu (ClamAV) dla materiału standardów: plik nigdy nie trafia do żadnego trwałego magazynu ani nie jest udostępniany innym użytkownikom, więc ryzyko jest tym samym, co przy dowolnym pliku wysyłanym bezpośrednio do czatu z modelem.
- Limit pięciu rzutów na wywołanie (AC-4) chroni przed niekontrolowanym kosztem pojedynczego żądania; bez sztywnego dziennego limitu liczby wywołań na start (świadoma decyzja, patrz Consequences i Follow up), bo każde wywołanie jest małe.

### Konfiguracja

Bez nowych zmiennych środowiskowych poza ewentualną weryfikacją wdrożenia z obsługą obrazu (vision) w tym samym Azure OpenAI (`AZURE_OPENAI_DEPLOYMENT`, już istniejące). Jeżeli dzisiejsze wdrożenie GPT 5 mini w Data Zone Standard nie obsługuje wejścia wizualnego, potrzebna jest nowa wartość `AZURE_OPENAI_DEPLOYMENT` wskazująca wdrożenie z obsługą obrazu w tym samym regionie, bez zmiany reszty konfiguracji.

**Usuwane zmienne** (`.env.local.example`): `AI_IMPORT_MAX_RUNS_PER_24H` (nigdy realnie użyta, bo flaga włączająca nie istniała), `AI_PRIVATE_R2_BUCKET_NAME`, `AI_PRIVATE_R2_ACCESS_KEY_ID`, `AI_PRIVATE_R2_SECRET_ACCESS_KEY`, `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_SERVICE_BUS_NAMESPACE`, `AZURE_SERVICE_BUS_QUEUE`, `AZURE_SERVICE_BUS_SEND_CONNECTION_STRING`, `HOUSE_AI_IMPORT_DAILY_LIMIT`, `HOUSE_AI_IMPORT_DAILY_LIMIT_DISABLED` (dokładne nazwy do potwierdzenia względem aktualnego `.env.local.example` przy budowie).

**Usuwane zależności** (`package.json`, dopiero gdy żaden plik ich nie importuje): `@azure-rest/ai-document-intelligence`, `@azure/functions`, `@azure/functions-extensions-servicebus`, `@azure/service-bus`. Zostają: `@azure/identity`, `@azure/core-auth` (używane przez `lib/ai/openai.ts` i `lib/ai/azure-identity.ts`, ogólny klient Azure OpenAI, potrzebny dalej).

### Krytyczne scenariusze testowe

- Ścieżka podstawowa: producent wypełnia dane podstawowe ręcznie, wgrywa rzut i uruchamia rozpoznawanie z kroku podstawowego, poprawia jedną niepewną wartość, dodaje standard przez wklejenie tabeli z dwoma wierszami cennika, potwierdza dopasowanie do `completionStandard`, uruchamia etap tłumaczeń i publikuje. Weryfikuje **AC-1, AC-4, AC-13, AC-15, AC-16, AC-28, AC-29**.
- Błąd dostawcy AI: rozpoznawanie rzutu kończy się błędem, producent nadal może wypełnić listę pomieszczeń ręcznie, formularz nie blokuje dalszej pracy. Weryfikuje **AC-4, AC-10**.
- Materiał ulotny: po wywołaniu `extractStandardsFromMaterial` żaden nowy wiersz w `document` ani obiekt w R2 nie powstaje dla wgranego zrzutu ekranu. Weryfikuje **AC-17**.
- Scalanie pomieszczeń: rozpoznawanie uruchomione dwa razy na te same rzuty nie tworzy duplikatów już zaakceptowanych pomieszczeń, a rzut z nazwą różniącą się od istniejącej wpisanej ręcznie zostaje dodany jako nowa pozycja, nie nadpisuje starej. Weryfikuje **AC-7**.
- Czwarty standard: materiał opisujący cztery standardy pozwala producentowi połączyć czwarty z jednym z trzech istniejących wariantów, nie tworzy czwartego wiersza `product_variant`. Weryfikuje **AC-15**.
- Wycena indywidualna: standard z `priceOnRequest = true` znika z filtra zakresu cenowego wyników wyszukiwania i pokazuje tekst "wycena indywidualna" zamiast liczby na karcie klienta. Weryfikuje **AC-37**.
- Język rzutu: rzut z nazwami pomieszczeń po niemiecku daje kandydatów po niemiecku, a etap tłumaczeń poprawnie generuje polską i pozostałe wersje z niemieckiego źródła, nie z założenia że źródło jest polskie. Weryfikuje **AC-9, AC-28**.
- Dwie ścieżki tłumaczenia: producent poprawia opis w etapie "Tłumaczenia", publikuje, a późniejszy zapis produktu (który wywołuje istniejący `after()` backfill) nie nadpisuje tej poprawki. Weryfikuje **AC-33**.
- Edycja istniejącego produktu: `ProductEditWizard` pokazuje etap "Tłumaczenia" zamiast starych zakładek, ale nie pokazuje żadnego z dwóch nowych przycisków rozpoznawania AI. Weryfikuje **AC-31, AC-41**.
- Regresja pól technicznych: `heatSource`, `ventilation`, `heatTransferCoefficients`, `structuralWarrantyYears` nadal przechodzą pełną ścieżkę kreator, strona klienta, bez zmian poza dodaniem wariantu "inne"/"nie podano". Weryfikuje **AC-20**.
- Autoryzacja: producent B nie może wywołać żadnej z trzech nowych akcji AI ani wgrać PDF sprzedażowego dla produktu producenta A. Weryfikuje model bezpieczeństwa wyżej.
- Sprzątanie: żaden test ani strona nie odwołuje się już do usuniętych tabel `ai_*`, usuniętych komponentów `House*` ani do wejścia "Uzupełnij z PDF"; migracja DROP zweryfikowana na tymczasowej gałęzi Neon usuwa dokładnie trzynaście tabel, trzy funkcje i trzynaście typów, zostawia wartość enum `ai_source_pdf`. Weryfikuje **AC-38, AC-39, AC-40**.

## Migration plan

**Strategia**: bez ryzyka dla prawdziwych danych producenta: żaden producent nie używał wejścia "Uzupełnij z PDF" (potwierdzone z inżynierem, dwadzieścia istniejących sesji to jego własne dane testowe). Migracja mimo to idzie w dwóch krokach, addytywnym i destrukcyjnym oddzielonym pełnym wdrożeniem kodu między nimi, zgodnie z konwencją `lib/db/AGENTS.md`.

**Fazy**:
1. Migracja addytywna: nowe kolumny `product_variant`/`product`/`product_translation`/`product_variant_translation`, nowa wartość enum `document_purpose`, aktualizacja schematów Zod. Zweryfikowana na tymczasowej gałęzi Neon przed zastosowaniem na głównej bazie.
2. Wdrożenie kodu: usunięcie starego wejścia importu i całej infrastruktury 0047 (Build plan zadanie 2), budowa dwóch nowych akcji AI i etapu tłumaczeń, reszta zmian kreatora (Build plan zadania 3 do 10).
3. Dopiero po pełnym wdrożeniu kroku 2 na produkcji (żaden plik już nie odwołuje się do tabel `ai_*`): druga migracja, zweryfikowana najpierw na tymczasowej gałęzi Neon.
   - Zapytanie liczące wiersze we wszystkich trzynastu tabelach (dokumentacja aktualnego stanu w PR, nie tylko test).
   - `DELETE FROM document WHERE purpose = 'ai_source_pdf'` plus usunięcie odpowiadających obiektów z prywatnego bucketa R2 (`AI_PRIVATE_R2_BUCKET_NAME`).
   - `DROP TABLE ... CASCADE` dla wszystkich trzynastu tabel `ai_*` (kolejność albo `CASCADE`, bo tabele mają wzajemne klucze obce).
   - `DROP FUNCTION` dla `apply_ai_extraction`, `save_ai_field_decision`, `get_ai_review_gate`.
   - `DROP TYPE` dla wszystkich trzynastu typów enum wypisanych w szkicu modelu danych wyżej.
   - Wartość `ai_source_pdf` w `document_purpose` zostaje trwale w typie (Postgres nie usuwa pojedynczej wartości enum bez przebudowy całego typu), oznaczona komentarzem w `schema.ts` jako martwa, tym samym wzorcem co inne nieużywane dziś wartości enum w tym pliku.
   - Po weryfikacji na gałęzi Neon: to samo na głównej bazie, potem decyzja o dezaktywacji prywatnego bucketa R2 i jego poświadczeń (Follow up).

**Wycofanie**: cofnięcie wdrożenia kodu z fazy 2 jest bezpieczne w dowolnym momencie przed fazą 3. Po fazie 3 (DROP) migracja jest nieodwracalna przez ponowne uruchomienie starych migracji (to nie jest wspierana ścieżka drizzle-kit po przesunięciu dziennika migracji); jedyne wycofanie to przywrócenie z Point in Time Recovery Neon, jeśli faza 3 zostanie uruchomiona przez pomyłkę przed pełnym wdrożeniem fazy 2.

**Ryzyko**: jedyne realne ryzyko to uruchomienie fazy 3 zanim kod z fazy 2 jest w pełni wdrożony na produkcji, stąd wymóg zapytania liczącego wiersze i weryfikacji na gałęzi Neon jako warunku wstępnego DROP, oraz kolejność faz w Build plan (zadanie 11 na końcu, nigdy wcześniej).

## Build plan

1. Migracja addytywna: `price_on_request` i `excluded_scope` na `product_variant`, `excluded_scope` na `product_variant_translation`, `client_requirements` na `product` i na `product_translation`, nowa wartość enum `product_sales_pdf` i jej częściowy indeks unikalny, aktualizacja schematów Zod (`technicalSpecs.dom`, kształt `room_layout`). Zweryfikowana na tymczasowej gałęzi Neon. satisfies **AC-13, AC-20, AC-23, AC-25, AC-26, AC-28**
2. Usunięcie wejścia "Uzupełnij z PDF" z kreatora oraz całego kodu spec 0047: `lib/house-ai-*.ts` i ich testy, `lib/ai/house-project-extraction*.ts`, `lib/ai/house-import-*.ts`, `lib/ai/document-intelligence.ts` i test, `lib/ai/ecb-exchange-rates.ts` i test, `lib/storage/ai-private-r2-client.ts` i test, `lib/storage/ai-source-pdf-validation.ts` i test, `lib/data/house-ai-import.ts`, `lib/data/fixtures/house-ai-import.ts`, `components/producent/House*.tsx` i ich testy, `app/[locale]/producer/panel/project/import/page.tsx`, `scripts/check-house-import.ts`, `scripts/smoke-house-import-worker.ts`, `scripts/build-house-import-function.mjs`, `infra/azure/house-import/`, uproszczenie `scripts/check-azure-ai.ts` do samego Azure OpenAI, usunięcie wypisanych w Konfiguracji zmiennych środowiskowych i czterech niepotrzebnych zależności Azure z `package.json`. satisfies **AC-38, AC-39**
3. Rozszerzenie `uploadFloorPlan` o akceptację PDF (nowy walidator sygnatury, ten sam wzorzec co `document-pdf-validation.ts` ze spec 0049), bez zmiany reszty mechanizmu. satisfies **AC-3**
4. Cienki wątek AI numer jeden, rozpoznawanie układu pomieszczeń: `recognizeRoomLayout` wywoływane z kroku "Dane podstawowe" na maksymalnie pięciu wybranych rzutach, sprawdzenie wsparcia wejścia wizualnego w dzisiejszym wdrożeniu Azure OpenAI (albo nowe wdrożenie, patrz Konfiguracja), definicja poziomu pewności (AC-6), scalanie po znormalizowanej nazwie i powierzchni bez duplikatów (AC-7), mapowanie `isMezzanine` na `floorLevel` przy odczycie istniejących produktów (AC-8), mały złoty zestaw kilku przykładowych rzutów do testu. satisfies **AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12**
5. Cienki wątek AI numer dwa, wydobywanie standardów: `extractStandardsFromMaterial`, propozycja dopasowania do `completionStandard` z potwierdzeniem producenta i regułą czwartego standardu (AC-15), ekran kroku wariantów z polem wklejania tekstu/tabeli i wgrywania obrazu/dokumentu (z jawną informacją, że plik nie jest zapisywany), przegląd kilku proponowanych standardów naraz, pomoc kontekstowa z przykładem. satisfies **AC-14, AC-15, AC-16, AC-17, AC-18, AC-19**
6. Krok techniczny: nowe pole technologii konstrukcji, warianty "inne"/"inna" z własnym tekstem dla źródła ogrzewania i wentylacji, efektywność energetyczna opcjonalna z "nie podano", usunięcie pola pozwolenia uproszczonego i gwarancji montażu z formularza i strony klienta. satisfies **AC-20, AC-21, AC-22**
7. Nowa sekcja "Co musi zapewnić klient": katalog gotowych pozycji plus własne, zapis do `product.client_requirements`. satisfies **AC-23, AC-24**
8. PDF sprzedażowy: `uploadProductSalesPdf`/`deleteProductSalesPdf` (ten sam wzorzec co spec 0049), sekcja w kroku plików, link pobrania na stronie klienta obok PDF specyfikacji. satisfies **AC-25, AC-26, AC-27**
9. Skonsolidowany etap tłumaczeń w obu kreatorach: uogólnienie `lib/ai/product-translation.ts` na wykrywanie języka źródłowego zamiast zakładania polskiego, rozszerzenie o `excludedScope`, `clientRequirements` i FAQ, jasny podział własności względem istniejącego `after()` backfillu (AC-33), obsługa błędu i limitu czasu bez blokowania publikacji (AC-34), usunięcie zakładek językowych z kroków podstawowego, wariantów i FAQ w obu kreatorach, nowy krok "Tłumaczenia" na końcu wywołujący `generateProjectTranslations` synchronicznie, ekran przeglądu wszystkich języków przed publikacją. satisfies **AC-2, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-34**
10. Widoczność u klienta: rozszerzenie `lib/data/projects.ts`/`lib/db/queries.ts#getProjectById` o `clientRequirements`, `excludedScope` per wariant i `priceOnRequest`, sekcje na stronie klienta, wykluczenie wariantów z `priceOnRequest = true` z filtra i sortowania po cenie w wynikach wyszukiwania. satisfies **AC-35, AC-36, AC-37**
11. Migracja usuwająca (dopiero po produkcyjnym wdrożeniu zadań 2 do 10): trzynaście tabel, trzy funkcje, trzynaście typów enum, usunięcie wierszy `document` z `purpose = 'ai_source_pdf'` i odpowiadających obiektów R2, poprzedzona zapytaniem liczącym wiersze i weryfikacją na tymczasowej gałęzi Neon. satisfies **AC-40**
12. Testy: Vitest dla trzech nowych akcji serwerowych, dla rozszerzonej walidacji plików i dla uogólnionej funkcji tłumaczenia; aktualizacja istniejących testów kreatora po usunięciu starego wejścia importu; Playwright od danych podstawowych do publikacji, z użyciem obu zdolności AI, w obu kreatorach dla etapu tłumaczeń. satisfies **AC-1 do AC-41**

## Consequences

**Pozytywne**:
- Znacznie mniejsza powierzchnia do zbudowania i utrzymania: zero nowych tabel dla wyniku AI, zero kolejki, zero workera, ponowne użycie już skonfigurowanego i uzasadnionego pod RODO klienta Azure OpenAI.
- Producent dostaje pomoc AI dokładnie tam, gdzie ręczne przepisywanie boli najbardziej (rzuty, cenniki), zamiast czekać na analizę całego dokumentu.
- Jeden etap tłumaczeń w obu kreatorach jest prostszy do zbudowania i zrozumienia niż zakładki językowe rozsiane po każdym kroku, i naprawia przy okazji lukę: dziś edycja istniejącego produktu nie ma żadnego łatwego sposobu poprawy tłumaczenia FAQ w jednym miejscu.
- Widoczność wymagań klienta i wyceny indywidualnej po stronie klienta (AC-35 do AC-37) domyka pętlę, którą sam model danych bez tego zadania by tylko obiecywał.

**Negatywne i kompromisy**:
- Producent traci możliwość wgrania jednego pełnego PDF oferty i otrzymania kompletnie wypełnionego projektu; musi wpisać dane podstawowe i pola techniczne ręcznie.
- Bez pełnego śladu dowodowego (dokument, strona, fragment) trudniej później zdiagnozować, skąd wzięła się konkretna nieprawidłowa wartość rozpoznana przez AI; znacznik pewności to jedyny sygnał.
- Materiał źródłowy standardów, nigdy niezapisany, nie może zostać ponownie użyty ani sprawdzony później, jeśli wynik okaże się błędny; producent musi wgrać go jeszcze raz.
- Cena wariantu nie jest już automatycznie przeliczana z waluty źródłowej na EUR (funkcja z kursem EBC znika razem z resztą pipeline'u); producent wpisuje cenę wprost w walucie produktu.
- Sztywny limit trzech standardów (`completionStandard`) pozostaje, mimo że materiał źródłowy czasem opisuje więcej: producent musi ręcznie połączyć nadmiarowe standardy, co dla niektórych producentów będzie stratą informacji.
- Bez dziennego limitu wywołań AI na start: świadomie przyjęte ryzyko kosztu, do obserwacji (patrz Follow up).

**Neutralne**:
- Dane już zapisane dla `installationWarrantyYears`, `simplifiedPermitEligible` i dziewięciu pól ze spec 0049 zostają w bazie jako martwe dane, tym samym wzorcem co spec 0049.
- `lib/ai/product-translation.ts` zyskuje wykrywanie języka źródłowego zamiast sztywnego założenia "zawsze polski"; to zmiana współdzielona z istniejącym backfillem tłumaczeń (spec 0028), nie tylko z tym spec.
- Dwadzieścia sesji testowych i dwadzieścia pięć dokumentów istniejących dziś na żywej bazie Neon zostają usunięte migracją z Build plan zadania 11, potwierdzone jako dane testowe inżyniera, nie dane producenta.

## Follow-up

- [ ] Dokładna lista wartości dla nowego pola technologii konstrukcji (`constructionTechnology`) do ustalenia z prawdziwymi producentami przy budowie, tak jak dzisiejsze `HEAT_SOURCE_OPTIONS`/`VENTILATION_TYPES`.
- [ ] Sprawdzić, czy dzisiejsze wdrożenie Azure OpenAI (GPT 5 mini, Data Zone Standard) obsługuje wejście wizualne, zanim zacznie się zadanie 4 Build planu; jeśli nie, skonfigurować równoległe wdrożenie z tym samym regionem.
- [ ] Rozważyć, czy zdolności ekstrakcji AI z tego spec (rozpoznawanie pomieszczeń, wydobywanie standardów) powinny trafić też do edycji istniejącego produktu; świadomie odłożone (AC-41), osobna, przyszła decyzja.
- [ ] Obserwować koszt wywołań AI po wdrożeniu, mimo braku dziennego limitu na start (Consequences); dodać prosty licznik dzienny per producent, jeśli koszt albo nadużycie okaże się problemem.
- [ ] Po fazie 3 migracji (Build plan zadanie 11): zdecydować o dezaktywacji prywatnego bucketa R2 (`AI_PRIVATE_R2_BUCKET_NAME`) i rotacji/usunięciu jego poświadczeń, po potwierdzeniu że wszystkie obiekty zostały wyczyszczone.
- [ ] Dodać funkcję do `docs/scope/produkcja.md` w miejsce dzisiejszej funkcji 40, podlinkować ten spec (`/scope`).
- [ ] Przy najbliższym `/sync`: opisać w `components/producent/AGENTS.md` nowy wzorzec dwóch celowanych wywołań AI (zamiast usuniętego `lib/ai-import/`) i jeden wspólny etap tłumaczeń dla obu kreatorów, dodać `lib/ai/AGENTS.md`, jeśli jeszcze nie istnieje, z konwencją reużywania `lib/ai/openai.ts`/`lib/ai/azure-config.ts` dla każdej przyszłej zdolności AI w projekcie.
