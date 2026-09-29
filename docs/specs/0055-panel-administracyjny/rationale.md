# 0055. Panel administracyjny — uzasadnienie

## Context

> ⚠️ Premise note: pierwotny pomysł ("centrum dowodzenia") obejmował co najmniej sześć osobnych obszarów: wspólną nawigację, dashboard z KPI, moderację producentów i projektów, monitoring błędów i zdrowia systemu, zarządzanie użytkownikami/rolami z audit logiem oraz twardsze zabezpieczenia (2FA). To więcej niż jedna decyzja projektowa. W rozmowie inżynier zawęził zakres tej konkretnej specyfikacji do trzech modułów (wspólna nawigacja i dashboard, moderacja producentów i projektów/zapytań, monitoring), a zarządzanie użytkownikami/rolami, pełny audit log i 2FA świadomie odłożył na osobną, przyszłą funkcję. Ta spec obejmuje wyłącznie te trzy moduły.

Dziś panel wewnętrzny (`app/[locale]/internal/`) to cztery osobne, niepołączone ekrany: `cases` (sprawy w zarządzanym przepływie doradczym, spec 0048), `inquiries` (dawne zapytania bezpośrednie, spec 0023), `products` (zarządzanie zdjęciami produktów, spec 0031) i `notifications` (podgląd szablonów e mail, spec 0051). Każdy sprawdza sesję i rolę osobno w swoim `page.tsx`, wspólny jest tylko cienki pasek z przyciskiem wylogowania (`internal/layout.tsx`). Nie ma strony startowej, nie ma dashboardu, nie ma widoku "czy wszystko działa". To dokładnie sytuacja, którą scope feature 18 ("Panel administracyjny", Slice 10, `docs/scope/produkcja.md`) już nazywa: "prosty widok wewnętrzny wystarczy, pełny panel admina to osobna, późniejsza funkcja".

Z panelu korzysta dziś inżynier prowadzący projekt, a docelowo także szef (osoba bez technicznego zaplecia), więc czytelność i spójność nawigacji mają realną wagę, nie tylko estetyczną. Panel dotyka danych osobowych klientów i producentów (e mail, telefon, NIP, adresy), więc obowiązuje zakres RODO: dostęp musi pozostać ograniczony do roli `admin`, a każda zmiana danych (blokada producenta) musi być możliwa do prześledzenia choćby w minimalnym zakresie (kto, kiedy, ewentualnie dlaczego), nawet bez pełnego audit logu, który jest świadomie odłożony na później (patrz Follow-up w `index.md`).

Obserwowalność produkcyjna (spec 0021) już istnieje: błędy trafiają do Sentry, zdarzenia biznesowe do PostHog, oba przez jedno sankcjonowane opakowanie w `lib/observability/`. Ta spec nie buduje monitoringu od zera, tylko dodaje ekran w panelu, który czyta te już istniejące źródła.

Epika Produkcja (do której należy funkcja 18) ma domyślne podejście budowy Tracer Bullet: najpierw jeden prawdziwy, kompletny wątek przez wszystkie warstwy, dopiero potem pogrubianie. Ta spec nie ma własnego nadpisania w wierszu scope, więc dziedziczy to podejście, w przeciwieństwie do ogólnego podejścia Facade opisanego w root `AGENTS.md`, które dotyczy epiki Prototyp, nie Produkcji.

## Options considered

### Option 1: Trzy osobne, mniejsze specyfikacje (jedna na moduł)

Osobna spec dla nawigacji/dashboardu, osobna dla moderacji, osobna dla monitoringu.

**Pros**:
- Każda spec mniejsza, łatwiejsza do przejrzenia w izolacji
- Można budować i wdrażać moduły w pełni niezależnie, bez czekania na resztę

**Cons**:
- Moduły dzielą tę samą powłokę (nawigacja, tryb ciemny, wzorzec autoryzacji) i tę samą migrację (`blocked_at`/`blocked_by`/`blocked_reason` jest potrzebna dopiero w module moderacji, ale koncepcyjnie należy do jednego, spójnego panelu), więc rozbicie na trzy specyfikacje rozmywa wspólny kontrakt (jedna nawigacja, jeden motyw) na trzy osobne dokumenty, które łatwo rozjadą się w szczegółach
- Scope feature 18 to jedna pozycja w `docs/scope/produkcja.md`; trzy specyfikacje pod jedną funkcją scope komplikują śledzenie postępu bez realnej korzyści na tym etapie (moduły nie są na tyle duże, by uzasadnić osobne umbrella dzieci)

### Option 2: Jedna spec obejmująca wszystkie trzy moduły (wybrana)

Jedna spec w kształcie katalogu (`index.md` + `rationale.md`), opisująca wspólną powłokę, dashboard, moderację i monitoring jako jeden spójny build plan, uporządkowany metodą Tracer Bullet.

**Pros**:
- Jeden spójny kontrakt na nawigację, tryb ciemny i wzorzec autoryzacji, który wszystkie trzy moduły dzielą; brak ryzyka rozjazdu między dokumentami
- Odpowiada zakresowi już zapisanemu jako jedna funkcja scope (18)
- Build plan może naturalnie odzwierciedlać Tracer Bullet (jeden prawdziwy wątek przez powłokę i dashboard, potem pogrubienie o moderację i monitoring), co przy trzech osobnych specyfikacjach byłoby sztucznie porozcinane

**Cons**:
- Spec jest dłuższa i ma więcej ruchomych części niż typowa spec jednego ekranu; wymaga zdyscyplinowanego, punktowego czytania (build plan jako lista zadań, nie proza) żeby zostać czytelna

## Rationale

Wybrano Option 2, bo trzy moduły nie są niezależnymi decyzjami biznesowymi, tylko trzema widokami tej samej powłoki (ta sama nawigacja, ten sam wzorzec autoryzacji admina, ten sam tryb ciemny), a scope już traktuje "Panel administracyjny" jako jedną funkcję (18). Rozbicie na trzy specyfikacje kosztowałoby spójność bez realnej korzyści na tym etapie skali (mała liczba adminów, umiarkowana liczba ekranów). Kształt katalogu (`index.md` + `rationale.md`) został wybrany zamiast pojedynczego pliku, bo decyzja jest wystarczająco ciężka (nowa migracja, dwie nowe integracje zewnętrzne w czasie działania aplikacji czyli odczyt Sentry i odczyt PostHog, dwanaście zadań budowy), by trzymanie pełnego uzasadnienia poza plikiem, który czyta `/develop`, realnie oszczędzało kontekst przy budowie.

## Evidence: stan dzisiejszego kodu

- `app/[locale]/internal/layout.tsx`: dziś tylko pasek z przyciskiem wylogowania, żadnej nawigacji między ekranami (komentarz w pliku wprost odsyła do "pełny panel to późniejsza funkcja, scope feature 18")
- `app/[locale]/internal/products/AGENTS.md`: udokumentowany wzorzec autoryzacji (`auth()` w Server Component, przekierowanie na login przy braku sesji, przekierowanie do strony klienta przy złej roli) — ten sam wzorzec ma być powielony dla nowych ekranów, zgodnie z jego własną instrukcją "repeat this exact pattern for any future /internal/* screen"
- `auth.ts`: `session: { strategy: "database" }` — sesja jest już odczytywana z bazy przy każdym `auth()`, więc sprawdzenie `blocked_at` w `session` callbacku jest naturalnym rozszerzeniem istniejącego mechanizmu, nie nowym
- `lib/db/schema.ts`, tabela `users`: ma już `role`, `deletedAt` (miękkie usunięcie konta, inny cel niż blokada moderacyjna), brak jakiegokolwiek pola blokady
- `lib/observability/AGENTS.md`: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` już skonfigurowane (dziś używane do wgrywania sourcemap przy buildzie); do odczytu listy błędów przez Sentry REST API może być potrzebny szerszy zakres uprawnień tokena (odczyt: `project:read`, `event:read`) — do zweryfikowania przy wdrożeniu, patrz Follow-up
- `components/ui/ThemeProvider.tsx`: mechanizm trybu ciemnego już obsługuje wiele niezależnych zakresów przez `scopeClassName` (`theme-klient` ze spec 0043, `theme-producer` ze spec 0046); dodanie trzeciego zakresu (`theme-internal`) jest rozszerzeniem tego samego wzorca, nie nowym mechanizmem
- `package.json`: brak jakiejkolwiek biblioteki do wykresów
- `lib/db/queries.ts`: istniejący wzorzec nazewnictwa `xxxForAdmin` (np. `getAllProductsForAdmin`, `getOffersByInquiryIdForAdmin`) do powielenia dla nowych zapytań administracyjnych
