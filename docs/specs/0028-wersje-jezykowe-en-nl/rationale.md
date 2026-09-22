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

## Rozszerzenie o automatyczne tłumaczenie AI (2026-09-22)

**Kontekst decyzji**: zamawiający poprosił o przygotowanie tłumaczenia wszystkich opisów produktów we wszystkich językach, z pytaniem, czy starczy miejsca na Neonie. Sprawdzone bezpośrednio (Neon MCP, projekt `modularhub`/`spring-rain-58383710`): baza zajmuje ok. 58 MB z limitu 512 MB na branch (ok. 11%), a `product`/`product_translation` razem to dziś 720 kB, więc miejsce nigdy nie było realnym ograniczeniem tej decyzji — to pytanie zostało odpowiedziane faktem, nie projektem. Pre flight (czytanie kodu przed rozmową) pokazał dwie rzeczy, które zmieniły charakter decyzji: po pierwsze, `lib/producer-product-actions.ts` już dziś zapisuje ręcznie wpisane tłumaczenia EN/NL z kreatora (nota z pierwotnej wersji tej specyfikacji o odłożeniu całej ścieżki zapisu jest więc nieaktualna, tylko zakładka DE faktycznie została w tyle); po drugie, projekt ma już skonfigurowanego dostawcę AI (Azure OpenAI, `lib/ai/openai.ts`/`azure-config.ts`, spec 0047/0048 import PDF) i już używa `after()` z `next/server` do pracy w tle po odpowiedzi (`lib/case-actions.ts`, spec 0048), więc ani dostawca, ani mechanizm asynchroniczności nie były otwartymi pytaniami — tylko reużycie już podjętych decyzji.

**Dlaczego zamawiający poprosił o backfill wykonywany bezpośrednio przez agenta, nie przez nową ścieżkę kodu**: ten sam precedens co AC-7/AC-10 (backfill EN/NL, potem DE, dla ówczesnych 53 produktów) — jednorazowe uzupełnienie danych historycznych przez Neon MCP, niezależne od tego, jaki mechanizm obsługuje przyszłe produkty. Rozdzielenie „jak wygląda to na przyszłość" (Azure OpenAI, automatyczne, asynchroniczne) od „jak uzupełniamy dzisiejszy katalog" (jednorazowy ręczny backfill) jest świadome: backfill nie musi czekać na zbudowanie i wdrożenie nowego mechanizmu, a mechanizm nie musi być zaprojektowany pod jednorazowe uruchomienie na 93 produktach naraz.

### Options considered (co dokładnie zdecydował zamawiający)

**Zastąpić ręczne zakładki całkowicie automatycznym tłumaczeniem, kontra wypełnić je jako edytowalny szkic (wybrane: szkic).** Pełna automatyzacja (producent nigdy nie widzi ani nie edytuje pola tłumaczenia) byłaby prostsza do zbudowania, ale odbiera producentowi kontrolę nad tym, jak jego produkt jest prezentowany za granicą — a jakość maszynowego tłumaczenia marketingowego tekstu nie jest tu niczym gwarantowana. Szkic edytowalny zachowuje już zbudowane zakładki kreatora (żadna praca UI nie jest tracona) i daje producentowi ostatnie słowo, kosztem odrobiny złożoności: trzeba śledzić, czy pole jest jeszcze „własnością AI", czy już „własnością producenta" (`aiGeneratedAt`), żeby automatyczna regeneracja nigdy nie nadpisała ręcznej poprawki.

**Synchroniczne (zapis czeka na tłumaczenie) kontra asynchroniczne przez `after()` (wybrane: asynchroniczne).** Synchroniczne byłoby minimalnie prostsze (jedna funkcja, bez pytania „co jeśli producent zamknie kartę zanim `after()` się wykona") ale wiąże czas odpowiedzi zapisu produktu z czasem odpowiedzi zewnętrznego dostawcy AI — kilka sekund dodatkowego oczekiwania na każdym zapisie kreatora, i realne ryzyko, że wolne albo nieudane wywołanie Azure OpenAI zablokuje zapis, którego jedyną winą jest zmiana polskiego opisu. `after()` jest już użytym w tym projekcie wzorcem (`lib/case-actions.ts`, powiadomienia doradcy) na dokładnie ten sam problem: praca, która nie powinna blokować odpowiedzi. Koszt: `after()` na platformach bezserwerowych (Vercel) zależy od `waitUntil`, więc zbyt długie wywołanie może zostać ucięte razem z resztą instancji funkcji — akceptowalne ryzyko, bo awaria po prostu zostawia wiersz do regeneracji przy następnym zapisie (patrz niżej), nie psuje niczego.

**Blokować zapis przy awarii tłumaczenia kontra zapis zawsze się udaje (wybrane: zapis zawsze się udaje).** Blokowanie zapisu produktu awarią zewnętrznego dostawcy AI przywiązałoby dostępność podstawowej funkcji biznesowej (producent zapisuje swój produkt) do uptime'u usługi, która nie jest krytyczna dla tej operacji — opis w trzech dodatkowych językach to usprawnienie, nie wymóg (AC-6 już gwarantuje sensowny fallback do polskiego). Naturalny retry (kolejny zapis tego samego produktu spróbuje ponownie, bo wiersz wciąż nie istnieje albo wciąż jest „własnością AI" z nieaktualnym `aiTranslatedFrom*`) jest tańszy niż budowanie dedykowanej kolejki ponawiania czy przycisku w UI na start tego zakresu — jeśli w praktyce awarie okażą się częste, dedykowany retry jest zapisany jako Follow-up, nie zbudowany z góry bez dowodu, że jest potrzebny.

### Rationale (dlaczego Azure OpenAI, nie nowy dostawca)

Nie było tu realnej decyzji do podjęcia: projekt ma już jednego, skonfigurowanego dostawcę LLM (Azure OpenAI, wybrany i uzasadniony w spec 0047 dla importu PDF), z klientem, obsługą błędów (`AzureAiProviderError`) i wzorcem strukturyzowanego wyjścia (`zodTextFormat` + Zod schema) gotowym do reużycia. Wprowadzenie drugiego dostawcy (np. DeepL czy Google Translate, wyspecjalizowanych w tłumaczeniu) dodałoby nową zależność, nowe zmienne środowiskowe i nowy kod obsługi błędów za korzyść, której nikt nie zmierzył (jakość tłumaczenia marketingowego opisu produktu przez ogólny model GPT jest wystarczająca dla tego zastosowania, zwłaszcza że producent i tak może poprawić wynik). Rejestr formalny (odpowiednik „u/uw" po niderlandzku, „Sie" po niemiecku) jest instrukcją w promptcie generacji, kontynuującą już ustalony ton marki z rozszerzenia niemieckiego wyżej, nie nową decyzją.

### Poprawka po cross checku innym modelem (ten sam dzień)

Pierwsza wersja tej sekcji (patrz git historia tego pliku, jeśli potrzebna) zaproponowała jedną kolumnę `aiGeneratedAt` (timestamptz) na cały wiersz `product_translation`, zerowaną przy zapisie różnej wartości pola. Cross check na innym, zdolnym modelu (`/architect`'s wbudowany krok kontrolny) przeczytał spec razem z rzeczywistym kodem (`lib/producer-product-actions.ts`, `components/producent/ProjectWizard.tsx`, `lib/db/queries.ts`) i znalazł dwie fundamentalne wady, obie w normalnej, nie brzegowej ścieżce użycia:

1. **Reguła nigdy by się nie uruchomiła.** `upsertTranslations` już dziś wstawia wiersze EN/NL przy każdym zapisie, nawet z pustymi polami (komentarz w kodzie: „nawet gdy oba pola puste"). Kolumna `aiGeneratedAt` domyślnie `NULL` od momentu powstania wiersza, a reguła mówiła „nigdy nie generuj, gdy `aiGeneratedAt IS NULL`" — więc automatyczne tłumaczenie nigdy by się nie zdarzyło dla EN/NL, tylko teoretycznie dla DE (dopóki zadanie podpinające DE też zaczęłoby wstawiać puste wiersze, po czym przestałoby się zdarzać wszędzie).
2. **Realny wyścig z wielokrokowym kreatorem.** `ProjectWizard.persistProgress` trzyma cały draft po stronie klienta i wysyła go w całości przy każdym przejściu kroku. Sekwencja: krok 1 zapisuje polski opis (startuje generację asynchronicznie) → producent przechodzi do kroku 2 kilka sekund później, zanim `after()` skończył → krok 2 wysyła wciąż pusty, nieodświeżony lokalnie `nameEn` → porównanie „różni się od zapisanego" widzi różnicę (bo AI właśnie coś tam wpisało) → zeruje `aiGeneratedAt` → pole staje się na zawsze „własnością producenta", na zawsze puste, i (przez wadę 1) nigdy nie zostanie ponownie wygenerowane. To normalna ścieżka tworzenia produktu, nie skrajny przypadek.

Poprawka (opisana w `index.md` Feature design) rozwiązuje obie wady jednym posunięciem: zamiast jednej flagi na wiersz plus jawnego zerowania, własność jest **wyliczona per pole** z porównania aktualnej wartości z tym, co AI tam ostatnio wpisało (`aiGeneratedName`/`aiGeneratedDescription`), więc nie ma stanu do przypadkowego, przedwczesnego wyzerowania — puste pole jest zawsze kandydatem do generacji (naprawia wadę 1), a resubmisja niezmienionej, pustej wartości z nieedytowanego kroku po prostu nie jest już w ogóle wysyłana (pola tłumaczenia stają się opcjonalne w payloadzie, AC-15), więc nie ma czego porównywać ani czego zerować (naprawia wadę 2). Przy okazji: „własność" per pole, nie per wiersz językowy, jest też wierniejsza temu, co AC-13 zawsze mówiło słowami („to pole staje się własnością producenta") — pierwsza wersja implementacji po cichu zamieniła to na własność całego wiersza, czego nikt nie zdecydował.

Kolumny `aiGeneratedName`/`aiGeneratedDescription`/`aiTranslatedFromName`/`aiTranslatedFromDescription` (zamiast np. pojedynczej flagi `isManual` albo przechowywania wersji w osobnej tabeli historii) są najmniejszym modelem danych, który odpowiada na oba pytania naraz, per pole: „czy wolno to nadpisać" (stored ≠ `aiGenerated*` → nie) i „czy trzeba to nadpisać" (polski tekst źródłowy różni się od migawki → tak, jeśli wolno). Osobna tabela historii zmian byłaby przedwczesna — nikt nie prosił o historię wersji tłumaczeń, tylko o to, żeby AI nie deptało po tym, co producent już napisał.
