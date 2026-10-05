# 0066. Zapytanie o ofertę bez logowania: uzasadnienie

Plik z reasoningiem do [index.md](index.md). Czytany przez ludzi i przez `/architect` przy aktualizacji, nie podczas budowy.

## Context

Dziś ścieżka zapytania wymaga konta. Na `app/[locale]/(customer)/inquiry/page.tsx` brak sesji kończy się przekierowaniem do `/login` z powrotem na ten sam adres (spec 0023 AC-5), a `submitAdvisoryInquiry` w `lib/case-actions.ts` zwraca błąd bez sesji roli `client`. Baza wymusza to samo: `inquiry.client_id` jest `NOT NULL`. Konto powstaje przez rejestrację z linkiem magicznym (`lib/auth-registration.ts`, tabela `pending_registration`, tworzenie `users` i `client` dopiero przy pierwszym logowaniu w `auth.ts`).

Skutek: osoba, która chciała zostawić kontakt, musi przejść rejestrację i kliknąć link w mailu, zanim cokolwiek wyśle. Wiele osób odpada po drodze, a my nie mamy nawet ich e maila, żeby do nich wrócić.

Siły w grze:
- Silnik spraw (spec 0048) wylicza aktora wyłącznie z sesji (`lib/cases/actor.ts`), a dostęp do sprawy decyduje jedna funkcja `evaluateCaseAccess`. Gość bez konta nie ma więc jak pisać w czacie bez nowego mechanizmu dostępu.
- Powiadomienia (`lib/cases/notify.ts`) łączą sprawę z `client` przez `innerJoin`, więc sprawa bez klienta nie ma dziś adresata.
- W repo jest precedens dla zapytań bez konta: B2B (spec 0037) zapisuje migawkę kontaktu, a `linkRequestsToClientOnLogin` dowiązuje zapytania po e mailu przy logowaniu.
- Nie ma żadnego limitera zapytań ani Redisa. Projekt jest mały i unika nowych usług (Neon, Vercel, Resend, R2 już wystarczają).
- Dane osobowe (e mail, telefon, adres działki) będą zbierane od osób bez konta.

Brak decyzji oznacza dalsze gubienie kontaktów na bramce logowania.

## Options considered

### Option 1: Sprawa gościa bez konta, konto proponowane po wysłaniu

Sprawa powstaje od razu z migawką kontaktu i `client_id` NULL. Po wysłaniu pokazujemy przycisk założenia konta (i ten sam w mailu). Konto powstaje na kliknięcie, a sprawa dowiązuje się po e mailu przy logowaniu linkiem.

**Pros**:
- Dokładnie to, o co prosi właściciel produktu: najpierw e mail, potem propozycja konta.
- Nie powstają konta, których nikt nie chciał.
- Kontakt zostaje w bazie nawet przy odrzuceniu konta.
- Reużywa `pending_registration`, link magiczny i wzorzec z B2B.

**Cons**:
- Łamie niezmiennik „każda sprawa ma klienta" z 0023, więc odczyty trzeba przejrzeć.
- Gość nie rozmawia w aplikacji, dopóki nie założy konta.
- Niezweryfikowany e mail wymaga ochrony przed nadużyciem (limit, znacznik).

### Option 2: Ciche konto przy wysyłce

Przy wysyłce od razu tworzymy `users` i `client` i wysyłamy link magiczny jako potwierdzenie.

**Pros**:
- Silnik spraw działa bez zmian, bo sprawa zawsze ma klienta.
- Panel i czat są gotowe po jednym kliknięciu w mail.

**Cons**:
- Zakładamy konto bez zgody gościa, co jest sprzeczne z „potem zaproponować założenie konta".
- Każdy może założyć konto na cudzy e mail. Zaprzecza to decyzji z 0023, żeby formularz niczego trwałego nie rezerwował (`pending_registration`).
- Konta porzucone liczą się w metrykach i bazie.

### Option 3: Sprawa wstrzymana do kliknięcia w mail

Zapytanie leży jako szkic, a doradca widzi je dopiero po potwierdzeniu e maila.

**Pros**:
- Pewny, zweryfikowany e mail.
- Najmniej spamu u doradcy.

**Cons**:
- Część osób nie kliknie w link, a ich lead przepada. To odwrotność celu zmiany.
- Opóźnia reakcję doradcy.

### Option 4: Jeden mail z linkiem magicznym zamiast osobnego przycisku

Przy wysyłce zapisujemy `pending_registration` i wysyłamy jeden mail: link magiczny Auth.js ubrany jako „zapytanie przyjęte, kliknij, aby śledzić sprawę". Znika strona claim, akcja `requestAccountForGuestCase`, limit tokenów i drugi mail.

**Pros**:
- Mniej kodu i mniej powierzchni nadużyć, nie łamie niezmiennika (`pending_registration` to nie `users`).

**Cons**:
- Wysyła link logowania do każdego bez żadnego kroku „zaproponuj konto", czyli ekran potwierdzenia nie może go zaoferować jako wyboru.
- Podczepia wstępnie wypełnione dane konta do e maila, którego nikt nie potwierdził, już przy wysyłce, a nie na kliknięcie.

Odrzucona, bo właściciel produktu chce jawnego kroku „najpierw wyślij, potem zaproponuj konto". Przegląd wskazał tę opcję jako prostszą, więc warto do niej wrócić, jeśli koszt claim okaże się za duży.

## Rationale

Opcja 1 jest jedyną, która spełnia kolejność, o którą prosi właściciel produktu (najpierw e mail, potem konto), bez zakładania kont na cudze adresy (Opcja 2) i bez gubienia leadów na weryfikacji (Opcja 3). Koszt, czyli sprawy bez klienta, jest ograniczony do znanych miejsc w kodzie: `notify.ts`, `queries.ts` i widoki doradcy. Repo ma już sprawdzony wzorzec dowiązania po e mailu (spec 0037 AC-7), więc nie wymyślamy nowego mechanizmu.

Czat dopiero po założeniu konta wynika z modelu dostępu w 0048: dostęp opiera się na sesji, a tokenowy link do sprawy bez konta byłby osobnym, dużym mechanizmem (tokeny, wygasanie, wyciek linku). Doradca pisze do gościa mailem z linkiem, co rozwiązuje komunikację bez rozszerzania modelu dostępu.

Limit w bazie (3 sprawy na e mail na dobę) i pole pułapka wybrano zamiast Upstash Redis i Cloudflare Turnstile, bo nie ma jeszcze danych o nadużyciach, a każda nowa usługa to klucze, koszt i kolejna rzecz do utrzymania. Limit po IP pominięto celowo, żeby nie trzymać dodatkowych danych osobowych. Do rewizji po pierwszym spamie (Follow up).

Właściciel produktu wybrał przypięcie sprawy od razu do istniejącego konta po samym e mailu, mimo że rekomendowałem wariant z oznaczeniem lub dowiązaniem dopiero po logowaniu. Wybrany wariant jest świadomie przyjętym ryzykiem: obca osoba może podrzucić sprawę z własną treścią na cudze konto. Zostało to złagodzone mailem „czy to Ty? Jeśli tak, nic nie rób, jeśli nie, odpowiedz", z Reply-To na zespół, oraz tym, że szkoda jest niewielka (sprawa jest widoczna tylko właścicielowi i doradcy, nie daje dostępu do niczego poza samą sprawą). Ekran gościa jest identyczny dla nowego i istniejącego e maila, więc ta ścieżka nie ujawnia, które adresy mają konto.
