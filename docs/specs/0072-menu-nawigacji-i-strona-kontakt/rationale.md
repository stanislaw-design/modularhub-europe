# 0072. Rationale: przebudowa menu nawigacji i strona Kontakt

## Context

`SiteHeader.tsx` pokazuje w wysuwanym panelu cztery płaskie linki: Projekty, Jak to działa, Zweryfikowani producenci, Dołącz jako producent B2B. Dwa ostatnie mirrorują kafelki B2B ze strony głównej (spec 0038). Na komputerze pasek nigdy nie wyświetla linków nawigacji (spec 0030), więc hamburger jest jedynym wejściem do nich na każdym ekranie.

Platforma sprzedaje dziś cztery rodziny produktów (domy, sauny, outdoor TV, kontenery, wszystkie w `FAMILY_GROUPS`), ma własną trasę dla saun (`/sauna`), zapytanie o duże zamówienie (`/project-request`) i listę zweryfikowanych producentów, a z menu da się dojść tylko do ogólnej listy wyników. Klient i producent widzą ten sam zestaw linków, więc producent dostaje zachętę do rejestracji, którą już zrobił. Zalogowany klient w panelu ma tylko Ulubione. Nie ma strony kontaktowej ani FAQ poza sekcją na stronie głównej bez kotwicy, a spec 0030 usunął „Producenci”, „Inspiracje” i „O nas”, bo nie było pod nimi stron. Nie ma też stopki, więc menu jest jedynym miejscem na takie linki.

Ograniczenia: układ nagłówka na komputerze ma zostać taki jak jest (decyzja właściciela produktu), cztery języki (pl, en, de, nl), WCAG 2.2 AA, szerokość 320 px, brak captchy i limitera zgłoszeń w repo, a `SUPPORT_REPLY_TO_EMAIL` istnieje tylko na dev. Plik `messages/*.json` jest cache'owany przez `next dev`.

## Options considered

### Option 1: Menu w grupach, rozbudowane w miejscu, plus statyczna strona Kontakt

Zostawiamy panel hamburgera, dzielimy go na grupy zależne od roli, dodajemy aktywną pozycję i stronę Kontakt z e mailem, wzorem `/privacy`.

**Pros**:
- Spełnia warunek niezmienionego układu na komputerze.
- Bez bazy i bez nowej infrastruktury, mały zakres, szybki rollback.
- Strona Kontakt nie ma powierzchni na spam.

**Cons**:
- Nawigacja nadal schowana za hamburgerem na komputerze.
- Kontakt tylko przez e mail, bez śladu w systemie.

### Option 2: Nawigacja w pasku na komputerze plus panel na mobile

Cztery główne linki w nagłówku od `md`, hamburger tylko na wąskich ekranach i na konto.

**Pros**:
- Najlepsza odkrywalność na komputerze, standard dla serwisów ofertowych.

**Cons**:
- Wprost łamie wymaganie niezmienionego układu nagłówka.
- Pasek jest już ciasny (logo, motyw, język, Ulubione, Zaloguj się, CTA), czwórka linków wymusiłaby przebudowę paska i jego testów.

### Option 3: Rozwijane menu Katalog (mega menu) w panelu

Jedna pozycja Katalog z rozwijaną listą rodzin zamiast stałej grupy.

**Pros**:
- Krótszy panel w stanie początkowym.

**Cons**:
- Ukrywa najważniejszy wybór (rodzina produktu) za dodatkowym kliknięciem.
- Więcej stanu, więcej pracy z dostępnością (rozwijana lista w oknie dialogowym), a lista ma tylko cztery pozycje.

### Option 4: Strona Kontakt z formularzem

Formularz imię, e mail, temat, wiadomość, wysyłka przez istniejący sender Resend do zespołu.

**Pros**:
- Wiadomość trafia od razu do zespołu, może wpaść też do logu zdarzeń.

**Cons**:
- Wymaga ochrony przed spamem, limitu zgłoszeń i obsługi błędów wysyłki, a repo nie ma żadnego z tych elementów.
- Zakres większy niż „minimalna strona”, o którą prosił właściciel.

## Rationale

Opcja 1 jako jedyna spełnia twardy warunek (komputer bez zmian) i jednocześnie rozwiązuje wszystkie zdiagnozowane braki: oferta niewidoczna w menu, mieszanie odbiorców, brak skrótów dla zalogowanych i brak kontaktu. Opcja 2 daje lepszą odkrywalność, ale została odrzucona wprost przez właściciela produktu, a koszt zmiany paska nie jest uzasadniony, dopóki nie ma danych, że ukryta nawigacja szkodzi (stąd punkt w Follow-up). Opcja 3 oszczędza miejsce kosztem najważniejszego wyboru, a przy czterech pozycjach oszczędność jest niewielka.

Strona Kontakt jest informacyjna, bo właściciel wybrał to wprost, a forma z formularzem otwierałaby ścieżkę spamu bez narzędzi do jej zatrzymania. Wzór `/privacy` (komponent serwerowy, `SUPPORT_REPLY_TO_EMAIL`, ukrycie bloku bez zmiennej) już istnieje i przeszedł recenzje, więc ryzyko jest minimalne. Cenę płacimy w Consequences: brak śladu w systemie i zależność od ustawienia zmiennej na produkcji.

Aktywna pozycja liczona po ścieżce i parametrze `family` jest niezależna od języka i etykiety, zgodnie z regułą z `AGENTS.md`, że logika nie może zależeć od tłumaczonego tekstu. Logika czytająca parametry adresu jest odizolowana w komponencie renderowanym po otwarciu panelu, żeby nie dotykać prerenderu każdej strony klienta (nagłówek jest na wszystkich trasach).

Przy grupie producenckiej wybraliśmy zastąpienie jej skrótami do panelu zamiast samego ukrycia, bo producent jest w tej platformie użytkownikiem codziennym, a jego panel ma osobny nagłówek, do którego i tak wraca przez „Panel producenta”.

Nazwy grup „Panel klienta” i „Panel producenta” unikają kolizji z istniejącą grupą ustawień `Konto` (motyw i język), której etykietę zostawiamy, żeby nie ruszać AC-2 i AC-4 specu 0030 bez powodu.

Ocena premisy: pytanie o „profesjonalizm” sprowadza się tu głównie do wiarygodności (kontakt, FAQ, jasna oferta), nie do wyglądu. Dlatego Kontakt jest w zakresie, a dane firmy i stopka są w Follow-up, bo bez nich wiarygodność nadal jest niepełna.
