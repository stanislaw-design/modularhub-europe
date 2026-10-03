# 0062. Tablica ogłoszeń B2B i odpowiadanie na nią

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Ta decyzja dodaje brakujące ekrany na szkielet danych i funkcje serwerowe zbudowane w spec 0037/0038: tablicę ogłoszeń, na której każdy zweryfikowany wolumenowo producent widzi wszystkie otwarte zapytania o duże zamówienia i może złożyć wycenę, ekran producenta do przeglądania własnych wycen, i ekran klienta do przeglądania otrzymanych wycen i ich akceptacji. Zastępuje dzisiejsze automatyczne, ciche dopasowanie zapytania do producentów po kraju dostawy (push) otwartą tablicą (pull), bez żadnej ręcznej moderacji po drodze. Dane kontaktowe inwestora są zawsze zamaskowane dla producenta, aż klient formalnie zaakceptuje jego wycenę, co dzieje się automatycznie, bez dodatkowego kroku administratora.

> ⚠️ Premise note (poprawka po cross checku): dzisiejsza `submitProjectQuote` nie jest neutralna wobec usunięcia push. Dla wycen na `project_request` funkcja dziś **wymaga** wiersza w `project_request_target_producer`, inaczej odmawia ("Nie jesteś przypisany do tego zapytania"). Usunięcie tabeli bez zastąpienia tego sprawdzenia zablokowałoby każdą wycenę z tablicy, czyli całą tę funkcję. Ten spec zastępuje tamto sprawdzenie bezpośrednią autoryzacją wewnątrz `submitProjectQuote` (AC-13), nie tylko bramką na poziomie ekranu, bo akcja serwerowa jest wołana bezpośrednio, nie tylko przez UI.

## Context

Patrz [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako zweryfikowany wolumenowo producent, chcę widzieć wszystkie otwarte zapytania o duże zamówienia, nie tylko te automatycznie dopasowane po kraju dostawy, żeby móc zaproponować wycenę nawet na indywidualne zlecenie poza moją dzisiejszą deklarowaną dostawą.
- Jako producent, chcę widzieć status moich własnych złożonych wycen w jednym miejscu, żeby wiedzieć, które są jeszcze aktywne.
- Jako inwestor, chcę przeglądać otrzymane wyceny na moje zapytanie i zaakceptować najlepszą, bez ujawniania moich danych kontaktowych producentom, których ofert nie wybrałem.
- Jako inwestor, chcę wiedzieć, że pola wolnego tekstu w moim zapytaniu są widoczne dla wszystkich zweryfikowanych producentów, żeby nie wpisać tam nieumyślnie danych, które mnie identyfikują.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: `submitProjectRequest` nie wywołuje już `autoTargetProducers`; każde nowe `project_request` dostaje pole `trustSignal` ustawione raz, przy zapisie, na `complete` gdy domena e-mail nie jest na krótkiej, własnej liście domen jednorazowych i podano telefon, inaczej na `new`. Etykieta w UI nigdy nie twierdzi, że ModularHub zweryfikował tożsamość inwestora, tylko że dane kontaktowe wyglądają kompletne (patrz nazewnictwo w Feature design, poprawione po cross checku z `verified` na `complete`, żeby nie sugerować weryfikacji platformy).
- **AC-2**: Zalogowany producent z `producer_capacity_profile.volumeVerificationStatus = approved` widzi na `/producer/panel/board` paginowaną listę wszystkich `project_request` ze statusem `open` lub `quoted`, każde z `trustSignal`, danymi do wyceny (kraj, typ przedsięwzięcia, rodziny, liczba sztuk, metraż, standard wykończenia, okna dat), ale nigdy z `contactName`/`contactEmail`/`contactPhone`.
- **AC-3**: Zalogowany producent bez zatwierdzonego `volumeVerificationStatus` widzi na `/producer/panel/board` tresciwy stan pusty wyjaśniający, że tablica jest tylko dla zweryfikowanych wolumenowo, z odnośnikiem do uzupełnienia profilu zdolności (`updateProducerCapacityProfile`), nie błąd i nie przekierowanie poza tę trasę.
- **AC-4**: Kliknięcie ogłoszenia prowadzi na `/producer/panel/board/[id]` z pełnymi danymi do wyceny i formularzem wołającym `submitProjectQuote` (zmienioną wewnętrznie, patrz AC-13, ale bez zmiany sygnatury wejścia/wyjścia); strona pokazuje też, jeśli ten producent już złożył wycenę na to zapytanie, jej aktualny status.
- **AC-5**: Osobny ekran `/producer/panel/board-quotes` pokazuje listę własnych wycen producenta (łącznie z tablicy i z dotychczasowego modala `bulk_product_inquiry` na `/project/[id]`), każdą ze statusem (`active`/`superseded`/`accepted`/`rejected`), ceną i proponowanym czasem realizacji.
- **AC-6**: Nowy ekran w panelu klienta pokazuje listę otrzymanych wycen na własne `project_request` i `bulk_product_inquiry`, każdą z jawną nazwą producenta (tożsamość producenta jest już publiczna), ceną, proponowanym czasem realizacji, notatkami, i przyciskiem Akceptuj wołającym bez zmian istniejące `acceptProjectQuote`. Gdy klient nie ma zatwierdzonego `b2bVerificationStatus`, przycisk pozostaje klikalny, ale pokazuje istniejący komunikat błędu `acceptProjectQuote` ("Twoja weryfikacja B2B nie jest jeszcze zatwierdzona") w miejscu, nie ukrywa przycisku i nie udaje sukcesu.
- **AC-7**: `acceptProjectQuote` ustawia `contactRevealedAt` na zaakceptowanej wycenie w tej samej operacji, w której zmienia jej status na `accepted`; dopiero od tego momentu dane kontaktowe inwestora są widoczne temu konkretnemu producentowi, wyłącznie w szczegółach tej jednej wyceny na `/producer/panel/board-quotes`.
- **AC-8**: Wyceny tego samego zapytania, które nie zostały zaakceptowane, przechodzą (już istniejące zachowanie) na status `rejected` i nigdy nie dostają `contactRevealedAt`.
- **AC-9**: Migracja usuwa tabelę `project_request_target_producer` i enum `target_producer_status`; `autoTargetProducers` i `markProjectRequestViewedOrDeclined` są usunięte z kodu wraz z testami, które ich dotyczyły.
- **AC-10**: Formularz `/project-request` (spec 0038) pokazuje krótki hint pod polami `extrasNote` i `locationDetail`, ostrzegający, że te pola widzą wszyscy zweryfikowani wolumenowo producenci.
- **AC-11**: Wszystkie nowe ekrany mają prawdziwe tłumaczenia pl/en/nl (nie kopię polskiego tekstu) i spełniają WCAG 2.2 AA: jeden prawdziwy `<h1>`, logiczna kolejność fokusu, stan pusty/błędu komunikowany ikoną plus tekstem.
- **AC-12**: Gdy administrator cofnie producentowi `volumeVerificationStatus` po tym, jak już złożył wycenę, wywołanie `acceptProjectQuote` na tę wycenę nadal się udaje (test wywołuje funkcję serwerową bezpośrednio, nie przez UI): wycena zostaje zaakceptowana i widoczna; cofnięcie weryfikacji blokuje wyłącznie nowe wywołania `submitProjectQuote` tego producenta (przez AC-13), nie wcześniej złożone wyceny.
- **AC-13** (dodane po cross checku): `submitProjectQuote` sama, wewnątrz funkcji, nie tylko przez bramkę ekranu, sprawdza dla ścieżki `project_request`: `producer_capacity_profile.volumeVerificationStatus = approved` tego producenta ORAZ `project_request.status IN ('open', 'quoted')`; brak któregoś z tych warunków zwraca błąd i nie zapisuje wyceny. To zastępuje dzisiejsze sprawdzenie przez `project_request_target_producer`, usuwane w AC-9.
- **AC-14** (dodane po cross checku): wstawienie nowej wyceny na `project_request` jest blokowane, gdy TO zapytanie ma już jakąkolwiek zaakceptowaną wycenę OD KTÓREGOKOLWIEK producenta, nie tylko od tego samego producenta jak dziś; zapobiega wyścigowi, w którym drugi producent składa wycenę po tym, jak klient już zaakceptował inną.
- **AC-15** (dodane po cross checku): `getProjectQuotesForProducer` zwraca dane kontaktowe inwestora w wierszu wyceny wyłącznie, gdy `contactRevealedAt` tej wyceny jest ustawione; dla pozostałych wierszy (aktywna, zastąpiona, odrzucona) pola kontaktowe są nieobecne w odpowiedzi, tym samym sprawdzeniem na poziomie zapytania SQL co AC-2.

## Options considered

Patrz [rationale.md](rationale.md): cztery opcje rozważone (ręczne, kuratorowane przekazywanie; status quo z automatycznym push po kraju; otwarta tablica zastępująca push; hybryda push plus tablica).

## Decision

**Chosen option**: Option 3: otwarta tablica ogłoszeń (pull), zastępująca dzisiejszy automatyczny push całkowicie, z maskowaniem danych kontaktowych inwestora do momentu akceptacji wyceny.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Rationale

Patrz [rationale.md](rationale.md) (ten plik niesie pełne uzasadnienie i rozważone opcje; `/develop` go nie potrzebuje).

## Feature design

**Data model sketch**:

| Tabela | Zmiana | Pole | Typ | Uwagi |
|---|---|---|---|---|
| `project_request` | ADD | `trust_signal` | enum (`new`, `complete`), NOT NULL, default `new` | Ustawiane raz w `submitProjectRequest`; nigdy nie przeliczane później. Nazwa wartości `complete`, nie `verified` (poprawka po cross checku): to tylko "dane kontaktowe wyglądają kompletne", nie weryfikacja tożsamości przez ModularHub; UI musi to odzwierciedlić w copy. |
| `project_quote` | ADD | `contact_revealed_at` | timestamp, NULL | Ustawiane w `acceptProjectQuote`; wspólne dla wycen na `project_request` i na `bulk_product_inquiry` (to pole już dziś obsługuje oba typy). Dziś równoważne `status = 'accepted'` tej samej wyceny (bo nic poza akceptacją go nie ustawia), ale trzymane jako osobna kolumna, nie wyliczane ze statusu, żeby odłożony Follow-up (ręczny, wcześniejszy override ujawnienia) nie wymagał kolejnej migracji, gdy powstanie. |
| `project_request_target_producer` | DROP (cała tabela) | — | — | Push zastąpiony przez pull; dane historyczne (ręczny zasiew Budman House, spec 0038) tracone, zaakceptowane przez inżyniera. Zastępowana autoryzacja: AC-13. |
| `target_producer_status` (enum) | DROP | — | — | Usuwany razem z tabelą powyżej |

Relacje bez zmian: `project_request` 1:N `project_quote`, `bulk_product_inquiry` 1:N `project_quote`, `project_quote` N:1 `producer`.

**Reguła widoczności tablicy** (logika odczytu, nie nowa kolumna): `project_request` gdzie `status IN ('open', 'quoted')`; odczyt dla producenta nigdy nie wybiera `contactName`/`contactEmail`/`contactPhone` z bazy (maskowanie na poziomie zapytania SQL, nie na poziomie renderowania UI, żeby te dane nigdy nie trafiły nawet do odpowiedzi serwera). Ta sama zasada obowiązuje `getProjectQuotesForProducer` (AC-15): kontakt wybierany tylko dla wiersza z `contactRevealedAt IS NOT NULL`.

**State transitions**:

`project_request.status`: `open` → `quoted` (pierwsza aktywna wycena, bez zmian) → `accepted`/`closed` (bez zmian). Tablica pokazuje `open` i `quoted`, chowa `accepted`/`closed`.

`project_quote.contactRevealedAt`: `null` → znacznik czasu, ustawiany wyłącznie przez `acceptProjectQuote` w momencie przejścia tej samej wyceny na `accepted`. Nigdy nie cofany.

`project_request.trustSignal`: ustawiane raz przy wstawieniu wiersza, nigdy nie przeliczane (brak kolejki recenzji, brak mechanizmu podwyższania statusu po fakcie w tej wersji).

**API surface**:

| Powierzchnia | Typ | Kluczowe dane wejściowe | Kluczowe dane wyjściowe | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `submitProjectRequest` (zmieniona, `lib/project-request-actions.ts`) | Istniejąca funkcja serwerowa, zmieniona | bez zmian w sygnaturze | `{ ok, id }`; `trustSignal` liczony i zapisany wewnętrznie | brak (publiczne) | bez zmian |
| `computeTrustSignal` (nowa, `lib/project-request-specs.ts`) | Czysta funkcja pomocnicza | `contactEmail`, `contactPhone` | `"new" \| "complete"` | — | — |
| `getOpenProjectRequestsForBoard` (nowa, `lib/db/queries.ts`) | Odczyt, paginowany | `{ page }` | lista zamaskowanych ogłoszeń (bez kontaktu), `totalCount` | sesja producenta + `volumeVerificationStatus = approved` | pusta lista gdy brak otwartych zapytań |
| `getProjectRequestForBoardDetail` (nowa, `lib/db/queries.ts`) | Odczyt | `id`, `producerId` | zamaskowane ogłoszenie + status własnej wyceny producenta na nie, jeśli istnieje | sesja producenta + approved | `null` gdy nie znaleziono albo status poza `open`/`quoted` |
| `submitProjectQuote` (zmieniona wewnętrznie, `lib/project-quote-actions.ts`) | Istniejąca funkcja serwerowa; ścieżka `project_request` zmieniona (AC-13, AC-14), sygnatura wejścia/wyjścia bez zmian | bez zmian | `{ ok, error? }` | sesja producenta + `volumeVerificationStatus = approved` sprawdzane wewnątrz funkcji (AC-13), nie tylko przez ekran | nowy błąd gdy producent nie-zweryfikowany albo zapytanie już nie `open`/`quoted` |
| `acceptProjectQuote` (zmieniona, `lib/project-quote-actions.ts`) | Istniejąca funkcja serwerowa, zmieniona | `quoteId` | `{ ok }`; ustawia `contactRevealedAt` na zaakceptowanej wycenie w tym samym batchu | sesja klienta + `b2bVerificationStatus = approved` | bez zmian |
| `getProjectQuotesForProducer` (nowa, `lib/db/queries.ts`) | Odczyt | `producerId` | lista własnych wycen (oba typy źródła), status, cena, czas realizacji; kontakt inwestora wyłącznie dla wiersza z `contactRevealedAt` ustawionym (AC-15) | sesja producenta | pusta lista |
| `getProjectRequestsWithQuotesForClient` (nowa, `lib/db/queries.ts`) | Odczyt | `clientId` | lista własnych zapytań z ich wycenami, każda z nazwą producenta (jawną), ceną, statusem, `contactRevealedAt` | sesja klienta | pusta lista |

**Key invariants**:
- Odczyt dla producenta (`getOpenProjectRequestsForBoard`, `getProjectRequestForBoardDetail`) nigdy nie zawiera w zapytaniu SQL kolumn `contactName`/`contactEmail`/`contactPhone`; to gwarancja na poziomie zapytania, nie na poziomie tego, co renderuje UI.
- `getProjectQuotesForProducer` wybiera kontakt inwestora tylko dla wiersza, gdzie `contactRevealedAt IS NOT NULL`; dla każdego innego wiersza te kolumny są nieobecne w zapytaniu SQL, nie tylko niewyświetlane (AC-15).
- `contactRevealedAt` jest ustawiane wyłącznie przez `acceptProjectQuote`, nigdy przez żadną akcję producenta; producent nie ma żadnej drogi, by samemu sobie ujawnić kontakt.
- `submitProjectQuote` dla ścieżki `project_request` sprawdza `volumeVerificationStatus = approved` i `project_request.status IN ('open', 'quoted')` wewnątrz samej funkcji serwerowej, nie tylko przez bramkę ekranu `/producer/panel/board` (AC-13); to jest realna granica bezpieczeństwa, bo akcja serwerowa jest adresowalna niezależnie od strony, która ją woła.
- Wstawienie nowej wyceny na `project_request` jest blokowane, gdy to zapytanie ma już jakąkolwiek zaakceptowaną wycenę, niezależnie od tego, który producent ją zaakceptował (AC-14); warunek sprawdzany w tym samym `WHERE NOT EXISTS` co dziś, rozszerzonym o usunięcie filtra po `producer_id`.
- Tablica nigdy nie filtruje po kraju dostawy producenta domyślnie; producent sam ocenia, czy zapytanie ma sens, zgodnie z Option 3 (patrz rationale.md).
- `trustSignal` nigdy nie blokuje widoczności zapytania na tablicy; to czysto kosmetyczna etykieta, i nigdy nie jest prezentowana w UI jako weryfikacja tożsamości przez ModularHub.
- Cofnięcie `volumeVerificationStatus` producenta nie wpływa retroaktywnie na już złożone przez niego wyceny (AC-12); blokuje tylko nowe wywołania `submitProjectQuote` tego producenta (przez AC-13).

**Security model**:
- `/producer/panel/board`, `/producer/panel/board/[id]`, `/producer/panel/board-quotes`: ten sam wzorzec sesji co dzisiejsze `/producer/panel/*` (`requirePanelProducerSession`, `lib/panel-session.ts`), plus dodatkowe sprawdzenie `volumeVerificationStatus = approved` do pokazania tablicy (AC-2, AC-3); `/producer/panel/board-quotes` nie wymaga approved (producent widzi swoje dawniejsze wyceny nawet po cofnięciu weryfikacji, patrz AC-12). Realna granica bezpieczeństwa dla składania wyceny żyje jednak w `submitProjectQuote` samej (AC-13), nie w bramce ekranu, bo serwerowa akcja jest wołalna niezależnie od UI.
- Nowy ekran klienta: ten sam wzorzec co dzisiejsze `/panel/*` (`requirePanelClientSession`); własność wymuszona przez filtr `clientId` w zapytaniu SQL (ten sam wzorzec co istniejące zapytania klienta).
- Bez zmian względem spec 0037 w podstawie prawnej RODO (art. 6 ust. 1 lit. b): to rozszerzenie istniejącego przepływu, nie nowy cel przetwarzania. Maskowanie kontaktu jest dodatkową ochroną techniczną, nie zmienia podstawy prawnej.
- `/internal/producers` (panel admina) pozostaje bez zmian w tej wersji; ręczny, wcześniejszy override ujawnienia kontaktu jest świadomie odłożony, patrz Follow-up.

**Configuration required**: brak nowych zmiennych środowiskowych ani poświadczeń.

**Critical test scenarios** (każdy odwołuje się do kryterium w `## Requirements`):
- Happy path: inwestor wysyła `/project-request`, zweryfikowany wolumenowo producent widzi je na `/producer/panel/board` bez danych kontaktowych, klika, składa wycenę; inny zweryfikowany producent widzi to samo zapytanie i składa konkurencyjną wycenę; weryfikuje **AC-1, AC-2, AC-4, AC-13**.
- Happy path (akceptacja): klient widzi obie wyceny w panelu, akceptuje jedną; zaakceptowany producent widzi odtąd kontakt klienta wyłącznie w tej jednej wycenie na `/producer/panel/board-quotes`, drugi producent nigdy go nie widzi; weryfikuje **AC-6, AC-7, AC-8, AC-15**.
- Edge case (brak uprawnień, ekran): producent zalogowany, ale bez zatwierdzonego profilu zdolności, wchodzi na `/producer/panel/board`; widzi stan pusty z linkiem do profilu, nie błąd; weryfikuje **AC-3**.
- Edge case (brak uprawnień, akcja): producent bez zatwierdzonego `volumeVerificationStatus` woła `submitProjectQuote` bezpośrednio (nie przez UI) na jakiś `project_request`; funkcja odmawia; weryfikuje **AC-13**.
- Edge case (wyścig po akceptacji): klient akceptuje wycenę producenta A; producent B próbuje złożyć nową wycenę na to samo zapytanie zaraz po akceptacji; wstawienie jest odrzucone; weryfikuje **AC-14**.
- Edge case (cofnięcie weryfikacji): producent składa wycenę, administrator cofa mu `volumeVerificationStatus`; jego wcześniejsza wycena zostaje widoczna i akceptowalna przez klienta (wywołanie `acceptProjectQuote` bezpośrednio w teście); weryfikuje **AC-12**.
- Regresja (migracja): żadne wywołanie `autoTargetProducers`/`markProjectRequestViewedOrDeclined` nie zostaje w kodzie po migracji; istniejące testy tych funkcji są usunięte, nie pozostawione jako martwe; weryfikuje **AC-9**.
- Bezpieczeństwo (maskowanie, tablica): odpowiedź `getOpenProjectRequestsForBoard`/`getProjectRequestForBoardDetail` nie zawiera, na poziomie zwróconego obiektu, żadnego z `contactName`/`contactEmail`/`contactPhone`, nawet przed akceptacją; weryfikuje **AC-2**.
- Bezpieczeństwo (maskowanie, moje wyceny): `getProjectQuotesForProducer` zwraca kontakt tylko dla wiersza z `contactRevealedAt` ustawionym; wiersz aktywnej, nieprzyjętej jeszcze wyceny tego samego producenta na inne zapytanie nie zawiera kontaktu; weryfikuje **AC-15**.

## Build plan

Epika Produkcja, podejście Tracer Bullet (patrz `docs/scope/produkcja.md`): najpierw jeden, prawdziwy wątek od zgłoszenia przez tablicę do wyceny i akceptacji, zanim dogrubimy pozostałe ekrany i porządki. Kolejność migracji/kodu zgodna z `## Migration plan` (dodaj kolumny, potem usuń kod korzystający ze starej tabeli, dopiero potem usuń tabelę), nie jednym krokiem.

1. Migracja faza 1: dodaj `project_request.trust_signal` i `project_quote.contact_revealed_at` (oba bezpieczne na istniejących wierszach: `trust_signal` ma default, `contact_revealed_at` jest nullable), satisfies **AC-1, AC-7**
2. `computeTrustSignal` (`lib/project-request-specs.ts`): własna, krótka lista domen jednorazowych plus podstawowy format check; wpięcie do `submitProjectRequest`; usuń wywołanie `autoTargetProducers` z `submitProjectRequest`, satisfies **AC-1**
3. Przepisz ścieżkę `project_request` w `submitProjectQuote` (`lib/project-quote-actions.ts`): zamiast sprawdzenia przez `project_request_target_producer`, sprawdź `volumeVerificationStatus = approved` producenta i `project_request.status IN ('open', 'quoted')`; rozszerz `WHERE NOT EXISTS` przy wstawieniu, żeby blokował wstawienie, gdy KTOKOLWIEK ma już zaakceptowaną wycenę na to zapytanie, nie tylko ten sam producent; usuń `markProjectRequestViewedOrDeclined`, satisfies **AC-13, AC-14, AC-9** (kod)
4. Migracja faza 2 (po deployu zadań 2 i 3, żeby żaden kod nie czytał/pisał już do starej tabeli): `DROP TABLE project_request_target_producer`, `DROP TYPE target_producer_status`; usuń testy, które odwoływały się do usuniętych funkcji/tabeli, satisfies **AC-9**
5. Pierwszy, kompletny wątek: `getOpenProjectRequestsForBoard` (bez paginacji na razie) + strona `/producer/panel/board` (lista) + `/producer/panel/board/[id]` (szczegóły, formularz wołający `submitProjectQuote`), bramka sesji i `volumeVerificationStatus`, satisfies **AC-2, AC-3, AC-4**
6. Dogrubienie: paginacja na `/producer/panel/board` (ten sam wzorzec URL search params co `/internal/producers`), satisfies **AC-2**
7. `acceptProjectQuote`: dodaj ustawienie `contactRevealedAt` w istniejącym batchu, satisfies **AC-7, AC-8**
8. `getProjectQuotesForProducer` (z maskowaniem kontaktu po `contactRevealedAt`, AC-15) + strona `/producer/panel/board-quotes` (status własnych wycen, kontakt widoczny tylko dla zaakceptowanej), satisfies **AC-5, AC-7, AC-12, AC-15**
9. `getProjectRequestsWithQuotesForClient` + nowy ekran panelu klienta (lista otrzymanych wycen, przycisk Akceptuj wołający istniejące `acceptProjectQuote`, komunikat błędu B2B widoczny w miejscu), satisfies **AC-6**
10. Hint w `components/klient/ProjectRequestFlow.tsx` pod `extrasNote`/`locationDetail`, satisfies **AC-10**
11. Tłumaczenia pl/en/nl dla wszystkich nowych ekranów i hinta, satisfies **AC-11**
12. Przegląd dostępności (WCAG 2.2 AA) nowych ekranów, satisfies **AC-11**
13. Testy: `computeTrustSignal`, nowe funkcje odczytu (`lib/db/queries.test.ts`), przepisana ścieżka `submitProjectQuote` (autoryzacja, wyścig po akceptacji), nowe strony i komponenty, regresja potwierdzająca usunięcie push (AC-9) i brak retroaktywnego wpływu cofnięcia weryfikacji (AC-12), satisfies wszystkie powyższe AC

## Consequences

**Positive**:
- Zamyka realną dziurę: backend wycen z spec 0037 dostaje nareszcie interfejs po obu stronach (producent, klient), zamiast kończyć w ślepym zaułku.
- Skaluje się z liczbą zweryfikowanych producentów bez pracy administratora per zapytanie.
- Maskowanie kontaktu do akceptacji jest jedną regułą odczytu plus jednym punktem w cyklu życia wyceny, nie kolejką recenzji; nie wymaga stałej pracy człowieka.
- Producent może odpowiedzieć na zapytanie z kraju, do którego formalnie nie deklaruje jeszcze dostawy, jeśli faktycznie jest w stanie je zrealizować.
- Przy okazji usuwa realną, dziś istniejącą dziurę bezpieczeństwa: nowa autoryzacja wewnątrz `submitProjectQuote` (AC-13, AC-14) jest silniejsza niż dzisiejsza, bo zamyka też wyścig po akceptacji, którego dzisiejszy kod nie łapie.

**Negative / tradeoffs**:
- Utrata historycznych danych `project_request_target_producer` (ręczny zasiew Budman House, spec 0038) przy migracji; zaakceptowane przez inżyniera jako bezpieczne, bo dowodem faktycznej odpowiedzi jest i zawsze był `project_quote.submittedAt`, nie wiersz zaproszenia.
- Tablica traci sygnał trafności po kraju dostawy; producent musi sam ocenić, czy zapytanie ma sens, zamiast dostać je tylko wtedy, gdy formalnie obsługuje ten kraj. Filtr w UI jest świadomie odłożony (patrz Follow-up).
- Razem z push znika dzisiejsza możliwość `markProjectRequestViewedOrDeclined` (producent oznacza zapytanie jako nieistotne i chowa je u siebie); na tablicy nie ma dziś żadnego sposobu, by producent odfiltrował sobie nieistotne ogłoszenia poza samym ich przeglądaniem. Przy dzisiejszej garstce otwartych zapytań to nie problem, ale nie jest to funkcjonalnie równoważne, i nie jest Follow-upem, tylko świadomie przyjętym kosztem tej wersji.
- Paginacja na `/producer/panel/board` budowana już teraz, mimo że przy dzisiejszej garstce otwartych zapytań nie daje jeszcze wartości; świadomy koszt zaakceptowany przez inżyniera pod przyszły wzrost, nie pod dzisiejszy ruch.
- Dwa osobne ekrany producenta (tablica i moje wyceny) zamiast jednego połączonego widoku; więcej nawigacji dla producenta, ale prostszy, mniej gęsty interfejs każdego z nich.
- `trustSignal` to etykieta ustawiana raz, nigdy przeliczana; zapytanie, które wygląda podejrzanie dopiero po fakcie (np. seria zgłoszeń z podobnych, ale nie identycznych domen), nie dostanie z czasem niższej etykiety.
- `contactRevealedAt` jest dziś matematycznie równoważne `status = 'accepted'` tej samej wyceny (nic poza akceptacją go nie ustawia); trzymane jako osobna kolumna, nie jako wyliczenie ze statusu, żeby odłożony ręczny override (Follow-up) nie wymagał kolejnej migracji, gdyby powstał. Jeśli ten Follow-up nigdy nie powstanie, kolumna zostaje niewielką, uzasadnioną nadmiarowością.

**Neutral**:
- Ręczny, wcześniejszy override ujawnienia kontaktu przez administratora (poza automatyczną ścieżką przy akceptacji) świadomie nie wchodzi w tę wersję; `/internal/producers` zostaje bez zmian.
- Czat klient-producent po złożeniu wyceny, wycofanie własnego zapytania przez klienta, i wygaszanie starych ogłoszeń po czasie świadomie nie wchodzą w tę wersję (patrz Follow-up).

## Follow-up

- [ ] Rozważ dodanie filtra kraju dostawy/metrażu/rodziny na `/producer/panel/board`, gdy liczba zweryfikowanych wolumenowo producentów i otwartych zapytań realnie urośnie (ten sam wzorzec co `VerifiedManufacturersFilterBar`); świadomie pominięte teraz, bo przy jednym dzisiejszym producencie nie daje wartości.
- [ ] Rozważ sposób na odfiltrowanie/ukrycie przez producenta nieistotnych dla niego ogłoszeń na tablicy, teraz gdy `markProjectRequestViewedOrDeclined` zniknęło razem z push; dziś świadomie bez zamiennika, bo przy garstce otwartych zapytań nie jest to jeszcze problem.
- [ ] Zaprojektuj ręczny, wcześniejszy override ujawnienia kontaktu przez administratora (poza automatyczną ścieżką przy akceptacji wyceny), jeśli w praktyce okaże się potrzebny do przyspieszenia obiecującego leadu; dziś świadomie odłożone, bo rzadki przypadek brzegowy nie powinien blokować głównej, automatycznej ścieżki. `contactRevealedAt` jest już przygotowane na to rozszerzenie bez kolejnej migracji.
- [ ] Zaprojektuj możliwość wycofania/zamknięcia własnego zapytania przez klienta z panelu (np. znalazł dostawcę gdzie indziej); dziś świadomie poza zakresem.
- [ ] Zaprojektuj komunikację/czat klient-producent po złożeniu wyceny, zamiast jednorazowej notatki w formularzu wyceny; zgłoszone wprost przez inżyniera jako chciane później, nie w tej wersji.
- [ ] Rozważ automatyczne wygaszanie starych, nieodpowiedzianych zapytań po czasie, jeśli tablica zacznie się zapełniać nieaktualnymi wpisami; dziś zostają otwarte bezterminowo.
- [ ] Umowa/ToS z producentem o prowizji od leadów źródłowanych przez platformę (ochrona przed pominięciem platformy przy transakcjach poza nią) to osobna decyzja biznesowa/prawna, poza zakresem tego spec; `project_quote.submittedAt` jest już dostępnym dowodem czasowym wprowadzenia, gdyby taka umowa powstała.
- [ ] `components/producent/AGENTS.md` opisuje dziś nieaktualny, przedlogowaniowy flow producenta (identyfikacja po NIP w URL/localStorage); realny, zalogowany flow (`requirePanelProducerSession`, `app/[locale]/producer/panel/`) nie jest tam opisany. Do odświeżenia przez `/sync`.

## Migration plan

**Strategy**: feature-flagged nie jest potrzebny (brak ruchu produkcyjnego na tej funkcji poza jednym ręcznie zasianym producentem); fazowana migracja z kodem pomiędzy fazami danych, bo `DROP TABLE` nie jest odwracalny i musi nastąpić dopiero, gdy żaden kod już nie czyta/pisze do tej tabeli.

**Phases**:
1. Migracja: dodaj `project_request.trust_signal` (NOT NULL, default `'new'`, bezpieczne dla istniejących wierszy) i `project_quote.contact_revealed_at` (nullable). Deploy.
2. Kod: usuń wywołanie `autoTargetProducers` z `submitProjectRequest`; przepisz ścieżkę `project_request` w `submitProjectQuote` na bezpośrednie sprawdzenie `volumeVerificationStatus`/`project_request.status` (AC-13, AC-14) zamiast odczytu z `project_request_target_producer`; usuń `markProjectRequestViewedOrDeclined`. Tabela i enum zostają w `lib/db/schema.ts` przez tę fazę, tylko już nieużywane. Deploy.
3. Migracja: `DROP TABLE project_request_target_producer`, `DROP TYPE target_producer_status`, dopiero teraz gdy faza 2 jest na produkcji i żaden kod już nie odwołuje się do tej tabeli.

**Rollback**: fazy 1 i 2 odwracalne przez revert commita (dane w nowych kolumnach zostają, nieszkodliwe). Faza 3 (`DROP TABLE`) nie jest odwracalna bez backupu bazy; jeśli trzeba wycofać po fazie 3, przywrócić z backupu Neon, nie próbować odtworzyć wierszy ręcznie.

**Risks**: utrata historycznych wierszy `project_request_target_producer` w fazie 3 (jawnie zaakceptowana); wdrożenie fazy 3 przed fazą 2 złamałoby każdą wycenę na `project_request` (dawne sprawdzenie odmówiłoby wszystkim, bo tabela by nie istniała) — stąd sztywna kolejność faz, nie jeden krok.
