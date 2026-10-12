# 0066. Zapytanie o ofertę bez logowania

**Date**: 2026-10-05
**Status**: In Progress

## Summary

Dziś niezalogowana osoba, która chce poprosić o oferty, musi najpierw założyć konto i zalogować się linkiem z maila, więc wiele osób odpada, zanim w ogóle zostawi kontakt. Ta zmiana pozwala wysłać zapytanie jako gość, podając imię, e mail i telefon. Sprawa gościa powstaje od razu (bez konta), a doradca widzi ją z oznaczeniem „e mail niepotwierdzony". Po wysłaniu gość dostaje jeden mail z prawdziwym linkiem magicznym: jedno kliknięcie loguje go (przy pierwszym razie zakłada konto) i otwiera jego sprawę, a dowiązanie sprawy do konta po e mailu dzieje się przy tym logowaniu. Czat z doradcą działa po zalogowaniu.

> **Zmiana z 2026-10-07 (po `/check verify`)**: pierwotnie gość dostawał mail z linkiem do strony z przyciskiem „Załóż konto", który wysyłał drugi mail z linkiem magicznym (pięć kroków do zobaczenia sprawy). Teraz pierwszy mail od razu zawiera link magiczny (patrz Option 4 w [rationale.md](rationale.md)). Zmieniają się AC-6, AC-7, AC-8, AC-10 i AC-16 oraz niezmiennik o `pending_registration`. Reszta decyzji bez zmian.

## Context

> ⚠️ Premise note: ta decyzja świadomie łamie niezmiennik ze specyfikacji 0023 (każde zapytanie powstaje wyłącznie z sesji zalogowanego klienta, AC-5 i Key invariants) i dotyczy danych osobowych (e mail, telefon, adres działki) zbieranych bez konta i bez wcześniejszej zgody. Silnik spraw (spec 0048) i wszystkie jego odczyty zakładają, że sprawa zawsze ma klienta. Zmiana jest bezpieczna tylko wtedy, gdy powstanie jeden, jasny model „sprawa gościa", a nie rozproszone wyjątki.

Dziś `app/[locale]/(customer)/inquiry/page.tsx` przekierowuje niezalogowanego do `/login`, a `submitAdvisoryInquiry` w `lib/case-actions.ts` zwraca błąd bez sesji roli `client`. Kolumna `inquiry.client_id` jest `NOT NULL`, więc baza też nie dopuszcza sprawy bez klienta. Skutek biznesowy: lejek gubi osoby, które chciały tylko zostawić kontakt, a my nie dostajemy ich e maila, żeby do nich wrócić.

W repo jest już precedens dla zapytań bez konta: zapytania B2B (spec 0037, `project_request`, `bulk_product_inquiry`) zapisują samą migawkę kontaktu, a `linkRequestsToClientOnLogin` dowiązuje je do konta po e mailu przy każdym logowaniu klienta. Nie ma za to żadnego limitera zapytań w kodzie, a `lib/cases/notify.ts` łączy sprawę z `client` przez `innerJoin`, więc sprawa gościa nie miałaby adresata maila. Chat w panelu (spec 0048) jest dostępny tylko dla zalogowanego aktora wyliczanego z sesji (`lib/cases/actor.ts`), więc gość bez konta nie ma jak w nim pisać.

Zakres: tylko zapytanie doradcze na `/inquiry` (jedno wejście, do którego prowadzą karty projektu, wyniki, sauny i outdoor TV). Producent i administrator na tej stronie dalej są przekierowani do swoich sekcji. Zgodność: RODO (e mail i telefon osoby bez konta, region UE bez zmian, brak nowego podmiotu przetwarzającego).

## Requirements

**User stories**:
- Jako niezalogowany odwiedzający, chcę wysłać zapytanie o oferty bez zakładania konta, żeby szybko zostawić kontakt.
- Jako gość po wysłaniu zapytania, chcę jednym kliknięciem w mailu zobaczyć swoją sprawę (konto zakłada się przy tym samym kliknięciu), żeby ją śledzić i rozmawiać z doradcą.
- Jako doradca, chcę widzieć, czy e mail gościa jest potwierdzony, żeby ocenić wiarygodność zgłoszenia.
- Jako właściciel istniejącego konta, chcę wiedzieć, że ktoś wysłał zapytanie na mój e mail, żeby zareagować, jeśli to nie ja.
- Jako właściciel platformy, chcę mieć e maile osób, które zapytały, nawet jeśli nie założą konta.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Niezalogowany odwiedzający wchodzący na `/inquiry` z poprawnym wyborem domów widzi formularz zapytania, nie jest przekierowany do logowania. Zły lub pusty wybór domów dalej przekierowuje na wyniki. Zalogowany producent lub administrator dalej jest przekierowany do swojej sekcji.
- **AC-2**: Formularz gościa wymaga imienia, e maila i telefonu oraz dotychczasowych pól (ulica, kod pocztowy, miasto, kraj; wiadomość opcjonalna). Zalogowany klient nie widzi pól kontaktowych, bo dane bierze z konta, tak jak dziś.
- **AC-3**: Wysłanie zapytania przez gościa zapisuje sprawę z `client_id` równym NULL, z migawką kontaktu (e mail zapisany małymi literami), etapem `nowe`, kanałem `klient_doradca`, wiadomością systemową i kartami startowymi, w jednej operacji jak dziś (spec 0048 AC-3, AC-38).
- **AC-4**: Ponowne wysłanie z tym samym kluczem idempotencji i tym samym e mailem zwraca tę samą sprawę i nie tworzy drugiej. Ten sam klucz z innym e mailem albo z innym klientem nie zwraca cudzej sprawy, tylko błąd `invalid`.
- **AC-5**: Dla gościa obowiązują dwa limity liczone z tabeli `inquiry` (wszystkie sprawy z danym e mailem, także przypięte i zalogowanych klientów): najwyżej 3 sprawy na e mail w 24 godziny oraz globalny dzienny sufit spraw gości (domyślnie 200, stała w kodzie), który chroni limit Resend i reputację domeny wysyłkowej. Przekroczenie zwraca `rate_limited` i nic nie zapisuje. Liczenie przed zapisem na `neon-http` dopuszcza wyścig dwóch równoległych wysyłek, co jest świadomie przyjęte. Wypełnione ukryte pole pułapka kończy się odpowiedzią wyglądającą na sukces, bez zapisu i bez maili. Żaden mail nie powtarza pól wpisanych przez gościa (imię, wiadomość, adres), tylko stały tekst i link.
- **AC-6**: Po wysłaniu gość zostaje na tej samej stronie i widzi ekran potwierdzenia (bez przekierowania do panelu) z tekstem „Sprawdź skrzynkę, wysłaliśmy link do Twojej sprawy". Ekran jest identyczny dla nowego e maila, e maila istniejącego klienta i e maila konta producenta lub administratora (nie zdradza, czy konto istnieje) i nie ma przycisku „Załóż konto". Ma za to małe „Nie dostałeś maila? Wyślij ponownie", które wywołuje akcję z AC-8. Gdy wysyłka maila nie powiodła się (błąd Resend), ekran pokazuje komunikat o błędzie i „Ponów", a sprawa jest zapisana.
- **AC-7**: Dla gościa z nowym e mailem `submitAdvisoryInquiry` wysyła jeden mail: link magiczny Auth.js z adresem powrotu `/{locale}/panel/inquiries/{id}?welcome=new`, w stałym tekście („Dziękujemy za zapytanie, kliknij, aby zobaczyć sprawę i założyć konto", bez pól wpisanych przez gościa, w języku `inquiry.locale`). Pierwsze kliknięcie zakłada konto i loguje (AC-9 dowiązuje sprawę). Mail idzie przez `sendVerificationRequest` w `auth.ts`: wariant treści wybiera marker `welcome` w adresie powrotu, a identyfikatorem w analityce jest `inquiryId` z tego adresu, nigdy e mail (AC-16). Dotychczasowy `notifyClientOfNewCase` (link do panelu) nie wysyła się dla spraw gości ani dla AC-10. Funkcja `notifyGuestOfNewCase` i typy maili `guest_inquiry_confirmation` i `guest_identity_check` znikają. Strona `/inquiry/claim/[inquiryId]` zostaje jako zapas: jeden przycisk „Wyślij mi link do mojej sprawy", wywołujący akcję z AC-8, a samo wejście w stronę niczego nie wysyła.
- **AC-8**: Wiersz `pending_registration` (rola `client`, imię i telefon z migawki) powstaje przy wysłaniu zapytania gościa, ale tylko gdy w `users` nie ma tego e maila i nie ma już wiersza `pending_registration` (`ON CONFLICT DO NOTHING`, istniejącego nigdy nie nadpisujemy). Gdy istnieje konto lub oczekująca rejestracja o innej roli niż `client` (producent, administrator), nie powstaje żaden wiersz i nie wysyła się żaden mail, a odpowiedź dla gościa jest taka sama jak zawsze. Link magiczny wysyła się przez `signIn("resend", { redirect: false })` wywołane w samej akcji `submitAdvisoryInquiry` (wstrzymany przez `await`, nie w `after()`), tylko gdy na adres jest najwyżej 2 aktywne tokeny w `verification_tokens` (limit 3 aktywnych). Akcja `resendGuestCaseLink({ inquiryId, locale })` (dawna `requestAccountForGuestCase`, zmieniona nazwa, bo nie „zakłada konta na kliknięcie") działa dla sprawy z `contact_email_verified_at` równym NULL, także przypiętej z AC-10, stosuje te same reguły stagingu, ról i limitu tokenów, wysyła ten sam link i zawsze odpowiada `{ ok: true }`, poza błędem samej wysyłki (`{ ok: false }`).
- **AC-9**: Przy każdym udanym logowaniu klienta, także pierwszym (gdy konto powstaje w `createUser`), wszystkie sprawy z `client_id` równym NULL i pasującym e mailem dostają `client_id` tego klienta oraz `contact_email_verified_at` równe teraz. Rola jest czytana z bazy, nie z obiektu zwróconego przez `createUser` (ten dziś nie niesie roli, więc `events.signIn` pomija pierwsze logowanie). Operacja jest idempotentna. Po niej sprawa jest w panelu i czat działa.
- **AC-10**: Gdy e mail gościa należy do istniejącego konta klienta, sprawa od razu (w tej samej akcji, przed wysyłką maila) dostaje jego `client_id` z `contact_email_verified_at` równym NULL. Właściciel dostaje jeden mail: link magiczny z `?welcome=existing`, w stałym tekście „Ktoś wysłał zapytanie na ten adres i dopisaliśmy je do Twojego konta. Jeśli to Ty, kliknij, żeby je zobaczyć. Jeśli nie, zignoruj ten mail albo odpowiedz na niego", z nagłówkiem Reply-To na adres zespołu. Ekran gościa i zawartość odpowiedzi akcji są identyczne jak dla nowego e maila (AC-6). Samo kliknięcie linku nie ustawia `contact_email_verified_at` dla takiej sprawy (zalogowanie nie dowodzi, kto wysłał zapytanie), robi to dopiero pierwsza wiadomość klienta (AC-13).
- **AC-11**: Widok sprawy doradcy bierze kontakt z migawki w `inquiry` i pokazuje znacznik „e mail niepotwierdzony" dla spraw gości i przypiętych z AC-10 (`contact_email_verified_at` NULL i sprawa utworzona po wdrożeniu). Istniejące sprawy sprzed zmiany mają `contact_email_verified_at` uzupełnione migracją, więc znacznika nie dostają. Maile do doradcy zostają bez danych kontaktowych (link i powód), jak dziś.
- **AC-12**: Wiadomość doradcy w sprawie gościa (`client_id` NULL) wysyła mail na e mail z migawki, w języku zapisanym w sprawie (`inquiry.locale`), tylko z linkiem „zaloguj się lub załóż konto, żeby odpowiedzieć" i bez treści wiadomości (konwencja 0048). Maile do gościa o odpowiedziach doradcy idą najwyżej raz na 10 minut na sprawę. Sprawa gościa nie powoduje błędu w `notify.ts`.
- **AC-13**: `contact_email_verified_at` ustawia się też przy pierwszej wiadomości klienta w sprawie, w której jest jeszcze NULL (właściciel konta zaangażował się w sprawę).
- **AC-14**: Zalogowany klient wysyła zapytanie jak dziś: kontakt z sesji, `contact_email_verified_at` ustawione na teraz, przekierowanie do `/panel/inquiries/{id}`.
- **AC-15**: Żadna akcja nie ufa `client_id` podanemu przez przeglądarkę. Niezalogowany odwiedzający nie może odczytać żadnej sprawy (`evaluateCaseAccess` dla braku aktora dalej zwraca `null`).
- **AC-16**: Zdarzenie `case_created` niesie flagę `guest`, a błędy idą przez `captureError`, tylko przez warstwę `lib/observability/`. Dla gościa identyfikatorem w analityce jest `inquiryId`, nigdy e mail, także dla zdarzeń `notification_email_sent` i `notification_email_failed` maili z AC-7 i AC-10 (dziś `sendLoginLinkEmail` używa e maila jako `entityId` i `distinctId`, dla wariantów gościa bierze `inquiryId` z adresu powrotu).
- **AC-17**: Pod przyciskiem wysyłki gościa jest krótka informacja o przetwarzaniu danych wyłącznie w sprawie zapytania (kontakt w tej sprawie, bez marketingu) z linkiem do polityki prywatności (bez checkboxa), w wersjach PL, EN i NL.
- **AC-18**: Specyfikacje 0023 (AC-5) i 0048 (AC-2, zdanie o logowaniu) dostają adnotację, że bramka logowania została zastąpiona przez 0066.

## Decision

**Chosen option**: Option 1 z poprawką z Option 4: sprawa gościa bez konta, jeden mail z linkiem magicznym

Sprawa doradcza może powstać bez sesji (`client_id` NULL, migawka kontaktu). Zaraz po zapisie gość dostaje jeden mail z linkiem magicznym do swojej sprawy (nowy e mail zakłada konto przy pierwszym kliknięciu, e mail istniejącego klienta loguje go), a sprawa dowiązuje się po e mailu przy logowaniu. Zmiana z 2026-10-07: wcześniej konto powstawało dopiero na jawne kliknięcie w osobnym kroku.

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
| `pending_registration` | bez zmian schematu | AC-8 zapisuje tu imię i telefon ze sprawy przy wysłaniu zapytania (nowy e mail), bez nadpisywania istniejącego wiersza |
| `verification_tokens` | bez zmian | Limit linków z AC-8 liczony z aktywnych tokenów na adres |

Relacje: `inquiry` N:1 `client` (teraz opcjonalna), `inquiry` 1:N `inquiry_item`, `inquiry` 1:N `channel`. Unikalność: `inquiry.idempotency_key` bez zmian.

**State transitions**: stan sprawy (`stage`) bez zmian. Dochodzi niezależny stan „kontaktu": gość (`client_id` NULL) → dowiązany i niepotwierdzony (`client_id` ustawione, `contact_email_verified_at` NULL, przypadek AC-10) → potwierdzony (`contact_email_verified_at` ustawione). Z gościa do potwierdzonego prowadzi logowanie linkiem (AC-9). Z dowiązanego niepotwierdzonego do potwierdzonego prowadzi pierwsza wiadomość klienta (AC-13).

**API surface**:

| Trasa lub akcja | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/inquiry` | Strona | `projects`, `country` (URL) | Formularz gościa albo klienta | publiczna dla gościa i klienta, producent i admin przekierowani | zły wybór domów → wyniki |
| `submitAdvisoryInquiry` | Akcja serwerowa | dotychczasowe pola plus `contact {name, email, phone}` i pole pułapka (gość) | `inquiryId`, `guest`, `linkFailed` (true tylko przy błędzie samej wysyłki maila) | sesja opcjonalna: z sesją roli client dane z konta, bez sesji dane z formularza; dla gościa przypina do konta klienta (AC-10), zapisuje `pending_registration` (AC-8) i wysyła link | `invalid`, `unsupported_country`, `rate_limited`, `generic` |
| `resendGuestCaseLink` | Akcja serwerowa | `inquiryId`, `locale` | zawsze `{ ok: true }`, poza błędem wysyłki | publiczna | błąd wysyłki → komunikat i ponów |
| `/inquiry/claim/[inquiryId]` | Strona (zapas) | `inquiryId` w ścieżce | strona z jednym przyciskiem „Wyślij mi link do mojej sprawy", bez żadnych danych sprawy | publiczna | nieznany id → ta sama strona, akcja nic nie robi |
| `sendVerificationRequest` w `auth.ts` | Wysyłka maila Auth.js | `identifier`, `url` z `callbackUrl` | zwykły mail logowania albo wariant gościa (`welcome=new` lub `welcome=existing`) | wewnętrzne | błąd wysyłki rzuca dalej (`throwOnFailure`), akcja zwraca `linkFailed` |
| `events.signIn` w `auth.ts` | Zdarzenie Auth.js | użytkownik roli client | dowiązanie spraw po e mailu (AC-9) | wewnętrzne | błąd dowiązania nie blokuje logowania |

**Key invariants**:
- Dane kontaktowe gościa trafiają wyłącznie do `inquiry` (migawka) i, przy wysłaniu zapytania z nowego e maila, do `pending_registration` (zmiana z 2026-10-07, wcześniej dopiero na kliknięcie). Samo wysłanie zapytania nigdy nie tworzy wiersza w `users` ani `client`: konto powstaje dopiero przy pierwszym kliknięciu w link z maila (`createUser` w `auth.ts`).
- Dowiązanie spraw do konta dzieje się tylko przy logowaniu rolą `client` (dowód własności e maila) albo przy dopasowaniu do istniejącego konta klienta (AC-10, ryzyko świadomie przyjęte, patrz Consequences). Konta producenta i administratora nigdy nie dostają spraw gościa.
- Rola, `client_id` i `contact_email_verified_at` pochodzą z serwera (sesja, baza), nigdy z danych przeglądarki.
- `evaluateCaseAccess` pozostaje jedynym miejscem decyzji o dostępie do sprawy. Sprawa gościa nie ma aktora klienta, więc dostęp klienta zwraca `null` do czasu dowiązania. Doradca i producent działają jak dziś.
- Idempotencja gościa: `findExisting` dopasowuje klucz i e mail (dla gościa) albo klucz i `client_id` (dla klienta). Wyścig kończy się błędem unikalności 23505 i odczytem zwycięzcy, jak dziś.
- Nowe publiczne akcje (`submitAdvisoryInquiry`, `requestAccountForGuestCase`) nie ujawniają, czy konto o danym e mailu istnieje. Uwaga: istniejące `requestLogin` (komunikat „unknown-email") i `registerClient` (komunikat o istniejącym koncie) już dziś to ujawniają, więc ta zmiana nie pogarsza wyliczania kont, ale go też nie naprawia (Follow up).
- Wiersz `pending_registration` zapisany przez AC-8 nigdy nie nadpisuje istniejącego (inna rola, inny payload) i nie powstaje, gdy w `users` jest już ten e mail.
- Wariant treści maila (`welcome`) wybiera tylko tekst, nigdy dostęp. Dostęp do sprawy nadal wylicza wyłącznie `evaluateCaseAccess` z sesji, a podrobiony adres powrotu zmienia co najwyżej treść maila logowania wysłanego na własny adres piszącego.

**Security model**:
- Publiczne: formularz zapytania gościa, strona claim, akcja `resendGuestCaseLink` (ograniczona limitem aktywnych tokenów, 3 na adres).
- Gość bez konta: nie odczytuje żadnej sprawy, nie pisze w czacie. Komunikacja z doradcą idzie mailem do czasu założenia konta.
- Klient: widzi i pisze tylko w sprawach ze swoim `client_id`.
- Zgodność RODO: dane osobowe osoby bez konta (e mail, telefon, adres działki). Podstawa: kontakt w sprawie złożonego zapytania, informacja pod przyciskiem (AC-17). Brak nowego podmiotu przetwarzającego, region UE bez zmian. Retencja nieobjęta, patrz Follow up.
- Link magiczny idzie na adres z formularza przy każdym zapytaniu, więc obca osoba może wywołać jeden mail logowania na cudzy adres. Ogranicza to limit 3 spraw na e mail na dobę i limit 3 aktywnych tokenów, a link loguje wyłącznie właściciela skrzynki. Skaner poczty może zużyć jednorazowy link, wtedy gość korzysta z „Wyślij ponownie" lub strony claim.
- Ochrona przed nadużyciem: limit 3 sprawy na e mail na dobę plus globalny dzienny sufit, pole pułapka, maile bez pól wpisanych przez gościa (kanał phishingu z naszej domeny), znacznik „e mail niepotwierdzony" dla doradcy, mail „czy to Ty" dla właściciela konta. Brak limitu po IP (świadomie, żeby nie trzymać dodatkowych danych).
- Podstawa przetwarzania to obsługa złożonego zapytania. Kontakt marketingowy z gośćmi wymaga osobnej zgody albo jawnie opisanego uzasadnionego interesu w tekście z AC-17. Osoba bez konta nie ma ścieżki usunięcia danych w aplikacji, więc prośby o usunięcie obsługuje ręcznie administrator (opisać w polityce prywatności).

**Configuration required**:
- `SUPPORT_REPLY_TO_EMAIL`: adres zespołu w nagłówku Reply-To maila „czy to Ty" (AC-10). `lib/notifications/send.ts` dostaje opcjonalny parametr `replyTo`. Osobna wartość na dev, staging i produkcję.

**Critical test scenarios** (każdy mapuje się na kryterium z Requirements):
- Happy path: gość z nowym e mailem wysyła zapytanie, widzi ekran „Sprawdź skrzynkę", dostaje jeden mail, jedno kliknięcie w link zakłada konto i otwiera sprawę w panelu z potwierdzonym kontaktem, czat działa, verifies **AC-1, AC-3, AC-6, AC-7, AC-8, AC-9**.
- Skaner poczty zużył link: gość klika „Wyślij ponownie" na ekranie albo na stronie claim, dostaje nowy link i wchodzi, verifies **AC-6, AC-7, AC-8**.
- Gość nigdy nie zakłada konta: sprawa istnieje z `client_id` NULL, doradca widzi ją ze znacznikiem „niepotwierdzony", odpowiedź doradcy idzie mailem z linkiem, verifies **AC-3, AC-11, AC-12**.
- E mail istniejącego klienta: sprawa trafia od razu na jego konto jako niepotwierdzona, właściciel dostaje jeden mail „czy to Ty" z linkiem magicznym i Reply-To, ekran gościa jest identyczny jak dla nowego e maila, verifies **AC-6, AC-10**.
- E mail producenta lub administratora: sprawa zostaje bez klienta, nie powstaje `pending_registration`, nie wychodzi mail, ekran identyczny, verifies **AC-6, AC-8**.
- Błąd wysyłki maila: sprawa jest zapisana, ekran pokazuje błąd i „Ponów", verifies **AC-6, AC-8**.
- Idempotencja: dwa wysłania z tym samym kluczem dają jedną sprawę, ten sam klucz z innym e mailem daje `invalid`, verifies **AC-4**.
- Limit i pułapka: czwarta sprawa na ten sam e mail w dobie daje `rate_limited`, wypełnione pole pułapka nie zapisuje niczego, verifies **AC-5**.
- Uprawnienia: producent i administrator na `/inquiry` są przekierowani, gość nie odczytuje cudzej sprawy, `resendGuestCaseLink` dla e maila producenta nic nie wysyła, verifies **AC-1, AC-8, AC-15**.
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

**Zmiana z 2026-10-07: jeden mail z linkiem magicznym.** Zadania 1 do 12 są zbudowane. Zadania 13 do 18 przerabiają kroki 4 i 5 (ekran potwierdzenia, konto, mail potwierdzający) i krok 6 (mail „czy to Ty"). Bez zmian schematu i bez migracji. **Postęp**: zadania 13 do 17 zbudowane, zadanie 18 bez dwóch scenariuszy E2E (happy path z jednym mailem i „Wyślij ponownie"), testy jednostkowe i komponentowe gotowe.

13. Wspólna reguła kwalifikacji adresu w `lib/cases/guest.ts`: dla adresu zwraca, czy wolno wysłać link (brak konta i brak oczekującej rejestracji, konto klienta, oczekująca rejestracja klienta) i czy trzeba zapisać `pending_registration` (`ON CONFLICT DO NOTHING`). Konta i oczekujące rejestracje producenta i administratora: brak wysyłki. Limit 3 aktywnych tokenów. Używają jej oba wejścia (zapytanie i ponowna wysyłka), satisfies **AC-8**
14. `submitAdvisoryInquiry`: po zapisie sprawy gościa (tylko gdy `created`), w tej samej akcji i z `await`: przypięcie do istniejącego konta klienta, staging `pending_registration`, `signIn("resend", { redirect: false, redirectTo: "/{locale}/panel/inquiries/{id}?welcome=new|existing" })`. Wynik niesie `linkFailed`. Usunąć `after(() => notifyGuestOfNewCase(...))`, satisfies **AC-6, AC-7, AC-8, AC-10**
15. Warianty maila w `sendVerificationRequest` i `lib/notifications/login.ts`: odczyt `callbackUrl` z `url`, marker `welcome`, język i `inquiryId` z ścieżki, osobne teksty dla `new` i `existing` (ten drugi z `replyTo` z `SUPPORT_REPLY_TO_EMAIL`), `entityId` i `distinctId` równe `inquiryId` dla wariantów gościa. Czysta funkcja parsująca w pliku bez importu `next-auth`, żeby dało się ją przetestować. Teksty w `pl`, `en`, `de`, `nl`. Usunąć `lib/notifications/guest-inquiry.ts`, typy `guest_inquiry_confirmation` i `guest_identity_check` oraz ich klucze tłumaczeń, satisfies **AC-7, AC-10, AC-16**
16. `InquiryFlow`: ekran „Sprawdź skrzynkę", bez przycisku „Załóż konto", z „Nie dostałeś maila? Wyślij ponownie" i stanem błędu przy `linkFailed`. Teksty `confirmBody`, `accountSentMessage` i pokrewne w czterech językach, satisfies **AC-6**
17. Zmiana nazwy akcji na `resendGuestCaseLink`, warunek `contact_email_verified_at` NULL (także dla przypiętych), wspólna reguła z zadania 13, nowe teksty strony claim i `GuestClaimButton` („Wyślij mi link do mojej sprawy"), satisfies **AC-7, AC-8**
18. Testy: zaktualizować `lib/case-actions.test.ts`, `lib/guest-case-actions.test.ts`, `components/klient/InquiryFlow.test.tsx`; nowe testy parsowania markera i wariantów maila oraz reguły kwalifikacji; E2E dla happy path z jednym mailem i dla „Wyślij ponownie", satisfies **AC-6 do AC-10, AC-16**

## Migration plan

**Strategy**: no migration needed (zmiana schematu tylko zdejmuje ograniczenie i dodaje kolumny nullable, istniejące sprawy mają klienta i działają bez zmian)
**Phases**:
1. Migracja z kroku 1, wdrożona przed kodem. Stary kod działa na nowym schemacie bez zmian.
2. Kod kroków 2 do 10 za jednym wdrożeniem. Bramka logowania znika od razu dla wszystkich.
3. Zmiana z 2026-10-07 (kroki 13 do 18): sam kod, bez nowej migracji. Mogą ją wdrożyć razem z fazą 2, jeśli ta jeszcze nie poszła na prod. Wiersze `pending_registration` zapisane już przez starą wersję na kliknięcie nie wymagają zmian.
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
- Wiersz `pending_registration` powstaje przy każdym zapytaniu z nowego e maila, więc literówki i spam zostawiają osierocone wiersze, dopóki nie dojdzie czyszczenie (Follow up, przed publicznym startem).
- Sprawdzenie, czy e mail ma konto, i zapis `pending_registration` dzieją się teraz w odpowiedzi na wysłanie formularza, więc czas odpowiedzi dla e maila producenta lub administratora (bez wysyłki) może się nieznacznie różnić od pozostałych. Przyjęte, bo bez sygnału w treści odpowiedzi to bardzo słaby kanał wyliczania kont.

**Neutral**:
- Brak limitu po IP: bot rotujący e maile obejdzie limit na adres, ogranicza go tylko globalny dzienny sufit (do rozważenia po pierwszych danych o nadużyciach).
- Sprawa gościa z e mailem producenta lub administratora zostaje bez konta klienta na stałe (logowanie nie-klienta niczego nie dowiązuje).
- Przy założeniu konta z AC-8 imię i telefon pochodzą ze zgłoszenia, nie od właściciela e maila. Obca osoba może więc wstępnie wypełnić dane przyszłego konta ofiary (ofiara musi kliknąć link logowania, którego nie zamawiała). Ryzyko przyjęte, patrz Follow up.
- Ekran potwierdzenia żyje w stanie komponentu, odświeżenie strony go gubi (mail z linkiem już wyszedł, a strona claim jest zapasem).
- Mail do gościa po odpowiedzi doradcy (AC-12) nadal prowadzi przez stronę claim, a nie bezpośrednio linkiem magicznym (zmiana dotyczy tylko maila po zapytaniu).
- Nowa zmienna konfiguracji `SUPPORT_REPLY_TO_EMAIL` i nowy parametr `replyTo` w warstwie maili.

## Follow-up

- [ ] Czyszczenie osieroconych wierszy `pending_registration` (TTL) przed publicznym startem, bo teraz powstają przy każdym zapytaniu z nowego e maila.
- [ ] Rozważyć ten sam link magiczny w mailu o odpowiedzi doradcy (AC-12) zamiast strony claim.
- [ ] Polityka retencji danych osobowych niezałożonych kont gości (anonimizacja po czasie bez konta) jako osobna specyfikacja. Dziś sprawa zostaje, dopóki doradca jej nie zamknie. Dotyczy też osieroconych wierszy `pending_registration` (brak czyszczenia), które warto objąć TTL.
- [ ] Przy pierwszej wizycie w panelu poprosić o potwierdzenie imienia i telefonu wstępnie wypełnionych ze zgłoszenia gościa.
- [ ] Wyliczanie kont w `requestLogin` i `registerClient` (istniejące komunikaty) jako osobna poprawka bezpieczeństwa.
- [ ] Opisać w polityce prywatności ręczną ścieżkę usunięcia danych osoby bez konta.
- [ ] Rozważyć limit po skrócie IP lub test antybotowy, jeśli po uruchomieniu pojawi się spam.
- [ ] Zdecydować, czy zapytanie B2B (spec 0037, 0038) ma dostać ten sam ekran „załóż konto po wysłaniu" dla spójności.
- [ ] Zaktualizować `lib/cases/AGENTS.md` (sprawa gościa, nullowalny `clientId`, dowiązanie po e mailu) i `lib/notifications/AGENTS.md` (`replyTo`) po zbudowaniu, żeby późniejsze zmiany nie zakładały klienta w każdej sprawie.
- [ ] Brak powiązanej funkcji w `docs/scope/` dla tej zmiany. Zapisać ją w `docs/scope/produkcja.md` przy najbliższym `/scope`.
