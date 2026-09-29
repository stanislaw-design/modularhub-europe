# 0055. Panel administracyjny

**Date**: 2026-09-28
**Status**: In Progress

## Summary

Ta specyfikacja spina cztery dziś rozłączone ekrany panelu admina (sprawy, zapytania, produkty, powiadomienia) pod jedną nawigacją i jednym trybem ciemnym, dodaje stronę startową z prawdziwymi liczbami (aktywne konta, projekty, zapytania, ruch na stronie, wykres trendu, ostatnia aktywność), pozwala administratorowi zablokować i odblokować konto producenta, oraz dodaje ekran monitoringu pokazujący ostatnie błędy z Sentry i stan kluczowych usług (baza, przechowywanie plików, e mail). Zarządzanie użytkownikami i rolami, pełny log audytowy oraz dwuskładnikowe logowanie są świadomie poza zakresem tej specyfikacji, zapisane jako przyszła funkcja w Follow-up.

## Context

Zobacz [rationale.md](rationale.md): pełny opis dzisiejszego stanu kodu, świadome zawężenie zakresu z pierwotnego pomysłu "centrum dowodzenia", oraz rozważane warianty podziału specyfikacji.

## Requirements

**User stories**:
- Jako administrator (dziś: inżynier prowadzący projekt, docelowo także szef bez technicznego zaplecia), chcę jedną wspólną nawigację między wszystkimi ekranami panelu, żeby nie musieć pamiętać osobnych adresów.
- Jako administrator, chcę na stronie startowej zobaczyć kluczowe liczby (konta, projekty, zapytania, ruch) i ostatnią aktywność, żeby ocenić stan platformy bez klikania po osobnych ekranach.
- Jako administrator, chcę zablokować producenta, który łamie zasady, i odblokować go później, bez ręcznej zmiany w bazie danych.
- Jako administrator, chcę widzieć wszystkie projekty i zapytania klientów w jednym miejscu, zamiast przełączać się między dwoma osobnymi ekranami.
- Jako administrator, chcę widzieć ostatnie błędy platformy i czy kluczowe usługi (baza, pliki, e mail) działają, bez logowania się osobno do Sentry czy Vercel.
- Jako administrator, chcę żeby panel działał w trybie ciemnym, tak jak reszta platformy.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Zalogowany administrator widzi wspólną nawigację (boczne menu) spinającą Dashboard, Producentów, Projekty i zapytania, Monitoring, Produkty i Powiadomienia; aktywna pozycja jest wizualnie oznaczona.
- **AC-2**: Każdy ekran `/internal/*` (nowy i istniejący) odrzuca dostęp dokładnie tym samym wzorcem co dziś: przekierowanie na logowanie przy braku sesji, przekierowanie poza panel przy roli innej niż `admin`.
- **AC-3**: Panel `/internal/*` (nowe ekrany i cztery istniejące) ma przełącznik trybu ciemnego, jako trzeci niezależny zakres tego samego mechanizmu co klient (spec 0043) i producent (spec 0046): domyślnie według preferencji systemowej przy pierwszym wejściu, zapamiętany ręczny wybór przy kolejnych, ten sam mechanizm (cookie, kontekst React, klasa CSS), nie osobny, na stałe wymuszony ciemny motyw.
- **AC-4**: Dashboard pokazuje dwa osobne kafelki: liczbę aktywnych kont klientów i liczbę aktywnych kont producentów (aktywne = `deleted_at` puste i `blocked_at` puste).
- **AC-5**: Dashboard pokazuje liczby projektów, zapytań (sprawy plus dawne zapytania bezpośrednie razem) i ofert, policzone z bazy.
- **AC-6**: Dashboard pokazuje liczbę wyświetleń stron (pageviews) z PostHog za ostatnie 30 dni.
- **AC-7**: Dashboard pokazuje wykres trendu z ostatnich 30 dni (dni liczone w strefie czasowej Europe/Warsaw) z dwiema seriami dziennymi: nowe rejestracje i nowe zapytania (ta sama definicja zapytania co w AC-5, sprawy i dawne zapytania bezpośrednie razem).
- **AC-8**: Dashboard pokazuje listę ostatniej aktywności (najnowsze rekordy z kont, zapytań, spraw i ofert, posortowane malejąco po dacie, bez nowej tabeli zdarzeń).
- **AC-9**: Każdy widget zależny od zewnętrznego źródła danych (wyświetlenia z PostHog na Dashboardzie, błędy z Sentry i health check usług na stronie Monitoring) ma limit czasu 5 sekund na odpowiedź; gdy źródło nie odpowie w tym czasie albo zwróci błąd, tylko ten jeden widget pokazuje stan "niedostępne", reszta strony renderuje się normalnie.
- **AC-10**: Strona Producenci pokazuje listę wszystkich producentów (nazwa, kraj, status weryfikacji, status blokady) z wyszukiwaniem po nazwie i paginacją.
- **AC-11**: Administrator może zablokować producenta (z opcjonalnym, krótkim powodem) i odblokować go ponownie; akcja zapisuje kiedy, kto z adminów i (opcjonalnie) dlaczego.
- **AC-12**: Zablokowany producent traci dostęp natychmiast: jego aktywne sesje są usuwane w momencie blokady, a próba zalogowania się ponownie (nowy link mailowy) jest odrzucana, dopóki konto pozostaje zablokowane.
- **AC-13**: Blokada dotyczy wyłącznie kont z rolą `producer`; nie ma akcji blokady dla kont klienta ani administratora.
- **AC-14**: Strona Projekty i zapytania zastępuje dzisiejsze osobne ekrany Sprawy i Zapytania jedną wspólną, paginowaną listą łączącą sprawy (spec 0048) i dawne zapytania bezpośrednie (spec 0023) w jednym zapytaniu (sortowanie po dacie działa na całym scalonym zbiorze, nie osobno per źródło). Każdy wiersz pokazuje kolumnę typu (Sprawa albo Zapytanie bezpośrednie) i swój własny, natywny status, bo oba źródła mają różne słowniki statusów i ta spec ich nie ujednolica, oraz link do już istniejącej strony szczegółów. Stare adresy `/internal/cases` i `/internal/inquiries` przekierowują na nowy widok; strona szczegółu pojedynczej sprawy (`/internal/cases/[id]`) zostaje bez zmian.
- **AC-15**: Strona Monitoring pokazuje listę ostatnich błędów z Sentry (komunikat, liczba wystąpień, data ostatniego wystąpienia, link do Sentry).
- **AC-16**: Strona Monitoring pokazuje aktualny stan trzech usług (baza danych, przechowywanie plików R2, e mail Resend), sprawdzany na żywo przy każdym wejściu na stronę, z czytelnym stanem działa/błąd/niedostępne dla każdej.
- **AC-17**: Każda akcja blokady/odblokowania i każdy błąd odczytu danych panelu (Sentry, PostHog, health check) jest zgłaszany przez istniejące `lib/observability` (`captureError`), nie cicho pomijany.

## Options considered

Zobacz [rationale.md](rationale.md) (jedna spec dla trzech modułów kontra trzy osobne specyfikacje).

## Decision

**Chosen option**: Option 2: jedna spec obejmująca wspólną nawigację/dashboard, moderację producentów i projektów, oraz monitoring, zbudowana jako jeden spójny, uporządkowany metodą Tracer Bullet build plan.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `sentry-nextjs-sdk` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-nextjs-sdk/`) · `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`)

## Rationale

Zobacz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Jedna zmiana: tabela `users` (istniejąca) dostaje trzy nowe, opcjonalne kolumny.

| Kolumna | Typ | Wymagane | Opis |
|---|---|---|---|
| `blocked_at` | timestamp z strefą czasową | nie | kiedy zablokowano konto; puste = konto nie jest zablokowane |
| `blocked_by` | text, klucz obcy do `users.id` | nie | który admin zablokował; `set null` przy usunięciu tego admina |
| `blocked_reason` | text | nie | krótki, opcjonalny powód, widoczny tylko w panelu admina |

Żadnych nowych tabel. Dashboard, feed aktywności i monitoring to zapytania odczytujące istniejące tabele (`users`, sprawy, dawne zapytania, oferty) i zewnętrzne API (Sentry, PostHog) na żywo, bez własnego zapisu.

**Key invariants**:
- `blocked_at` może istnieć tylko dla wiersza z `role = 'producer'`; wymuszone na poziomie akcji serwerowej (nie bazy danych, żeby uniknąć CHECK zależnego od wartości innej kolumny w kolejnych migracjach).
- "Aktywne konto" na dashboardzie zawsze znaczy `deleted_at IS NULL AND blocked_at IS NULL`, spójnie w każdym miejscu, gdzie ta liczba się pojawia.
- Blokada usuwa od razu wszystkie wiersze `sessions` zablokowanego użytkownika (sesje z `database` strategy żyją w bazie, nie tylko w podpisanym tokenie), więc traci dostęp natychmiast, nie dopiero po naturalnym wygaśnięciu.
- Callback `signIn` w `auth.ts` (nie `session`, bo ten tylko wzbogaca dane sesji i nie może jej odrzucić) odmawia zalogowania kontu z ustawionym `blocked_at`, więc zablokowany producent nie założy sobie nowej sesji kolejnym linkiem mailowym.
- Mutujące akcje serwerowe producenta spoza tej spec (np. dodanie produktu, odpowiedź na zapytanie) sprawdzają `blocked_at` niezależnie od samej sesji, na wypadek żądania wysłanego tuż przed unieważnieniem sesji.

**Security model**:
- Dostęp do każdego ekranu `/internal/*` (nowego i istniejącego): sesja wymagana, rola `admin` wymagana, dokładnie ten sam wzorzec co dziś w `internal/products/AGENTS.md` (przekierowanie na login bez sesji, przekierowanie poza panel przy złej roli).
- Wspólny layout (`internal/layout.tsx`) dodaje tylko nawigację i wybór motywu; nie zastępuje sprawdzenia `auth()` na każdej stronie z osobna, ten wzorzec zostaje dokładnie taki jak dziś, na każdej stronie, nie tylko w layoucie.
- Akcja blokady/odblokowania: rola `admin` sprawdzana niezależnie w samej akcji serwerowej (nie tylko na poziomie strony), tak jak `lib/product-photo-actions.ts` sprawdza rolę niezależnie od bramki na stronie.
- Zakres RODO: panel pokazuje dane osobowe klientów i producentów (e mail, telefon, NIP, adres). Dostęp pozostaje ograniczony do roli `admin`; pełny log audytowy każdej odsłony tych danych jest świadomie odłożony (patrz Follow-up), ale sama akcja blokady zapisuje minimalną odpowiedzialność (kto, kiedy, opcjonalnie dlaczego), więc nie jest to całkowicie nieprześledzalne.
- Nowe zewnętrzne poświadczenia (klucz PostHog do odczytu, ewentualnie szerszy zakres tokena Sentry, patrz Configuration required) muszą być ustawione wyłącznie jako sekrety serwerowe (bez prefiksu `NEXT_PUBLIC_`), nigdy dostępne w kodzie klienckim.

**API surface**:

| Trasa / akcja | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/internal/layout.tsx` | Layout | brak (sesja) | boczne menu, aktywna pozycja, wylogowanie | sesja, rola `admin` | brak sesji/zła rola, przekierowanie (AC-2) |
| `/internal` (Dashboard) | Strona | brak (sesja) | kafelki KPI, wykres trendu, feed aktywności, osobne stany "niedostępne" per widget | sesja, rola `admin` | zewnętrzne API nie odpowiada, widget pokazuje "niedostępne" zamiast psuć stronę (AC-9) |
| `/internal/producers` | Strona | opcjonalny parametr wyszukiwania i strona listy | lista producentów, paginacja | sesja, rola `admin` | jw. (AC-2) |
| `blockProducer` | Akcja serwerowa | `userId`, opcjonalny `reason` | `blocked_at`/`blocked_by`/`blocked_reason` ustawione, wiersze `sessions` tego użytkownika usunięte | sesja, rola `admin`; cel akcji musi mieć `role = 'producer'` | cel nie jest producentem, odmowa (AC-13); błąd zapisu, komunikat i możliwość ponowienia |
| `unblockProducer` | Akcja serwerowa | `userId` | `blocked_at`/`blocked_by`/`blocked_reason` wyczyszczone | sesja, rola `admin` | jw. |
| `/internal/cases-and-inquiries` | Strona | opcjonalne filtry (status, typ) | jedna wspólna lista spraw i zapytań | sesja, rola `admin` | jw. (AC-2) |
| `/internal/monitoring` | Strona | brak (sesja) | lista błędów Sentry, status trzech usług | sesja, rola `admin` | Sentry/health check nie odpowiada, sekcja pokazuje "niedostępne" (AC-9) |

**Configuration required**:
- `POSTHOG_PERSONAL_API_KEY`: nowy sekret serwerowy, klucz osobisty PostHog z uprawnieniem do odczytu zapytań (Trends/HogQL), osobny od już istniejącego `NEXT_PUBLIC_POSTHOG_KEY` (który jest kluczem do zapisu zdarzeń z przeglądarki i nie nadaje się do odczytu). Do wygenerowania w ustawieniach projektu PostHog.
- `SENTRY_AUTH_TOKEN`: już skonfigurowany do wgrywania sourcemap przy buildzie; do zweryfikowania czy jego zakres obejmuje też odczyt (`project:read`, `event:read`) potrzebny do listy błędów w czasie działania aplikacji, patrz Follow-up.
- Zapytania odczytu do PostHog idą pod ten sam host co już skonfigurowany `NEXT_PUBLIC_POSTHOG_HOST` (region EU); nowy jest tylko klucz.
- Odczyty z Sentry i PostHog są cache'owane na krótko (rzędu 60 sekund), żeby częste wejścia na Dashboard i Monitoring nie odpytywały obu API przy każdym renderze i nie ryzykowały limitów zapytań.
- Health check e mail (Resend) to lekkie, realne zapytanie do API (np. lista domen), nie samo sprawdzenie czy zmienna środowiskowa istnieje.

**Critical test scenarios** (każdy odnosi się do kryterium w Requirements):
- Happy path: administrator loguje się, widzi dashboard z prawdziwymi liczbami kont, klika Producenci, blokuje jednego producenta, ten producent traci dostęp do swojego panelu przy kolejnym żądaniu, weryfikuje **AC-1, AC-4, AC-11, AC-12**.
- Failure case: PostHog (lub Sentry) nie odpowiada w rozsądnym czasie, dashboard i tak renderuje resztę widgetów, a niedostępny widget pokazuje jasny stan błędu, weryfikuje **AC-9, AC-17**.
- Auth/permission: użytkownik z rolą `client` lub `producer` próbuje wejść na dowolny nowy adres `/internal/*`, zostaje przekierowany dokładnie tak jak na dzisiejszych ekranach panelu, weryfikuje **AC-2**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet epiki Produkcja: najpierw jeden prawdziwy, kompletny wątek (powłoka plus jedna prawdziwa liczba na dashboardzie), dopiero potem pogrubienie kolejnych widgetów i modułów. Migracja jako zadanie pierwsze. Żeby boczne menu nigdy nie linkowało do strony, która jeszcze nie istnieje, każdy wpis menu pojawia się w tym samym zadaniu, które buduje jego stronę, nie wcześniej. Każde zadanie budujące nową stronę `/internal/*` stosuje dokładnie ten sam wzorzec autoryzacji (sesja plus rola `admin`, sprawdzane na samej stronie) ustalony w zadaniu 2.

1. Migracja: dodanie `blocked_at`, `blocked_by` (klucz obcy do `users.id`, `set null` przy usunięciu), `blocked_reason` do tabeli `users`, satisfies **AC-11**
2. Wspólna powłoka: boczne menu w `internal/layout.tsx` linkujące na start do czterech dziś istniejących ekranów (Sprawy, Zapytania, Produkty, Powiadomienia), oznaczenie aktywnej pozycji, oraz trzeci niezależny zakres trybu ciemnego (`theme-internal`, rozszerzenie `ThemeProvider`, z przełącznikiem) obejmujący te cztery ekrany, satisfies **AC-1, AC-2, AC-3**
3. Dashboard, pierwszy prawdziwy wątek: wpis "Dashboard" w menu, zapytanie do bazy liczące aktywne konta klientów i producentów, dwa kafelki z prawdziwymi danymi od pierwszego renderu, satisfies **AC-1, AC-4**
4. Dashboard, pogrubienie liczbami: kafelki projektów, zapytań i ofert z bazy, satisfies **AC-5**
5. Integracja z PostHog: nowa funkcja odczytu w `lib/observability` (pageviews z ostatnich 30 dni, krótko cache'owana), kafelek na dashboardzie z limitem czasu 5 sekund i stanem "niedostępne" przy błędzie albo przekroczeniu limitu, `captureError` przy niepowodzeniu, satisfies **AC-6, AC-9, AC-17**
6. Wykres trendu: instalacja Recharts, zapytanie grupujące nowe rejestracje i nowe zapytania (Europe/Warsaw) po dniu za ostatnie 30 dni, wykres na dashboardzie, satisfies **AC-7**
7. Feed ostatniej aktywności: zapytanie łączące najnowsze rekordy z kont, zapytań, spraw i ofert po dacie, lista na dashboardzie, satisfies **AC-8**
8. Strona Producenci: wpis "Producenci" w menu, zapytanie `getAllProducersForAdmin` (wzorcem `getAllProductsForAdmin`), wyszukiwanie i paginacja, satisfies **AC-1, AC-10**
9. Akcje `blockProducer`/`unblockProducer`: zapis `blocked_at`/`blocked_by`/`blocked_reason`, usunięcie wierszy `sessions` zablokowanego użytkownika, odrzucenie logowania w callbacku `signIn` w `auth.ts` dla zablokowanego konta, sprawdzenie `blocked_at` w istniejących akcjach producenta (produkty, odpowiedzi na zapytania), satisfies **AC-11, AC-12, AC-13, AC-17**
10. Strona Projekty i zapytania: wpis "Projekty i zapytania" w menu zastępujący dotychczasowe osobne wpisy Sprawy i Zapytania, jedno zapytanie scalające sprawy (spec 0048) i dawne zapytania bezpośrednie (spec 0023) z paginacją nad całym scalonym zbiorem, kolumna typu i natywnego statusu każdego źródła, przekierowanie starych adresów `/internal/cases` i `/internal/inquiries` na nowy widok, satisfies **AC-14**
11. Strona Monitoring, błędy: wpis "Monitoring" w menu, nowa funkcja odczytu w `lib/observability` (ostatnie issues z Sentry REST API, krótko cache'owana), lista na stronie z limitem czasu 5 sekund i stanem "niedostępne", satisfies **AC-1, AC-15, AC-9, AC-17**
12. Strona Monitoring, zdrowie usług: żywy test bazy (`SELECT 1`) z limitem czasu, lekki test R2 przez istniejący klient `lib/storage/`, lekkie realne zapytanie do API Resend, trzy stany (działa / błąd / niedostępne) z tym samym limitem czasu 5 sekund, satisfies **AC-16, AC-9**

## Consequences

**Positive**:
- Cztery dziś rozłączone ekrany i trzy nowe moduły stają się jedną spójną, ciemną, łatwą do przeglądania całością, z której może korzystać także osoba nietechniczna (szef)
- Administrator dostaje realny obraz kondycji platformy (konta, ruch, błędy) bez logowania się osobno do Neon, Sentry, Vercel i PostHog
- Blokowanie producenta zastępuje dzisiejszą ręczną zmianę w bazie przez Neon MCP bezpiecznym, powtarzalnym mechanizmem

**Negative / tradeoffs**:
- Brak pełnego audit logu oznacza, że poza samą akcją blokady (gdzie zapisane jest kto/kiedy/dlaczego) nikt nie zobaczy, kto i kiedy przeglądał dane konkretnego klienta czy producenta; to świadomie zaakceptowana luka zgodności, do zamknięcia przed poważniejszym wzrostem liczby adminów (patrz Follow-up)
- Dwie nowe zewnętrzne integracje w czasie działania aplikacji (odczyt Sentry, odczyt PostHog) to dwa nowe punkty awarii i dwa nowe sekrety do rotacji; złagodzone przez AC-9 (osobna degradacja per widget), ale nadal realny koszt operacyjny
- Jedna płaska rola `admin` oznacza, że każdy administrator (dziś inżynier, docelowo też szef) ma pełny dostęp do wszystkiego w panelu, bez możliwości ograniczenia kogoś do samego podglądu; świadomie zaakceptowane przy obecnej, małej liczbie osób

**Neutral**:
- Nowa zależność (Recharts) do utrzymania, choć mała i standardowa
- Wzorzec trybu ciemnego z spec 0043/0046 dostaje trzeci zakres; każda przyszła zmiana tego mechanizmu musi pamiętać o wszystkich trzech zakresach, nie tylko dwóch

## Follow-up

- [ ] Zaprojektować (osobna, przyszła spec) zarządzanie użytkownikami i rolami z poziomu panelu, pełny log audytowy odsłon i zmian danych osobowych, oraz dwuskładnikowe logowanie dla kont admina; świadomie poza zakresem tej specyfikacji (patrz Premise note w rationale.md)
- [ ] Przed wdrożeniem zweryfikować, czy `SENTRY_AUTH_TOKEN` ma zakres odczytu (`project:read`, `event:read`) potrzebny do listy błędów w zadaniu 12; jeśli nie, wygenerować osobny token do tego celu zamiast poszerzać uprawnienia tokena używanego dziś do wgrywania sourcemap
- [ ] Rozważyć, czy blokada producenta powinna też ukrywać jego produkty z wyników wyszukiwania klienta; świadomie odłożone w tej wersji (blokada dotyczy wyłącznie dostępu producenta do własnego panelu i logowania), ale warto to świadomie zdecydować zanim pierwszy raz ktoś zostanie zablokowany w produkcji
- [ ] Sprawdzić, czy `lib/cases/notify.ts` (powiadomienia e mail, spec 0051) powinien pomijać zablokowanego producenta; ta spec tego nie zmienia, zablokowany producent może więc nadal dostawać e maile o nowych sprawach, mimo że nie może się już zalogować
- [ ] `app/[locale]/internal/products/AGENTS.md` i pozostałe nested AGENTS.md dla `/internal/*` używają dziś nazw sprzed zmiany adresów na angielskie (spec 0036, `produkty`/`zapytania` zamiast `products`/`inquiries`); `/sync` powinien to odświeżyć przy okazji tej funkcji
