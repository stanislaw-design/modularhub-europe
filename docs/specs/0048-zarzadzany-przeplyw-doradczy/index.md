# 0048. Zarządzany przepływ doradczy: klient, ModularHub i producent

**Date**: 2026-09-21
**Status**: In Progress

## Summary

Zapytanie klienta o pojedynczy dom trafia dziś prosto do producenta, a producent odpowiada klientowi ofertą (spec 0023, 0033). Ta decyzja wstawia ModularHub pomiędzy nich: klient wysyła zapytanie tylko do nas, rozmawia z doradcą w komunikatorze na stronie, doradca składa brief (uporządkowany opis potrzeb), klient go zatwierdza, dopiero potem brief idzie do producentów. Producenci odpowiadają nam w jednym wspólnym formacie, my kontrolujemy oferty i budujemy porównanie, a klient wybiera finalistę i wchodzi z nim we wspólną rozmowę trójstronną. Zakres kończy się w chwili wspólnej rozmowy. Kontrakt, transport i przewoźnicy to osobne, późniejsze specyfikacje.

## Requirements

**User stories**:
- Jako klient, chcę wysłać jedno krótkie zapytanie o wybrane domy z adresem działki i własnymi słowami, żeby nie wypełniać kilku formularzy u kilku producentów.
- Jako klient, chcę mieć jednego doradcę i jeden komunikator na stronie, żeby wiedzieć, co się dzieje z moją sprawą i kto ma następny ruch.
- Jako klient, chcę zatwierdzić brief i zobaczyć, co i komu zostanie przekazane, zanim producent cokolwiek dostanie.
- Jako klient, chcę dostać jedno porównanie ofert z uzasadnieniem doradcy, żeby zobaczyć pełny koszt i braki, nie tylko ceny domów.
- Jako klient, chcę sam wybrać finalistę i świadomie zgodzić się na udostępnienie mu moich danych.
- Jako producent, chcę dostać uporządkowany brief z terminem odpowiedzi i złożyć ofertę we wspólnym formacie, nie zgadując, czego klient potrzebuje.
- Jako producent, nie chcę widzieć ofert konkurencji ani prywatnej rozmowy klienta z doradcą.
- Jako doradca, chcę kolejkę spraw pogrupowaną według następnej czynności i jeden widok sprawy ze wszystkimi kanałami, żeby nic nie zginęło.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):

*Zapytanie i strona sprawy*
- **AC-1**: Na karcie projektu i w shortliście główne wezwanie do działania brzmi „Poproś ModularHub o przygotowanie ofert”. Przed wysłaniem klient widzi wyjaśnienie, że zapytanie trafia do ModularHub, a nie od razu do producentów.
- **AC-2**: Formularz zapytania zawiera: wybrane domy (od 1 do 3, z shortlisty, tylko do odczytu), pełny adres działki (ulica, kod pocztowy, miasto, wszystkie wymagane), kraj wynikający z adresu i należący do obsługiwanych krajów, wolny tekst (opcjonalny). Nie ma w nim budżetu, terminu ani usług. Niezalogowany klient trafia do logowania i wraca do formularza z zachowanym wyborem domów.
- **AC-3**: Wysłanie tworzy w jednej operacji: sprawę (`inquiry` z etapem `nowe` i `waiting_on = advisor`), pozycje `inquiry_item`, kanał `klient_doradca` i pierwszą wiadomość systemową: „Otrzymaliśmy twoje zapytanie. Nie wysłaliśmy go jeszcze do producentów.” Powtórne wysłanie z tym samym kluczem idempotencji (także po częściowym błędzie) zwraca ten sam `inquiryId`, jedną sprawę i dokładnie jeden kanał, nigdy błąd klucza obcego. Akcja najpierw czyta istniejącą sprawę po kluczu, a zapis idzie jednym `db.batch` z identyfikatorami wygenerowanymi w aplikacji.
- **AC-4**: Dopóki brief nie jest zatwierdzony, producent nie ma żadnego wiersza `producer_invitation`, kanału ani briefu dotyczącego sprawy i nie widzi jej w swoim panelu. Dotyczy to także starych zapytań producenta (`getInquiriesForProducer`, `getInquiryDetailForProducer`), które zwracają wyłącznie sprawy `legacy_direct`, bo `inquiry_item` powstaje już przy wysłaniu (AC-34).
- **AC-5**: Nowa sprawa wysyła e mail do administratora (`ADVISOR_NOTIFY_EMAIL`). Klient widzi stronę sprawy z etapem, informacją, kto ma następny ruch, i oczekiwanym czasem pierwszej odpowiedzi (stały, tłumaczony tekst).

*Komunikator*
- **AC-6**: Klient i doradca wymieniają wiadomości tekstowe w kanale `klient_doradca` (pliki dochodzą w AC-9). Interwały i okna czasowe czytają czas z wstrzykiwanego zegara, żeby dało się je testować. Nowa wiadomość pojawia się u drugiej strony w ciągu około 5 sekund przy aktywnej karcie przeglądarki (odświeżanie co 5 s, co 30 s w karcie w tle). Wiadomości nie da się edytować ani usunąć. Ponowne wysłanie z tym samym kluczem idempotencji nie tworzy duplikatu.
- **AC-7**: Doradca wysyła karty: pytanie z wyborem, pole liczbowe, prośba o plik, propozycja alternatywy, podgląd briefu do zatwierdzenia. Odpowiedź klienta na kartę zapisuje wskazane pole w `case_field` ze stanem „potwierdzone” i źródłem „karta klienta”. Przed wysłaniem odpowiedzi klient widzi, co zostanie zapisane.
- **AC-8**: Klient nigdy nie odczytuje kanałów `producent_doradca`, ani przez adres, ani przez akcję serwera. Producent odczytuje wyłącznie kanał własnego zaproszenia, a jeśli jest finalistą, także kanał wspólny. Producent nie widzi zaproszeń, ofert ani kanałów innego producenta.
- **AC-9**: Pliki w rozmowie lądują w prywatnym buckecie R2, są przyjmowane tylko jako PDF, JPG lub PNG do 20 MB, z typem sprawdzanym po sygnaturze bajtów. Pobranie odbywa się krótkotrwałym linkiem tworzonym dopiero po sprawdzeniu dostępu do kanału. Plik z kanału klienta nie jest dostępny producentowi, dopóki klient nie udostępni go jawną zgodą.
- **AC-10**: E maile: od razu przy zdarzeniach kluczowych (nowa sprawa dla doradcy, brief do zatwierdzenia, zaproszenie dla producenta, porównanie gotowe, wybór finalisty). Przy zwykłych wiadomościach maksymalnie jeden e mail na odbiorcę i kanał w oknie 10 minut, i żaden, jeśli odbiorca był aktywny w tym kanale w ciągu ostatnich 90 sekund. E mail zawiera tylko link i powód, nigdy treści wiadomości.
- **AC-11**: Każda wiadomość ma pole `locale`. Nie ma tłumaczenia automatycznego, doradca odpowiada w języku klienta.

*Potrzeby, gotowość i brief*
- **AC-12**: Doradca prowadzi podsumowanie potrzeb w `case_field` z czterema stanami (potwierdzone, założenie doradcy, brak informacji, nie dotyczy). Klient widzi aktualną wersję, źródło każdego pola i może poprosić o poprawkę. Katalog kluczy i typ wartości są walidowane w kodzie (Zod).
- **AC-13**: Doradca zapisuje ocenę gotowości: gotowe do briefu, potrzebne dodatkowe informacje, potrzebna analiza działki, brak producenta, poza obszarem obsługi, przekazanie do procesu B2B. Każdy wynik wymaga wiadomości z wyjaśnieniem dla klienta. W widoku klienta nie istnieje etykieta „odrzucone” ani jej odpowiednik w żadnym języku, klient widzi wyłącznie wiadomość doradcy (sprawdzane testem etykiet).
- **AC-14**: Brief (wersja robocza) powstaje z podsumowania i zawiera: identyfikator sprawy, kraj i region, modele, standard, budżet, termin, stan działki, zakres usług, pytania do producenta, termin odpowiedzi i oznaczenie, które dane są założeniami. Brief nie zawiera imienia, e maila, telefonu ani pełnego adresu klienta.
- **AC-15**: Klient zatwierdza brief kartą z podglądem: widzi treść, listę producentów i dokładnie, co zostanie przekazane. Zatwierdzenie tworzy niezmienną `brief_version` i wiersz `case_consent`. Bez zatwierdzenia serwer odmawia utworzenia jakiegokolwiek zaproszenia.
- **AC-16**: Zmiana po zatwierdzeniu tworzy nową wersję briefu, którą klient zatwierdza. Każdy zaproszony producent dostaje tę samą kartę aktualizacji. Oferty złożone na starszej wersji pozostają ważne, ale mają znacznik „na wcześniejszej wersji briefu”, dopóki producent nie potwierdzi ich akcją `confirmOfferOnCurrentBrief` lub nie złoży nowej.

*Producenci*
- **AC-17**: Domyślną listą producentów są producenci wybranych modeli. Dodanie innego producenta i innego modelu wymaga karty propozycji z uzasadnieniem i zgody klienta zapisanej w `case_consent`. Bez zgody zaproszenie nie może powstać.
- **AC-18**: Producent widzi zaproszenie w swoim panelu z briefem, terminem odpowiedzi (domyślnie 7 dni, ustawia doradca) i akcjami: zainteresowany, mam pytania, nie mogę (z powodem), proponuję alternatywny model. Statusy: wysłane, wyświetlone, zainteresowany, pytania, odmowa, oferta złożona, wygasło. Klient widzi wyłącznie neutralne podsumowanie odmowy napisane przez doradcę.
- **AC-19**: Pytania producenta idą prywatnym kanałem do doradcy. Doradca odpowiada z briefu albo przekazuje pytanie klientowi. Producent nigdy nie dostaje fragmentów rozmowy klienta.
- **AC-20**: Zaproszenie po terminie jest oznaczone „po terminie” w kolejce doradcy (wyliczane przy odczycie, bez zadania w tle). Doradca może przypomnieć i ręcznie wygasić zaproszenie. Po wygaszeniu klient dostaje wiadomość doradcy z proponowaną alternatywą.

*Oferty i porównanie*
- **AC-21**: Producent składa ofertę na zaproszenie. Pola rdzenia są wymagane: cena domu na wariant (`product_variant`) każdego wycenianego produktu, waluta z trybem netto lub brutto, zakres w cenie, termin produkcji, ważność oferty. Pola zalecane (transport, montaż i dźwig, fundament, okno dostawy, plan płatności, gwarancja, założenia, PDF) są opcjonalne. Pole niepodane zapisuje się jako `null` i wszędzie pokazuje jako „brak informacji”, nigdy jako zero.
- **AC-22**: Każde złożenie oferty tworzy nową wersję, poprzednia dostaje `superseded`. Najwyżej jedna oferta aktywna na parę (sprawa, producent). Oferty ze starego, bezpośredniego przepływu są nietknięte.
- **AC-23**: Nowa oferta ma `review_status = w_kontroli` i jest niewidoczna dla klienta. Doradca oznacza ją „wymaga uzupełnienia” z komentarzem (wraca do producenta w jego kanale) albo „gotowa do porównania”.
- **AC-24**: Porównanie powstaje z pól ofert w statusie „gotowa”, z „brak informacji” zamiast zera, wraz z pisemnym podsumowaniem doradcy z uzasadnieniem (wymagane do publikacji). Publikacja tworzy niezmienną wersję porównania. Oryginalne PDF producentów są załącznikami, nigdy nadpisanymi. Producent nie widzi porównania ani cudzych ofert. Waluta i tryb podatku (netto lub brutto) są ustalone raz na sprawę w briefie. Oferta w innej walucie albo w innym trybie podatku jest oznaczona „poza założeniami briefu” i nie jest wliczana do porównywalnych sum. Przeliczanie walut nie jest w zakresie.

*Finalista i wspólna rozmowa*
- **AC-25**: Klient wybiera finalistę przyciskiem „Wybierz producenta i przejdź do wspólnej rozmowy”. Karta zgody pokazuje wersję oferty, listę danych do udostępnienia, informację, że doradca pozostaje w rozmowie, że wybór nie jest zawarciem umowy, i informację o prowizji (AC-29). Zatwierdzenie zapisuje `case_consent`, ustawia `finalist_offer_id` i etap `finalista_wybrany`.
- **AC-26**: Powstaje kanał `wspolny` (klient, producent finalista, doradca) z pierwszą wiadomością doradcy: uczestnicy, link do briefu, link do wybranej wersji oferty, tematy do potwierdzenia, następny krok, termin odpowiedzi. Dopiero wtedy producent widzi dane kontaktowe i pełny adres. Treść wcześniejszych kanałów nie jest kopiowana.
- **AC-27**: Pozostali producenci dostają neutralną informację o zakończeniu procesu i nie widzą, kto wygrał ani na jakich warunkach.
- **AC-28**: Zmiana ceny, zakresu lub terminu po wyborze finalisty wymaga nowej wersji oferty i ponownego potwierdzenia klienta akcją `confirmOfferVersion`. Do potwierdzenia `finalist_offer_id` wskazuje dotychczasową ofertę, a nowa wersja ma w kanale wspólnym znacznik „czeka na potwierdzenie klienta”. Po potwierdzeniu `finalist_offer_id` wskazuje nową wersję. W tej specyfikacji nie powstaje wiersz `order`.
- **AC-29**: Na stronie sprawy (stopka) i na karcie wyboru finalisty widać stały komunikat, że ModularHub otrzymuje prowizję od producenta. Treść jest w katalogu tłumaczeń, nie w kodzie komponentu.

*Panel doradcy, uprawnienia, zgodność*
- **AC-30**: Panel administratora ma kolejkę spraw pogrupowaną według następnej czynności: nowe bez doradcy, czekają na pierwszą odpowiedź, czekają na klienta, briefy do sprawdzenia, zaproszenia po terminie, oferty w kontroli, porównania do przygotowania, klienci bez decyzji, finaliści do połączenia. Progi (stałe konfiguracyjne, do zmiany bez migracji): „czeka na pierwszą odpowiedź” to sprawa `nowe` lub `rozmowa` bez wiadomości doradcy dłużej niż `ADVISOR_FIRST_REPLY_HOURS` (domyślnie 24), „klient bez decyzji” to `porownanie_gotowe` bez ruchu klienta dłużej niż 7 dni, „po terminie” to `response_due_at` w przeszłości. Każda sprawa pokazuje właściciela, kto czeka, czas od ostatniego kontaktu. Widok sprawy pokazuje wszystkie kanały, podsumowanie, briefy, zaproszenia, oferty i porównania oraz pozwala przypisać doradcę.
- **AC-31**: Każdy odczyt i zapis sprawdza dostęp po stronie serwera na podstawie sesji, przez jedną wspólną funkcję dostępu, nigdy na podstawie identyfikatora podanego przez klienta. Zgody, zatwierdzone wersje briefu, opublikowane porównania i złożone oferty są niezmienne (trigger w bazie odrzuca UPDATE i DELETE). Wiadomości też, z jednym wyjątkiem: akcja administratora usuwa treść na prośbę klienta, a trigger dopuszcza wyłącznie UPDATE, który ustawia `body` i `payload` na `NULL` i wypełnia `redacted_at`, oraz usuwa pliki sprawy. Metadane i zgody zostają. Autorstwo zapisu wynika z własnych kolumn tabel (`created_by`, `author_user_id`, `approved_by`), nie z audytu, który przy sterowniku `neon-http` nie zna aktora poza pierwszą instrukcją `db.batch`. Odczyty doradcy nie są w tej wersji logowane (Follow-up).
- **AC-32**: Dzisiejsze zapytania (`stage = legacy_direct`) i ścieżka dużych zamówień B2B działają bez zmian. Nowe zapytania o pojedyncze domy nie pojawiają się na starych ekranach bezpośrednich ofert producenta i nie da się na nie użyć starych akcji (AC-34).
- **AC-33**: Zdarzenia biznesowe idą wyłącznie przez `lib/observability/`. Nowe nazwy dodane do `EventName`: `case_created`, `case_first_advisor_reply`, `case_brief_approved`, `case_invitation_sent`, `case_offer_submitted`, `case_comparison_published`, `case_finalist_selected`, `case_closed_no_choice`. Istniejące `offer_submitted` zostaje wyłącznie dla ścieżki starej, żeby nie mieszać lejków. Właściwości zdarzeń nie zawierają danych osobowych.
- **AC-34**: Wszystkie stare zapytania i akcje przepływu bezpośredniego, w tym `getInquiriesForProducer`, `getInquiryDetailForProducer`, `submitOffer`, `respondToOffer`, `markOfferViewedByClient`, `markOfferDecisionViewedByProducer` i `recomputeInquiryStatus`, działają wyłącznie dla `stage = legacy_direct` i dla innych etapów zwracają brak wyniku lub nic nie robią. Test jednostkowy sprawdza, że sprawa nowego przepływu jest niewidoczna dla producenta wybranego modelu i że producent nie może na nią złożyć oferty starą ścieżką. `inquiry.status` dla nowych spraw jest zamrożone na `open` i nie jest używane przez nowe ekrany.
- **AC-35**: Gdy wszystkie zaproszenia są w stanie końcowym (odmowa, wygasło) i nie ma żadnej oferty „gotowa”, doradca widzi w kolejce sprawę „brak ofert” i może wrócić do etapu `rozmowa` (zmiana wymagań lub nowi producenci za zgodą) albo zamknąć sprawę z `closed_reason = brak_ofert`. `publishComparison` bez ofert „gotowa” jest odrzucone z czytelnym komunikatem, sprawa nie zostaje w martwym punkcie.
- **AC-36**: Klient może wycofać zgodę na udostępnianie danych (RODO art. 7 ust. 3). `withdrawConsent` dopisuje nowy wiersz `case_consent` rodzaju `withdrawal` (append only), zatrzymuje dalsze udostępnianie, powiadamia doradcę, a dane już przekazane producentowi są obsługiwane ręcznie przez doradcę.
- **AC-37**: `reopenCase` działa do 90 dni od `closed_at`, po tym czasie klient składa nowe zapytanie. `assignAdvisor` zmienia `assigned_advisor_id`, nowy doradca widzi wszystkie kanały i historię, a poprzedni zachowuje wpisy jako autor swoich wiadomości.

## Decision

**Chosen option**: Option 2: Zarządzana sprawa doradcza zbudowana na rozszerzonym `inquiry`, z własnym komunikatorem w Neon i pollingiem

ModularHub jest jedynym odbiorcą zapytania klienta i jedynym pośrednikiem informacji przed wyborem finalisty. Korzeniem sprawy pozostaje tabela `inquiry` (rozszerzona), rozmowy to `channel` i `message` w Neon z dostępem wyliczanym z rodzaju kanału i roli, brief i porównanie są niezmiennymi wersjami, a producent odpowiada przez `producer_invitation` i wersjonowaną ofertę we wspólnym formacie. Wiadomości docierają przez polling, z danymi zaprojektowanymi tak, żeby ping na żywo od dostawcy można było dodać bez migracji.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`) · `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`) · `sentry-nextjs-sdk` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-nextjs-sdk/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`)

## Feature design

**Build approach**: Tracer Bullet (domyślne podejście epiki Produkcja, `docs/scope/produkcja.md`). Build plan najpierw stawia cienki, działający wątek przez wszystkie warstwy (formularz, sprawa, kanał, wiadomość, widok doradcy), potem go pogrubia.

**Framing**: ENHANCEMENT na istniejącym stosie (Next.js 16, Drizzle, Neon przez `neon-http`, Auth.js v5, Resend, R2, Zod). Web. Zakres zgodności: RODO (dane osobowe klientów z UE, zgoda na udostępnienie danych producentowi, retencja).

### Data model

Nowe i zmieniane tabele. Wszystkie w `lib/db/schema.ts`, migracja addytywna.

**`inquiry` (rozszerzona)**

| Kolumna | Typ | Uwagi |
|---|---|---|
| plot_street, plot_postal_code, plot_city | text, null w bazie, wymagane w akcji dla nowych spraw | Pełny adres, tylko klient i admin do zgody |
| plot_region | text, null | Uzupełnia doradca, trafia do briefu |
| client_message | text, null | Wolny tekst formularza |
| assigned_advisor_id | uuid, null, FK `users` | Rola admin |
| stage | enum `case_stage`, not null, default `legacy_direct` | Patrz maszyna stanów |
| waiting_on | enum `client` / `advisor` / `producer`, null | Kto ma następny ruch, osobno od etapu |
| finalist_offer_id | uuid, null, FK `offer` | Wybrany finalista |
| finalist_selected_at | timestamptz, null | |
| closed_reason | enum, null | Powód zamknięcia bez wyboru (`brak_ofert`, `klient_zrezygnowal`, `poza_obszarem`, `do_b2b`, `inny`) |
| closed_at | timestamptz, null | Początek liczenia retencji |
| last_client_activity_at, last_advisor_activity_at | timestamptz, null | Czas od ostatniego kontaktu w kolejce |

Dotychczasowe kolumny (`status`, `idempotency_key`, migawka danych kontaktowych, `delivery_country_code`) zostają. Wiersze sprzed zmiany dostają `stage = legacy_direct`. Uwaga: imię, e mail i telefon klienta leżą na tym samym wierszu `inquiry`, który producent czyta dla spraw starych. Dlatego każdy odczyt producenta jest ograniczony do `legacy_direct` (AC-34), a odczyt spraw nowego przepływu przechodzi wyłącznie przez moduł `lib/case-producer-queries.ts` z jawnymi listami kolumn, bez kolumn osobowych.

**`producer_invitation_item`** (uzupełnienie modelu potwierdzonego w rozmowie, wynika z konieczności): (invitation_id, product_id), klucz główny obu kolumn, `origin` (`client_selection` lub `advisor_proposal`). Zaproszenie obejmuje zbiór produktów jednego producenta, a `offer_item` może wyceniać tylko produkty z tego zbioru.

**`case_field`**: klucz główny (inquiry_id, key). `key` text (z katalogu w kodzie), `value` jsonb, `state` (`confirmed`, `assumption`, `missing`, `not_applicable`), `source` (`client_card`, `client_form`, `advisor`), `updated_by`, `updated_at`.

**`brief_version`**: unikalny (inquiry_id, version). `id`, `content` jsonb (migawka pól, pytania do producenta, zakres usług, termin odpowiedzi), `status` (`draft`, `pending_approval`, `approved`), `created_by`, `approved_by`, `approved_at`. Po `approved` wiersz niezmienny (trigger).

**`producer_invitation`**: unikalny (inquiry_id, producer_id). `id`, `brief_version_id` (ostatnio wysłana), `status` (`sent`, `viewed`, `interested`, `questions`, `declined`, `offer_submitted`, `expired`), `decline_reason_code`, `neutral_summary`, `response_due_at`, `invited_at`, `viewed_at`, `consent_id` (null gdy producent pochodzi z wyboru klienta).

**`offer` (zmieniana)**: dodane `invitation_id` (null dla starych), `version`, `review_status` (`in_review`, `needs_completion`, `ready`), `review_comment`, `price_tax_mode` (`net`/`gross`), `scope_included` text, `production_lead_weeks` int, `valid_until` date, `brief_version_id` (na jakiej wersji briefu złożona). Opcjonalne z `null`: `foundation_price_cents`, `crane_price_cents`, `delivery_window` text, `payment_plan` text, `warranty` text, `assumptions` text, `document_id` (PDF). **`installation_price_cents` i `transport_price_cents` przestają być NOT NULL** (relaksacja, bezpieczna dla starych wierszy). Skalarne pola rdzenia na `offer` (`price_tax_mode`, `scope_included`, `production_lead_weeks`, `valid_until`) wymusza CHECK zależny od `invitation_id IS NOT NULL`. **`offer_item` dostaje `product_variant_id`** (FK do `product_variant`, null dla starych), a klucz główny zamienia się na surogatowe `id` z unikalnym (offer_id, product_id, product_variant_id) traktującym null jako wartość. Cena domu w `offer_item` jest wymagana tylko przez akcję (CHECK na `offer` nie widzi jej, bo wiersze powstają osobno), dlatego `submitCaseOffer` zapisuje `offer` i wszystkie `offer_item` jednym `db.batch`.

**`comparison`**: unikalny (inquiry_id, version). `id`, `advisor_summary` text (wymagane), `entries` jsonb (tablica {offer_id, advisor_note, main_risk}, walidowana Zod), `published_by`, `published_at`. Niezmienna po publikacji. Wartości liczbowe tabeli są czytane z ofert w chwili odczytu, nie kopiowane, więc osobna tabela wpisów nie jest potrzebna.

**`channel`**: `id`, `inquiry_id`, `kind` (`klient_doradca`, `producent_doradca`, `wspolny`), `producer_id` (wymagane dla dwóch ostatnich rodzajów, CHECK). Unikalny (inquiry_id, kind, producer_id) z `coalesce`, żeby `klient_doradca` też był jedyny.

**`message`**: `id`, `channel_id`, `author_user_id` (null dla systemu), `author_kind` (`client`, `advisor`, `producer`, `system`), `type` (`text`, `question_card`, `answer`, `file_request`, `file`, `brief_preview`, `brief_approval`, `consent`, `alternative_proposal`, `system_notice`), `body`, `payload` jsonb (walidowany Zod per typ), `locale`, `idempotency_key` (unikalny na kanał), `created_at`. Indeks (channel_id, created_at, id). Bez edycji i usuwania (trigger, poza akcją usunięcia na prośbę klienta z AC-31, która zeruje `body`, `payload` i usuwa pliki).

**`channel_read_state`**: klucz główny (channel_id, user_id), `last_read_at`, `last_seen_at` (ostatni poll, do reguły e maila z AC-10), `last_email_at`.

**`case_consent`**: `id`, `inquiry_id`, `client_id`, `kind` (`brief_approval`, `extra_producer`, `share_with_finalist`, `share_file`), `scope` jsonb (jakie dane, komu, którą wersję), `given_at`, `message_id`. Niezmienna (trigger).

**`case_file`**: `id`, `inquiry_id`, `channel_id`, `uploaded_by`, `r2_key`, `filename`, `mime`, `size_bytes`, `shared_with_producer_ids` (uuid[]), `created_at`. Osobna od `document`, bo `document` obsługuje publiczny bucket zdjęć.

**Relacje (ERD tekstowo)**: `inquiry` 1:N `inquiry_item`, `case_field`, `brief_version`, `producer_invitation`, `channel`, `comparison`, `case_consent`, `case_file`. `producer_invitation` 1:N `producer_invitation_item`, 1:N `offer`. `channel` 1:N `message`. `comparison.entries` odwołuje się do `offer` po identyfikatorze. `inquiry.finalist_offer_id` N:1 `offer`. `offer_item` N:1 `product_variant`.

### Maszyna stanów (`inquiry.stage`)

| Etap | Etykieta dla klienta | Kto przechodzi dalej | Warunek |
|---|---|---|---|
| `nowe` | Nowe zapytanie | doradca | Przypisanie i pierwsza odpowiedź |
| `rozmowa` | Rozmowa z doradcą | doradca | Ocena gotowości „gotowe do briefu” |
| `brief_do_zatwierdzenia` | Brief do zatwierdzenia | klient | Zatwierdzenie karty briefu |
| `producenci_odpowiadaja` | Producenci przygotowują odpowiedzi | doradca | Wszystkie zaproszenia w stanie końcowym lub decyzja doradcy. Bez ofert „gotowa” dalej: `rozmowa` albo `zamkniete_bez_wyboru` z `brak_ofert` (AC-35) |
| `porownanie_w_przygotowaniu` | ModularHub porównuje oferty | doradca | Publikacja porównania |
| `porownanie_gotowe` | Porównanie gotowe | klient | Wybór finalisty |
| `finalista_wybrany` | Producent wybrany | doradca | Utworzenie kanału wspólnego |
| `wspolne_ustalenia` | Wspólne ustalenia | (koniec zakresu) | Kolejne etapy w późniejszych specyfikacjach |
| `zamkniete_bez_wyboru` | Zakończone bez wyboru | doradca lub klient | Powód w `closed_reason`, wznowienie do 90 dni |
| `legacy_direct` | (dotychczasowy ekran) | | Stare zapytania |

Przejścia wstecz: `rozmowa` po zmianie potrzeb z `brief_do_zatwierdzenia` (nowa wersja briefu), `producenci_odpowiadaja` po nowej wersji briefu. Etap nie zastępuje `waiting_on`: dwie sprawy w `rozmowa` mogą czekać na różne osoby, więc kolejka grupuje po `waiting_on`.

### API surface

Server Actions (zapis) wewnątrz `lib/case-*.ts`, każda zaczyna od `auth()` i wspólnej funkcji dostępu. Odczyt wiadomości przez jeden Route Handler (polling).

| Akcja lub endpoint | Kto | Kluczowe wejście | Wynik | Kluczowe błędy |
|---|---|---|---|---|
| `submitAdvisoryInquiry` | klient | productIds, adres, tekst, idempotencyKey | inquiryId | brak sesji, nieobsługiwany kraj, 4+ domy |
| `GET /api/cases/[id]/channels/[channelId]/messages?after=` | uczestnik kanału | kursor (created_at, id) | wiadomości, stan przeczytania | 403 brak dostępu, 404 |
| `sendMessage` | uczestnik kanału | channelId, type, body, payload, locale, idempotencyKey | messageId | 403, walidacja payload |
| `answerCard` | klient | messageId, wartość | zapis `case_field` | karta już odpowiedziana, walidacja klucza |
| `markChannelRead` | uczestnik | channelId | ok | 403 |
| `uploadCaseFile` | klient, doradca, producent | kanał, plik | fileId | typ, rozmiar, 403 |
| `GET /api/cases/files/[fileId]` | uczestnik z dostępem | fileId | przekierowanie 302 do linku na 5 minut | 403, 404 |
| `upsertCaseField`, `assessReadiness` | doradca | klucz, wartość, stan / wynik + wiadomość | ok | zły klucz |
| `draftBrief`, `submitBriefForApproval` | doradca | zawartość | brief_version | brief zawiera pola zakazane (AC-14) |
| `approveBrief` | klient | briefVersionId | zatwierdzenie, zgoda | już zatwierdzony, cudza sprawa |
| `proposeAlternative`, `respondToProposal` | doradca, klient | productId, uzasadnienie / decyzja | karta, zgoda | brak zgody |
| `createInvitations` | doradca | producerIds, dueAt | zaproszenia | brak zatwierdzonego briefu, brak zgody na producenta spoza wyboru |
| `respondToInvitation` | producent | akcja, powód | zmiana statusu | zaproszenie cudze, wygasłe |
| `remindInvitation`, `expireInvitation` | doradca | invitationId | ok | zły status |
| `submitCaseOffer` | producent | invitationId, pola oferty | offer (nowa wersja) | brak pól rdzenia, produkt spoza zaproszenia, wyścig (partial unique) |
| `reviewOffer` | doradca | offerId, wynik, komentarz | ok | |
| `confirmOfferOnCurrentBrief` | producent | offerId | znacznik zdjęty | oferta cudza, brak nowszego briefu |
| `confirmOfferVersion` | klient | offerId (nowa wersja finalisty) | `finalist_offer_id` przestawiony | oferta nie jest wersją finalisty |
| `withdrawConsent` | klient | consentId | wiersz `withdrawal` | zgoda cudza |
| `publishComparison` | doradca | oferty gotowe, podsumowanie | comparison | brak podsumowania, brak ofert gotowych |
| `selectFinalist` | klient | offerId, zgoda | kanał wspólny | oferta nie „gotowa”, nieaktualna wersja |
| `assignAdvisor`, `closeCase`, `reopenCase`, `deleteCaseContent` | admin | | ok | |

Polling: klient JS pyta co 5 s w aktywnej karcie, co 30 s w tle (`visibilitychange`), przy błędzie odczekanie rosnące, każde zapytanie jednocześnie odświeża `last_seen_at`. Zapytanie to prosty odczyt po indeksie kanału, bez łączenia z innymi tabelami.

### Key invariants

- Jedna funkcja `requireCaseAccess(actor, inquiryId, channelId?)` wylicza dostęp z: właściciela sprawy (`client_id`), zaproszenia producenta i roli admin. Żadna trasa, akcja ani zapytanie nie sprawdza dostępu po swojemu.
- `producer_invitation` nie może powstać bez zatwierdzonej `brief_version` tej sprawy i, dla producenta spoza wyboru klienta, bez `case_consent` rodzaju `extra_producer`. Wymuszone w akcji i triggerem.
- Dane kontaktowe klienta i pełny adres nie występują w żadnym zapytaniu widocznym dla producenta przed `case_consent` rodzaju `share_with_finalist`. Widok bazy nie jest bramką (aplikacja łączy się jako właściciel, bez RLS), więc gwarancję daje moduł `lib/case-producer-queries.ts` z jawnymi listami kolumn bez danych osobowych, jedyne źródło spraw nowego przepływu dla panelu producenta, plus test, który wykrywa zapytanie producenta sięgające po `inquiry.name`, `email`, `phone` albo pola adresu dla etapu innego niż `legacy_direct`.
- Wybór finalisty jest atomowy i jednokrotny: `selectFinalist` wykonuje `UPDATE inquiry SET finalist_offer_id = ... WHERE id = ... AND finalist_offer_id IS NULL RETURNING` i tworzy kanał wspólny tylko, gdy zwrócono wiersz. Dodatkowo częściowy unikalny indeks na `channel(inquiry_id) WHERE kind = 'wspolny'`. Dwa równoległe wybory nie mogą otworzyć dwóch kanałów ani ujawnić danych dwóm producentom.
- Niezmienne: zatwierdzone `brief_version`, opublikowane `comparison`, `case_consent`, każda złożona oferta. Nowa oferta to nowy wiersz, poprzednia dostaje `superseded` (mechanizm ze spec 0018 i 0033, w jednym `db.batch`).
- Brak ceny to `null`, nigdy `0`. UI, porównanie i eksport pokazują „brak informacji”.
- Najwyżej jedna aktywna oferta na (sprawa, producent), utrzymana istniejącym częściowym unikalnym indeksem.
- Wiadomość ma jedno `idempotency_key` na kanał, ponowienie po błędzie zwraca istniejący wiersz.
- `order` nie powstaje w tej specyfikacji. Akcja `respondToOffer` z spec 0033 działa tylko dla `stage = legacy_direct`.

### Security model

- Klient: własne sprawy, kanały `klient_doradca` i `wspolny`, zatwierdzony i roboczy brief, opublikowane porównania, własne pliki.
- Producent: własne zaproszenia z briefem (bez danych osobowych klienta), własny kanał `producent_doradca`, własne oferty, po wyborze kanał `wspolny` i dane kontaktowe. Nigdy cudze zaproszenia, oferty, porównania.
- Admin (doradca): wszystko, zapis przez akcje, każde wejście do sprawy innego doradcy jest widoczne w dzienniku audytu (`audit_log`).
- Zgodność RODO: dane w regionie UE (Neon Frankfurt, R2 jurysdykcja EU). Zgoda na udostępnienie danych producentowi jest osobnym, niezmiennym wpisem. Retencja: 24 miesiące po `closed_at`, potem anonimizacja treści i plików, zostają metadane i zgody. Usunięcie na prośbę klienta wykonuje akcja administratora. Treść e maili nie zawiera wiadomości. Właściwości zdarzeń analitycznych są oczyszczane przez `lib/observability/scrub.ts`.

### Configuration required

- `CASE_PRIVATE_R2_BUCKET_NAME`, `CASE_PRIVATE_R2_ACCESS_KEY_ID`, `CASE_PRIVATE_R2_SECRET_ACCESS_KEY`: osobny, prywatny bucket EU dla plików rozmów, z własną parą kluczy (wzorzec `lib/storage/ai-private-r2-client.ts`).
- `ADVISOR_NOTIFY_EMAIL`: adres, na który idzie alarm o nowej sprawie.
- `ADVISOR_FIRST_REPLY_HOURS`: próg kolejki „czeka na pierwszą odpowiedź” (domyślnie 24).
- Nowa zależność `@aws-sdk/s3-request-presigner` (dotąd świadomie bez niej, spec 0031). Pojawia się wyłącznie w kliencie prywatnego bucketa.
- Istniejące: `RESEND_API_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`.

### Critical test scenarios

- Happy path: klient wysyła zapytanie, doradca odpisuje, klient odpowiada kartą, doradca zatwierdza brief z klientem, dwa zaproszenia, dwie oferty, porównanie, wybór finalisty, kanał wspólny, verifies **AC-3, AC-6, AC-7, AC-15, AC-18, AC-21, AC-24, AC-25, AC-26**.
- Prywatność: producent A prosi o kanał producenta B, o kanał klienta, o cudzą ofertę i o plik z kanału klienta, we wszystkich przypadkach 403 lub 404 bez wycieku istnienia, verifies **AC-8, AC-9, AC-31**.
- Bramka briefu: `createInvitations` bez zatwierdzonego briefu i dla producenta spoza wyboru bez zgody jest odrzucone na poziomie akcji i bazy, verifies **AC-4, AC-15, AC-17**.
- Idempotencja: dwukrotne wysłanie zapytania i wiadomości z tym samym kluczem, verifies **AC-3, AC-6**.
- Brak zera: oferta bez transportu pokazana jako „brak informacji” w porównaniu, nie jako 0 EUR, verifies **AC-21, AC-24**.
- Zmiana briefu: nowa wersja, karta aktualizacji u wszystkich producentów, stara oferta ze znacznikiem, verifies **AC-16**.
- Wyścig oferty: dwa równoległe `submitCaseOffer` tego samego producenta zostawiają jedną aktywną, verifies **AC-22**.
- E mail bez lawiny: sześć wiadomości w 2 minuty daje najwyżej jeden e mail, aktywny odbiorca nie dostaje żadnego, verifies **AC-10**.
- Wyciek przez stare zapytania: producent wybranego modelu nie widzi nowej sprawy w `getInquiriesForProducer` ani `getInquiryDetailForProducer` i nie może na nią złożyć oferty przez `submitOffer`, verifies **AC-4, AC-34**
- Wyścig finalisty: dwa równoległe `selectFinalist` na tej samej sprawie dają jeden kanał `wspolny` i jednego producenta z danymi, drugi dostaje błąd, verifies **AC-25, AC-26**
- Idempotencja po częściowym błędzie: ponowienie `submitAdvisoryInquiry` po błędzie zapisu kanału zwraca ten sam `inquiryId` i jeden kanał, verifies **AC-3**
- Brak ofert: wszystkie zaproszenia odrzucone, `publishComparison` odrzucone z komunikatem, sprawa może wrócić do `rozmowa` albo zostać zamknięta, verifies **AC-35**
- Waluta: oferta w PLN przy briefie w EUR oznaczona „poza założeniami briefu” i niesumowana, verifies **AC-24**
- Wycofanie zgody i redakcja: `withdrawConsent` dopisuje wiersz, `deleteCaseContent` zeruje treść wiadomości mimo triggera niezmienności, zgody zostają, verifies **AC-31, AC-36**
- Dostęp do starych spraw: ścieżka `legacy_direct` i B2B bez zmian, verifies **AC-32**.
- E2E (Playwright): klient, doradca i producent w trzech sesjach przechodzą cały wątek, verifies **AC-1 do AC-30**.

## Migration plan

**Strategy**: strangler (nowy przepływ obok starego, stary wygasa sam, bo nowe zapytania o pojedyncze domy idą tylko nową ścieżką). Bez przełącznika awaryjnego, zgodnie z decyzją inżyniera. Wycofanie to cofnięcie wdrożenia, migracja jest addytywna.
**Phases**:
1. Migracje addytywne, każda razem z krokiem budowy, który jej potrzebuje: najpierw kolumny `inquiry` (nullable, `stage` z domyślną `legacy_direct`) i `channel`, `message`, `channel_read_state`, potem kolejne tabele. Stare wiersze nietknięte, stare ekrany działają. Filtry `legacy_direct` na starych zapytaniach i akcjach wchodzą w tym samym commicie co pierwsze utworzenie nowej sprawy.
2. Wdrożenie kodu nowego przepływu: `submitInquiry` dla pojedynczych domów zastąpiony `submitAdvisoryInquiry`. Stary formularz i akcja pozostają tylko dla ścieżek, które ich jeszcze używają (B2B ma własne tabele).
3. Panel producenta pokazuje zaproszenia obok starych zapytań (`legacy_direct`), panel klienta pokazuje sprawy z nowym widokiem i stare zapytania ze starym widokiem.
4. Po wygaśnięciu spraw `legacy_direct` osobna decyzja o usunięciu martwej ścieżki (poza tą specyfikacją).
**Rollback**: cofnięcie wdrożenia kodu. Nowe kolumny i tabele zostają nieużywane, żaden stary wiersz nie został zmieniony poza dodaniem `stage`.
**Risks**: relaksacja NOT NULL na `offer` osłabia gwarancję dla starych ofert (mitigacja: CHECK zależny od `invitation_id`). Zapytanie klienta czeka, gdy doradca jest nieosiągalny (mitigacja: oczekiwany czas odpowiedzi, alarm e mail, kolejka). Producent może pominąć platformę, dopóki nie dostanie danych (mitigacja: dane dopiero po zgodzie, ale nie da się tego wyeliminować całkowicie).

## Build plan

Podejście Tracer Bullet: najpierw cienki, prawdziwy wątek od formularza do odpowiedzi doradcy z pełną ochroną prywatności, potem pogrubianie. Każdy krok wnosi własne tabele i migrację, żeby nic nie powstało przed potrzebą.

1. Migracja 1: kolumny `inquiry` (adres, wiadomość, `assigned_advisor_id`, `stage` z domyślną `legacy_direct`, `waiting_on`, pola aktywności), enumy, tabele `channel` (z częściowym unikalnym indeksem dla `wspolny`), `message` (z triggerem niezmienności i wyjątkiem redakcji), `channel_read_state`. Weryfikacja na jednorazowym branchu Neon przed `db:migrate`, satisfies **AC-3, AC-6, AC-31, AC-32**
2. Osłona starego przepływu w tym samym commicie co pierwsze utworzenie nowej sprawy: filtr `stage = legacy_direct` w `getInquiriesForProducer`, `getInquiryDetailForProducer`, `submitOffer`, `respondToOffer`, `markOffer*Viewed`, `recomputeInquiryStatus`, plus test, że sprawa nowego przepływu jest niewidoczna dla producenta wybranego modelu i nie można na nią złożyć oferty starą ścieżką, satisfies **AC-4, AC-32, AC-34**
3. `requireCaseAccess` i moduł `lib/case-producer-queries.ts` (jawne kolumny bez danych osobowych), testy uprawnień dla klienta, admina i producenta bez zaproszenia (odmowa), satisfies **AC-8, AC-31**
4. Cienki wątek: przycisk i formularz zapytania (adres, wolny tekst), `submitAdvisoryInquiry` z idempotencją, kanał `klient_doradca` z wiadomością systemową, strona sprawy klienta z tekstowym czatem i pollingiem (wstrzykiwany zegar), widok sprawy doradcy z odpowiedzią i przypisaniem, satisfies **AC-1, AC-2, AC-3, AC-5, AC-6, AC-11**
5. Powiadomienia i zdarzenia: Resend (alarm o nowej sprawie, zdarzenia kluczowe, reguła jednego e maila w oknie 10 minut z wykryciem aktywności w `channel_read_state`), nowe nazwy w `EventName` i zdarzenia przez `lib/observability`, satisfies **AC-5, AC-10, AC-33**
6. Migracja 2 i karty: `case_field`, katalog kluczy (Zod), typy kart z walidacją payload, `answerCard`, ocena gotowości, satisfies **AC-7, AC-12, AC-13**
7. Migracja 3 i pliki: `case_file`, prywatny bucket, klient prywatny z podpisywaniem, `uploadCaseFile`, `GET /api/cases/files/[fileId]`, reguła udostępnienia plików producentowi, satisfies **AC-9**
8. Migracja 4, brief i zgoda: `brief_version`, `case_consent`, szkic, podgląd, `approveBrief`, waluta i tryb podatku w briefie, wersjonowanie i karta aktualizacji, satisfies **AC-14, AC-15, AC-16**
9. Migracja 5, zaproszenia i panel producenta: `producer_invitation`, `producer_invitation_item`, `createInvitations`, alternatywy za zgodą, ekran zaproszeń w `producer/panel/inquiries`, akcje producenta, kanał `producent_doradca`, ręczne przypomnienie i wygaszenie, oznaczenie po terminie, `confirmOfferOnCurrentBrief`, satisfies **AC-17, AC-18, AC-19, AC-20, AC-16**
10. Migracja 6, oferta we wspólnym formacie: zmiany `offer` i `offer_item` (wariant, surogatowy klucz), `submitCaseOffer` jednym `db.batch`, wersje, kontrola doradcy i zwrot do uzupełnienia, satisfies **AC-21, AC-22, AC-23**
11. Migracja 7, porównanie: `comparison` z `entries`, tabela z pól ofert, podsumowanie doradcy, oznaczenie ofert poza założeniami briefu, publikacja, widok klienta, obsługa braku ofert (AC-35), satisfies **AC-24, AC-35**
12. Finalista: karta zgody z komunikatem o prowizji, atomowy `selectFinalist`, kanał `wspolny` z pierwszą wiadomością, neutralne zakończenie dla pozostałych, `confirmOfferVersion`, satisfies **AC-25, AC-26, AC-27, AC-28, AC-29**
13. Kolejka doradcy w panelu administratora: grupy według następnej czynności z progami, widok sprawy, zamknięcie, `reopenCase`, `deleteCaseContent`, `withdrawConsent`, satisfies **AC-30, AC-31, AC-36, AC-37**
14. Testy: Vitest dla akcji, uprawnień, idempotencji, wyścigów i okien czasowych (wstrzykiwany zegar), Playwright dla trzech sesji od zapytania do wspólnej rozmowy, testy dostępności ekranów, satisfies **AC-1 do AC-37**

## Consequences

**Positive**:
- Klient ma jedną rozmowę i jeden brief zamiast kilku formularzy, a producent dostaje uporządkowane dane i wspólny format oferty, co poprawia porównywalność.
- Platforma kontroluje przepływ informacji i dane kontaktowe do momentu wyboru finalisty, co jest jej podstawową wartością.
- Model wersjonowany i niezmienny daje ślad decyzji użyteczny w sporach i do mierzenia lejka.
- Ping na żywo, tłumaczenie, automatyczne przypomnienia i kontrakt dochodzą później bez zmiany rdzenia.

**Negative / tradeoffs**:
- Doradca staje się wąskim gardłem: przy jednej osobie liczba jednoczesnych spraw ogranicza wzrost. To świadomy koszt modelu zarządzanego.
- Odpowiedź w rozmowie pojawia się do 5 sekund później, nie natychmiast.
- Brak zadania w tle oznacza, że przypomnienia i wygaszanie są ręczne, a e mail o wiadomości idzie z regułą okna 10 minut zamiast „po 5 minutach nieprzeczytania”.
- Pojedyncze zapytanie nie trafia już od razu do producenta, więc szybkość pierwszej odpowiedzi zależy od doradcy.
- Powstaje około dziesięciu nowych tabel i logika uprawnień, którą trzeba pilnować testami.
- Ryzyko obchodzenia platformy przez producenta po zdobyciu danych klienta zostaje, choć ograniczone przez moment ich udostępnienia.

**Neutral**:
- Dziś `respondToOffer` tworzy `order` przy przyjęciu oferty. W nowym przepływie `order` powstanie dopiero w specyfikacji o kontrakcie.
- Nowa zależność `@aws-sdk/s3-request-presigner` i osobny bucket R2 z własnymi kluczami.
- Etykiety etapów i treść komunikatu o prowizji są w katalogu tłumaczeń, wymagają tłumaczenia na aktywne języki.

## Follow-up

- [ ] Dodać funkcję do `docs/scope/produkcja.md` i podlinkować tę specyfikację (`/scope`), bo brak wiersza, który ją opisuje.
- [ ] Dodać notę w spec 0033 i 0023, że przepływ pojedynczego domu został zastąpiony przez 0048 (poza `legacy_direct`).
- [ ] Osobne specyfikacje: kontrakt i utworzenie `order`, transport i przewoźnicy, automatyczne przypomnienia i wygaszanie zaproszeń (wymaga zadania w tle: Vercel Cron w planie Pro albo zaplanowany workflow GitHub Actions), ping na żywo od dostawcy (Ably lub Pusher, do zweryfikowania cen i regionu danych), automatyczna anonimizacja po 24 miesiącach (pierwsze sprawy dojrzeją za około dwa lata), tłumaczenie maszynowe.
- [ ] Rozważyć logowanie odczytów doradcy (kto wszedł do czyjej sprawy). Dziś audyt reaguje tylko na zapisy, a `neon-http` nie przekazuje aktora poza pierwszą instrukcją `db.batch`, więc tej wersji nie obiecujemy.
- [ ] Przegląd innym modelem zaproponował uproszczenie na pierwszą wersję: zrezygnować z `case_field` i systemu kart, a brief prowadzić jako jeden dokument jsonb wypełniany formularzem podczas rozmowy. Zostawiono zgodnie z decyzją inżyniera (wiersz na pole, karty od pierwszej wersji), ale to najtańszy sposób na skrócenie budowy, jeśli krok 6 planu zacznie się rozciągać.
- [ ] Prawnik: podstawa prawna zgody na udostępnienie danych, treść komunikatu o prowizji, okres retencji 24 miesiące, obowiązek informacyjny.
- [ ] Zweryfikować przed decyzją o pingu: limity darmowych planów dostawców, dostępność WebSocketów na Vercel (raportowane jako publiczna beta, nieprzetestowane), zachowanie `LISTEN/NOTIFY` na pulowanym adresie Neon (z wiedzy, niepotwierdzone).
- [ ] Ustalić, które wersje językowe formularza i strony sprawy są na start (klucze w katalogu tłumaczeń dla wszystkich aktywnych, treść polska jako źródło).
- [ ] `lib/storage/AGENTS.md`: dopisać prywatny bucket rozmów (osobne klucze, linki podpisywane, brak publicznej domeny). Nowy `lib/cases/AGENTS.md` (funkcja dostępu, katalog kart) po zbudowaniu, przez `/sync`.
- [ ] Wszystkie użyte skille są zainstalowane i wymienione w `AGENTS.md`, żadnego brakującego.

## Rationale

Uzasadnienie, rozważane opcje, źródła: patrz [rationale.md](rationale.md).
