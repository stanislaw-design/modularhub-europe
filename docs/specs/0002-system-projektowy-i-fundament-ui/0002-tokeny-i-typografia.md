# 0002. Tokeny i typografia w Tailwind

## Summary

Ta część fundamentu dopisuje do już gotowych tokenów marki (kolor, odstępy, promienie, rodziny czcionek, wszystkie już wpięte w `app/globals.css`) to, czego jeszcze brakuje: skalę rozmiarów tekstu, regułę siatki i kontenera, sposób ładowania trzech rodzin czcionek, i jeden dokument (`docs/design.md`), który to wszystko opisuje w jednym miejscu.

## Decision

**Chosen option**: rozszerzyć blok `@theme inline` w `app/globals.css` o skalę typografii i tokeny siatki/kontenera z `docs/brand-guidelines-v3.md`, załadować czcionki przez `next/font/google`, i spisać `docs/design.md`.

| Layer | Choice | Reason |
|---|---|---|
| Skala typografii | Nowe tokeny Tailwind `--text-display-xl`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body-l`, `--text-body`, `--text-label`, `--text-data`, każdy z parą rozmiar/interlinia ze skali "digital" w `brand-guidelines-v3.md` sekcja 8 | wartości są już w pełni określone w wytycznych marki (basis: `docs/brand-guidelines-v3.md`, sekcja 8), zostaje tylko przełożyć je na tokeny Tailwind |
| Moduł odstępów → Tailwind | Zmienne `--brand-space-1` do `--brand-space-7` (już istniejące w `brand-v3-tokens.css`) dochodzą do `@theme inline` jako nazwane tokeny odstępu (np. `--spacing-brand-1` do `--spacing-brand-7`), bez nadpisywania domyślnej skali odstępów Tailwind | moduł 8px marki jest dziś tylko zwykłą zmienną CSS, niewidoczną dla klas Tailwind typu `p-*`/`gap-*`; nazwane tokeny zamiast nadpisania domyślnej skali nie psują żadnej istniejącej klasy odstępu w projekcie |
| Siatka i kontener | Token `--brand-container-max: 1440px` (rekomendacja: typowa szerokość dla siatki 12 kolumnowej na desktopie), nazwany z przedrostkiem `brand-` jak każdy inny token marki, żeby nie kolidować z żadną nazwą już zarezerwowaną przez Tailwind; plus margines kontenera 5 do 7% szerokości z sekcji 10 wytycznych | siatka 12 kolumnowa i margines są opisane w wytycznych, ale nie mają jeszcze konkretnej maksymalnej szerokości kontenera w kodzie; 1440px to standardowa wartość dla tej liczby kolumn; przedrostek `brand-` trzyma się konwencji już użytej w `brand-v3-tokens.css` |
| Ładowanie czcionek | `next/font/google` dla Montserrat, Inter i IBM Plex Mono, każda jako zmienna CSS podłączona pod istniejące `--font-brand-display`, `--font-brand-body`, `--font-brand-data` | Next.js samohostuje czcionki Google przez `next/font`, zero zewnętrznych requestów, zgodne z aktualną dokumentacją Next.js (basis: sprawdzenie aktualnego stanu narzędzi) |
| Dokument systemu | `docs/design.md`, spisany po zbudowaniu komponentów z [0002-biblioteka-komponentow.md](0002-biblioteka-komponentow.md) | wymagany wprost przez `docs/scope/scope.md`, pozycja 3, jako dowód "Done when" |

Etykiety tekstowe zachowują tracking `0.08em` do `0.14em` i wielkie litery, liczby zachowują `font-variant-numeric: tabular-nums`, oba wprost z sekcji 8 wytycznych; oba przechodzą do Tailwind jako narzędziowe klasy, nie osobne tokeny (basis: `docs/brand-guidelines-v3.md`, sekcja 8).

## Rationale

Wszystkie wartości liczbowe (rozmiary, interlinie, tracking) są już ustalone w `docs/brand-guidelines-v3.md`; jedyna prawdziwa decyzja w tym dziecku to maksymalna szerokość kontenera, której wytyczne nie podają. 1440px to bezpieczna, szeroko używana wartość dla siatki 12 kolumnowej i nie koliduje z żadną istniejącą regułą.

## Consequences

**Positive**: jeden dokument (`design.md`) i jeden zestaw tokenów Tailwind pokrywają całą typografię i siatkę; żaden ekran nie musi zgadywać rozmiaru nagłówka.
**Negative / tradeoffs**: szerokość kontenera 1440px jest przyjętym założeniem, nie wartością z wytycznych marki; jeśli okaże się za wąska albo za szeroka przy pierwszych ekranach, trzeba będzie ją skorygować wstecz.
**Neutral**: `next/font/google` pobiera czcionki przy buildzie, więc pierwszy `npm run build` po tej zmianie będzie potrzebował dostępu do sieci.

## Follow-up

- [ ] Po zbudowaniu pierwszych 2 do 3 ekranów sprawdź, czy 1440px jako maksymalna szerokość kontenera faktycznie pasuje do treści (karty projektów, tabele danych); skoryguj token, jeśli nie.
