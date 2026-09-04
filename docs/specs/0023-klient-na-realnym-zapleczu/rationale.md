# 0023. Klient na realnym zapleczu — rationale

## Context

Patrz [index.md](index.md), sekcja Context, dla pełnego opisu problemu i sił w grze. W skrócie: cała ścieżka klienta stoi dziś na fixture'ach i `localStorage`, Auth.js jest wybrany (spec 0017) ale niepodłączony, pełny model danych już istnieje (spec 0018/0022) i czeka pusty, a epika Produkcja świadomie przepriorytetyzowała tę funkcję przed automatyzację strony producenta, bo klienta oglądają dziś inwestorzy.

## Options considered

### Option 1: Zbuduj cały wątek teraz, jako jeden spójny build (logowanie, dane, zapytanie)

Rejestracja i logowanie klienta i producenta, ręczne zasianie danych, przełączenie wyników na bazę z filtrem rodziny produktu, i trwały zapis zapytania z widokiem wewnętrznym — wszystko w jednym, skoordynowanym przyroście, budowane i wdrażane razem.

**Pros**:
- Zgodne wprost z podejściem Tracer Bullet tej epiki (jeden prawdziwy wątek przez wszystkie warstwy, potem pogrubianie) i z brzmieniem Done when funkcji 7 w scope.
- Inwestorzy widzą jedną, spójną, prawdziwą ścieżkę klienta, nie trzy rozłączone, w połowie zbudowane części.

**Cons**:
- Bundle'uje kilka mniejszych decyzji (metoda logowania, dostawca e mail, tymczasowe rozwiązanie na zdjęcia) w jeden spec; recenzent musi przeczytać całość, żeby ocenić którąkolwiek jej część osobno.

### Option 2: Podziel na trzy mniejsze specy (fundament logowania, przełączenie danych wyników, trwałość zapytania), budowane i wdrażane niezależnie

**Pros**:
- Każdy spec i PR zostaje mały i łatwy do niezależnej recenzji; mniejszy blast radius per wdrożenie.

**Cons**:
- Żadna z trzech części nie jest samodzielnie wartościowa dla demo inwestorskiego (logowanie bez niczego, do czego się zalogować; prawdziwe dane bez sposobu, żeby coś z nimi zrobić; trwałość zapytania bez kont, do których je przypisać).
- Wprost przeczy podejściu Tracer Bullet tej epiki, które explicite prosi o jeden prawdziwy wątek przez wszystkie warstwy przed pogrubianiem.

### Option 3: Pomiń na razie prawdziwe logowanie Auth.js; użyj lekkiej, ręcznie wydawanej sesji (np. podpisane ciasteczko), żeby szybciej odblokować przełączenie danych i trwałość zapytania, logowanie odłóż do osobnego, późniejszego spec

**Pros**:
- Najszybsza droga do prawdziwych danych na ekranie; całkowicie omija betę Auth.js na teraz.

**Cons**:
- Wyrzuca już wykonaną pracę (spec 0017 już wybrał Auth.js, a schemat pod niego już istnieje).
- Kryterium Done when scope wprost wymaga „klient zakłada konto", czego skrót w postaci ręcznej sesji nie spełnia.
- Prawdziwe logowanie i tak trzeba będzie zbudować później, tylko odroczone, nie oszczędzone.

## Rationale

Wybrano Opcję 1. Build approach tej epiki to jawnie Tracer Bullet (basis: `docs/scope/produkcja.md`, nagłówek epiki): „dowieźć jeden prawdziwy wątek przez wszystkie warstwy... zanim pogrubimy kolejne segmenty". Rozbicie na osobne specy (Opcja 2) dawałoby mniejsze, łatwiejsze do recenzji przyrosty, ale żaden z nich osobno nie posuwa scope feature 7 do jej właściwego Done when, które explicite wymaga wszystkich trzech warstw naraz (konto, dane z bazy, trwałe zapytanie) żeby scenariusz demo działał od początku do końca. Skrót przez ręczną sesję (Opcja 3) był kuszący ze względu na betę Auth.js, ale bieżące sprawdzenie (patrz niżej) potwierdza, że ta beta jest bezpieczna dla dokładnie tego zestawu (magic link, sesje w bazie, bez Edge runtime), więc unikanie jej nie ma już uzasadnienia, a Done when scope wprost nazywa "klient zakłada konto" jako wymagane, nie opcjonalne.

Mniejsze decyzje wewnątrz tego jednego builda:

- **Metoda logowania — link magiczny, bez hasła.** Hasło wymusza w Auth.js sesje JWT, co koliduje z decyzją o sesjach w bazie danych już zapisaną w spec 0017; OAuth (np. Google) to sensowna opcja na później, ale link magiczny jest najmniejszym możliwym krokiem, który już spełnia wszystkie wymagania tej funkcji.
- **Dostawca e mail — Resend.** Auth.js ma oficjalną, udokumentowaną integrację z Resend; darmowy poziom starczy na wolumen pilota; alternatywa (SMTP przez Nodemailer) wymaga własnej skrzynki i konfiguracji deliverability (SPF/DKIM), więcej pracy na start bez wyraźnej korzyści na tym etapie.
- **Zdjęcie produktu jako zwykły URL, nie plik.** Prawdziwe przechowywanie plików (Cloudflare R2) to osobna, jeszcze niezbudowana funkcja (Slice 5, funkcja 13). Nowa, nullable kolumna tekstowa na `product` to najmniejsza zmiana, która odblokuje realistycznie wyglądające demo teraz, świadomie tymczasowa (patrz Follow up w index.md).
- **Filtrowanie po rodzinie produktu na `/wyniki` teraz, nie w funkcji 8.** Zdecydowane wprost przez Ciebie podczas rozmowy projektowej, mimo że scope pierwotnie umieszcza głębsze wyszukiwanie w osobnej, przyszłej funkcji 8. Model rodziny produktu już istnieje (spec 0022), więc dodanie prostego przełącznika (zakładki, parametr URL `family`, domyślnie `dom`) tutaj jest małym rozszerzeniem, nie nowym projektem; zawęża to, co zostaje do zrobienia w funkcji 8, co jest odnotowane w Consequences.

### Bieżące sprawdzenie: stabilność Auth.js w wersji 5 (wrzesień 2026)

Spec 0017 zostawił to jako blokujące przed napisaniem kodu logowania. Szybkie sprawdzenie bieżących źródeł (dokumentacja oficjalna, GitHub) potwierdza:

- Wciąż formalnie beta (`next-auth@beta`), bez wydania 1.0/GA, ale aktywnie utrzymywany i szeroko używany produkcyjnie bez zgłoszonych poważnych problemów ze stabilnością rdzenia.
- Pełne wsparcie dla Next.js App Router, w tym Next.js 16 (wzorzec `proxy.ts` zamiast starszego `middleware.ts`).
- Adapter Drizzle (`@auth/drizzle-adapter`) w pełni wspiera sesje w bazie danych z Postgresem; to jest domyślny i udokumentowany tryb przy użyciu adaptera, dokładnie zgodny z decyzją spec 0017.
- Jedyne realne ograniczenie: Auth.js (podobnie jak adaptery bazodanowe ogólnie) nie działa na Edge runtime — musi zostać w standardowych kontekstach Node.js (komponenty serwerowe, akcje serwerowe, handler trasy), nigdy w `proxy.ts`. To jest dokładnie decyzja już podjęta w tym spec (patrz index.md, "Route protection": sprawdzenie sesji w stronie/akcji, `proxy.ts` nietknięty) — nie wymaga żadnej dodatkowej zmiany.

Wniosek: bezpiecznie kontynuować z Auth.js w wersji 5 dla dokładnie tego układu (link magiczny, sesje w bazie, bez logiki sesji na Edge), *pod warunkiem* przypięcia dokładnej wersji (`next-auth@beta` to ruchomy tag, między wydaniami beta zdarzają się zmiany łamiące) i testu dymnego pełnego logowania na żywo przed poleganiem na nim dalej (patrz Follow up w index.md). To nie jest w pełni zamknięte ryzyko ("rozstrzygnięte"), tylko świadomie zaakceptowane i zmniejszone do punktu, w którym budowanie dalej ma sens — blokujący punkt z spec 0017 przechodzi z "nierozpoznane ryzyko" na "znane, zminimalizowane ryzyko".

Źródła tego sprawdzenia są w `index.md`, sekcja References, grupa Links.

### Dodatkowa decyzja: `pending_registration` zamiast zapisu na wprost

Pierwszy szkic tego spec zakładał, że formularz rejestracji od razu zapisuje `users`+`client`/`producer`. Cross check (recenzja tego spec przez inny model) słusznie zauważył, że to pozwala każdemu zająć cudzy NIP albo e mail samym wysłaniem formularza, bez potwierdzenia, że naprawdę ma do niego dostęp — unikalność `producer.nip` i `users.email` nie chroni przed tym, chroni tylko przed dwoma potwierdzonymi kontami na ten sam NIP/e mail. Ten sam cross check zauważył też, że domyślny adapter Auth.js (`createUser`) nie ustawia `role`, więc próba zalogowania się na nieznany e mail (bez wcześniejszej rejestracji) wywaliłaby się na ograniczeniu `NOT NULL`. Rozwiązanie: dane z formularza trafiają do małej, tymczasowej tabeli `pending_registration`, a `users`+`client`/`producer` powstają dopiero przy pierwszym potwierdzonym logowaniu (patrz index.md, Key invariants i Build plan zadanie 3). Koszt: jedna dodatkowa tabela i jeden dodatkowy haczyk w przepływie logowania, zamiast prostego zapisu wprost — akceptowalny, bo usuwa realną lukę bezpieczeństwa, nie tylko teoretyczną.
