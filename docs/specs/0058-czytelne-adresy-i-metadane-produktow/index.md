# 0058. Czytelne adresy i metadane produktów

**Date**: 2026-09-30
**Status**: Accepted

## Summary

Adres strony produktu (dom, spa, kontener, outdoor tv) dziś kończy się surowym, nieczytelnym identyfikatorem z bazy danych. Ta decyzja dodaje czytelny slug (na przykład `pomerania-40`), wyliczany automatycznie z nazwy produktu, jako nowy publiczny adres tej strony, ze starym adresem wciąż działającym i przekierowującym na nowy. Karta podglądu, która pojawia się przy wklejeniu linku w wiadomości albo social media, już dziś pokazuje prawdziwe zdjęcie, nazwę i opis produktu; ta decyzja zostawia to bez zmian i skupia się wyłącznie na samym adresie oraz na tym, żeby wycofane produkty nie trafiały do wyszukiwarki.

## Context

Zobacz `rationale.md`.

## Requirements

**User stories**:
- Jako klient udostępniający link do produktu (na przykład "Pomerania 40") znajomym albo w wiadomości, chcę żeby adres brzmiał po ludzku, a nie jak przypadkowy ciąg znaków, żeby odbiorca ufał, że to prawdziwa, konkretna oferta.
- Jako odbiorca udostępnionego linku, chcę zobaczyć w podglądzie prawdziwe zdjęcie, nazwę i krótki opis produktu, zanim kliknę, żeby wiedzieć, co otwieram.
- Jako producent, chcę żeby adres mojego produktu powstawał sam z nazwy, którą już wpisałem w kreatorze, bez dodatkowego kroku po mojej stronie.
- Jako producent wysyłający klientowi podgląd produktu jeszcze w trakcie tworzenia (bez wypełnionej nazwy), chcę żeby link nadal działał.
- Jako osoba z już zapisanym albo zaindeksowanym starym linkiem, chcę żeby po tej zmianie dalej trafiał na właściwy produkt, żeby nic mi się nie zepsuło.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: `product` dostaje nową, nullowalną, unikalną kolumnę `slug`; każdy produkt, który ma niepustą (po przycięciu białych znaków) nazwę, dostaje slug wyliczony raz, w chwili gdy nazwa staje się niepusta po pierwszym razie, w postaci małych liter, myślników i transliterowanych na łacińskie odpowiedniki polskich znaków (na przykład "Dom Żaglówka" → `dom-zaglowka`); żadna późniejsza zmiana nazwy nie przelicza ani nie zmienia sluga.
- **AC-2**: dwa produkty, których wyliczony bazowy slug jest identyczny (bez rozróżniania wielkości liter), dostają różne, unikalne slugi: ten zapisywany później dostaje dopisany krótki losowy sufiks (na przykład `pomerania-40-4f2a`).
- **AC-3**: `/project/[slug]` i `/outdoor-tv/[slug]` renderują właściwy produkt, gdy segment adresu odpowiada jego `slug` ALBO jego `id` (uuid); wartość, która nie odpowiada żadnemu z nich, kończy się standardowym `notFound()`, tak jak dziś.
- **AC-4**: wejście na adres produktu po jego `id`, gdy produkt MA już slug, wysyła trwałe przekierowanie (kod 308) na ten sam adres z `slug` w miejscu `id`, zachowując cały ciąg zapytania (na przykład `?wariant=`, `?zakladka=`, `?country=`) tak jak dzisiejsza zasada przekierowań ze spec 0036.
- **AC-5**: wejście na adres produktu po jego `id`, gdy produkt NIE MA jeszcze sluga (nazwa wciąż nie ustawiona), renderuje stronę normalnie pod adresem z `id`, bez żadnego przekierowania, tak jak działa dziś.
- **AC-6**: każde miejsce w aplikacji budujące link do publicznej strony produktu (`resolveProductHref` i wszystkie miejsca z niego korzystające: lista wyników, ulubione, porównywarka, podgląd producenta/administratora) wstawia `slug`, gdy produkt go ma, a `id` w przeciwnym razie; żadne wewnętrzne odwołanie bez zmiany (parametr `?projects=`, `?wariant=`, klucze obce w bazie, adresy panelu producenta/administracyjnego) nie zmienia się.
- **AC-7**: `generateMetadata` obu stron produktu zachowuje dzisiejszy kształt (tytuł, opis, `canonical`, `alternates.languages`, `openGraph.images` ze zdjęciem okładki), zbudowany teraz na kanonicznym (slug, gdy istnieje) adresie; produkt, którego `status` jest inny niż `published`, dodatkowo dostaje `robots: { index: false, follow: false }`.
- **AC-8**: istniejące produkty, które już mają nazwę, a nie mają jeszcze sluga, dostają go przez jednorazowy skrypt wyrównujący (ta sama reguła kolizji co AC-2), żeby już udostępnione albo zaindeksowane produkty (na przykład katalog Steel House, Pomerania 40) od razu rozwiązywały się pod czytelnym adresem.
- **AC-9**: dzisiejsze testy stron `/project/[id]` i `/outdoor-tv/[id]` przechodzą po zmianie na adresy oparte o slug; nowy test dowodzi przekierowania id → slug (AC-4) i normalnego renderu id bez sluga (AC-5).

## Options considered

Zobacz `rationale.md`.

## Decision

**Chosen option**: Option 1: dodanie `slug` jako drugiego, opcjonalnego identyfikatora obok `id`, z `id` jako trwałym fallbackiem i przekierowaniem 308 przy przejściu na slug.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`)

## Rationale

Zobacz `rationale.md`.

## Feature design

**Data model sketch**:
- `product.slug`: `text`, nullowalne (dopóki `product.name` jest puste), unikalne (`.unique()`, ten sam wzorzec co `producer.nip`), ustawiane raz przez ścieżki zapisu aplikacji (`createProducerProduct`, `updateProducerProduct`, `lib/producer-product-actions.ts`) i przez jednorazowy skrypt wyrównujący dla wierszy istniejących przed tą zmianą; nigdy nie nadpisywane przy kolejnej zmianie nazwy. Brak nowej tabeli, brak nowej relacji: to jedna kolumna na już istniejącej `product`.
- Slug jest jeden dla produktu niezależnie od języka (pl/en/nl), tak jak dzisiejszy `product.id` w `alternates.languages` (spec 0036 AC-7): wyliczany z bazowego `product.name`, nie z `productTranslation.name`.

**State transitions**: brak nowej maszyny stanów. Jedno jednorazowe przejście na poziomie pola: `slug` = `null` → wartość, nigdy z powrotem, nigdy ponownie przeliczane.

**API surface** (adresy stron, nie REST; to jest cała powierzchnia zmiany):

| Trasa | Dziś | Po zmianie | Uwaga |
|---|---|---|---|
| Strona domu/produktu | `/[locale]/project/[id]` | `/[locale]/project/[slug]` | segment przyjmuje slug albo uuid (AC-3); redirect 308 z uuid gdy slug istnieje (AC-4) |
| Strona outdoor tv | `/[locale]/outdoor-tv/[id]` | `/[locale]/outdoor-tv/[slug]` | to samo zachowanie co wyżej |
| `resolveProductHref(family, id, locale)` | zawsze budował adres z `id` | przyjmuje produkt (albo `{id, slug}`) i wstawia `slug ?? id` | jedyny punkt zbieżności, patrz `lib/product-family-groups.ts:54` |

Żaden nowy endpoint REST/serwerowy nie powstaje: generowanie sluga dzieje się w dwóch już istniejących server actions (`createProducerProduct`, `updateProducerProduct`), nie w nowej trasie.

**Key invariants**:
- Slug jest ustawiany dokładnie raz, w chwili gdy `name` staje się niepuste po pierwszym razie; żadna kolejna zmiana `name` nie dotyka `slug`.
- Każdy produkt z niepustą nazwą ma slug najpóźniej po zakończeniu tej migracji (bezpośrednio przy zapisie dla nowych/edytowanych, przez skrypt wyrównujący dla istniejących, AC-8); produkt bez nazwy zostaje bez sluga, dokładnie jak dziś bez tej zmiany.
- Publiczny adres strony produktu przyjmuje slug albo id; wszystko inne w aplikacji (klucze obce, `?projects=`, panel producenta/administracyjny) zostaje przy `id` bez zmian (patrz AC-6).
- Przekierowanie z `id` na `slug` zachowuje zawsze cały ciąg zapytania, tą samą zasadą co przekierowania ze spec 0036.

**Security model**: brak nowej roli, brak nowego uprawnienia. Własność produktu przy zapisie (`producerId` z sesji) nie zmienia się. Widoczność strony po samym adresie zostaje jak dziś (żaden status nie blokuje renderu, spec 0020 AC-6); jedyna nowość to `robots: noindex` dla produktu innego niż `published` (AC-7), które chroni wyłącznie indeksację w wyszukiwarkach, nie dostęp po linku.

**Configuration required**: brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: produkt "Pomerania 40" ma slug `pomerania-40`; wejście na `/pl/project/pomerania-40` renderuje stronę, `generateMetadata` niesie ten adres jako `canonical` i w `openGraph`. Weryfikuje **AC-1**, **AC-3**, **AC-7**.
- Kolizja: dwa produkty o nazwie "Pomerania 40" dostają `pomerania-40` i `pomerania-40-<sufiks>`. Weryfikuje **AC-2**.
- Przekierowanie: wejście na `/pl/project/<uuid>?wariant=pod-klucz` dla produktu, który już ma slug, odpowiada 308 na `/pl/project/pomerania-40?wariant=pod-klucz`. Weryfikuje **AC-4**.
- Produkt bez nazwy: wejście na `/pl/project/<uuid>` dla produktu w trakcie kreatora (bez nazwy) renderuje normalnie, bez przekierowania. Weryfikuje **AC-5**.
- Indeksacja: produkt ze statusem innym niż `published`, otwarty przez bezpośredni link, renderuje się normalnie, ale `generateMetadata` niesie `robots: { index: false, follow: false }`. Weryfikuje **AC-7**.
- Wyrównanie istniejących danych: po uruchomieniu skryptu wyrównującego każdy istniejący produkt z nazwą i bez sluga ma go ustawiony, bez duplikatów. Weryfikuje **AC-8**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet, domyślnym dla epiki Produkcja (spec 0036 Build plan): najpierw jeden kompletny wątek (schemat + generowanie + jedna strona + przekierowanie), zweryfikowany, zanim rozszerzy się na drugą stronę i pozostałe miejsca linkujące.

1. Migracja: nowa kolumna `product.slug` (`text`, nullowalna, `.unique()`), `npm run db:generate` + `db:migrate`, satisfies **AC-1**
2. Pomocnik `lib/product-slug.ts`: funkcja licząca slug z nazwy (transliteracja polskich znaków, małe litery, myślniki) plus funkcja dopisująca krótki losowy sufiks przy kolizji, z testami jednostkowymi, satisfies **AC-1**, **AC-2**
3. Podłączenie pomocnika do `createProducerProduct` i `updateProducerProduct` (`lib/producer-product-actions.ts`): licz i zapisz slug tylko gdy dzisiejszy `slug` jest `null` a przychodząca nazwa jest niepusta; przy naruszeniu unikalności spróbuj ponownie z nowym sufiksem, satisfies **AC-1**, **AC-2**
4. Nowa funkcja odczytu `getProjectBySlugOrId(value, locale)` w `lib/data/projects.ts`: najpierw dopasowanie po `slug`, dopiero gdy brak trafienia i wartość ma kształt uuid, dopasowanie po `id` (ten sam wczesny return na kształt jak dzisiejszy `UUID_PATTERN` w `getProjectById`), satisfies **AC-3**
5. Zmiana folderu trasy `app/[locale]/(customer)/project/[id]/` na `[slug]/` (i analogicznie `outdoor-tv/[id]/` na `[slug]/`): podłączenie nowej funkcji odczytu, `redirect()` na kanoniczny adres ze slugiem (zachowując cały `searchParams`) gdy dopasowanie trafiło po `id` a produkt ma już slug, aktualizacja `generateMetadata` (kanoniczny adres, hreflang, `robots: noindex` dla statusu innego niż `published`), satisfies **AC-3**, **AC-4**, **AC-5**, **AC-7**
6. Aktualizacja `resolveProductHref()` (`lib/product-family-groups.ts`) i wszystkich wywołań budujących link do strony produktu (lista wyników, ulubione, porównywarka, podgląd producenta/administratora), żeby wstawiały `slug ?? id`, satisfies **AC-6**
7. Jednorazowy skrypt wyrównujący (`scripts/backfill-product-slugs.ts`), używający tego samego pomocnika z zadania 2, dla wszystkich istniejących wierszy `product` z niepustą nazwą i bez sluga, satisfies **AC-8**
8. Aktualizacja istniejących testów stron produktu na fixtury ze slugiem, nowe testy przekierowania (AC-4) i przejścia bez sluga (AC-5), satisfies **AC-9**

## Consequences

**Positive**:
- Udostępniany adres produktu staje się czytelny i wiarygodny ("modularhub.eu/project/pomerania-40"), spójny z tym, że karta podglądu (zdjęcie, tytuł, opis) już dziś wygląda dobrze.
- `id` nigdy nie przestaje działać: zero migracji już zapisanych referencji (ulubione, warianty, zapytania, panel producenta).
- Już udostępnione i zaindeksowane produkty (katalog Steel House i inne) dostają czytelny adres od razu po wyrównaniu (AC-8), z trwałym przekierowaniem chroniącym stare linki.
- Wycofane/szkicowe produkty przestają trafiać do wyników wyszukiwania (AC-7), bez utraty możliwości bezpośredniego podglądu przez link.

**Negative / tradeoffs**:
- Dwa sposoby trafienia na tę samą stronę (slug i id) to dodatkowa reguła w dwóch komponentach stron do przetestowania i utrzymania, nie jedna prosta trasa.
- Kolizja nazw kończy się slugiem z dopisanym losowym sufiksem (na przykład `pomerania-40-4f2a`), który nie jest tak czysty, jak podstawowa forma; rzadkie, ale możliwe.
- Każda przyszła ścieżka zapisu, która ustawia `product.name` poza `createProducerProduct`/`updateProducerProduct` (na przykład bezpośredni SQL przez skill scrape-steel-house albo przyszły skrypt importu), musi pamiętać o tej samej regule generowania sluga, inaczej nowo wprowadzony produkt zostaje bez sluga aż do następnego ręcznego wyrównania.

**Neutral**:
- Sam obrazek podglądu (`og:image`) się nie zmienia: zostaje prawdziwe zdjęcie okładki, tak jak dziś, bez nowej, generowanej grafiki z nakładką.
- Publiczne strony producenta (profil producenta) nie mają dziś żadnej publicznej trasy `[id]`, więc ta decyzja ich nie dotyka.

## Follow-up

- [ ] Brak dziś wiersza w `docs/scope/` wskazującego na tę decyzję; warto zapisać ją jako nową funkcję do zbudowania, żeby `/develop` miał gdzie śledzić postęp.
- [ ] Skill `scrape-steel-house` (i każda przyszła ścieżka importu pisząca `product` bezpośrednio przez Neon SQL) nie przechodzi przez `createProducerProduct`/`updateProducerProduct`, więc nie dostaje sluga automatycznie; wymaga albo wywołania tego samego pomocnika, albo ręcznego, powtarzalnego uruchamiania skryptu wyrównującego z zadania 7 po każdym takim imporcie.
- [ ] Funkcja 20 w `docs/scope/produkcja.md` ("SEO podstawowe stron publicznych", oznaczona "needs a decision") obejmuje sitemapę i dane strukturalne dla innych stron publicznych (start, wyniki); kiedy zostanie zaprojektowana, jej sitemapa dla stron produktów powinna czytać `product.slug`, nie duplikować własnej logiki adresu.

## Migration plan

**Strategy**: bezpieczna sekwencja migracji na żywym systemie (dodaj kolumnę nullowalną → wdróż kod, który zapisuje ją przy każdym nowym zapisie → wyrównaj istniejące wiersze jednorazowym skryptem), bez wielkiego wybuchu i bez flagi funkcji w runtime; kolejność zadań w `## Build plan` sama daje bezpieczeństwo (jeden kompletny wątek zweryfikowany przed rozszerzeniem).

**Phases**:
1. Zadania 1 do 4 z `## Build plan`: kolumna, pomocnik sluga, podłączenie do zapisu producenta, nowa funkcja odczytu. Po tym kroku nowe i edytowane produkty dostają slug, ale żadna strona jeszcze go nie używa w adresie (bezpieczne, w pełni odwracalne przez revert).
2. Zadanie 5: zmiana folderu trasy i przekierowanie, najpierw dla `/project/`, zweryfikowana samodzielnie (jeden kompletny wątek), potem `/outdoor-tv/` tym samym wzorcem.
3. Zadanie 6: aktualizacja wszystkich miejsc budujących link (`resolveProductHref` i wywołania), żeby zaczęły pokazywać slug tam, gdzie już istnieje.
4. Zadanie 7: jednorazowy skrypt wyrównujący dla produktów zapisanych przed tą zmianą, uruchomiony raz na produkcyjnej bazie po zweryfikowaniu kroków 1 do 3 na środowisku podglądowym.
5. Zadanie 8: testy.

**Rollback**: każdy krok kodu (zadania 2 do 6) cofa się zwykłym revertem commitu tego kroku; strona wraca do renderowania po `id` jak dziś, bo `id` nigdy nie przestaje działać w tej decyzji. Kolumna `slug` i wpisy z zadania 7 są czysto addytywne: pozostawienie ich po revertowaniu kodu tras jest nieszkodliwe (nieużywana kolumna), nie trzeba osobnej migracji wycofującej.

**Risks**: przekierowanie wydane z domyślnym kodem biblioteki (307) zamiast jawnie ustawionym 308 nie spełniałoby AC-4 mimo że wygląda na działające, tak jak to samo ryzyko odnotowane w spec 0036; naiwna zmiana `resolveProductHref` bez aktualizacji każdego wywołującego miejsca zostawiłaby część linków (na przykład podgląd producenta) wciąż na starym adresie zamiast sluga, mimo że produkt już go ma; równoczesny autosave kilku kroków kreatora producenta mógłby próbować ustawić slug dwa razy naraz dla tego samego produktu, złagodzone przez sprawdzenie "dzisiejszy slug jest null" przed zapisem (zadanie 3) i ponowną próbą przy naruszeniu unikalności; skrypt wyrównujący uruchomiony więcej niż raz musi być bezpieczny do powtórzenia (pomija wiersze, które już mają slug), inaczej druga produkcja może próbować nadpisać już istniejące slugi.
