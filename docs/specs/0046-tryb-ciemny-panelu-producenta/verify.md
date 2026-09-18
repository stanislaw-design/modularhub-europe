# Verify: tryb ciemny panelu producenta · spec 0046 · updated 2026-09-18

**Poprawka po weryfikacji na żywo (ten sam dzień):** zrzut ekranu z panelu w trybie ciemnym pokazał, że wordmark "Modular" w logo (`components/brand/BrandLogo.tsx`, domyślny `tone="dark"` → `text-brand-v5-ink`) był niewidoczny na ciemnym tle. Pierwszy audyt CSS sprawdził tylko `components/producent/` i przeoczył, że `ProducerPanelSidebar` renderuje `BrandLogo` z osobnego folderu `components/brand/`. Naprawione: `--brand-v5-ink` dopisane do wspólnej listy selektorów `.theme-klient.dark, .theme-producer.dark` w `app/globals.css` (i jej odpowiednika w `@media (prefers-color-scheme: dark)`). AC-7 i Key invariants w `index.md` skorygowane. Regresja sprawdzona: `e2e/tryb-ciemny.spec.ts` (6/6) i `e2e/site-header.spec.ts` (AC-3, dark-mode-independent) nadal zielone po zmianie.

_Steps derived from spec 0046 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual (wymaga zalogowanej sesji producenta — magic link e-mail, brak dziś fixture'a e2e)

- [ ] Zaloguj się jako producent, otwórz `/pl/producer/panel` → przełącznik `ThemeToggle` widoczny w `ProducerPanelSidebar`, obok `LanguageSwitcher` → AC-1, AC-9
- [ ] Z tej samej sesji otwórz kolejno `produkty`, `produkty/[id]/edytuj`, `projekt`, `zapytania`, `zapytania/[id]` → przełącznik widoczny na każdej → AC-1
- [ ] Kliknij przełącznik na `/producer/panel` → motyw zmienia się natychmiast, bez przeładowania strony → AC-2
- [ ] Bez zapisanego cookie `theme`, z systemowym trybem ciemnym włączonym (`prefers-color-scheme: dark`), otwórz `/producer/panel` → strona renderuje się od razu ciemna, bez błysku złego motywu → AC-3
- [ ] Wybierz ciemny motyw, twardo przeładuj stronę i przejdź między `panel`, `panel/products`, `panel/project`, `panel/inquiries` → motyw pozostaje ciemny na każdej → AC-4, AC-11
- [ ] Sprawdź, że jasny motyw panelu (dziś, przed tą funkcją) wygląda identycznie jak przed zmianą, na każdym ekranie panelu → AC-6
- [ ] W trybie ciemnym otwórz `DeleteProductDialog` (usuń produkt) na `/producer/panel/products` → dialog (portalowany poza drzewo panelu) renderuje się poprawnie ciemny → AC-12
- [ ] Z ciemnego panelu kliknij link do ekranu demo (np. `/producer/export-readiness`) → ekran jest jasny; wróć do panelu → panel jest znów ciemny → AC-10

## Commands

- [x] `npx tsc --noEmit` → bez błędów (zweryfikowane w tej sesji)
- [x] `npx eslint <zmienione pliki>` → bez błędów (zweryfikowane w tej sesji)
- [x] `npx vitest run components/ui/ThemeProvider.test.tsx components/ui/ThemeToggle.test.tsx components/klient/SiteHeader.test.tsx components/producent/ProducerPanelSidebar.test.tsx` → 32 testy zielone (zweryfikowane w tej sesji) → AC-1, AC-2, AC-4, AC-5, AC-9, AC-11, AC-12 (mechanizm mirroringu na `document.body`, niezależny zakres `theme-producer` vs `theme-klient`)
- [x] `npx playwright test e2e/tryb-ciemny.spec.ts` → 6 testów zielone, brak regresji na flow klienta po uogólnieniu `ThemeProvider` (zweryfikowane w tej sesji)
- [ ] Nowy `e2e/tryb-ciemny-panelu-producenta.spec.ts` (mirror `e2e/tryb-ciemny.spec.ts`) obejmujący trasy panelu i przejście na ekran demo i z powrotem → **niezablokowany kod, zablokowany brakiem fixture'a logowania producenta w e2e** (magic link przez Resend; żaden dzisiejszy plik `e2e/` nie loguje producenta) → AC-2, AC-3, AC-4, AC-9, AC-10

## Kontrast WCAG 2.2 AA (AC-8)

- [x] Panel reużywa dokładnie te same `--dm-*` wartości już wyliczone i zaakceptowane w spec 0043 (`--dm-ink` na `--dm-bg` ~16.5:1, `--dm-muted` ~8.3:1, oba powyżej progu 4.5:1) — żadna nowa kombinacja tokenów nie powstała dla `.theme-producer`, więc ponowny audyt liczbowy nie jest potrzebny. Wizualne potwierdzenie na `.focus-ring` w kontekście panelu (pasek boczny, listy produktów) pozostaje do zrobienia przy żywej sesji producenta.

## Acceptance-criteria coverage

- AC-1 (przełącznik widoczny na każdej trasie panelu) — kod potwierdzony (jeden layout, jeden montaż), wizualne potwierdzenie na żywo zablokowane brakiem sesji
- AC-2 (natychmiastowa zmiana bez przeładowania) — mechanizm identyczny z już zweryfikowanym 0043; e2e panelu brakuje
- AC-3 (systemowa preferencja bez błysku) — CSS media query rozszerzona identycznie jak 0043; e2e panelu brakuje
- AC-4 (cookie przetrwa przeładowanie/nawigację) — pokryte testem jednostkowym `ThemeProvider.test.tsx` (scopeClassName); e2e panelu brakuje
- AC-5 (dwa odwracalne stany) — reużyty, niezmieniony `ThemeToggle`, bez zmian logiki
- AC-6 (jasny motyw bez regresji) — potwierdzone przeszukaniem repo (brak twardo zakodowanych kolorów w `components/producent/`/`app/.../producer/panel/`)
- AC-7 (tylko generacja v3, brak v4/v5 w `.theme-producer`) — potwierdzone przeszukaniem repo i strukturą CSS (v4/v5 zostają wyłącznie pod `.theme-klient`)
- AC-8 (kontrast WCAG AA) — reużyte już policzone wartości 0043, patrz sekcja powyżej
- AC-9 (dostępność przełącznika) — reużyty, niezmieniony `ThemeToggle`, już pokryty jego istniejącymi testami dostępności
- AC-10 (ekrany demo pozostają jasne) — mechanizm niezmieniony (te ekrany nigdy nie montują `ThemeProvider`); e2e panelu brakuje dla samego przejścia
- AC-11 (jeden wspólny montaż na layout, nie per-podstrona) — potwierdzone w kodzie (`producer/panel/layout.tsx`), testem jednostkowym `ThemeProvider.test.tsx`
- AC-12 (`DeleteProductDialog` portalowany, poprawny w ciemnym) — mechanizm mirroringu na `document.body` pokryty testem jednostkowym; wizualne potwierdzenie na żywo zablokowane brakiem sesji
