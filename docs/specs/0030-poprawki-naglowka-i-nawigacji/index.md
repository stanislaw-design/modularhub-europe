# 0030. Napraw znikający hamburger na mobile i uporządkuj nawigację w SiteHeader

**Date**: 2026-09-08
**Status**: In Progress

## Summary

Na telefonie przycisk hamburgera w górnym pasku (`SiteHeader`) wychodzi poza widoczny ekran i jest niewidoczny, więc na mobile widać tylko przycisk "Zacznij". To ten sam hamburger, który na komputerze też jest jedynym dostępem do menu, bo pasek nigdy nie pokazuje linków nawigacji w jednej linii. W menu połowa pozycji (Producenci, Inspiracje, O nas) nie prowadzi nigdzie, a Ulubione, Zaloguj się i przełącznik języka są dostępne tylko na komputerze. Ta poprawka naprawia widoczność hamburgera na najmniejszych telefonach, porządkuje listę linków do tych, które faktycznie gdzieś prowadzą, i przenosi brakujące akcje konta do wysuwanego menu, żeby telefon miał ten sam dostęp co komputer.

Decyzja i pełne rozważane opcje: [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako użytkownik telefonu chcę widzieć i móc dotknąć przycisku menu w nagłówku, żeby dostać się do nawigacji strony.
- Jako użytkownik telefonu chcę mieć w menu dostęp do Ulubionych, profilu/logowania i zmiany języka, tak jak ma je dziś użytkownik komputera.
- Jako użytkownik chcę widzieć w menu tylko pozycje, które faktycznie gdzieś prowadzą, żeby nie klikać w martwe przyciski.

**Acceptance criteria**:
- **AC-1**: Przy każdej szerokości ekranu telefonu od 320px do 428px przycisk hamburgera mieści się w całości w pasku nagłówka (bez przycinania ani wychodzenia poza ekran) obok logo i przycisku "Zacznij", z dotykowym obszarem co najmniej 44 na 44 piksele.
- **AC-2**: Wysuwane menu jest podzielone na dwie wizualnie oddzielone grupy: najpierw nawigacja (linki do stron), potem akcje konta, każda z własną, dostępną dla czytnika ekranu etykietą grupy.
- **AC-3**: Lista nawigacji zawiera wyłącznie żywe pozycje: "Domy" (strona główna), "Projekty" (prowadzi do `/${locale}/klient/wyniki`), "Jak to działa" (kotwica na stronie głównej). "Producenci", "Inspiracje" i "O nas" znikają z menu do czasu powstania realnych stron pod nimi.
- **AC-4**: Grupa akcji konta w wysuwanym menu zawiera, na każdej szerokości ekranu: Ulubione, link logowania (gdy niezalogowany) albo "Mój profil" (gdy zalogowany klient), "Panel administratora" (gdy zalogowany administrator), oraz przełącznik języka (PL/EN/NL) jako zwykłe przyciski, nie rozwijaną listę. Zachowanie dla sesji z rolą `producer` zostaje takie samo jak dziś w pasku nagłówka (żaden z tych warunków nie pasuje, więc nie pokazuje się ani link logowania, ani profil; to znany, nienowy stan, patrz Follow-up).
- **AC-5**: Zachowanie na komputerze (przełącznik języka, Ulubione, link logowania/profilu widoczne w jednej linii nagłówka od progów `sm`/`md` w górę) zostaje bez zmian; grupa akcji konta w menu jest dodatkowa dla wąskich ekranów, nie zastępuje istniejących ikon w pasku na komputerze.
- **AC-6**: Zachowane są istniejące wymagania WCAG 2.2 AA z `components/klient/AGENTS.md`: pułapka fokusu w oknie dialogowym, widoczny `.focus-ring` na każdym elemencie interaktywnym, `aria-label` na przyciskach otwierania/zamykania.
- **AC-7**: Treść menu (etykiety nawigacji i akcji konta) mieści się bez łamania układu przy 320px szerokości ekranu we wszystkich trzech aktywnych językach (`pl`, `en`, `nl`).

## Decision

**Chosen option**: Option 1: Napraw w miejscu (fix in place)

Naprawiamy przyczynę przycinania hamburgera bezpośrednio w `SiteHeader.tsx`, porządkujemy listę nawigacji do żywych pozycji, i rozbudowujemy istniejące wysuwane menu o drugą, oddzieloną grupę z akcjami konta, które dziś są dostępne tylko na komputerze.

## Feature design

**Struktura wysuwanego menu** (zamiast jednej płaskiej listy `navItems`):

```
Dialog "Menu"
├── nav aria-label="Nawigacja" (AC-2, AC-3)
│   └── ul: Domy, Projekty (→ /wyniki), Jak to działa
└── div role="group" aria-label="Konto" (AC-2, AC-4)
    └── ul: Ulubione, Zaloguj się | Mój profil, Panel administratora (jeśli admin), Przełącznik języka
```

`navItems` traci pozycje `producers`, `inspirations`, `about` (bez hrefa, dziś wyłączone przyciski); zostają tylko `homes`, `projects` (nowy href: `` `/${locale}/klient/wyniki` ``), `howItWorks`. Klucze tłumaczeń `nav.producers`, `nav.inspirations`, `nav.about` znikają z `messages/pl.json`, `messages/en.json`, `messages/nl.json` razem z kodem.

Grupa "Konto" w menu przenosi dokładnie tę samą warunkową logikę, która dziś działa tylko w pasku nagłówka na `sm`/`md` w górę (session prop): link Ulubione zawsze, `signIn` gdy `session` puste, `myProfile` gdy `session.user.role === "client"`, `adminPanel` gdy `session.user.role === "admin"`. Elementy w pasku nagłówka na `sm`/`md` w górę zostają bez zmian (AC-5).

Żeby grupa "Konto" w menu naprawdę była tylko dodatkowa dla wąskich ekranów, a nie zduplikowana treść na komputerze (AC-5 wprost tego wymaga), każda pozycja chowa się na tym samym progu, na którym pojawia się jej odpowiednik w pasku: Ulubione i przełącznik języka chowają się od `sm`, a `signIn`/`myProfile`/`adminPanel` od `md`. Cała grupa (razem z nagłówkiem "Konto" i linią oddzielającą) chowa się od `md`, żeby nie zostawić pustego nagłówka nad niczym, kiedy wszystkie jej pozycje są już schowane.

Przełącznik języka w menu **nie** używa istniejącego `LanguageSwitcher` (jego `MenuItems` jest pozycjonowane `absolute` względem własnego `Menu as="div"`, a `DialogPanel` ma `overflow-y-auto`, więc rozwijana lista albo się przytnie, albo przewinie razem z resztą menu zamiast zostać na wierzchu; jego `MenuButton` też nie ma własnego `display: flex` w bazowych klasach, tylko dostaje je z `triggerClassName`, którego wariant `sm:flex` tu nie pasuje). Zamiast tego menu pokazuje trzy języki (`pl`/`en`/`nl` z `routing.locales`) jako zwykłe, wypisane obok siebie przyciski (ten sam wzorzec co opcje w `LanguageSwitcherMenu`, ale bez rozwijanego panelu), każdy wołający ten sam `router.replace(target, { locale })`, z zaznaczonym aktualnie wybranym językiem.

**Naprawa przycinania hamburgera** (AC-1): sam `shrink-0` nie wystarczy, bo prawa grupa już dziś efektywnie się nie kurczy (patrz przeliczenie w [rationale.md](rationale.md)); trzeba realnie zmniejszyć szerokość zajmowaną poniżej progu `sm`, licząc od najdłuższej etykiety spośród `pl`/`en`/`nl` (AC-7), nie tylko polskiej. Zbudowane: logo dostaje mniejszy wariant tylko poniżej `sm` (`h-5`; pierwotny szacunek `h-6` z tej specyfikacji nadal przycinał angielskie "Get started", co wyszło dopiero po pomiarach w przeglądarce), odstępy w pasku (`gap-brand-4` między logo a prawą grupą, `gap-brand-3` wewnątrz niej) maleją do `gap-brand-1` na tym samym progu, a przycisk "Zacznij" dostaje mniejszy padding (`px-brand-1`) poniżej `sm`. Hamburger sam w sobie dostaje jawny `shrink-0` i gwarantowany rozmiar dotykowy 44 na 44 piksele (`size-11`), żeby przy przyszłych zmianach treści nigdy nie był pierwszym elementem do skurczenia. Weryfikacja: pomiary wymiarów elementów w przeglądarce (Playwright) przy 320, 360, 375, 414 i 428px, w `pl` i `en` (najdłuższa etykieta), nie tylko odczyt klas CSS.

**Kluczowe niezmienniki**:
- Hamburger zawsze widoczny i klikalny w pasku, na każdej szerokości i w obu stanach nagłówka (`isOverlay` i solidny).
- Grupa "Konto" w menu nigdy nie pokazuje jednocześnie `signIn` i `myProfile`/`adminPanel` (te same warunki co dziś w pasku).
- Usunięcie pozycji nawigacji bez hrefa (`producers`, `inspirations`, `about`) nie zostawia martwych kluczy tłumaczeń w żadnym z trzech plików `messages/*.json`.

**Model bezpieczeństwa**: bez zmian, żadnych nowych danych ani uprawnień; warunkowe renderowanie linków konta w menu opiera się na tym samym `session` prop co dziś (rola `client`/`producer`/`admin`), przekazywanym z serwera.

**Konfiguracja**: brak nowych zmiennych środowiskowych.

**Krytyczne scenariusze testowe**:
- Happy path: na telefonie (320 do 428px) użytkownik widzi logo, "Zacznij" i hamburger w jednej linii, klika hamburger, widzi menu z dwiema grupami, klika "Projekty", trafia na `/wyniki`, weryfikuje **AC-1**, **AC-2**, **AC-3**.
- Stan konta: niezalogowany użytkownik telefonu widzi w grupie "Konto" link logowania i przełącznik języka; po zalogowaniu jako klient widzi zamiast tego "Mój profil"; zalogowany administrator widzi dodatkowo "Panel administratora", weryfikuje **AC-4**.
- Wielojęzyczność: menu otwarte przy 320px w `pl`, `en`, `nl` nie łamie układu ani nie przycina tekstu, weryfikuje **AC-7**.
- Dostępność: nawigacja klawiaturą (Tab) do hamburgera, otwarcie, pułapka fokusu wewnątrz `Dialog`, `Escape` zamyka, fokus wraca do przycisku hamburgera, weryfikuje **AC-6**.

## Build plan

1. [x] Napraw przycinanie prawej grupy nagłówka w `components/klient/SiteHeader.tsx`: mniejszy wariant logo poniżej `sm` (`h-5`; spec's original estimate of `h-6` still clipped the English "Get started"), mniejsze odstępy (`gap-brand-4`/`gap-brand-3` → `gap-brand-1`) poniżej `sm`, mniejszy padding na "Zacznij" (`px-brand-1`) poniżej `sm`, `shrink-0` plus gwarantowany 44 na 44 rozmiar dotykowy na hamburgerze; przeliczone i zweryfikowane w przeglądarce (Playwright, pomiary wymiarów elementów) przy 320 do 428px z najdłuższą etykietą "Zacznij" spośród `pl`/`en`/`nl` (angielskie "Get started"), satisfies **AC-1**.
2. [x] Przytnij `navItems` do `homes`, `projects` (nowy href `` `/${locale}/klient/wyniki` ``), `howItWorks`; usuń klucze `nav.producers`, `nav.inspirations`, `nav.about` z `messages/pl.json`, `messages/en.json`, `messages/nl.json`, satisfies **AC-3**.
3. [x] Rozbuduj `DialogPanel` o drugą grupę "Konto" (`role="group"` z dostępną etykietą, widoczny `<h2>` plus `aria-labelledby`), przenosząc warunkową logikę Ulubione/logowanie/profil/panel administratora z paska nagłówka do tej grupy, plus przełącznik języka jako proste, wypisane obok siebie przyciski `pl`/`en`/`nl` (nie ponowne użycie `LanguageSwitcher`'a, którego rozwijany panel przycina się wewnątrz przewijanego `DialogPanel`), z wizualnym oddzieleniem od grupy nawigacji, satisfies **AC-2**, **AC-4**, **AC-5**.
4. [x] Sprawdź i w razie potrzeby popraw `aria-label` grup, kolejność fokusu i `.focus-ring` na nowych elementach menu (Ulubione, profil, panel administratora, przełącznik języka wewnątrz `Dialog`), satisfies **AC-6**.
5. [x] Wizualna weryfikacja treści menu przy 320px w `pl`, `en`, `nl` (najdłuższe etykiety, np. "Panel administratora" / "Admin panel"), satisfies **AC-7**.
6. [x] Dodaj lub rozszerz `components/klient/SiteHeader.test.tsx` o asercje struktury dwóch grup w menu i warunkowego renderowania po roli sesji; dodaj sprawdzenie w istniejących e2e (Playwright) że hamburger jest widoczny i klikalny na zawężonym viewport, satisfies **AC-1**, **AC-2**, **AC-4**.

## Consequences

**Positive**:
- Nawigacja i konto stają się dostępne na telefonie, gdzie dziś są częściowo (nawigacja) albo całkowicie (konto) niedostępne.
- Menu przestaje pokazywać martwe pozycje bez celu.
- Naprawa jest lokalna (jeden komponent, trzy pliki tłumaczeń), więc ryzyko regresji na resztę strony jest niskie.

**Negative / tradeoffs**:
- Komputerowa nawigacja nadal wymaga kliknięcia hamburgera, żeby zobaczyć "Domy" czy "Jak to działa" (świadomie zostawione bez zmian, patrz rationale.md Option 2).
- Grupa "Konto" w menu jest redundantna na komputerze (te same akcje są już widoczne w pasku), co nieco wydłuża listę bez dodatkowej wartości dla użytkownika komputera.
- Usunięcie "Producenci", "Inspiracje", "O nas" z menu oznacza, że gdy te strony kiedyś powstaną, trzeba będzie pamiętać o ponownym dodaniu pozycji nawigacji (patrz Follow-up).
- Logo poniżej `sm` skurczyło się do `h-5` (mniej niż pierwotny szacunek `h-6` w tej specyfikacji), więc podtytuł "EUROPE" w środku wordmarku jest na najwęższych telefonach praktycznie nieczytelny (widoczny jako plama, nie tekst); zaakceptowane jako mniejszy kompromis wizualny wobec twardego wymogu AC-1/AC-7 (mieszczenie się w 320px we wszystkich trzech językach).

**Neutral**:
- `SiteHeader` nie ma dziś własnego pliku testów; ten build dodaje pierwszy, co jest zmianą konwencji tylko dla tego komponentu, nie całego projektu.

## Follow-up

- [ ] Gdy powstanie realna strona dla Producenci, Inspiracje albo O nas, dodać ją z powrotem do `navItems` i do trzech plików `messages/*.json`.
- [ ] `AGENTS.md` w katalogu głównym twierdzi, że "tylko `pl` jest aktywne", ale `lib/i18n/routing.ts` ma `locales: ["pl", "en", "nl"]` z `localePrefix: "always"`, czyli spec 0028 już to wdrożył na produkcji. Do zgłoszenia przy najbliższym `/sync`.
- [ ] `components/producent/ProducerHeader.tsx` ma osobny, trwale wyłączony przycisk hamburgera i przycisk konta (żadne z nich nie robi nic). To osobna, nienaprawiona luka, świadomie poza zakresem tej specyfikacji (patrz decyzja o zakresie w rozmowie projektowej); wymaga własnej tury `/architect`, jeśli ma zostać podjęta.
- [ ] Sesja z rolą `producer` (producent przeglądający stronę klienta, patrz link "Jestem klientem" w `ProducerHeader.tsx`) nie widzi dziś ani linku logowania, ani profilu w `SiteHeader`, ponieważ warunkowa logika sprawdza tylko role `client` i `admin`. To istniejąca luka sprzed tej specyfikacji, świadomie przeniesiona bez zmian (AC-4); do rozważenia w osobnej turze, jeśli sesje producenta na stronie klienta mają być realnym przypadkiem użycia.
- [ ] Logo poniżej `sm` jest teraz `h-5`, mniejsze niż ten spec pierwotnie szacował (`h-6`). Jeśli podtytuł "EUROPE" ma zostać czytelny na najwęższych telefonach, rozważyć osobny, przycięty wariant SVG (sam symbol, bez wordmarku) zamiast dalszego skalowania pełnego zapisu; patrz `rationale.md` dla tła.
