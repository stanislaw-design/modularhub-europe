# 0027. Domknięcie wizualne ścieżki klienta — rationale

## Context

> ⚠️ Premise note: Produkcja scope funkcja 9 opisuje ten krok jako „migracja całej ścieżki klienta na v4" (marka v4, spec 0013). To już nieaktualne. Od spec 0015 strona startowa w większości działa na v5 (jasny, premium kierunek), a v4 zostało zawężone do samego zdjęciowego hero i paru ciemnych sekcji. Nagłówek strony (`SiteHeader`) i galeria zdjęć na stronie szczegółów projektu (`ProjectGallery`) już dziś renderują v5 w swoim jasnym stanie. Literalne domknięcie do v4 pogłębiłoby dzisiejszy rozjazd zamiast go zamykać. Ten spec traktuje v5 jako właściwy cel (potwierdzone w rozmowie projektowej), v4 zostaje zarezerwowane dla zdjęciowych/ciemnych sekcji tak jak dziś.

Trzy generacje tokenów marki współistnieją dziś w produkcie: v3 (`assets/tokens/brand-v3-tokens.css`, oryginalny, wciąż jedyny system strony producenta), v4 (`brand-v4-tokens.css`, ciemny/bursztynowy, spec 0013, dziś tylko zdjęciowe hero i parę sekcji strony startowej) i v5 (`brand-v5-tokens.css`, jasny premium, spec 0015, dziś większość sekcji strony startowej plus nagłówek w stanie pełnym i `ProjectGallery`).

Poza stroną startową cała reszta ścieżki klienta stoi dziś na v3: wyniki, zapytanie, działka, oferta, realizacja, reszta strony szczegółów projektu (poza galerią), panel klienta (profil/ulubione/zapytania) i rejestracja. Skan kodu (agent read only) potwierdza: 29 plików `components/klient/`+`components/ui/` na bare `brand-*` (v3), 13 na v5, 4 na v4/v4+v5. Te same ekrany mają dziś w większości sztywny układ bez wariantów `sm:`/`md:`/`lg:` (wyjątek: `ProjectTechnicalSpecs`, strona szczegółów, `BindingOfferView`, częściowo `InquiryConfirmationCard`) i prawie żadnych przejść/mikroanimacji poza pojedynczymi przypadkami (`ResultsFilterBar` ma `transition-colors`, `PlotAnalysisRow` ma `animate-spin` na spinnerze ładowania).

Kluczowe ograniczenie architektoniczne: prymitywy współdzielone w `components/ui/` (`Button`, `Card`, `Input`, `Select`, `Checkbox`, `Label`, `Heading`, `Text`, `DataText`, `StageTimeline`) są dziś na sztywno zapisane na tokenach v3 (`bg-brand-warm-white`, `text-brand-foundation-navy`, `border-brand-steel`, itd.) i są współdzielone między ścieżką klienta i ścieżką producenta (`components/producent/` też je konsumuje, `StageTimeline` wprost w `producent/realizacja`). Przemalowanie ich w miejscu przemalowałoby też stronę producenta, co jest poza zakresem tej decyzji (funkcja 9 dotyczy wyłącznie „ścieżki klienta"). Jeden precedens złamania tej zasady już istnieje: `Accordion.tsx` (w `components/ui/`) ma na sztywno zapisane tokeny v5, bo dziś ma tylko jednego konsumenta (FAQ na stronie startowej) — nie jest to dziś problem, ale nie skaluje się na dziesięć prymitywów z konsumentami po obu stronach.

„Done when" funkcji 9 w scope wymaga trzech rzeczy naraz: spójnych tokenów na każdym ekranie ścieżki klienta, przeglądu interakcji/mikroanimacji, i dopracowania pod telefon — żadna z trzech nie jest opcjonalna.

## Evidence: stan tokenów per ekran (skan kodu)

| Ekran | Generacja tokenów dziś | Dojrzałość wizualna | Mikroanimacje | Responsywność |
|---|---|---|---|---|
| `/klient` (strona startowa) | v4 (hero) + v5 (reszta sekcji) | dopracowana, marketingowa | brak w stronie samej; sekcje mają `sm:`/`lg:` | tak |
| `/klient/wyniki` | v3 | surowa, funkcjonalna siatka kart | minimalne (`ResultsFilterBar` `transition-colors`) | częściowa |
| `/klient/zapytanie` | v3 | surowa, formularzowa | brak | częściowa (`InquiryConfirmationCard` ma `sm:`) |
| `/klient/dzialka` | v3 | surowa | `animate-spin` + `transition-transform` w `PlotAnalysisRow` | brak |
| `/klient/oferta` | v3 | surowa, dokumentowa | brak | tak (`sm:`/`md:`) |
| `/klient/realizacja` | v3 (`StageTimeline`) | surowa, funkcjonalna oś | brak | brak |
| `/klient/projekt/[id]` | mieszane: v3 (specyfikacje/certyfikaty) + v5 (`ProjectGallery`) | mieszana | `ProjectGallery` ma `duration-300`/`transition-transform` | tak (strona + `ProjectTechnicalSpecs` + galeria) |
| `/klient/panel/*` | v3 | surowa, panel konta | brak | brak |
| `/klient/rejestracja` | v3 | surowa, formularz | nie sprawdzone głęboko | brak |
| `SiteHeader`/`RouteShell` (stały chrome) | v4 (overlay) + v5 (pełny stan) | dopracowany | `transition-colors duration-300`, Headless UI `transition` | tak |

Liczba plików `components/klient/`+`components/ui/` per generacja: v3 (bez sufiksu) 29, v4 4 (`ClosingCta`, `ComplianceEngineShowcase`, `Hero`, `SiteHeader`), v5 13 (`CategoryShowcase`, `CompareHomesTeaser`, `ComplianceEngineShowcase`, `HowItWorksExplainer`, `PopularHomeCard`, `ProducerCard`, `ProducerShowcase`, `ProjectGallery`, `SearchCard`, `SiteHeader`, `Testimonials`, `Accordion`, `StarRating`).

`components/ui/ScrollReveal.tsx` już istnieje: generyczny wrapper reveal on scroll (IntersectionObserver, jedna klasa `.scroll-reveal` w `app/globals.css`, z obsługą `prefers-reduced-motion` już wbudowaną w pięciu miejscach `app/globals.css`). Biblioteka `motion` (następca Framer Motion) jest już zależnością (`package.json`, `^13.2.0`), używana dziś w trzech plikach (`SearchCard`, `SearchSegment`, `WordRotate`).

`DESIGN.md` (root, nie `docs/design.md`) dokumentuje dziś wyłącznie v3/v4 — v5 nigdy nie dostało własnej sekcji (odnotowane już jako otwarte w Follow-up spec 0013 i 0015).

## Options considered

### Option 1: v5 jako główny cel, v4 tylko dla zdjęciowych/ciemnych sekcji, prymitywy dostają opcjonalny prop `surface` (wybrane)

Reszta ścieżki klienta przechodzi na v5. Dziesięć współdzielonych prymitywów (`Button`, `Card`, `Input`, `Select`, `Checkbox`, `Label`, `Heading`, `Text`, `DataText`, `StageTimeline`) dostaje nowy wariant `surface: "v3" | "v5"` (domyślnie `"v3"`, zero zmiany zachowania dla dzisiejszych wywołań), zamiast osobnej nazwy `tone` (już zajętej na `Text`/`DataText` inną, semantyczną osią default/muted).

**Pros**:
- Kontynuacja już przyjętego, zweryfikowanego kierunku (nagłówek, `ProjectGallery`, cała reszta strony startowej) zamiast trzeciego, sprzecznego kierunku.
- Jeden komponent, jedno miejsce prawdy; strona producenta dostaje zero zmian wizualnych (domyślna wartość `"v3"`), bez ryzyka regresji.
- Explicit przy każdym wywołaniu (`surface="v5"`), łatwe do policzenia i wyszukania w przyszłości.

**Cons**:
- Dziesięć prymitywów dostaje drugą oś wariantu naraz; więcej powierzchni do przetestowania niż punktowa zmiana jednego ekranu.
- `components/ui/AGENTS.md` dziś wprost mówi „tokeny z brand-v3-tokens.css, nigdy inny system" — ta zasada wymaga aktualizacji (Follow-up, poza zakresem tego spec, należy do `/sync`).

### Option 2: v4 wszędzie (dosłowne odczytanie scope funkcji 9)

Reszta ścieżki klienta przechodzi na v4 (ciemny/bursztynowy), zgodnie z pierwotnym zapisem scope.

**Pros**:
- Dosłownie realizuje zapisany dziś tekst funkcji 9, zero potrzeby aktualizacji scope opisu.

**Cons**:
- Pogłębia dzisiejszy rozjazd zamiast go zamykać: nagłówek i `ProjectGallery` już renderują v5, a v4 samo w sobie jest pomyślane jako ciemny/zdjęciowy wyjątek (spec 0013), nie jako system dla treściowych, jasnych ekranów jak wyniki czy panel konta.
- Odrzucone wprost w rozmowie projektowej na rzecz kontynuacji v5.

### Option 3: Nowy, ujednolicony zestaw v6, przez dedykowane komponenty klienta (bez zmian w prymitywach)

Żaden z dzisiejszych trzech systemów nie jest już właściwym punktem odniesienia; zaprojektować nową, jedną paletę i budować każdy ekran przez nowe komponenty w `components/klient/` (wzorem `PopularHomeCard`/`ProducerCard`), nie dotykając `components/ui/`.

**Pros**:
- Zero ryzyka dla producenta (nie dotyka współdzielonych prymitywów w ogóle).
- Czysta karta, bez dziedziczenia niespójności v3/v4/v5.

**Cons**:
- Odrzucone wprost w rozmowie projektowej: engineer wybrał kontynuację istniejącego v5, nie nowy kierunek.
- Czwarta z rzędu zmiana kierunku wizualnego strony startowej (po v3→v4→v5) rozciągnięta teraz na całą resztę produktu byłaby dokładnie tym ryzykiem, przed którym spec 0015 Follow-up już ostrzegało po trzech redesignach samego hero.
- Duplikuje strukturę komponentów (nowy `Card`-podobny wrapper per ekran) zamiast reużyć jeden prawdziwy prymityw z wariantem.

### Option 4: Nadpisanie zmiennych CSS per poddrzewo, bez zmiany w prymitywach

Zamiast propa na każdym prymitywie, opakować `app/[locale]/klient/layout.tsx` (albo poszczególne strony) klasą, która nadpisuje same zmienne CSS (`--color-brand-warm-white`, `--color-brand-foundation-navy`, itd.) na wartości v5 dla całego poddrzewa. Żaden z dziesięciu prymitywów nie zmienia się w ogóle.

**Pros**:
- Zero zmian w `components/ui/`, więc zero ryzyka literówki w nowym wariancie na dziesięciu plikach naraz.
- Jeden plik CSS zamiast dziesięciu edycji.

**Cons**:
- Niebezpieczne właśnie dlatego, że nie jest jawne: nadpisanie `--color-brand-warm-white` zmienia też każdy inny, niezwiązany z tym spec element w tym poddrzewie, który przypadkiem używa tego samego tokenu z zupełnie innego powodu — nie da się tego wyłapać przez grep, tylko przez wizualną kontrolę całego poddrzewa.
- Pozycyjne, nie jawne przy wywołaniu: gdyby kiedyś trzeba było osadzić na tym samym ekranie fragment, który ma świadomie zostać na v3 (np. współdzielony widget), zagnieżdżenie w DOM decydowałoby o kolorze, nie jawny wybór w miejscu użycia — łamliwsze niż prop przekazany explicité przy każdym wywołaniu.
- Rozjeżdża się z już przyjętym w projekcie wzorcem: `Accordion.tsx` (jedyny dzisiejszy precedens v5 w `components/ui/`) już używa jawnych klas Tailwind, nie nadpisania zmiennej.

## Rationale

Option 1 jest bezpośrednią kontynuacją decyzji już podjętych i zweryfikowanych (spec 0013, 0015, 0025): nagłówek i `ProjectGallery` już dowodzą, że v5 działa jako jasny, premium system dla treściowych ekranów, więc dokańczanie reszty ścieżki klienta w tym samym kierunku domyka rozjazd zamiast go pogłębiać (Option 2) albo otwierać czwarty kierunek bez potrzeby (Option 3, wprost odrzucone w rozmowie).

Nazwa `surface` (nie `tone`) dla nowego wariantu jest decyzją inżynierską podjętą tu wprost: `Text.tsx` i `DataText.tsx` już mają prop `tone` o innym znaczeniu (`default`/`muted`, kontrast tekstu), więc druga oś (która generacja tokenów) potrzebuje własnej nazwy, żeby nie kolidować i nie przeciążać jednego słowa dwoma niezależnymi znaczeniami.

Domyślna wartość `"v3"` na każdym z dziesięciu prymitywów jest tym, co czyni tę migrację bezpieczną: strona producenta i każdy jeszcze niemigrowany ekran klienta nie wymagają żadnej zmiany kodu, żeby zachować dzisiejszy wygląd — tylko ekrany wprost migrowane w tym spec przekazują `surface="v5"`.

Option 4 (nadpisanie zmiennych CSS per poddrzewo) wymaga mniej edycji, ale kosztem jawności: jeden prop na wywołaniu jest widoczny w kodzie i grep-owalny, nadpisana zmienna CSS działa po cichu na wszystko w poddrzewie niezależnie od intencji. Dla projektu, w którym producent i klient dzielą te same pliki prymitywów, jawność przy każdym wywołaniu jest warta dziesięciu dodatkowych edycji.
