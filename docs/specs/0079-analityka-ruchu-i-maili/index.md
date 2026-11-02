# 0079. Analityka ruchu i maili w panelu admina

**Date**: 2026-10-30
**Status**: Proposed

## Summary

Dziś nie wiemy, ilu ludzi odwiedza portal, bo przeglądarka nic nie wysyła do PostHog (kafelek "Wyświetlenia stron" w panelu pokazuje zero). Ta specyfikacja dodaje pomiar ruchu (goście, sesje, czas, strony, ruch na producenta) wyłącznie po zgodzie z banera: bez zgody analityka nawet się nie ładuje. Dla maili do producentów zapisujemy dziennik wysyłek z danymi z webhooka Resend (dostarczono, odbito, skarga), a otwarcia i kliknięcia mierzymy własną pikselką i przekierowaniem tylko u tych użytkowników producenta, którzy dali osobną, dobrowolną zgodę przy zakładaniu konta (lub później w ustawieniach). Wszystko widać w nowej sekcji `/internal/analytics`.

## Requirements

**User stories**:
- Jako zespół ModularHub chcę widzieć, ilu gości (którzy się zgodzili) odwiedza portal, ile czasu spędza i na jakie strony wchodzi, żeby wiedzieć, co działa.
- Jako zespół chcę widzieć ruch w rozbiciu na producenta (jego produkty i jego stronę), żeby rozmawiać z producentami na liczbach.
- Jako zespół chcę widzieć, czy maile do producentów są dostarczane, a u zgodzonych użytkowników także czy są otwierane i klikane, żeby wiedzieć, czy zapytania do nich docierają.
- Jako odwiedzający chcę zdecydować, czy zgadzam się na pomiar, i mieć pewność, że bez mojej zgody analityka niczego nie ładuje, nie zapisuje ani nie wysyła.
- Jako użytkownik producenta chcę dobrowolnie zdecydować, czy moje maile od ModularHub mogą mierzyć otwarcia i kliknięcia, i móc to w każdej chwili zmienić.

**Acceptance criteria** (kontrakt, każde kryterium da się sprawdzić osobno):

Ruch i zgoda:
- **AC-1**: Po zgodzie wejście na stronę publiczną wysyła dokładnie jedno zdarzenie `$pageview` z właściwościami `page_path` (bez prefiksu języka), `locale` i `page_type`. Przejście w aplikacji (bez przeładowania) wysyła jedno zdarzenie na zmianę trasy, nie dwa, także przy przejściu z produktu A do produktu B.
- **AC-2**: Bez zgody (brak decyzji lub odmowa) analityka niczego nie ładuje (`posthog-js` nie jest nawet pobierany), nie wysyła żadnego żądania i nie zapisuje nic w cookies, localStorage ani sessionStorage poza samą decyzją o zgodzie. Po akceptacji pomiar startuje bez przeładowania strony.
- **AC-3**: Nowy odwiedzający widzi baner w aktywnym języku (pl, en, nl, de) z równorzędnymi przyciskami "Akceptuję" i "Odrzucam" oraz linkiem do polityki prywatności. Decyzję można zmienić później (link w stopce lub na stronie prywatności), a wycofanie zgody natychmiast zatrzymuje pomiar.
- **AC-4**: Zdarzenia idą przez ścieżkę `/ingest` na naszej domenie. Ścieżka `/ingest` nigdy nie przechodzi przez `proxy.ts` (matcher ją wyłącza), co pilnuje test.
- **AC-5**: Nie mierzymy: `/internal`, panelu klienta, panelu producenta, ani żadnego środowiska innego niż produkcja (dev, CI, preview nie wysyłają nic). Decyduje jedna funkcja `isAnalyticsEnabled()` w `lib/observability/`; testy E2E włączają ją jawnie zmienną `NEXT_PUBLIC_ANALYTICS_FORCE=1`.
- **AC-6**: Pageview strony produktu i strony producenta niesie `producer_id` (oraz `product_id` i `family` dla produktu), ustawione przez stronę, nie wyliczone z adresu. Zmiana sluga nie psuje historii.

Panel:
- **AC-7**: `/internal/analytics` ma widok Ruch: goście, sesje, średni czas sesji, trend dzienny, wybór zakresu 7/30/90 dni (domyślnie 30). Widok mówi wprost, że liczby obejmują tylko odwiedzających, którzy wyrazili zgodę, więc są niższe niż prawdziwy ruch.
- **AC-8**: Widok Strony: najczęściej odwiedzane strony, strony wejścia i strony wyjścia.
- **AC-9**: Widok Producenci: ranking producentów po wyświetleniach ich produktów i ich strony, oraz szczegół jednego producenta (trend, jego produkty, jego statystyki maili).
- **AC-10**: Widok Maile: dla każdego typu maila i każdego producenta: wysłane (jeden wiersz to jeden odbiorca), liczba unikalnych zapytań (`entity_id`), dostarczone, odbite, skargi oraz, tylko dla maili wysłanych w wariancie śledzonym, unikalne kliknięcia i otwarcia uznane za ludzkie. Widok pokazuje też, ilu odbiorców wyraziło zgodę (udział maili śledzonych), z uwagą, że otwarcia bywają zawyżone, a wskaźniki dotyczą tylko zgodzonych.
- **AC-11**: Każde źródło danych (PostHog, Neon) pada osobno: gdy PostHog nie odpowiada, widoki ruchu pokazują "niedostępne", a widok Maile działa dalej.
- **AC-12**: Istniejący kafelek "Wyświetlenia stron (30 dni)" na dashboardzie pokazuje prawdziwą liczbę i linkuje do `/internal/analytics`.

Maile do producentów:
- **AC-13**: Siedem typów maili do producentów (`large_order_producer_*`) dostaje zapis w `email_message` przed wysyłką i tag Resend `message_id=<uuid>`. Linki do naszej domeny dostają `utm_source=email`, `utm_medium=producer_mail`, `utm_campaign=<typ maila>`. Wariant śledzony (pikselka otwarcia i linki przez nasze przekierowanie) dostaje wyłącznie odbiorca z aktywną zgodą (AC-20); pozostali dostają treść jak dziś plus UTM. Wszystkie inne maile, w tym link logowania, są bez zmian co do bajta (pilnuje tego test migawkowy HTML i tekstu dla `login_link` i jednego maila do klienta).
- **AC-14**: Webhook Resend weryfikuje podpis na surowym ciele żądania. Zdarzenia bez tagu `message_id` (wszystkie inne maile z domeny, w tym `login_link`) dostają od razu 200 i nic się nie dzieje. Zdarzenia dostarczono, odbito i skarga aktualizują wiersz maila. Powtórzone zdarzenie nie psuje liczb. Tag jest, a wiersza nie ma: błąd, który Resend ponowi.
- **AC-15**: W `email_message`, `email_event` i `user_consent` nie ma adresu e-mail odbiorcy. Odbiorca jest identyfikowany tylko przez `recipient_user_id`.
- **AC-16**: Awaria śledzenia (zapis do bazy przed wysyłką, sprawdzenie zgody, przepisanie linków) nigdy nie blokuje wysyłki maila ani zapisu, który ją wywołał. Mail wychodzi wtedy w wariancie nieśledzonym, a błąd idzie do Sentry.

Zgoda producenta na śledzenie maili:
- **AC-18**: Formularz rejestracji producenta ma osobne pole wyboru zgody na pomiar otwarć i kliknięć w mailach, niezaznaczone domyślnie, nieobowiązkowe, oddzielone od akceptacji regulaminu. Konto da się założyć bez zaznaczenia. Zaznaczenie zapisuje w `user_consent` kto, kiedy i na jaką wersję tekstu się zgodził.
- **AC-19**: W ustawieniach panelu producenta każdy użytkownik może zobaczyć stan swojej zgody i ją udzielić lub wycofać (dotyczy też kont istniejących i dołączonych później do firmy, spec 0057). Wycofanie zapisuje `withdrawn_at`, nie kasuje wiersza.
- **AC-20**: Wariant śledzony jest wysyłany tylko, gdy odbiorca ma w chwili wysyłki aktywną zgodę (wiersz bez `withdrawn_at`). Zgoda jest sprawdzana per użytkownik, nie per firma. Otwarcia i kliknięcia z maili, których odbiorca wycofał zgodę po wysyłce, nie są zapisywane (linki nadal przekierowują).
- **AC-21**: Trasa pikselki zawsze zwraca obrazek 1x1, także dla nieznanego id. Trasa kliknięcia przekierowuje tylko na adres z poprawnym podpisem i z naszej domeny, inaczej nie przekierowuje wcale (brak otwartego przekierowania).
- **AC-22**: Otwarcia i kliknięcia wyglądające na automat są oznaczone `likely_automatic` i nie wchodzą do głównych liczb. Reguła: żądanie HEAD to zawsze automat; kilka różnych linków jednego maila w ciągu kilku sekund to automat; zakresy adresów i user agenty Apple (Mail Privacy Protection), Microsoft i Proofpoint z listy w kodzie to automat; proxy obrazków Gmaila liczy się jako człowiek (pobiera obrazek dopiero przy otwarciu). Skaner nadal dostaje przekierowanie, żeby nie psuć linku.
- **AC-23**: Surowe wiersze `email_event` starsze niż 13 miesięcy usuwa zadanie cykliczne. Sumy w `email_message` zostają.

Prywatność:
- **AC-17**: Polityka prywatności (pl, en, nl, de) opisuje pomiar ruchu po zgodzie, dziennik maili do producentów i dobrowolne śledzenie otwarć i kliknięć za zgodą użytkownika producenta wraz ze sposobem jej wycofania.

## Decision

**Chosen option**: Hybryda. Ruch w PostHog (posthog-js ładowany dopiero po zgodzie z banera), maile do producentów we własnych tabelach Neon z danymi z webhooka Resend, a otwarcia i kliknięcia własną pikselką i przekierowaniem wyłącznie za dobrowolną zgodą użytkownika producenta.

Ruch czytamy z PostHog zapytaniami HogQL do panelu `/internal/analytics`. Maile mają dziennik w Neon (tag `message_id` łączy go z webhookiem). Śledzenie otwarć i kliknięć działa tylko u odbiorców z aktywnym wpisem w `user_consent`.

**Implementation skills**: `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Reasoning i rozważane opcje: patrz `rationale.md`.

## Feature design

**Dane o ruchu (PostHog, bez naszych tabel)**

Jedno zdarzenie `$pageview` z właściwościami:

| Właściwość | Wartość |
|---|---|
| `page_path` | ścieżka bez prefiksu języka, np. `/sauna/kora-relax-550` |
| `locale` | `pl`, `en`, `nl`, `de` |
| `page_type` | `home`, `results`, `project`, `sauna`, `outdoor_tv`, `modularproject`, `producer`, `other` |
| `producer_id` | uuid producenta, tylko strony produktu i producenta |
| `product_id`, `family` | tylko strony produktu |
| `environment` | `production` (zawsze, bo inne środowiska nie wysyłają) |

Nie wołamy `identify()` w przeglądarce. Rola odwiedzającego nie jest wysyłana. Wyłączone: autocapture, nagrywanie sesji, ankiety, flagi funkcji i automatyczny `capture_pageview`. Mierzymy tylko `$pageview` i `$pageleave` (czas na stronie), każdy wysyłany ręcznie.

**Zgoda na ruch**: jedyny stan, w którym analityka działa, to "zaakceptowano". Przed decyzją i po odmowie moduł analityki nie jest ładowany (`import()` dopiero po akceptacji), więc nie ma żądań, cookies ani storage. Po akceptacji ładowany jest `posthog-js` z trwałym identyfikatorem. Wycofanie zgody wywołuje `opt_out_capturing()` i czyści identyfikator. Zapamiętujemy samą decyzję (localStorage), co jest zapisem na potrzeby obsługi zgody.

**Kto wysyła pageview (wyścig z atrybucją)**: ogólny tracker w layoucie `(customer)` wysyła pageview dla stron typu `home`, `results`, `other` itd. Dla stron produktu i producenta pageview wysyła wyłącznie komponent atrybucji danej strony (z propsami `page_type`, `producer_id`, `product_id`, `family`), a ogólny tracker ten typ strony pomija.

**Kolejność ładowania i cache (spec 0078, `cacheComponents: true`)**: zgodę, baner i trackera robimy wyłącznie po stronie klienta (decyzja w localStorage, odczyt w `useEffect`), tracker w `<Suspense>`, żadnego `cookies()` w layoucie `(customer)`. Kolejność: odczyt decyzji, potem (tylko przy akceptacji) `import()` i `init`. Baner nie może migać w prerenderowanym szkielecie.

**Dane o mailach i zgodzie (Neon)**

`user_consent` (historia zgód użytkowników):
- `id` uuid, klucz główny
- `user_id` text, klucz obcy do `users`, wymagane
- `kind` enum, na start jedna wartość: `producer_email_tracking`
- `text_version` tekst, wersja treści, na którą się zgodzono
- `granted_at` znacznik czasu, wymagane
- `withdrawn_at` znacznik czasu, puste dopóki zgoda aktywna
- Indeks: `(user_id, kind)`. Częściowy indeks unikalny `(user_id, kind)` gdzie `withdrawn_at IS NULL`: najwyżej jedna aktywna zgoda danego rodzaju na użytkownika. Ponowna zgoda po wycofaniu to nowy wiersz.

`email_message` (jeden wiersz na wysłany mail do producenta, do jednego odbiorcy; producent z kilkoma użytkownikami daje kilka wierszy z tym samym `producer_id`):
- `id` uuid, klucz główny, generowany przed wysyłką (trafia do tagu Resend, pikselki i linków)
- `resend_email_id` tekst, unikalny, puste do odpowiedzi Resend
- `email_type` tekst, jeden z typów `large_order_producer_*`
- `entity_id` tekst
- `producer_id` uuid, klucz obcy do `producer`, wymagane
- `recipient_user_id` text, klucz obcy do `users`, `ON DELETE SET NULL`
- `tracked` boolean, czy mail poszedł w wariancie śledzonym (pikselka i przekierowanie)
- `sent_at` znacznik czasu, wymagane (zapisany przy wstawieniu wiersza)
- `delivered_at`, `bounced_at`, `complained_at` znaczniki czasu, puste do zdarzenia z webhooka
- `first_opened_at`, `first_clicked_at` znaczniki czasu, `open_count`, `click_count` liczby całkowite domyślnie 0 (tylko ruch nieautomatyczny, tylko `tracked = true`)
- Indeksy: `(producer_id, sent_at)`, `(email_type, sent_at)`. Unikalność: `resend_email_id`.

`email_event` (surowe zdarzenia otwarcia i kliknięcia, czyszczone po 13 miesiącach):
- `id` uuid, klucz główny
- `message_id` uuid, klucz obcy do `email_message`, usuwanie kaskadowe
- `kind` enum: `opened`, `clicked`
- `occurred_at` znacznik czasu
- `target_url` tekst, tylko dla `clicked`, tylko adresy z naszej listy dozwolonych
- `likely_automatic` boolean, domyślnie false
- Indeks: `(message_id, kind)`

Relacje: `users` 1:N `user_consent`; `producer` 1:N `email_message`; `users` 1:N `email_message` (odbiorca); `email_message` 1:N `email_event`. Dostarczono, odbito i skarga to znaczniki na wierszu maila (operacja idempotentna), bez osobnych zdarzeń.

**Przepływ wysyłki**: `sendNotificationEmail()` dostaje opcjonalne `tracking: { producerId, recipientUserId }`. Gdy jest podane i typ maila jest na liście `TRACKED_EMAIL_TYPES`: generuje `messageId`, sprawdza aktywną zgodę odbiorcy w `user_consent`, **wstawia wiersz `email_message` przed wysyłką** (z `tracked` zgodnie ze zgodą), dodaje tag Resend `message_id` i dopisuje UTM do linków na naszą domenę (w HTML i w tekście). Tylko przy aktywnej zgodzie dodatkowo przepisuje linki HTML na trasę kliknięcia (UTM w adresie docelowym) i dopisuje pikselkę. Po sukcesie dopisuje `resend_email_id`, po porażce wysyłki usuwa wiersz. Błąd zapisu lub sprawdzenia zgody oznacza wysyłkę w wariancie nieśledzonym (AC-16). W części tekstowej kliknięć nie liczymy. Bez `tracking` funkcja działa dokładnie jak dziś. Nadawcy w `large-order-producer.ts` przekazują `recipientUserId`, więc zapytania `getProducerRecipientsForLargeOrder` i pokrewne zwracają też id użytkownika. Linki w mailu zawsze wskazują adres produkcyjny.

**API surface**:

| Trasa | Metoda | Wejście | Wynik | Auth | Błędy |
|---|---|---|---|---|---|
| `/api/email/o/[id]` | GET | uuid maila | gif 1x1, `Cache-Control: no-store` | brak | zawsze 200 |
| `/api/email/c/[id]` | GET | `u` (adres), `s` (podpis HMAC id+adres) | 302 na `u` | brak | 400 przy złym podpisie lub obcej domenie |
| `/api/webhooks/resend` | POST | ciało Svix z nagłówkami podpisu, tag `message_id` | 200 | podpis Svix na `await request.text()` (`RESEND_WEBHOOK_SECRET`) | 401 zły podpis, 200 gdy brak tagu, 503 gdy tag jest, a wiersza nie ma (Resend ponowi) |
| `/api/cron/email-events-retention` | GET | nagłówek `Bearer CRON_SECRET` | liczba usuniętych wierszy | `CRON_SECRET` | 401 |
| akcja serwerowa ustawień producenta | POST | udziel lub wycofaj zgodę | nowy stan zgody | sesja użytkownika producenta (tylko własna zgoda) | 401, 403 |
| `/ingest/*` | * | zdarzenia posthog-js | przekierowanie na PostHog EU | brak | n/d |

`/ingest` to dwa wpisy `rewrites` w `next.config.ts`, nie funkcja: `/ingest/static/*` na hosta zasobów PostHog EU, reszta na `eu.i.posthog.com`. Potrzebne jest też `skipTrailingSlashRedirect: true`. Ścieżka `/ingest/e/` nie ma kropki, więc bez wyłączenia z matchera `proxy.ts` next intl przekierowałby ją na `/pl/ingest/e`. Trasy `/api/*` są już poza matcherem. Przy budowie sprawdzić, że PostHog dostaje IP odwiedzającego, nie IP Vercela.

**Zapisy atomowe**: sterownik Neon HTTP nie ma interaktywnych transakcji, więc wstawienie `email_event` i podbicie liczników w `email_message` to jedno zapytanie z CTE (`insert ... returning`, potem `update` z `coalesce(first_clicked_at, now())`). Zapis jest pomijany, gdy zgoda odbiorcy jest nieaktywna (AC-20).

**Podpisy**: HMAC kliknięcia liczony na znormalizowanym `URL.href`, porównanie `timingSafeEqual`, host równy hostowi z `getSiteUrl()` (z uwzględnieniem www i apex). Svix na surowym tekście ciała, z domyślną tolerancją znacznika czasu.

**Odczyt w panelu**: rozszerzenie istniejącego `lib/observability/posthog-metrics.ts` (zapytania HogQL: goście, sesje, średni czas z tabeli sesji, trend, strony, wejścia, wyjścia, ranking po `producer_id`) i nowe `lib/analytics/email-stats.ts` (agregaty z `email_message`, wskaźniki otwarć i kliknięć liczone tylko po `tracked = true`). Nazwy producentów dołączamy z Neon po `producer_id`. Wyniki PostHog cache'ujemy około 15 minut przy użyciu konwencji cache'owania obowiązującej w projekcie po spec 0078 (przed pisaniem sprawdzić `node_modules/next/dist/docs/`).

**Key invariants**:
- Bez zgody analityka niczego nie ładuje, nie wysyła ani nie zapisuje (poza samą decyzją o zgodzie).
- Śledzenie otwarć i kliknięć w mailu istnieje tylko dla odbiorcy z aktywną zgodą w chwili wysyłki, a zdarzenia są zapisywane tylko dopóki zgoda trwa.
- Przeglądarka nigdy nie importuje `posthog-js` poza `lib/observability/` (reguła ESLint z spec 0021 zostaje bez wyjątków).
- `/ingest` jest wyłączone z matchera `proxy.ts`. Zawężanie matchera w spec 0078 musi to zachować.
- Maile spoza listy `TRACKED_EMAIL_TYPES` są bez zmian, szczególnie `login_link`.
- Żaden adres e-mail odbiorcy nie trafia do `email_message`, `email_event`, `user_consent`, właściwości PostHog ani logów.
- Podpis kliknięcia obejmuje id maila i adres docelowy, a host adresu musi równać się `getSiteUrl()`.

**Security model**: Widok `/internal/analytics` tylko dla roli `admin`, ta sama inline bramka sesji co inne ekrany `/internal` (kopia, nie wspólny layout). Webhook uwierzytelnia się podpisem Svix. Trasy pikselki i kliknięcia są publiczne z założenia, ale nie ujawniają danych i zmieniają tylko liczniki. Użytkownik producenta zmienia wyłącznie własną zgodę. Zakres zgodności: RODO i przepis o prywatności łączności elektronicznej (art. 5 ust. 3 dyrektywy ePrivacy, w Polsce art. 399 Prawa komunikacji elektronicznej). Zgoda na maile musi być dobrowolna, konkretna, informowana, oddzielona od regulaminu i odwoływalna (stąd AC-18 do AC-20); wytyczne EDPB 2/2023 obejmują piksele i linki śledzące w mailach.

**Configuration required**:
- `EMAIL_TRACKING_SECRET`: klucz HMAC do podpisu linków kliknięcia (Production i Preview)
- `RESEND_WEBHOOK_SECRET`: sekret podpisu webhooka Resend (Production i Preview)
- `NEXT_PUBLIC_ANALYTICS_FORCE`: tylko do testów E2E, wymusza włączenie trackera poza produkcją
- `EMAIL_TRACKING_CONSENT_VERSION`: stała w kodzie (nie zmienna środowiskowa), numer wersji tekstu zgody zapisywany w `user_consent`
- Już istnieją i są używane: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `POSTHOG_PERSONAL_API_KEY`, `CRON_SECRET`
- `vercel.json`: nowy wpis cron `email-events-retention` raz w tygodniu
- W panelu Resend: dodać webhook na `/api/webhooks/resend` dla zdarzeń `email.delivered`, `email.bounced`, `email.complained`. Śledzenie otwarć i kliknięć Resend zostaje wyłączone.
- Zależności: pakiety `svix` i `posthog-js`

**Critical test scenarios**:
- Happy path ruchu: po akceptacji wejście na `/pl/sauna/x` wysyła jeden `$pageview` z `producer_id`, `verifies AC-1, AC-6`
- Brak pomiaru bez zgody: bez decyzji i po odmowie nie ma żądań do `/ingest` ani do PostHog, `posthog-js` nie jest pobrany, a cookies, localStorage i sessionStorage zawierają co najwyżej decyzję o zgodzie, `verifies AC-2`
- Wycofanie zgody zatrzymuje wysyłkę natychmiast, `verifies AC-3`
- Nawigacja w aplikacji: przejście z produktu A do produktu B daje dokładnie dwa pageview, każdy z właściwym `producer_id`; zdarzenia przechwytuje `page.route("**/ingest/**")`, `verifies AC-1, AC-6`
- Baner: nowy odwiedzający widzi baner w czterech językach, obie decyzje działają i można je zmienić ze stopki, `verifies AC-3`
- Matcher: żądanie `/ingest/e/` nie uruchamia `proxy.ts`, `verifies AC-4`
- Pominięte obszary: `/pl/internal`, `/pl/panel`, `/pl/producer/panel` i środowisko nie produkcyjne nie wysyłają zdarzeń, `verifies AC-5`
- Mail do zgodzonego odbiorcy: HTML ma pikselkę i przepisane linki z UTM, wiersz ma `tracked = true`; mail do odbiorcy bez zgody nie ma pikselki ani przepisanych linków, ale ma UTM, `verifies AC-13, AC-20`
- Test migawkowy: HTML i tekst `login_link` oraz jednego maila do klienta bez zmian, `verifies AC-13`
- Webhook: zły podpis daje 401, to samo zdarzenie dwa razy zmienia stan raz, nieznany mail z tagiem daje 503, `verifies AC-14`
- Webhook dla obcego maila: zdarzenie `delivered` dla maila z `login_link` (brak tagu) zwraca 200 bez zmian w bazie, `verifies AC-14`
- Schemat: `email_message`, `email_event` i `user_consent` nie mają kolumny z adresem e-mail, `verifies AC-15`
- Awaria: zapis wiersza lub sprawdzenie zgody rzuca błąd, mail i tak wychodzi w wariancie nieśledzonym, błąd trafia do Sentry, `verifies AC-16`
- Rejestracja: pole zgody jest niezaznaczone, konto zakłada się bez zaznaczenia, zaznaczenie tworzy wiersz `user_consent` z wersją tekstu, `verifies AC-18`
- Ustawienia: udzielenie i wycofanie zgody zmienia stan, wycofanie ustawia `withdrawn_at`, użytkownik nie może zmienić cudzej zgody, `verifies AC-19`
- Wycofanie po wysyłce: otwarcie i kliknięcie z maila, którego odbiorca wycofał zgodę, nie zapisuje zdarzenia, a link nadal przekierowuje, `verifies AC-20`
- Otwarty redirect: kliknięcie z podmienionym adresem lub obcą domeną nie przekierowuje; pikselka dla nieznanego id zwraca gif, `verifies AC-21`
- Automat: otwarcie 2 sekundy po wysyłce dostaje `likely_automatic` i nie podbija `open_count`; skaner klikający wszystkie linki w kilka sekund jest oznaczony, a link działa, `verifies AC-22`
- Retencja: wiersz `email_event` sprzed 14 miesięcy znika, `email_message` zostaje, `verifies AC-23`
- Niezależność źródeł: PostHog zwraca błąd, widok Maile renderuje się, widoki ruchu pokazują "niedostępne", `verifies AC-11`
- Kafelek na dashboardzie pokazuje liczbę z PostHog i linkuje do `/internal/analytics`, `verifies AC-12`
- Widoki: Ruch mówi o zgodzie; Strony pokazują top, wejścia i wyjścia; Producenci pokazują ranking i szczegół; Maile pokazują kolumny z AC-10 wraz z udziałem śledzonych, `verifies AC-7, AC-8, AC-9, AC-10`
- Uprawnienia: użytkownik bez roli `admin` na `/internal/analytics` jest przekierowany, `verifies AC-7`
- Polityka prywatności zawiera sekcje o ruchu, o dzienniku maili i o dobrowolnym śledzeniu maili we wszystkich czterech językach, `verifies AC-17`

## Build plan

Podejście projektu to Tracer Bullet, więc najpierw cienka nitka przez wszystkie warstwy, potem pogrubianie. Trzy etapy dostawy, każdy użyteczny sam.

**Etap 1: ruch**

1. Nitka: instalacja `posthog-js`, moduł kliencki w `lib/observability/` ładowany przez `import()` dopiero po akceptacji, minimalny baner i zapis decyzji, komponent trackera w layoucie `(customer)` wysyłający `$pageview`, `rewrites` `/ingest` w `next.config.ts`, wyłączenie `/ingest` z matchera `proxy.ts` z testem, `skipTrailingSlashRedirect`, funkcja `isAnalyticsEnabled()` i zmienna `NEXT_PUBLIC_ANALYTICS_FORCE`, tracker w `<Suspense>`, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**
2. Baner zgody w pełnej wersji (teksty w czterech językach w `messages/*.json`, równorzędne przyciski, zmiana i wycofanie decyzji ze stopki), satisfies **AC-3**
3. Atrybucja do producenta: komponent przekazujący `producer_id`, `product_id`, `family`, `page_type` dołączony do stron `project`, `sauna`, `outdoor-tv`, `modularprojects` i `producers/[id]`, satisfies **AC-6**
4. Zapytania HogQL w `posthog-metrics.ts` i strona `/internal/analytics` z widokami Ruch i Strony, wpis w `InternalSidebar`, wybór zakresu, niezależny błąd źródła, satisfies **AC-7**, **AC-8**, **AC-11**
5. Widok Producenci (ruch) i podmiana kafelka na dashboardzie, satisfies **AC-9**, **AC-12**
6. Aktualizacja polityki prywatności w czterech językach (część o ruchu), satisfies **AC-17**

**Etap 2: dziennik maili do producentów (bez śledzenia)**

7. Migracja: tabele `email_message` (z kolumnami śledzenia, na razie nieużywanymi), indeksy (migrację zweryfikować na jednorazowej gałęzi Neon, `db:migrate` na dev), satisfies **AC-15**
8. `sendNotificationEmail()` z `tracking`, lista `TRACKED_EMAIL_TYPES`, wstawienie wiersza przed wysyłką, tag Resend `message_id`, UTM w linkach do naszej domeny, dopisanie `resend_email_id` lub usunięcie wiersza po porażce, przekazanie `recipientUserId` przez nadawców w `large-order-producer.ts`, test migawkowy maili bez śledzenia, satisfies **AC-13**, **AC-16**
9. Webhook `/api/webhooks/resend` z weryfikacją Svix na surowym ciele, ignorowaniem zdarzeń bez tagu `message_id` i idempotencją, konfiguracja webhooka w Resend, satisfies **AC-14**
10. Agregaty `email-stats.ts`, widok Maile (dostarczalność) i statystyki maili w szczególe producenta, satisfies **AC-10**, **AC-9**

**Etap 3: śledzenie otwarć i kliknięć za zgodą użytkownika producenta** (po opinii prawnika o tekście zgody, patrz Follow-up)

11. Migracja: `user_consent`, `email_event`, enumy, częściowy indeks unikalny aktywnej zgody, satisfies **AC-15**
12. Pole zgody w formularzu rejestracji producenta (niezaznaczone, osobne od regulaminu, teksty w czterech językach) i zapis w `user_consent` z wersją tekstu, satisfies **AC-18**
13. Przełącznik zgody w ustawieniach panelu producenta (udziel, wycofaj, stan; skoordynować z redesignem ustawień w spec 0074), satisfies **AC-19**
14. Wariant śledzony w `sendNotificationEmail()`: sprawdzenie zgody, pikselka, przepisanie linków, `tracked = true`, satisfies **AC-13**, **AC-20**
15. Trasy `/api/email/o/[id]` i `/api/email/c/[id]` z podpisem HMAC, listą dozwolonych hostów, sprawdzeniem aktywnej zgody, atomowym zapisem zdarzenia i regułą `likely_automatic`, satisfies **AC-20**, **AC-21**, **AC-22**
16. Rozszerzenie widoku Maile o kliknięcia, otwarcia i udział maili śledzonych, satisfies **AC-10**
17. Cron retencji `email-events-retention` i wpis w `vercel.json`, satisfies **AC-23**
18. Aktualizacja polityki prywatności o dobrowolne śledzenie maili i sposób wycofania zgody, satisfies **AC-17**

Przed wejściem etapów 1 i 3 na produkcję: opinia prawnika (patrz Follow-up).

Widok statystyk dla samego producenta (etap 4) jest poza tą specyfikacją. Model danych jest już gotowy, bo wszystko ma `producer_id`.

## Consequences

**Positive**:
- Po raz pierwszy mamy prawdziwe liczby ruchu, czasu i stron, a kafelek na dashboardzie przestaje kłamać zerem.
- Ruch i skuteczność maili są policzone na producenta, więc rozmowa z producentem może opierać się na liczbach.
- Zgodność opiera się na dwóch jawnych zgodach (baner dla gości, pole przy rejestracji dla producentów), obie zapisane i odwoływalne, więc obronna w razie pytań.
- Maile klientów i link logowania pozostają nietknięte.

**Negative / tradeoffs**:
- Liczby ruchu obejmują tylko odwiedzających, którzy kliknęli "Akceptuję", więc są wyraźnie niższe niż prawdziwy ruch. Służą do trendów i porównań, nie do bezwzględnej liczby gości.
- Open rate i kliknięcia dotyczą tylko zgodzonych użytkowników producentów (dobrowolne, niezaznaczone domyślnie pole), więc to próbka, nie całość. Widok pokazuje udział maili śledzonych, żeby nie wprowadzać w błąd. Obecni producenci zaczynają bez zgody.
- Własna pikselka i przekierowanie to więcej kodu niż włączenie opcji w Resend, a każde otwarcie i kliknięcie to wywołanie funkcji (niski wolumen).
- Otwarcia są z natury zawyżane (Apple Mail, skanery), więc główną miarą są kliknięcia.
- Zgoda per użytkownik wymaga pola w rejestracji, przełącznika w ustawieniach i zmiany zapytań o odbiorców (więcej dotkniętych miejsc).
- Blokery reklam nadal utną część ruchu mimo `/ingest`; przekierowanie `/ingest` dodaje drobne żądania do limitu Vercel.

**Neutral**:
- Trzy nowe tabele (`user_consent`, `email_message`, `email_event`) i dwa nowe sekrety. Dwie nowe zależności (`posthog-js`, `svix`).
- Spec 0078 zawęża matcher `proxy.ts`, więc kolejność tych zmian trzeba uzgodnić (wymóg z AC-4 obowiązuje w obu). Spec 0074 przebudowuje ustawienia panelu producenta, więc przełącznik zgody trzeba tam wpiąć.
- `user_consent` jest tabelą ogólną (kolumna `kind`), więc kolejne zgody dopisują się bez nowej tabeli.

## Follow-up

- [ ] Opinia prawnika przed produkcją: treść banera, treść zgody na śledzenie maili (dobrowolność, konkretność, oddzielenie od regulaminu), polityka prywatności oraz czy dziennik maili bez danych osobowych nie wymaga zgody
- [ ] Zachęta do zgody bez wymuszania: jak zachęcić producentów (wyjaśnienie wartości, np. "wiemy, czy widzisz zapytania") bez łączenia zgody z dostępem do usługi, bo to unieważnia zgodę
- [ ] Zaproszeni członkowie firmy (spec 0057): czy pokazać pole zgody przy przyjęciu zaproszenia, a nie tylko w ustawieniach
- [ ] Anonimowy pomiar ruchu przed zgodą jako opcja: dziś bez oparcia w żadnym oficjalnym polskim stanowisku. Wrócić do tematu, jeśli UODO lub UKE zajmą stanowisko albo prawnik uzna wyjątek w stylu CNIL
- [ ] Etap 4: widok statystyk w panelu producenta (jego wyświetlenia, jego maile), decyzja osobna (powiązane z "Statystyki/analityka dla producenta" w scope produkcji)
- [ ] Rozszerzyć śledzenie maili na klientów, gdy pojawi się taka potrzeba (osobna zgoda w rejestracji klienta, link logowania zostaje bez zmian)
- [ ] Wyłączyć z liczb ruch zespołu na stronie publicznej (np. znacznik wewnętrzny po zalogowaniu admina), bo dziś admin przeglądający portal po zgodzie liczy się jako gość
- [ ] Wyłączyć z ruchu odwiedziny producenta na własnych stronach, gdy będzie zalogowany i zgoda pozwoli go rozpoznać
- [ ] Spec 0021 AC-7 (runbook usuwania danych) nadal otwarty. Po zgodzie identyfikator jest trwały, więc runbook usuwania historii w PostHog warto dokończyć
- [ ] Rozbicie ruchu na kraj i język w panelu (PostHog daje kraj z IP), poza zakresem tej specyfikacji
- [ ] Po wdrożeniu etapu 1 zmierzyć 2 do 3 dni zużycie Vercel (Edge Requests) i potwierdzić, że `/ingest` nie uruchamia funkcji ani `proxy.ts`
- [ ] Dodać `lib/analytics/AGENTS.md` (konwencje) i wpis w głównym `AGENTS.md`, `lib/observability/AGENTS.md` i `lib/notifications/AGENTS.md` o nowych elementach. To robi `/sync`
