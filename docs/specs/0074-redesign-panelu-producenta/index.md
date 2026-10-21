# 0074. Redesign panelu producenta: pulpit zamiast danych konta

**Date**: 2026-10-20
**Status**: In Progress

## Summary

Pierwsza strona panelu producenta przestaje pokazywać dane konta, a zaczyna pokazywać to, co wymaga reakcji: zapytania czekające na ofertę, ogłoszenia bez wyceny i decyzje klientów. Menu schodzi z siedmiu pozycji do pięciu w trzech grupach, a "Zapytania" i "Zapytania o produkt" łączą się w jedną listę. Dane firmy trafiają do "Ustawień firmy", gdzie producent może zmienić nazwę i technologię. Ekrany demo znikają. Nie ma nowych tabel ani migracji, wszystko liczymy z istniejących danych.

## Requirements

Makieta zatwierdzona przez właściciela produktu jest wzorem układu: [Panel producenta, makieta pulpitu](https://claude.ai/artifact/S6uQtBVsHd1CLjviTWmDdi). Pliki źródłowe makiety zostają w scratchpadzie sesji, układ opisują poniższe kryteria. Makieta używa kolorów przykładowych: w kodzie obowiązują tokeny marki i klasa `theme-producer` (tryb ciemny z specu 0046).

**User stories**:
- Jako producent z małym wolumenem wchodzę do panelu, żeby sprawdzić nowe ogłoszenia na tablicy albo dodać produkt, i od razu widzę, co jest do zrobienia.
- Jako producent widzę w jednym miejscu wszystkie zapytania od klientów, niezależnie od tego, skąd przyszły.
- Jako producent widzę, czego brakuje w moim profilu i produktach, i jednym kliknięciem przechodzę do naprawy.
- Jako producent mogę poprawić nazwę firmy i technologię bez pisania do administratora.

**Acceptance criteria**:

Nawigacja
- **AC-1**: Menu boczne ma pięć pozycji w trzech grupach z nagłówkami: Pulpit (bez grupy); ZLECENIA: Zapytania, Tablica ogłoszeń; OFERTA: Produkty, Profil zdolności; FIRMA: Ustawienia firmy. Pozycji "Konto", "Zapytania o produkt" i "Moje wyceny" nie ma w menu. Pozycja aktywna jest podświetlona i ma `aria-current="page"`. "Zapytania" są aktywne także na `/inquiries/[id]` i `/product-inquiries/[id]`, "Tablica ogłoszeń" na `/board`, `/board/[id]` i `/board-quotes`.
- **AC-2**: Przy "Zapytania" jest liczba (zapytania czekające na ofertę plus decyzje klienta jeszcze nieobejrzane), przy "Tablica ogłoszeń" liczba otwartych dopasowanych ogłoszeń bez własnej wyceny, które nadal przyjmują wyceny (przed terminem, bez wyboru klienta). Same liczby, bez słowa "nowe". Przy zerze znacznik znika. Dla producenta bez zatwierdzonej weryfikacji wolumenowej znacznik tablicy nie jest pokazywany. Znaczniki mają `aria-label` z pełnym opisem. Dotychczasowa kropka "Klient podjął decyzję" zostaje zastąpiona tą liczbą.

Pulpit (`/producer/panel`)
- **AC-3**: Strona główna panelu ma nagłówek "Pulpit" z powitaniem nazwą firmy, przycisk "Dodaj produkt" (do `/producer/panel/project`) i blok "Wymaga Twojej reakcji". Blok to lista wierszy, każdy z kropką, tytułem, linijką szczegółu i przyciskiem prowadzącym do właściwego miejsca: (a) "N zapytań czeka na ofertę" z wiekiem najstarszego, link do `/inquiries?status=needs-offer`; (b) "Klient podjął decyzję w sprawie Twojej oferty" gdy są nieobejrzane decyzje, link do `/inquiries?status=decision`; (c) "N ogłoszeń czeka na Twoją wycenę", link do `/board`. Wiersze z zerem się nie pokazują. Gdy nie ma żadnego, blok mówi "Nic nie czeka na Twoją reakcję".
- **AC-4**: Producent bez zatwierdzonej weryfikacji wolumenowej zamiast wiersza (c) widzi wiersz o stanie profilu zdolności: "Uzupełnij profil zdolności, żeby zobaczyć tablicę" (nie złożono), "Profil zdolności czeka na weryfikację" (w trakcie), "Profil zdolności odrzucony, popraw go" (odrzucono), z linkiem do `/capacity`. Stan bierze się z `producer_capacity_profile.volume_verification_status`.
- **AC-5**: Pod blokiem reakcji są trzy kafelki, każdy jest linkiem: "Otwarte zapytania" (liczba czekających na ofertę, linijka "N wysłanych ofert"), "Moje wyceny" (liczba wycen w statusie `active`, linijka "czekają na klienta"), "Aktywne produkty" (liczba opublikowanych, linijka "N wymaga uzupełnienia" gdy są niekompletne, według AC-10).
- **AC-6**: Obok (na wąskim ekranie pod spodem) jest karta "Dokończ profil" z paskiem postępu "X z 4" i listą zadań: (1) dane firmy (zrobione, gdy `producer.technology` jest ustawione), (2) profil zdolności zatwierdzony (według `volume_verification_status`), (3) certyfikat dodany (co najmniej jeden), (4) produkty kompletne (żaden opublikowany produkt nie ma braków z AC-10). Zrobione zadania mają znaczek i brak linku, niezrobione są linkami do właściwego ekranu. Gdy wszystko jest zrobione, karta się nie renderuje. Dane firmy (NIP, kraje, status) nie są już na pulpicie.

Zapytania
- **AC-7**: `/producer/panel/inquiries` pokazuje jedną listę dwóch źródeł: zapytania z listy porównań (`inquiry`, etykieta "Z shortlisty") i zapytania o produkt (`bulk_product_inquiry`, etykieta "O produkt"). Kolumny: produkt lub projekt, źródło, kraj, status, wiek, akcja. Statusy listy: "Wymaga oferty" (zapytanie `open`, albo zapytanie o produkt przyjmujące wyceny bez własnej wyceny), "Decyzja klienta" (oferta `accepted` lub `rejected`, albo własna wycena `accepted` lub `rejected`), "Oferta wysłana" (`offered`, albo własna wycena `active` lub `superseded`), "Zamknięte" (reszta). Filtr statusu jest przez `?status=needs-offer|decision|offered|closed|all`, domyślnie `needs-offer`, a gdy nic tam nie ma, `all`. Kolejność: najpierw "Wymaga oferty" od najstarszego, potem pozostałe od najnowszego. Wiersz prowadzi do istniejących szczegółów (`/inquiries/[id]` lub `/product-inquiries/[id]`, bez zmian). Lista nie zwraca danych kontaktowych klienta.
- **AC-8**: Stara lista `/producer/panel/product-inquiries` przekierowuje na `/inquiries`. Linki powrotne w szczegółach obu źródeł prowadzą do `/inquiries`. Szczegóły zapytań działają bez zmian.

Tablica ogłoszeń
- **AC-9**: Ekrany `/board` i `/board-quotes` mają wspólny pasek dwóch zakładek: "Dostępne ogłoszenia" (liczba z AC-2) i "Moje wyceny" (liczba wycen). Obie zakładki to zwykłe linki do istniejących tras, strony nie są scalane. Na `/board` jest przełącznik "Tylko moje kraje dostawy", domyślnie wyłączony, oparty na istniejącym `deliversToCountry` i parametrze URL; filtry kraj, typ i rodzina zostają. Gdy przełącznik ukrywa wiersze, widać "Ukryto N ogłoszeń spoza Twoich krajów".

Produkty
- **AC-10**: Lista produktów ma kolumnę "Kompletność". Brakiem jest: brak zdjęcia produktu (dokument `product_photo`), brak ceny (brak domyślnego wariantu z ceną), brak tłumaczenia produktu w en, de lub nl (`product_translation`, dla opublikowanych), szkic (`status = draft`, komunikat "Dokończ i opublikuj"). Wiersz z brakami pokazuje pierwszy brak i przycisk "Uzupełnij" do edycji produktu, kompletny pokazuje "Kompletny" i "Edytuj". Produkty z brakami są na górze. Nad listą jest podsumowanie "N opublikowanych, M wymaga uzupełnienia" i przycisk "Dodaj produkt".

Ustawienia firmy
- **AC-11**: `/producer/panel/settings` przejmuje zawartość dawnej strony "Konto": nazwa firmy, NIP (tylko odczyt), kraje dostawy (tylko odczyt, link "Zmień" do `/capacity`), technologia i sekcja certyfikatów bez zmian logiki. Nazwę firmy i technologię można zmienić formularzem (akcja serwerowa). Status weryfikacji firmy (`producer.verification_status`) nie jest już pokazywany w panelu. `/producer/panel/` nie służy już jako "Konto".

Czyszczenie
- **AC-12**: Ekrany demo znikają z repozytorium razem z komponentami i testami używanymi tylko przez nie: trasy `export-readiness`, `company-verification`, `fulfillment`, `fulfillments`, `gap-closure` pod `app/[locale]/producer/(public)/`, ich widoki, strony testowe i specyfikacje e2e, które sprawdzają tylko te trasy. Panel nie ma już bloku "Materiały demonstracyjne". Po usunięciu `npm run lint`, `npm run build` i `npm run test` przechodzą, a w kodzie nie zostaje żaden link do usuniętych tras.

Jakość i zgodność
- **AC-13**: Wszystkie nowe teksty są w `messages/pl.json`, `en.json`, `de.json` i `nl.json` (panel ma dziś klucze we wszystkich czterech). Nie zostają osierocone klucze po usuniętych ekranach i po "Konto".
- **AC-14**: Pulpit i listy działają w trybie jasnym i ciemnym (`theme-producer`), używają tokenów marki zamiast kolorów z makiety, a na telefonie menu zostaje szufladą. Elementy interaktywne mają co najmniej 44 px wysokości, a tabele przewijają się w poziomie w ramce.
- **AC-15**: Każde nowe zapytanie do bazy jest ograniczone `producerId` wyprowadzonym z sesji (`requirePanelProducerSession`, `getProducerIdForUser`), nigdy z parametru z przeglądarki. Akcja zmiany nazwy i technologii sprawdza sesję i rolę producenta, waliduje dane po stronie serwera i zapisuje przez ścieżkę, która zachowuje atrybucję audytu (spec 0064).

## Decision

**Chosen option**: Option 2: Przebudowa na istniejących danych, trasa po trasie

Zmieniamy strukturę i widoki panelu na istniejących tabelach i zapytaniach, bez migracji, dostarczając po jednym ekranie na raz w kolejności: nawigacja, pulpit, listy, ustawienia, czyszczenie.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`)

## Rationale

Uzasadnienie i rozważone opcje: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**: bez zmian schematu i bez migracji. Wszystkie liczby i statusy wynikają z istniejących tabel: `inquiry`, `inquiry_item`, `offer`, `bulk_product_inquiry`, `project_request`, `project_quote`, `product`, `product_variant`, `product_translation`, `document`, `producer`, `producer_capacity_profile`, `producer_certification`. Nowy moduł `lib/producer-panel-summary.ts` zbiera liczniki w jednym miejscu (funkcje czytające, asynchroniczne, jak reszta warstwy danych).

**Liczniki** (wszystkie z `producerId`):

| Licznik | Definicja | Użycie |
|---|---|---|
| `needsOfferCount` | `inquiry` w stanie `legacy_direct`, status `open`, z produktem tego producenta, plus `bulk_product_inquiry` jego produktów przyjmujące wyceny (`acceptingQuotes`) bez własnej wyceny | menu, pulpit, kafelek |
| `unreadDecisionCount` | rozmiar `getUnreadDecisionInquiryIds` | menu, pulpit |
| `boardWithoutQuoteCount` | otwarte, dopasowane ogłoszenia (`producerMatchesProjectRequestSql`), przed terminem, bez wyboru klienta, bez własnej wyceny; liczone `count(*)` bez stronicowania; 0 gdy nie `approved` | menu, pulpit |
| `activeQuotesCount` | `project_quote` tego producenta w statusie `active` | kafelek, zakładka |
| `publishedProductsCount`, `incompleteProductsCount` | opublikowane produkty i z nich te z brakiem według AC-10 | kafelek, checklista |
| `oldestNeedsOfferAt` | najstarsza data zapytania czekającego na ofertę | pulpit |

Układ ładuje te liczniki jednym `Promise.all` (trzy lekkie zapytania do menu: `needsOfferCount`, `unreadDecisionCount`, `boardWithoutQuoteCount`). Pozostałe liczy tylko pulpit.

**Stan weryfikacji wolumenowej**: `getProducerVolumeVerificationStatus` (już jest), wartości `not_submitted`, `pending`, `approved`, `rejected`.

**Trasy** (panel, `app/[locale]/producer/panel/`):

| Trasa | Zmiana |
|---|---|
| `/` | Pulpit (nowa treść) |
| `/settings` | nowa, treść dawnego "Konto" plus formularz edycji |
| `/inquiries` | scalona lista dwóch źródeł, filtr `?status=` |
| `/inquiries/[id]`, `/product-inquiries/[id]` | bez zmian |
| `/product-inquiries` | przekierowanie na `/inquiries` |
| `/board`, `/board-quotes` | wspólny pasek zakładek, przełącznik krajów na `/board` |
| `/products` | kolumna "Kompletność" |
| `/capacity`, `/project`, `/board/[id]` | bez zmian |

**Akcja zmiany danych firmy**: `updateProducerCompany({ name, technology })`, akcja serwerowa w `lib/producer-company-actions.ts`. Walidacja Zod: nazwa po `trim`, 2 do 120 znaków; technologia jedna z `PRODUCER_TECHNOLOGIES`. NIP, kraj i status nie są edytowalne. Zapis przez ścieżkę zachowującą atrybucję audytu (`lib/producer-actor.ts`, spec 0064). Błąd walidacji wraca do formularza, bez wyjątku.

**Key invariants**:
- Żadna lista panelu nie zwraca danych kontaktowych klienta bez ujawnienia (maskowanie zostaje w SQL, jak w `getProjectQuotesForProducer`).
- Producent nie widzi cudzych produktów, zapytań ani wycen (filtr po `producerId` z sesji).
- Tablica i jej liczba są dostępne tylko przy `volume_verification_status = approved`.
- Logika statusów i ikon kluczuje po polskim źródle, nigdy po tłumaczeniu (zasada ze specu 0067).

**Security model**: panel dostępny tylko dla roli `producer`, wszystkie strony przez `requirePanelProducerSession`. Użytkownik należący do producenta (`producer_member`) ma pełny dostęp, jak dziś (spec 0057). Brak nowych publicznych powierzchni. Zakres danych osobowych: bez zmian (listy pokazują to samo co dziś, w innym układzie).

**Configuration required**: brak nowych zmiennych środowiskowych.

**Critical test scenarios**:
- Producent z jednym zapytaniem `open`, jednym zapytaniem o produkt bez wyceny i jedną nieobejrzaną decyzją widzi na pulpicie trzy wiersze, a w menu liczbę 3 przy "Zapytania", verifies **AC-2**, **AC-3**.
- Producent bez zatwierdzonej weryfikacji nie widzi znacznika przy tablicy, a pulpit pokazuje wiersz o profilu zdolności, verifies **AC-2**, **AC-4**.
- Producent bez żadnych zadań widzi "Nic nie czeka na Twoją reakcję", verifies **AC-3**.
- Zapytanie z `bulk_product_inquiry` z własną wyceną `accepted` ma status "Decyzja klienta" na liście scalonej, verifies **AC-7**.
- `/product-inquiries` przekierowuje na `/inquiries`, verifies **AC-8**.
- Przełącznik "Tylko moje kraje dostawy" ukrywa ogłoszenie spoza krajów i pokazuje komunikat o ukrytych, verifies **AC-9**.
- Produkt bez zdjęcia ma brak "Brak zdjęć" i jest na górze listy, verifies **AC-10**.
- Zmiana nazwy na pustą lub 1 znak zwraca błąd walidacji, poprawna zapisuje się i ma atrybucję audytu, verifies **AC-11**, **AC-15**.
- Producent A nie widzi liczników ani wierszy producenta B, verifies **AC-15**.
- `rg "export-readiness|company-verification|gap-closure|fulfillments"` w `app`, `components`, `e2e` nie zwraca linków do usuniętych tras, verifies **AC-12**.

## Build plan

Podejście budowy projektu to Facade (interfejs na danych przykładowych, backend ekran po ekranie), ale warstwa danych panelu jest już prawdziwa, więc ta zmiana idzie od razu na prawdziwych danych. Kolejność jest taka, jak ustalił właściciel produktu, i każdy krok da się wdrożyć osobno (strangler: stare trasy działają, dopóki nowe nie przejmą ruchu).

1. [x] **Nawigacja**: przebuduj `ProducerPanelSidebar` na pięć pozycji w trzech grupach, liczbowe znaczniki, reguły aktywnej pozycji (Zapytania i Tablica obejmują podtrasy). Zaktualizuj `ProducerPanelSidebar.test.tsx` i układ `layout.tsx` (przekazuje liczby). Do czasu kroków 5 i 6 pozycja "Zapytania" i "Tablica" mogą prowadzić do dotychczasowych tras. Satisfies **AC-1**, **AC-2**, **AC-14**
2. [x] **Liczniki**: dodaj `lib/producer-panel-summary.ts` z funkcjami z tabeli liczników i testami na dev bazie (guard `assertDevDatabase` już działa). Satisfies **AC-2**, **AC-3**, **AC-5**, **AC-15**
3. [x] **Pulpit**: nowa treść `panel/page.tsx` (blok reakcji, stan niezatwierdzonego producenta, kafelki), komponenty w `components/producent/`. Treść "Konto" zostaje tymczasowo pod `/settings` (zrób kopię, nie usuwaj, zanim krok 8 jej nie przejmie). Satisfies **AC-3**, **AC-4**, **AC-5**, **AC-14**
4. [x] **Dokończ profil**: karta z czterema zadaniami i paskiem postępu, ukrywana po ukończeniu. Satisfies **AC-6**
5. [x] **Zapytania**: scalona lista dwóch źródeł z filtrem statusu, przekierowanie `/product-inquiries`, poprawione linki powrotne w obu szczegółach, aktualizacja `e2e/zapytanie-o-produkt-0070.spec.ts` i innych specyfikacji, które trafiają w stare trasy. Satisfies **AC-7**, **AC-8**
6. [x] **Tablica**: wspólny pasek zakładek na `/board` i `/board-quotes`, przełącznik krajów dostawy, komunikat o ukrytych. Satisfies **AC-9**
7. [x] **Produkty**: liczenie braków (zdjęcia, cena, tłumaczenia, szkic) w jednym zapytaniu zamiast N+1, kolumna "Kompletność", sortowanie, podsumowanie. Satisfies **AC-10**
8. [x] **Ustawienia firmy**: trasa `/settings` z docelową treścią, formularz nazwy i technologii z akcją `updateProducerCompany`, usunięcie statusu weryfikacji firmy z interfejsu i kluczy `ProducerPanelPage`, które zostały bez użycia. Satisfies **AC-11**, **AC-15**
9. [x] **Czyszczenie demo**: przed usunięciem sprawdź `rg` użycie każdego komponentu (`ExportReadinessMap`, `CompanyVerificationView`, `GapClosureView`, `ProducerFulfillmentList`, `DemoScreenNotice`, `ProducerHeader` zostaje, jeśli używa go `(public)/layout.tsx`); usuń trasy, widoki, testy i specyfikacje e2e (`domykanie-luk`, `realizacja`, `realizacja-i-wyplata`, o ile sprawdzają tylko usuwane ekrany), a wspólne części klienta (`/fulfillment` po stronie klienta, `StageTimeline`) zostaw. Satisfies **AC-12**
10. [x] **Teksty i jakość**: klucze w czterech językach, usunięcie osieroconych, test wzrokowy trybu ciemnego i telefonu, e2e głównej ścieżki (pulpit, zapytania, tablica, produkty, ustawienia). Pamiętaj o gotchy dev serwera: po dodaniu kluczy `messages/*.json` trzeba zrestartować `next dev`. Satisfies **AC-13**, **AC-14**

## Consequences

**Positive**:
- Producent o małym wolumenie od razu widzi, co robić, bez klikania po zakładkach.
- Jedno miejsce na wszystkie zapytania i jedna weryfikacja (wolumenowa) zamiast dwóch statusów.
- Mniej kodu do utrzymania: znikają ekrany demo, ich testy i klucze tłumaczeń.
- Bez migracji, więc łatwy rollback (cofnięcie commitów).

**Negative / tradeoffs**:
- Liczniki w menu to dodatkowe zapytania przy każdym wejściu w panel (trzy lekkie `count`). Przy małym wolumenie to nie problem, przy dużym wymagają obserwacji, a wtedy rozważyć cache.
- Dwa źródła zapytań mają różne modele (oferta kontra wycena), więc status "Decyzja klienta" dla zapytań o produkt nie ma śledzenia "nieobejrzane": wiersz pulpitu "decyzja klienta" dotyczy wyłącznie zapytań z shortlisty.
- Zakładki "Dostępne ogłoszenia" i "Moje wyceny" zostają osobnymi trasami, więc przełączenie to przejście strony, nie zakładka w miejscu.
- Brak edycji krajów dostawy w Ustawieniach (zostają w Profilu zdolności), więc producent musi znać to miejsce, stąd link "Zmień".
- Kryterium "brak tłumaczeń" sprawdza tylko pola produktu, nie grupy opcji ani certyfikaty (te nadal sprawdza `npm run check:translations`).

**Neutral**:
- Nazwy tras w `app/[locale]/producer/panel/` zostają po angielsku (`settings`, `inquiries`, `board`).
- Pomiar wyświetleń produktów i lejek zostają poza zakresem (patrz Follow-up).

## Follow-up

- [ ] Pomiar wyświetleń produktów per producent (PostHog przez `lib/observability/`) i lejek wyświetlenia, zapytania, oferty, akceptacje na pulpicie. Zacząć zbierać dane wcześniej niż pokazywać.
- [ ] Prawdziwy przepływ weryfikacji firmy (`producer.verification_status` ma dziś tylko wyświetlanie), jeśli ma wrócić do checklisty.
- [ ] Śledzenie "nieobejrzanych" decyzji także dla zapytań o produkt (dziś tylko `offer.producer_decision_viewed_at`).
- [ ] Edycja telefonu producenta: wymaga nowej kolumny `producer.phone` i decyzji, gdzie jest widoczny (reguła: bez kontaktu w opisie).
- [ ] Wzbogacić "Kompletność" o tłumaczenia grup opcji i certyfikatów (reuse logiki `lib/translations/gaps.ts`).
- [ ] Zakładki "Dostępne ogłoszenia" i "Moje wyceny" w jednej trasie z parametrem, jeśli przejście między stronami będzie przeszkadzać.
- [ ] Zaktualizować `docs/scope/produkcja.md` (funkcja 28, panel producenta) o ten spec i o rozstrzygnięcie punktu "Edycja profilu firmy przez producenta" w części Deferred.
