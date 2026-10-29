# 0078. Uzasadnienie: obniżenie kosztów funkcji serwerowych na Vercel

## Context

Platforma ModularHub Europe działa na Vercel Pro (zespół `stanautomation's projects`, projekt `modularhub-europe`). Dane rozliczeniowe z października pokazują wzrost dziennego kosztu użycia bez subskrypcji: 0,20 USD (5 paź), 0,23 (15 paź), 0,76 (22 paź), 1,85 (26 paź). Na dzień 26 października około 1,5 USD z 1,85 USD to funkcje serwerowe: Fluid Active CPU 0,46, Fast Origin Transfer 0,41, Fluid Provisioned Memory 0,41, Function Invocations 0,21. Obrazki (około 0,12), transfer danych (0,14) i build (0,06) są drugorzędne. Cron godzinowy to 24 wywołania dziennie i nie ma znaczenia.

Przyczyny znalezione w kodzie: `app/[locale]/(customer)/layout.tsx` wywołuje `await auth()` i `await cookies()`, więc cała gałąź klienta (strona główna, wyniki, strony produktów, ModularProjects) w czterech językach jest renderowana na żądanie. Sesje mają strategię `database` ([auth.ts:138](../../../auth.ts#L138)), więc `auth()` z ciasteczkiem to zapytanie do Neona. W `app/` jedyne użycia cache to `revalidate` w sitemapie i `dynamic` w cronie. Sitemapa wystawia każdy produkt w czterech językach, a liczba produktów rosła przez ostatnie importy (FrameDEV, Logbar, MKB). `proxy.ts` działa przy każdym żądaniu poza `_next`, `api` i plikami z kropką. Nie ma Bot Protection ani limitu żądań, nie ma Spend Management.

Czego nie wiemy: które trasy i które boty dominują. Zapytanie do obserwowalności Vercel nie przeszło, a logi runtime w Pro mają retencję jednej doby. Dlatego pierwszy krok planu to punkt odniesienia z panelu (AC-1), a ostatni to pomiar (AC-13). Ograniczenie: decyzja o architekturze opiera się na kodzie i na kształcie kosztów, nie na rozkładzie ruchu.

Brak decyzji oznacza dalszy wzrost kosztu razem z liczbą produktów, językami i ruchem po starcie MVP za około trzy tygodnie, bez żadnego alertu.

## Options considered

### Option 1: Cache Components z częściowym prerenderem

Włączamy `cacheComponents`. Szkielet strony jest prerenderowany i serwowany z CDN, dane publiczne są w `"use cache"` z tagami, sesja jest czytana serwerowo za `Suspense` i dochodzi w tej samej odpowiedzi.

**Pros**:
- Najlepsze doświadczenie użytkownika: natychmiastowy szkielet, brak dodatkowego żądania z przeglądarki, brak mignięcia nagłówka.
- Drobny, jawny cache z tagami i natychmiastowym unieważnianiem (`updateTag`).
- Oficjalna ścieżka Next.js 16, z przewodnikiem migracji i wdrażaniem przyrostowym.

**Cons**:
- Flaga globalna: dotyka wielu tras, także prywatnych.
- Dziura sesji nadal wywołuje funkcję przy każdym żądaniu, także bota.
- Funkcje cache nie mogą czytać sesji ani ciasteczek.

### Option 2: Poprzedni model, ISR i `unstable_cache`, sesja w przeglądarce

Layout publiczny nie czyta ciasteczek, strony są statyczne z rewalidacją, nagłówek pobiera sesję z przeglądarki.

**Pros**:
- Mniejsza zmiana w kodzie, bez flagi globalnej.
- Najtańsze wobec botów: boty zwykle nie uruchamiają JS, więc nie wywołują funkcji.

**Cons**:
- Gorsze dla człowieka: mignięcie nagłówka wylogowanego, dodatkowe żądanie sesji przy każdym wejściu.
- Przestarzała ścieżka według dokumentacji Next.js 16.3 (osobny przewodnik „previous model").
- Grubsze unieważnianie (ścieżki i tagi bez granularnych funkcji cache).

### Option 3: Tylko szybkie poprawki bez refaktoru

Firewall, alerty, robots, bez zmiany layoutu i cache.

**Pros**:
- Najszybsze i najtańsze, brak ryzyka regresji.
- Mogą obniżyć część kosztu botów.

**Cons**:
- Nie usuwa przyczyny: każde wejście człowieka nadal uruchamia funkcję i zapytania do bazy.
- Koszt dalej rośnie razem z liczbą produktów i ruchem.

## Rationale

Inżynier poprosił o wybór pod kątem użyteczności dla użytkownika i szybkości, bez patrzenia na trudność wdrożenia. Przy takim kryterium wygrywa Option 1: szkielet z CDN i sesja doładowana w tej samej odpowiedzi dają najszybsze pierwsze malowanie i brak mignięcia, czego Option 2 nie da. Pierwotna rekomendacja (Option 2) wynikała z niższej trudności i niższego kosztu wobec botów, a po zmianie kryterium nie jest już najlepsza.

Aktualizacja po krytyce (inny model) i decyzji inżyniera: dziura sesji po stronie serwera została zastąpiona ciasteczkiem wskazówką `has_session` i wyspą kliencką. Powód: dziura wznawia render przy każdym żądaniu, także bota, więc Function Invocations, Fast Origin Transfer i pamięć spadałyby słabo, a `proxy.ts` działa przed cache. Wariant ze wskazówką daje anonimom i botom w pełni statyczną stronę z CDN, a koszt ponosi tylko zalogowany (krótki szkielet przycisku konta i jedno żądanie sesji). Poniższy akapit opisuje pierwotne rozumowanie dla dziury sesji i jest zostawiony jako zapis historii decyzji.

Koszt wyboru Option 1 jest uczciwie nazwany: liczba wywołań funkcji nie spadnie do zera, bo dziura sesji działa przy każdym żądaniu. Siły z kontekstu go łagodzą. Funkcja dziury jest mała (bez zapytania do bazy, gdy brak ciasteczka, bez renderu strony), więc CPU i pamięć na wywołanie spadają mocno, a to one stanowią większość kosztu (CPU 0,46, pamięć 0,41, transfer 0,41 z 1,85). Boty ograniczają Bot Protection i limit żądań z Option 3, które są tanie i niezależne od kodu, więc robimy je od razu jako kroki 2 i 3. Pomiar w AC-13 ma wyznaczony próg (spadek wywołań o połowę), a wariant awaryjny (sesja w wyspie klienckiej, czyli Option 2 dla samego nagłówka) jest zapisany w Follow-up. To zgodne z zasadą „mierz, zanim dodasz kolejną warstwę".

Cache to zobowiązanie (co jest w cache, co go unieważnia, co gdy jest nieświeży). Odpowiedzi: w cache są tylko dane wspólne (produkty, producenci, listy), unieważniają je tagi z akcji zapisu i endpoint dla skryptów, a nieświeżość jest ograniczona do godziny. Wdrożenie przyrostowe (opt out `instant = false`, trasa po trasie) ogranicza ryzyko dużej zmiany, zgodnie z zasadą, że przebudowy produkcji robi się przyrostowo, nie jednym uderzeniem.

Obrazy zostają z optymalizacją Vercel, bo dają najlepszą jakość i szybkość na telefonach, a ich koszt (około 0,12 USD dziennie) jest mały wobec funkcji. Spend Management bez automatycznej pauzy, bo przy starcie MVP wyłączenie produkcji jest groźniejsze niż nadwyżka kilkunastu dolarów.

## Evidence: dane rozliczeniowe (USD, okna dobowe)

| Dzień | Razem | Pro (subskrypcja) | Fluid CPU | Origin Transfer | Fluid Memory | Invocations | Data Transfer | Obrazy (transformacja + zapis cache) | Build CPU |
|---|---|---|---|---|---|---|---|---|---|
| 5 paź | 0,20 | 0,00 | 0,03 | 0,01 | 0,02 | 0,00 | 0,05 | 0,03 | 0,01 |
| 15 paź | 0,23 | 0,00 | 0,04 | 0,03 | 0,04 | 0,01 | 0,04 | 0,02 | 0,01 |
| 22 paź | 0,76 | 0,00 | 0,12 | 0,12 | 0,10 | 0,03 | 0,18 | 0,06 | 0,08 |
| 26 paź | 2,50 | 0,65 | 0,46 | 0,41 | 0,41 | 0,21 | 0,14 | 0,11 | 0,06 |

Uwaga: pozycja Pro (0,65) pojawia się tylko w oknie z 26 października, więc koszt użycia w tym dniu to 1,85. Okna dobowe Vercel zaczynają się o 07:00 UTC.

Ograniczenia pomiaru: brak rozkładu po trasach i po botach (zapytanie obserwowalności nie przeszło), logi runtime tylko z ostatniej doby. Uzupełnia to krok 1 planu.
