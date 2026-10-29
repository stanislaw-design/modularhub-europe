# 0078. Obniżenie kosztów funkcji serwerowych na Vercel przez Cache Components

**Date**: 2026-10-28
**Status**: Proposed

## Summary

Koszt użycia Vercel wzrósł około 9 razy w trzy tygodnie (z 0,20 do 1,85 USD dziennie bez subskrypcji), prawie cały z funkcji serwerowych. Powód: każde wejście na stronę publiczną uruchamia funkcję i zapytania do bazy, bo layout klienta czyta sesję i ciasteczka, a żadne dane nie są w cache. Decyzja: włączyć Cache Components (stały, szybki szkielet strony z CDN, dane w cache z tagami, strony publiczne w pełni statyczne, a stan logowania ustalany w małej wyspie w przeglądarce na podstawie ciasteczka wskazówki), do tego Bot Protection, limit żądań i alerty wydatków. Cel: poniżej 0,50 USD dziennie przy podobnym ruchu, mierzone po wdrożeniu.

## Requirements

**User stories**:
- Jako właściciel platformy chcę, żeby koszt Vercel nie rósł szybciej niż ruch prawdziwych użytkowników, żeby budżet MVP był przewidywalny.
- Jako odwiedzający chcę, żeby strona produktu i wyniki otwierały się od razu, a po zalogowaniu widzieć swoje konto bez mignięcia nagłówka.
- Jako administrator lub producent chcę, żeby zapisana zmiana produktu była widoczna na stronie publicznej od razu, nie po godzinie.
- Jako właściciel chcę dostać alert, zanim wydatki przekroczą budżet, bez ryzyka, że strona sama się wyłączy.

**Acceptance criteria**:
- **AC-1**: Przed zmianą kodu zapisany jest punkt odniesienia: dzienny koszt według usługi dla tygodnia 20 do 26 października, plus 10 tras o największej liczbie wywołań i czasie CPU oraz udział botów z panelu Vercel (Observability i Firewall Traffic), z najwcześniejszego dostępnego okna (logi Pro trzymają jedną dobę, więc rozkład tras może być krótszy niż tydzień). Zapis jest w `verify.md`.
- **AC-2**: Spend Management ma alerty przy 50, 75 i 100 procent budżetu, bez automatycznej pauzy projektu.
- **AC-3**: Vercel Firewall ma Bot Protection (najpierw tryb Log, po minimum dwóch dniach danych tryb Challenge dla niezweryfikowanych botów) oraz limit żądań na `/*/results` i `/*/project/*`. Googlebot i Bingbot (zweryfikowane boty) przechodzą bez wyzwania. Sprawdzone liczbą trafień reguł w dzienniku Firewall i brakiem wyzwań dla Googlebota i Bingbota w tym dzienniku.
- **AC-4**: `cacheComponents: true` jest włączone, a `next build` kończy się sukcesem. Trasy publiczne z listy w `## Feature design` są oznaczone jako prerenderowane (statyczne lub częściowo), a nie jako renderowane na każde żądanie.
- **AC-5**: Szkielet strony publicznej (nagłówek, treść, stopka) nie czyta ciasteczek ani sesji. Stan logowania ustala wyspa kliencka w nagłówku: gdy ciasteczko wskazówka `has_session` (dostępne dla JS, bez żadnych danych) nie istnieje, pokazuje „Zaloguj" od pierwszego malowania; gdy istnieje, pokazuje szkielet przycisku konta o stałych wymiarach i pobiera sesję z `/api/auth/session`. CLS wynosi 0 w teście Playwright. Gdy sesja nie istnieje mimo wskazówki, wyspa kasuje wskazówkę i pokazuje „Zaloguj". W cache nigdy nie ma danych konkretnego użytkownika, a wskazówka nie służy do autoryzacji (serwer zawsze weryfikuje sesję sam).
- **AC-6**: Motyw (jasny lub ciemny) ustawia mały skrypt w `<head>` czytający ciasteczko w przeglądarce. Zapisany wybór działa, a pierwsze malowanie nie miga innym motywem. Layout nie wywołuje `cookies()` dla motywu. Element `<html>` ma `suppressHydrationWarning`.
- **AC-7**: Funkcje odczytu danych używanych przez strony publiczne mają `"use cache"`, własny profil `cacheLife` (do 1 godziny odświeżania w tle) i tagi. Język i filtry są argumentami funkcji, więc trafiają do klucza cache.
- **AC-8**: Każda akcja serwerowa, która zmienia dane widoczne publicznie, wywołuje `updateTag` dla właściwych tagów. Zmiana jest widoczna na stronie publicznej przy następnym żądaniu, nie po godzinie.
- **AC-9**: Chroniony endpoint `POST /api/revalidate` (nagłówek `Authorization: Bearer ${REVALIDATE_SECRET}`) wygasza listę dozwolonych tagów przez `revalidateTag(tag, { expire: 0 })`. Bez tokenu lub z błędnym zwraca 401, z nieznanym tagiem 422. Skrypty importu wołają go po zapisie do bazy.
- **AC-10**: Trasy prywatne (`panel`, `producer/panel`, `internal`, `login`, `inquiry`, ulubione) nadal działają jak dziś. Dynamiczny dostęp w nich jest opakowany w `Suspense` albo mają `instant = false`. Nigdy nie czytają ani nie zapisują danych użytkownika przez cache.
- **AC-11**: Konfiguracje segmentów `export const revalidate` w `app/sitemap.ts` i `export const dynamic` w trasie crona są zastąpione odpowiednikami Cache Components. Sitemapa nadal odświeża się raz na dobę i nadal zwraca same stałe strony, gdy baza nie działa.
- **AC-12**: Błąd bazy przy chybieniu w cache nie zapisuje błędu w cache. Wpisy już zapisane są serwowane do czasu `expire`, i tylko na instancji, która je ma, poza pamięcią współdzieloną. Fallback sitemapy (same stałe strony) leży poza funkcją z cache: funkcja z cache rzuca błąd, a wywołujący go łapie, więc fallback nie zostaje zapisany na dobę. Strona bez wpisu pokazuje istniejący komunikat błędu, a błąd trafia do Sentry.
- **AC-13**: Po wdrożeniu i 7 dniach pomiaru koszt użycia bez subskrypcji Pro jest poniżej 0,50 USD dziennie przy liczbie żądań ludzi w granicach plus minus 20 procent punktu odniesienia. Wynik zapisany w `verify.md` z podziałem na usługi, z progiem dla każdej pozycji: Function Invocations i Fast Origin Transfer co najmniej o połowę niżej niż w punkcie odniesienia, Fluid Active CPU i Provisioned Memory co najmniej o 70 procent niżej. Jeśli któryś próg nie jest spełniony, uruchamiany jest wariant z `## Follow-up`.
- **AC-14**: Poprzedni stan produkcji można przywrócić w minutę przez Instant Rollback w Vercel (promocja poprzedniego wdrożenia). Kroki kodu 4 do 13 są wdrażane jako kolejne PR, ale nie są niezależnie cofalne po włączeniu flagi, bo `"use cache"` bez flagi jest błędem budowania.

## Decision

**Chosen option**: Option 1: Cache Components z częściowym prerenderem, plus ochrona przed botami i alerty wydatków.

Strony publiczne są w pełni prerenderowane i serwowane z CDN (bez dynamicznej dziury), dane publiczne są w cache z tagami i godzinnym odświeżaniem, a stan logowania ustala mała wyspa w przeglądarce na podstawie ciasteczka wskazówki `has_session`. Wdrożenie przyrostowe wg przewodnika migracji Next.js, kroki zaczynają się od zmian bez kodu (alerty, firewall), bo działają od razu.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`)

Rozstrzygnięcia podjęte w specyfikacji (rekomendacje, nie pytania do inżyniera):
- **Profil cache**: własny profil `public` w `cacheLife` w `next.config.ts` (stale 300 s, revalidate 3600 s, expire 86400 s). Runner up: wbudowany profil `hours`, odrzucony, bo wartości powinny być jawne i w jednym miejscu.
- **Schemat tagów**: `products` (listy i wyniki), `product:{id}`, `producers`, `producer:{id}`. Runner up: jeden tag `public`, odrzucony, bo zmiana jednego produktu wygaszałaby wszystko.
- **Filtry wyników**: argumenty funkcji cache są walidowane i sprowadzane do postaci kanonicznej (znane klucze, posortowane, budżet w istniejących przedziałach), nieznane parametry są ignorowane. Dzięki temu bot nie rozdmucha liczby wpisów w cache losowymi wartościami.
- **Tłumaczenia**: funkcje odczytu przyjmują `locale` jawnie i zwracają dane, a `getTranslations` zostaje poza cache. Runner up: `getTranslations` w środku cache, odrzucone, bo zależy od kontekstu żądania.
- **Sesja a bazy**: `auth()` (strategia `database`) trafia do Neona tylko przy obecnym ciasteczku sesji. Dlatego sesji nie czytamy w szkielecie. Dziura sesji po stronie serwera uruchamiałaby funkcję przy każdym żądaniu, także bota (wznowienie renderu i streaming zużywają też Fast Origin Transfer i pamięć). Ciasteczko wskazówka sprawia, że anonimowi i boty dostają statyczną stronę z CDN, a tylko zalogowani pobierają sesję. Runner up: dziura sesji za `Suspense`, odrzucona z powodu kosztu (decyzja inżyniera po krytyce).
- **Miejsce cache**: domyślne `"use cache"` trzyma wpisy w pamięci instancji. Dane czytane w czasie żądania (np. `/results`, zależne od `searchParams`) używają `"use cache: remote"` (współdzielone między instancjami), żeby zimna instancja nie pytała Neona za każdym razem. `/results` jest przez to częściowym prerenderem z dziurą na wyniki, nie stroną w pełni statyczną.
- **Język i `[locale]`**: layout `[locale]` zwraca języki w `generateStaticParams`, a każdy layout i strona publiczna wywołuje `setRequestLocale`, inaczej next-intl czyta nagłówki i cała gałąź staje się dynamiczna. Wersja `next-intl` musi wspierać `cacheComponents` (do sprawdzenia w kroku 5a).
- **Brak bazy w buildzie**: segmenty z dynamicznym slugiem w bazie dostają krótką, stałą listę slugów (z kodu, np. ModularProjects) i generują resztę na żądanie. Błąd zapytania w buildzie nie przerywa wdrożenia, tylko zwraca tę stałą listę.

## Feature design

**Data model sketch**: brak zmian w schemacie bazy i brak migracji.

**Trasy publiczne objęte prerenderem** (z `app/[locale]/(customer)/` i `producer/(public)`): `/` , `/results`, `/project/[slug]`, `/outdoor-tv/[slug]`, `/sauna`, `/sauna/[slug]`, `/modularprojects`, `/modularprojects/[slug]`, `/producers`, `/producers/[id]`, `/verified-manufacturers`, `/contact`, `/privacy`, `/project-request`, `/compare`, `/producer` (strona publiczna producenta). Trasy `login`, `registration`, `inquiry`, `plot`, `fulfillment` zostają dynamiczne (formularze i dane użytkownika).

**Układ szkieletu** (layout `(customer)`):
- `KlientLayout` przestaje być zależny od żądania. Nie wywołuje `auth()` ani `cookies()`.
- `SiteHeader` przestaje przyjmować sesję jako props. Nowa wyspa kliencka `HeaderAccount` czyta ciasteczko `has_session` i, gdy istnieje, pobiera `/api/auth/session`. Szkielet przycisku konta ma stałe wymiary docelowego przycisku.
- Ciasteczko `has_session=1`: bez `HttpOnly`, `Secure`, `SameSite=Lax`, czas życia równy czasowi sesji. Ustawiane po zalogowaniu (przepływy logowania, link logowania do panelu, rejestracja) i odświeżane przez małą wyspę kliencką `SessionHint` w layoutach prywatnych (`panel`, `producer/panel`, `internal`), które i tak znają sesję. Kasowane przy wylogowaniu i gdy `/api/auth/session` zwróci pustą sesję. Dzięki odświeżaniu z layoutów prywatnych brak wskazówki u zalogowanego (np. po logowaniu linkiem na innym urządzeniu) naprawia się przy pierwszej wizycie w panelu.
- `ThemeProvider` dostaje `initialTheme = null` w szkielecie. Skrypt w `<head>` ustawia klasę motywu przed pierwszym malowaniem (wzorzec „Preventing flash before hydration" z przewodnika Next.js).
- `SiteFooter` używa `new Date()` (rok). To synchroniczne IO, które psuje prerender i nie da się go wyłączyć opt outem. Rok liczony w `"use cache"` z `cacheLife` w dniach albo w komponencie klienckim.

**Warstwa danych** (`lib/data/projects.ts`, `lib/data/producers.ts`, `lib/data/modularprojects`):
- Publiczne funkcje odczytu (`getProjects`, `getProjectBySlugOrId`, `getProjectById`, `getFeaturedProjectByFamily`, `getProducers`, `getProducerById`, `getSaunaProducerOptions`, `getSitemapProducts`, `getVerifiedVolumeManufacturerProjects`) dostają cienkie wrappery z `"use cache"`, `cacheLife("public")` i `cacheTag(...)`. Funkcje związane z użytkownikiem (`getFavoritesForClient`) NIE są cache'owane.
- Argumenty: `locale` i znormalizowane filtry. Zakaz czytania `cookies()`, `headers()` i sesji w środku cache.

**Unieważnianie**:

| Zmiana | Gdzie | Tagi |
|---|---|---|
| Edycja produktu, wariantów, opcji, zdjęć, parametrów | `lib/producer-product-actions.ts`, `lib/producer-product-variant-actions.ts`, `lib/product-photo-actions.ts`, `lib/product-envelope-actions.ts`, `lib/product-envelope-admin-actions.ts`, `lib/producer-project-translation-actions.ts`, `lib/platform-project-actions.ts` | `products`, `product:{id}` |
| Edycja producenta, certyfikatów, firmy | `lib/producer-company-actions.ts`, `lib/producer-certification-actions.ts`, `lib/producer-certification-admin-actions.ts`, `lib/producer-block-actions.ts` | `producers`, `producer:{id}`, `products` |
| Import skryptem (FrameDEV, Logbar, MKB, Kora, Wencel i inne) | `POST /api/revalidate` | `products`, `producers` |

Zakres akcji do przejrzenia jest listą startową: przy budowie sprawdza się każdy plik z `"use server"`, który zapisuje do tabel `product*`, `producer*` i tabel tłumaczeń.

Dodatkowe zasady unieważniania:
- Wspólne grupy opcji i słownik `reference_text_translation` dotykają wielu produktów, więc ich zmiana wygasza tag `products`.
- Zapisy produkcyjne wykonywane ręcznie plikami SQL (`drizzle/_promote_*`, tłumaczenia) nie wywołują żadnej akcji. Po każdym takim zapisie trzeba ręcznie wywołać `curl` na `/api/revalidate` i ten krok jest dopisany do runbooka promocji.
- `updateTag` działa tylko w akcjach serwerowych. Zapis w route handlerze używa `revalidateTag(tag, { expire: 0 })`.
- Przed owinięciem czytnika w `"use cache"` sprawdza się, czy jego wynik zależy od oglądającego (np. właściciel lub admin widzący niepublikowane produkty). Takie czytniki zostają poza cache, żeby nie wyciekły dane.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/revalidate` | POST | `tags: string[]` (z listy dozwolonych) | `{ revalidated: string[] }` | `Authorization: Bearer ${REVALIDATE_SECRET}` | 401 (brak lub zły token), 422 (nieznany tag lub puste body) |

`/api` jest już wyłączone z matchera `proxy.ts`, więc endpoint nie przechodzi przez przekierowania języka.

**Key invariants**:
- Szkielet strony publicznej nie zawiera żadnych danych konkretnego użytkownika.
- Funkcja z `"use cache"` nigdy nie czyta `cookies()`, `headers()`, `searchParams` ani sesji. Wartości przychodzą jako argumenty.
- Każdy zapis do danych publicznych kończy się `updateTag` (akcja) albo `revalidateTag(tag, { expire: 0 })` (endpoint).
- `REVALIDATE_SECRET` nigdy nie trafia do klienta ani do logów.
- Brak `new Date()`, `Date.now()`, `Math.random()` w szkielecie bez opakowania.

**Security model**: ciasteczko `has_session` nie niesie danych i nie jest dowodem tożsamości, służy tylko do wyboru, co narysować w nagłówku; dostęp do paneli i danych nadal weryfikuje serwer przez sesję. `/api/revalidate` wymaga tokenu (porównanie stałoczasowe), jest ograniczony do listy tagów i nie przyjmuje ścieżek. Brak danych osobowych w cache. Cache publiczny jest wspólny dla wszystkich, dlatego sesja i ciasteczka są wykluczone ze szkieletu i z funkcji cache. Brak nowego zakresu zgodności (RODO bez zmian, bo dane osobowe nie wchodzą do cache).

**Configuration required**:
- `REVALIDATE_SECRET`: token endpointu `/api/revalidate` (Production i Preview; lokalnie w `.env.local` dla skryptów importu).
- `cacheComponents: true` i profil `cacheLife.public` w `next.config.ts`.
- Poza kodem: Spend Management (panel Vercel, Billing), Firewall (Bot Protection i reguła limitu żądań).

**Critical test scenarios** (każdy mapuje do AC):
- Szkielet: `next build` pokazuje trasy publiczne jako prerenderowane (statyczne lub częściowe), verifies **AC-4**.
- Wylogowany: statyczny HTML strony produktu zawiera „Zaloguj", bez danych użytkownika, a odpowiedź pochodzi z CDN bez wywołania funkcji, verifies **AC-5**.
- Zalogowany klient: po załadowaniu wyspa pokazuje link konta, CLS 0 w Playwright, verifies **AC-5**.
- Przestarzała wskazówka: ciasteczko `has_session` bez sesji jest kasowane, nagłówek wraca do „Zaloguj", verifies **AC-5**.
- Brak wskazówki u zalogowanego: wizyta w panelu przywraca ciasteczko, verifies **AC-5**.
- Motyw: wybór ciemnego zapisany w ciasteczku jest stosowany przed pierwszym malowaniem po odświeżeniu, verifies **AC-6**.
- Cache: dwa żądania z tym samym językiem i filtrami wykonują jedno zapytanie do bazy także na zimnej instancji (współdzielony cache); inny filtr wykonuje drugie, verifies **AC-7**.
- Edycja: producent zmienia cenę, strona publiczna pokazuje nową cenę przy następnym żądaniu, verifies **AC-8**.
- Endpoint: brak tokenu 401, zły token 401, nieznany tag 422, poprawne wywołanie wygasza tag, verifies **AC-9**.
- Prywatne: panel producenta i admina działają, a odpowiedź nie trafia do cache wspólnego, verifies **AC-10**.
- Awaria: baza niedostępna przy chybieniu, błąd nie jest zapisany, wpis z poprzedniego trafienia nadal serwowany, verifies **AC-12**.
- Sitemapa: zwraca same stałe strony przy błędzie bazy, verifies **AC-11**.

## Migration plan

**Strategy**: przyrostowa (wzorzec strangler z przewodnika migracji Next.js: włączamy flagę, wyłączamy walidację tras przez `instant = false`, konwertujemy trasę po trasie).

**Phases**:
1. Bez kodu, tego samego dnia: punkt odniesienia, alerty wydatków, Bot Protection w trybie Log.
2. Włączenie flagi na gałęzi: usunięcie konfiguracji segmentów, kodemod `cache-components-instant-false`, naprawa synchronicznego IO (stopka). Wdrożenie na podgląd Vercel. Nic nie jest jeszcze szybsze, ale build przechodzi.
3. Szkielet klienta: layout bez `auth()` i `cookies()`, sesja za `Suspense`, motyw przez skrypt. Zdjęcie `instant = false` z tras publicznych.
4. Dane: wrappery z `"use cache"` i tagami, profil `public`, filtry znormalizowane.
5. Unieważnianie: `updateTag` w akcjach, endpoint `/api/revalidate`, wywołanie z skryptów importu.
6. Firewall: przejście z Log na Challenge po przeglądzie danych, reguła limitu żądań.
7. Pomiar 7 dni i zapis w `verify.md`.

**Rollback**: faza 1 odwracana w panelu. Fazy kodu: Instant Rollback w Vercel (promocja poprzedniego wdrożenia, minuty). Revert w git dotyczy całej gałęzi funkcji, bo `"use cache"` bez flagi jest błędem budowania.
**Risks**: (1) przy włączonej fladze każda trasa musi się zbudować, także prywatne (stąd opt out). (2) Nieświeże dane, jeśli jakaś akcja zapisu nie wywoła tagu (ograniczone przez limit godziny). (3) Dziura sesji nadal uruchamia funkcję przy każdym żądaniu (patrz Consequences). (4) `generateStaticParams` musi zwracać co najmniej jeden parametr dla tras z dynamicznym segmentem, a dane produktów są w bazie: sprawdzić zachowanie przy buildzie bez bazy.

## Build plan

Brak zapisanego podejścia dla tej funkcji, więc użyte jest domyślne: cienkie, wdrażalne kawałki od końca do końca, od najtańszych i najpewniejszych. Kolejność pilnuje kosztu w pierwszej kolejności.

1. Zapisz punkt odniesienia w `verify.md`: koszt dzienny według usługi (20 do 26 października), top 10 tras według wywołań i CPU, udział botów (panel Vercel: Observability i Firewall Traffic), satisfies **AC-1**
2. Włącz Spend Management z alertami 50, 75, 100 procent bez pauzy, satisfies **AC-2**
3. Włącz Bot Protection w trybie Log i dodaj regułę limitu żądań na `/*/results` i `/*/project/*`, satisfies **AC-3**
3a. Zmierz koszt przez 2 do 3 dni po krokach 2 i 3. Zawęź matcher `proxy.ts` tak, by obsługiwał tylko to, co wymaga przekierowania (nieprefiksowane ścieżki, stare segmenty), i zapisz wpływ na Function Invocations i Fast Origin Transfer. Wynik decyduje, czy refaktor od kroku 4 jest nadal potrzebny w pełnym zakresie, satisfies **AC-13**
4. Włącz `cacheComponents: true` i profil `cacheLife.public` w `next.config.ts`, usuń `revalidate` z `app/sitemap.ts` i `dynamic` z trasy crona (zastępniki z przewodnika migracji), uruchom kodemod `cache-components-instant-false`, satisfies **AC-4**, **AC-11**
5. Napraw synchroniczne IO w szkielecie (`new Date()` w `components/klient/SiteFooter.tsx` i w `PlotAnalysisRow`, jeśli trafia do szkieletu), doprowadź `next build` do sukcesu, wdróż na podgląd Vercel, satisfies **AC-4**
5a. W layoucie `[locale]` dodaj `generateStaticParams` z językami i `setRequestLocale` w każdym layoucie i stronie publicznej, sprawdź wersję `next-intl` względem `cacheComponents`, ustal stałe listy slugów dla segmentów dynamicznych, satisfies **AC-4**
6. Przerób layout `(customer)`: usuń `auth()` i `cookies()`, zastąp sesję w `SiteHeader` wyspą `HeaderAccount` opartą na ciasteczku `has_session`, dodaj ustawianie wskazówki w przepływach logowania, `SessionHint` w layoutach prywatnych i kasowanie przy wylogowaniu, satisfies **AC-5**
7. Przenieś motyw na skrypt w `<head>` (ThemeProvider i layout), zachowaj ciasteczko jako magazyn wyboru, satisfies **AC-6**
8. Zdejmij `instant = false` z tras publicznych i napraw wskazane błędy po jednej trasie, zaczynając od `/`, potem `/results`, `/project/[slug]`, `/sauna/[slug]`, `/modularprojects`, `/producers`, satisfies **AC-4**, **AC-5**
9. Dodaj wrappery z `"use cache"`, `cacheLife("public")` i tagami dla publicznych funkcji odczytu, z normalizacją filtrów, satisfies **AC-7**
10. Dodaj `updateTag` do akcji zapisu z tabeli unieważniania (przejrzyj każdy plik z `"use server"` zapisujący dane produktów i producentów), satisfies **AC-8**
11. Zbuduj `POST /api/revalidate` z tokenem i listą tagów, dodaj `REVALIDATE_SECRET` do Production i Preview, wywołaj endpoint z końca skryptów importu, satisfies **AC-9**
12. Potwierdź, że trasy prywatne działają (opt out lub `Suspense`) i nie używają cache wspólnego, satisfies **AC-10**
13. Dodaj obsługę awarii bazy przy chybieniu w cache (bez zapisu błędu, Sentry), sprawdź sitemapę, satisfies **AC-11**, **AC-12**
14. Przełącz Bot Protection z Log na Challenge po przeglądzie dwóch dni danych, satisfies **AC-3**
15. Pomiar po 7 dniach i zapis w `verify.md`, decyzja o wariancie awaryjnym, satisfies **AC-13**, **AC-14**

## Consequences

**Positive**:
- Strona publiczna otwiera się od razu z CDN, a dane ze wspólnego cache, co pomaga też Core Web Vitals (funkcja 21 w scope).
- Zapytania do Neona znikają dla wspólnych danych, co chroni też limity bazy.
- Zmiany producenta i importy są widoczne od razu, nie po godzinie.
- Alerty wydatków i Bot Protection dają ochronę niezależną od kodu.

**Negative / tradeoffs**:
- `proxy.ts` działa przed cache i nadal wywołuje funkcję przy żądaniach, które pasują do matchera. Dlatego plan zawiera jego zawężenie (krok 3a) i pomiar przed refaktorem.
- Zalogowany użytkownik widzi przez chwilę szkielet przycisku konta, zanim wyspa pobierze sesję (jedno dodatkowe żądanie `/api/auth/session` na wizytę).
- Ciasteczko wskazówka wymaga utrzymania: ustawianie przy każdym przepływie logowania, kasowanie przy wylogowaniu i naprawa po rozjechaniu się. Błąd w tym miejscu daje zalogowanemu napis „Zaloguj" do pierwszej wizyty w panelu.
- Flaga jest globalna: wymaga dotknięcia wielu tras (46 plików czyta `auth()`, `cookies()` lub `headers()`), więc to największa zmiana architektury w tym etapie.
- Funkcje z `"use cache"` nie mogą czytać sesji ani ciasteczek, co zmusza do oddzielenia danych wspólnych od danych użytkownika w całej warstwie danych.
- Nieświeże dane są możliwe do godziny, jeśli któraś ścieżka zapisu pominie tag.
- Dodatkowy sekret (`REVALIDATE_SECRET`) i endpoint do utrzymania.

**Neutral**:
- Brak migracji bazy danych.
- Optymalizacja obrazów zostaje bez zmian (ok. 0,12 USD dziennie), pilnowana alertami.
- Dokumentacja w `node_modules/next/dist/docs` jest źródłem prawdy dla API tej wersji (16.3), zgodnie z `AGENTS.md`.

## Follow-up

- [ ] Wariant awaryjny, gdy po 7 dniach progi z AC-13 nie są spełnione: najpierw sprawdzić rozkład w Observability (czy dominują żądania przez `proxy.ts` lub trasy prywatne), dopiero potem zmieniać architekturę.
- [ ] Rozważyć zainstalowanie umiejętności `next-cache-components-adoption` (Vercel, `npx skills add vercel/next.js --skill next-cache-components-adoption`), która prowadzi tę migrację krok po kroku, i dopisać ją do `## Agent skills` w `AGENTS.md`.
- [ ] Po wdrożeniu dopisać do `AGENTS.md` (`/sync`): flaga `cacheComponents`, zasada „bez `cookies()` i sesji w szkielecie ani w `use cache`", schemat tagów, endpoint `/api/revalidate`, uwaga o `REVALIDATE_SECRET`.
- [ ] Blokowanie crawlerów AI w `robots.ts` nie zostało rozstrzygnięte (decyzja biznesowa o widoczności w wyszukiwarkach AI); nie zmieniamy `robots.ts` w tej specyfikacji.
- [ ] Zdjęcia z R2 przez własną domenę i transformacje Cloudflare: wrócić, jeśli obrazki zaczną dominować w kosztach (dziś ok. 0,12 USD dziennie).
- [ ] Powiązać tę specyfikację z funkcją 21 „Wydajność: cel i audyt Core Web Vitals" w `docs/scope/produkcja.md` albo założyć nową funkcję „Koszty hostingu" (do decyzji przy potwierdzeniu).
- [ ] Uzupełnić `AGENTS.md` o wymóg `setRequestLocale` w publicznych layoutach i stronach po włączeniu flagi.

## Rationale

Uzasadnienie, opcje i kontekst: patrz [rationale.md](rationale.md).
