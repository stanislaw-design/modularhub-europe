# 0034. Przyklejony pasek wyszukiwania na wynikach

**Date**: 2026-09-11
**Status**: Proposed

## Summary

Ten spec sprawia, że pasek wyszukiwania na stronie `/wyniki` zostaje osiągalny przez cały czas, nie tylko na samej górze strony. Gdy klient przewinie listę wyników w dół, pod nagłówkiem pojawia się przyklejona (zadokowana) wersja paska: od szerokości `sm` w górę pełny pasek (kraj, metraż, sortowanie, słowo kluczowe), poniżej `sm` skrócona pigułka (słowo kluczowe plus przycisk „Filtruj"). Przycisk „Filtruj" na każdej szerokości otwiera panel z pełnym kompletem kryteriów (rodzina produktu, pasek wyszukiwania, chipy atrybutów). Zmiana kryterium nigdy nie wymaga już powrotu na górę strony.

## Requirements

**User stories**:
- Jako klient przeglądający wyniki, chcę w dowolnym momencie przewijania zmienić kryteria wyszukiwania (kraj, metraż, sortowanie, słowo kluczowe, rodzinę produktu, atrybuty), bez przewijania z powrotem na górę strony.
- Jako klient na telefonie, chcę żeby przyklejony pasek zajmował mało miejsca na ekranie, jednocześnie dając dostęp do wszystkich kryteriów przez jeden przycisk.
- Jako klient na szerokim ekranie, chcę mieć pełny pasek wyszukiwania od razu widoczny, bez dodatkowego kliknięcia, skoro miejsca wystarcza.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Gdy klient na `/pl/klient/wyniki` przewinie stronę poza pierwotne miejsce paska wyszukiwania, pod `SiteHeader` pojawia się jego zadokowana (przyklejona) wersja i zostaje widoczna do końca przewijania.
- **AC-2**: Od istniejącego przełomu `sm` w górę (ten sam, na którym `ResultsFilterBar` już dziś przechodzi z kolumny na wiersz) zadokowany pasek pokazuje cały `ResultsFilterBar` wprost: kraj, metraż od, metraż do, sortowanie, słowo kluczowe, przycisk szukaj.
- **AC-3**: Poniżej `sm` zadokowany pasek pokazuje tylko pole słowa kluczowego (zawsze widoczne i edytowalne) plus przycisk „Filtruj"; kraj, metraż i sortowanie nie są tam pokazane wprost.
- **AC-4**: Przycisk „Filtruj", obecny na zadokowanym pasku na każdej szerokości, otwiera panel z pełnym kompletem kryteriów: `FamilyTabs` (rodzina produktu), cały `ResultsFilterBar` (kraj, metraż, sortowanie, słowo kluczowe), oraz rzędy chipów atrybutów (`CategoryFilterBar`, a dla rodzin, które go mają, `SubcategoryFilterBar`). Ta sama zawartość na każdej szerokości.
- **AC-5**: Panel renderuje się jako wysuwany arkusz od dołu (bottom sheet) poniżej `sm` i jako boczny panel od `sm` w górę.
- **AC-6**: Wybór dowolnego filtra albo chipa wewnątrz otwartego panelu od razu nawiguje i odświeża wyniki, tak samo jak dzisiejsze chipy już to robią; panel zostaje otwarty, klient zamyka go ręcznie.
- **AC-7**: Panel zamyka się przez własny przycisk zamknięcia, kliknięcie w tło (backdrop) i klawisz Escape; zamknięcie zawsze zwraca fokus na przycisk „Filtruj", który go otworzył.
- **AC-8**: Zanim klient przewinie stronę poza pierwotne miejsce paska, strona wygląda dokładnie tak jak dziś (pasek w naturalnym miejscu w treści, niezadokowany); przejście do stanu zadokowanego nigdy nie przesuwa treści pod nim (brak skoku układu, CLS).
- **AC-9**: Zadokowany pasek i otwarty panel spełniają WCAG 2.2 AA: każda kontrolka jest osiągalna klawiaturą z widocznym `.focus-ring`, panel niesie poprawną semantykę dialogu (`aria-modal`, opisany etykietą), a warstwy (zadokowany pasek, panel, `SiteHeader` z jego własnym menu, stały dolny `ShortlistActionBar`) nigdy się błędnie nie nakładają ani nie przechwytują fokusa.
- **AC-10**: Zadokowany pasek i panel działają responsywnie od 320px szerokości w górę, bez poziomego przewijania strony i bez ucinania kontrolek.
- **AC-11**: Cała funkcja jest ograniczona do `/wyniki`; żadna inna trasa `klient/` się nie zmienia.

## Decision

**Chosen option**: Opcja 2, pełny pasek od `sm` w górę, skrócona pigułka i rozwijany panel poniżej.

**Implementation skills**: `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Pełne uzasadnienie i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**: Brak. Cała funkcja jest stanem UI po stronie klienta (otwarty/zamknięty panel, zadokowany/niezadokowany pasek) plus już istniejący, sterowany przez URL `ResultsFilter` (`lib/results-filters.ts`). Żadnych nowych encji, pól ani zmian w bazie.

**API surface** (interfejs strony, brak osobnego endpointu, ten sam wzorzec co spec 0004/0026):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| Przewinięcie strony poza pierwotne miejsce paska | Scroll klienta na `/wyniki` | Pozycja przewinięcia (sentinel/próg) | Zadokowany pasek staje się widoczny pod `SiteHeader` | Brak (strona publiczna) | Brak; przy powrocie na górę pasek wraca do stanu niezadokowanego |
| Przycisk „Filtruj" na zadokowanym pasku | Kliknięcie/Enter/Spacja (klawiatura) | Brak | Otwiera panel filtrów (lokalny stan) | Brak | Brak |
| Filtr/chip wewnątrz panelu → URL wyników | Kliknięcie/zatwierdzenie wewnątrz otwartego panelu | Ten sam zestaw parametrów co dziś (`country`, `sizeMin`/`sizeMax`, `sort`, `q`, `heatSource`, `ventilation`, `energyClass`, `storeys`, `spaSubcategory`, `pergolaSubcategory`, `family`) | Nawigacja `buildResultsHref`/`toggleFilterValue`, panel zostaje otwarty | Brak | Nieprawidłowa wartość łagodnie ignorowana, ten sam wzorzec co dziś (`lib/results-filters.ts`) |
| Zamknięcie panelu (przycisk/backdrop/Escape) | Interakcja klienta | Brak | Panel się zamyka, fokus wraca na przycisk „Filtruj" | Brak | Brak |

**Key invariants**:
- Pierwotny (niezadokowany) pasek nigdy nie znika z dokumentu tylko dlatego, że pojawia się zadokowana wersja; wysokość strony pozostaje stabilna, żadne przewinięcie nie powoduje skoku układu (AC-8).
- Zadokowany pasek i panel filtrów żyją wyłącznie w komponentach specyficznych dla ekranu `/wyniki` (nie w `SiteHeader` ani we wspólnym layoucie klienta), więc żadna inna trasa się nie zmienia (AC-11).
- `FamilyTabs`, `CategoryFilterBar` i `SubcategoryFilterBar` są dziś asynchronicznymi komponentami serwerowymi; panel filtrów (komponent kliencki, Headless UI `Dialog`) przyjmuje ich już wyrenderowaną zawartość jako `children` z `page.tsx`, zamiast na nowo implementować je po stronie klienta.
- Stan otwarcia panelu musi przetrwać nawigację wywołaną wyborem filtra wewnątrz niego (AC-6): komponent trzymający ten stan nie może się odmontować przy zmianie parametrów URL, więc jego miejsce w drzewie komponentów musi zostać stabilne w trakcie nawigacji wewnątrz `/wyniki`.
- Warstwy (z-index) nie mogą się gryźć z już istniejącymi: `SiteHeader` (`z-40`, jego rozwijane menu `z-50`) i stały dolny `ShortlistActionBar` (`z-10`, fixed na dole). Zadokowany pasek siada pod nagłówkiem, panel filtrów otwiera się nad zadokowanym paskiem, dolny pasek shortlisty zostaje nietknięty (inna krawędź ekranu).
- Wykrywanie momentu dokowania nie może polegać na sztywnym pikselowym progu liczonym ręcznie względem zawartości nad paskiem (krucha przy każdej zmianie treści powyżej); zamiast tego obserwator przecięcia (`IntersectionObserver`) na znaczniku (sentinel) tuż nad pierwotnym paskiem, ten sam rodzaj mechanizmu co scroll listener w `SiteHeader.tsx` dla nakładki na stronie startowej, ale odporny na zmiany wysokości treści powyżej.

**Security model**: Strona publiczna, bez logowania, bez zmian względem spec 0004/0026.

**Configuration required**: Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: klient na desktopie przewija `/wyniki` w dół, zadokowany pełny `ResultsFilterBar` się pojawia, zmienia sortowanie wprost na pasku, wyniki się odświeżają bez powrotu na górę, sprawdza **AC-1**, **AC-2**, **AC-8**.
- Happy path mobile: klient na telefonie przewija w dół, widzi pigułkę (słowo kluczowe + „Filtruj"), otwiera panel, przełącza rodzinę na „spa modułowe", panel zostaje otwarty i lista wyników się odświeża, zamyka panel przyciskiem, fokus wraca na „Filtruj", sprawdza **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**.
- Przypadek brzegowy: klient przewija z powrotem na samą górę, zadokowany pasek znika, strona wygląda jak przed przewinięciem, bez skoku treści, sprawdza **AC-1**, **AC-8**.
- Dostępność: nawigacja samą klawiaturą (Tab do „Filtruj", Enter otwiera panel, Escape zamyka, fokus wraca), `.focus-ring` widoczny na każdej kontrolce, panel czytany poprawnie przez czytnik ekranu (`aria-modal`, etykieta), sprawdza **AC-9**.
- Warstwy: przy otwartym panelu filtrów i widocznym dolnym `ShortlistActionBar` (po zaznaczeniu projektów) żaden element się nie nakłada błędnie ani nie blokuje kliknięcia drugiego, sprawdza **AC-9**.
- Wąski ekran: na 320px szerokości pigułka (pole tekstowe plus przycisk) mieści się bez poziomego przewijania strony i bez ucięcia przycisku, sprawdza **AC-10**.

## Build plan

Kolejność: najpierw mechanizm dokowania i podział pełny pasek/pigułka (fundament, na którym stoi reszta), potem wspólny panel filtrów, potem podłączenie i dopracowanie dostępności/warstw, na końcu tłumaczenia i przejście responsywności. Ponieważ ta funkcja nie dotyka żadnej warstwy danych ani backendu (czysto kliencki UI nad już realnym zapleczem po spec 0023/0026), domyślne podejście epiki Produkcja (Facade, najpierw interfejs na danych przykładowych) nie ma tu zastosowania w praktyce; kolejność poniżej odpowiada raczej jednemu pełnemu przejściu przez warstwę UI (Tracer Bullet w miniaturze), bo nie ma warstwy backendu do odłożenia na później.

1. [ ] Dodaj znacznik (sentinel) tuż nad pierwotnym paskiem i obserwator przecięcia (`IntersectionObserver`, wzorem scroll listenera w `SiteHeader.tsx`), który przełącza widoczność zadokowanego paska pod `SiteHeader`, bez usuwania pierwotnego paska z dokumentu; cała nowa funkcja żyje wyłącznie w komponentach `/wyniki`, satisfies **AC-1**, **AC-8**, **AC-11**
2. [ ] Rozbuduj zadokowaną wersję tak, aby od `sm` w górę pokazywała cały `ResultsFilterBar` wprost (kraj, metraż od/do, sortowanie, słowo kluczowe, szukaj), satisfies **AC-2**
3. [ ] Zbuduj skróconą wersję poniżej `sm`: pole słowa kluczowego zawsze widoczne plus przycisk „Filtruj", satisfies **AC-3**
4. [ ] Zbuduj współdzielony komponent panelu filtrów (Headless UI `Dialog`/`DialogPanel`/`DialogBackdrop`, ten sam wzorzec co menu w `SiteHeader.tsx`), przyjmujący jako `children` już wyrenderowane po stronie serwera `FamilyTabs`, `ResultsFilterBar`, `CategoryFilterBar` i (gdy dotyczy) `SubcategoryFilterBar`; wariant wysuwanego arkusza od dołu poniżej `sm`, boczny panel od `sm`, satisfies **AC-4**, **AC-5**
5. [ ] Podłącz przycisk „Filtruj" (zarówno na desktopowym, jak i mobilnym zadokowanym pasku) do otwierania tego panelu; zapewnij, że jego stan otwarcia przetrwa nawigację wywołaną wyborem filtra wewnątrz panelu (stabilne miejsce w drzewie komponentów, patrz Key invariants), satisfies **AC-6**
6. [ ] Domknij zarządzanie fokusem: zamknięcie panelu (przycisk zamknięcia, kliknięcie w tło, Escape) zawsze zwraca fokus na przycisk „Filtruj"; `aria-modal` i etykieta panelu, satisfies **AC-7**, **AC-9**
7. [ ] Zweryfikuj warstwy (z-index) względem `SiteHeader` (`z-40`, menu `z-50`) i `ShortlistActionBar` (`z-10`, fixed na dole), żeby żadna nie przykrywała błędnie drugiej ani nie blokowała kliknięcia, satisfies **AC-9**
8. [ ] Dodaj nowe etykiety (np. „Filtruj") do `messages/pl.json`, `messages/en.json`, `messages/nl.json`
9. [ ] Przejście responsywności od 320px w górę i ręczna weryfikacja WCAG 2.2 AA na żywo w przeglądarce (klawiatura, czytnik ekranu, kontrast, `.focus-ring`), satisfies **AC-10**

## Consequences

**Positive**:
- Klient może zmienić dowolne kryterium wyszukiwania w dowolnym momencie przewijania wyników, bez powrotu na górę strony.
- Pełna funkcjonalność (rodzina, atrybuty, kraj, metraż, sortowanie, słowo kluczowe) zostaje osiągalna na każdej szerokości ekranu, mimo że nie wszystko jest stale widoczne wprost.
- Wzorzec dokowania i panelu ponownie wykorzystuje już istniejące elementy (Headless UI `Dialog`, wzorzec scroll/próg z `SiteHeader.tsx`), więc nie wprowadza żadnej nowej zależności do projektu.

**Negative / tradeoffs**:
- Dwie ścieżki UI (pełny pasek od `sm`, pigułka poniżej) plus wspólny panel oznaczają więcej kodu i więcej przypadków do przetestowania niż jeden spójny wzorzec na każdej szerokości.
- Na desktopie panel „Filtruj" duplikuje kontrolki `ResultsFilterBar` już widoczne wprost na zadokowanym pasku; jedyna naprawdę nowa treść panelu na desktopie to rodzina produktu i chipy atrybutów.
- Stan otwarcia panelu musi przetrwać nawigację filtra wewnątrz niego, co wymaga uważnego umieszczenia komponentu w drzewie (nie może się odmontować przy zmianie URL) i jest łatwym miejscem na przyszły regres, jeśli ktoś przesunie go głębiej w drzewo bez świadomości tego wymogu.

**Neutral**:
- Nowe komponenty klienckie (zadokowany pasek, panel filtrów) korzystają z tych samych tokenów `brand-v5` i tego samego wzorca Headless UI `Dialog` co `SiteHeader`, więc wizualnie nie wprowadzają nowego języka projektowego.

## Follow-up

- [ ] Rozważyć licznik aktywnych filtrów na przycisku „Filtruj" (np. „Filtruj · 3"), żeby klient widział z zewnątrz, ile kryteriów ma dziś ustawionych, zanim otworzy panel; nieobjęte tym specem jako twarde kryterium, ale tania poprawa UX warta osobnej, szybkiej decyzji przy budowie.
- [ ] Rozważyć zdarzenie PostHog przy otwarciu panelu „Filtruj" i przy zadokowaniu paska (`lib/observability/`, spec 0021), podobnie do już odłożonego pomysłu zdarzeń wyszukiwania w spec 0026 Follow-up; osobna decyzja obserwowalności, nieobjęta tym specem.
