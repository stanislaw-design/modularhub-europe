# 0057. Wieloosobowe konta producenta — uzasadnienie

## Context

Dzisiejszy model danych wiąże jedno konto producenta z dokładnie jednym użytkownikiem: `producer.user_id` jest `NOT NULL` i `UNIQUE`, a `users.email` jest `UNIQUE` i jedyną tożsamością, po której działa logowanie linkiem mailowym (NextAuth v5, dostawca Resend, sesje w bazie, `auth.ts`). Ten kształt powstał ze spec 0018 ("Prawdziwy model danych") i nigdy nie był kwestionowany, bo do tej pory żaden producent nie potrzebował więcej niż jednej osoby zarządzającej kontem.

Bezpośrednim impulsem jest prawdziwy producent, Budman House (`producer.id = 11891027-da87-4e70-ad02-af90df3db675`), dziś obsługiwany przez jedno konto (`piotr.lejman9@gmail.com`). Firma chce dodać drugą osobę (`Lejman.jakub@gmail.com`, dziś bez żadnego konta na platformie) do zarządzania tym samym kontem, bez utraty dostępu przez pierwszą osobę. Ponieważ dwa różne adresy e mail nie mogą dziś wskazywać na tego samego `producer.user_id` (kolumna jest unikalna), nie da się tego zrobić przez zwykły `UPDATE`.

Siły w grze: konwencja tego repo unika dwóch źródeł prawdy dla tej samej informacji (patrz `lib/db/AGENTS.md`, np. zasada jednego atomowego `UPDATE` zamiast dwóch przy fladze "dokładnie jedna prawdziwa"), więc rozwiązanie nie powinno zostawiać `producer.user_id` obok nowej tabeli jako martwej, potencjalnie rozjeżdżającej się kolumny na dłużej niż konieczne (stąd tymczasowy, jawnie nazwany dual write w fazie 1, nie stały stan). Istniejący mechanizm blokady producenta (spec 0055) zakłada dziś jedno konto na producenta (`blockedAt` na pojedynczym wierszu `users`) i musi pozostać spójny (blokada całej firmy, nie jednej osoby) po wprowadzeniu wielu użytkowników. Zakres kodu dotknięty dzisiejszym `producer.userId` jest szerszy niż tylko główna logika aplikacji: poza `lib/db/queries.ts`, `auth.ts`'s `createUser` i `lib/producer-block-actions.ts`, dotyczy też `components/internal/ProducerBlockControl.tsx`, `app/[locale]/internal/producers/page.tsx`, fixtur testowych w `lib/**/*.test.ts` i `scripts/import-domihaus-catalog.ts` — nadal lokalizowalny i policzony (przeczytany przed rozmową projektową i doprecyzowany w cross checku po napisaniu tej specyfikacji), więc migracja jest realna do przeprowadzenia bez dużego ryzyka, ale szerszy niż pierwsze wrażenie z samego kodu produkcyjnego. Projekt buduje w tym etapie metodą Tracer Bullet (jeden prawdziwy wątek przez wszystkie warstwy przed pogrubieniem), co przemawia za dostarczeniem od razu działającego dodania Jakuba do Budman House (zadanie 8 w Build planie), a nie tylko samego schematu.

Konsekwencja braku decyzji: każdy kolejny podobny wniosek (a Budman House prawdopodobnie nie jest ostatnim producentem z takim wnioskiem) byłby rozwiązywany ad hoc, każdorazowo przez podmianę jedynego adresu e mail i utratę dostępu przez poprzednią osobę — rozwiązanie, które dyskwalifikuje się samo, bo nie realizuje faktycznej potrzeby (obie osoby chcą dostępu).

## Options considered

### Option 1: Podmiana jedynego adresu e mail (bez zmiany schematu)

Zamiast dodawać drugą osobę, `UPDATE users SET email = 'Lejman.jakub@gmail.com' WHERE id = ...` na dzisiejszym koncie Budman House. Zero migracji, gotowe w kilka sekund.

**Pros**:
- Brak jakiejkolwiek zmiany schematu czy kodu, natychmiastowe.

**Cons**:
- Nie realizuje faktycznego wniosku: obie osoby (dzisiejsza i Jakub) mają zarządzać kontem, nie tylko jedna. Dzisiejszy właściciel (piotr.lejman9@gmail.com) straciłby dostęp.
- Nie skaluje się na żaden przyszły podobny wniosek; każdy kolejny wymagałby tej samej ręcznej, niszczącej operacji.

### Option 2: Tabela łącząca `producer_member`, równy dostęp, zarządzana przez administratora (wybrana)

Nowa tabela N:M między `producer` i `users` (z ograniczeniem: co najwyżej jeden producent na użytkownika), wszyscy członkowie z identycznymi uprawnieniami jak dzisiejszy jedyny użytkownik. Dodawanie/usuwanie wyłącznie przez akcję administracyjną (skrypt/Neon MCP), bez samoobsługowego UI w tym etapie.

**Pros**:
- Realizuje dokładnie wnioskowaną potrzebę (obie osoby z pełnym dostępem) i staje się ogólną, powtarzalną zdolnością platformy zamiast jednorazowej łatki.
- Jedno źródło prawdy po usunięciu `producer.user_id`; zakres zmian kodu jest szerszy niż jedno miejsce, ale dobrze zlokalizowany i policzony z góry (patrz Context), nie ukryty niespodziankami przy budowie.
- Zgodne z dzisiejszym wzorcem tego etapu produktu (ręczne, admin prowadzone operacje danych producenta, np. ręczne zasianie Budman House przy spec 0042), więc nie wprowadza nowej kategorii ryzyka operacyjnego.

**Cons**:
- Migracja dwufazowa (nowa tabela + wsteczne wypełnienie, potem dopiero usunięcie starej kolumny) wymaga więcej niż jednego wdrożenia i świadomego odczekania między fazami.
- Bez samoobsługowego UI każde kolejne dodanie osoby nadal kosztuje czas inżyniera, nie jest to funkcja, z której producent korzysta sam.

### Option 3: Tabela łącząca z rolami właściciel/członek

Jak Option 2, ale z dodatkową kolumną roli (`owner`/`member`) i regułą, że tylko właściciel zarządza członkostwem.

**Pros**:
- Ściślejsza kontrola na przyszłość, gdyby pojawiła się potrzeba różnicowania uprawnień (np. tylko właściciel widzi dane finansowe).

**Cons**:
- Dodaje kolumnę i logikę bez dzisiejszego wymagania biznesowego — nic w tym wniosku nie sugeruje, że Jakub ma mieć węższy dostęp niż dzisiejszy właściciel. Przedwczesna złożoność względem zasady tego repo "nie projektuj pod hipotetyczną przyszłą potrzebę".

## Rationale

Option 1 odpada, bo nie rozwiązuje problemu, który zgłoszono: obie osoby mają mieć dostęp, nie tylko jedna, a podmiana adresu wprost wywłaszcza dzisiejszego właściciela. Option 3 odpada na tym etapie, bo różnicowanie ról nie ma dziś żadnego uzasadnienia biznesowego (inżynier wprost potwierdził w rozmowie projektowej, że dostęp ma być równy) — dodanie kolumny roli, która nigdy nie jest odczytywana inaczej niż "wszyscy to member", byłoby złożonością bez korzyści, wbrew zasadzie tego repo, by nie budować pod hipotetyczną przyszłość.

Option 2 jest zgodna z realnym, w pełni policzonym zakresem kodu dotkniętym zmianą (patrz Context), z konwencją repo przeciw dwóm źródłom tej samej prawdy (stąd docelowe usunięcie `producer.user_id`, z jawnie ograniczonym w czasie dual write zamiast trwałej martwej kolumny), oraz z dzisiejszym etapem produktu, w którym operacje na danych producenta i tak przechodzą ręcznie przez inżyniera i Neon MCP — samoobsługowe zaproszenie byłoby nieproporcjonalnie dużym zakresem względem jednego, konkretnego wniosku, i trafia do Follow up jako naturalny kolejny krok, gdyby taka potrzeba stała się częsta.
