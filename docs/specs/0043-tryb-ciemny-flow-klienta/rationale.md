# 0043. Rationale: tryb ciemny dla flow klienta

## Context

> ⚠️ Uwaga terminologiczna: spec [0013](../0013-tokeny-marki-v4.md) używa słowa "ciemne" na określenie ciemno kolorowanych sekcji marketingowych w palecie v4 (np. tło hero, pasek CTA), które są częścią stałego, jasnego motywu produktu i nie zależą od wyboru użytkownika. Ta specyfikacja dotyczy czegoś innego: przełącznika, który cały interfejs pokazuje w jednym z dwóch trybów kolorystycznych (jasny, ciemny) na życzenie odwiedzającego. Obie rzeczy współistnieją: sekcja marketingowa "ciemna" w palecie v4 sama też dostaje swój ciemny wariant w trybie ciemnym.

Produkt ma dziś wyłącznie jasny motyw. Warstwa kolorów jest zbudowana z trzech współistniejących generacji tokenów marki (v3 z fundamentu systemu projektowego, v4 z przebudowy strony startowej, v5 z premium redesignu), wszystkie zaaliasowane w jednym bloku `@theme inline` w `app/globals.css`. Każdy z 43 komponentów `components/klient/` miesza tokeny z więcej niż jednej generacji (np. `LanguageSwitcher` ma już wariant `surface: "v3" | "v5"` na dokładnie tym samym nagłówku, gdzie ma stanąć nowy przełącznik motywu), więc żadna pojedyncza trasa flow klienta nie jest czysto w jednej generacji tokenów.

Nie ma dziś żadnej infrastruktury do przełączania motywu: brak zależności typu `next-themes`, brak klasy `.dark` czy atrybutu `data-theme`, brak użycia `prefers-color-scheme` w kodzie. Stack to Tailwind CSS v4 (konfiguracja przez `@theme`, nie `tailwind.config.js`) i Next.js 16 App Router, oba bez wbudowanego rozwiązania do przełączanego (nie tylko systemowego) trybu ciemnego, wymaga to jawnej konfiguracji przez `@custom-variant`.

Projekt jest w etapie Facade (dane przykładowe, bez bazy danych, bez logowania na tym etapie), więc wybór motywu nie jest daną użytkownika w bazie, tylko lekkim stanem klienckim, tak jak istniejący wybór języka w `LanguageSwitcher` (URL/routing), z tą różnicą że motyw nie jest częścią adresu i musi przetrwać między stronami bez URL.

Zamawiający świadomie zawęził zakres tej decyzji do flow klienta (`app/[locale]/klient/**`), zaczynając od strony głównej; flow producenta i panel wewnętrzny (`app/[locale]/internal/`) zostają jasne do osobnej decyzji.

## Options considered

### Option 1: Własny, minimalny kontekst React + cookie + `@custom-variant dark` (klasa `.dark`)

Mała własna warstwa: cookie `theme` (`light` | `dark`) odczytywane po stronie serwera w `app/[locale]/layout.tsx`, ustawiające klasę `.dark` na `<html>` przy renderze serwerowym gdy cookie istnieje; klient side `ThemeProvider`/`useTheme()` hook przełącza klasę i zapisuje cookie przy kliknięciu. Brak zapisanego cookie: czysty CSS `@media (prefers-color-scheme: dark)` (bez JS, bez blokującego skryptu) daje domyślny motyw zgodny z systemem od pierwszego renderu.

**Pros**:
- Zero nowych zależności, zgodne z lekkim profilem zależności etapu Facade.
- Cookie czytelne po stronie serwera: pierwszy render po jawnym wyborze trafia od razu we właściwy motyw, bez błysku złego motywu.
- Pełna kontrola nad nazwą, czasem życia i atrybutami cookie (`SameSite=Lax`, brak `httpOnly` bo musi być czytelne po stronie klienta).

**Cons**:
- Trzeba samemu napisać i przetestować mechanizm zapobiegania błyskowi złego motywu (rozwiązany tu kombinacją CSS media query na starcie plus cookie po jawnym wyborze), zamiast dostać to gotowe z biblioteki.

### Option 2: `next-themes`

Popularna, sprawdzona biblioteka do przełączania motywu w Next.js, z gotową obsługą trybu systemowego i zapobieganiem błyskowi złego motywu przez mały blokujący skrypt wstrzykiwany w `<head>`.

**Pros**:
- Sprawdzone, szeroko używane rozwiązanie, mniej własnego kodu do utrzymania.
- Gotowa obsługa trybu "system" (przydatna, gdyby zakres kiedyś urósł do trzech stanów w UI).

**Cons**:
- Domyślnie trzyma wybór w `localStorage`, nie w cookie: nie da się z tego odczytać wyboru po stronie serwera bez dodatkowej własnej warstwy, więc wymagałoby dokładnie tego samego cookie mostu co Opcja 1, tylko obok nowej zależności, nie zamiast niej.
- Nowa zależność produkcyjna do utrzymania (aktualizacje, kompatybilność z React 19 i Next 16) za funkcję, którą projekt i tak potrzebuje zaimplementować własnym mostem cookie.

### Option 3: Sama klasa `.dark` sterowana z `localStorage`, bez cookie

Wariant Opcji 1 bez serwerowego odczytu: `<html>` renderuje się zawsze bez `.dark`, mały inline skrypt w `<head>` odczytuje `localStorage` przed pierwszym malowaniem i dokleja klasę.

**Pros**:
- Prostszy mechanizm zapisu (jeden `localStorage.setItem`, brak configuracji cookie).

**Cons**:
- Wymaga blokującego inline skryptu w `<head>`, żeby uniknąć błysku złego motywu przy powrocie odwiedzającego z zapisanym wyborem, czego Opcja 1 unika dzięki cookie czytanemu bezpośrednio w server component.
- Rozwiązanie zdecydowanie gorsze pod kątem SSR niż cookie, bez realnej korzyści rekompensującej tę wadę w tym stacku.

## Rationale

Opcja 1 wygrywa, bo dokładnie odpowiada na dwa realne wymagania zamawiającego naraz: domyślny motyw ma iść za systemem (`prefers-color-scheme`), a jawny wybór ma przetrwać między stronami bez błysku złego motywu. Czysty CSS `@media` rozwiązuje pierwsze bez ani jednej linii JavaScript; cookie czytane w server component rozwiązuje drugie, bo Next.js App Router i tak renderuje `app/[locale]/layout.tsx` na serwerze przy każdym pełnym załadowaniu strony, więc odczyt cookie jest praktycznie darmowy i nie wymaga blokującego skryptu (odrzucona Opcja 3).

`next-themes` (Opcja 2) zostałaby odrzucona nawet w projekcie, który już ma więcej zależności: jej domyślny mechanizm (`localStorage`) nie spełnia wymogu SSR bez odczytu po stronie serwera na starcie, więc i tak trzeba by dobudować most cookie, tylko obok nowej zależności zamiast zamiast niej. W etapie Facade, gdzie projekt świadomie trzyma zależności lekkie (mock dane, brak bazy, brak logowania), własne kilkadziesiąt linii kodu jest tańsze w utrzymaniu niż biblioteka rozwiązująca połowę problemu.

Architektura tokenów (trzy generacje aliasowane w jednym `@theme inline`) determinuje gdzie żyją wartości ciemne: nie jako nowe klasy `dark:` rozsiane po 43 komponentach klienta, tylko jako przedefiniowanie tych samych custom properties (`--brand-foundation-navy`, `--brand-v5-paper`, …) w bloku `.dark { … }` w `app/globals.css`. Ponieważ `@theme inline` już aliasuje te zmienne, każda klasa Tailwind (`bg-brand-warm-white`, `text-brand-v5-ink`, …) automatycznie odzwierciedla nową wartość bez dotykania jednego komponentu — dokładnie tak samo, jak dziś jedna zmiana w plikach tokenów v4/v5 przepływa przez cały produkt. To jedyne podejście spójne z tym, jak projekt już zarządza kolorem, i jedyne, które realistycznie pokrywa wszystkie trzy generacje tokenów (v3 + v4 + v5) w jednym zamkniętym miejscu zamiast rozproszonej pracy komponent po komponencie.
