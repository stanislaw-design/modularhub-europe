# 0027. Domknięcie wizualne ścieżki klienta

**Date**: 2026-09-04
**Status**: In Progress

## Summary

Ten spec dokańcza wizualne ujednolicenie ścieżki klienta. Dziś strona startowa i nagłówek stoją na nowym, jasnym systemie kolorów (v5), a reszta ekranów klienta (wyniki, zapytanie, działka, oferta, realizacja, szczegóły projektu, panel konta, rejestracja) wciąż stoi na starym systemie (v3). Ten spec przenosi tych osiem ekranów na v5, dodaje brakujące mikroanimacje (przejścia przy najechaniu, pojawianie się przy przewinięciu) i naprawia sztywne układy niedostosowane do telefonu, bez zmiany jednego wiersza logiki biznesowej. Strona producenta zostaje bez zmian, bo współdzielone komponenty dostają nowy, domyślnie wyłączony wariant koloru zamiast zmiany w miejscu.

## Context

Pełny opis problemu, stan dzisiejszy per ekran i uwaga o nieaktualnym zapisie w scope: patrz [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako klient przechodzący przez całą ścieżkę (wyniki → zapytanie → działka → oferta → realizacja) albo przez panel konta, chcę spójnego, dopracowanego wyglądu na każdym ekranie, żeby produkt czuł się jak jedna, dokończona platforma, nie zlepek starego i nowego stylu.
- Jako klient na telefonie, chcę żeby każdy z tych ekranów układał się czytelnie, bez poziomego przewijania czy ściśniętych elementów.
- Jako klient klikający przyciski, karty i filtry, chcę widocznej, płynnej reakcji (nie martwego kliknięcia), żeby interfejs czuł się responsywny.
- Jako producent, chcę żeby moja strona wyglądała dokładnie tak jak dziś, bez żadnej niezamierzonej zmiany wynikającej z prac nad stroną klienta.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):

- **AC-1**: Każdy z ośmiu ekranów (wyniki, zapytanie, oferta, szczegóły projektu poza już zmigrowaną galerią, działka, realizacja, panel klienta [profil/ulubione/zapytania], rejestracja) renderuje swoje powierzchnie (tła, obramowania, kolor tekstu, przyciski, karty, pola formularza) tokenami v5 zamiast v3, wzorem już istniejących `PopularHomeCard`/`ProducerCard`/`SearchCard` i pełnego stanu `SiteHeader`.
- **AC-2**: `Button`, `Card`, `Input`, `Select`, `Checkbox`, `Label`, `Heading`, `Text`, `DataText` i `StageTimeline` (`components/ui/`) dostają nowy wariant `surface: "v3" | "v5"`, domyślnie `"v3"`. Każde dzisiejsze wywołanie (cała strona producenta, każdy jeszcze niemigrowany ekran klienta) działa bez zmiany kodu i bez zmiany wyglądu.
- **AC-3**: `StatusPill` i kolory `approved`/`conditional`/`blocked` nie są w żaden sposób dotykane przez ten spec na żadnym z ośmiu ekranów (zarezerwowany język zgodności, precedens spec 0013).
- **AC-4**: Żaden z ośmiu ekranów nie wprowadza tokenów v4 do swojej treści (hero, karty, formularze, listy). To nie dotyczy `SiteHeader`: na wszystkich ośmiu ekranach `SiteHeader` renderuje się dziś w swoim pełnym, `sticky` stanie (v5, spec 0025 AC-6), nigdy w przezroczystym stanie nakładki v4 zarezerwowanym dla samej strony głównej — ten spec tego zachowania nie zmienia.
- **AC-5**: Na każdym z ośmiu ekranów zostaje bez zmian: trasa, kontrakt parametrów URL, liczba i kolejność renderowanych elementów DOM, pobieranie danych i logika biznesowa. Wolno zmienić: kolor/token, wartości odstępów (`padding`/`gap`) i promień rogów karty na wartości v5 (`rounded-v5-card` zamiast `rounded-card`), zgodnie z tabelą w Feature design; nic poza tym.
- **AC-6**: Każdy interaktywny element na tych ośmiu ekranach (przyciski, karty, chipy filtrów, pola formularza, wiersze rozwijane), który dziś nie ma przejścia przy najechaniu/fokusie/aktywacji, dostaje je przez klasy Tailwind (`transition-colors`/`transition-transform`/`duration-*`), spójnie z dzisiejszym wzorcem `ResultsFilterBar`/`SiteHeader`.
- **AC-7**: Każda sekcja typu lista/siatka kart na tych ośmiu ekranach (siatka wyników, siatka ulubionych, itp.) używa istniejącego `components/ui/ScrollReveal.tsx` do efektu pojawienia się przy wejściu w widok, tym samym mechanizmem co już użyty gdzie indziej w projekcie, z zachowanym `prefers-reduced-motion` (już obsłużone przez CSS `ScrollReveal`).
- **AC-8**: Na żadnym z ośmiu ekranów, na żadnej szerokości od 360px do 1280px, treść strony nie powoduje poziomego przewijania całej strony i żaden element nie jest ścięty ani nieczytelny (dziś to zdarza się częściowo na wyniki/zapytanie/działka/realizacja/panel/rejestracja, potwierdzone skanem kodu; oferta i strona szczegółów projektu mają już częściowe pokrycie `sm:`/`md:`/`lg:` do utrzymania). Wyjątek: kontener z celowym poziomym przewijaniem tylko wewnątrz siebie (np. `FavoriteCompareTable` przy 3 porównywanych domach) jest dozwolony i nie jest błędem tego kryterium.
- **AC-9**: Każdy z ośmiu ekranów nadal spełnia WCAG 2.2 AA: jeden prawdziwy `<h1>`, logiczna kolejność fokusa, widoczny `.focus-ring`, a kontrast każdego elementu przeniesionego na v5 spełnia te same progi (4.5:1 tekst, 3:1 elementy nietekstowe) już wymuszone dla v3/v4/v5.

## Decision

**Chosen option**: Option 1 z [rationale.md](rationale.md): v5 jako główny cel dla reszty ścieżki klienta, v4 zostaje zarezerwowane dla zdjęciowych/ciemnych sekcji, a dziesięć współdzielonych prymitywów w `components/ui/` dostaje nowy, domyślnie wyłączony wariant `surface`.

**Implementation skills**: `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Pełne uzasadnienie i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Zmiana w prymitywach** (`components/ui/`), fundament pod wszystko inne. Mapowanie klasa na klasę poniżej (odczytane z dzisiejszych plików tv() i `assets/tokens/brand-v5-tokens.css`) jest przemyślanym punktem startowym do zaimplementowania dosłownie; `/develop` dostraja go wizualnie względem już zbudowanych `PopularHomeCard`/`ProducerCard`/`SearchCard`, jeśli różnica będzie zauważalna (ten sam zastrzeżenie co spec 0013 dla wartości v4):

| Prymityw | Dzisiejsze tokeny v3 (base) | Nowe tokeny `surface="v5"` | Ekrany klienta, które go użyją |
|---|---|---|---|
| `Button` primary | `bg-brand-passage-blue text-brand-action-foreground hover:bg-brand-electric-plane` | `bg-brand-v5-amber text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong` | wszystkie osiem |
| `Button` secondary | `border-brand-steel bg-brand-warm-white text-brand-foundation-navy hover:bg-brand-steel/30` | `border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink hover:bg-brand-v5-line/40` | wszystkie osiem |
| `Button` ghost | `text-brand-passage-blue hover:bg-brand-passage-blue/10` | `text-brand-v5-amber-strong hover:bg-brand-v5-amber/10` | wszystkie osiem |
| `Card` | `border-brand-steel bg-brand-warm-white`, `rounded-card` | `border-brand-v5-line bg-brand-v5-surface`, `rounded-v5-card` | wyniki, zapytanie, oferta, szczegóły projektu, panel |
| `Input`, `Select` | `border-brand-steel bg-brand-warm-white text-brand-foundation-navy placeholder:text-brand-technical-graphite/60` (plus stany `data-[open]:border-brand-passage-blue` na `Select`) | `border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink placeholder:text-brand-v5-muted/70`, `data-[open]:border-brand-v5-amber-strong` | zapytanie, działka, panel (profil), rejestracja |
| `Checkbox` | `border-brand-steel accent-brand-passage-blue` | `border-brand-v5-line accent-brand-v5-amber-strong` | wyniki (`ResultCard`), panel (`FavoriteCard`) |
| `Label` | `text-brand-technical-graphite` | `text-brand-v5-muted` | zapytanie, działka, panel (profil), rejestracja |
| `Heading`, `Text`, `DataText` | `text-brand-foundation-navy` (default) / `text-brand-technical-graphite` (muted) | `text-brand-v5-ink` (default) / `text-brand-v5-muted` (muted) — nowa oś `surface`, niezależna od istniejącej osi `tone` (`default`/`muted`) na `Text`/`DataText`, żeby nie kolidować nazwą | wszystkie osiem |
| `StageTimeline` marker/connector | `border-brand-foundation-navy bg-brand-foundation-navy` (completed) / `border-brand-passage-blue bg-brand-passage-blue` (current) / `border-brand-steel bg-brand-warm-white` (upcoming) | odpowiednio `border-brand-v5-ink bg-brand-v5-ink` / `border-brand-v5-amber-strong bg-brand-v5-amber-strong` / `border-brand-v5-line bg-brand-v5-surface`, wywołane tylko z `/klient/realizacja` (`/producent/realizacja` zostaje bez zmian, domyślne `surface="v3"`) | realizacja |

`invalid`/`border-status-blocked` na `Input`/`Select` i status colors gdziekolwiek indziej nie zmieniają się z `surface` (są niezależną, zarezerwowaną osią, patrz niżej). `StatusPill` bez zmian (AC-3). `Container`/`Stack`/`Textarea`/`Radio`/`FileUpload` bez potrzeby wariantu (bez koloru albo nieużywane na tych ośmiu ekranach).

**Jak `surface` dociera do każdego wywołania** (żeby nie zostać zapomnianym w połowie ekranu): komponenty złożone dziś specyficzne dla klienta i używane tylko na tych ośmiu ekranach (`ResultCard`, `ResultsFilterBar`, `InquiryFlow`, `PlotDossierPanel`, `PlotAnalysisRow`, `BindingOfferView`, `ProfileForm`, `FavoriteCard`, itd.) nie dostają własnego propa `surface` do przekazania dalej — każde ich wywołanie prymitywu wpisuje `surface="v5"` wprost w miejscu użycia, bo te komponenty nie mają dziś żadnego innego konsumenta niż migrowany ekran. `/check verify` per ekran (krok w Build planie) obejmuje ręczny przegląd, że żaden prymityw na zmigrowanym ekranie nie został pominięty (bez automatycznej reguły lintera na tym etapie prototypu, ten sam precedens co spec 0013 Enforcement).

**Kolejność ekranów i co się w nich zmienia** (kolejność biznesowa, patrz Build plan):
1. Wyniki: `ResultsHeader`, `ResultCard`, `ResultsFilterBar`, `ResultsSelection`, `ShortlistActionBar`, `CategoryFilterBar`, `SubcategoryFilterBar`, `EmptyResults` → `surface="v5"`, `ScrollReveal` na siatce wyników, audyt breakpointów.
2. Zapytanie (`InquiryFlow`, `InquiryConfirmationCard`) i oferta (`BindingOfferView`) → to samo.
3. Szczegóły projektu, dokończenie: `ProjectTechnicalSpecs`, `ProjectCertifications`, `ProjectSpecIcons`, chrome strony (`ProjectGallery` już v5, nietknięta).
4. Działka (`PlotDossierPanel`, `PlotAnalysisRow`) i realizacja (`StageTimeline` przez `/klient/realizacja`, `page.tsx`).
5. Panel klienta: `panel/layout.tsx`, `PanelTabs`, `PanelEmptyState`, `ProfileForm`, `FavoriteCard`, `FavoritesGrid`, `FavoriteButton`, `FavoriteCompareTable`.
6. Rejestracja: `app/[locale]/klient/rejestracja/page.tsx` i formularz w `components/auth/`.

**Kluczowe niezmienniki**:
- Każdy prymityw bez wprost przekazanego `surface` renderuje się dokładnie tak jak dziś (`"v3"` jest wartością domyślną) — strona producenta nie wymaga żadnej zmiany kodu.
- `StatusPill`, `approved`/`conditional`/`blocked` nigdy nie zmieniają koloru niezależnie od otaczającego `surface`.
- Żaden z ośmiu ekranów nie wprowadza `brand-v4-*`; v4 zostaje wyłącznie na stronie startowej.
- Każda nowa animacja (przejście albo `ScrollReveal`) respektuje `prefers-reduced-motion` (już wzorzec w `app/globals.css`); żadna nowa animacja nie jest jedynym nośnikiem informacji o stanie (zasada WCAG już obowiązująca w projekcie).
- Żadna trasa, parametr URL, kontrakt danych ani reguła biznesowa nie zmienia się na żadnym z ośmiu ekranów.

**Security model**: Bez zmian. Strony pozostają dokładnie tak samo publiczne albo chronione sesją, jak dziś (`/klient/panel/*` przez bramkę sesji z funkcji 24, `/klient/rejestracja` bez zmian z funkcji 7); ten spec nie dotyka autoryzacji.

**Configuration required**: Brak nowych zmiennych środowiskowych ani zależności (biblioteka `motion` już zainstalowana, ale ten spec jej nie wymaga — `ScrollReveal` i klasy Tailwind wystarczają na cały zakres AC-6/AC-7).

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wejście na `/pl/klient/wyniki` po migracji pokazuje kartę wyników na tle `brand-v5-surface`, z widocznym przejściem przy najechaniu na kartę i płynnym pojawieniem się siatki przy przewinięciu, sprawdza **AC-1**, **AC-6**, **AC-7**.
- Regresja producenta: zrzut ekranu Playwright (baseline sprzed kroku 1 Build planu) z `/pl/producent/realizacje` (konsument `StageTimeline`), `/pl/producent/produkty`, `/pl/producent/projekt` (konsumenci `Button`/`Card`/`Input`) porównany piksel po pikselu z tym samym zrzutem po kroku 1, zero różnicy, sprawdza **AC-2**.
- Przypadek brzegowy: `/pl/klient/panel/ulubione` na szerokości 360px i 768px (telefon i tablet) nie ma poziomego przewijania całej strony i każda karta ulubionego jest w pełni czytelna, sprawdza **AC-8**.
- Dostępność: `StatusPill` na `/pl/klient/dzialka` po migracji tła karty na v5 zachowuje dokładnie te same kolory `approved`/`conditional`/`blocked` i ten sam kontrast, sprawdza **AC-3**, **AC-9**.
- Auth/permission: brak zmiany — `/pl/klient/panel/*` nadal wymaga sesji, `/pl/klient/rejestracja` nadal dostępna bez sesji, sprawdza **AC-5**.
- Testy istniejące: `ResultsFilterBar.test.tsx`, `ResultsHeader.test.tsx`, `CategoryFilterBar.test.tsx`, `SubcategoryFilterBar.test.tsx`, `EmptyResults.test.tsx`, `ResultsSelection.test.tsx` i `e2e/wyniki.spec.ts` (i odpowiedniki na pozostałych siedmiu ekranach, gdzie istnieją) nadal przechodzą po migracji, zaktualizowane tam, gdzie asertowały konkretną klasę v3 zamiast zachowania, sprawdza **AC-5**.

## Build plan

Kolejność: najpierw fundament (wariant `surface` na dziesięciu współdzielonych prymitywach, bo każdy kolejny krok go potrzebuje), potem osiem ekranów w kolejności dzisiejszego priorytetu biznesowego (wyniki i strona startowa to dziś to, co oglądają inwestorzy), na końcu jeden przegląd dostępności całości. To nie jest czysty Tracer Bullet epiki Produkcja (nie ma tu nowej warstwy backendu do przebicia), tylko analogiczna zasada: fundament, na którym stoi wszystko inne, przed rozbudową. Każdy krok obejmuje token+layout+animacje razem w jednym przejściu (nie osobne commity per warstwa), więc cofnięcie kroku cofa całość tego ekranu naraz.

1. [x] Dodaj wariant `surface: "v3" | "v5"` (domyślnie `"v3"`) do `Button`, `Card`, `Input`, `Select`, `Checkbox`, `Label`, `Heading`, `Text`, `DataText`, `StageTimeline` w `components/ui/`. Przed zmianą zrób zrzuty ekranu Playwright kilku reprezentatywnych ekranów producenta (`/producent/realizacje`, `/producent/produkty`, `/producent/projekt`); po zmianie porównaj piksel po pikselu, zero różnicy, satisfies **AC-2**, **AC-3**, **AC-4**
2. [x] Migruj wyniki (`ResultsHeader`, `ResultCard`, `ResultsFilterBar`, `ResultsSelection`, `ShortlistActionBar`, `CategoryFilterBar`, `SubcategoryFilterBar`, `EmptyResults`, plus `FamilyTabs`/`SearchSegment` — nie wymienione w tabeli powyżej, ale renderowane na tym ekranie) na `surface="v5"`, dodaj brakujące przejścia, `ScrollReveal` na siatce, audyt breakpointów, zaktualizuj istniejące testy komponentów/e2e tego ekranu, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**
3. [x] Migruj zapytanie (`InquiryFlow`, `InquiryConfirmationCard`) i oferta (`BindingOfferView`) tym samym wzorcem, zaktualizuj ich testy, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**
4. [x] Dokończ szczegóły projektu: `ProjectTechnicalSpecs`, `ProjectCertifications`, `ProjectSpecIcons`, chrome strony (`ProjectGallery` bez zmian, już v5), zaktualizuj testy, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-8**, **AC-9**
5. [x] Migruj działkę (`PlotDossierPanel`, `PlotAnalysisRow`) i realizację (`StageTimeline` przez `/klient/realizacja`, `page.tsx`), zaktualizuj testy, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**
6. [x] Migruj panel klienta (`panel/layout.tsx`, `PanelTabs`, `PanelEmptyState`, `ProfileForm`, `FavoriteCard`, `FavoritesGrid`, `FavoriteButton`, `FavoriteCompareTable`, plus `panel/zapytania`/`ulubione`/`profil` page.tsx chrome) na dzisiejszym stanie markupu funkcji 24, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**. Potwierdzone ręcznie w przeglądarce z sesją klienta.
7. [x] Migruj rejestrację (`app/[locale]/klient/rejestracja/page.tsx`, `ClientRegistrationForm` w `components/auth/`) na dzisiejszym stanie markupu funkcji 7, tą samą zasadą co krok 6, satisfies **AC-1**, **AC-5**, **AC-6**, **AC-8**, **AC-9**
8. [x] Jeden przegląd WCAG 2.2 AA na całości ośmiu ekranów (kontrast v5, kolejność fokusa, `.focus-ring`), satisfies **AC-9**. Znaleziono i naprawiono: `text-brand-v5-amber-strong` jako kolor tekstu (nie ikony/obramowania) miał kontrast ~2.5:1 wobec białego tła, poniżej progu 4.5:1 — zamieniono na `text-brand-v5-ink` w `Button` ghost, `CategoryFilterBar`, `SubcategoryFilterBar`, `StageTimeline` (etykieta "Aktualny etap"), `ResultCard` (plakietka podglądu) i `ClientRegistrationForm` (link "Zaloguj się"). To samo ryzyko istnieje już dziś w `SiteHeader`, `LoginForm`, `ProducerRegistrationForm`, `CategoryShowcase` — poza ośmioma ekranami tego spec, odnotowane w Follow-up.

## Consequences

**Positive**:
- Cała ścieżka klienta (poza samą stroną producenta) mówi wreszcie jednym językiem wizualnym, zamiast dzisiejszego rozjazdu między dopracowaną stroną startową a surową resztą.
- Strona producenta dostaje zero zmian wizualnych — domyślna wartość `"v3"` czyni tę migrację w pełni addytywną i bezpieczną do wycofania ekran po ekranie.
- Reużywa już zbudowane wzorce (`ScrollReveal`, Tailwind transitions, `PopularHomeCard`/`ProducerCard` jako referencja) zamiast wprowadzać nową zależność czy nowy wzorzec animacji.

**Negative / tradeoffs**:
- Dziesięć prymitywów dostaje drugą oś wariantu naraz; każdy z nich wymaga ponownego spojrzenia, żeby domyślna wartość faktycznie nie zmieniła niczego na stronie producenta.
- `assets/tokens/brand-v3-tokens.css` zostaje aktywny bezterminowo (strona producenta), więc produkt trwale niesie dwa systemy kolorów naraz, nie jeden — to świadomie zaakceptowany stan, nie błąd.
- Panel klienta (funkcja 24) i klient na realnym zapleczu (funkcja 7) są dziś wciąż w budowie funkcjonalnej (jeszcze bez `/check verify`); jeśli ich dalsza budowa doda nowy markup zanim ten spec dotrze do kroku 6, ten krok może wymagać dodatkowego przejścia.

**Neutral**:
- `DESIGN.md` nadal nie ma sekcji v5 (odnotowane już w spec 0013/0015 Follow-up); ten spec tego nie naprawia, tylko powiększa liczbę konsumentów v5, którzy na taką sekcję czekają.
- `components/ui/AGENTS.md` będzie wymagał aktualizacji swojej zasady „tokeny tylko z brand-v3-tokens.css" po zbudowaniu tego spec (zadanie `/sync`, nie tego spec).

## Follow-up

- [ ] `DESIGN.md` potrzebuje sekcji v5 (albo rozdzielenia v3/v4/v5), odnotowane już w spec 0013 i 0015 Follow-up, wciąż otwarte.
- [ ] `components/ui/AGENTS.md` wymaga aktualizacji zasady o źródle tokenów po zbudowaniu tego spec (nowa oś `surface`), zadanie dla `/sync`.
- [ ] Strona producenta zostaje na v3 bezterminowo; decyzja, czy i kiedy producent też przechodzi na v5, jest osobną, przyszłą decyzją, nieobjętą tym spec.
- [ ] Jeśli funkcja 7 (klient na realnym zapleczu) albo funkcja 24 (panel klienta) doda nowy markup przed krokiem 5/6 tego Build planu, sprawdzić, czy nowy markup też wymaga migracji w tym samym przejściu, zamiast zostawiać go na v3.
- [ ] Formalne zatwierdzenie właściciela marki dla v5 jako domyślnego systemu reszty produktu (poza samą stroną startową) nie zostało przeprowadzone zgodnie z `docs/brand-guidelines-v3.md` sekcja 15 — to samo zastrzeżenie, które spec 0013 już odnotował dla samego v4.
- [ ] `--brand-v5-amber-strong` (`#e89200`) jako kolor *tekstu* na białym tle ma kontrast ~2.5:1, poniżej progu WCAG 4.5:1 — krok 8 tego spec naprawił to na ośmiu migrowanych ekranach, ale ten sam wzorzec już istnieje w `components/klient/SiteHeader.tsx`, `components/auth/LoginForm.tsx`, `components/auth/ProducerRegistrationForm.tsx` i `components/klient/CategoryShowcase.tsx` (strona startowa i nagłówek, poza zakresem tego spec) — do naprawienia osobno.

## Migration plan

**Strategy**: feature-flagged w praktyce przez addytywność (nowy wariant `surface` domyślnie `"v3"`, żaden dzisiejszy wywołujący nie zmienia zachowania), nie prawdziwy feature flag; wdrożenie ekran po ekranie, nie jednym big bangiem.

**Phases**:
1. Wdróż fundament: nowy wariant `surface` na dziesięciu prymitywach, domyślnie `"v3"` wszędzie. Zero widocznej zmiany na produkcji (ani u klienta, ani u producenta), bo nikt jeszcze nie przekazuje `surface="v5"`.
2. Migruj wyniki, zapytanie, oferta (krok 2 i 3 Build planu) — pierwszy widoczny efekt, na ekranach o najwyższej widoczności biznesowej.
3. Migruj resztę: szczegóły projektu, działka, realizacja, panel, rejestracja (kroki 4 do 7).
4. Zweryfikuj: `/check verify` po każdej grupie ekranów potwierdza kontrast v5, brak regresji na stronie producenta (`StageTimeline`, `Button`, `Card` itd. bez `surface` nadal renderują v3), i responsywność na telefonie.

**Rollback**: Cofnięcie dowolnego pojedynczego kroku 2 do 7 (jeden ekran) jest bezpieczne jednym rewertem commitów tego ekranu, bo zmiana jest czysto addytywna (nowy prop, stary wygląd zostaje domyślny) i nie dotyka żadnego innego ekranu ani strony producenta; token, layout i animacje tego ekranu wracają razem, bo zostały wdrożone w jednym przejściu (patrz Build plan). Krok 1 (fundament) przestaje być bezpieczny do cofnięcia osobno, gdy tylko krok 2 zostanie wdrożony — cofnięcie kroku 1 wtedy złamałoby build (każdy ekran zmigrowany po nim odwołuje się do propa, który by zniknął). W praktyce krok 1 zostaje trwale w kodzie od chwili wdrożenia kroku 2.

**Risks**: `StageTimeline` jest współdzielony z `/producent/realizacja` — każda zmiana w jego wspólnych klasach (nie tylko dodanie wariantu) musi być zweryfikowana na obu ścieżkach, nie tylko na kliencie. Panel klienta i rejestracja (funkcje 24 i 7) są dziś wciąż w budowie funkcjonalnej; jeśli ich dalsza budowa doda nowy markup przed krokiem 6/7 tego Build planu, ten krok może wymagać dodatkowego przejścia po tym, jak markup faktycznie powstanie.
