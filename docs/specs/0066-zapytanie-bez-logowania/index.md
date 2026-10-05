# 0066. Zapytanie o ofertę bez logowania

**Date**: 2026-10-05
**Status**: In Progress

## Summary

Dziś niezalogowana osoba, która chce poprosić o oferty, musi najpierw założyć konto i zalogować się linkiem z maila, więc wiele osób odpada, zanim w ogóle zostawi kontakt. Ta zmiana pozwala wysłać zapytanie jako gość, podając imię, e mail i telefon, a konto proponujemy dopiero po wysłaniu, jednym przyciskiem na ekranie potwierdzenia i w mailu. Sprawa gościa powstaje od razu (bez konta), a doradca widzi ją z oznaczeniem „e mail niepotwierdzony". Gdy gość zaloguje się linkiem, sprawa dowiązuje się do jego konta po e mailu, a czat z doradcą działa dopiero wtedy.

## Context

> ⚠️ Premise note: ta decyzja świadomie łamie niezmiennik ze specyfikacji 0023 (każde zapytanie powstaje wyłącznie z sesji zalogowanego klienta, AC-5 i Key invariants) i dotyczy danych osobowych (e mail, telefon, adres działki) zbieranych bez konta i bez wcześniejszej zgody. Silnik spraw (spec 0048) i wszystkie jego odczyty zakładają, że sprawa zawsze ma klienta. Zmiana jest bezpieczna tylko wtedy, gdy powstanie jeden, jasny model „sprawa gościa", a nie rozproszone wyjątki.

Dziś `app/[locale]/(customer)/inquiry/page.tsx` przekierowuje niezalogowanego do `/login`, a `submitAdvisoryInquiry` w `lib/case-actions.ts` zwraca błąd bez sesji roli `client`. Kolumna `inquiry.client_id` jest `NOT NULL`, więc baza też nie dopuszcza sprawy bez klienta. Skutek biznesowy: lejek gubi osoby, które chciały tylko zostawić kontakt, a my nie dostajemy ich e maila, żeby do nich wrócić.

W repo jest już precedens dla zapytań bez konta: zapytania B2B (spec 0037, `project_request`, `bulk_product_inquiry`) zapisują samą migawkę kontaktu, a `linkRequestsToClientOnLogin` dowiązuje je do konta po e mailu przy każdym logowaniu klienta. Nie ma za to żadnego limitera zapytań w kodzie, a `lib/cases/notify.ts` łączy sprawę z `client` przez `innerJoin`, więc sprawa gościa nie miałaby adresata maila. Chat w panelu (spec 0048) jest dostępny tylko dla zalogowanego aktora wyliczanego z sesji (`lib/cases/actor.ts`), więc gość bez konta nie ma jak w nim pisać.

Zakres: tylko zapytanie doradcze na `/inquiry` (jedno wejście, do którego prowadzą karty projektu, wyniki, sauny i outdoor TV). Producent i administrator na tej stronie dalej są przekierowani do swoich sekcji. Zgodność: RODO (e mail i telefon osoby bez konta, region UE bez zmian, brak nowego podmiotu przetwarzającego).

## Requirements

**User stories**:
- Jako niezalogowany odwiedzający, chcę wysłać zapytanie o oferty bez zakładania konta, żeby szybko zostawić kontakt.
- Jako gość po wysłaniu zapytania, chcę jednym kliknięciem założyć konto, żeby śledzić sprawę i rozmawiać z doradcą.
- Jako doradca, chcę widzieć, czy e mail gościa jest potwierdzony, żeby ocenić wiarygodność zgłoszenia.
- Jako właściciel istniejącego konta, chcę wiedzieć, że ktoś wysłał zapytanie na mój e mail, żeby zareagować, jeśli to nie ja.
- Jako właściciel platformy, chcę mieć e maile osób, które zapytały, nawet jeśli nie założą konta.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Niezalogowany odwiedzający wchodzący na `/inquiry` z poprawnym wyborem domów widzi formularz zapytania, nie jest przekierowany do logowania. Zły lub pusty wybór domów dalej przekierowuje na wyniki. Zalogowany producent lub administrator dalej jest przekierowany do swojej sekcji.
- **AC-2**: Formularz gościa wymaga imienia, e maila i telefonu oraz dotychczasowych pól (ulica, kod pocztowy, miasto, kraj; wiadomość opcjonalna). Zalogowany klient nie widzi pól kontaktowych, bo dane bierze z konta, tak jak dziś.
- **AC-3**: Wysłanie zapytania przez gościa zapisuje sprawę z `client_id` równym NULL, z migawką kontaktu (e mail zapisany małymi literami), etapem `nowe`, kanałem `klient_doradca`, wiadomością systemową i kartami startowymi, w jednej operacji jak dziś (spec 0048 AC-3, AC-38).
- **AC-4**: Ponowne wysłanie z tym samym kluczem idempotencji i tym samym e mailem zwraca tę samą sprawę i nie tworzy drugiej. Ten sam klucz z innym e mailem albo z innym klientem nie zwraca cudzej sprawy, tylko błąd `invalid`.
- **AC-5**: Dla gościa obowiązują dwa limity liczone z tabeli `inquiry` (wszystkie sprawy z danym e mailem, także przypięte i zalogowanych klientów): najwyżej 3 sprawy na e mail w 24 godziny oraz globalny dzienny sufit spraw gości (domyślnie 200, stała w kodzie), który chroni limit Resend i reputację domeny wysyłkowej. Przekroczenie zwraca `rate_limited` i nic nie zapisuje. Liczenie przed zapisem na `neon-http` dopuszcza wyścig dwóch równoległych wysyłek, co jest świadomie przyjęte. Wypełnione ukryte pole pułapka kończy się odpowiedzią wyglądającą na sukces, bez zapisu i bez maili. Żaden mail nie powtarza pól wpisanych przez gościa (imię, wiadomość, adres), tylko stały tekst i link.
- **AC-6**: Po wysłaniu gość zostaje na tej samej stronie i widzi ekran potwierdzenia (bez przekierowania do panelu) z przyciskiem „Załóż konto i śledź sprawę".
- **AC-7**: Gość dostaje mail potwierdzający (stały tekst plus link, bez pól wpisanych przez gościa) z tym samym wezwaniem; link prowadzi na stronę `/inquiry/claim/[inquiryId]` z jednym przyciskiem (samo wejście w link niczego nie wysyła, więc skaner poczty nie uruchomi akcji). Dotychczasowy `notifyClientOfNewCase` (link do panelu) nie wysyła się dla spraw gości ani dla przypadku AC-10, bo zastępują go maile z AC-7 i AC-10.
- **AC-8**: Akcja `requestAccountForGuestCase` działa tylko dla sprawy z `client_id` równym NULL i `contact_email_verified_at` równym NULL (dla spraw przypiętych z AC-10 nic nie robi, ale odpowiada tak samo). Wysyła link magiczny na e mail zapisany w sprawie. Gdy w `users` nie ma tego e maila i nie ma wiersza `pending_registration`, zapisuje go (rola `client`, imię i telefon z migawki). Istniejącego wiersza `pending_registration` nigdy nie nadpisuje (chroni oczekującą rejestrację producenta lub klienta), a gdy ma on inną rolę niż `client`, nic nie wysyła. Link wraca na `/panel/inquiries/{id}`. Nie wysyła nic, gdy na ten e mail istnieje konto producenta lub administratora. Dopuszcza najwyżej 3 aktywne tokeny w `verification_tokens` na adres.
- **AC-9**: Przy każdym udanym logowaniu klienta, także pierwszym (gdy konto powstaje w `createUser`), wszystkie sprawy z `client_id` równym NULL i pasującym e mailem dostają `client_id` tego klienta oraz `contact_email_verified_at` równe teraz. Rola jest czytana z bazy, nie z obiektu zwróconego przez `createUser` (ten dziś nie niesie roli, więc `events.signIn` pomija pierwsze logowanie). Operacja jest idempotentna. Po niej sprawa jest w panelu i czat działa.
- **AC-10**: Gdy e mail gościa należy do istniejącego konta klienta, sprawa od razu dostaje jego `client_id` z `contact_email_verified_at` równym NULL. Właściciel dostaje mail „Czy to Ty? Jeśli tak, nic nie rób. Jeśli nie, odpowiedz na tego maila" (stały tekst, bez pól gościa) z nagłówkiem Reply-To na adres zespołu. Wyszukanie konta i wysyłka tego maila idą w `after()`, więc czas odpowiedzi dla gościa jest taki sam jak dla nowego e maila, a ekran potwierdzenia identyczny.
- **AC-11**: Widok sprawy doradcy bierze kontakt z migawki w `inquiry` i pokazuje znacznik „e mail niepotwierdzony" dla spraw gości i przypiętych z AC-10 (`contact_email_verified_at` NULL i sprawa utworzona po wdrożeniu). Istniejące sprawy sprzed zmiany mają `contact_email_verified_at` uzupełnione migracją, więc znacznika nie dostają. Maile do doradcy zostają bez danych kontaktowych (link i powód), jak dziś.
- **AC-12**: Wiadomość doradcy w sprawie gościa (`client_id` NULL) wysyła mail na e mail z migawki, w języku zapisanym w sprawie (`inquiry.locale`), tylko z linkiem „zaloguj się lub załóż konto, żeby odpowiedzieć" i bez treści wiadomości (konwencja 0048). Maile do gościa o odpowiedziach doradcy idą najwyżej raz na 10 minut na sprawę. Sprawa gościa nie powoduje błędu w `notify.ts`.
- **AC-13**: `contact_email_verified_at` ustawia się też przy pierwszej wiadomości klienta w sprawie, w której jest jeszcze NULL (właściciel konta zaangażował się w sprawę).
- **AC-14**: Zalogowany klient wysyła zapytanie jak dziś: kontakt z sesji, `contact_email_verified_at` ustawione na teraz, przekierowanie do `/panel/inquiries/{id}`.
- **AC-15**: Żadna akcja nie ufa `client_id` podanemu przez przeglądarkę. Niezalogowany odwiedzający nie może odczytać żadnej sprawy (`evaluateCaseAccess` dla braku aktora dalej zwraca `null`).
- **AC-16**: Zdarzenie `case_created` niesie flagę `guest`, a błędy idą przez `captureError`, tylko przez warstwę `lib/observability/`. Dla gościa identyfikatorem w analityce jest `inquiryId`, nigdy e mail.
- **AC-17**: Pod przyciskiem wysyłki gościa jest krótka informacja o przetwarzaniu danych wyłącznie w sprawie zapytania (kontakt w tej sprawie, bez marketingu) z linkiem do polityki prywatności (bez checkboxa), w wersjach PL, EN i NL.
- **AC-18**: Specyfikacje 0023 (AC-5) i 0048 (AC-2, zdanie o logowaniu) dostają adnotację, że bramka logowania została zastąpiona przez 0066.

## Decision

**Chosen option**: Option 1: Sprawa gościa bez konta, konto proponowane po wysłaniu

Sprawa doradcza może powstać bez sesji (`client_id` NULL, migawka kontaktu), a konto powstaje dopiero na jawne kliknięcie gościa, wtedy sprawa dowiązuje się po e mailu przez logowanie linkiem magicznym.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

## Rationale

Powody i rozważane opcje: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch** (potwierdzony w rozmowie):

| Tabela | Zmiana | Uwaga |
|---|---|---|
| `inquiry` | `client_id` z NOT NULL na nullable | Gość to `client_id IS NULL`, bez osobnej kolumny. Bezpieczna zmiana (tylko zdejmuje ograniczenie) |
| `inquiry` | nowa kolumna `contact_email_verified_at` (timestamptz, nullable) | Ustawiana: przy dowiązaniu przez logowanie (AC-9), przy wysyłce przez zalogowanego klienta (AC-14), przy pierwszej wiadomości właściciela (AC-13). Migracja uzupełnia ją dla wszystkich istniejących wierszy z `client_id` (`= received_at`), żeby stare sprawy nie dostały znacznika „niepotwierdzony" |
| `inquiry` | nowa kolumna `locale` (text, nullable) | Język maili do gościa (AC-12); dla gościa zapisywany przy wysyłce |
| `inquiry` | indeks na `(lower(email), received_at)` | Do limitu z AC-5 |
| `inquiry` | `email` zawsze małymi literami przy zapisie gościa | Spójne dopasowanie po e mailu (Auth.js też normalizuje) |
| `pending_registration` | bez zmian | AC-8 zapisuje tu imię i telefon ze sprawy |
| `verification_tokens` | bez zmian | Limit linków z AC-8 liczony z aktywnych tokenów na adres |

Relacje: `inquiry` N:1 `client` (teraz opcjonalna), `inquiry` 1:N `inquiry_item`, `inquiry` 1:N `channel`. Unikalność: `inquiry.idempotency_key` bez zmian.

**State transitions**: stan sprawy (`stage`) bez zmian. Dochodzi niezależny stan „kontaktu": gość (`client_id` NULL) → dowiązany i niepotwierdzony (`client_id` ustawione, `contact_email_verified_at` NULL, przypadek AC-10) → potwierdzony (`contact_email_verified_at` ustawione). Z gościa do potwierdzonego prowadzi logowanie linkiem (AC-9). Z dowiązanego niepotwierdzonego do potwierdzonego prowadzi pierwsza wiadomość klienta (AC-13).

**API surface**:

| Trasa lub akcja | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/inquiry` | Strona | `projects`, `country` (URL) | Formularz gościa albo klienta | publiczna dla gościa i klienta, producent i admin przekierowani | zły wybór domów → wyniki |
| `submitAdvisoryInquiry` | Akcja serwerowa | dotychczasowe pola plus `contact {name, email, phone}` i pole pułapka (gość) | `inquiryId`, `guest` | sesja opcjonalna: z sesją roli client dane z konta, bez sesji dane z formularza | `invalid`, `unsupported_country`, `rate_limited`, `generic` |
| `requestAccountForGuestCase` | Akcja serwerowa | `inquiryId`, `locale` | zawsze `{ ok: true }` | publiczna | błąd wysyłki → komunikat i ponów |
| `/inquiry/claim/[inquiryId]` | Strona | `inquiryId` w ścieżce | strona z przyciskiem, bez żadnych danych sprawy | publiczna | nieznany id → ta sama strona, akcja nic nie robi |
| `events.signIn` w `auth.ts` | Zdarzenie Auth.js | użytkownik roli client | dowiązanie spraw po e mailu (AC-9) | wewnętrzne | błąd dowiązania nie blokuje logowania |

**Key invariants**:
- Dane kontaktowe gościa trafiają wyłącznie do `inquiry` (migawka) i, na jawne kliknięcie, do `pending_registration`. Samo wysłanie zapytania nigdy nie tworzy wiersza w `users` ani `client`.
- Dowiązanie spraw do konta dzieje się tylko przy logowaniu rolą `client` (dowód własności e maila) albo przy dopasowaniu do istniejącego konta klienta (AC-10, ryzyko świadomie przyjęte, patrz Consequences). Konta producenta i administratora nigdy nie dostają spraw gościa.
- Rola, `client_id` i `contact_email_verified_at` pochodzą z serwera (sesja, baza), nigdy z danych przeglądarki.
- `evaluateCaseAccess` pozostaje jedynym miejscem decyzji o dostępie do sprawy. Sprawa gościa nie ma aktora klienta, więc dostęp klienta zwraca `null` do czasu dowiązania. Doradca i producent działają jak dziś.
- Idempotencja gościa: `findExisting` dopasowuje klucz i e mail (dla gościa) albo klucz i `client_id` (dla klienta). Wyścig kończy się błędem unikalności 23505 i odczytem zwycięzcy, jak dziś.
- Nowe publiczne akcje (`submitAdvisoryInquiry`, `requestAccountForGuestCase`) nie ujawniają, czy konto o danym e mailu istnieje. Uwaga: istniejące `requestLogin` (komunikat „unknown-email") i `registerClient` (komunikat o istniejącym koncie) już dziś to ujawniają, więc ta zmiana nie pogarsza wyliczania kont, ale go też nie naprawia (Follow up).
- Wiersz `pending_registration` zapisany przez AC-8 nigdy nie nadpisuje istniejącego (inna rola, inny payload).

**Security model**:
- Publiczne: formularz zapytania gościa, strona claim, akcja `requestAccountForGuestCase` (ograniczona limitem tokenów).
- Gość bez konta: nie odczytuje żadnej sprawy, nie pisze w czacie. Komunikacja z doradcą idzie mailem do czasu założenia konta.
- Klient: widzi i pisze tylko w sprawach ze swoim `client_id`.
- Zgodność RODO: dane osobowe osoby bez konta (e mail, telefon, adres działki). Podstawa: kontakt w sprawie złożonego zapytania, informacja pod przyciskiem (AC-17). Brak nowego podmiotu przetwarzającego, region UE bez zmian. Retencja nieobjęta, patrz Follow up.
- Ochrona przed nadużyciem: limit 3 sprawy na e mail na dobę plus globalny dzienny sufit, pole pułapka, maile bez pól wpisanych przez gościa (kanał phishingu z naszej domeny), znacznik „e mail niepotwierdzony" dla doradcy, mail „czy to Ty" dla właściciela konta. Brak limitu po IP (świadomie, żeby nie trzymać dodatkowych danych).
- Podstawa przetwarzania to obsługa złożonego zapytania. Kontakt marketingowy z gośćmi wymaga osobnej zgody albo jawnie opisanego uzasadnionego interesu w tekście z AC-17. Osoba bez konta nie ma ścieżki usunięcia danych w aplikacji, więc prośby o usunięcie obsługuje ręcznie administrator (opisać w polityce prywatności).

**Configuration required**:
- `SUPPORT_REPLY_TO_EMAIL`: adres zespołu w nagłówku Reply-To maila „czy to Ty" (AC-10). `lib/notifications/send.ts` dostaje opcjonalny parametr `replyTo`. Osobna wartość na dev, staging i produkcję.

**Critical test scenarios** (każdy mapuje się na kryterium z Requirements):
- Happy path: gość z nowym e mailem wysyła zapytanie, widzi ekran potwierdzenia, klika „Załóż konto", loguje się linkiem, sprawa jest w panelu z potwierdzonym kontaktem i czat działa, verifies **AC-1, AC-3, AC-6, AC-8, AC-9**.
- Gość nigdy nie zakłada konta: sprawa istnieje z `client_id` NULL, doradca widzi ją ze znacznikiem „niepotwierdzony", odpowiedź doradcy idzie mailem z linkiem, verifies **AC-3, AC-11, AC-12**.
- E mail istniejącego klienta: sprawa trafia od razu na jego konto jako niepotwierdzona, właściciel dostaje mail „czy to Ty", ekran gościa jest identyczny jak dla nowego e maila, verifies **AC-10**.
- Idempotencja: dwa wysłania z tym samym kluczem dają jedną sprawę, ten sam klucz z innym e mailem daje `invalid`, verifies **AC-4**.
- Limit i pułapka: czwarta sprawa na ten sam e mail w dobie daje `rate_limited`, wypełnione pole pułapka nie zapisuje niczego, verifies **AC-5**.
- Uprawnienia: producent i administrator na `/inquiry` są przekierowani, gość nie odczytuje cudzej sprawy, `requestAccountForGuestCase` dla e maila producenta nic nie wysyła, verifies **AC-1, AC-8, AC-15**.
- Błąd zapisu: awaria bazy przy wysyłce gościa pokazuje komunikat w miejscu z przyciskiem ponów, formularz nie traci danych, verifies **AC-3, AC-4**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet projektu: najpierw cienki, działający wątek od formularza gościa do widoku doradcy, potem pogrubiamy o konto, powiadomienia i ochronę.

1. Migracja: `inquiry.client_id` nullable, `contact_email_verified_at` (z uzupełnieniem `= received_at` dla wierszy z `client_id`), `locale`, indeks `(lower(email), received_at)`. Weryfikacja na jednorazowym branchu Neon przed `db:migrate`, satisfies **AC-3, AC-5, AC-9, AC-11, AC-12**
2. Cienki wątek: `/inquiry` renderuje formularz dla gościa (bez przekierowania do logowania), pola kontaktowe, `submitAdvisoryInquiry` bez sesji zapisuje sprawę przez `createAdvisoryCase` z `clientId` nullable i idempotencją po e mailu, widok sprawy doradcy pokazuje kontakt z migawki, satisfies **AC-1, AC-2, AC-3, AC-4, AC-14, AC-15**
3. Dowiązanie przy logowaniu: rozszerz `events.signIn` w `auth.ts` o dowiązanie spraw z `client_id` NULL po e mailu i ustawienie `contact_email_verified_at` (nowa funkcja obok `linkRequestsToClientOnLogin`, ten sam wzorzec importu wewnątrz handlera). Rolę czytać z bazy po `user.id`, bo `createUser` jej nie zwraca i pierwsze logowanie jest dziś pomijane (ten sam ukryty błąd ma `linkRequestsToClientOnLogin` dla B2B, naprawić razem). Test z prawdziwym pierwszym logowaniem, satisfies **AC-9**
4. Ekran potwierdzenia w `InquiryFlow`, akcja `requestAccountForGuestCase` (zapis `pending_registration`, link magiczny, limit tokenów, pominięcie kont producenta i administratora) i strona `/inquiry/claim/[inquiryId]`, satisfies **AC-6, AC-7, AC-8**
5. Powiadomienia: `notify.ts` z `leftJoin` na `client` i adresatem z migawki, `notifyClientOfNewCase` wyłączony dla gości i AC-10, mail potwierdzający dla gościa z przyciskiem konta, mail do gościa po wiadomości doradcy (tylko link, język z `inquiry.locale`, najwyżej raz na 10 minut na sprawę), satisfies **AC-7, AC-11, AC-12**
6. Dopasowanie do istniejącego konta klienta: przypięcie od razu, mail „czy to Ty" z `replyTo` (nowy parametr w `send.ts`, zmienna `SUPPORT_REPLY_TO_EMAIL`), satisfies **AC-10**
7. Ochrona: limit 3 sprawy na e mail na dobę, ukryte pole pułapka, błąd `rate_limited` w UI, satisfies **AC-5**
8. `contact_email_verified_at` przy pierwszej wiadomości klienta (`sendMessage`), satisfies **AC-13**
9. Informacja RODO pod przyciskiem i teksty w `pl`, `en`, `nl` (komunikaty ekranu, maile, błędy), satisfies **AC-17**
10. Analityka i błędy: `case_created` z flagą `guest` przez `lib/observability/`, satisfies **AC-16**
11. Testy: jednostkowe (`case-actions`, `create`, dowiązanie, limity, `notify`), komponentowe (`InquiryFlow`), E2E Playwright dla trzech ścieżek z Critical test scenarios, satisfies **AC-1 do AC-17**
12. Adnotacje „częściowo zastąpione przez 0066" w specyfikacjach 0023 (AC-5) i 0048 (AC-2), satisfies **AC-18**

## Migration plan

**Strategy**: no migration needed (zmiana schematu tylko zdejmuje ograniczenie i dodaje kolumny nullable, istniejące sprawy mają klienta i działają bez zmian)
**Phases**:
1. Migracja z kroku 1, wdrożona przed kodem. Stary kod działa na nowym schemacie bez zmian.
2. Kod kroków 2 do 10 za jednym wdrożeniem. Bramka logowania znika od razu dla wszystkich.
**Rollback**: przywrócenie przekierowania do logowania w `page.tsx` i wymogu sesji w `submitAdvisoryInquiry` (jeden commit). Sprawy gości już zapisane zostają w bazie i są widoczne dla doradcy, kolumny nullable nie wymagają cofania.
**Risks**: napływ spamu po zdjęciu bramki (łagodzony limitami, sufitem i znacznikiem), sprawy bez klienta w istniejących odczytach i typach, które zakładają `client_id` (znane miejsca: `CreateAdvisoryCaseInput.clientId` i `findExisting` w `lib/cases/create.ts`, `CaseAccessContext.clientId` w `lib/cases/access.ts`, `lib/notifications/new-inquiry.ts`, `lib/db/queries.ts`, widoki doradcy w `app/[locale]/internal/`; `notify.ts` i `queries.ts` czytają już migawkę; krok 11 pokrywa je testami).

## Consequences

**Positive**:
- Zdobywamy e mail i telefon osób, które dziś odpadają na bramce logowania.
- Konto jest propozycją po wartości (wysłane zapytanie), nie warunkiem wstępnym.
- Wykorzystujemy istniejące elementy: `pending_registration`, link magiczny, wzorzec dowiązania po e mailu z B2B, silnik spraw bez przepisywania.

**Negative / tradeoffs**:
- Niezmiennik z 0023 przestaje obowiązywać: nie każda sprawa ma klienta, więc każdy odczyt sprawy trzeba świadomie obsłużyć (`leftJoin`, nullowalny `clientId`).
- Doradca dostaje niezweryfikowane zgłoszenia, więc część będzie spamem lub literówką w e mailu. Limit i znacznik tylko to ograniczają.
- Przypięcie od razu do istniejącego konta po samym e mailu (AC-10) pozwala obcej osobie podrzucić sprawę z własną treścią na cudze konto. Świadomie przyjęte przez właściciela produktu, łagodzone mailem „czy to Ty" i Reply-To, bez blokady.
- Gość nie rozmawia z doradcą w aplikacji do czasu założenia konta, więc część rozmów zacznie się mailem.
- Dwa maile przy założeniu konta (potwierdzenie sprawy, potem link logowania).

**Neutral**:
- Brak limitu po IP: bot rotujący e maile obejdzie limit na adres, ogranicza go tylko globalny dzienny sufit (do rozważenia po pierwszych danych o nadużyciach).
- Sprawa gościa z e mailem producenta lub administratora zostaje bez konta klienta na stałe (logowanie nie-klienta niczego nie dowiązuje).
- Przy założeniu konta z AC-8 imię i telefon pochodzą ze zgłoszenia, nie od właściciela e maila. Obca osoba może więc wstępnie wypełnić dane przyszłego konta ofiary (ofiara musi kliknąć link logowania, którego nie zamawiała). Ryzyko przyjęte, patrz Follow up.
- Ekran potwierdzenia żyje w stanie komponentu, odświeżenie strony go gubi (ten sam przycisk jest w mailu).
- Nowa zmienna konfiguracji `SUPPORT_REPLY_TO_EMAIL` i nowy parametr `replyTo` w warstwie maili.

## Follow-up

- [ ] Polityka retencji danych osobowych niezałożonych kont gości (anonimizacja po czasie bez konta) jako osobna specyfikacja. Dziś sprawa zostaje, dopóki doradca jej nie zamknie. Dotyczy też osieroconych wierszy `pending_registration` (brak czyszczenia), które warto objąć TTL.
- [ ] Przy pierwszej wizycie w panelu poprosić o potwierdzenie imienia i telefonu wstępnie wypełnionych ze zgłoszenia gościa.
- [ ] Wyliczanie kont w `requestLogin` i `registerClient` (istniejące komunikaty) jako osobna poprawka bezpieczeństwa.
- [ ] Opisać w polityce prywatności ręczną ścieżkę usunięcia danych osoby bez konta.
- [ ] Rozważyć limit po skrócie IP lub test antybotowy, jeśli po uruchomieniu pojawi się spam.
- [ ] Zdecydować, czy zapytanie B2B (spec 0037, 0038) ma dostać ten sam ekran „załóż konto po wysłaniu" dla spójności.
- [ ] Zaktualizować `lib/cases/AGENTS.md` (sprawa gościa, nullowalny `clientId`, dowiązanie po e mailu) i `lib/notifications/AGENTS.md` (`replyTo`) po zbudowaniu, żeby późniejsze zmiany nie zakładały klienta w każdej sprawie.
- [ ] Brak powiązanej funkcji w `docs/scope/` dla tej zmiany. Zapisać ją w `docs/scope/produkcja.md` przy najbliższym `/scope`.
