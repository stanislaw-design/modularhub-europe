# 0043. Tryb ciemny dla flow klienta

**Date**: 2026-09-17
**Status**: Accepted

## Summary

Ta specyfikacja dodaje przełącznik trybu ciemnego do całego flow klienta (strona główna i każda trasa pod `app/[locale]/klient/`), zostawiając dzisiejszy jasny motyw bez zmian. Domyślnie strona idzie za preferencją systemową odwiedzającego; jawne kliknięcie przełącznika w nagłówku zapamiętuje wybór na kolejne wizyty. Producent i panel wewnętrzny zostają na razie tylko jasne, to osobna decyzja na później.

## Requirements

**User stories**:
- Jako odwiedzający flow klienta, chcę przełączyć interfejs na ciemny motyw, żeby wygodniej przeglądać stronę w słabym oświetleniu lub zgodnie z moją preferencją.
- Jako odwiedzający z systemowym trybem ciemnym włączonym, chcę żeby strona od razu otworzyła się w ciemnym motywie, bez konieczności ręcznego przełączania za każdym razem.
- Jako odwiedzający, który raz wybrał tryb ręcznie, chcę żeby ten wybór został zapamiętany na kolejnych stronach i wizytach, niezależnie od tego co mówi ustawienie systemowe.

**Acceptance criteria** (kontrakt, każde kryterium jest osobno sprawdzalne):
- **AC-1**: Ikona przełącznika motywu (słońce/księżyc) jest widoczna w `SiteHeader` na każdej trasie `app/[locale]/klient/**`, zarówno w desktopowym pasku nawigacji, jak i w mobilnym menu wysuwanym.
- **AC-2**: Kliknięcie przełącznika natychmiast zmienia motyw całej bieżącej strony (jasny na ciemny i odwrotnie) bez pełnego przeładowania.
- **AC-3**: Przy pierwszej wizycie (brak zapisanego wyboru) strona renderuje się od razu zgodnie z preferencją systemową odwiedzającego (`prefers-color-scheme`), czystym CSS, bez migającego błysku złego motywu i bez blokującego skryptu w `<head>`.
- **AC-4**: Po jawnym kliknięciu przełącznika wybór jest zapisywany w cookie i wygrywa z preferencją systemową na każdej kolejnej stronie oraz po pełnym przeładowaniu, łącznie z najbliższym renderem serwerowym (bez błysku złego motywu).
- **AC-5**: Przełącznik ma dwa stany (jasny/ciemny); w interfejsie nie ma osobnej opcji "systemowy", jawny wybór zawsze da się odwrócić kolejnym kliknięciem.
- **AC-6**: Dzisiejszy wygląd jasnego motywu pozostaje bez zmian; żaden ekran, kolor ani komponent nie regresuje w trybie jasnym ani przed pierwszą interakcją z przełącznikiem.
- **AC-7**: Wartości ciemne są zdefiniowane dla wszystkich trzech generacji tokenów marki faktycznie używanych w flow klienta (v3, v4, v5), więc żaden ekran flow klienta nie zostaje częściowo jasny przy włączonym trybie ciemnym.
- **AC-8**: Tekst, wskaźniki statusu (`StatusPill`: approved/conditional/blocked) i pierścień fokusu (`.focus-ring`) zachowują kontrast zgodny z WCAG 2.2 AA na nowych ciemnych tłach.
- **AC-9**: Sam przełącznik spełnia wymogi dostępności: osiągalny klawiaturą, widoczny fokus, poprawny `aria-label`/`aria-pressed` odzwierciedlający bieżący stan.
- **AC-10**: Zdjęcia (tło hero, zdjęcia projektów z `picsum.photos`) pozostają bez zmian w trybie ciemnym, bez nakładki ani filtra.
- **AC-11**: Flow producenta (`producent/`) i panel wewnętrzny (`internal/`) nie są dotknięte tą zmianą i nadal renderują się wyłącznie w jasnym motywie.

## Decision

**Chosen option**: Option 1: Własny, minimalny kontekst React + cookie + `@custom-variant dark` (klasa `.dark`)

Tryb ciemny jest sterowany klasą `.dark` na `<html>`, ustawianą przez cookie odczytywane po stronie serwera w `app/[locale]/layout.tsx` (jawny wybór) lub przez czyste `@media (prefers-color-scheme: dark)` w `app/globals.css` (brak zapisanego wyboru), a wartości kolorów dla wszystkich trzech generacji tokenów marki są przedefiniowane raz w bloku `.dark { … }`, nie rozsiane po komponentach.

**Implementation skills**: `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Pełne rozważane opcje i uzasadnienie: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
Brak encji bazodanowej (etap Facade, bez bazy danych). Jedyny nowy "kontrakt" to cookie:
- `theme`: `"light" | "dark"`, `Path=/`, `SameSite=Lax`, `Max-Age` ok. 1 rok, bez `httpOnly` (musi być czytelne i zapisywalne po stronie klienta), `Secure` na produkcji (https).

**State transitions**:
Dwa stany, `light` ↔ `dark`, przełączane wyłącznie kliknięciem przełącznika. Brak zapisanego cookie to stan pośredni "podążaj za systemem", rozwiązywany czystym CSS, nie osobnym stanem aplikacji.

**API surface**:
Brak endpointów HTTP. Jedyna nowa powierzchnia to cookie opisana wyżej, zapisywana bezpośrednio z klienta (`document.cookie`) przy kliknięciu przełącznika, bez akcji serwerowej.

**Key invariants**:
- Cookie `theme`, gdy obecne, zawsze wygrywa z `prefers-color-scheme` przy renderze serwerowym.
- Każda trasa `app/[locale]/klient/**` respektuje ten sam globalny stan motywu; nie ma osobnego motywu per ekran.
- Żadna klasa koloru w `components/klient/` i `components/ui/` nie odwołuje się do surowego koloru Tailwind ani hexa (istniejąca reguła z `AGENTS.md`); to ta sama reguła, która sprawia że ciemny motyw działa przez przedefiniowanie tokenów, nie przez dopisywanie `dark:` do każdej klasy.

**Security model**:
Brak danych wrażliwych; cookie `theme` to preferencja wizualna, nie dane osobowe ani sesja, nie wymaga logowania (którego i tak nie ma na tym etapie) ani zgody na cookies (nie jest to cookie śledzący).

**Configuration required**:
Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: odwiedzający bez zapisanego cookie z systemowym trybem ciemnym widzi od razu ciemny motyw strony głównej, weryfikuje **AC-3**.
- Happy path: kliknięcie przełącznika w `SiteHeader` na `/pl/klient/wyniki` natychmiast przełącza motyw bez przeładowania, weryfikuje **AC-2**.
- Trwałość: po jawnym wyborze ciemnego motywu i twardym przeładowaniu strony (oraz przejściu na inną trasę klient/) motyw zostaje ciemny od pierwszego renderu, bez błysku, weryfikuje **AC-4**.
- Regresja: pełny przegląd jasnego motywu na wszystkich trasach flow klienta pozostaje identyczny wizualnie jak przed zmianą, weryfikuje **AC-6**.
- Dostępność: przełącznik jest osiągalny Tab, ma poprawny `aria-pressed`/`aria-label`, a kontrast `StatusPill` i tekstu na ciemnym tle przechodzi audyt WCAG AA, weryfikuje **AC-8**, **AC-9**.

## Build plan

1. Zdefiniuj strategię CSS: dodaj `@custom-variant dark (&:where(.dark, .dark *));` i blok `@media (prefers-color-scheme: dark)` plus `.dark { … }` w `app/globals.css`, z ciemnymi wartościami dla wszystkich custom properties aliasowanych w `@theme inline` z trzech generacji tokenów (v3, v4, v5), satisfies **AC-3**, **AC-6**, **AC-7**.
2. Zbuduj most cookie + kontekst: `lib/theme.ts` (nazwa cookie, parsowanie, wspólne dla serwera i klienta), `components/ui/ThemeProvider.tsx` (client, kontekst + `useTheme()` hook, zapis cookie przy przełączeniu), wpięty w `app/[locale]/layout.tsx` obok `NextIntlClientProvider`, z odczytem cookie w server component ustawiającym klasę `.dark` na `<html>` przy renderze, satisfies **AC-4**.
3. Zbuduj `components/ui/ThemeToggle.tsx` (ikony `Sun`/`Moon` z `lucide-react`, `aria-pressed`, `aria-label` z `next-intl`) wzorem `LanguageSwitcher.tsx`, wyeksportuj przez `components/ui/index.ts`, osadź w `SiteHeader.tsx` obok `LanguageSwitcher` w obu wariantach (desktopowy pasek, mobilne menu wysuwane), dodaj klucze `Theme.toggleToLight`/`Theme.toggleToDark` do `messages/pl.json`, `en.json`, `nl.json`, `de.json`, satisfies **AC-1**, **AC-2**, **AC-5**, **AC-9**.
4. Audytuj 43 komponenty `components/klient/` (i współdzielone `components/ui/`) pod kątem klas koloru, które nie odwołują się do tokenu marki (surowy Tailwind, hex), i zamień na klasy tokenowe tam gdzie ich brak zepsułby tryb ciemny, satisfies **AC-6**, **AC-7**.
5. Przejdź kontrastowy audyt WCAG 2.2 AA na ciemnych wartościach: tekst, `StatusPill` (approved/conditional/blocked), `.focus-ring`, na realnych ekranach flow klienta; dostrój wartości `.dark { … }` z kroku 1 tam gdzie kontrast nie przechodzi, satisfies **AC-8**.
6. Napisz testy: komponentowy test `ThemeToggle.test.tsx` (kliknięcie przełącza stan, zapisuje cookie, poprawny `aria-pressed`) i rozszerzenie e2e (`e2e/`) sprawdzające brak błysku złego motywu po twardym przeładowaniu z zapisanym cookie, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-9**.

## Consequences

**Positive**:
- Jedno centralne miejsce (`app/globals.css`) rządzi kolorem w obu motywach dla całego flow klienta, zgodnie z tym, jak projekt już zarządza trzema generacjami tokenów.
- Zero nowych zależności produkcyjnych.
- Wzorzec (przełącznik w headerze obok `LanguageSwitcher`, wariant `surface` per generacja tokenów) jest bezpośrednio powtarzalny dla producenta i panelu wewnętrznego w kolejnym etapie.

**Negative / tradeoffs**:
- Krok 4 (audyt 43 komponentów pod kątem twardo zakodowanych kolorów) jest pracochłonny i ryzykowny do pominięcia częściowo; przeoczony komponent zostanie po cichu jasny w trybie ciemnym zamiast rzucić błąd.
- Brak opcji "systemowy" w samym UI (AC-5) oznacza, że odwiedzający, który raz kliknął przełącznik, nie ma prostego sposobu powrotu do "znowu podążaj za systemem" poza ręcznym czyszczeniem cookie.
- Zdjęcia bez przyciemnienia (AC-10) mogą wizualnie "świecić" na tle ciemnego interfejsu; to świadomie zaakceptowany kompromis, nie przeoczenie.

**Neutral**:
- Nowy plik `lib/theme.ts` i dwa nowe komponenty `components/ui/` (`ThemeProvider`, `ThemeToggle`) to nowy, mały wzorzec do nauczenia się, równoległy do istniejącego `lib/i18n/` + `LanguageSwitcher`.

## Follow-up

- [ ] Brak wiersza w `docs/scope/prototyp.md` powiązanego z tą specyfikacją; zapisz ją jako nową funkcję fazy "Prototyp: flow klienta" przez `/scope`, żeby `/develop` miał do czego przypiąć status.
- [ ] Osobna decyzja `/architect tryb ciemny flow producenta` (i osobno panel wewnętrzny), gdy nadejdzie kolej na te trasy; ten spec celowo ich nie obejmuje.
- [ ] Rozważ wizualny przegląd (`/impeccable` lub podobny) ciemnych wartości tokenów po zbudowaniu kroku 1, zanim audyt kontrastu z kroku 5 zacznie dostrajać konkretne wartości; sama specyfikacja nie przesądza dokładnych odcieni, tylko strukturę.
