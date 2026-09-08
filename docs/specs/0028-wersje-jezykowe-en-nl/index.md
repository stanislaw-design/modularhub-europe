# 0028. Wersje językowe (EN/NL) i przełącznik języka

**Date**: 2026-09-07
**Status**: In Progress

## Summary

Platforma ma dziś tylko jedną aktywną wersję językową (polską); segment `/[locale]/` w adresach istnieje, ale to sam szkielet routingu, bez żadnej biblioteki tłumaczeń ani przetłumaczonej treści. Ta decyzja dodaje prawdziwe wersje angielską i niderlandzką: silnik tłumaczeń next intl, wykrywanie języka przeglądarki przy pierwszej wizycie, działający przełącznik języka w nagłówku klienta i producenta (dziś wyłączony przycisk placeholder), poprawne tagi hreflang, oraz nową tabelę w bazie danych, żeby producent mógł ręcznie przetłumaczyć nazwę i opis swojego produktu. Dokumenty prawne (funkcja 5, jeszcze nieistniejąca) zostają świadomie poza zakresem i dostaną tłumaczenie później, tym samym mechanizmem.

## Context

Zobacz `rationale.md`.

## Requirements

**User stories**:
- Jako odwiedzający z zagranicy, chcę przeglądać stronę klienta po angielsku lub niderlandzku, żeby zrozumieć ofertę bez znajomości polskiego.
- Jako producent spoza Polski (albo obsługujący zagranicznych klientów), chcę przeglądać panel producenta w swoim języku i podać angielski/niderlandzki opis mojego produktu.
- Jako zalogowany użytkownik, chcę zmienić język jednym kliknięciem w nagłówku, bez utraty tego, co właśnie robiłem (ta sama strona, te same filtry w adresie URL).
- Jako wyszukiwarka (Google), chcę widzieć poprawne tagi hreflang, żeby pokazywać właściwą wersję językową właściwym użytkownikom.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: Każda publiczna i zalogowana strona klienta i producenta (wszystkie trasy pod `app/[locale]/klient/` i `app/[locale]/producent/`, plus `logowanie`) jest dostępna pod `/en` i `/nl` obok `/pl`, z przetłumaczoną statyczną treścią UI (nawigacja, przyciski, formularze, nagłówki, treść marketingowa, etykiety filtrów/enumów, nazwy krajów). `app/[locale]/internal/zapytania` (panel administratora) zostaje wyłącznie po polsku: wejście pod `/en/internal/...` lub `/nl/internal/...` przekierowuje na odpowiednik pod `/pl/internal/...` (panel nie renderuje się po angielsku/niderlandzku, nie zostaje po prostu "po polsku pod obcym prefiksem").
- **AC-2**: Odwiedzający bez ustawionego ciasteczka języka jest przy pierwszej wizycie przekierowany na podstawie nagłówka `Accept-Language` przeglądarki (najbliższe dopasowanie spośród pl/en/nl, domyślnie `/pl` gdy brak dopasowania); wybór zapamiętuje się w ciasteczku, więc kolejne wizyty nie są ponownie wykrywane.
- **AC-3**: Nierozpoznany segment języka w adresie (np. `/de/klient`) przekierowuje na ten sam adres pod domyślnym językiem (`/pl/klient`), zamiast zwracać 404.
- **AC-4**: Przełącznik języka (dziś wyłączony przycisk „PL ▾" w `SiteHeader`) działa i pokazuje trzy opcje (PL/EN/NL) w nagłówku klienta; równoważny przełącznik pojawia się też w `ProducerHeader` (dziś go tam nie ma). Wybór języka podmienia tylko segment języka w adresie, zachowując resztę ścieżki i wszystkie parametry zapytania (np. aktywne filtry na `/wyniki`), i zapisuje wybór w tym samym ciasteczku co wykrywanie z AC-2, więc kolejna wizyta pamięta świadomy wybór, nie tylko wykrycie z przeglądarki.
- **AC-5**: Nazwa i opis produktu (`product.name`, `product.description`) mają opcjonalne tłumaczenia EN i NL, zbierane w kreatorze projektu (krok podstawowych informacji) przez zakładki językowe obok istniejących pól polskich. Polski pozostaje wymagany i jest tekstem źródłowym.
- **AC-6**: Produkt bez tłumaczenia EN lub NL nadal pojawia się na `/en` i `/nl` (na liście wyników i stronie szczegółów), pokazując tekst polski zamiast pustego pola lub zniknięcia z listy.
- **AC-7**: Istniejące, prawdziwe produkty producentów (Budman, Cocomodule) mają uzupełnione tłumaczenia EN/NL nazwy i opisu, wprowadzone ręcznie przez Neon MCP jako jednorazowy backfill w ramach tej funkcji.
- **AC-8**: Strony z `generateMetadata` (dziś: strona szczegółów projektu, `docs/specs/0020`) niosą `alternates.languages` z poprawnymi adresami hreflang dla pl/en/nl tego samego zasobu, plus wpis `x-default` wskazujący na wersję `/pl` (bez tego wyszukiwarki nie wiedzą, którą wersję pokazać użytkownikowi spoza pl/en/nl).
- **AC-9**: Automatyczny test (Vitest) sprawdza, że trzy katalogi komunikatów (`messages/pl.json`, `en.json`, `nl.json`) mają dokładnie ten sam zestaw kluczy; brakujący klucz w jednym pliku psuje test.
- **AC-10**: Atrybut `lang` na `<html>` odzwierciedla aktywny język na każdej stronie (dziś ustawiany z parametru `locale`, do potwierdzenia po przejściu na next intl).

## Options considered

Zobacz `rationale.md`.

## Decision

**Chosen option**: Option 1: next intl jako silnik tłumaczeń, middleware next intl zastępujący dzisiejszy `proxy.ts`, nowa tabela `product_translation` dla treści producenta.

next intl obsłuży wyszukiwanie komunikatów, komponenty serwerowe, wykrywanie języka przeglądarki i ciasteczko wyboru w jednym miejscu, zastępując dzisiejszą ręczną logikę w `proxy.ts`. Treść producenta (nazwa/opis produktu) dostaje osobną, relacyjną tabelę tłumaczeń, bo to prawdziwe dane biznesowe, nie statyczny komunikat UI.

**Implementation skills**: `next-intl-app-router` (`liuchiawei/agent-skills`, `.agents/skills/next-intl-app-router/`) · `next-intl-add-language` (`github/awesome-copilot`, `.agents/skills/next-intl-add-language/`) · `nextjs-i18n` (`fusengine/agents`, `.agents/skills/nextjs-i18n/`)

## Rationale

Zobacz `rationale.md`.

## Feature design

**Data model sketch**:

- `product` (istniejąca tabela, bez zmian): `id` (PK), `name` (text, źródło prawdy po polsku), `description` (text, źródło prawdy po polsku), reszta bez zmian.
- `product_translation` (nowa tabela): `id` (uuid, PK), `product_id` (uuid, FK → `product.id`, bez `onDelete: cascade`, ta sama konwencja co siostrzane tabele `productCountryEligibility` itd., bo `product` używa miękkiego usuwania przez `deletedAt`), `locale` (nowy `pgEnum` `product_translation_locale`, tylko `'en'` lub `'nl'` — typowany enum jak `productStatusEnum`/`productFamilyEnum` już w tym schemacie, nie luźny `text`, żeby baza sama pilnowała dozwolonych wartości; polski zostaje na `product` samym), `name` (text, nullable), `description` (text, nullable), `createdAt`, `updatedAt`. `UNIQUE(product_id, locale)`, więc produkt ma najwyżej jeden wiersz EN i jeden wiersz NL.
- Relacja: `product` 1 — N `product_translation` (w praktyce najwyżej 2 wiersze na produkt).
- Rozwiązywanie tekstu do wyświetlenia dla danego `locale`: `pl` → `product.name`/`product.description` wprost; `en`/`nl` → wiersz `product_translation` dla tego `locale`, jeśli istnieje i pole nie jest puste, inaczej `product.name`/`product.description` (AC-6). Odczyt (`getProjects()`/`getProjectById`) robi to przez `LEFT JOIN product_translation` filtrowany po aktywnym `locale`, nie osobne zapytanie na produkt.

**State transitions**: nie dotyczy (brak maszyny stanów).

**API surface** (funkcje dostępu do danych / akcje serwerowe, nie REST):

| Funkcja / akcja | Warstwa | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| Zapis kroku podstawowego kreatora (rozszerzenie istniejącej akcji, funkcja 12/19) | `lib/db` akcja serwerowa | `productId`, `name`, `description`, opcjonalnie `nameEn`/`descriptionEn`/`nameNl`/`descriptionNl` | zapisany `product` + do dwóch wierszy `product_translation` (upsert) | sesja producenta, właściciel `product` | 403 gdy nie właściciel, 422 gdy polski `name`/`description` puste |
| Odczyt produktów/produktu (rozszerzenie `getProjects()`/odpowiednika `getProjectById`) | `lib/data` / `lib/db` | `locale` aktywny z routingu | `name`/`description` rozwiązane per `locale` (patrz reguła wyżej) | publiczne (tylko `status = 'published'` na stronach klienta) | brak nowych |

**Key invariants**:

- Produkt ma najwyżej jeden wiersz `product_translation` na `locale` (`en` lub `nl`), egzekwowane przez `UNIQUE(product_id, locale)`.
- Rozwiązywanie tekstu zawsze kończy się jakąś wartością: `pl` ma zawsze `product.name`/`description` (pola wymagane w formularzu), `en`/`nl` mają albo swoje tłumaczenie, albo polski fallback — nigdy pusty string na stronie klienta.
- Tylko producent będący właścicielem `product` może zapisać jego `product_translation` (ten sam warunek własności co dziś przy edycji produktu, rozszerzony o `product_id`).
- Katalogi komunikatów UI (`messages/pl.json`, `en.json`, `nl.json`) mają identyczny zestaw kluczy (AC-9); brak tłumaczenia klucza UI to błąd kompilacji/testu, nie ciche pominięcie (inaczej niż fallback treści producenta).

**Security model**:

Brak nowych ról. Zapis `product_translation` używa tego samego warunku własności co dzisiejsza edycja produktu (`product.producerId === session.producer.id`), rozszerzonego przez join po `product_id`. Odczyt jest publiczny na tych samych zasadach co dziś (`status = 'published'` na stronach klienta). Pola `name`/`description` to jawna treść marketingowa producenta, bez danych osobowych — funkcja nie dotyka zakresu RODO.

**Configuration required**: brak nowych zmiennych środowiskowych ani kluczy (tłumaczenie ręczne, next intl nie wymaga zewnętrznego API).

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: producent wypełnia angielską nazwę/opis w kreatorze, zapisuje; `/en/klient/wyniki` i `/en/klient/projekt/[id]` pokazują angielski tekst. Weryfikuje **AC-5**.
- Fallback: produkt bez tłumaczenia NL; `/nl/klient/wyniki` pokazuje polską nazwę/opis zamiast pustego pola. Weryfikuje **AC-6**.
- Zachowanie kontekstu przy przełączniku: na `/pl/klient/wyniki?sizeMin=80`, kliknięcie EN w przełączniku prowadzi do `/en/klient/wyniki?sizeMin=80` z tymi samymi wynikami. Weryfikuje **AC-4**.
- Nieznany język: wejście na `/de/klient` przekierowuje na `/pl/klient`. Weryfikuje **AC-3**.
- Wykrywanie przy pierwszej wizycie: żądanie z `Accept-Language: en-US;q=0.9` bez ciasteczka języka przekierowuje na `/en`; kolejne żądanie z tego samego przeglądarki (ciasteczko już ustawione) nie jest ponownie przekierowywane, nawet gdy nagłówek się zmieni. Weryfikuje **AC-2**.
- Spójność katalogów: usunięcie klucza tylko z `en.json` (nie z `pl.json`/`nl.json`) psuje test spójności Vitest. Weryfikuje **AC-9**.
- Hreflang: `generateMetadata` dla `/en/klient/projekt/abc` zawiera `alternates.languages` z poprawnymi adresami pl/en/nl tego samego projektu. Weryfikuje **AC-8**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet (dowieźć jeden prawdziwy wątek przez wszystkie warstwy, potem pogrubiać) zapisanym jako domyślne dla epiki Produkcja, ale rozbita na mniejsze, osobno odwracalne kroki (cross check wykazał, że wrzucenie "wydobądź KAŻDY string UI" i "podmień cały middleware" do jednego kroku robi z tego jeden wielki, trudny do zrewertowania commit): najpierw sam routing next intl z jednym aktywnym językiem (mały, bezpieczny diff), potem rozszerzenie o en/nl i wydobycie treści, potem dane producenta, na końcu pogrubianie prawdziwych tłumaczeń.

1. Migracja: tabela `product_translation` (`id`, `product_id` FK, `locale` jako `pgEnum`, `name`, `description`, `createdAt`, `updatedAt`, `UNIQUE(product_id, locale)`), satisfies **AC-5**, **AC-6**, **AC-7**
2. Instalacja next intl (plugin w `next.config.ts`, konfiguracja żądania i18n) skonfigurowana na start tylko z `pl` jako aktywnym językiem, zastępująca `proxy.ts` swoim middleware'em bez zmiany zachowania (mały, w pełni odwracalny diff routingu, zero zmiany treści), satisfies fundament pod **AC-2**, **AC-3**
3. Rozszerzenie middleware'a next intl o `en`/`nl`: wykrywanie `Accept-Language` przy braku ciasteczka, zapisanie wyboru w ciasteczku (współdzielone z przełącznikiem, zadanie 5), przekierowanie nierozpoznanego języka na `/pl`, jawne przekierowanie `/en/internal/...`/`/nl/internal/...` na `/pl/internal/...`, satisfies **AC-2**, **AC-3**, granica z **AC-1**
4. Wydobycie KAŻDEGO dzisiejszego, zaszytego na sztywno polskiego tekstu UI ze wszystkich tras klienta i producenta do `messages/pl.json`, podzielonego na przestrzenie nazw per obszar; `en.json` i `nl.json` na start jako dokładne kopie `pl.json` (poprawny, jawnie tymczasowy stan zanim dojdzie prawdziwe tłumaczenie); podpięcie stron do `useTranslations()`/`getTranslations()`, z `setRequestLocale`/`generateStaticParams` per język, żeby strony zostały statycznie renderowane tak jak dziś, zamiast wymuszenia dynamicznego renderowania na każdej stronie, satisfies **AC-1** (fundament), **AC-10**
5. Aktywacja przełącznika języka: wspólny komponent rozwijanej listy PL/EN/NL, podpięty w `SiteHeader` (zamiana dzisiejszego wyłączonego przycisku) i nowo dodany do `ProducerHeader`, przez API nawigacji next intl zachowujące ścieżkę i parametry zapytania oraz zapisujące wybór w ciasteczku, satisfies **AC-4**
6. Test spójności katalogów (Vitest): identyczny zestaw kluczy w `pl.json`/`en.json`/`nl.json`, satisfies **AC-9**
7. Hreflang: rozszerzenie `generateMetadata` strony szczegółów projektu (i każdej innej strony z `generateMetadata`) o `alternates.languages` plus `x-default`, satisfies **AC-8**
8. Przegląd i aktualizacja istniejących testów Playwright e2e, które dziś asertują polski tekst UI i gołe ścieżki `/pl`, żeby nie psuły się po rozszerzeniu routingu na trzy języki, satisfies regresję dla **AC-1**
9. Zakładki językowe w kroku podstawowym kreatora projektu (nowe pola `nameEn`/`descriptionEn`/`nameNl`/`descriptionNl`, polski wymagany jak dziś); rozszerzenie ścieżki odczytu (`getProjects()`/odpowiednik `getProjectById`) o `LEFT JOIN product_translation` i rozwiązywanie tekstu per `locale` z fallbackiem, satisfies **AC-5**, **AC-6**
10. Jednorazowy backfill EN/NL dla istniejących produktów Budman/Cocomodule przez Neon MCP, satisfies **AC-7**
11. Właściwe tłumaczenie: zamiana tymczasowych kopii w `en.json`/`nl.json` na prawdziwy angielski/niderlandzki tekst, strona po stronie klienta i producenta (poza `internal/zapytania`), satisfies **AC-1** (treść)

## Consequences

**Positive**:
- Ścieżka klienta i producenta staje się dostępna po angielsku i niderlandzku, otwierając platformę na niepolskojęzycznych kupujących i producentów — cel tej funkcji.
- Typowane katalogi next intl łapią brakujący klucz tłumaczenia na etapie budowania/testów (AC-9), zanim trafi na produkcję.
- Preferencja językowa respektuje przeglądarkę odwiedzającego i przetrwa nawigację przez przełącznik, zgodnie ze standardowym UX wielojęzycznych stron.

**Negative / tradeoffs**:
- Każdy przyszły tekst UI trzeba będzie dopisać do wszystkich trzech katalogów i przejść przez przegląd — to stały, mały koszt każdej kolejnej funkcji z treścią widoczną dla klienta lub producenta.
- Jakość tłumaczenia treści producenta zależy wyłącznie od tego, co producent sam wpisze po angielsku/niderlandzku; nic w tej funkcji nie sprawdza poprawności czy w ogóle obecności tego tłumaczenia poza testem spójności katalogów UI (który nie obejmuje treści producenta).
- Dzisiejszy, własny `proxy.ts` zostaje zastąpiony middleware'em next intl — nową zależnością, którą zespół musi poznać i utrzymywać na bieżąco; duża aktualizacja next intl stanie się realną pracą do zaplanowania.

**Neutral**:
- Tłumaczenie dokumentów prawnych (funkcja 5, baner zgody, polityka prywatności, regulamin) świadomie zostaje poza zakresem tej decyzji; kiedy funkcja 5 powstanie, powinna użyć tego samego mechanizmu katalogów next intl, nie nowego podejścia.
- Certyfikaty produktu i podpisy do galerii zostały świadomie pominięte, bo nie istnieją w prawdziwym (produkcyjnym) modelu danych dzisiaj (tylko w mocku); ich ewentualne dodanie do bazy to osobna, niepowiązana decyzja.

## Follow-up

- [ ] Kiedy funkcja 5 (RODO i zgodność prawna) zostanie zaprojektowana, jej treść (baner zgody, polityka prywatności, regulamin) powinna użyć tego samego mechanizmu next intl/`messages/`, a nie nowego podejścia do tłumaczeń.
- [ ] `app/sitemap.ts` (mapa strony XML per język) została świadomie pominięta w tej decyzji; rozważyć jako część przyszłego utwardzenia SEO.
- [ ] Jeśli certyfikaty produktu zostaną kiedyś przeniesione z mocka do prawdziwej bazy danych, ich tłumaczenie na EN/NL wymaga osobnej decyzji, nieobjętej tą specyfikacją.
- [ ] Root `AGENTS.md`: dodać next intl do sekcji `## Rules` (konwencja middleware/katalogów komunikatów) i zaktualizować `## Agent skills` o trzy nowo zainstalowane skille (`next-intl-app-router`, `next-intl-add-language`, `nextjs-i18n`) — zadanie `/sync`, nie tej specyfikacji.
- [ ] Sortowanie i wyszukiwanie pełnotekstowe po nazwie produktu (`search_vector`, spec 0026) zostaje po polsku niezależnie od aktywnego `locale` — ta funkcja nie dodaje osobnego indeksu per język. Jeśli okaże się to realnym problemem UX na `/en`/`/nl`, wymaga osobnej decyzji.
- [ ] Formatowanie liczb/dat/separatora dziesiętnego per język (np. `120,5 m²` po polsku vs `120.5 m²` po angielsku) świadomie zostaje poza zakresem tej decyzji; next intl to umie, ale nikt o to nie prosił — do rozważenia jako osobne, drobne rozszerzenie.

## Migration plan

**Strategy**: bez wielkiego wybuchu, ale też bez flagi funkcji w runtime, wystarczy sama kolejność zadań (patrz `## Build plan`) — `/en` i `/nl` nie mają dziś żadnego realnego ruchu, więc bezpiecznie jest przełączyć routing na cały serwis w jednym wdrożeniu, zanim treść jest w pełni przetłumaczona.

**Phases**:
1. Zadanie 2: sam middleware next intl zastępuje `proxy.ts`, wciąż tylko z `pl` (najmniejszy, w pełni odwracalny diff routingu, zero zmiany treści) — osobny, łatwy do zrewertowania commit zanim dojdzie cokolwiek szerszego.
2. Zadania 3 do 8: rozszerzenie o `en`/`nl` (wykrywanie, ciasteczko, katalogi komunikatów, przełącznik, hreflang, test spójności, aktualizacja e2e) w jednym wdrożeniu; `/en` i `/nl` stają się w pełni nawigowalne, ale chwilowo pokazują polski tekst jako `en.json`/`nl.json` (poprawny, jawny stan tymczasowy, nie błąd).
3. Zadania 1 i 9: migracja `product_translation` i zakładki językowe w kreatorze z rozwiązywaniem tekstu z fallbackiem po stronie odczytu — producenci mogą zacząć wpisywać prawdziwe tłumaczenia.
4. Zadania 10 i 11: jednorazowy backfill Budman/Cocomodule, oraz stopniowa zamiana tymczasowych kopii w katalogach na prawdziwe tłumaczenia, strona po stronie, każda osobnym, zwykłym PR.

**Rollback**: każda faza cofa się przez zwykły revert commitu/commitów tej fazy. Faza 1 (podmiana `proxy.ts` na middleware next intl) jest jedyną dotykającą każde żądanie do serwisu — pokryta dzisiejszymi testami e2e (Playwright) przed scaleniem.

**Risks**: nieusunięty, zaszyty na sztywno polski tekst przetrwały w komponencie po zadaniu 4 (wydobycie stringów) pokazałby się nieprzetłumaczony na `/en`/`/nl` (łagodzi test spójności katalogów, zadanie 6, plus ręczny przegląd wymieniony w AC-1); błąd w regule fallbacku `product_translation` pokazałby pusty tekst zamiast polskiego (pokryte scenariuszem testowym w `## Feature design`, AC-6); ponieważ `en.json`/`nl.json` startują jako dokładne kopie `pl.json`, test spójności (zadanie 6) sam nie odróżni "jeszcze nieprzetłumaczone" od "celowo identyczne" — zadanie 11 (właściwe tłumaczenie) zostaje ręcznym, śledzonym w tym spisie przeglądem strona po stronie, nie automatyczną gwarancją.
