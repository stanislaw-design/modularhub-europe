# 0036. Rationale: anglojęzyczne adresy URL i strona główna klienta bez segmentu klient

## Context

Platforma ma stać się międzynarodowa: spec 0028 dodała już prawdziwe wersje angielską i niderlandzką (silnik next intl, wykrywanie języka przeglądarki, przełącznik w nagłówku, tagi hreflang na stronie szczegółów projektu). Mimo to każdy segment adresu pod prefiksem języka zostaje po polsku: `klient`, `producent`, `wyniki`, `zapytanie`, `dzialka`, `realizacja`, `rejestracja`, `panel`, `profil`, `ulubione`, `logowanie`, `produkty`, `weryfikacja firmy`, `domykanie luk`, `gotowosc eksportowa`. Efekt: odwiedzający czytający stronę po angielsku widzi w pasku adresu `/en/klient/wyniki`, polski segment obok angielskiej treści.

Dodatkowo strona główna klienta (dzisiejszy `klient/page.tsx`, pełny układ marketingowy: hero, popularne domy, silnik zgodności, jak to działa, porównanie, producenci, wezwanie do działania, FAQ) wymaga dziś zbędnego segmentu `klient`; sam adres główny danego języka (`app/[locale]/page.tsx`) jest tylko przekierowaniem. Dla platformy, której głównym odbiorcą jest kupujący (klient), a nie producent, to dodatkowe piętro w adresie nie ma uzasadnienia.

Siły w grze:
- **SEO i hreflang.** Strona szczegółów projektu ma już tagi `alternates.languages` (spec 0028 AC8), więc jest realnie zaindeksowana lub przygotowana pod indeksację. Zmiana adresów bez przekierowań zniszczyłaby tę pracę.
- **Realny backend.** Panel producenta działa dziś na sesji i realnej bazie (spec 0032), a oferty są realne (spec 0033); producenci mogli już zapisać sobie lub udostępnić linki do dzisiejszych adresów.
- **Reguła w `AGENTS.md`.** Root `AGENTS.md` dziś jawnie zakazuje grupy tras w miejscu `klient`/`producent`, z uzasadnieniem że dwie tak samo nazwane trasy w różnych ścieżkach kolidowałyby na tym samym adresie. Ta reguła została napisana, gdy oba obszary miały własny segment; przeniesienie tylko klienta na poziom główny zmienia założenie, na którym reguła stoi.
- **Rozmiar zmiany.** Mapowanie kodu pokazało odwołania do starych segmentów w kilkuset plikach (komponenty, funkcje dostępu do danych, testy jednostkowe i end to end), więc kolejność i bezpieczeństwo wdrożenia mają realne znaczenie, nie tylko poprawność końcowego stanu.

Konsekwencja braku decyzji: platforma zostaje z angielską i niderlandzką treścią pod polskimi adresami bezterminowo, co z czasem tylko drożeje w naprawie (więcej zaindeksowanych stron, więcej zapisanych linków, więcej kodu odwołującego się do starych segmentów).

## Options considered

### Option 1: Częściowa zmiana, tylko strona główna

Wyłącznie strona główna klienta przenosi się z `/klient` na poziom główny; reszta segmentów (wyniki, zapytanie, producent i tak dalej) zostaje po polsku.

**Pros**:
- Najmniejszy możliwy diff, dotyka tylko jednej trasy i jednego układu.

**Cons**:
- Nie realizuje właściwego celu: reszta systemu adresów zostaje niespójna z treścią angielską/niderlandzką pod tymi adresami.
- Rozwiązuje dziś najłatwiejszy fragment problemu, zostawiając najbardziej pracochłonny (setki odwołań do pozostałych segmentów) na później, gdy będzie już droższy w zmianie (więcej zaindeksowanych stron, więcej realnego ruchu).

### Option 2: Stare i nowe adresy równolegle na zawsze

Dodanie nowych, angielskich tras obok starych polskich, bez przekierowań; oba zestawy adresów działają jednocześnie bezterminowo.

**Pros**:
- Zero ryzyka złamania starego linku, bo stary adres nigdy nie przestaje istnieć jako osobna strona.

**Cons**:
- Dwa równoległe systemy adresów na stałe, podwójne utrzymanie każdej przyszłej zmiany trasy.
- Wyszukiwarki widzą duplikat treści pod dwoma adresami bez jasnego kanonicznego adresu, co szkodzi SEO zamiast pomagać.
- Nie realizuje właściwego celu: platforma dalej pokazuje polskie adresy jako pełnoprawną, wieczną opcję, zamiast jednego spójnego systemu.

### Option 3: Pełny rename plus grupa tras plus trwałe przekierowania (wybrana)

Wszystkie segmenty adresów zmieniają się na angielskie; strona główna i cała ścieżka klienta przenoszą się na poziom główny przez grupę tras `(customer)`; producent i panel administracyjny zachowują własny prefiks; każdy stary adres trwale przekierowuje (308) na nowy.

**Pros**:
- Jeden spójny, ostateczny system adresów, zgodny z treścią angielską/niderlandzką pod tymi adresami.
- Przekierowania chronią już zaindeksowane strony i zapisane linki bez trzymania starego kodu jako osobnych, równoległych tras na zawsze.
- Zgodne z odpowiedziami inżyniera w rozmowie projektowej: pełny zakres (klient, producent, internal), tylko URL bez zmiany nazw folderów komponentów, trwałe przekierowania.

**Cons**:
- Największy diff z trzech opcji, dotyka kilkuset plików.
- Wymaga świadomego odejścia od dzisiejszej reguły w `AGENTS.md` o grupach tras (uzasadnione niżej w `## Rationale`, ale to realna zmiana konwencji projektu, nie tylko kodu).

## Rationale

Wybrano Option 3. Inżynier w rozmowie projektowej jednoznacznie potwierdził pełny zakres: cała ścieżka klienta na poziom główny (nie tylko strona główna), zmiana segmentów klienta, producenta i panelu administracyjnego (nie tylko klienta), wyłącznie adresy URL bez zmiany nazw folderów komponentów, oraz trwałe przekierowania zamiast czystego cięcia. To jedyna z trzech opcji, która realizuje właściwy cel: platforma ma wyglądać i działać jak jeden spójny, międzynarodowy system adresów, nie łatka na jednej stronie ani dwa równoległe systemy na zawsze.

Trwałe przekierowania (zamiast czystego cięcia) są uzasadnione konkretną siłą z Context: strona szczegółów projektu ma już tagi hreflang (spec 0028 AC8), więc jest przygotowana pod realną indeksację, a panel producenta działa na realnej sesji i bazie (spec 0032) z realnymi ofertami (spec 0033), więc mogą już istnieć zapisane lub udostępnione linki do dzisiejszych adresów. Koszt utrzymania stałej mapy przekierowań w `proxy.ts` jest mały i jednorazowy w porównaniu z ryzykiem cichej utraty ruchu lub złamanych linków.

Grupa tras `(customer)` jest bezpieczna mimo dzisiejszej reguły w `AGENTS.md`, bo powód tej reguły przestaje obowiązywać w nowym układzie: reguła zakładała, że klient i producent dzielą ten sam poziom adresu i te same nazwy tras (oba chciałyby `/panel`, `/rejestracja`, `/realizacja`), więc grupa tras (bez segmentu w adresie) groziłaby kolizją. Po tej decyzji tylko klient traci własny segment; producent i panel administracyjny zachowują swój rozróżniający prefiks (`/producer`, `/internal`), więc nic już nie dzieli poziomu adresu z bezprefiksową trasą klienta. Kolizja, przed którą reguła chroniła, nie może już wystąpić. Follow up w `index.md` zleca `/sync` aktualizację tekstu reguły, żeby nie wprowadzała w błąd przyszłych decyzji, które nie mają tego samego uzasadnienia.

Rename ograniczony do adresów URL, bez zmiany nazw folderów komponentów (`components/klient/`, `components/producent/`) ani wewnętrznych identyfikatorów, bo to właśnie adres jest tym, co widzi użytkownik i wyszukiwarka; wewnętrzna nazwa katalogu nie ma wpływu na produkt ani na cel tej decyzji (platforma ma wyglądać międzynarodowo z zewnątrz). Pełna spójność nazewnictwa w kodzie to osobna, nie podjęta tu decyzja o dużo mniejszej wadze biznesowej i dużo większym, niepotrzebnym tu ryzyku (blisko 600 plików w grze przy pełnym rebrandingu kodu, jak pokazało mapowanie repo).
