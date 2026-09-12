# 0036. Anglojęzyczne adresy URL i strona główna klienta bez segmentu klient

**Date**: 2026-09-12
**Status**: In Progress

## Summary

Adresy platformy są dziś w całości po polsku (klient, producent, wyniki, zapytanie i tak dalej), mimo że treść jest już dostępna po angielsku i niderlandzku dzięki next intl (spec 0028). Ta decyzja zmienia wszystkie segmenty adresów na angielskie i przenosi stronę główną klienta z `/klient` na sam adres główny danego języka (na przykład `/en` zamiast `/en/klient`), bo klient jest głównym odbiorcą tej międzynarodowej platformy. Producent i panel administracyjny zachowują własny, rozróżniający prefiks (`/producer`, `/internal`). Każdy stary adres trwale przekierowuje na nowy, żeby nie zepsuć już zaindeksowanych stron ani zapisanych linków.

## Context

Zobacz `rationale.md`.

## Requirements

**User stories**:
- Jako odwiedzający z zagranicy, chcę widzieć angielskie lub niderlandzkie słowa w adresie strony, którą przeglądam w tym języku, a nie polski segment ścieżki, żeby adres pasował do treści i wyglądał na przygotowany do rynku międzynarodowego.
- Jako odwiedzający wchodzący na stronę główną, chcę trafić od razu pod czysty adres języka, bez dodatkowego segmentu typu klient, tak jak to zwykle wygląda na międzynarodowych platformach kupujący sprzedający (kupujący pod czystym adresem, sprzedawca pod osobnym prefiksem).
- Jako producent lub administrator korzystający dziś z realnego backendu (spec 0032, 0033), chcę żeby moje zapisane lub udostępnione linki dalej działały po zmianie adresów, zamiast pokazać błąd nieznaleziono strony.
- Jako wyszukiwarka odwiedzająca stronę szczegółów projektu (jedyna strona z tagami hreflang dziś, spec 0028), chcę, żeby stary, już zaindeksowany adres trwale przekierował na nowy, żebym nie straciła śladu tej strony w wynikach wyszukiwania.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: Każda dzisiejsza trasa klienta (strona główna, wyniki, zapytanie, działka, projekt, realizacja, rejestracja, panel profilu, panel ulubionych, panel zapytań, logowanie) jest dostępna pod nowym adresem bez segmentu klient ani jego angielskiego odpowiednika, zgodnie z tabelą tras w `## Decision`, dla każdego z trzech języków (pl, en, nl), z zachowanym prefiksem języka.
- **AC-2**: Strona główna klienta (dzisiejszy `klient/page.tsx`) renderuje się bezpośrednio pod adresem `/[locale]`, bez przekierowania po drodze, z tą samą treścią i sekcjami co dziś (Hero, PopularHomes, ComplianceEngineShowcase, HowItWorksExplainer, CompareHomesTeaser, ProducerShowcase, ClosingCta, Faq, FloatingSearchButton).
- **AC-3**: Wszystkie trasy producenta są dostępne pod nowymi angielskimi segmentami pod prefiksem `/producer`, zgodnie z tabelą tras.
- **AC-4**: Panel administracyjny jest dostępny pod `/internal/inquiries` i `/internal/products` (nowe angielskie segmenty zamiast `zapytania`/`produkty`); treść panelu pozostaje wyłącznie polska, zgodnie z regułą spec 0028 AC1, którą ta decyzja nie zmienia.
- **AC-5**: Każdy stary polski adres z tabeli tras w `## Decision` trwale przekierowuje (kod 308) na swój nowy odpowiednik, zachowując prefiks języka i cały ciąg zapytania (na przykład stare `/pl/klient/wyniki?sizeMin=80` przekierowuje na `/pl/results?sizeMin=80`).
- **AC-6**: Żaden aktywny plik kodu nie zawiera już zaszytego na sztywno starego adresu jako literału ścieżki nawigacyjnej (argument `href`, `redirect(...)`, `router.push(...)`, ręcznie budowany ciąg zaczynający się od `/` odpowiadający wierszowi z tabeli tras); wskazuje nowy adres. To kryterium celowo nie obejmuje nazw folderów komponentów (`@/components/klient/...`), identyfikatorów w kodzie ani treści tłumaczeń, bo te zostają po polsku zgodnie z `## Decision` i nie są literałem ścieżki.
- **AC-7**: `generateMetadata` strony szczegółów projektu (jedyne dzisiejsze miejsce z `alternates.languages`) niesie nowe adresy w tagach hreflang dla pl, en, nl oraz wpis x-default.
- **AC-8**: Testy end to end (Playwright) przechodzą po zmianie, nawigując po nowych adresach; scenariusz przekierowania ze starego adresu na nowy ma własny test.
- **AC-9**: Wspólny układ klienta (nagłówek SiteHeader, RouteShell, SkipLink, dziś w `klient/layout.tsx`) obejmuje stronę główną i wszystkie pozostałe trasy klienta, bez obejmowania producenta ani panelu administracyjnego, które zachowują własne układy.

## Options considered

Zobacz `rationale.md`.

## Decision

**Chosen option**: Option 3: pełny rename segmentów adresów na angielskie, strona główna klienta na poziomie głównym locale przez grupę tras `(customer)`, trwałe przekierowania 308 ze wszystkich starych adresów.

Pełna tabela starego i nowego adresu (prefiks języka pominięty w tabeli, dotyczy jednakowo pl, en, nl):

**Klient** (przenosi się do grupy tras `(customer)`, bez segmentu w adresie):

| Stary adres | Nowy adres |
|---|---|
| `/klient` | `/` |
| `/klient/wyniki` | `/results` |
| `/klient/zapytanie` | `/inquiry` |
| `/klient/dzialka` | `/plot` |
| `/klient/projekt/[id]` | `/project/[id]` |
| `/klient/realizacja` | `/fulfillment` |
| `/klient/rejestracja` | `/registration` |
| `/klient/panel/profil` | `/panel/profile` |
| `/klient/panel/ulubione` | `/panel/favorites` |
| `/klient/panel/zapytania` | `/panel/inquiries` |
| `/klient/panel/zapytania/[id]` | `/panel/inquiries/[id]` |
| `/logowanie` | `/login` (przenosi się do środka grupy `(customer)`, patrz uwaga niżej) |

**Producent** (prefiks zostaje, segmenty po angielsku):

| Stary adres | Nowy adres |
|---|---|
| `/producent` | `/producer` |
| `/producent/rejestracja` | `/producer/registration` |
| `/producent/realizacja` | `/producer/fulfillment` |
| `/producent/realizacje` | `/producer/fulfillments` |
| `/producent/domykanie-luk` | `/producer/gap-closure` |
| `/producent/gotowosc-eksportowa` | `/producer/export-readiness` |
| `/producent/weryfikacja-firmy` | `/producer/company-verification` |
| `/producent/panel` | `/producer/panel` |
| `/producent/panel/projekt` | `/producer/panel/project` |
| `/producent/panel/produkty` | `/producer/panel/products` |
| `/producent/panel/produkty/[id]/edytuj` | `/producer/panel/products/[id]/edit` |
| `/producent/panel/zapytania` | `/producer/panel/inquiries` |
| `/producent/panel/zapytania/[id]` | `/producer/panel/inquiries/[id]` |

**Panel administracyjny** (prefiks `internal` zostaje bez zmian, treść dalej wyłącznie polska):

| Stary adres | Nowy adres |
|---|---|
| `/internal/zapytania` | `/internal/inquiries` |
| `/internal/produkty` | `/internal/products` |
| `/internal/produkty/[id]` | `/internal/products/[id]` |

**Uwaga o `login`**: cross check wykazał, że zostawienie `login` poza grupą `(customer)` (obok niej, na tym samym poziomie adresu co strony wewnątrz grupy) jest dokładnie tym rodzajem kolizji, przed którą chroniła dotychczasowa reguła w `AGENTS.md`; gdyby ktoś kiedyś dodał stronę logowania wewnątrz grupy, dwie równoległe strony rozwiązywałyby się pod tym samym adresem, co Next.js odrzuca jako błąd budowania. Poprawka: `login` przenosi się do środka `(customer)/login/`, tak jak każda inna trasa klienta; to jedyny bezpieczny sposób, żeby uniknąć kolizji, skoro grupa emituje adresy na tym samym poziomie co swoi rodzeństwo poza grupą. Logowanie dostaje przy okazji ten sam nagłówek SiteHeader co reszta ścieżki klienta, czego dziś nie ma.

**Uwaga o przyszłych kolizjach**: przeniesienie klienta na poziom główny nie czyni kolizji niemożliwą raz na zawsze, tylko przenosi obowiązek pilnowania jej z reguły "zawsze osobny segment" na ręczne sprawdzanie każdej nowej trasy dodawanej bezpośrednio pod `app/[locale]/` (poza `producer/` i `internal/`) względem nazw już zajętych przez grupę `(customer)` (`login`, `results`, `inquiry`, `plot`, `project`, `fulfillment`, `registration`, `panel`, strona główna). To świadomy koszt tej decyzji, odnotowany w `## Consequences`, nie zamknięty raz na zawsze fakt.

## Rationale

Zobacz `rationale.md`.

## Feature design

**Data model sketch**: nie dotyczy, ta decyzja nie zmienia żadnej tabeli ani danych, wyłącznie strukturę adresów i folderów tras.

**State transitions**: nie dotyczy.

**API surface** (nie REST, adresy stron i przekierowania): tabela tras w `## Decision` jest pełną powierzchnią zmiany. Przekierowania implementowane są w `proxy.ts` (dzisiejszy middleware next intl już tam mieszka), jako uporządkowana lista pełnych, zakotwiczonych prefiksów ścieżki (nie podmiana pojedynczego słowa gdziekolwiek w adresie), sprawdzana po ustaleniu segmentu języka, zanim żądanie trafi do routera next intl:
- Dopasowanie działa na całej ścieżce po prefiksie języka, od początku, dłuższy prefiks wygrywa przed krótszym (na przykład `/klient/panel/zapytania` dopasowuje się przed samym `/klient/panel`, żeby nie przekierować przez pomyłkę do złego docelowego adresu).
- Dopasowanie nigdy nie podmienia fragmentu wewnątrz wartości dynamicznego segmentu (na przykład identyfikatora projektu), tylko realne, stałe segmenty ścieżki z tabeli tras.
- Bezsegmentowy `/klient` (sam, bez dalszej ścieżki) to przypadek usunięcia segmentu, nie zamiany słowa: przekierowuje na sam prefiks języka bez żadnego dalszego segmentu.
- Każde przekierowanie ustawia jawnie kod 308 (`NextResponse.redirect(url, 308)`), nie domyślny kod biblioteki (307), żeby faktycznie spełnić wymóg trwałego przekierowania z AC-5.
- Dzisiejsze przekierowanie blokady języka panelu administracyjnego w `proxy.ts` (`rest[0] === "internal"`) łączy się w jeden skok z przekierowaniem nowego segmentu, zamiast dwóch kolejnych przekierowań: wejście na `/en/internal/zapytania` trafia od razu na `/pl/internal/inquiries`, nie przez pośredni `/pl/internal/zapytania`.

**Key invariants**:
- Każdy nowy adres klienta (w tym `login`) żyje pod grupą tras `(customer)`, więc nigdy nie niesie żadnego segmentu w adresie ponad prefiks języka.
- Producent i panel administracyjny zawsze niosą swój własny, rozróżniający segment (`producer`, `internal`); to jest to, co czyni bezpiecznym brak segmentu po stronie klienta względem TYCH dwóch obszarów. To nie czyni kolizję niemożliwą na zawsze: każda przyszła trasa dodawana bezpośrednio pod `app/[locale]/` poza `producer/` i `internal/` musi być ręcznie sprawdzona względem nazw zajętych przez grupę `(customer)`, patrz uwaga w `## Decision`.
- Przekierowanie zachowuje zawsze cały ciąg zapytania i prefiks języka; nigdy nie gubi parametrów jak aktywne filtry wyników czy identyfikator NIP producenta w adresie.
- Panel administracyjny pod `/internal/...` pozostaje wyłącznie polski niezależnie od segmentu języka w adresie (reguła z proxy.ts, niezmieniona przez tę decyzję).

**Security model**: brak nowych ról ani uprawnień. Miejsca, które dziś budują docelowy adres po zalogowaniu lub w trakcie sesji (`lib/panel-session.ts`, akcje w `lib/offer-actions.ts`) muszą wskazywać nowe adresy zamiast starych polskich; to zwykła aktualizacja stałych ścieżek, nie zmiana logiki autoryzacji.

**Configuration required**: brak nowych zmiennych środowiskowych ani kluczy.

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Strona główna: wejście na `/en` renderuje bezpośrednio dzisiejszą treść marketingową klienta, bez przekierowania. Weryfikuje **AC-2**.
- Przekierowanie ze starego adresu: wejście na `/pl/klient/wyniki?sizeMin=80` odpowiada 308 na `/pl/results?sizeMin=80`. Weryfikuje **AC-5**.
- Producent: wejście na `/pl/producent/panel/produkty` odpowiada 308 na `/pl/producer/panel/products`. Weryfikuje **AC-3**, **AC-5**.
- Panel administracyjny: wejście na `/en/internal/zapytania` przekierowuje w jednym skoku (nie dwóch) na `/pl/internal/inquiries`, łącząc dzisiejszą blokadę języka z nowym segmentem. Weryfikuje **AC-4**.
- Hreflang: `generateMetadata` dla `/en/project/abc` niesie `alternates.languages` z nowymi adresami pl, en, nl tego samego projektu oraz x-default. Weryfikuje **AC-7**.
- Brak resztek starych adresów: przegląd po całym `app/`, `components/`, `lib/`, `e2e/` po starych literałach ścieżki nawigacyjnej (cytowany ciąg zaczynający się od `/` odpowiadający wierszowi z tabeli tras, w `href`, `redirect(...)`, `router.push(...)` albo budowany ręcznie) zwraca zero trafień poza `docs/specs/**` i `docs/scope/**`; import ścieżek modułów jak `@/components/klient/...` i treść tłumaczeń celowo pozostają poza tym przeglądem. Weryfikuje **AC-6**.
- Wspólny układ: strona główna i strona wyników mają ten sam nagłówek SiteHeader, strona panelu producenta ma ProducerHeader, żadna z tras klienta nie pokazuje przypadkiem nagłówka producenta ani odwrotnie. Weryfikuje **AC-9**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet zapisanym jako domyślne dla epiki Produkcja (dowieźć jeden prawdziwy wątek przez wszystkie warstwy, zanim pogrubimy resztę). Cross check wykazał, że dzielenie samej strony głównej i reszty ścieżki klienta na dwa osobne, oddzielnie wdrażane kroki zostawiłoby martwe okno: reszta tras klienta straciłaby układ (nagłówek) w chwili, gdy `klient/layout.tsx` już się przeniósł, a przekierowanie `/klient` na `/` w tym samym kroku złapałoby też jeszcze nie przeniesione podtrasy jak `/klient/wyniki`, prowadząc do błędu nieznaleziono strony. Dlatego cała ścieżka klienta (strona główna, reszta tras i logowanie) przenosi się w jednym, wewnętrznie kompletnym kroku (może być kilkoma commitami na gałęzi funkcji, ale wdrożenie na produkcję jest jedno, dopiero gdy krok jest kompletny); dopiero potem obszar po obszarze reszta.

1. Utworzenie grupy tras `app/[locale]/(customer)/` i przeniesienie do niej całej dzisiejszej ścieżki klienta naraz: `klient/page.tsx` (strona główna, bez przekierowania, treść renderuje się wprost), `klient/layout.tsx`, oraz wszystkich podtras z nowymi angielskimi segmentami (wyniki, zapytanie, dzialka, projekt, realizacja, rejestracja, panel profil, panel ulubione, panel zapytania) i `logowanie` na `login` (też do środka grupy, patrz uwaga w `## Decision`); aktualizacja wszystkich odwołań `Link`, `redirect`, ręcznie budowanych ścieżek w `components/klient/**`, `lib/data/projects.ts`, `lib/results-filters.ts`, `lib/offer-actions.ts`, `lib/panel-session.ts`, `SiteHeader`, formularzach rejestracji i logowania; usunięcie dzisiejszego redirectu z `app/[locale]/page.tsx`; dodanie w `proxy.ts` całej mapy przekierowań starych adresów klienta i logowania na nowe, zgodnie z zasadą dopasowania zakotwiczonego i najdłuższego prefiksu opisaną w `## Feature design`. Zweryfikowanie że strona główna, reszta tras, wspólny nagłówek i wszystkie przekierowania działają razem, zanim ruszy reszta obszarów, satisfies **AC-1**, **AC-2**, **AC-5**, **AC-6**, **AC-9** (fundament)
2. Przeniesienie tras producenta pod `/producer/*` z nowymi angielskimi segmentami, aktualizacja `components/producent/**`, `lib/db/queries.ts`, `lib/offer-actions.ts`, `lib/panel-session.ts`, dodanie przekierowań, satisfies **AC-3**, **AC-5**, **AC-6**
3. Przeniesienie `internal/zapytania` na `internal/inquiries` i `internal/produkty` na `internal/products`, aktualizacja `lib/db/queries.ts` i komponentów panelu administracyjnego, dodanie przekierowań scalonych w jeden skok z dzisiejszą blokadą języka (patrz `## Feature design`); `internal` sam jako segment zostaje bez zmian, satisfies **AC-4**, **AC-5**, **AC-6**
4. Aktualizacja `generateMetadata` strony szczegółów projektu na nowe adresy w `alternates.languages` i x-default, satisfies **AC-7**
5. Aktualizacja testów end to end (Playwright) na nowe adresy, nowy test przekierowania ze starego adresu na nowy w `proxy.test.ts`, w tym scenariusz łańcucha internal opisany w `## Feature design`, satisfies **AC-8**
6. Końcowy przegląd starych literałów ścieżki nawigacyjnej w całym repo poza `docs/specs/**`/`docs/scope/**` (zakres zawężony jak w AC-6, nie każde wystąpienie słowa), domknięcie ostatnich odwołań, satisfies **AC-6**

## Consequences

**Positive**:
- Adresy platformy stają się spójne z już przetłumaczoną treścią angielską i niderlandzką (spec 0028), zamiast mieszać angielski tekst pod polskim segmentem ścieżki.
- Strona główna klienta trafia pod czysty, bezprefiksowy adres, zgodny z konwencją międzynarodowych platform kupujący sprzedający, gdzie główny odbiorca (kupujący) ma najkrótszy adres.
- Trwałe przekierowania chronią już zaindeksowane strony (strona projektu ma hreflang od spec 0028) i wszelkie zapisane lub udostępnione linki producentów korzystających dziś z realnego backendu (spec 0032, 0033).

**Negative / tradeoffs**:
- Bardzo duży, wielopolikowy diff (mapowanie pokazało odwołania do starych segmentów w kilkuset miejscach kodu, nie licząc dokumentacji); ryzyko przeoczenia pojedynczego zaszytego na sztywno adresu, złagodzone końcowym przeglądem (krok 6 w `## Build plan`) i testem spójności end to end.
- Reguła w root `AGENTS.md` zakazująca grupy tras w nawiasach zostaje częściowo unieważniona (grupa tras jest teraz właściwym rozwiązaniem dla klienta, bo tylko klient traci własny segment); wymaga aktualizacji przez `/sync`, żeby nie wprowadzać w błąd przyszłych decyzji.
- Bezsegmentowa ścieżka klienta jest realną, trwałą powierzchnią kolizji, nie jednorazowo rozwiązanym problemem: każda przyszła trasa dodawana bezpośrednio pod `app/[locale]/` (poza `producer/` i `internal/`) musi być ręcznie sprawdzona względem nazw już zajętych przez grupę `(customer)`, inaczej Next.js odrzuci budowanie jako kolizję dwóch tras pod tym samym adresem.
- Mapowanie tras w `components/klient/AGENTS.md` i `components/producent/AGENTS.md` (sekcja "Screens this area serves") staje się nieaktualne w dniu wdrożenia; wymaga aktualizacji przez `/sync`.
- Stare adresy zostają na zawsze w kodzie jako wpisy przekierowań w `proxy.ts`; to mały, ale trwały koszt utrzymania każdej przyszłej zmiany segmentu.

**Neutral**:
- Nazwy folderów komponentów (`components/klient/`, `components/producent/`) oraz wewnętrzne identyfikatory w kodzie świadomie zostają po polsku; to osobna, nie podjęta tu decyzja (patrz `## Follow-up`).
- Grupa tras `(customer)` sama w sobie nigdy nie pojawia się w adresie; to wyłącznie wewnętrzna organizacja plików Next.js, potrzebna do współdzielenia układu strony głównej i reszty ścieżki klienta bez wymuszania segmentu w adresie.

## Follow-up

- [ ] Root `AGENTS.md`, sekcja `## Rules`: zdanie o trasach jako realnych segmentach folderów, nigdy grupie tras, wymaga aktualizacji, żeby odzwierciedlić że grupa tras `(customer)` jest teraz właściwym rozwiązaniem dla klienta (bo tylko klient traci własny segment, producent i internal wciąż mają swój rozróżniający prefiks) — zadanie `/sync`, nie tej specyfikacji.
- [ ] `components/klient/AGENTS.md` i `components/producent/AGENTS.md`, sekcja "Screens this area serves": mapowanie segmentów tras na komponenty wymaga aktualizacji na nowe angielskie adresy — zadanie `/sync`.
- [ ] `docs/scope/prototyp.md` i `docs/scope/produkcja.md` niosą kryteria "Done when" i opisy funkcji odwołujące się do starych polskich segmentów; wymagają przeglądu i aktualizacji przez `/sync` po wdrożeniu tej decyzji.
- [ ] Jeśli w przyszłości padnie decyzja o pełnej spójności nazewnictwa (foldery komponentów `components/klient` na `components/customer`, wewnętrzne identyfikatory), to osobna, nie podjęta tu decyzja; ta specyfikacja świadomie ogranicza się do adresów URL.
- [ ] Brak dziś `app/sitemap.ts`; przy okazji tej zmiany adresów warto rozważyć dodanie mapy strony XML z nowymi, angielskimi adresami jako osobne, przyszłe utwardzenie SEO (nie część tej decyzji).
- [ ] Gdy producent dostanie własne logowanie (Auth.js, spec 0017 Follow-up), trzeba będzie zdecydować, czy `/login` zostaje wspólny dla klienta i producenta, czy producent dostaje własny adres pod `/producer/login`; ta decyzja dziś zakłada, że `/login` obsługuje wyłącznie klienta, tak jak dziś.

## Migration plan

**Strategy**: bez wielkiego wybuchu w jednym pliku, ale też bez flagi funkcji w runtime; sama kolejność kroków w `## Build plan` daje bezpieczeństwo (patrz krok 1: cała ścieżka klienta jako jedna wewnętrznie kompletna całość, zweryfikowana zanim ruszy reszta obszarów), a każdy kolejny krok to osobny, w pełni odwracalny commit w ramach jednego wdrożenia.

**Phases**:
1. Krok 1 z `## Build plan`: cała ścieżka klienta (w tym strona główna i logowanie) przez grupę tras `(customer)` plus pełna mapa jej przekierowań, wdrożone razem jako jedna kompletna całość, żeby uniknąć okna, w którym część tras klienta jest już przekierowana a część jeszcze nie istnieje pod nowym adresem.
2. Krok 2 i 3: przeniesienie producenta i panelu administracyjnego, każdy obszar osobnym commitem z własnymi wpisami przekierowań (te obszary nie zależą od kroku 1, mogą wejść w osobnym wdrożeniu).
3. Kroki 4 do 6: hreflang, testy end to end, końcowy przegląd literałów starych ścieżek.

**Rollback**: na poziomie kodu każdy krok cofa się przez zwykły revert commitu tego kroku, co przywraca stary adres jako działającą stronę. To nie jest pełny rollback na poziomie ruchu: AC-5 wymaga kodu 308 (trwałe przekierowanie), a przeglądarki cache'ują kod 308 bezterminowo po stronie klienta, więc odwiedzający którego przeglądarka już raz dostała przekierowanie ze starego adresu na nowy dalej pójdzie na nowy adres nawet po revert commitu (revert nie usuwa cache przeglądarki, tylko usuwa docelową stronę pod nowym adresem, co w tym oknie dałoby błąd nieznaleziono strony zamiast starej strony). To świadomie zaakceptowany koszt wyboru trwałego przekierowania (patrz `## Rationale`), nie błąd tej specyfikacji; zmniejsza go weryfikacja kroku 1 na gałęzi funkcji lub środowisku podglądowym przed wdrożeniem na produkcję, żeby nie trzeba było w ogóle cofać kroku 1 po tym, jak realni odwiedzający już zdążyli dostać przekierowanie.

**Risks**: zaszyty na sztywno stary literał ścieżki przetrwały w jakimś pliku pokazałby się jako martwy link zamiast nowego adresu (łagodzi końcowy przegląd, krok 6, plus test spójności end to end, krok 5, oba zawężone do literałów ścieżki nawigacyjnej jak w AC-6, nie do każdego wystąpienia polskiego słowa w kodzie czy treści); przekierowanie zbudowane niepoprawnie mogłoby zgubić ciąg zapytania (na przykład aktywne filtry wyników albo NIP producenta w adresie) albo, przy naiwnej podmianie słowa zamiast dopasowania całej, zakotwiczonej ścieżki, przypadkiem podmienić fragment wewnątrz wartości dynamicznego segmentu (na przykład identyfikatora projektu); oba pokrywa scenariusz testowy i zasada dopasowania w `## Feature design`; przeoczenie aktualizacji `lib/panel-session.ts` mogłoby przekierować zalogowanego użytkownika po akcji na nieistniejący, stary adres zamiast nowego panelu; przekierowanie wydane z domyślnym kodem biblioteki (307) zamiast jawnie ustawionym 308 nie spełniałoby AC-5 mimo że wygląda na działające.
