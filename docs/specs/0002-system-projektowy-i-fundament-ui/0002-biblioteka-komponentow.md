# 0002. Biblioteka komponentów bazowych

## Summary

Ta część fundamentu wybiera, jak komponenty bazowe (przycisk, pole formularza, karta, znacznik statusu) dostają swoje warianty wizualne i prawdziwą obsługę klawiatury oraz fokusa, jaki zestaw ikon towarzyszy interfejsowi, i który konkretny zestaw komponentów powstaje teraz, a który zostaje dla ekranu, który go pierwszy wprowadzi.

## Decision

**Chosen option**: `tailwind-variants` do wariantów stylu, `Headless UI` do dostępnych prymitywów, `lucide-react` do ikon, zbudowany teraz zestaw ograniczony do atomów i layoutu.

**Implementation skills**: `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`)

| Layer | Choice | Reason |
|---|---|---|
| Warianty stylu | `tailwind-variants` | typowane warianty i wbudowane scalanie klas, jedna zależność (basis: sprawdzenie aktualnego stanu narzędzi, patrz [rationale.md](rationale.md)) |
| Dostępne prymitywy | `Headless UI` (`@headlessui/react`) | najciaśniejsze dopasowanie do Tailwind, mniejszy zakres pasujący do lean/medium wagi tego etapu (basis: `docs/scope/scope.md`, Weight profile) |
| Ikony | `lucide-react` | domyślny wybór ekosystemu, typowany, łatwo wymienić na w pełni własny zestaw później |
| Pierścień fokusa | Istniejący token `--brand-focus-ring` (pełna wartość `box-shadow`) z `assets/tokens/brand-v3-tokens.css`, zastosowany jako `focus-visible:shadow-[var(--brand-focus-ring)]` (Tailwind v4 dowolna wartość) albo jedna wspólna klasa narzędziowa `.focus-ring` w `app/globals.css`, nie przez natywne klasy `ring-*` Tailwind (te czytają inny zestaw zmiennych niż gotowy `box-shadow`) | token już istnieje jako gotowa wartość `box-shadow`, więc podłączenie go pod `ring-*` nie zadziała bez przepisania go na osobne zmienne `--tw-ring-*`; prostsza droga to użyć go wprost jako `shadow` |
| Standard dostępności | WCAG 2.2 AA | wprost wskazany jako minimalny standard w `docs/brand-guidelines-v3.md`, sekcja 14 |

**Zestaw komponentów budowany teraz** (atomy i layout, każdy ze stylowaniem przez `tailwind-variants` i, gdzie dotyczy, prymitywem z Headless UI). Z tego zestawu tylko `Select` faktycznie potrzebuje Headless UI: `Input`, `Textarea`, `Checkbox`, `Radio` i `Button` mają obsługę klawiatury wprost z natywnego, semantycznego HTML, bez żadnej biblioteki. Headless UI wchodzi do gry tam, gdzie natywny HTML nie wystarcza (rozwijane listy, dialogi w przyszłych specyfikacjach), nie jako blankiet na wszystkie komponenty:
- `Button` (warianty: primary/secondary/ghost, rozmiary sm/md/lg; wariant renderujący `<a>` zamiast `<button>`, dla CTA które są linkiem, np. ekran 4)
- Pola formularza: `Input`, `Select` (Headless UI `Listbox`, jedyny komponent w tym zestawie, który realnie potrzebuje biblioteki), `Textarea`, `Checkbox`, `Radio`
- `Label`
- `StatusPill` (trzy zastrzeżone kolory statusu: approved/conditional/blocked, zawsze z tekstem, nigdy samym kolorem, zgodnie z sekcją 7 wytycznych marki)
- `Card` (powłoka ogólna: obramowanie, promień `--radius-card`, bez wbudowanej treści)
- Komponenty typografii: `Heading` (poziomy H1 do H3 plus Display XL), `Text`, `DataText` (mono, `tabular-nums`)
- Layout: `Container`, `Grid`, `Stack`

**Świadomie poza zakresem tej specyfikacji** (własność ekranu, który pierwszy wprowadza wzorzec, per `docs/scope/scope.md`): `Dialog`/modal mocka płatności (ekrany 8, 14), oś statusu/timeline (ekrany 10, 16), makieta uploadu pliku (ekran 12), `Tabs`, `Table`. Stan ładowania (skeleton/spinner) też odłożony: dane mockowe czytają się bez realnego opóźnienia sieciowego, więc realny stan ładowania ma sens dopiero przy prawdziwym API w drugim etapie.

## Rationale

Krótkie uzasadnienie wyborów narzędzi: pełne porównanie opcji jest w [rationale.md](rationale.md) specyfikacji parasolowej. W skrócie: `tailwind-variants` i `Headless UI` to najlżejsze opcje, które wciąż w pełni pokrywają wymóg "Done when" o obsłudze fokusa i klawiatury, zgodnie z lean/medium wagą tego etapu prototypu; `lucide-react` to bezpieczny, łatwo wymienialny domyślny wybór.

## Consequences

**Positive**: `Select` dostaje prawdziwą obsługę klawiatury z pudełka od Headless UI zamiast ręcznie pisanej logiki; pozostałe pola formularza i `Button` dostają ją za darmo z natywnego HTML, bez żadnej zależności.
**Negative / tradeoffs**: trzy nowe zależności w projekcie, który wcześniej nie miał żadnej biblioteki UI; `Dialog`, oś statusu i upload wciąż nie mają bazy, dopóki ich własne specyfikacje nie powstaną. Interaktywne prymitywy Headless UI (np. `Select`) działają tylko jako komponenty klienckie (`"use client"`); każdy ekran, który ich używa, musi świadomie wyznaczyć tę granicę serwer/klient w App Routerze, nie może zostać czystym komponentem serwerowym.
**Neutral**: `StatusPill` zamyka na stałe trzy kolory statusu z sekcji 7 wytycznych marki; żaden przyszły ekran nie powinien wprowadzać czwartego koloru statusu bez zmiany tej decyzji.

## Follow-up

- [ ] Ekrany 8/14 (mock płatności), 10/16 (oś statusu), 12 (upload) budują własny komponent w swojej specyfikacji, opierając się na `Button`, `Card` i tokenach z tego fundamentu, nie od zera.
- [ ] Rozważ dodanie stanu ładowania (skeleton/spinner) przy `/architect` dla wymiany danych mockowych na prawdziwe API w drugim etapie.
- [ ] Sprawdź kontrast tokenu `--brand-focus-ring` (`rgba(23, 92, 211, 0.28)` na Warm White) względem minimum 3:1 dla elementów niebędących tekstem z WCAG 2.2 AA (sekcja 14 wytycznych marki wskazuje ten standard jako obowiązujący). Na oko ten kontrast wygląda za nisko; zmiana samego tokenu wymaga akceptacji właściciela marki (sekcja 15 wytycznych), więc to zgłoszenie, nie decyzja podjęta w tej specyfikacji.
