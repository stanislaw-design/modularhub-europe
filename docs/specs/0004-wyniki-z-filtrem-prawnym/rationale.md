# 0004. Wyniki z filtrem prawnym: uzasadnienie

## Context

Kupno domu modułowego za granicą wiąże się z realnym problemem: to, co wolno postawić w Polsce, nie zawsze wolno postawić w Niemczech czy Holandii, bo różnią się wymogi techniczne (odporność ogniowa, obciążenie wiatrem i śniegiem, klasa energetyczna okien, poziom wód gruntowych). Klient, który w hero strony głównej wybrał kraj i metraż, oczekuje listy domów, które faktycznie da się tam zbudować, a nie pełnego katalogu producentów wymagającego samodzielnego sprawdzania przepisów.

Rzeczywistość prawna nie jest binarna: dom może być w pełni dopuszczony, dopuszczony pod warunkiem uzupełnienia dokumentacji (np. brakujących obliczeń statycznych albo certyfikatu), albo całkowicie niedopuszczalny. Ta strona musi zdecydować, gdzie w tym spektrum przebiega granica "pokazujemy" i "chowamy", i jak komunikować status pośredni tak, żeby użytkownik go zauważył, ale nie potraktował listy jako przytłaczającej.

Kontrakt parametrów URL (`country`, `sizeMin`, `sizeMax`) został już ustalony w spec 0003, razem z zasadą, że brak `country` oznacza brak filtra prawnego, nie błąd. Ta sama specyfikacja świadomie zostawiła dokładną obsługę nieprawidłowych, ręcznie wpisanych parametrów jako zadanie dla tej strony. Bez podjęcia tej decyzji teraz, `/develop` musiałby wymyślić granicę `conditional` kontra `blocked` ad hoc, ryzykując rozjazd z już napisanym komentarzem w `lib/data/projects.ts`, i blokując funkcję 7 (shortlista), która zależy od wzorca karty ustalonego tutaj.

Etap projektu to Facade: cały katalog (6 projektów, 3 kraje) jest danymi mockowymi, a prawdziwy silnik zgodności prawnej to osobna, odłożona decyzja (Deferred, "full weight").

## Options considered

### Option 1: Pokaż approved i conditional, ukryj tylko blocked

Filtr prawny ukrywa wyłącznie domy faktycznie niedopuszczalne; domy `conditional` (wymagające dodatkowej dokumentacji albo certyfikatu) nadal się pokazują, tylko oznaczone odznaką.

**Pros**:
- Maksymalizuje widoczną ofertę, co ma znaczenie przy tylko 6 projektach w mocku.
- Zgodne z już napisanym kodem `getProjects()` w `lib/data/projects.ts`.
- Zgodne z `brand-guidelines-v3.md` sekcja 12, która traktuje status `conditional` jako wynik do pokazania, nie do ukrycia.

**Cons**:
- Wymaga jasnej sygnalizacji na karcie (odznaki), inaczej użytkownik może pomylić "dopuszczalny warunkowo" z "w pełni dopuszczalny".
- Dodaje jeden nowy stan wizualny do wzorca karty.

### Option 2: Pokaż tylko approved, ukryj conditional razem z blocked

Najbardziej dosłowna interpretacja słowa "filtr prawny": na liście zostają wyłącznie domy w pełni dopuszczone.

**Pros**:
- Najprostsza reguła, zero ryzyka niejasnej komunikacji prawnej na liście.

**Cons**:
- Ukrywa realną, użyteczną opcję: dom da się postawić, tylko wymaga dodatkowych dokumentów. W obecnym mocku ukryłoby to na przykład Modulor Family 90 w Niemczech i Baltyk Studio 38 w Holandii, zawężając ofertę bardziej niż to uzasadnione przy zaledwie 6 projektach.
- Niezgodne z już napisanym w kodzie komentarzem, który sugeruje odwrotną interpretację; wymagałoby cofnięcia istniejącej logiki.

### Option 3: Pokaż wszystkie projekty niezależnie od statusu, tylko z adnotacją

Brak ukrywania w ogóle; nawet domy `blocked` pokazują się z etykietą "niedostępny tutaj".

**Pros**:
- Zero utraconej widoczności oferty, użytkownik widzi pełny katalog za jednym razem.

**Cons**:
- Przeczy samej nazwie funkcji ("filtr prawny") i jej zapisowi "Done when" w `docs/scope/scope.md`, który wprost wymaga, żeby projekty niedopuszczalne w danym kraju się nie pokazywały.
- Myliłoby użytkownika, sugerując, że dom `blocked` to wybieralna opcja, skoro faktycznie nie jest.

## Rationale

Zapis "Done when" funkcji 6 w `docs/scope/scope.md` wprost wymaga, że "projekty niedopuszczalne w danym kraju się nie pokazują", co wyklucza Option 3 od razu. Między Option 1 a Option 2 przeważa mały rozmiar katalogu mockowego (6 projektów) i już zaimplementowana logika w `getProjects()`: ukrycie `conditional` (Option 2) usunęłoby użyteczne, budowalne opcje z listy i wymagałoby cofnięcia działającego kodu bez wyraźnego powodu biznesowego. `brand-guidelines-v3.md` sekcja 12 dodatkowo potwierdza, że `conditional` to wynik do wyświetlenia, nie do ukrycia.

Koszt Option 1, czyli potrzeba jasnej sygnalizacji statusu `conditional` na karcie, jest niewielki: projekt ma już gotowy do tego komponent (`StatusPill`, warianty `approved`/`conditional`/`blocked`) z poprzedniego etapu fundamentu UI, więc nie trzeba projektować nowego elementu wizualnego od zera, tylko go użyć.
