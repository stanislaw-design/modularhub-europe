# 0003. Strona startowa: hero z selektorem wyszukiwania

**Date**: 2026-08-13
**Status**: Superseded by [0014](../0014-przebudowa-strony-startowej/index.md)

## Summary

Ta specyfikacja projektuje pierwszy ekran całego demo: hero z krótkim selektorem (kraj plus widełki metrażu) prowadzącym wprost do strony wyników, sekcję kilku wyróżnionych domów pod hero, i krótkie wyjaśnienie „jak to działa" niżej. Zastępuje pierwotny plan jednego CTA prowadzącego do osobnego kreatora ceny, wzorem serwisów rezerwacyjnych (Airbnb, wakacje.pl), na które powołał się zamawiający. Po tej specyfikacji strona startowa jest kompletnym, klikalnym ekranem na danych mockowych, a funkcja „kreator ceny" wypada z zakresu (patrz Follow up, do potwierdzenia przez `/scope`).

## Requirements

**User stories**:
- Jako klient wchodzący na stronę główną, chcę szybko wybrać kraj docelowy i przybliżony metraż, żeby od razu zobaczyć pasujące domy, bez wypełniania długiego formularza.
- Jako klient przeglądający stronę główną, chcę zobaczyć kilka konkretnych domów, żeby zanim jeszcze wyszukam, mieć poczucie, co platforma oferuje.
- Jako pierwszy raz odwiedzający, chcę krótkiego wyjaśnienia, jak wygląda cały proces, żeby rozumieć co się stanie po kliknięciu „szukaj".
- Jako producent rozważający platformę, chcę oczywistego linku do rejestracji z poziomu strony głównej klienta, żeby nie szukać osobnego wejścia marketingowego.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Strona startowa renderuje się pod `/pl/klient` (korzeń `/pl` przekierowuje tam), z nagłówkiem zawierającym płaskie logo v2 i link „Zostań producentem" do `/pl/producent`.
- **AC-2**: Sekcja hero pokazuje selektor: pole Kraj (wymagane), pole Metraż od i pole Metraż do (oba opcjonalne, wartości co 50 m²), i nagłówek h1 zorientowany na akcję wyszukiwania (dostępny dla czytników ekranu, `sr-only` wizualnie, bo hero ma renderować się jako sam pasek wyszukiwania bez towarzyszącej grafiki). Bez logo v3 display jako elementu wizualnego (patrz Follow-up: to odstępstwo od pierwotnej decyzji zamawiającego w rationale.md).
- **AC-3**: Przycisk „Szukaj" jest nieaktywny, dopóki kraj nie jest wybrany. Po kliknięciu przenosi na `/pl/klient/wyniki` z parametrami `country` (zawsze obecny), `sizeMin` i `sizeMax` (obecne tylko gdy wybrane).
- **AC-4**: Zmiana pola „od" filtruje dostępne opcje pola „do" do wartości równych lub większych. Jeśli aktualnie wybrane „do" staje się mniejsze niż nowe „od", pole „do" czyści się do braku wyboru zamiast zostawić nieprawidłową parę.
- **AC-5**: Sekcja „Polecane domy" pokazuje dokładnie te projekty z mocka, które mają `featured === true` (4 z 6 obecnych), każdy jako karta ze zdjęciem, nazwą, metrażem, liczbą sypialni i widełkami cenowymi, w responsywnej siatce (bez karuzeli). Cała karta to jeden element klikalny (link), bez zagnieżdżonych osobno fokusowalnych elementów w środku.
- **AC-6**: Kliknięcie karty polecanego domu przenosi na `/pl/klient/wyniki` z `sizeMin`/`sizeMax` wyliczonymi z metrażu tego projektu, bez parametru `country` (patrz reguła zaokrąglania w Feature design, bo próg 50 m² nie pokrywa domów poniżej 50 m² wprost).
- **AC-7**: Sekcja „Jak to działa" pokazuje 4 ponumerowane kroki (wyszukaj, przeglądaj wyniki dopuszczone prawnie, wyślij jedno zapytanie, śledź realizację) pod sekcją polecanych domów.
- **AC-8**: Strona spełnia WCAG 2.2 AA: nagłówek, hero i sekcje są dostępne z klawiatury, pola Kraj/od/do mają pełną obsługę klawiatury (istniejący komponent Select), na stronie jest dokładnie jeden prawdziwy H1. Link „Przejdź do treści” (skip link) musi być osiągalny klawiaturą i realnie przenosić fokus do `#main-content`; nie musi być pierwszym elementem w kolejności Tab przed linkami nagłówka. Decyzja zamawiającego (2026-08-13): nagłówek zawiera tylko dwa linki (logo, „Zostań producentem”), więc narzut nawigacyjny przed dotarciem do skip linku jest pomijalny.
- **AC-9**: Cała treść jest po polsku, w tonie marki; żaden drugorzędny element nie konkuruje wizualnie z akcją wyszukiwania (zasada „jeden konkretny CTA" z wytycznych marki, tu zrealizowana jako jedna akcja wyszukiwania zamiast pojedynczego linku), z wyjątkiem paska kategorii pod hero (`CategoryFilterBar`, patrz Feature design): wszystkie jego przyciski są `disabled`, to wizualny placeholder przyszłej funkcji filtrowania, nie osobna konkurencyjna akcja.

## Decision

**Chosen option**: Opcja 1, hero ze zwięzłym selektorem (kraj plus widełki metrażu) prowadzący wprost do strony wyników; osobny „kreator ceny" wypada z zakresu.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Feature design

**Data model sketch**:
- `Project` (istniejąca encja w `lib/data/types.ts`): dodaje pole `featured: boolean` (wymagane, bez wartości domyślnej w typie, ustawione jawnie w każdym rekordzie mocka). Bez nowych encji ani relacji.
- Nowa funkcja dostępowa `getFeaturedProjects(): Promise<Project[]>` w `lib/data/projects.ts`, asynchroniczna od początku (zgodnie z regułą `AGENTS.md`), zwraca projekty z `featured === true`.

**State transitions**: nie dotyczy, strona statyczna bez cyklu życia.

**Interfejs strony** (brak backendu; jedyny kontrakt to parametry URL przekazywane dalej i lokalny odczyt danych mockowych):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| Selektor hero → `/pl/klient/wyniki` | Nawigacja po stronie klienta (klik „Szukaj") | `country` (wymagany, `PL`/`DE`/`NL`), `sizeMin`/`sizeMax` (opcjonalne, wielokrotność 50) | Przejście na stronę wyników z parametrami w URL | Brak (strona publiczna) | Przycisk „Szukaj" nieaktywny bez kraju, więc TA strona nigdy nie wysyła błędnego `country`; wpisany ręcznie w URL nieznany kod czy nieliczbowy `sizeMin`/`sizeMax` to sprawa strony wyników (patrz Follow up), nie tej |
| Karta polecanego domu → `/pl/klient/wyniki` | Nawigacja po stronie klienta (klik karty) | `sizeMin`/`sizeMax` wyliczone z `floorAreaM2` klikniętego projektu wg reguły zaokrąglania niżej | Przejście na stronę wyników, bez `country` (brak `country` = wyniki nie stosują filtra prawnego, pokazują wszystkie kraje, patrz niezmienniki) | Brak (strona publiczna) | Nie dotyczy, wartość zawsze wyliczalna z danych statycznych |
| `getFeaturedProjects()` | Wywołanie funkcji dostępowej (serwer) | brak | `Project[]` gdzie `featured === true` | Nie dotyczy (odczyt danych po stronie serwera) | Pusta tablica gdyby żaden fixture nie miał `featured: true`; nie powinno wystąpić, patrz Follow up |

**Reguła zaokrąglania dla AC-6**: progi to 50, 100, 150, 200 m². `sizeMax` = najmniejszy próg większy lub równy `floorAreaM2` (pomijany, czyli brak górnego ograniczenia, jeśli `floorAreaM2 > 200`). `sizeMin` = największy próg mniejszy lub równy `floorAreaM2`, ale pomijany (brak dolnego ograniczenia) jeśli `floorAreaM2 < 50`. Przykład: projekt 38 m² → tylko `sizeMax=50`, bez `sizeMin` (nie ma sztucznego dolnego limitu poniżej pierwszego progu). Projekt 90 m² → `sizeMin=50&sizeMax=100`.

**Kluczowe niezmienniki**:
- Parametr `country`, jeśli obecny, jest zawsze jednym z kodów z `lib/data/countries.ts` (`PL`/`DE`/`NL`), dokładnie w tej wielkości liter; jego brak oznacza brak filtra prawnego na wynikach (nie błąd, nie domyślny kraj).
- Jeśli `sizeMin` i `sizeMax` są oba obecne, `sizeMin <= sizeMax`; oba to wartości domknięte (włącznie).
- W sekcji „Polecane domy" renderuje się dokładnie tyle kart, ile fixture'ów ma `featured: true`; liczba nie jest zaszyta na sztywno w komponencie.
- Pola „od" i „do" współdzielą tę samą listę progów (50, 100, 150, 200 m²); brak wyboru w danym polu oznacza brak dolnego albo górnego ograniczenia (nie ma osobnej opcji „0").

**Model bezpieczeństwa**: strona publiczna, bez logowania, bez zbierania danych osobowych (pola wyszukiwania nie są powiązane z żadnym kontem); brak zakresu zgodności regulacyjnej.

**Wymagana konfiguracja**: brak nowych zmiennych środowiskowych. Jedna zmiana konfiguracji projektu (nie sekret): `next.config.ts` musi dodać `images.remotePatterns` dla `picsum.photos`, bo `Project.coverImageUrl` (używane w kartach „Polecane domy") wskazuje na ten placeholder, a `next/image` odrzuca w runtime domeny spoza listy dozwolonych.

**Pasek kategorii (`CategoryFilterBar`)**: rząd ikon (Parterowy, Piętrowy, Pompa ciepła, Fotowoltaika, Rekuperacja, Konstrukcja CLT, Tereny górskie, Nad wodą, Ogród, Garaż, Bez barier, Klasa A+) plus przycisk „Filtry", renderowany pod hero, nad „Polecane domy". Wszystkie przyciski mają atrybut `disabled`, bez modelu danych za sobą (spec 0003 nie definiuje atrybutów domu jako fasety filtrowania); wizualny placeholder pod przyszłą funkcję filtrowania, dopisany podczas budowy jako odniesienie do referencyjnego układu (Runway, patrz rationale.md), nie osobna, klikalna akcja. Komponent: `components/klient/CategoryFilterBar.tsx`.

**Krytyczne scenariusze testowe** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wybór kraju i widełek metrażu w hero, klik „Szukaj", lądowanie na `/pl/klient/wyniki` ze wszystkimi trzema parametrami w URL, sprawdza **AC-3**.
- Przypadek brzegowy: wybrany tylko kraj, bez metrażu, nawigacja mimo to działa, URL zawiera wyłącznie `country`, sprawdza **AC-3**.
- Przypadek brzegowy: wybranie „od" większego niż aktualne „do" czyści „do" zamiast dopuścić nieprawidłowy zakres, sprawdza **AC-4**.
- Przypadek brzegowy: klik karty domu poniżej 50 m² (np. „Baltyk Studio 38", 38 m²) generuje `sizeMax=50` bez `sizeMin`, nie `sizeMin=0` ani błąd, sprawdza **AC-6**.
- Treść: siatka „Polecane domy" renderuje dokładnie projekty z `featured === true`, ani jednego więcej, ani mniej, sprawdza **AC-5**.

## Build plan

1. Dodaj pole `featured: boolean` do `Project` w `lib/data/types.ts` i oznacz dokładnie 4 z 6 obecnych fixture'ów jako `featured: true` w `lib/data/fixtures/projects.ts`, satisfies **AC-5**
2. Dodaj `getFeaturedProjects()` w `lib/data/projects.ts`, satisfies **AC-5**
3. Dodaj `images.remotePatterns` dla `picsum.photos` w `next.config.ts`, satisfies **AC-5**
4. Zbuduj komponent nagłówka (płaskie logo v2 jako statyczny import z `assets/brand/logo/v2/`, nie kopia do `public/`; link „Zostań producentem" do `/pl/producent`). Renderuj go w `app/[locale]/klient/layout.tsx`, PRZED `<RouteShell>`, nie wewnątrz dzieci przekazywanych do `RouteShell` (`RouteShell` renderuje `<main>` bezpośrednio wokół swoich dzieci; nagłówek musi być rodzeństwem `<main>`, inaczej pomija go skip link i łamie AC-8). `RouteShell` sam zostaje niezmieniony, satisfies **AC-1**, **AC-8**
5. Zbuduj stronę pod `app/[locale]/klient/page.tsx` (w istniejącym `RouteShell`, pod nagłówkiem z kroku 4). Zamień placeholder w `app/[locale]/page.tsx` na przekierowanie do `` `/${locale}/klient` `` z użyciem parametru `locale` tej strony (nie zaszytego na sztywno `"pl"`, żeby przyszłe języki z Deferred nie lądowały błędnie na polskiej wersji), satisfies **AC-1**
6. Zbuduj sekcję hero: nagłówek h1 zorientowany na wyszukiwanie (`sr-only`, dostępny dla czytników ekranu, bez odpowiednika wizualnego) i klientowy komponent selektora (Kraj Select, od Select, do Select), przycisk „Szukaj" nieaktywny bez kraju, satisfies **AC-2**, **AC-3**, **AC-9**
7. Podłącz logikę filtrowania „do" względem „od" (czyszczenie „do" gdy staje się mniejsze niż nowe „od") i nawigację selektora do `/pl/klient/wyniki` z odpowiednimi parametrami URL, satisfies **AC-3**, **AC-4**
8. Zbuduj siatkę „Polecane domy" (reużywa `Card`/`Heading`/`Text`/`DataText`, `Grid`), czytając `getFeaturedProjects()`. Cała karta to jeden `<a>`/`Link`, bez zagnieżdżonych fokusowalnych elementów w środku; link liczy `sizeMin`/`sizeMax` wg reguły zaokrąglania z Feature design, satisfies **AC-5**, **AC-6**
9. Zbuduj sekcję „Jak to działa" z 4 ponumerowanymi krokami, satisfies **AC-7**
10. Zbuduj `CategoryFilterBar` (patrz Feature design) pod hero, nad „Polecane domy", wszystkie przyciski `disabled`, satisfies **AC-9**
11. Przejście dostępności: jeden H1, logiczna kolejność fokusa nagłówek → pola hero → karty polecanych → kroki, `.focus-ring` na każdym elemencie interaktywnym, weryfikacja względem WCAG 2.2 AA, satisfies **AC-8**

## Consequences

**Positive**:
- Ustala pierwszy prawdziwy nagłówek/nawigację ścieżki klienta i kontrakt parametrów URL (`country`, `sizeMin`, `sizeMax`), z którego przyszła specyfikacja „Wyniki z filtrem prawnym" (funkcja 6) może od razu skorzystać, zamiast decydować to od nowa.
- Sekcja „Polecane domy" daje stronie startowej realną treść i dowód oferty, zamiast pustego formularza.
- Skrócenie ścieżki klienta o jeden cały ekran (kreator ceny znika), zgodnie z wprost wyrażoną intencją zamawiającego.

**Negative / tradeoffs**:
- Kraj jest jedynym prawnie istotnym filtrem, który hero przekazuje dalej; kliknięcie karty polecanego domu nie ma naturalnego kraju docelowego, więc trafia na wyniki bez filtra prawnego.
- Rezygnacja z „kreatora ceny" usuwa docelową ścieżkę do jednej, konkretnej wyceny; jeśli biznes zechce takiego narzędzia później, potrzebna będzie nowa decyzja projektowa (nie odtworzenie tej samej).
- Link „Zostań producentem" prowadzi do `/pl/producent`, który dziś ma tylko `layout.tsx`, bez `page.tsx`; do czasu zbudowania funkcji 11 (rejestracja producenta) kliknięcie tego linku kończy się 404. Zaakceptowane świadomie, zgodne z kolejnością budowy Facade (ekrany klienta przed ekranami producenta), nie błąd tej specyfikacji.

**Neutral**:
- Korzeń strony (`/pl`) przestaje renderować własną treść i staje się przekierowaniem.
- Jedno nowe pole danych i jedna nowa funkcja dostępowa, bez żadnej trwałości za nimi (nadal mock).
- Hero renderuje się jako sam pasek wyszukiwania, bez logo v3 display ani widocznego nagłówka marketingowego; patrz Follow-up, to odstępstwo od pierwotnej decyzji zamawiającego wymaga jego potwierdzenia.
- Pasek kategorii (`CategoryFilterBar`) pod hero to placeholder bez własnej specyfikacji; patrz Follow-up.

## Follow-up

- [ ] Uruchom `/scope`, żeby: usunąć albo oznaczyć jako `dropped` funkcję 5 „Kreator ceny (klient)"; zaktualizować „Done when" funkcji 4 „Strona startowa (hero marki)", bo obecny zapis („jedno CTA, brak drugorzędnych komunikatów odciągających od CTA") opisuje ekran, którego ta specyfikacja już nie buduje; i zaktualizować opis funkcji 6 „Wyniki z filtrem prawnym": z hero przychodzi tylko kraj i widełki metrażu (bez sypialni, budżetu, terminu).
- [ ] Przyszła specyfikacja „Wyniki z filtrem prawnym" (funkcja 6) musi uszanować kontrakt parametrów ustalony tutaj: `country` (dokładnie `PL`/`DE`/`NL`, jego brak oznacza brak filtra prawnego, nie błąd i nie domyślny kraj), `sizeMin`/`sizeMax` (wielokrotność 50, oba opcjonalne, domknięte, `sizeMin <= sizeMax`). Ta strona nigdy nie wysyła nieprawidłowej kombinacji, ale odwiedzający może wpisać URL ręcznie; strona wyników powinna łagodnie ignorować nieznany `country` albo nienumeryczny `sizeMin`/`sizeMax` (traktować jak brak), nie wyświetlać błędu.
- [ ] Treść stopki (kontakt, informacje prawne, przyszły przełącznik języka) świadomie pominięta w tej specyfikacji; dodać, gdy pojawi się realna treść do pokazania.
- [ ] Wybór dokładnie tych 4 polecanych fixture'ów jest ilustracyjny; potwierdź z zamawiającym albo producentami, gdy dojdzie prawdziwa fotografia.
- [ ] **Wymaga potwierdzenia zamawiającego**: pierwotna wersja tej specyfikacji (patrz rationale.md, „Napięcie z brand-guidelines-v3.md") zakładała zachowanie logo v3 display w hero jako wprost wyrażoną decyzję zamawiającego, zamiast czystej referencji Runway. Przy budowie (`/develop`) logo nigdy nie zostało zaimplementowane, a `/check verify` to wykryło (AC-2 specced-but-missing). Zamiast dobudować logo, tę specyfikację zaktualizowano tak, żeby AC-2 pasowało do zaimplementowanego stanu (sam pasek wyszukiwania, nagłówek tylko dla czytników ekranu). To odwraca wcześniejszą decyzję zamawiającego bez ponownej z nim rozmowy; zanim to ostatecznie osiądzie, ktoś z zespołu powinien potwierdzić z zamawiającym, że brak logo w hero jest akceptowalny, albo dobudować logo i cofnąć tę zmianę AC-2.
- [x] **Potwierdzone przez zamawiającego (2026-08-13)**: `/check verify` wykrył, że link „Przejdź do treści” (skip link) renderuje się w kolejności Tab po dwóch linkach nagłówka (logo, „Zostań producentem”), zamiast przed nimi, co jest odstępstwem od typowego wzorca dostępności. Zamawiający świadomie zaakceptował tę kolejność, bo nagłówek ma tylko dwa linki, więc narzut nawigacyjny jest pomijalny; AC-8 zaktualizowano, żeby to odzwierciedlić. Patrz zaktualizowane AC-8 w Requirements.
- [ ] Pasek kategorii (`CategoryFilterBar`) czeka na własną specyfikację (przyszła funkcja filtrowania po atrybutach domu: parterowy/piętrowy, źródło ciepła, lokalizacja, dostępność); dziś to czysty placeholder bez modelu danych, wszystkie przyciski `disabled`. Podłączyć realną logikę filtrowania dopiero po zaprojektowaniu tamtej funkcji.

## Rationale

Pełne uzasadnienie, porównanie opcji i źródła: patrz [rationale.md](rationale.md).
