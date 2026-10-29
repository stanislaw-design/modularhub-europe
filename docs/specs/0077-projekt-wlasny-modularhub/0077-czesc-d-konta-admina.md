# 0077 Część D: konta administratora

## Summary

Dziś nikt w kodzie nie nadaje roli admina, robi się to ręcznie w bazie. Ta część dodaje ekran `/internal/admins`, na którym admin zaprasza nową osobę e mailem, odbiera dostęp (z ochroną, że ostatniego admina nie da się usunąć) i widzi, kto ma dostęp. Zaproszenie korzysta z istniejącego logowania linkiem magicznym. To jest funkcja 52 z zakresu produkcji.

## Requirements

**User stories**:
- Jako administrator, chcę zaprosić drugą osobę do panelu, żeby nie zależeć od jednego konta.
- Jako administrator, chcę odebrać dostęp osobie, która odeszła, bez ręcznej zmiany w bazie.
- Jako właściciel produktu, chcę mieć pewność, że nie da się przypadkiem zostać bez żadnego admina.

**Acceptance criteria**:
- **AC-34**: Ekran `/internal/admins` (rola `admin`, pozycja w menu panelu admina) pokazuje aktywnych adminów (imię, e mail, od kiedy) i otwarte zaproszenia (e mail, data wysłania, ważne do).
- **AC-35**: Formularz zaproszenia przyjmuje e mail, imię i telefon (telefon jest wymagany przez tabelę `users`, może być służbowy). Akcja `inviteAdmin` zapisuje wiersz w `pending_registration` z rolą `admin` i wysyła link logowania istniejącym nadawcą (`sendLoginLinkEmail`). Adres, który ma już konto (klient lub producent), jest odrzucany z jasnym komunikatem, bo rola jest jedna na konto i awans zepsułby jego dostęp. Zablokowany były admin też jest odrzucany przez zaproszenie: wraca wyłącznie przez `restoreAdmin` (AC-38). Adres e mail jest normalizowany (małe litery, przycięty) w zaproszeniu i we wszystkich sprawdzeniach "czy konto istnieje" (inaczej "Jan@X.pl" nigdy nie utworzyłby konta, bo logowanie porównuje adres małymi literami).
- **AC-36**: Zaproszenie jest ważne 7 dni. `createUser` w `auth.ts` odrzuca oczekujące zaproszenie admina starsze niż 7 dni. Admin może wysłać link ponownie (nowa data) lub anulować zaproszenie (usunięcie wiersza). Otwartych zaproszeń jest co najwyżej 10 (sprawdzane pod tą samą blokadą co lista adminów, AC-39). Token linku logowania Auth.js domyślnie wygasa po 24 godzinach, więc link z maila nie żyje 7 dni: po upływie tokenu zaproszony loguje się zwykłym formularzem logowania, który działa, dopóki istnieje oczekujące zaproszenie, albo admin wysyła link ponownie.
- **AC-37**: Pierwsze logowanie z linku tworzy konto z rolą `admin` (istniejąca ścieżka `createUser`, bez wierszy klienta ani producenta), a sesja pokazuje rolę `admin`. Publiczny formularz rejestracji i logowania nie potrafi utworzyć konta z rolą `admin` (lista dozwolonych ról w walidacji, test). Funkcje `registerClient` i `registerProducer` zapisują `pending_registration` z nadpisaniem roli, więc muszą nie nadpisywać wiersza z rolą `admin` (warunek `role <> 'admin'` w upsert albo cichy ogólny błąd), inaczej każdy mógłby zamienić zaproszenie admina w konto klienta, a adres nigdy nie dałoby się już zaprosić. Test to pokrywa.
- **AC-38**: Akcja `revokeAdmin` ustawia `blocked_at`, `blocked_by` (admin odbierający) i `blocked_reason` na koncie oraz usuwa jego sesje, w jednej partii `db.batch`. Rola w bazie zostaje (ślad), ale zablokowane konto nie może się zalogować ani używać panelu. Akcja `restoreAdmin` zdejmuje blokadę.
- **AC-39**: Ochrona ostatniego admina jest w jednej partii `db.batch`, która najpierw bierze `pg_advisory_xact_lock(hashtext('admin_roster'))`, potem wykonuje UPDATE z warunkiem, a potem usuwa sesje (blokada zapobiega sytuacji, w której dwaj admini jednocześnie odbierają sobie nawzajem dostęp i obaj się udają; tę samą blokadę biorą `restoreAdmin` i `inviteAdmin`): odebranie dostępu wykonuje się tylko, gdy po nim zostanie co najmniej jeden aktywny admin (rola `admin`, bez `blocked_at` i `deleted_at`). Admin może odebrać dostęp sobie tylko wtedy, gdy jest drugi aktywny admin. Przy próbie naruszenia zwracany jest czytelny komunikat, a zmiana się nie dzieje.
- **AC-40**: Zablokowany użytkownik nie może zalogować się linkiem magicznym (callback `signIn` w `auth.ts` już to robi). Sesja i bramka admina dodatkowo sprawdzają `blocked_at`, bo odebranie dostępu zostawia rolę `admin` w bazie, a samo usunięcie sesji mogłoby się nie udać. Rola jest odczytywana z bazy przy każdej sesji, więc odebranie dostępu działa od następnego żądania.
- **AC-41**: Zaproszenie, ponowne wysłanie, anulowanie, odebranie i przywrócenie mają wpis w `audit_log` z autorem. Zmiany na `users` łapie istniejący wyzwalacz audytu, a na `pending_registration` nowy wyzwalacz po INSERT, UPDATE (ponowne wysłanie) i DELETE dla roli `admin`, z wąską listą pól (bez imienia i telefonu z `payload`). Zapisy admina idą przez `withAdminActor`.
- **AC-42**: Wszystkie akcje tej części sprawdzają rolę `admin` w kodzie. Nowy admin, który jeszcze nie zalogował się linkiem, nie ma dostępu, a samo zaproszenie nie nadaje żadnych uprawnień.

## Decision

Patrz [index.md](index.md#decision).

## Feature design

**Data model sketch**: bez nowych kolumn. Wykorzystane: `pending_registration` (e mail, rola, payload z imieniem i telefonem, data), `users.role`, `users.blocked_at`, `blocked_by`, `blocked_reason`, `deleted_at`. Wyzwalacze audytu w [index.md](index.md#cross-part-contract).

**State transitions**:
- Zaproszenie: brak, potem otwarte (do 7 dni), potem zużyte (konto utworzone, wiersz usunięty przez `createUser`) albo anulowane albo wygasłe.
- Konto admina: aktywne, po `revokeAdmin` zablokowane, po `restoreAdmin` znów aktywne.

**API surface**:

| Akcja | Kto | Wejście | Wynik | Główne błędy |
|---|---|---|---|---|
| `inviteAdmin` | admin | e mail, imię, telefon | ok | adres ma konto, za dużo zaproszeń, zły e mail |
| `resendAdminInvite` | admin | e mail | ok | brak zaproszenia |
| `cancelAdminInvite` | admin | e mail | ok | brak zaproszenia |
| `revokeAdmin` | admin | userId, powód | ok | ostatni admin, konto nie jest adminem |
| `restoreAdmin` | admin | userId | ok | konto nie jest zablokowanym adminem |

**Key invariants**:
- Zawsze co najmniej jeden aktywny admin (sprawdzenie w SQL pod blokadą doradczą).
- Konto z rolą `admin` powstaje tylko z zaproszenia utworzonego przez admina (publiczna rejestracja nie zna tej roli).
- Zaproszenie starsze niż 7 dni nie tworzy konta.
- Zablokowane konto nie loguje się, a jego sesje są usunięte.

**Security model**: to jest najbardziej wrażliwa część specyfikacji, bo przyznaje pełny dostęp do danych klientów i producentów. Tylko rola `admin`, każda zmiana w audycie z autorem. Link magiczny trafia na adres z zaproszenia, więc bezpieczeństwo to bezpieczeństwo tej skrzynki. Bez dwuskładnikowego logowania (funkcja 54) przejęcie jednej skrzynki daje dostęp do panelu, dlatego zaproszenia ogranicza się do kilku osób, a funkcja 54 jest pierwszym Follow-up. Zakres RODO: dane adminów (imię, e mail, telefon) to dane osobowe pracowników, widoczne tylko dla adminów.

**Critical test scenarios**:
- Happy path: admin zaprasza, nowa osoba loguje się linkiem, ma rolę `admin` i widzi panel, verifies **AC-35**, **AC-37**.
- Wygaśnięcie: zaproszenie starsze niż 7 dni nie tworzy konta, ponowne wysłanie to naprawia, verifies **AC-36**.
- Adres z istniejącym kontem klienta lub producenta jest odrzucony, verifies **AC-35**.
- Ostatni admin: odebranie dostępu jedynemu adminowi się nie udaje, odebranie sobie przy dwóch adminach tak, verifies **AC-39**.
- Odebranie dostępu: zablokowany admin traci sesję i nie zaloguje się ponownie, przywrócenie to cofa, verifies **AC-38**, **AC-40**.
- Publiczna rejestracja z rolą `admin` w ładunku jest odrzucona, a rejestracja klienta lub producenta na adres z otwartym zaproszeniem admina nie nadpisuje roli, verifies **AC-37**.
- Wyścig: dwaj admini odbierają sobie nawzajem dostęp jednocześnie, udaje się najwyżej jedna zmiana i zostaje aktywny admin, verifies **AC-39**.
- Adres z wielkimi literami w zaproszeniu tworzy konto po zalogowaniu, verifies **AC-35**.
- Audyt: każdy krok ma wpis z autorem, verifies **AC-41**.
- Uprawnienia: klient i producent nie wejdą na ekran ani nie wywołają akcji, verifies **AC-42**.

## Build plan

1. [x] Migracja D: wyzwalacz audytu na `pending_registration` (INSERT, UPDATE, DELETE dla roli admin) i wąska lista pól w funkcji audytu (`users` ma już audyt), satisfies **AC-41**
2. [x] Sprawdzenie i ewentualna poprawka `auth.ts`: upsert w `registerClient` i `registerProducer` nie nadpisuje zaproszenia admina, sprawdzenie `blocked_at` w sesji i bramce admina, ważność zaproszenia admina (7 dni, z uwzględnieniem 24 godzin tokenu linku), niemożność zaproszenia roli `admin` z publicznych formularzy, `requestLogin` nie nadpisuje otwartego zaproszenia admina, satisfies **AC-36**, **AC-37**, **AC-40**
3. [x] Akcje `inviteAdmin`, `resendAdminInvite`, `cancelAdminInvite` (z limitem 10 otwartych), satisfies **AC-35**, **AC-36**, **AC-42**
4. [x] Akcje `revokeAdmin`, `restoreAdmin` z ochroną ostatniego admina pod blokadą doradczą w jednej partii i usuwaniem sesji, satisfies **AC-38**, **AC-39**, **AC-42**
5. [x] Ekran `/internal/admins` i pozycja w menu, satisfies **AC-34**
6. [ ] (jednostkowe i integracyjne zrobione, brak E2E) Testy jednostkowe, integracyjne (zapytanie ostatniego admina na bazie dev, wyzwalacze) i E2E (zaproszenie i pierwsze logowanie), satisfies **AC-34** do **AC-42**

## Consequences

**Positive**:
- Koniec zależności od jednego konta i od ręcznych zmian w bazie.
- Pełny ślad w audycie, kto zaprosił i kto odebrał dostęp.

**Negative / tradeoffs**:
- Więcej adminów to większa powierzchnia ataku przy logowaniu samym linkiem magicznym, dopóki nie ma dwuskładnikowego logowania.
- Rola jest jedna na konto, więc osoba, która jest też klientem lub producentem, musi użyć innego adresu e mail do konta admina.
- Odebranie dostępu przez blokadę zostawia konto w bazie (ślad), a nie je usuwa.

**Neutral**:
- Zaproszenie korzysta z istniejącej tabeli rejestracji oczekujących, bez nowej tabeli.

## Follow-up

- [ ] Funkcja 54 (dwuskładnikowe logowanie dla adminów) jako warunek zapraszania kolejnych osób poza zaufanym kręgiem.
- [ ] Funkcja 53 (log przeglądania danych klienta i producenta) po zwiększeniu liczby adminów.
- [ ] Rozważyć wiele ról na konto, jeśli pojawi się potrzeba, żeby ta sama osoba była adminem i producentem.
