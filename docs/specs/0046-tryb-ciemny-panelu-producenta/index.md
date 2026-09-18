# 0046. Tryb ciemny dla panelu producenta

**Date**: 2026-09-18
**Status**: In Progress

## Summary

Ta specyfikacja dodaje przełącznik trybu ciemnego do chronionego panelu producenta (`/producer/panel/**`: strona główna, produkty, kreator nowego produktu, zapytania), używając dokładnie tego samego mechanizmu, który spec 0043 już zbudował dla flow klienta (cookie, kontekst React, klasa CSS na `<html>`/`<body>`). Zamiast budować coś nowego, ta funkcja rozszerza istniejący mechanizm o drugi, niezależny zakres wizualny, żeby producent i klient mieli tę samą wygodę bez podwajania kodu. Publiczne strony producenta (rejestracja, weryfikacja firmy, gotowość eksportowa, domykanie luk, realizacje) i panel wewnętrzny zostają, jak dotąd, wyłącznie jasne.

## Requirements

**User stories**:
- Jako zalogowany producent, chcę przełączyć swój panel na tryb ciemny, żeby wygodniej pracować w słabym oświetleniu lub zgodnie z moją preferencją.
- Jako producent z systemowym trybem ciemnym włączonym, chcę żeby panel od razu otworzył się w ciemnym motywie po zalogowaniu, bez ręcznego przełączania.
- Jako producent, który raz wybrał tryb ręcznie, chcę żeby ten wybór był pamiętany na każdej podstronie panelu i po kolejnym zalogowaniu.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: Przełącznik motywu jest widoczny w `ProducerPanelSidebar` na każdej trasie `app/[locale]/producer/panel/**` (strona główna, `produkty`, `produkty/[id]/edytuj`, `projekt`, `zapytania`, `zapytania/[id]`), obok już istniejącego `LanguageSwitcher`.
- **AC-2**: Kliknięcie przełącznika natychmiast zmienia motyw bieżącej strony panelu, bez pełnego przeładowania.
- **AC-3**: Przy pierwszej wizycie w panelu bez zapisanego wyboru, panel renderuje się od razu zgodnie z preferencją systemową producenta (`prefers-color-scheme`), czystym CSS, bez błysku złego motywu i bez blokującego skryptu.
- **AC-4**: Jawny wybór jest zapisywany w tym samym cookie `theme`, które spec 0043 już zapisuje (jedna preferencja na odwiedzającego, nie osobna dla panelu); wygrywa z preferencją systemową na każdej trasie panelu, także po pełnym przeładowaniu.
- **AC-5**: Przełącznik ma dwa stany (jasny/ciemny), zawsze odwracalne kolejnym kliknięciem; brak osobnej opcji "systemowy" w UI (ten sam wzorzec co 0043 AC-5).
- **AC-6**: Dzisiejszy jasny wygląd panelu pozostaje bez zmian; żaden ekran ani komponent panelu nie regresuje w trybie jasnym ani przed pierwszą interakcją z przełącznikiem.
- **AC-7**: Wartości ciemne są zdefiniowane dla każdego tokenu marki, którego panel producenta faktycznie używa — bezpośrednio (`components/producent/`, wyłącznie v3) albo przez współdzielony komponent renderowany wewnątrz panelu (np. `components/brand/BrandLogo.tsx`, który używa `--brand-v5-ink`) — więc żaden ekran panelu nie zostaje częściowo jasny w trybie ciemnym. *(Skorygowane po weryfikacji na żywo: pierwszy audyt sprawdził tylko `components/producent/` i przeoczył `BrandLogo`, patrz Key invariants poniżej.)*
- **AC-8**: Tekst, wskaźniki statusu (np. status weryfikacji firmy) i pierścień fokusu (`.focus-ring`) zachowują kontrast WCAG 2.2 AA na nowych ciemnych tłach panelu.
- **AC-9**: Sam przełącznik (reużyty, niezmieniony `ThemeToggle`) spełnia wymogi dostępności: osiągalny klawiaturą, widoczny fokus, poprawny `aria-label`/`aria-pressed`.
- **AC-10**: Cztery ekrany "wersja demonstracyjna" linkowane z panelu (`/producer/export-readiness`, `/producer/company-verification`, `/producer/fulfillments`, oraz stary formularz oferty), które żyją pod `app/[locale]/producer/(public)/`, pozostają wyłącznie jasne; przejście z ciemnego panelu na taki ekran może pokazać jasne tło, to świadomie zaakceptowane, nie błąd.
- **AC-11**: Przełącznik i stan motywu są wspólne dla całego panelu (zamontowane raz w `producer/panel/layout.tsx`), nie duplikowane ani niezależne per podstrona.
- **AC-12**: Modal potwierdzenia usunięcia produktu (`DeleteProductDialog`, Headless UI `Dialog`, portalowany do `document.body`) renderuje się poprawnie w trybie ciemnym, mimo że portaluje poza drzewo komponentu panelu.

## Decision

**Chosen option**: Option 1: rozszerzenie istniejącego mechanizmu z 0043 o drugi zakres (`scopeClassName`), zamiast duplikować provider albo znosić zakresowanie.

Panel producenta dostaje własną klasę zakresu, `theme-producer`, montowaną przez ten sam (teraz sparametryzowany) `ThemeProvider`, czytającą to samo cookie `theme` co flow klienta. Wartości ciemne dla panelu to podzbiór tych samych deklaracji CSS co `.theme-klient.dark` (tylko generacja v3, jedyna używana przez komponenty producenta), połączone w jedną listę selektorów zamiast powielone, żeby oba zakresy nie mogły się rozjechać na wspólnych wartościach.

**Implementation skills**: `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Pełne rozważane opcje i uzasadnienie: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
Brak nowych encji. Reużywa istniejące cookie `theme` (`lib/theme.ts`, bez zmian): `"light" | "dark"`, `Path=/`, `SameSite=Lax`, ok. rok ważności.

**State transitions**:
Te same dwa stany co 0043, `light` ↔ `dark`, przełączane wyłącznie kliknięciem. Stan pośredni "brak wyboru, podążaj za systemem" rozwiązany czystym CSS, nie osobnym stanem aplikacji.

**API surface**:
Brak endpointów HTTP. Cookie zapisywane bezpośrednio z klienta przy kliknięciu przełącznika, dokładnie jak w 0043.

**Key invariants**:
- `ThemeProvider` (`components/ui/ThemeProvider.tsx`) dostaje wymagany prop `scopeClassName`; trzy dzisiejsze literały `"theme-klient"` (montowanie na `document.body`, sprzątanie przy odmontowaniu, klasa na opakowującym `div`) zastępowane tym propem. Jedyne dzisiejsze miejsce użycia, `app/[locale]/(customer)/layout.tsx`, przekazuje `scopeClassName="theme-klient"` jawnie (bez wartości domyślnej), a nowy `app/[locale]/producer/panel/layout.tsx` przekazuje `scopeClassName="theme-producer"`.
- Cookie `theme` zostaje jedną, niezależną od obszaru preferencją odwiedzającego; to, który obszar faktycznie maluje się na ciemno, decyduje wyłącznie to, czy dany fragment drzewa montuje `ThemeProvider` z odpowiednim `scopeClassName`, nie sama wartość cookie. Panel wewnętrzny i cztery ekrany demo producenta nigdy nie montują `ThemeProvider`, więc zostają jasne niezależnie od cookie (ten sam mechanizm, który już dziś trzyma producenta i internal poza zasięgiem 0043 AC-11).
- `app/globals.css`: selektory `.theme-klient.dark`/`.theme-klient:not(.light)` rozszerzone o `.theme-producer.dark`/`.theme-producer:not(.light)` dla podzbioru "odwracających się" własności faktycznie używanych wewnątrz drzewa panelu (`--background`, `--foreground`, `--brand-foundation-navy`, `--brand-deep-structure`, `--brand-warm-white`, `--brand-steel`, `--brand-technical-graphite`, `--brand-v5-ink`, `--status-*`), połączone w jedną listę selektorów ze wspólnymi wartościami, nie skopiowane osobno. `--brand-v5-ink` dopisane po weryfikacji na żywo (zrzut ekranu: wordmark "Modular" w `BrandLogo`, domyślny `tone="dark"`, znikał na ciemnym tle panelu) — pierwszy audyt sprawdził tylko `components/producent/` i przeoczył, że `ProducerPanelSidebar` renderuje też `BrandLogo` z `components/brand/`. Pozostałe deklaracje `--brand-v4-*`/`--brand-v5-*` (surface/muted/line/paper) nie trafiają do `.theme-producer`: żaden komponent osiągalny z panelu ich nie używa.
- Reguła crossfade przy zmianie motywu (`:where(.theme-klient *)`, `@layer base`) rozszerzona o `:where(.theme-producer *)`.
- Mirroring klas na `document.body` (dziś w `ThemeProvider`, potrzebne dla portalowanych komponentów Headless UI jak `DeleteProductDialog`) staje się częścią tej samej sparametryzowanej logiki, więc działa automatycznie dla `theme-producer` bez osobnej poprawki.
- `ProducerPanelSidebar.tsx` dostaje `<ThemeToggle />` obok istniejącego `<LanguageSwitcher />`; sam `ThemeToggle` zostaje bez zmian (już dziś niezależny od zakresu, czyta wyłącznie `useTheme()`).

**Security model**:
Bez zmian względem 0043: preferencja wizualna, nie dane osobowe, nie wymaga osobnej zgody. Sesja producenta (kto w ogóle widzi panel) jest bramkowana już dziś przez `requirePanelProducerSession`, niezależnie od tej funkcji.

**Configuration required**:
Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: producent bez zapisanego cookie z systemowym trybem ciemnym widzi panel od razu ciemny po zalogowaniu, weryfikuje **AC-3**.
- Happy path: kliknięcie przełącznika w `ProducerPanelSidebar` na `/producer/panel/products` natychmiast przełącza motyw bez przeładowania, weryfikuje **AC-2**.
- Trwałość: jawny wybór ciemnego motywu przetrwa twarde przeładowanie i nawigację między `panel`, `panel/products`, `panel/project`, `panel/inquiries`, weryfikuje **AC-4**, **AC-11**.
- Granica zakresu: kliknięcie linku "wersja demonstracyjna" z ciemnego panelu na `/producer/export-readiness` pokazuje jasny ekran; powrót do panelu zostaje ciemny, weryfikuje **AC-10**.
- Regresja: jasny motyw na każdym ekranie panelu identyczny wizualnie jak przed zmianą, weryfikuje **AC-6**.
- Dostępność: `DeleteProductDialog` otwarty z ciemnego `/producer/panel/products` renderuje się poprawnie ciemny mimo portalowania, weryfikuje **AC-12**; kontrast tekstu i `.focus-ring` przechodzi WCAG AA, weryfikuje **AC-8**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet epiki Produkcja (locked decision, `docs/scope/produkcja.md`): najpierw jeden cienki, w pełni działający wątek na jednym realnym ekranie panelu, dopiero potem pogrubienie o pozostałe ekrany.

1. [x] Uogólnij `ThemeProvider.tsx` o wymagany prop `scopeClassName` (zastępujący trzy literały `"theme-klient"`); zaktualizuj jedyne dzisiejsze miejsce wywołania (`app/[locale]/(customer)/layout.tsx`) o jawne `scopeClassName="theme-klient"` i jego test (`ThemeProvider.test.tsx`), satisfies **AC-4**, **AC-11** (przygotowanie, bez widocznej zmiany).
2. [x] Cienki wątek: podłącz `app/[locale]/producer/panel/layout.tsx` (odczyt cookie `theme`, mirror `(customer)/layout.tsx`) z `<ThemeProvider scopeClassName="theme-producer">`; dodaj `.theme-producer.dark`/`.theme-producer:not(.light)` (wspólna lista selektorów z `.theme-klient` dla współdzielonych wartości v3) i rozszerzenie reguły crossfade w `app/globals.css`; dodaj `<ThemeToggle />` do `ProducerPanelSidebar.tsx`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-11**. Zweryfikowane: typecheck + lint czyste, `ThemeProvider.test.tsx`/`ThemeToggle.test.tsx`/`SiteHeader.test.tsx` zielone, e2e `e2e/tryb-ciemny.spec.ts` (flow klienta, regresja po uogólnieniu providera) zielone. Wizualna weryfikacja `/producer/panel` na żywo w obu motywach NIE wykonana: panel wymaga realnej sesji producenta (magic link przez Resend), niedostępnej w tym środowisku bez dostępu do skrzynki e-mail.
3. [x] Pogrub: zweryfikuj i w razie potrzeby popraw pozostałe ekrany panelu (`produkty`, `produkty/[id]/edytuj`, `projekt`, `zapytania`, `zapytania/[id]`) pod tym samym zakresem; napraw każdy komponent producenta używający tokenu w roli "przypiętego, stałego ciemnego akcentu" niekompatybilnej z odwróceniem, satisfies **AC-1**, **AC-6**, **AC-7**. Potwierdzone przeszukaniem repo (`components/producent/` i `app/[locale]/producer/panel/**`): brak twardo zakodowanego koloru (`#hex`), brak jakiejkolwiek referencji `--brand-v4-*`/`--brand-v5-*` — czysta weryfikacja, bez potrzeby przepisywania, zgodnie z przewidywaniem w Consequences.
4. [x] Potwierdź, że `DeleteProductDialog` (i każdy inny portalowany komponent Headless UI w tych ekranach) dziedziczy zakres ciemny poprawnie przez teraz-uogólniony mirroring klas na `document.body`, satisfies **AC-12**. Mechanizm jest identyczny (parametryzowany przez `scopeClassName`) do już przetestowanego mirroringu 0043; `ThemeProvider.test.tsx` ma teraz dedykowane przypadki dla `scopeClassName="theme-producer"` potwierdzające, że właściwa klasa (nie `theme-klient`) trafia na `document.body`. Bez żywej sesji producenta nie potwierdzono tego wizualnie na samym `DeleteProductDialog`.
5. [x] Przejdź audyt kontrastu WCAG 2.2 AA na ciemnych wartościach w kontekście panelu, satisfies **AC-8**. Panel reużywa dokładnie te same `--dm-*` wartości, już policzone i zaakceptowane w 0043 (`--dm-ink` na `--dm-bg` ~16.5:1, `--dm-muted` ~8.3:1), żadna nowa kombinacja tokenów nie powstała dla `.theme-producer` — nowy audyt nie jest potrzebny.
6. [~] Testy: nowy `ProducerPanelSidebar.test.tsx` pokrywający przełącznik — **zrobione** (2 testy: obecność przełącznika, przełączanie klasy `theme-producer`/`dark` na `document.body` bez dotykania `theme-klient`). e2e `e2e/tryb-ciemny-panelu-producenta.spec.ts` (mirror `e2e/tryb-ciemny.spec.ts`) obejmujący trasy panelu i przypadek graniczny przejścia na ekran demo i z powrotem — **zablokowane**: panel wymaga zalogowanej sesji producenta (magic link e-mail przez Resend), a repo nie ma dziś fixture'a do automatycznego logowania producenta w e2e (żaden istniejący plik w `e2e/` tego nie robi). Wymaga decyzji: albo fixture logowania producenta (nowa infrastruktura testowa, większa niż ta funkcja), albo ręczna weryfikacja przez `/check verify`. Satisfies (częściowo) **AC-2**, **AC-9**; **AC-3**, **AC-4**, **AC-10** pozostają niezweryfikowane e2e.

## Consequences

**Positive**:
- Zero nowych pojęć: to samo cookie, ten sam `ThemeToggle`, ten sam wzorzec CSS, tylko drugi zakres; każdy kolejny obszar (np. w przyszłości panel wewnętrzny) to już tylko jedna linia więcej, nie nowy system.
- Realny scan repo potwierdził, że `components/producent/` nie ma dziś żadnego twardo zakodowanego koloru — krok audytu (zadanie 3) to w praktyce weryfikacja, nie duże przepisywanie, niższe ryzyko niż analogiczny krok w 0043.

**Negative / tradeoffs**:
- Uogólnienie `ThemeProvider` (zadanie 1) dotyka już zaakceptowanego, działającego na produkcji kodu z 0043; błąd w tym kroku ryzykuje regresję we flow klienta, nie tylko brak nowej funkcji. Ograniczone przez zachowanie identycznego zachowania dla `theme-klient` i zielone dotychczasowe testy.
- Przejście z ciemnego panelu na jasny ekran demo (AC-10) jest świadomie zaakceptowanym błyskiem, nie naprawione w tej funkcji.

**Neutral**:
- Blok trybu ciemnego w `app/globals.css` rośnie o drugi zakres; współdzielone deklaracje v3 są połączone w jedną listę selektorów, więc to mały dopisek, nie podwojenie.

## Follow-up

- [ ] Brak wiersza w `docs/scope/produkcja.md` powiązanego z tą specyfikacją (panel producenta, spec 0032, żyje w epice Produkcja, nie Prototyp, gdzie jest funkcja 20 dla klienta); zapisz ją jako nową funkcję przez `/scope`, żeby `/develop` miał do czego przypiąć status.
- [ ] Cztery ekrany demo pod `producer/(public)/` celowo zostają jasne (AC-10); gdy funkcje 9/13/14/16 (gotowość eksportowa, domykanie luk, realizacja) dostaną własną, realną przebudowę (zapowiedzianą w spec 0032 Follow-up), to naturalny moment żeby też rozważyć dla nich tryb ciemny, nie wcześniej.
- [ ] Panel wewnętrzny (`app/[locale]/internal/`) zostaje poza zakresem, tak jak 0043 go zostawiło; osobna, przyszła decyzja, jeśli w ogóle potrzebna.
- [ ] `components/ui/StageTimeline`'s znana wada trybu ciemnego (opisana w `components/ui/AGENTS.md`) nie blokuje tej funkcji, bo żaden dzisiejszy ekran panelu go nie używa; do rozważenia dopiero gdy jakiś przyszły ekran panelu producenta zacznie go reużywać pod tym zakresem.
