# 0028. Wersje językowe (PL/EN/NL/DE) i przełącznik języka

**Date**: 2026-09-07 (rozszerzone o niemiecki 2026-09-15)
**Status**: In Progress

## Summary

Platforma ma dziś tylko jedną aktywną wersję językową (polską); segment `/[locale]/` w adresach istnieje, ale to sam szkielet routingu, bez żadnej biblioteki tłumaczeń ani przetłumaczonej treści. Ta decyzja dodaje prawdziwe wersje angielską i niderlandzką: silnik tłumaczeń next intl, wykrywanie języka przeglądarki przy pierwszej wizycie, działający przełącznik języka w nagłówku klienta i producenta (dziś wyłączony przycisk placeholder), poprawne tagi hreflang, oraz nową tabelę w bazie danych, żeby producent mógł ręcznie przetłumaczyć nazwę i opis swojego produktu. Dokumenty prawne (funkcja 5, jeszcze nieistniejąca) zostają świadomie poza zakresem i dostaną tłumaczenie później, tym samym mechanizmem.

**Rozszerzenie (2026-09-15)**: ten sam mechanizm dostaje czwarty język, niemiecki. Ponieważ cały routing, przełącznik i tagi hreflang są już zbudowane generycznie na liście `routing.locales` (nie na sztywno wpisanym pl/en/nl), dodanie niemieckiego to w większości jedna zmiana konfiguracji plus nowy katalog tłumaczeń i nowa wartość enuma w bazie danych, nie przebudowa mechanizmu. Poniższe sekcje są zaktualizowane tak, żeby opisywać docelowy stan czterech języków; historię decyzji o wyborze next intl i modelu tabeli `product_translation` opisuje `rationale.md` bez zmian.

## Context

Zobacz `rationale.md`.

## Requirements

**User stories**:
- Jako odwiedzający z zagranicy, chcę przeglądać stronę klienta po angielsku lub niderlandzku, żeby zrozumieć ofertę bez znajomości polskiego.
- Jako producent spoza Polski (albo obsługujący zagranicznych klientów), chcę przeglądać panel producenta w swoim języku i podać angielski/niderlandzki opis mojego produktu.
- Jako zalogowany użytkownik, chcę zmienić język jednym kliknięciem w nagłówku, bez utraty tego, co właśnie robiłem (ta sama strona, te same filtry w adresie URL).
- Jako wyszukiwarka (Google), chcę widzieć poprawne tagi hreflang, żeby pokazywać właściwą wersję językową właściwym użytkownikom.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: Każda publiczna i zalogowana strona klienta i producenta (wszystkie trasy pod `app/[locale]/klient/` i `app/[locale]/producent/`, plus `logowanie`) jest dostępna pod `/en`, `/nl` i `/de` obok `/pl`, z przetłumaczoną statyczną treścią UI (nawigacja, przyciski, formularze, nagłówki, treść marketingowa, etykiety filtrów/enumów, nazwy krajów). `app/[locale]/internal/zapytania` (panel administratora) zostaje wyłącznie po polsku: wejście pod `/en/internal/...`, `/nl/internal/...` lub `/de/internal/...` przekierowuje na odpowiednik pod `/pl/internal/...` (panel nie renderuje się w żadnym innym języku, nie zostaje po prostu "po polsku pod obcym prefiksem").
- **AC-2**: Odwiedzający bez ustawionego ciasteczka języka jest przy pierwszej wizycie przekierowany na podstawie nagłówka `Accept-Language` przeglądarki (najbliższe dopasowanie spośród pl/en/nl/de, domyślnie `/pl` gdy brak dopasowania); wybór zapamiętuje się w ciasteczku, więc kolejne wizyty nie są ponownie wykrywane.
- **AC-3**: Nierozpoznany segment języka w adresie (np. `/fr/klient`, dowolny dwuliterowy kod spoza pl/en/nl/de) przekierowuje na ten sam adres pod domyślnym językiem (`/pl/klient`), zamiast zwracać 404. Po rozszerzeniu o niemiecki, `/de/klient` przestaje pasować do tej reguły i renderuje się po niemiecku jak każdy inny rozpoznany język (patrz test i komentarz w `proxy.ts`, do zaktualizowania na inny przykład).
- **AC-4**: Przełącznik języka (dziś wyłączony przycisk „PL ▾" w `SiteHeader`, po zbudowaniu tej funkcji już aktywny) pokazuje cztery opcje (PL/EN/NL/DE) w nagłówku klienta; równoważny przełącznik działa też w `ProducerHeader`. Wybór języka podmienia tylko segment języka w adresie, zachowując resztę ścieżki i wszystkie parametry zapytania (np. aktywne filtry na `/wyniki`), i zapisuje wybór w tym samym ciasteczku co wykrywanie z AC-2, więc kolejna wizyta pamięta świadomy wybór, nie tylko wykrycie z przeglądarki.
- **AC-5**: Nazwa i opis produktu (`product.name`, `product.description`) mają opcjonalne tłumaczenia EN, NL i DE, zbierane w kreatorze projektu (krok podstawowych informacji) przez zakładki językowe obok istniejących pól polskich. Polski pozostaje wymagany i jest tekstem źródłowym. (Sama zakładka DE w kreatorze dzieli los EN/NL: zapis producenta zostaje odłożony razem z całą ścieżką, patrz `verify.md` i Build plan zadanie 8 poniżej.)
- **AC-6**: Produkt bez tłumaczenia EN, NL lub DE nadal pojawia się na `/en`, `/nl` i `/de` (na liście wyników i stronie szczegółów), pokazując tekst polski zamiast pustego pola lub zniknięcia z listy.
- **AC-7**: Istniejące, prawdziwe, opublikowane produkty wszystkich producentów (53 produkty, 6 producentów, ten sam zakres co poprzedni backfill EN/NL) mają uzupełnione tłumaczenie DE nazwy i opisu, wprowadzone ręcznie przez Neon MCP jako jednorazowy backfill w ramach tego rozszerzenia.
- **AC-8**: Strony z `generateMetadata` (dziś: strona szczegółów projektu, `docs/specs/0020`) niosą `alternates.languages` z poprawnymi adresami hreflang dla pl/en/nl/de tego samego zasobu, plus wpis `x-default` wskazujący na wersję `/pl` (bez tego wyszukiwarki nie wiedzą, którą wersję pokazać użytkownikowi spoza pl/en/nl/de). Ta AC nie wymaga zmiany kodu: `languageAlternates` w `app/[locale]/(customer)/project/[id]/page.tsx` jest już zbudowane z `routing.locales.map(...)`, więc automatycznie obejmie niemiecki po zadaniu 2 w Build plan.
- **AC-9**: Automatyczny test (Vitest) sprawdza, że cztery katalogi komunikatów (`messages/pl.json`, `en.json`, `nl.json`, `de.json`) mają dokładnie ten sam zestaw kluczy; brakujący klucz w jednym pliku psuje test.
- **AC-10**: Atrybut `lang` na `<html>` odzwierciedla aktywny język na każdej stronie (dziś ustawiany z parametru `locale`, do potwierdzenia po przejściu na next intl).

## Options considered

Zobacz `rationale.md`.

## Decision

**Chosen option**: Option 1: next intl jako silnik tłumaczeń, middleware next intl zastępujący dzisiejszy `proxy.ts`, nowa tabela `product_translation` dla treści producenta.

next intl obsłuży wyszukiwanie komunikatów, komponenty serwerowe, wykrywanie języka przeglądarki i ciasteczko wyboru w jednym miejscu, zastępując dzisiejszą ręczną logikę w `proxy.ts`. Treść producenta (nazwa/opis produktu) dostaje osobną, relacyjną tabelę tłumaczeń, bo to prawdziwe dane biznesowe, nie statyczny komunikat UI.

**Rozszerzenie o niemiecki**: `productTranslationLocaleEnum` (`lib/db/schema.ts`) dostaje trzecią wartość `'de'` obok `'en'`/`'nl'`, przez `ALTER TYPE ... ADD VALUE`, ten sam, jednokierunkowy wzorzec co już użyty przy rozszerzeniu `product_family` o `'kontenery-modulowe'` (`drizzle/0015_young_justice.sql`; Postgres nie pozwala na `DROP VALUE`, więc to świadomie zaakceptowane ograniczenie, nie nowe ryzyko). Katalog `messages/de.json` dostaje od razu pełne, prawdziwe tłumaczenie niemieckie w tonie formalnym (odpowiednik „Sie"), zamiast przechodzić przez etap tymczasowej kopii `pl.json`, którym zaczynały en/nl w oryginalnym Build plan (patrz Rationale niżej): ten etap dojrzałości mechanizmu next intl jest już za nami, en.json i nl.json są dziś pełnymi tłumaczeniami, nie kopiami.

**Implementation skills**: `next-intl-app-router` (`liuchiawei/agent-skills`, `.agents/skills/next-intl-app-router/`) · `next-intl-add-language` (`github/awesome-copilot`, `.agents/skills/next-intl-add-language/`) · `nextjs-i18n` (`fusengine/agents`, `.agents/skills/nextjs-i18n/`)

## Rationale

Zobacz `rationale.md`.

## Feature design

**Data model sketch**:

- `product` (istniejąca tabela, bez zmian): `id` (PK), `name` (text, źródło prawdy po polsku), `description` (text, źródło prawdy po polsku), reszta bez zmian.
- `product_translation` (nowa tabela): `id` (uuid, PK), `product_id` (uuid, FK → `product.id`, bez `onDelete: cascade`, ta sama konwencja co siostrzane tabele `productCountryEligibility` itd., bo `product` używa miękkiego usuwania przez `deletedAt`), `locale` (`pgEnum` `product_translation_locale`, wartości `'en'`, `'nl'`, `'de'`, typowany enum jak `productStatusEnum`/`productFamilyEnum` już w tym schemacie, nie luźny `text`, żeby baza sama pilnowała dozwolonych wartości; polski zostaje na `product` samym), `name` (text, nullable), `description` (text, nullable), `createdAt`, `updatedAt`. `UNIQUE(product_id, locale)`, więc produkt ma najwyżej jeden wiersz na każdy z trzech języków.
- Relacja: `product` do `product_translation` to jeden do wielu (w praktyce najwyżej 3 wiersze na produkt, po jednym na en/nl/de).
- Rozwiązywanie tekstu do wyświetlenia dla danego `locale`: `pl` → `product.name`/`product.description` wprost; `en`/`nl`/`de` → wiersz `product_translation` dla tego `locale`, jeśli istnieje i pole nie jest puste, inaczej `product.name`/`product.description` (AC-6). Odczyt (`getProjects()`/`getProjectById`) robi to przez `LEFT JOIN product_translation` filtrowany po aktywnym `locale`, nie osobne zapytanie na produkt. Ta reguła nie zmienia się przy dodaniu niemieckiego, bo już jest sparametryzowana po `locale`, nie po sztywno wpisanej liście dwóch języków.

**State transitions**: nie dotyczy (brak maszyny stanów).

**API surface** (funkcje dostępu do danych / akcje serwerowe, nie REST):

| Funkcja / akcja | Warstwa | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| Zapis kroku podstawowego kreatora (rozszerzenie istniejącej akcji, funkcja 12/19) | `lib/db` akcja serwerowa | `productId`, `name`, `description`, opcjonalnie `nameEn`/`descriptionEn`/`nameNl`/`descriptionNl`/`nameDe`/`descriptionDe` | zapisany `product` + do trzech wierszy `product_translation` (upsert) | sesja producenta, właściciel `product` | 403 gdy nie właściciel, 422 gdy polski `name`/`description` puste |
| Odczyt produktów/produktu (rozszerzenie `getProjects()`/odpowiednika `getProjectById`) | `lib/data` / `lib/db` | `locale` aktywny z routingu | `name`/`description` rozwiązane per `locale` (patrz reguła wyżej) | publiczne (tylko `status = 'published'` na stronach klienta) | brak nowych |

**Key invariants**:

- Produkt ma najwyżej jeden wiersz `product_translation` na `locale` (`en`, `nl` lub `de`), egzekwowane przez `UNIQUE(product_id, locale)`.
- Rozwiązywanie tekstu zawsze kończy się jakąś wartością: `pl` ma zawsze `product.name`/`description` (pola wymagane w formularzu), `en`/`nl`/`de` mają albo swoje tłumaczenie, albo polski fallback, nigdy pusty string na stronie klienta.
- Tylko producent będący właścicielem `product` może zapisać jego `product_translation` (ten sam warunek własności co dziś przy edycji produktu, rozszerzony o `product_id`).
- Katalogi komunikatów UI (`messages/pl.json`, `en.json`, `nl.json`, `de.json`) mają identyczny zestaw kluczy (AC-9); brak tłumaczenia klucza UI to błąd kompilacji/testu, nie ciche pominięcie (inaczej niż fallback treści producenta).

**Security model**:

Brak nowych ról. Zapis `product_translation` używa tego samego warunku własności co dzisiejsza edycja produktu (`product.producerId === session.producer.id`), rozszerzonego przez join po `product_id`. Odczyt jest publiczny na tych samych zasadach co dziś (`status = 'published'` na stronach klienta). Pola `name`/`description` to jawna treść marketingowa producenta, bez danych osobowych — funkcja nie dotyka zakresu RODO.

**Configuration required**: brak nowych zmiennych środowiskowych ani kluczy (tłumaczenie ręczne, next intl nie wymaga zewnętrznego API).

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: producent wypełnia angielską nazwę/opis w kreatorze, zapisuje; `/en/klient/wyniki` i `/en/klient/projekt/[id]` pokazują angielski tekst. Weryfikuje **AC-5**.
- Fallback: produkt bez tłumaczenia DE; `/de/klient/wyniki` pokazuje polską nazwę/opis zamiast pustego pola. Weryfikuje **AC-6**.
- Zachowanie kontekstu przy przełączniku: na `/pl/klient/wyniki?sizeMin=80`, kliknięcie DE w przełączniku prowadzi do `/de/klient/wyniki?sizeMin=80` z tymi samymi wynikami. Weryfikuje **AC-4**.
- Nieznany język: wejście na `/fr/klient` przekierowuje na `/pl/klient`; wejście na `/de/klient` (po zbudowaniu tego rozszerzenia) już NIE przekierowuje, renderuje się po niemiecku. Weryfikuje **AC-3**.
- Wykrywanie przy pierwszej wizycie: żądanie z `Accept-Language: de-DE;q=0.9` bez ciasteczka języka przekierowuje na `/de`; kolejne żądanie z tego samego przeglądarki (ciasteczko już ustawione) nie jest ponownie przekierowywane, nawet gdy nagłówek się zmieni. Weryfikuje **AC-2**.
- Spójność katalogów: usunięcie klucza tylko z `de.json` (nie z pozostałych trzech) psuje test spójności Vitest. Weryfikuje **AC-9**.
- Hreflang: `generateMetadata` dla `/de/klient/projekt/abc` zawiera `alternates.languages` z poprawnymi adresami pl/en/nl/de tego samego projektu. Weryfikuje **AC-8**.

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
9. Zakładki językowe w kroku podstawowym kreatora projektu (nowe pola `nameEn`/`descriptionEn`/`nameNl`/`descriptionNl`, polski wymagany jak dziś; `nameDe`/`descriptionDe` dołączają po zadaniu 12 poniżej); rozszerzenie ścieżki odczytu (`getProjects()`/odpowiednik `getProjectById`) o `LEFT JOIN product_translation` i rozwiązywanie tekstu per `locale` z fallbackiem, satisfies **AC-5**, **AC-6**
10. Jednorazowy backfill EN/NL dla istniejących produktów Budman/Cocomodule przez Neon MCP, satisfies **AC-7**
11. Właściwe tłumaczenie: zamiana tymczasowych kopii w `en.json`/`nl.json` na prawdziwy angielski/niderlandzki tekst, strona po stronie klienta i producenta (poza `internal/zapytania`), satisfies **AC-1** (treść)

**Rozszerzenie o niemiecki (zadania 12 do 18, dodane 2026-09-15).** Kolejność zachowuje ten sam instynkt Tracer Bullet co zadania 1 do 11: najpierw najmniejsza, w pełni odwracalna zmiana routingu (zadanie 13), potem treść i testy, na końcu dane produkcyjne (zadanie 18). Ponieważ przełącznik, blokada panelu administratora i hreflang są już zbudowane generycznie na `routing.locales`, zadanie 13 automatycznie włącza niemiecki wszędzie tam, bez osobnych zadań na każdy z nich.

12. Migracja: dodanie wartości `'de'` do `productTranslationLocaleEnum` (`ALTER TYPE product_translation_locale ADD VALUE 'de'`), tym samym wzorcem co `drizzle/0015_young_justice.sql`, satisfies **AC-5**, **AC-6**, **AC-7**
13. Dodanie `"de"` do `routing.locales` w `lib/i18n/routing.ts` (jedna linia); `LanguageSwitcher`, blokada `/de/internal/...` w `proxy.ts` i `alternates.languages` w `generateMetadata` czytają tę listę, więc automatycznie obejmują niemiecki bez dalszych zmian kodu, satisfies fundament **AC-1**, **AC-2**, **AC-4**, **AC-8**
14. Aktualizacja przykładu nierozpoznanego języka w komentarzu i teście `proxy.ts` (dziś `/de/klient`) na kod wciąż nieobsługiwany (np. `/fr`), bo `/de` przestaje pasować do tej gałęzi po zadaniu 13, satisfies regresję **AC-3**
15. Utworzenie `messages/de.json`: pełne, prawdziwe tłumaczenie niemieckie (nie tymczasowa kopia `pl.json`, patrz Decision) z identycznym zestawem kluczy co `pl.json`/`en.json`/`nl.json`, w formalnym tonie (odpowiednik „Sie", ten sam rejestr co `u`/`uw` już użyte w `nl.json`), satisfies **AC-1**, **AC-9**
16. Rozszerzenie `lib/i18n/messages.test.ts` o import `de.json` i test porównujący jego klucze z `pl.json`, tym samym wzorcem co istniejące testy `en`/`nl`, satisfies **AC-9**
17. Aktualizacja testów, które dziś zakładają dokładnie trzy języki: `components/ui/LanguageSwitcher.test.tsx` ("shows PL/EN/NL as the three options" rozszerzone o DE) i przegląd testów e2e Playwright pod kątem tego samego założenia, satisfies regresję **AC-4**, **AC-1**
18. Jednorazowy backfill niemieckiego tłumaczenia nazwy/opisu dla wszystkich 53 opublikowanych produktów (6 producentów), ten sam zakres co wcześniejszy backfill EN/NL, przez Neon MCP, satisfies **AC-7**

Zakładka DE w kreatorze projektu (część AC-5) nie dostaje osobnego zadania: dzieli już podjętą decyzję o odłożeniu całej ścieżki zapisu producenta (funkcje 12/19 wciąż na `localStorage`/mocku), więc powstanie razem z EN/NL, kiedy ta ścieżka zostanie zaprojektowana.

## Consequences

**Positive**:
- Ścieżka klienta i producenta staje się dostępna po angielsku i niderlandzku, otwierając platformę na niepolskojęzycznych kupujących i producentów — cel tej funkcji.
- Typowane katalogi next intl łapią brakujący klucz tłumaczenia na etapie budowania/testów (AC-9), zanim trafi na produkcję.
- Preferencja językowa respektuje przeglądarkę odwiedzającego i przetrwa nawigację przez przełącznik, zgodnie ze standardowym UX wielojęzycznych stron.

**Negative / tradeoffs**:
- Każdy przyszły tekst UI trzeba będzie dopisać do wszystkich czterech katalogów i przejść przez przegląd, jeden język więcej niż przy pierwotnej decyzji. To stały, rosnący koszt każdej kolejnej funkcji z treścią widoczną dla klienta lub producenta.
- Jakość tłumaczenia treści producenta zależy wyłącznie od tego, co producent sam wpisze po angielsku/niderlandzku/niemiecku; nic w tej funkcji nie sprawdza poprawności czy w ogóle obecności tego tłumaczenia poza testem spójności katalogów UI (który nie obejmuje treści producenta).
- Dzisiejszy, własny `proxy.ts` zostaje zastąpiony middleware'em next intl — nową zależnością, którą zespół musi poznać i utrzymywać na bieżąco; duża aktualizacja next intl stanie się realną pracą do zaplanowania.
- Enum `product_translation_locale` rośnie tylko w jedną stronę (Postgres nie ma `ALTER TYPE ... DROP VALUE`); usunięcie języka w przyszłości wymagałoby przebudowy typu jak przy `product_family` (spec 0039), nie prostego dopisania.

**Neutral**:
- Tłumaczenie dokumentów prawnych (funkcja 5, baner zgody, polityka prywatności, regulamin) świadomie zostaje poza zakresem tej decyzji; kiedy funkcja 5 powstanie, powinna użyć tego samego mechanizmu katalogów next intl, nie nowego podejścia.
- Certyfikaty produktu i podpisy do galerii zostały świadomie pominięte, bo nie istnieją w prawdziwym (produkcyjnym) modelu danych dzisiaj (tylko w mocku); ich ewentualne dodanie do bazy to osobna, niepowiązana decyzja.

## Follow-up

- [ ] Kiedy funkcja 5 (RODO i zgodność prawna) zostanie zaprojektowana, jej treść (baner zgody, polityka prywatności, regulamin) powinna użyć tego samego mechanizmu next intl/`messages/`, a nie nowego podejścia do tłumaczeń, i objąć od razu wszystkie cztery języki.
- [ ] `app/sitemap.ts` (mapa strony XML per język) została świadomie pominięta w tej decyzji; rozważyć jako część przyszłego utwardzenia SEO.
- [ ] Jeśli certyfikaty produktu zostaną kiedyś przeniesione z mocka do prawdziwej bazy danych, ich tłumaczenie na EN/NL/DE wymaga osobnej decyzji, nieobjętej tą specyfikacją.
- [ ] Root `AGENTS.md`: dodać next intl do sekcji `## Rules` (konwencja middleware/katalogów komunikatów, teraz cztery aktywne języki) i zaktualizować `## Agent skills` o trzy nowo zainstalowane skille (`next-intl-app-router`, `next-intl-add-language`, `nextjs-i18n`), zadanie `/sync`, nie tej specyfikacji.
- [ ] Sortowanie i wyszukiwanie pełnotekstowe po nazwie produktu (`search_vector`, spec 0026) zostaje po polsku niezależnie od aktywnego `locale`, ta funkcja nie dodaje osobnego indeksu per język. Jeśli okaże się to realnym problemem UX na `/en`/`/nl`/`/de`, wymaga osobnej decyzji.
- [ ] Formatowanie liczb/dat/separatora dziesiętnego per język (np. `120,5 m²` po polsku vs `120.5 m²` po angielsku vs `120,5 m²` po niemiecku) świadomie zostaje poza zakresem tej decyzji; next intl to umie, ale nikt o to nie prosił, do rozważenia jako osobne, drobne rozszerzenie.
- [ ] `docs/scope/produkcja.md`, funkcja 25: tytuł i `Done when` wciąż mówią "EN/NL"; do zaktualizowania na cztery języki po potwierdzeniu tej specyfikacji (krok po tej rozmowie, nie osobne zadanie `/sync`).

## Migration plan

**Strategy**: bez wielkiego wybuchu, ale też bez flagi funkcji w runtime, wystarczy sama kolejność zadań (patrz `## Build plan`) — `/en` i `/nl` nie mają dziś żadnego realnego ruchu, więc bezpiecznie jest przełączyć routing na cały serwis w jednym wdrożeniu, zanim treść jest w pełni przetłumaczona.

**Phases**:
1. Zadanie 2: sam middleware next intl zastępuje `proxy.ts`, wciąż tylko z `pl` (najmniejszy, w pełni odwracalny diff routingu, zero zmiany treści) — osobny, łatwy do zrewertowania commit zanim dojdzie cokolwiek szerszego.
2. Zadania 3 do 8: rozszerzenie o `en`/`nl` (wykrywanie, ciasteczko, katalogi komunikatów, przełącznik, hreflang, test spójności, aktualizacja e2e) w jednym wdrożeniu; `/en` i `/nl` stają się w pełni nawigowalne, ale chwilowo pokazują polski tekst jako `en.json`/`nl.json` (poprawny, jawny stan tymczasowy, nie błąd).
3. Zadania 1 i 9: migracja `product_translation` i zakładki językowe w kreatorze z rozwiązywaniem tekstu z fallbackiem po stronie odczytu — producenci mogą zacząć wpisywać prawdziwe tłumaczenia.
4. Zadania 10 i 11: jednorazowy backfill Budman/Cocomodule, oraz stopniowa zamiana tymczasowych kopii w katalogach na prawdziwe tłumaczenia, strona po stronie, każda osobnym, zwykłym PR.
5. **(Rozszerzenie o niemiecki)** Zadanie 12 (dodanie `'de'` do enuma) i zadanie 13 (dodanie `"de"` do `routing.locales`) w jednym, małym, w pełni odwracalnym wdrożeniu, ten sam instynkt co faza 1: `/de` staje się w pełni nawigowalne od razu z prawdziwym niemieckim tekstem (zadanie 15 dostarcza pełne tłumaczenie od startu, nie tymczasową kopię, patrz Decision), więc nie ma tu odpowiednika przejściowego stanu "polski tekst pod obcym prefiksem" z fazy 2.
6. **(Rozszerzenie o niemiecki)** Zadanie 18: jednorazowy backfill niemieckiego dla wszystkich 53 opublikowanych produktów, osobnym wdrożeniem po ustabilizowaniu routingu i katalogu.

**Rollback**: każda faza cofa się przez zwykły revert commitu/commitów tej fazy. Faza 1 (podmiana `proxy.ts` na middleware next intl) jest jedyną dotykającą każde żądanie do serwisu, pokryta dzisiejszymi testami e2e (Playwright) przed scaleniem. Faza 5 (dodanie niemieckiego) dotyka tego samego middleware'a, więc dostaje tę samą ochronę: pokrycie e2e przed scaleniem, plus zadanie 14 (aktualizacja przykładu nierozpoznanego języka), żeby nie zostawić testu asertującego stare, już nieprawdziwe zachowanie `/de`.

**Risks**: nieusunięty, zaszyty na sztywno polski tekst przetrwały w komponencie po zadaniu 4 (wydobycie stringów) pokazałby się nieprzetłumaczony na `/en`/`/nl`/`/de` (łagodzi test spójności katalogów, zadanie 6/16, plus ręczny przegląd wymieniony w AC-1). Błąd w regule fallbacku `product_translation` pokazałby pusty tekst zamiast polskiego (pokryte scenariuszem testowym w `## Feature design`, AC-6). Ponieważ `en.json`/`nl.json` startowały jako dokładne kopie `pl.json`, test spójności sam nie odróżnia "jeszcze nieprzetłumaczone" od "celowo identyczne" dla treści wydobytej po fazie 2, więc zadanie 11 (właściwe tłumaczenie EN/NL) zostaje ręcznym, śledzonym w tym spisie przeglądem strona po stronie, nie automatyczną gwarancją. `de.json` unika tego konkretnego ryzyka, bo zadanie 15 dostarcza od razu prawdziwe tłumaczenie zamiast kopii, ale wciąż zależy od tego, że zadanie 4 (wydobycie stringów do next intl) faktycznie objęło każdą stronę: string zaszyty na sztywno w komponencie nie przejdzie przez żaden katalog, niemiecki włącznie.
