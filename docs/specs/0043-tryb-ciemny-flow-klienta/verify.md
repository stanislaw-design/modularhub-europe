# Verify: tryb ciemny (flow klienta) · spec 0043 · updated 2026-09-17

_Steps derived from spec 0043 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Ustaw system na jasny motyw, wyczyść cookie `theme`, odwiedź `/pl` → strona renderuje się w jasnym motywie identycznie jak przed tą zmianą → AC-6
- [ ] Ustaw system na ciemny motyw, wyczyść cookie `theme`, odwiedź `/pl` → strona od razu (pierwszy render) jest ciemna, bez błysku złego motywu → AC-3
- [ ] Na `/pl/results` kliknij przełącznik słońce/księżyc w `SiteHeader` (pasek desktopowy) → motyw całej strony zmienia się natychmiast, bez przeładowania → AC-1, AC-2
- [ ] Zwęź okno poniżej `sm`, otwórz menu wysuwane, kliknij przełącznik tam → to samo zachowanie → AC-1, AC-2
- [ ] Kliknij przełącznik dwa razy z rzędu → wraca do pierwotnego motywu (dwa stany, bez trzeciej opcji "systemowy") → AC-5
- [ ] Po kliknięciu w tryb ciemny zrób twarde przeładowanie i przejdź na inną trasę klient/ (np. `/pl/project/<id>`) → motyw zostaje ciemny od pierwszego renderu, bez błysku → AC-4
- [ ] Dotrzyj do przełącznika samym Tab → widoczny pierścień fokusu, `Enter`/`Space` aktywuje, `aria-pressed`/`aria-label` odzwierciedlają bieżący stan → AC-9
- [ ] Audyt kontrastu (np. axe DevTools) na ciemnym tle: tekst, `StatusPill` (approved/conditional/blocked), `.focus-ring` na `/pl`, `/pl/results`, `/pl/project/<id>` → wszystko przechodzi WCAG 2.2 AA → AC-8
- [ ] Z ustawionym cookie `theme=dark` i systemem w trybie ciemnym odwiedź `/pl/producer/export-readiness` i `/pl/internal/produkty` → obie trasy zostają jasne, bez przełącznika w nagłówku → AC-11
- [ ] Zdjęcia (tło hero, zdjęcia projektów) nie mają nakładki ani filtra w trybie ciemnym → AC-10

## Commands

- [ ] `npx tsc --noEmit -p .` → bez błędów
- [ ] `npx eslint components/ui/ThemeProvider.tsx components/ui/ThemeToggle.tsx components/klient/SiteHeader.tsx` (i pozostałe zmienione pliki) → bez błędów
- [ ] `npx vitest run components/ui/ThemeToggle.test.tsx components/klient/SiteHeader.test.tsx` → wszystkie przechodzą
- [ ] `npx playwright test e2e/tryb-ciemny.spec.ts` → 4/4 przechodzą
- [ ] `npm run build` → kompiluje się bez błędów

## Acceptance-criteria coverage

- AC-1, AC-2, AC-5 · pokryte przez `e2e/tryb-ciemny.spec.ts` (test 2) + `components/ui/ThemeToggle.test.tsx` + krok manualny
- AC-3 · pokryte przez `e2e/tryb-ciemny.spec.ts` (test 1) + krok manualny
- AC-4 · pokryte przez `e2e/tryb-ciemny.spec.ts` (test 3) + krok manualny
- AC-6 · pokryte przez pełny przebieg `vitest`/`playwright` bez nowych regresji + wizualne porównanie manualne
- AC-7 · pokryte przez przegląd `app/globals.css` (wszystkie trzy generacje tokenów mają zdefiniowane wartości ciemne w `.theme-klient.dark`/media query)
- AC-8 · kontrast wyliczony matematycznie (WCAG relative luminance, udokumentowane w `app/globals.css`) + krok manualny (axe)
- AC-9 · pokryte przez `components/ui/ThemeToggle.test.tsx` (aria-pressed/aria-label) + krok manualny (klawiatura)
- AC-10 · brak zmian w klasach dotyczących zdjęć — nie dotknięte
- AC-11 · pokryte przez `e2e/tryb-ciemny.spec.ts` (test 4) + krok manualny

## Znaleziony i naprawiony podczas `/check verify` (2026-09-17)

- **Bug**: mobilne menu `SiteHeader` i mobilny arkusz filtrów `ResultsFilterBar` (oba to Headless UI `Dialog`) zostawały jasne w trybie ciemnym. `Dialog` portalowany jest do końca `document.body`, poza poddrzewem DOM `.theme-klient`, więc nie widział przedefiniowanych custom properties.
- **Naprawa**: `ThemeProvider` (`components/ui/ThemeProvider.tsx`) teraz zwierciadli klasy `theme-klient`/`dark`/`light` na `document.body` (efekt kliencki, sprzątany przy odmontowaniu), obok istniejącego wrappera renderowanego po stronie serwera. Naprawia to każdy portalowany Headless UI `Dialog` w flow klienta jedną, systemową zmianą, nie łatką per komponent. Zweryfikowano zrzutami ekranu (menu mobilne, arkusz filtrów) i sprawdzeniem DOM (`document.body.contains(panel)`).

## Known follow-ups (nie blokują, ale warto odnotować przy `/check verify`)

- `components/ui/StageTimeline.tsx` (współdzielony prymityw) używa `bg-brand-foundation-navy`/`text-brand-warm-white` dla statusu "completed" — dziś nieużywany w żadnym ekranie flow klienta, więc bezpieczny, ale gdyby przyszła funkcja klienta zaczęła go importować, ten konkretny marker wymagałby tej samej korekty co `v5-ink`→`v5-night` w tym budowie (`docs/specs/0043-tryb-ciemny-flow-klienta/index.md` Consequences już to zakłada jako ryzyko audytu).
- Deviacja od dosłownej ścieżki ze spec (`app/[locale]/layout.tsx`, klasa `.dark` na `<html>`) na rzecz `app/[locale]/(customer)/layout.tsx` + scoping przez `.theme-klient`: wymuszona przez AC-11 i rzeczywistą strukturę tras (route group `(customer)`, nie folder `klient/`), nie przez zmianę decyzji. Warto zsynchronizować ten szczegół do treści specu przy najbliższym `/sync` lub `/architect` przeglądzie.
