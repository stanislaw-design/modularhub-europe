# 0005. Rationale: Zapytanie / shortlista

## Context

Spec 0004 ustaliła kartę wyniku jako nieklikalną (`ResultCard`, AC-8) i w swoim Follow-up wprost zostawiła otwarte pytanie: gdy powstanie mechanizm wyboru (ta funkcja), czy karta powinna stać się linkiem, czy dostać checkbox. Ta specyfikacja odpowiada na to pytanie i projektuje cały mechanizm od zaznaczenia po potwierdzenie.

Projekt jest w etapie Facade: bez bazy danych, bez logowania, bez realnej wysyłki (`AGENTS.md`, `docs/scope/scope.md`). To oznacza, że mechanizm "wysyłki zapytania" musi być w całości po stronie klienta, bez żadnego realnego API, przy zachowaniu wrażenia pełnego, klikalnego produktu (mandat `docs/design.md`: "no lone form floating on an empty page"). Jednocześnie funkcja ma ustalić "narzucony przez platformę szablon" zapytania, format, z którego skorzysta też strona producenta (funkcja 15, lista przychodzących zapytań), więc decyzja o kształcie tego szablonu nie jest lokalna tylko dla tego ekranu.

`AGENTS.md` ustala regułę: stan UI, który musi przetrwać zmianę trasy, idzie przez parametry URL, nie przez współdzielony stan komponentów. To bezpośrednio kształtuje sposób przenoszenia zaznaczonych projektów między `/wyniki` a nowym adresem zapytania.

Uwaga doprecyzowująca: pierwotny opis funkcji w `docs/scope/scope.md` mówił o wyborze "2 do 3 projektów". W rozmowie projektowej zamawiający doprecyzował, że wystarczy już 1 zaznaczony projekt (górny limit 3 zostaje bez zmian), więc ta specyfikacja i towarzyszący build plan świadomie używają zakresu 1 do 3, nie 2 do 3. Rozbieżność z tekstem scope jest odnotowana w Follow-up spec głównej (`index.md`).

## Options considered

### Option 1: Zaznaczanie na kartach wyników plus jeden adres z dwiema fazami (formularz, potem potwierdzenie)

Checkboxy żyją wprost na `ResultCard`; przypięty pasek akcji śledzi zaznaczenie i nawiguje do jednego nowego adresu (`/zapytanie`), który jako ten sam widok najpierw pokazuje formularz kontaktowy, a po submit (bez nawigacji) przełącza się na stan potwierdzenia.

**Pros**:
- Najmniej nowych adresów (jeden), zero nowego interaktywnego prymitywu (dialog, drawer), zgodnie z ograniczeniem z `docs/design.md`.
- Tylko identyfikatory projektów przekraczają granicę trasy, więc reguła URL z `AGENTS.md` stosuje się czysto, bez wątpliwości co robić z danymi kontaktowymi.

**Cons**:
- Strona wyników i `ResultCard` przejmują nowy, nietrywialny stan interaktywny (zaznaczenie, limit, disabled), którego wcześniej nie miały; rośnie zakres tego, co było prostą, serwerowo renderowaną listą.

### Option 2: Osobna strona shortlisty

Karty na wynikach dostają lekką akcję "dodaj do shortlisty" (bez widocznego stanu zaznaczenia wprost na karcie); osobna strona `/shortlista` pokazuje, co zostało dodane, z własnym przeglądem i przyciskiem wysyłki, zanim i tak trafi do kroku potwierdzenia.

**Pros**:
- Strona wyników zostaje prostsza, bez stanu zaznaczenia do zarządzania bezpośrednio na niej.
- Więcej miejsca na pełniejszy ekran przeglądu przed wysyłką.

**Cons**:
- O jeden ekran i jedną nawigację więcej, zanim klient cokolwiek wyśle; mock zapytania rozciąga się na trzy adresy zamiast dwóch, dla funkcji, którą scope opisuje jako lekką ("bez realnego wysyłania").

### Option 3: Bez zmiany trasy, formularz i potwierdzenie w modalu nad wynikami

Zaznaczanie zostaje inline jak w Opcji 1, ale "Wyślij zapytanie" otwiera modal albo drawer nad tą samą stroną wyników na formularz i potwierdzenie, bez opuszczania trasy.

**Pros**:
- Najszybszy odczuwalny przepływ, brak ładowania strony między krokami.

**Cons**:
- `docs/design.md` wprost zastrzega budowę nowego interaktywnego prymitywu (m.in. dialog) dla ekranu, który pierwszy go potrzebuje, nie dla fundamentu; ten modal wymagałby też własnej pułapki fokusa i pracy dostępnościowej, której zmiana trasy dostaje za darmo.
- Rozjeżdża się z ramą "ekranu potwierdzenia zapytania" z opisu funkcji w scope, który sugeruje osobny widok, nie nakładkę.

## Rationale

Opcja 1 wygrywa, bo respektuje dwa ograniczenia, które już obowiązują w projekcie, zamiast je omijać: regułę stanu w URL z `AGENTS.md` (tu: tylko `projects`, `country`, `sizeMin`, `sizeMax`, nigdy dane kontaktowe) i zastrzeżenie z `docs/design.md`, że nowe interaktywne prymitywy (dialog, drawer) są budowane dopiero na ekranie, który ich naprawdę potrzebuje, nie tutaj przy okazji. Opcja 3 złamałaby to drugie ograniczenie bez wyraźnej korzyści, skoro scope i tak zakłada osobny "ekran potwierdzenia". Opcja 2 dokłada trzeci adres i drugą nawigację do funkcji, którą sam opis w scope traktuje jako lekką, mockowaną wysyłkę, bez realnej wartości z dodatkowego ekranu przeglądu na tym etapie Facade.

Dwie fazy (`form`, `sent`) w obrębie jednego adresu `/zapytanie` to rozwiązanie kompromisowe między "Direct send" (jak najmniej kroków) a wymogiem zebrania danych kontaktowych: klient nie widzi dodatkowego ekranu "przeglądu" przed wysyłką (którego explicite nie chciał), ale i tak podaje dane kontaktowe raz, zanim mock "wyśle" zapytanie.

## References

Brak, zgodnie z wyborem zamawiającego (poziom referencji: brak).
