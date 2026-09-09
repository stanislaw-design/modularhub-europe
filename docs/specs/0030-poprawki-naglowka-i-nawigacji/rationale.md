# 0030. Rationale

Decision record for [index.md](index.md). Context and options considered, not build input — `/develop` does not read this file.

## Context

`components/klient/SiteHeader.tsx` renderuje jeden hamburger (ikona `Menu`), który przy każdej szerokości ekranu otwiera to samo wysuwane menu (`Dialog` z Headless UI) z listą `navItems`. W głównym pasku nagłówka nigdy nie ma widocznej poziomej listy linków, ani na komputerze, ani na telefonie; jedyna droga do nawigacji to ten hamburger.

Zmierzone bezpośrednio w przeglądarce (Playwright, viewport 375 szerokości): przycisk hamburgera renderuje się na pozycji x=374px, czyli poza widocznym obszarem (viewport kończy się w praktyce już koło 360px, licząc pasek przewijania). Przycisk istnieje w DOM (`aria-label="Otwórz menu"`), ale jest wizualnie odcięty i niedostępny dotykiem. Powód: prawa grupa nagłówka (`div.flex.gap-brand-3` z przyciskiem "Zacznij" i hamburgerem) ma domyślne `min-width: auto`, więc w praktyce już dziś nie kurczy się poniżej szerokości własnej zawartości; nadmiar sumy (logo plus prawa grupa) po prostu wypływa poza kontener zamiast się zawinąć. Same przeliczenie potwierdza, że problem nie zniknie przez samo dodanie `shrink-0` (który tylko potwierdza istniejący brak kurczenia się, nic nie zmienia): przy 320px szerokości i `Container`'owym `px-[6%]` (patrz `components/ui/Container.tsx`) dostępna szerokość na zawartość to około 282px, a sam znak graficzny logo (`h-7`, proporcje `viewBox="0 0 700 116"`) zajmuje około 169px. Zostaje około 113px na odstępy (`gap-brand-4`=32px między logo a prawą grupą, `gap-brand-3`=24px wewnątrz niej), przycisk "Zacznij" (w EN "Get started", dłuższy niż polskie "Zacznij") i sam hamburger; to się nie mieści bez realnego zmniejszenia szerokości logo i odstępów na najwęższym progu, nie samego "zablokowania kurczenia się" hamburgera.

Z listy sześciu pozycji nawigacji (Domy, Producenci, Projekty, Inspiracje, Jak to działa, O nas) tylko dwie mają realny cel (Domy, Jak to działa); pozostałe to wyłączone przyciski bez żadnej strony za sobą. Jednocześnie Ulubione, Zaloguj się/Mój profil, Panel administratora i przełącznik języka są dziś pokazywane tylko w głównym pasku nagłówka, ukryte poniżej progów `sm`/`md` (a więc niewidoczne na telefonie) i w ogóle nie występują w liście menu wysuwanego, więc na telefonie te akcje są dziś całkowicie niedostępne, niezależnie od błędu z przycięciem.

Projekt obsługuje trzy języki na produkcji (`lib/i18n/routing.ts`: `pl`, `en`, `nl`, `localePrefix: "always"`), więc treść menu musi się mieścić przy najkrótszej dopuszczalnej szerokości ekranu we wszystkich trzech.

## Options considered

### Option 1: Napraw w miejscu (fix in place)

Napraw przyczynę przycinania w istniejącym `SiteHeader.tsx` (dodaj `shrink-0` i gwarantowany rozmiar dotykowy na przycisku hamburgera, popraw elastyczność prawej grupy nagłówka), uporządkuj listę `navItems`, i rozbuduj istniejący `Dialog`/`DialogPanel` o drugą grupę (akcje konta) z tymi samymi elementami, które dziś są w pasku nagłówka na komputerze.

**Pros**:
- Najmniejsza możliwa zmiana: jeden plik, żadnej nowej zależności, żadnej migracji.
- Zachowuje sprawdzony wzorzec (Headless UI `Dialog`, `lucide-react`), który reszta strony już zna i testuje.
- Ryzyko regresji ograniczone do jednego komponentu z istniejącymi testami (`SiteHeader` nie ma dziś własnego pliku testów, ale wzorzec testowania innych komponentów `components/klient/` jest znany).

**Cons**:
- Nie rozwiązuje szerszego pytania, czy nawigacja "wyłącznie przez hamburger" to w ogóle dobry wzorzec na komputerze (inżynier świadomie zdecydował zostawić to bez zmian w tej turze).
- Wymaga ręcznego przeliczenia szerokości elementów w pasku (logo plus "Zacznij" plus hamburger) przy 320px, żeby mieć pewność, że błąd się nie powtórzy przy kolejnej zmianie treści przycisku.

### Option 2: Przebuduj nagłówek na wzorzec z widoczną nawigacją poziomą na komputerze

Dodaj poziomy pasek linków nawigacji widoczny od `md`/`lg` w górę, zostaw hamburger tylko dla telefonu (klasyczny wzorzec: linki inline na dużym ekranie, hamburger poniżej progu).

**Pros**:
- Poprawia odkrywalność nawigacji na komputerze (dziś użytkownik komputera też musi kliknąć hamburger, żeby zobaczyć "Domy" czy "Jak to działa").
- Rozwiązuje przycinanie inaczej: hamburger na komputerze w ogóle znika, więc mniej elementów rywalizuje o miejsce.

**Cons**:
- Inżynier wprost wybrał zostawienie wzorca "hamburger przy każdej szerokości" bez zmian w tej turze (patrz decyzje w rozmowie projektowej); to inna, większa decyzja produktowa o wyglądzie komputerowego nagłówka, nie tylko naprawa błędu.
- Większy zakres zmian wizualnych (nowy układ paska na `lg`), więcej do przetestowania na obu typach ekranu, przy tej samej korzyści biznesowej co Option 1 dla zgłoszonego problemu (widoczność hamburgera na telefonie).

## Rationale

Zgłoszony problem to konkretny błąd układu (element wypływa poza ekran), nie brak funkcji: hamburger i wysuwane menu już istnieją i działają poprawnie na komputerze, gdzie mieszczą się w pasku. Zmiana wzorca na poziomą nawigację (Option 2) rozwiązałaby ten sam problem inną, większą drogą i dodatkowo zmieniłaby wygląd komputerowej wersji nagłówka, czego inżynier świadomie nie chciał w tej turze (`Nav pattern` w rozmowie projektowej: "Keep hamburger-only at every width"). Option 1 naprawia dokładnie to, co zepsute, przy najmniejszym możliwym ryzyku regresji na stronie, która już ma ustabilizowany, premium wygląd nagłówka (`isOverlay`/`isScrolled` na stronie głównej, spec 0014).
