# 0046. Rationale

## Context

Panel producenta (`/producer/panel/**`, spec 0032, status In Progress) renderuje się dziś wyłącznie w jasnym motywie. Spec 0043 zbudował pełny mechanizm trybu ciemnego dla flow klienta (cookie `theme`, `ThemeProvider`/`ThemeToggle`, klasa zakresu `.theme-klient` na `document.body`, wartości ciemne w `app/globals.css`), ale jego AC-11 wyraźnie zostawiło producenta i panel wewnętrzny poza zakresem, a Follow-up wprost zapowiedział osobną decyzję `/architect` dla producenta, gdy nadejdzie jej kolej.

Ta decyzja to właśnie ten moment, zawężony (na wyraźną prośbę) do samego chronionego panelu (`panel`, `produkty`, `projekt`, `zapytania` i ich podstrony), nie do publicznych stron producenta (rejestracja, weryfikacja firmy, gotowość eksportowa, domykanie luk, realizacje), które dziś żyją osobno pod `app/[locale]/producer/(public)/` po niedawnym rozdzieleniu tras. Kluczowe ograniczenia: panel producenta używa wyłącznie generacji tokenów v3 (potwierdzone przeszukaniem `components/producent/`, brak jakiegokolwiek aliasu v4/v5), i dziś nie ma w tych komponentach żadnego twardo zakodowanego koloru (potwierdzone tym samym przeszukaniem) — więc ryzyko "cichego" ekranu, który zostaje jasny w trybie ciemnym, jest tu niższe niż przy pierwotnym audycie 43 komponentów klienta w 0043.

Nie decydowanie w ogóle (zostawienie panelu tylko jasnym) oznacza rosnącą niespójność: producent, który zna już przełącznik z flow klienta (jeśli kiedykolwiek tam trafi) albo po prostu oczekuje standardowej wygody nowoczesnego panelu zarządzania, nie znajdzie go tutaj.

## Options considered

### Option 1: Rozszerz istniejący mechanizm o drugi zakres (`scopeClassName` na `ThemeProvider`)

`ThemeProvider` przyjmuje parametr nazwy klasy zakresu zamiast trzech literałów `"theme-klient"`; nowy `producer/panel/layout.tsx` montuje go z `scopeClassName="theme-producer"`, czytając to samo cookie `theme`. Wartości ciemne dla panelu to podzbiór (tylko v3) tych samych deklaracji co `.theme-klient.dark`, połączony w jedną listę selektorów.

**Pros**:
- Zero nowych pojęć: jeden cookie, jeden `ThemeToggle`, jedna strategia CSS, tylko dwa zakresy zamiast jednego.
- Wspólne wartości v3 zdefiniowane raz, więc panel i flow klienta nie mogą się wizualnie rozjechać dla tych samych tokenów.
- Mały, lokalny diff: jeden prop, jedno miejsce montowania, jeden dopisek CSS.

**Cons**:
- Dotyka już zaakceptowanego, produkcyjnego kodu 0043 (`ThemeProvider.tsx` i jego test); wymaga ostrożności, żeby nie zregresować flow klienta.

### Option 2: Osobny `ProducerThemeProvider` i osobne cookie `producer-theme`

Zupełnie niezależna implementacja: nowy komponent, nowy plik `lib/producer-theme.ts`, osobne cookie, nieświadome istnienia 0043.

**Pros**:
- Zero ryzyka dotknięcia kodu flow klienta.

**Cons**:
- Powiela niemal identyczną logikę w dwóch miejscach, które mogą się z czasem rozjechać (dokładnie ten sam typ ryzyka, przed którym `docs/specs/0032` ostrzega przy akcjach na zdjęciach: "ta sama logika... nie powinna istnieć w dwóch miejscach").
- Dwa cookie na jedną w gruncie rzeczy tę samą preferencję wizualną odwiedzającego to niepotrzebna komplikacja bez żadnej realnej korzyści (producent i klient to różne konta, ale nawet to samo urządzenie/przeglądarkę i tak dziś nikt nie współdzieli między rolami w praktyce).

### Option 3: Znieś zakresowanie, `.dark` działa globalnie

Usuń `.theme-klient` jako bramkę i pozwól klasie `.dark`/cookie `theme` działać na całej stronie od razu, obejmując też panel wewnętrzny.

**Pros**:
- Najmniej kodu do napisania w tej konkretnej funkcji.

**Cons**:
- Wprost łamie już ustalony i zaakceptowany niezmiennik 0043 AC-11 (producent/internal zostają jasne, dopóki nie dostaną własnej decyzji); panel wewnętrzny nigdy nie przeszedł audytu kolorów ani kontrastu, więc natychmiast dostałby niekontrolowany, częściowo zepsuty tryb ciemny.
- Znacznie większy blast radius niż to, o co poproszono (tylko panel producenta), trudniejszy do wycofania niż revert jednego commitu.

## Rationale

Option 1 wygrywa, bo jedyny realny koszt (dotknięcie kodu 0043) jest mały i w pełni kontrolowany testami, a korzyść (jedna spójna implementacja, jeden cookie, brak duplikacji) wprost realizuje zasadę, którą projekt już sam sobie narzucił przy akcjach na zdjęciach producenta (spec 0032): nie powielać tej samej logiki w dwóch miejscach, które mogą się rozjechać. Option 2 płaci tę cenę bez żadnej korzyści proporcjonalnej do ryzyka rozjazdu. Option 3 był kuszący swoją prostotą, ale łamie niezmiennik, który 0043 świadomie ustaliło (producent/internal poza zakresem, do czasu własnej decyzji) — a ta decyzja świadomie zawęża się tylko do panelu, nie do "wszystkiego naraz".
