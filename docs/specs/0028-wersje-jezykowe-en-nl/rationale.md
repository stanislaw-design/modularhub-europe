# 0028. Wersje językowe (PL/EN/NL/DE) i przełącznik języka, uzasadnienie

## Context

Platforma ModularHub Europe dziś obsługuje wyłącznie polską wersję językową. Segment `/[locale]/` w adresach (`app/[locale]/klient/...`, `app/[locale]/producent/...`) już istnieje, `app/i18n.ts` deklaruje `locales = ["pl"]`, a `proxy.ts` przekierowuje każdą ścieżkę bez prefiksu na `/pl`, niezależnie od języka przeglądarki odwiedzającego. To sam szkielet routingu: żadna biblioteka tłumaczeń nie jest zainstalowana, żaden komunikat UI nie jest wydzielony do osobnego pliku, a `SiteHeader` ma już gotowy, ale wyłączony przycisk „PL ▾" czekający na funkcjonalność.

Zamawiający poprosił wprost o rozszerzenie na angielski i niderlandzki, budowane jako Slice 0 (zaraz po fundamentach epiki Produkcja, przed dalszym ciągiem slice'ów transakcyjnych), zapisane w `docs/scope/produkcja.md` jako funkcja 25. Ten sam wiersz scope wiąże tę funkcję z przetłumaczonymi dokumentami prawnymi z funkcji 5 (RODO i zgodność prawna) — ale funkcja 5 ma dziś status `needs a decision`, żaden baner zgody, polityka prywatności ani regulamin jeszcze nie istnieją. Ta rozbieżność została jawnie rozstrzygnięta w rozmowie projektowej: dokumenty prawne zostają poza zakresem tej decyzji, a funkcja 5, kiedy powstanie, odziedziczy ten sam mechanizm tłumaczeń.

Druga siła w grze: treść na stronach klienta nie jest wyłącznie statycznym UI. Nazwa i opis produktu to tekst wpisywany przez producenta w kreatorze (funkcja 12/19) — dziś wyłącznie po polsku, bez żadnego mechanizmu tłumaczenia. Zamawiający zdecydował, że ta treść też ma być tłumaczalna (a nie zostawiona po polsku jak na realnych marketplace'ach typu Airbnb), co wprowadza prawdziwą zmianę modelu danych, nie tylko routing i katalogi komunikatów. W toku rozmowy okazało się też, że dwa pierwotnie rozważane pola (certyfikaty, podpisy do galerii) nie istnieją w prawdziwej (produkcyjnej) tabeli `product` — żyją wyłącznie w warstwie mockowej (`lib/data/types.ts`, epika Prototyp) — więc zostały świadomie wyłączone z zakresu tłumaczenia treści dynamicznej.

Trzecia siła: stack projektu (Next.js 16 App Router, TypeScript, brak dotychczasowej biblioteki i18n) wymaga wyboru silnika tłumaczeń od zera — to największa, najbardziej obciążająca decyzję w tej specyfikacji, bo determinuje, jak wygląda każda przyszła strona z tekstem widocznym dla klienta lub producenta.

## Options considered

### Option 1: next intl (wybrane)

Biblioteka i18n zbudowana specjalnie pod Next.js App Router: pierwszorzędne wsparcie komponentów serwerowych, typowane katalogi komunikatów (błąd kompilacji/typów przy brakującym kluczu), wbudowane formatowanie liczb/dat, oraz middleware obsługujący prefiks języka, wykrywanie `Accept-Language` i ciasteczko wyboru w jednym miejscu — dokładnie to, czego potrzebuje `proxy.ts` po rozszerzeniu na trzy języki.

**Pros**:
- Natywne wsparcie Server Components i App Router, bez ręcznego okablowania SSR.
- Middleware next intl bezpośrednio realizuje wykrywanie języka przeglądarki i zapamiętanie wyboru w ciasteczku (AC-2), zastępując ręczną logikę, którą i tak trzeba by dopisać do `proxy.ts`.
- Typowane klucze komunikatów łapią literówkę/brak tłumaczenia wcześniej niż runtime.
- Szeroko używana, aktywnie rozwijana biblioteka dla dokładnie tego stacku.

**Cons**:
- Nowa zależność do nauki i utrzymania (aktualizacje major version to realna praca).
- Zastępuje własny, prosty `proxy.ts` czymś, czego zespół nie napisał sam — mniejsza kontrola nad szczegółami routingu.

### Option 2: react-intl / FormatJS

Dojrzała biblioteka komunikatów oparta o format ICU, popularna w ekosystemie React od lat.

**Pros**:
- Bardzo elastyczna przy złożonych regułach liczby mnogiej/rodzaju gramatycznego (format ICU), których ten projekt dziś nie potrzebuje.
- Duża, ustabilizowana społeczność.

**Cons**:
- Brak natywnej integracji z App Router/Server Components next intl — SSR i routing po prefiksie trzeba by okablować ręcznie, dokładnie tę pracę next intl daje gotową.
- Nie rozwiązuje wykrywania `Accept-Language`/ciasteczka — to zostałoby osobnym, ręcznym kodem w `proxy.ts`, dublującym pracę, którą next intl robi jednym middleware.

### Option 3: własne rozwiązanie (pliki JSON + funkcja `t()`)

Zero nowych zależności: proste pliki JSON per język, mała funkcja odczytująca klucz.

**Pros**:
- Pełna kontrola, zero zależności do aktualizowania.
- Najmniejszy narzut na start dla bardzo małego katalogu komunikatów.

**Cons**:
- Formatowanie liczb/dat per język, wykrywanie `Accept-Language` i bezpieczeństwo typów kluczy trzeba zbudować i utrzymywać samodzielnie.
- Przy ~20 trasach i rosnącym katalogu komunikatów ryzyko rozjazdu kluczy między językami rośnie bez typowania — dokładnie to, co test spójności (AC-9) i tak musiałby łatać ręcznie napisanym mechanizmem zamiast wbudowanym.

## Rationale

next intl wygrywa, bo rozwiązuje jednym middleware'em dokładnie te trzy problemy, które i tak trzeba było rozwiązać osobno: prefiks języka w adresie (już częściowo w `proxy.ts`), wykrywanie `Accept-Language` przy pierwszej wizycie (nowe wymaganie, AC-2) i zapamiętanie wyboru w ciasteczku (nowe wymaganie z rozmowy o utrwalaniu preferencji). Roll-your-own oznaczałby napisanie własnej wersji tego middleware'a plus własnego mechanizmu typowania kluczy, żeby w ogóle dorównać temu, co next intl daje gotowe — bez żadnej korzyści, skoro projekt i tak stoi na App Routerze, dla którego next intl jest budowany. react-intl nie rozwiązuje żadnego z tych dwóch nowych wymagań routingowych i zostawia SSR do ręcznego okablowania, więc nie ma przewagi nad next intl przy braku potrzeby złożonych reguł ICU.

Tabela `product_translation` (zamiast kolumny `jsonb` na `product`) wynika z konwencji już zapisanej w `lib/db/AGENTS.md`: `jsonb` w tym projekcie jest zarezerwowany dla pól, których kształt zależy od sąsiedniej kolumny dyskryminującej (jak `technicalSpecs` zależny od `family`, spec 0022) — tłumaczenia nie są tym wzorcem. Osobna tabela daje też prosty, typowany klucz `UNIQUE(product_id, locale)` zamiast polegania na kształcie JSON, i nie wymaga migracji `product` przy dodaniu czwartego języka w przyszłości.

Kolejność w `## Build plan` (najpierw sam middleware next intl z jednym aktywnym językiem, potem rozszerzenie o en/nl i wydobycie treści, potem dane producenta, na końcu prawdziwe tłumaczenie strona po stronie) wynika wprost z podejścia Tracer Bullet zapisanego jako domyślne dla epiki Produkcja, doprecyzowanego po przeglądzie krzyżowym (cross check) tej specyfikacji: podmiana `proxy.ts` na middleware next intl to jedyny krok dotykający każde żądanie do serwisu, więc zostaje osobnym, najmniejszym możliwym, w pełni odwracalnym commitem, zanim dojdzie cokolwiek szerszego (wydobycie stringów, przełącznik, hreflang). Fallback do polskiego jest przy tym uczciwym, poprawnym stanem tymczasowym (patrz AC-6), nie błędem do ukrycia.

## Rozszerzenie o niemiecki (2026-09-15)

**Kontekst decyzji**: zamawiający poprosił o dodanie czwartego języka, niemieckiego, do już zbudowanego mechanizmu. W pre flight (czytanie kodu przed rozmową) okazało się, że mechanizm z tej specyfikacji jest w dużej mierze już generyczny po `routing.locales` (przełącznik języka w `components/ui/LanguageSwitcher.tsx`, blokada panelu administratora i przekierowanie starych tras w `proxy.ts`, oraz `alternates.languages` w `generateMetadata` strony szczegółów projektu wszystkie iterują po tej liście, nie mają wpisanych na sztywno "en"/"nl"). To zmienia charakter decyzji: nie jest to powtórzenie pracy z pierwotnej specyfikacji, tylko rozszerzenie jednego miejsca konfiguracji (`lib/i18n/routing.ts`) plus nowy katalog tłumaczeń i nowa wartość enuma w bazie.

**Dlaczego aktualizacja tej specyfikacji, nie nowa**: sprawdzono trzy opcje (nowa specyfikacja, supersede, aktualizacja w miejscu). Mechanizm, model danych i uzasadnienie wyboru next intl są dokładnie te same co przy en/nl, więc osobna specyfikacja duplikowałaby większość tego dokumentu, zmieniając tylko kod języka. Aktualizacja w miejscu została wybrana przez zamawiającego (spec był wtedy wciąż `In Progress`, więc rozszerzenie kontraktu przed jego domknięciem nie koliduje z już zamkniętą pracą).

**Dlaczego pełne tłumaczenie od startu, nie tymczasowa kopia `pl.json`**: pierwotny Build plan (zadanie 4) celowo zaczynał `en.json`/`nl.json` jako dokładne kopie `pl.json`, żeby routing dało się wdrożyć osobno od treści (Tracer Bullet). Odczyt `messages/en.json` w pre flight pokazał, że ten etap jest już za mechanizmem: katalog zawiera prawdziwy, przetłumaczony tekst ("Homes", "Get started", nie polskie odpowiedniki), nie kopię. Powtarzanie etapu tymczasowej kopii dla niemieckiego byłoby krokiem wstecz względem stanu, w jakim jest dziś reszta katalogów, bez korzyści (routing i tak jest już odwracalny niezależnie od treści katalogu, jak pokazuje zadanie 13 w zaktualizowanym Build planie).

**Dlaczego formalny rejestr ("Sie")**: projekt nie ma dotąd zapisanej decyzji o tonie per język, ale `messages/nl.json` konsekwentnie używa formy grzecznościowej (`u`/`uw`, 71 wystąpień kontra 2 wystąpienia nieformalnego `je`), a angielski nie rozróżnia rejestru gramatycznie. Niemiecki ma to samo rozróżnienie formalne/nieformalne co niderlandzki (Sie/du), więc formalny rejestr jest kontynuacją już ustalonego, spójnego tonu marki na tej platformie B2B/nieruchomościowej, nie nową decyzją.

**Dlaczego enum przez `ALTER TYPE ... ADD VALUE`, nie przebudowa typu**: `lib/db/schema.ts` ma już precedens tego dokładnego wzorca (`drizzle/0015_young_justice.sql`, rozszerzenie `product_family` o `'kontenery-modulowe'`) i komentarz w kodzie wprost odróżniający go od przebudowy typu, potrzebnej tylko przy usuwaniu wartości (czego Postgres nie wspiera bezpośrednio). Dodanie `'de'` to czysty dopisek, nie usunięcie, więc ten sam, tańszy wzorzec ma zastosowanie bez dodatkowego ryzyka.
