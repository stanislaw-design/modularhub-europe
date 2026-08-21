# 0013. Nowy zestaw kolorów marki v4 (stopniowy rebrand wizualny)

**Date**: 2026-08-18
**Status**: Accepted

## Summary

Ta decyzja wprowadza nowy zestaw kolorów marki (v4), który z czasem zastąpi obecny (v3) w całym produkcie. Powód jest prosty: nowa strona startowa (spec [0014](0014-przebudowa-strony-startowej/index.md)) potrzebuje ciemnego, granatowego hero i bursztynowego koloru na głównym przycisku akcji, a obie te rzeczy są dziś wprost zabronione przez zasady marki v3. Nowe tokeny trafiają do osobnego pliku i są wdrażane ekran po ekranie, zaczynając od strony startowej. Wszystko inne działa dalej dokładnie tak jak dziś, na starych kolorach, dopóki nie zostanie świadomie przeniesione.

## Context

Dzisiejszy system marki (`docs/brand-guidelines-v3.md`, tokeny w `assets/tokens/brand-v3-tokens.css`) ma dwie zasady, które wprost kolidują z tym, co pokazuje referencyjna grafika strony startowej dostarczona przez zamawiającego (`public/references.png`):

- Interior Light (`#F2B766`) jest wprost oznaczony jako „nie jest kolorem akcji, wyróżnienia tekstu ani komunikatu ostrzegawczego" (sekcja 7 wytycznych) — a na grafice właśnie ten typ ciepłego, bursztynowego koloru jest głównym kolorem przycisków akcji („Znajdź swój dom", „Szukaj domów", „Otrzymaj darmowe oferty") i oceny gwiazdkowej.
- System jest wprost „light only" („No dark mode", `docs/design.md`) — a grafika ma dwie pełnoprawne ciemne sekcje (hero, pasek zamykający CTA) plus ciemny pasek zaufanych producentów.

W tej samej sesji zamawiający potwierdził (zamiast reużycia albo rozszerzenia istniejących tokenów v3), że chce naprawdę nowej palety, wprost opartej na kolorach z dostarczonej grafiki, i że docelowo ma to być nowy domyślny system kolorów całego produktu, a nie wyjątek tylko dla jednej strony.

Jednocześnie: 12 już zbudowanych i zweryfikowanych ekranów (wyniki, zapytanie/shortlista, analiza działki, oferta wiążąca, realizacja klienta, oraz cała ścieżka producenta) opiera się dziś na v3 i przeszło swoją weryfikację (`/check verify`) względem tych kolorów. Migracja wszystkich naraz, przy okazji przebudowy jednej strony, byłaby nieproporcjonalna do faktycznego zlecenia i wymagałaby ponownej weryfikacji 12 already-`done` specyfikacji w jednym podejściu.

Nie ma tu żadnych sił wydajnościowych, kosztowych ani zgodności regulacyjnej; to czysta decyzja tożsamości wizualnej.

## Options considered

### Option 1: Nowe tokeny v4, wdrażane stopniowo, zaczynając od strony startowej

Nowy plik tokenów (`assets/tokens/brand-v4-tokens.css`), zarejestrowany w `app/globals.css` obok (nie zamiast) `brand-v3-tokens.css`. Strona startowa jako pierwszy konsument. Reszta produktu zostaje na v3 do czasu osobnej decyzji o migracji każdego ekranu.

**Pros**:
- Zero ryzyka dla 12 już zweryfikowanych ekranów; żaden nie wymaga ponownego `/check verify` w tym kroku.
- Daje realną, gotową do użycia paletę dla strony startowej już teraz, bez czekania na plan migracji całego produktu.

**Cons**:
- Produkt tymczasowo działa na dwóch systemach kolorów naraz (v3 na 15 ekranach, v4 na jednym); wizualna niespójność między „starymi" a „nowymi" ekranami jest oczekiwana, nie błędem, dopóki migracja się nie dokończy.

### Option 2: Migracja całego produktu do v4 w tym samym podejściu

Przepisanie wszystkich 16 funkcji na nowe kolory od razu.

**Pros**:
- Brak okresu przejściowego z dwoma systemami kolorów naraz.

**Cons**:
- Wymaga ponownej weryfikacji 12 already-`done` specyfikacji w jednym, dużym, ryzykownym kroku — dokładnie ten „big bang rewrite" wzorzec, którego unika się w projektach produkcyjnych, tu zastosowany dla czystej zmiany kosmetycznej.
- Rozmiar wielokrotnie większy niż to, o co poprosił zamawiający (przebudowa jednej strony startowej).

### Option 3: Zostać przy v3, potraktować grafikę jako wyjątek tylko dla strony startowej

Reużycie albo lekkie rozszerzenie istniejących tokenów v3, bez ogłaszania nowej, niezależnej palety.

**Pros**:
- Najmniejsza możliwa zmiana, żadnego nowego pliku tokenów.

**Cons**:
- Wprost odrzucone przez zamawiającego w tej sesji: zapytany wprost, czy „nowa paleta" znaczy rozszerzenie v3 czy naprawdę inny kierunek, wybrał „naprawdę inny kierunek marki".

## Decision

**Chosen option**: Option 1, nowe tokeny v4 wdrażane stopniowo, zaczynając od strony startowej.

## Rationale

Grafika referencyjna łamie dwie wprost zapisane zasady v3 (Interior Light jako akcja, brak trybu ciemnego) nie przez przypadek, tylko jako świadomy, spójny kierunek: ciemne sekcje i bursztynowy przycisk akcji pojawiają się konsekwentnie w kilku miejscach strony (hero, pasek CTA, pasek producentów). To nie jest drobna korekta istniejącego systemu, tylko inny kierunek wizualny, więc nazwanie go osobnym zestawem tokenów (v4) zamiast cichego złamania zasad v3 jest uczciwsze wobec istniejącej dokumentacji marki i przyszłych czytelników `docs/brand-guidelines-v3.md`.

Stopniowe wdrożenie (Option 1) jest bezpośrednią konsekwencją tego, że 12 ekranów jest już `done` i zweryfikowanych względem v3 (Context) — Option 2 postawiłby tę pracę na szali bez wyraźnej potrzeby biznesowej, a Option 3 zostało już odrzucone wprost przez zamawiającego.

## Standard definition

**Canonical pattern**: nowy plik `assets/tokens/brand-v4-tokens.css` (plus `brand-v4-tokens.json` dla spójności z istniejącym wzorcem v3), zarejestrowany jako kolejny import w `app/globals.css` obok `brand-v3-tokens.css` (`@theme inline` rejestruje oba zestawy zmiennych pod osobnymi nazwami, nic w v3 się nie zmienia). Wartości koloru są przybliżone przez odczyt wizualny `public/references.png`; `/develop` powinien je dostroić pixel‑precyzyjnie względem tego pliku podczas budowy, traktując poniższe jako przemyślany punkt startowy, nie ostateczne wartości:

| Token | Wartość | Użycie |
|---|---|---|
| `--brand-v4-night` | `#0E1A2B` | główne ciemne tło (hero, pasek CTA, pasek producentów) |
| `--brand-v4-night-deep` | `#081220` | najciemniejszy ton, gradient/cień na zdjęciu w hero |
| `--brand-v4-paper` | `#FAF8F3` | tło jasnych sekcji (statystyki, kategorie, „dlaczego my") |
| `--brand-v4-surface` | `#FFFFFF` | karty, panel wyszukiwania, kafelki „dlaczego my" |
| `--brand-v4-amber` | `#E2A542` | główny kolor akcji (przyciski CTA, gwiazdki oceny, etykiety typu eyebrow na ciemnym tle) — w v4 to jest dozwolony kolor akcji, w przeciwieństwie do ograniczenia Interior Light w v3 |
| `--brand-v4-amber-strong` | `#C98A2C` | stan hover/active przycisków akcji |
| `--brand-v4-amber-foreground` | `= --brand-v4-ink` (`#14213A`) | **jedyny dozwolony kolor tekstu/ikony na wypełnieniu `--brand-v4-amber`.** Biały tekst na bursztynie ma kontrast ~2.17:1, poniżej progu WCAG AA (4.5:1); ciemny granat ma ~7.4:1. Każdy przycisk czy etykieta z tłem `--brand-v4-amber` musi używać tego tokenu, nigdy `--brand-v4-surface`/biały |
| `--brand-v4-ink` | `#14213A` | nagłówki i tekst na jasnym tle |
| `--brand-v4-muted` | `#5B6472` | tekst drugorzędny na jasnym tle |
| `--brand-v4-mist` | `#AAB4C2` | tekst drugorzędny na ciemnym tle |
| `--brand-v4-line` | `#E7E3DA` | linie/obramowania na jasnym tle |
| `--brand-v4-line-dark` | `rgba(255,255,255,0.14)` | linie/obramowania na ciemnym tle |
| `--brand-v4-radius-pill` | `999px` | w pełni zaokrąglone przyciski i panel wyszukiwania |
| `--brand-v4-radius-panel` | `28px` | duże zaokrąglenia (zdjęcie hero, karta wyszukiwania) |
| `--brand-v4-radius-card` | `20px` | karty kategorii i kafelki „dlaczego my" |

Statusy produktowe (`--status-approved` / `--status-conditional` / `--status-blocked`) i typografia (Montserrat display, Inter body, IBM Plex Mono data) zostają bez zmian — nie są częścią tej decyzji, ta dotyczy wyłącznie koloru i promieni zaokrągleń dla sekcji marketingowych.

**Replaces**: v3 pozostaje ważny i niezmieniony wszędzie tam, gdzie ekran go jeszcze nie migruje. v4 staje się domyślnym wyborem tylko dla nowo budowanych albo świadomie przebudowywanych powierzchni produktu, zaczynając od strony startowej (spec 0014).

**Enforcement**: żaden komponent nie zapisuje na sztywno wartości koloru ani promienia — tylko zarejestrowane tokeny (ta sama zasada co dla v3, `docs/design.md`). Brak automatycznej reguły lintera na etapie tego prototypu (spec 0002 odnotowała, że lint/format nie jest jeszcze domknięty, funkcja 2 w `docs/scope/scope.md`); zgodność sprawdzana wizualnie podczas `/check verify` ekranu, który konsumuje v4.

**Rollout**: stopniowy, ekran po ekranie. Strona startowa (spec 0014) jest pierwszym i na razie jedynym konsumentem. Migracja pozostałych 15 funkcji do v4 to osobna, przyszła decyzja per ekran, nieplanowana w tym kroku (patrz Follow-up).

**Exceptions**: cała ścieżka producenta i pozostałe ekrany klienta zostają bez zmian na v3 do czasu osobnej decyzji migracyjnej. Kolory statusów (`approved`/`conditional`/`blocked`) są nietykalne — to osobny, zarezerwowany język zgodności, nieużywany dekoracyjnie, i ta decyzja go nie dotyczy.

## Consequences

**Positive**:
- Strona startowa może teraz wiernie odzwierciedlić dostarczoną grafikę, zamiast cichego łamania zasad v3 albo kompromisu, który nie pasuje do żadnego z nich.
- Istnieje realna, nazwana ścieżka rozszerzenia na resztę produktu bez ryzykownego, jednorazowego przepisania wszystkiego naraz.

**Negative / tradeoffs**:
- Produkt tymczasowo nosi dwa systemy kolorów; ktoś klikający między stroną startową a np. wynikami zobaczy wyraźnie różne języki wizualne. To świadomy, zaakceptowany stan przejściowy, nie błąd.
- Formalny proces zatwierdzania marki opisany w `docs/brand-guidelines-v3.md` (sekcja 15, wymaga podpisu właściciela marki przy zmianie tokenów) nie został tu przeprowadzony — w tej sesji zamawiający potwierdził kierunek bezpośrednio, ale to zastępstwo, nie formalne zatwierdzenie.

**Neutral**:
- `docs/brand-guidelines-v3.md` i `docs/design.md` nadal opisują wyłącznie v3 (co pozostaje prawdą dla wszystkiego poza stroną startową); potrzebują sekcji o v4, gdy pojawi się więcej niż jeden konsument (patrz Follow-up).

## Follow-up

- [ ] Wymaga realnego zatwierdzenia przez właściciela marki zgodnie z procesem z `docs/brand-guidelines-v3.md` sekcja 15; potwierdzenie w tej sesji jest zastępstwem, nie formalnym podpisem. Ktoś z zespołu powinien to potwierdzić z faktycznym zamawiającym.
- [ ] Migracja pozostałych 15 funkcji (`docs/scope/scope.md`) do v4 to osobna decyzja per ekran, nie zaplanowana tutaj. Rozważyć przy każdej kolejnej większej przebudowie ekranu, nie jako jednorazowy projekt.
- [ ] `docs/design.md` powinien dostać sekcję v4 (albo rozdzielenie v3/v4) po tym, jak strona startowa (spec 0014) faktycznie zacznie go używać; do tego czasu dokument opisuje tylko v3, co jest nadal prawdą wszędzie poza jednym ekranem.
- [ ] Dokładne wartości hex w tabeli wyżej są odczytane wizualnie z `public/references.png`, nie spróbkowane narzędziem — `/develop` powinien je dostroić względem tego pliku przy budowie, jeśli różnica będzie zauważalna.
