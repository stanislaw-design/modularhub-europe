# 0057. Wieloosobowe konta producenta

**Date**: 2026-09-29
**Status**: In Progress

## Summary

Dziś jedno konto producenta (firma) ma dokładnie jednego użytkownika logującego się linkiem mailowym; nie da się dodać drugiej osoby bez podmiany jedynego adresu e mail i utraty dostępu przez pierwszą. Ta specyfikacja wprowadza nową tabelę łączącą, dzięki której jeden producent może mieć wielu użytkowników, każdy z pełnym, równym dostępem do panelu, logujący się niezależnie własnym adresem. Dodawanie i usuwanie osoby robi na razie wyłącznie administrator (skrypt albo Neon MCP), bez samoobsługowego zaproszenia w panelu producenta; to świadome zawężenie zakresu zapisane w Follow up. Bezpośredni powód: Budman House (istniejący, prawdziwy producent) potrzebuje drugiej osoby (Lejman.jakub@gmail.com) obok dzisiejszego jedynego konta.

## Context

Zobacz [rationale.md](rationale.md): pełny opis dzisiejszego modelu 1:1, rozważane warianty, oraz dlaczego kolumna `producer.user_id` znika zamiast zostać obok nowej tabeli.

## Requirements

**User stories**:
- Jako administrator ModularHub, chcę dodać drugą osobę do istniejącego konta producenta, żeby firma mogła mieć więcej niż jednego opiekuna panelu bez utraty dostępu przez dotychczasowego właściciela.
- Jako członek konta producenta, chcę logować się własnym adresem e mail i mieć pełny dostęp do panelu firmy, tak samo jak dzisiejszy jedyny użytkownik.
- Jako administrator, chcę móc usunąć osobę z konta producenta, gdy przestaje być z nim związana, bez utraty dostępu przez pozostałych członków.
- Jako administrator, chcę żeby zablokowanie producenta nadal odcinało całą firmę, niezależnie od tego ilu ma dziś zalogowanych członków.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Konto producenta (firma) może mieć więcej niż jednego powiązanego użytkownika, każdy logujący się niezależnie własnym linkiem mailowym, z pełnym, równym dostępem do panelu producenta i wszystkich akcji ograniczonych do tego producenta.
- **AC-2**: Jeden użytkownik (jeden adres e mail) należy najwyżej do jednego konta producenta naraz; próba dodania go do drugiego jest odrzucana.
- **AC-3**: Administrator może dodać do producenta osobę o podanym adresie e mail, imieniu i telefonie: jeśli e mail nie ma jeszcze konta, akcja zakłada je bezpośrednio (rola producer); jeśli ma, akcja odrzuca dodanie z czytelnym błędem, gdy istniejące konto ma inną rolę niż producer, jest już członkiem innego producenta, albo jest już członkiem tego samego producenta.
- **AC-4**: Administrator może usunąć osobę z konta producenta; usunięcie jest odrzucane, gdy dotyczy ostatniego pozostałego członka tego producenta. Udane usunięcie natychmiast kończy aktywne sesje usuniętej osoby.
- **AC-5**: Zablokowanie producenta (istniejący mechanizm spec 0055) ustawia `blockedAt` na koncie users każdego dzisiejszego członka tego producenta w jednej atomowej operacji, odcinając wszystkich naraz; odblokowanie działa symetrycznie.
- **AC-6**: Osoba z rolą `producer`, która nie jest już członkiem żadnego producenta (np. właśnie usunięta), po zalogowaniu trafia normalnie do `/producer/panel` i widzi czytelny komunikat braku przypisanej firmy zamiast błędu albo pustego wywrotu strony.
- **AC-7**: Dzisiejsza samodzielna rejestracja nowego producenta (`registerProducer` → `pending_registration` → `auth.ts` `createUser`) działa bez zmian z punktu widzenia formularza: dokładnie jeden wiersz producenta i jeden wiersz członkostwa powstają razem dla pierwszej osoby.
- **AC-8**: `getProducerIdForUser` oraz lista producentów administratora (`/internal/producers`) czytają przynależność wyłącznie przez nową tabelę członkostwa; kolumna `producer.user_id` przestaje istnieć.

## Options considered

Zobacz [rationale.md](rationale.md) (podmiana jednego adresu kontra tabela łącząca, z rolami albo bez).

## Decision

**Chosen option**: Option 2: nowa tabela łącząca `producer_member` (producent ↔ users, N:M w stronę producenta, ale najwyżej jeden producent na użytkownika), wszyscy członkowie z równymi uprawnieniami, dodawani i usuwani wyłącznie przez administratora.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`)

## Rationale

Zobacz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- `producer`: bez zmian oprócz usunięcia kolumny `user_id` (i jej unikalnego indeksu/FK do `users`).
- `producer_member` (nowa tabela):
  - `id` uuid, klucz główny, domyślnie losowy
  - `producer_id` uuid, NOT NULL, FK → `producer.id`, `ON DELETE CASCADE`, ze zwykłym (nieunikalnym) indeksem: blokada, liczenie członków i lista administratora filtrują po tej kolumnie
  - `user_id` text, NOT NULL, **UNIQUE**, FK → `users.id`, `ON DELETE CASCADE` (unikalność wymusza AC-2: co najwyżej jeden producent na użytkownika; robi to też niepotrzebnym osobny unikalny indeks złożony `(producer_id, user_id)`)
  - `added_by` text, nullable, FK → `users.id`, `ON DELETE SET NULL` (który administrator wykonał dodanie; puste dla wierszy z migracji wstecznej)
  - `created_at` timestamptz, NOT NULL, domyślnie teraz

**Key invariants**:
- Co najwyżej jeden wiersz `producer_member` na `user_id` (unikalny indeks bazy, AC-2).
- Rola `users.role = 'producer'` dla każdego dodawanego członka jest sprawdzana w kodzie akcji administracyjnej przed insertem, nie triggerem bazy (jedyna droga dodania to i tak ta akcja, spójnie z tym jak `blockProducer` dziś sprawdza rolę w kodzie, nie w bazie).
- Usunięcie ostatniego członka danego `producer_id` jest blokowane w kodzie akcji (zliczenie przed usunięciem), producent nigdy nie zostaje bez żadnego użytkownika.
- Usunięcie członka usuwa też jego aktywne wiersze `sessions` (ten sam wzorzec co `blockProducer` w `lib/producer-block-actions.ts`), więc traci dostęp natychmiast, nie dopiero po wygaśnięciu.
- Blokada/odblokowanie producenta (`lib/producer-block-actions.ts`) zmienia sygnaturę z `targetUserId` na `producerId`: wewnątrz pobiera wszystkich członków przez `producer_member` i ustawia/czyści `blockedAt` na ich `users` wierszach w jednym `db.batch` (ten sam mechanizm `db.batch`, patrz `lib/db/AGENTS.md`), plus usuwa sesje wszystkich przy blokadzie. Wywołanie z `/internal/producers` (dziś przekazujące `producer.userId`) przechodzi na `producer.id`.
- Nowa akcja administracyjna (`lib/producer-member-actions.ts`, dwie funkcje: `addProducerMember` i `removeProducerMember`) nie jest wystawiona pod żaden adres HTTP w tym etapie: wywoływana bezpośrednio ze skryptu uruchamianego przez inżyniera (ten sam poziom zaufania co dzisiejsze ręczne zasiewanie danych producenta przez Neon MCP), nie z formularza w panelu. Imię i telefon nowej osoby podaje administrator wprost (zebrane poza platformą, np. mailowo) — żadna wartość zastępcza/placeholder, bo w przeciwieństwie do historycznych importów hurtowych to jest żywe, nazwane konto bez dzisiejszej ścieżki samodzielnej edycji profilu.
- `addProducerMember` zapisuje adres e mail w małych literach (`toLowerCase()`) przed każdym insertem/porównaniem: Auth.js normalizuje adres do małych liter przy każdej próbie logowania (dostawca Resend), więc wiersz `users` zapisany z wielkimi literami nigdy by się nie dopasował przy logowaniu i `createUser` rzuciłby błąd braku oczekującej rejestracji.
- `addProducerMember` odmawia dodania członka, gdy docelowy producent ma dziś zablokowane konto (`blockedAt` ustawione na istniejących członkach) — administrator musi najpierw odblokować, inaczej nowa osoba dostałaby od razu działające logowanie do zablokowanej firmy.
- `auth.ts`'s `createUser` (gałąź `producer`) w fazie 1 wstawia `producer` (nadal z wypełnionym `user_id`, patrz Migration plan), pierwszy wiersz `producer_member` oraz przypisanie `producer.user_id` razem w jednym `db.batch`.
- Strony panelu producenta wywołujące `getProducerIdForUser` (np. strona główna panelu, spec 0032) renderują wspólny stan "brak przypisanej firmy, skontaktuj się z ModularHub" gdy funkcja zwróci `null`, zamiast zakładać, że wynik zawsze istnieje. (Sprawdzone w kodzie: `panel/page.tsx`, listy produktów/zapytań producenta oraz `requireProducerActor` już dziś obsługują `null` bez wywrotu; to zadanie to w praktyce weryfikacja i ewentualne doprecyzowanie treści komunikatu, nie budowa nowego stanu od zera.)
- `getAllProducersForAdmin` (`/internal/producers`) grupuje po `producer.id` (`GROUP BY`), zwracając jeden wiersz na producenta z listą e maili członków (`array_agg(users.email)`) zamiast jednego wiersza na członka; `blockedAt` czyta z dowolnego jednego członka (bezpieczne, bo blokada zawsze obejmuje wszystkich naraz, patrz AC-5), nie z pierwszego z brzegu bez agregacji. Liczenie (`count(*)`) i paginacja liczą producentów, nie wierszy członkostwa.

**Security model**:
- Panel producenta: bez zmian, `requirePanelProducerSession` nadal bramkuje wyłącznie po `session.user.role`, nie po istnieniu członkostwa (AC-6).
- Dodawanie/usuwanie członka: brak nowej powierzchni HTTP, więc brak nowej autoryzacji sieciowej; operator skryptu to inżynier z dostępem do repo i bazy, ten sam krąg zaufania co dzisiejsze ręczne operacje danych producenta.
- Blokada nadal ograniczona wyłącznie do kont z rolą `producer` (bez zmian względem spec 0055 AC-13), teraz rozszerzona na wszystkich członków zamiast jednego konta.
- Dane osobowe (imię, telefon, e mail) zostają w tym samym regionie Neon EU (Frankfurt), bez zmian względem `lib/db/AGENTS.md`.

**Critical test scenarios** (każdy mapuje się na kryterium w ## Requirements):
- Happy path: `addProducerMember` z nowym adresem e mail zakłada konto i członkostwo, obie osoby logują się niezależnie i widzą ten sam panel producenta, weryfikuje **AC-1**, **AC-3**.
- Failure case: `addProducerMember` z adresem będącym już członkiem innego producenta zwraca czytelny błąd i nie zmienia bazy, weryfikuje **AC-2**.
- Failure case: `removeProducerMember` na jedynym pozostałym członku jest odrzucane, weryfikuje **AC-4**.
- Auth/permission: zablokowanie producenta z trzema członkami usuwa sesje i blokuje logowanie wszystkim trzem w jednej operacji, weryfikuje **AC-5**.
- Edge case: użytkownik z rolą producer bez wiersza członkostwa loguje się i widzi komunikat braku firmy zamiast błędu 500, weryfikuje **AC-6**.

## Build plan

1. Migracja faza 1 (jedna, ręcznie wzbogacona migracja SQL, sprawdzona najpierw na osobnej gałęzi Neon per `lib/db/AGENTS.md`): dodać tabelę `producer_member` z indeksem na `producer_id`, oraz w tej samej migracji wstawić `INSERT INTO producer_member (producer_id, user_id) SELECT id, user_id FROM producer` (idempotentnie, `ON CONFLICT DO NOTHING`) — wsteczne wypełnienie jako część migracji, nie osobny skrypt uruchamiany po fakcie, żeby nie było okna, w którym producenci nie mają żadnego członkostwa, satisfies **AC-1**, **AC-2**, **AC-7**, **AC-8**
2. `lib/db/queries.ts`: `getProducerIdForUser` czyta przez `producer_member`; `getAllProducersForAdmin` czyta przez `producer_member` z `GROUP BY producer.id` i `array_agg(users.email)` (patrz Key invariants), satisfies **AC-8**
3. `auth.ts`: gałąź `producer` w `createUser` nadal wypełnia `producer.user_id` (dual write, kolumna zostaje `NOT NULL` do fazy 2) i dodatkowo wstawia pierwszy wiersz `producer_member`, razem w jednym `db.batch`, satisfies **AC-7**
4. Nowy `lib/producer-member-actions.ts`: `addProducerMember` (lowercase e maila, walidacja roli/duplikatu/innego producenta/zablokowanego producenta, zakładanie konta gdy trzeba) i `removeProducerMember` (blokada ostatniego członka, kasowanie sesji), satisfies **AC-3**, **AC-4**
5. `lib/producer-block-actions.ts`: `blockProducer`/`unblockProducer` przechodzą z `targetUserId` na `producerId`, operują na wszystkich członkach danego producenta (podzapytanie po `producer_member`) w jednym `db.batch`; zaktualizować `components/internal/ProducerBlockControl.tsx` (prop `userId` → `producerId`) i wywołanie w `app/[locale]/internal/producers/page.tsx:92`, satisfies **AC-5**
6. Zweryfikować dzisiejszą obsługę `null` z `getProducerIdForUser` w stronach panelu producenta (strona główna panelu, listy produktów/zapytań, `requireProducerActor`) — już dziś nie wywraca się, doprecyzować tylko treść komunikatu, jeśli sugeruje wyłącznie jednego użytkownika, satisfies **AC-6**
7. Zaktualizować pozostałe miejsca wstawiające `producer` z `userId` poza `auth.ts`: fixtury testowe w `lib/**/*.test.ts`/`lib/data/*.test.ts` (dodać towarzyszący wiersz `producer_member` tam, gdzie test przechodzi ścieżką aktora producenta) oraz `scripts/import-domihaus-catalog.ts:174`, satisfies **AC-7**, **AC-8**
8. Uruchomić `addProducerMember` dla `Lejman.jakub@gmail.com` na producencie Budman House (`11891027-da87-4e70-ad02-af90df3db675`), po zebraniu jego imienia i telefonu, satisfies **AC-1**, **AC-3** (bezpośredni powód tej specyfikacji)
9. Przed fazą 2: sprawdzić zapytaniem, że żaden `producer.id` nie jest bez wiersza w `producer_member` (zero osieroconych), i ponownie uruchomić wsteczne wypełnienie (idempotentne, `ON CONFLICT DO NOTHING`) dla każdego producenta założonego między fazą 1 a tym wdrożeniem, satisfies **AC-8**
10. Migracja faza 2 (osobny deploy, dopiero po potwierdzeniu, że faza 1 działa stabilnie na produkcji, i po zadaniu 9): usunąć kolumnę `producer.user_id` i jej unikalny indeks, satisfies **AC-8**

## Migration plan

**Strategy**: feature-flagged przez kolejność faz, z jawnym podwójnym zapisem (dual write) `producer.user_id` w fazie 1, bo kolumna zostaje `NOT NULL` aż do fazy 2 i `auth.ts`'s `createUser` musi dalej ją wypełniać, żeby insert nowego producenta się nie wywalił.

**Phases**:
1. Jedna migracja SQL (wzbogacona ręcznie, sprawdzona na osobnej gałęzi Neon): dodać tabelę `producer_member` z indeksem na `producer_id`, wsteczne wypełnienie (`INSERT ... SELECT ... ON CONFLICT DO NOTHING`) w tej samej migracji, żeby nie było okna bez członkostwa. Wdrożyć kod aplikacji (zadania 2 do 7 Build planu) czytający przynależność wyłącznie przez `producer_member`, ale dalej **zapisujący** `producer.user_id` przy zakładaniu nowego producenta (dual write, wyłącznie żeby spełnić `NOT NULL`; nic już go nie czyta). Przed fazą 2: zapytanie potwierdzające zero producentów bez wiersza `producer_member` (zadanie 9).
2. Po odczekaniu okresu stabilności na produkcji (bez incydentów związanych z przynależnością producenta) i po zadaniu 9, osobnym wdrożeniem usunąć kolumnę `producer.user_id` i jej unikalny indeks.

**Rollback**: Faza 1 cofa się przez rewert wdrożenia kodu; `producer.user_id` nadal istnieje, jest dalej zapisywana (dual write) i zawiera prawdziwe dane dla każdego producenta (co najmniej pierwszego/oryginalnego członka), więc powrót do starego odczytu jest możliwy bez odzyskiwania danych. Faza 2 jest trudna do cofnięcia po fakcie (kolumna już skasowana) — dlatego nie uruchamiać jej, dopóki zespół nie jest pewny, że faza 1 nie będzie cofana; przed fazą 2 zrobić snapshot/branch Neon (`create_branch` przez Neon MCP), zgodnie z konwencją `lib/db/AGENTS.md` dla ręcznie wzbogaconych migracji.

**Risks**: producent z więcej niż jednym członkiem w chwili fazy 2 nie ma już znaczenia dla samej kolumny (i tak znika, nie jest odtwarzana), ale sama nieodwracalność fazy 2 jest głównym ryzykiem, stąd wymóg odczekania, zapytania zero osieroconych (zadanie 9) i snapshotu powyżej. Dodatkowe ryzyko: pominięcie dual write w fazie 1 wywaliłoby każdą nową rejestrację producenta na `NOT NULL` — stąd to jawny wymóg, nie szczegół implementacyjny zostawiony `/develop`.

## Consequences

**Positive**:
- Budman House (i każdy przyszły podobny przypadek) dostaje drugą osobę z pełnym dostępem bez utraty dostępu przez dzisiejszego właściciela.
- Jedno źródło prawdy dla przynależności producent↔użytkownik (żadna kolumna nie może się rozjechać z tabelą łączącą, bo stara kolumna znika).
- Ogólna zdolność dla wszystkich producentów, nie tylko Budman House, bez dodatkowej pracy przy kolejnym podobnym zgłoszeniu poza samym uruchomieniem akcji.

**Negative / tradeoffs**:
- Dwufazowa migracja wymaga świadomego odczekania i osobnego wdrożenia na usunięcie starej kolumny; to więcej operacyjnej uwagi niż jednorazowa migracja.
- Brak samoobsługowego zaproszenia oznacza, że każde kolejne dodanie osoby nadal wymaga zaangażowania inżyniera ze skryptem, nie jest to samodzielna funkcja dla producenta.
- Blokada/odblokowanie producenta staje się operacją na wielu wierszach zamiast jednym `UPDATE`, nieco więcej złożoności w `lib/producer-block-actions.ts`.

**Neutral**:
- Lista producentów administratora (`/internal/producers`) pokazuje teraz listę e maili członków (`array_agg`) zamiast jednego; dokładny wygląd tej listy w UI (np. e mail główny + licznik, albo wszystkie wypisane) nie jest tu rozstrzygnięty, zostaje decyzją przy budowie (patrz Follow up) — sam kształt zapytania (jeden wiersz na producenta) jest już zdecydowany w Key invariants.
- Wywołanie `blockProducer`/`unblockProducer` z `/internal/producers` zmienia przekazywany argument z `userId` na `producerId` (`ProducerBlockControl` też), drobna zmiana miejsca wywołania bez zmiany zachowania z punktu widzenia administratora.
- Kolumna `producer.user_id` żyje przez cały czas trwania fazy 1 jako podwójnie zapisywana, ale już nieczytana wartość (patrz Migration plan); to świadomy, tymczasowy stan, nie docelowy.

## Follow-up

- [ ] Samoobsługowe zaproszenie z panelu producenta (istniejący członek zaprasza mailem, zaproszony przechodzi przez magic link) — świadomie poza zakresem tej specyfikacji, realny kolejny krok jeśli potrzeba dodawania osób stanie się częsta.
- [ ] Ekran `/internal/producers`: przyciski dodaj/usuń członka wprost w panelu administracyjnym zamiast wyłącznie skryptu — dziś świadomie pominięte.
- [ ] Rozstrzygnąć dokładny wygląd listy `/internal/producers` przy producencie z wieloma członkami (który e mail pokazać, jak zasygnalizować resztę).
- [ ] Migracja faza 2 (usunięcie `producer.user_id`) zaplanowana dopiero po potwierdzonym okresie stabilności fazy 1 na produkcji, nie w tym samym wdrożeniu.
