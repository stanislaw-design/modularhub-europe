# 0025. Hero strony startowej z pełnoekranowym zdjęciem i przezroczystym nagłówkiem

**Date**: 2026-09-04
**Status**: In Progress

## Summary

Hero strony głównej klienta znowu ma pełnoekranowe zdjęcie w tle (dom modułowy o zmierzchu, basen, pawilon spa), zamiast jasnego, wyśrodkowanego układu bez zdjęcia ze spec 0015. Treść (nagłówek, wyszukiwarka, odznaki zaufania) siedzi teraz w lewym dolnym rogu, a nagłówek strony (`SiteHeader`) jest przezroczysty i "unosi się" nad zdjęciem, zmieniając się w pełny biały pasek dopiero po przewinięciu strony, tylko na stronie głównej. To trzecia z rzędu zmiana kierunku wizualnego tego ekranu (po spec 0014 i 0015), wykonana świadomie na życzenie zamawiającego. Ta specyfikacja zastępuje (supersedes) spec 0015 w części dotyczącej hero i nagłówka.

## Context

> ⚠️ Uwaga wstępna: spec 0015 w swoim Follow-up wprost ostrzegała, że to już drugi duży redesign wizualny tej strony w krótkim czasie, i rekomendowała świadome "zamrożenie" tamtej wersji, żeby nie odwracać kierunku po raz trzeci bez pełnego kontekstu. Ta specyfikacja robi dokładnie to trzecie odwrócenie, świadomie, na wyraźne życzenie zamawiającego, po pokazaniu mu konkretnego zdjęcia referencyjnego (styl premium nieruchomości, w stylu Airbnb), którego spec 0015 nie realizowała.

Strona startowa klienta (`/pl/klient`) działała pod spec 0015: jasny, wyśrodkowany hero bez zdjęcia, tokeny v5. Zamawiający ocenił to jako zbyt płaskie względem konkretnego wzorca wizualnego, który miał w głowie: zdjęciowe hero w stylu dużych platform nieruchomości premium, ze zdjęciem domu wypełniającym cały ekran i tekstem osadzonym bezpośrednio na fotografii.

Zamawiający dostarczył zrzuty ekranu referencyjne (pierwotną inspirację, a potem własny szkic pożądanego układu) i pracował iteracyjnie nad kształtem: najpierw zdjęcie w tle z wyśrodkowanym tekstem i ciemnym gradientem dla czytelności, potem przesunięcie treści do lewego dolnego rogu, przezroczysty nagłówek, większa wysokość zdjęcia, a na końcu świadome usunięcie ciemnego gradientu (czytelność nagłówka H1 oparta wyłącznie o `text-shadow`).

Zdjęcie tła (`public/images/hero/klient-hero-bg.png`) było kilkukrotnie generowane i poprawiane w trakcie tej rozmowy (kolor elewacji, jasność, pozycja pawilonu spa), a finalny plik użyty w produkcie został podmieniony przez zamawiającego na inny, dostarczony przez niego z zewnątrz. Nie jest to plik wygenerowany w tej sesji.

## Requirements

**User stories**:
- Jako klient wchodzący na stronę główną, chcę zobaczyć od razu duże, atrakcyjne zdjęcie prawdziwie wyglądającego domu modułowego, żeby poczuć, że to platforma premium, nie płaski formularz.
- Jako klient, chcę żeby wyszukiwarka i nagłówek były czytelne na zdjęciu, tak żebym mógł od razu zacząć szukać, bez przewijania.
- Jako klient przewijający stronę w dół, chcę żeby nagłówek nawigacji został czytelny (białe tło), gdy zdjęcie hero znika z widoku.

**Acceptance criteria** (dokumentacja tego co zostało zbudowane, każde kryterium sprawdzalne osobno):

- **AC-1**: `Hero` renderuje jedno pełnoekranowe zdjęcie tła (`public/images/hero/klient-hero-bg.png`, `next/image` z `fill` i `priority`), rozciągnięte na całą szerokość viewportu, sięgające górnej krawędzi strony (bez białej szczeliny nad nim). Zastępuje AC-2 spec 0015 (jedno zdjęcie w wyśrodkowanym, jasnym układzie, bez pełnoekranowego tła).
- **AC-2**: Nagłówek H1 ("Twój dom. Mądrze wybrany."), miejsce na kartę wyszukiwania (`children`), akapit i trzy odznaki zaufania są zakotwiczone w lewym dolnym rogu sekcji (nie wyśrodkowane), z mniejszym marginesem od lewej na ekranach `lg` i szerszych niż na węższych. Zastępuje AC-13 spec 0015 (wyśrodkowana, jasna treść).
- **AC-3**: Nad zdjęciem nie renderuje się żaden ciemny gradient ani scrim. Czytelność H1 zapewnia wyłącznie `text-shadow` na samym nagłówku; jest to świadoma, trwała decyzja, nie stan tymczasowy.
- **AC-4**: Na trasie strony głównej klienta (`/{locale}/klient`, dokładne dopasowanie) `SiteHeader` renderuje się bez tła i bez obramowania (przezroczysty), pozycjonowany `fixed` (nie zajmuje miejsca w układzie), nakładając się bezpośrednio na zdjęcie hero. Tekst nawigacji, ikony i logo (wbudowany SVG z `currentColor` na ciemnych kształtach, bursztynowe kształty i tekst bez zmian) są w kolorze jasnym (`brand-v4-surface`).
- **AC-5**: Po przewinięciu strony głównej o więcej niż 96px (`HOME_HERO_SCROLL_THRESHOLD`), `SiteHeader` płynnie (`transition-colors duration-300`) zmienia się w pełny, nieprzezroczysty pasek (`brand-v5-surface`, obramowanie `brand-v5-line`), a tekst i logo wracają do ciemnego koloru (`brand-v5-ink`). Przewinięcie z powrotem nad próg przywraca stan przezroczysty.
- **AC-6**: Każda inna trasa `klient/` (np. `/wyniki`, `/dzialka`, `/oferta`) zachowuje dotychczasowe zachowanie `SiteHeader` bez zmian: zawsze pozycja `sticky`, zawsze pełne białe tło, zawsze ciemny tekst. Brak regresji poza stroną główną.

## Options considered

### Option 1: Zostać przy spec 0015 (bez zdjęcia, wyśrodkowany, jasny)
Utrzymanie status quo: hero bez zdjęcia, jasny motyw v5, treść wyśrodkowana.

**Pros**:
- Zero dodatkowej pracy, zero ryzyka regresji.
- Zgodne z jawną rekomendacją spec 0015 Follow-up, żeby nie odwracać kierunku po raz trzeci.

**Cons**:
- Nie realizuje konkretnego, dostarczonego przez zamawiającego wzorca wizualnego (zdjęciowe hero premium).
- Zamawiający ocenił tę wersję jako zbyt płaską, mało premium.

### Option 2: Zdjęcie w tle, tekst wyśrodkowany, z ciemnym gradientem dla czytelności
Pierwsza iteracja w tej rozmowie: pełnoekranowe zdjęcie, treść wyśrodkowana (jak w pierwotnej inspiracji), stały ciemny gradient od dołu dla kontrastu tekstu.

**Pros**:
- Najbliżej pierwotnego zrzutu inspiracji dostarczonego na starcie.
- Gradient gwarantuje przewidywalny kontrast tekstu niezależnie od jasności zdjęcia.

**Cons**:
- Zamawiający ocenił wyśrodkowanie i widoczny gradient jako gorsze niż układ z asymetrycznym akcentem, po dostarczeniu własnego szkicu (drugi zrzut referencyjny).
- Nagłówek strony pozostawał pełny i biały, wizualnie "obcinając" zdjęcie od góry zamiast dawać wrażenie jednej spójnej fotografii.

### Option 3: Zdjęcie w tle, treść w lewym dolnym rogu, przezroczysty nagłówek, bez gradientu (wybrane)
Treść zakotwiczona w lewym dolnym rogu, nagłówek przezroczysty i unoszący się nad zdjęciem (staje się pełny dopiero po scrollu), bez stałego ciemnego gradientu. Czytelność H1 zapewnia `text-shadow`.

**Pros**:
- Dokładnie odpowiada drugiemu zrzutowi referencyjnemu dostarczonemu przez zamawiającego.
- Nagłówek zintegrowany ze zdjęciem (nie osobny biały pasek) daje wrażenie jednej, spójnej, w pełni fotograficznej sekcji.
- Zdjęcie widoczne w całości, bez przyciemnienia, co najlepiej pokazuje jego jakość.

**Cons**:
- Bez gradientu czytelność podpisu i odznak zaufania (które nie mają własnego `text-shadow`) zależy od lokalnej jasności zdjęcia w tym miejscu kadru, co jest mniej przewidywalne niż stały gradient.
- Wymaga dodatkowej logiki w `SiteHeader` (wykrywanie trasy, nasłuch scrolla) tylko dla jednej strony. Pierwszy taki przypadek w projekcie.

## Decision

**Chosen option**: Option 3: Zdjęcie w tle, treść w lewym dolnym rogu, przezroczysty nagłówek, bez gradientu.

**Implementation skills**: `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Decyzja jest w całości estetyczna, podjęta bezpośrednio przez zamawiającego na podstawie dwóch dostarczonych zrzutów referencyjnych (pierwotna inspiracja, potem własny szkic pożądanego układu). Nie wynika z żadnego nowego wymagania produktowego czy technicznego. Opcja 3 została wybrana iteracyjnie, krok po kroku, w trakcie tej samej rozmowy: każda zmiana (przesunięcie treści, przezroczysty nagłówek, wyższe zdjęcie, usunięcie gradientu) była bezpośrednią odpowiedzią na konkretną, wypowiedzianą uwagę zamawiającego, nie propozycją inżyniera.

Usunięcie gradientu jest świadomym, trwałym wyborem (potwierdzonym wprost: "od tego gradientu na pewno odchodzimy"), nie tymczasowym stanem podglądu. Dlatego w kodzie nie ma już wyłączonego bloku `{false && (...)}`, tylko brak gradientu w ogóle.

## Feature design

**Zmienione komponenty**: `components/klient/Hero.tsx`, `components/klient/SiteHeader.tsx`. Bez zmian w `SearchCard.tsx` (biała karta wyszukiwania z spec 0015 działa bez zmian na nowym tle).

**Kluczowe mechanizmy**:
- `Hero`: `<section>` `full-bleed` (istniejąca klasa łamiąca max width kontenera nadrzędnego) z `-mt-brand-5` w pełni znoszącym `pt-brand-5` z `RouteShell`, dokładnie tyle, ile ten padding wynosi (poprzedni `-mt-brand-4` znosił go tylko częściowo, bo liczył się względem sticky nagłówka zajmującego miejsce w układzie; dzisiejszy `fixed` nagłówek na stronie głównej nie zajmuje już miejsca, więc zdjęcie musi sięgać dokładnie do `y=0`). `min-h-[640px] lg:min-h-[760px]`, `flex flex-col justify-end` zakotwicza treść na dole.
- `SiteHeader`: `usePathname()` ustala `isHomeRoute` (dokładne porównanie do `/${locale}/klient`). Gdy `isHomeRoute`, nasłuch `scroll` (tylko wtedy montowany) ustawia `isScrolled` po przekroczeniu `HOME_HERO_SCROLL_THRESHOLD = 96` px. `isOverlay = isHomeRoute && !isScrolled` steruje klasami tła i obramowania nagłówka oraz kolorem tekstu (`navTextClass`/`logoTextClass`), a także tym, czy cały `<header>` jest `fixed` czy `sticky`.
- Logo: zamiast statycznego importu SVG (`next/image`) inline'owany SVG z tymi samymi ścieżkami, gdzie dwa ciemne kształty i tekst "Modular"/"EUROPE" mają `fill="currentColor"` (przejmują kolor z `logoTextClass`), a bursztynowe kształty i tekst "Hub" zostają na sztywno `#FCA311`. Oryginalny plik `assets/brand/logo/v2/horizontal/logo-horizontal-compact-v2.svg` pozostaje nietknięty i nadal używany tam, gdzie statyczny import wystarcza.

**Tokeny użyte na zdjęciu**: `brand-v4-surface`, `brand-v4-mist` i `brand-v4-night` (spec 0013) zamiast `brand-v5-*`, bo v5 nie ma wariantu "tekst na zdjęciu", a v4 ma już gotowy, sprawdzony wzorzec (`ClosingCta.tsx`).

**Konfiguracja wymagana**: brak nowej. `public/images/hero/klient-hero-bg.png` jest lokalnym plikiem statycznym, nie wymaga wpisu w `images.remotePatterns`.

**Krytyczne scenariusze testowe** (do pokrycia przez `/test`):
- Wejście na `/pl/klient`: nagłówek jest przezroczysty, hero renderuje zdjęcie od góry strony bez przerwy, sprawdza **AC-1**, **AC-4**.
- Przewinięcie strony głównej poniżej progu 96px: nagłówek staje się pełny i biały, tekst i logo ciemnieją, sprawdza **AC-5**.
- Wejście na `/pl/klient/wyniki` (dowolna inna trasa klienta): nagłówek jest od razu pełny i biały, `sticky`, bez logiki scrolla, sprawdza **AC-6**.
- Wizualna regresja: brak elementu z `bg-gradient-to-t` nad zdjęciem hero, sprawdza **AC-3**.

## Build plan

<!-- Retroaktywny zapis kroków już wykonanych w tej rozmowie (dokumentacja, nie plan na przyszłość). -->

1. Wygeneruj i dopracuj zdjęcie tła hero (kilka iteracji: kompozycja, kolor elewacji, jasność, pozycja pawilonu spa), zapisz jako `public/images/hero/klient-hero-bg.png`; finalny plik podmieniony przez zamawiającego na własny, satisfies **AC-1**
2. Przebuduj `Hero.tsx`: `next/image` z `fill` i `priority` jako tło, `-mt-brand-5` znoszące padding `RouteShell`, `min-h-[640px] lg:min-h-[760px]`, `flex flex-col justify-end`, treść przeniesiona do lewego dolnego rogu (`items-start text-left`, `pl-[3%] lg:pl-[1%]`), `text-shadow` na H1, satisfies **AC-1**, **AC-2**, **AC-3**
3. Usuń ciemny gradient nad zdjęciem: najpierw tymczasowo wyłączony blokiem `{false && (...)}` na życzenie zamawiającego (podgląd bez scrim), potem usunięty trwale po potwierdzeniu, że to decyzja ostateczna, satisfies **AC-3**
4. Rozszerz `SiteHeader.tsx` o `usePathname()`/`isHomeRoute`, nasłuch scrolla i `isOverlay`, sterujące `fixed` kontra `sticky`, przezroczystością tła i obramowania, oraz kolorem tekstu (`navTextClass`), satisfies **AC-4**, **AC-5**, **AC-6**
5. Zamień statyczny import logo na inline'owany SVG z `currentColor` na ciemnych kształtach i tekście, sterowany `logoTextClass`, satisfies **AC-4**, **AC-5**

## Consequences

**Positive**:
- Strona startowa realizuje konkretny, zaakceptowany przez zamawiającego wzorzec wizualny (zdjęciowe hero premium), zamiast płaskiego układu tekstowego.
- `assets/tokens/brand-v4-tokens.css` (spec 0013) odzyskuje drugiego realnego konsumenta (obok `ClosingCta`). To rozwiązuje odłożone pytanie z Follow-up spec 0015 ("czy usunąć plik v4, skoro stracił jedynego konsumenta"): nie trzeba już podejmować tej decyzji, plik jest znów aktywnie używany.
- Wzorzec przezroczystego nagłówka reagującego na scroll i inline'owane logo z `currentColor` są teraz dostępne do ponownego użycia, gdyby inna strona publiczna dostała podobne, pełnoekranowe zdjęciowe hero.

**Negative / tradeoffs**:
- Odwraca AC-2/AC-13 spec 0015 po raz trzeci w krótkim czasie, dokładnie to ryzyko, przed którym spec 0015 ostrzegała we własnym Follow-up.
- Bez ciemnego scrim czytelność podpisu i odznak zaufania (bez własnego `text-shadow`) zależy od lokalnej jasności zdjęcia w tym miejscu kadru. Jeśli zdjęcie tła zostanie kiedyś podmienione na jaśniejsze w lewym dolnym rogu, czytelność może się pogorszyć bez żadnego ostrzeżenia w kodzie.
- `isHomeRoute` w `SiteHeader` to sztywne porównanie stringów do `/{locale}/klient`. Zmiana tej ścieżki w przyszłości po cichu wyłączy zachowanie przezroczystego nagłówka, bez błędu kompilacji ani ostrzeżenia w czasie działania.
- `HOME_HERO_SCROLL_THRESHOLD = 96` jest stałą dobraną na oko, nie wyliczoną z realnej wysokości nagłówka. Jeśli wysokość nagłówka kiedyś wzrośnie (np. dodatkowy wiersz), próg może przestać pasować wizualnie.
- Zdjęcie tła jest dekoracyjne (nie pochodzi z żadnego realnego projektu ani producenta w `lib/data/fixtures/`), co odchodzi od precedensu spec 0015 ("zero nowych zasobów, wszystkie sekcje reużywają istniejące zdjęcia projektów").
- Testy komponentów dla `Hero` i `SiteHeader` nie istnieją dziś. To samo zastrzeżenie, które spec 0015 już odnotowała w swoim Follow-up, wciąż nierozwiązane.

**Neutral**:
- `components/klient/AGENTS.md` nie wymaga zmiany listy komponentów (żaden nowy plik, tylko dwa istniejące zmodyfikowane).
- Logo dalej istnieje jako plik SVG w `assets/brand/`, używany bez zmian wszędzie indziej. Inline'owana kopia w `SiteHeader.tsx` żyje tylko tam i może z czasem rozjechać się wizualnie, jeśli oryginalny plik logo zostanie kiedyś zaktualizowany bez pamiętania o tej drugiej kopii.

## Follow-up

- [ ] **Wymaga potwierdzenia zamawiającego, czy to jest wersja docelowa** na dłużej. To trzeci redesign hero z rzędu; warto świadomie to zamrozić, zamiast zostawiać otwarte na czwartą zmianę bez pełnego kontekstu.
- [ ] Dodać testy komponentów dla `Hero.tsx` i `SiteHeader.tsx` (`/test`). Dziś żaden nie istnieje, obejmując też nowe zachowanie `isHomeRoute`/`isScrolled`.
- [ ] Rozważyć wyliczanie `HOME_HERO_SCROLL_THRESHOLD` z realnej wysokości nagłówka (np. przez `ResizeObserver` albo stały `h-*` na headerze) zamiast stałej dobranej na oko, żeby uniknąć rozjazdu przy przyszłej zmianie wysokości nagłówka.
- [ ] Rozważyć wydzielenie inline'owanego logo z `SiteHeader.tsx` do współdzielonego komponentu (`components/ui/LogoMark.tsx`?), gdyby kolejna strona potrzebowała tego samego wzorca logo recolorowalnego przez `currentColor`. Dziś istnieje tylko jedna kopia, więc rozjazd z oryginalnym SVG jest ryzykiem, nie jeszcze faktem.
- [ ] Zdecydować świadomie, czy zdjęcie tła hero docelowo powinno być prawdziwym zdjęciem realizacji (jak reszta produktu, spec 0015 Rationale), zamiast dekoracyjnej grafiki niezwiązanej z żadnym producentem. Dziś nierozstrzygnięte.
- [ ] Po tej zmianie: `/sync` powinien zaktualizować `docs/scope/prototyp.md` funkcję 4 (odhaczyć "Zaprojektuj trzeci raz", zaktualizować status) i ewentualnie `components/klient/AGENTS.md`, jeśli governing spec dla tego ekranu ma się zmienić na 0025.

---

**Status spec 0015**: zaktualizowany na `Superseded by [0025](0025-hero-fotograficzne-strony-startowej.md)` w części dotyczącej `Hero`/`SiteHeader` (AC-2, AC-13). Reszta decyzji spec 0015 (tokeny v5, `PopularHomes`, `ComplianceEngineShowcase`, `ProducerShowcase`, `Testimonials`, `Faq`, encja `Producer`, itd.) pozostaje w mocy bez zmian.
