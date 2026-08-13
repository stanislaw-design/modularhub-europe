# Rationale: 0002. System projektowy i fundament UI

## Context

> Premise note: ten temat obejmuje trzy niezależnie budowalne decyzje (tokeny i typografia w Tailwind, biblioteka komponentów bazowych, dane mockowe plus routing). Zamiast trzech osobnych specyfikacji najwyższego poziomu, zapisano je jako jeden parasol (ten katalog) z trzema specyfikacjami dzieckami, ponieważ dzielą jedną pozycję zakresu, jedną bramkę "Done when" w `scope.md` i będą budowane w jednym przebiegu. Tylko wewnętrzne wybory narzędzi w każdej z nich są na tyle niezależne, żeby zasługiwać na osobny zapis decyzji, stąd podział na dzieci, nie na trzy oddzielne numery.

Trzynaście ekranów prototypu (pozycje 4 do 16 w `scope.md`) czeka na wspólny fundament. Każdy z nich będzie czytać te same tokeny marki, składać się z tych samych komponentów bazowych i czytać te same dane mockowe. Bez tej specyfikacji każdy kolejny `/architect` dla pojedynczego ekranu musiałby sam wymyślać te podstawy od nowa, co dałoby trzynaście niespójnych wariantów przycisku, karty i wpisu projektu zamiast jednego.

System marki jest już w pełni opisany w `docs/brand-guidelines-v3.md` (paleta, typografia, siatka, język 3D) i częściowo przełożony na kod: `assets/tokens/brand-v3-tokens.css` definiuje wszystkie zmienne CSS marki, a `app/globals.css` mapuje do Tailwind `@theme` tylko kolor, promienie zaokrągleń i rodziny czcionek. Moduł odstępów (`--brand-space-1` do `--brand-space-7`) istnieje jako zmienna CSS, ale nie jest jeszcze tokenem Tailwind, więc żadna klasa odstępu specyficzna dla marki jeszcze nie działa. Brakuje też skali typografii, reguł siatki/kontenera, samych komponentów i dostępności klawiaturowej, oraz warstwy danych mockowych.

`AGENTS.md` wymaga, żeby funkcje dostępowe do danych były asynchroniczne od pierwszego dnia, bo w drugim etapie ich wnętrze zamieni się na prawdziwe wywołanie API bez zmiany sygnatury. Podejście budowy tego etapu to Facade: interfejs najpierw, prawdziwe zaplecze później. Kształt danych mockowych z tej specyfikacji musi więc przetrwać tę wymianę bez przepisywania każdego ekranu, który go używa.

Projekt ma zero zainstalowanych zależności UI poza samym Tailwindem (brak clsx, cva, biblioteki bezstylowych komponentów, zestawu ikon), więc każdy z tych wyborów jest tu podejmowany od zera, nie tylko potwierdzany.

## Options considered

### Stylowanie wariantów komponentów (dziecko: biblioteka komponentów)

**Opcja A: tailwind-variants.** Biblioteka zbudowana pod dokładnie ten przypadek: mała, wielokrotnie używana biblioteka komponentów z typowanymi wariantami i wbudowanym scalaniem klas Tailwind.
Plusy: jedna zależność zamiast trzech; scalanie klas wbudowane, więc komponowanie komponentów (np. Button wewnątrz Card) nie psuje klas przez kolizję; API ze "slotami" pasuje do komponentów złożonych z kilku elementów (np. StatusPill z ikoną i tekstem).
Minusy: nowsza i mniej rozpoznawalna biblioteka niż CVA; jedna dodatkowa zależność, której projekt na razie nie ma.

**Opcja B: class-variance-authority (CVA) + clsx + tailwind-merge.** Trzy mniejsze, szerzej znane zależności zamiast jednej.
Plusy: CVA jest bardziej rozpoznawalny i ma dłuższą historię; każda z trzech bibliotek robi jedną rzecz.
Minusy: trzy zależności do wdrożenia i utrzymania zamiast jednej; scalanie klas trzeba świadomie połączyć samemu (tailwind-merge) zamiast dostać wbudowane.

**Opcja C: same warunkowe stringi className, bez biblioteki.** Zero zależności.
Plusy: zero zależności, pasuje do obecnego minimalnego zestawu pakietów projektu.
Minusy: logika wariantów robi się nieczytelna i nietypowana już przy kilkunastu komponentach; przy trzynastu ekranach i kilku wariantach na komponent to realne ryzyko niespójności.

### Dostępne prymitywy (dziecko: biblioteka komponentów)

**Opcja A: Headless UI (Tailwind Labs).** Zbudowana specjalnie pod parę Tailwind plus React.
Plusy: najciaśniejsze dopasowanie do Tailwind spośród opcji; mniejszy zakres niż Radix czy React Aria, co pasuje do lean/medium wagi tego etapu; utrzymywana przez ten sam zespół co Tailwind.
Minusy: mniejszy zestaw gotowych komponentów niż Radix, więc niektóre wzorce (np. oś statusu z ekranu 10) trzeba budować od zera niezależnie od wyboru.

**Opcja B: Radix UI.** Najszerszy ekosystem, wzorce zgodne z shadcn/ui.
Plusy: największy zestaw gotowych prymitywów; najwięcej gotowych wzorców do naśladowania w sieci.
Minusy: cięższa zależność; wolniejsze tempo aktualizacji od czasu przejęcia przez WorkOS (basis: sprawdzenie aktualnego stanu narzędzi).

**Opcja C: React Aria Components (Adobe).** Najgłębsza dostępność i i18n.
Plusy: najsilniejsze gwarancje dostępności i międzynarodowe wsparcie, przydatne gdyby zgodność stała się twardym wymogiem.
Minusy: bardziej stroma krzywa uczenia dla małego zespołu na etapie prototypu.

**Opcja D: bez biblioteki, ręczna implementacja.** Zero zależności, cała obsługa fokusa i klawiatury pisana ręcznie na semantycznym HTML i klasach `focus-visible` Tailwind.
Plusy: pełna kontrola, zero zależności, pasuje do zasady marki "decyzja musi być płaska i jednoznaczna".
Minusy: więcej pracy na komponent i realne ryzyko przeoczenia przypadku brzegowego klawiatury, którego biblioteka już przetestowała.

### Zestaw ikon (dziecko: biblioteka komponentów)

**Opcja A: Lucide.** Domyślny wybór ekosystemu React i Tailwind w 2026, typowany od podstaw, dobrze się dzieli na kawałki (tree shaking).
Plusy: największa społeczność i liczba ikon spośród sprawdzonych opcji; łatwo wymienić na w pełni własny zestaw ikon później, gdyby marka tego wymagała.
Minusy: styl ogólny, nie zaprojektowany pod ten konkretny brand.

**Opcja B: Heroicons.** Od zespołu Tailwind, najmniejszy rozmiar na ikonę.
Plusy: najlżejszy wybór; naturalne dopasowanie do Tailwind.
Minusy: mniejsza liczba ikon niż Lucide.

**Opcja C: Phosphor Icons.** Sześć grubości linii na ikonę.
Plusy: elastyczność grubości mogłaby odzwierciedlić rozróżnienie marki między warstwą "display" a "operational" (sekcja 5 wytycznych marki).
Minusy: dodaje decyzję stylistyczną (która grubość, gdzie), której ten etap prototypu jeszcze nie potrzebuje.

### Relacja Project ↔ Country (dziecko: dane i routing)

**Opcja A: złącze wiele do wielu (`EligibilityByCountry`).** Osobna encja spinająca `Project` i `Country`, każda z własnym statusem i powodem.
Plusy: ten sam projekt może być jednocześnie dopuszczony w jednym kraju i warunkowy w drugim, co jest samą istotą platformy; łatwo dopisać kolejny kraj bez zmiany kształtu `Project`.
Minusy: jedna encja więcej do utrzymania w danych mockowych; odczyt wymaga złączenia dwóch rekordów zamiast jednego.

**Opcja B: lista dopuszczalności osadzona bezpośrednio na `Project`.** Tablica `{countryCode, status, reason}` jako pole na `Project`, bez osobnej encji.
Plusy: prostszy kształt pliku, mniej encji, wystarczające dla danych mockowych bez prawdziwych zapytań.
Minusy: trudniej dodać wspólne pole na poziomie samego kraju (np. nazwę), i trudniej odpytać "wszystkie projekty dopuszczone w Niemczech" bez przejścia po każdym projekcie.

Wybrano opcję A: inżynier potwierdził ją wprost jako rekomendowaną podczas rozmowy projektowej.

## Rationale

Inżynier potwierdził rekomendowany wybór w każdym z trzech pytań podczas rozmowy projektowej: tailwind-variants (basis: sprawdzenie aktualnego stanu narzędzi, biblioteka komponentów), Headless UI (basis: dopasowanie do istniejącego stosu Tailwind, `AGENTS.md`), Lucide (basis: sprawdzenie aktualnego stanu narzędzi, domyślny wybór ekosystemu). Wszystkie trzy wybory łączy jedna logika: minimalna, sprawdzona zależność, dopasowana do lean/medium wagi tego etapu (`scope.md`, Weight profile) i do Facade jako podejścia budowy, zamiast najszerszej możliwej biblioteki.

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md`, zasada asynchronicznych funkcji dostępowych od początku i konwencja `@theme` w Tailwind v4
- `docs/brand-guidelines-v3.md`, sekcje 7 (kolor), 8 (typografia), 10 (layout), 14 (dostępność)
- `assets/tokens/brand-v3-tokens.css` i `app/globals.css`, już wpięte tokeny koloru/odstępów/promieni/czcionek
- [0001-stack-i-architektura](../0001-stack-i-architektura/index.md), decyzja o Next.js App Router i Tailwind v4
- `docs/scope/scope.md`, pozycja 3 "System projektowy i fundament UI"

**Practices & standards**:
- WCAG 2.2 AA (minimalny standard dostępności wskazany w `docs/brand-guidelines-v3.md`, sekcja 14)
- wzorzec bezstylowych (headless) komponentów dostępności przy własnym systemie wizualnym
- warstwa dostępu do danych oddzielona od komponentów UI (`lib/data/`), żeby wymiana mocka na prawdziwe API w drugim etapie nie dotykała ekranów

**Links** (web verified during the tool landscape check, 2026-08-13):
- tailwind-variants: https://www.tailwind-variants.org/
- class-variance-authority: https://cva.style/
- Headless UI: https://headlessui.com/
- Radix UI: https://www.radix-ui.com/
- React Aria Components: https://react-spectrum.adobe.com/react-aria/
- Lucide: https://www.npmjs.com/package/lucide-react
- Heroicons: https://heroicons.com/
- Phosphor Icons: https://phosphoricons.com/
- next/font (Next.js fonts): https://nextjs.org/docs/app/getting-started/fonts
- headlessui Agent Skill: https://skills.sh/bobmatnyc/claude-mpm-skills/headlessui
- lucide-icons Agent Skill: https://skills.sh/aksuharun/skills/lucide-icons
- lucide-icons-mcp (declined for now): https://github.com/SeeYangZhi/lucide-icons-mcp
