# 0077. Projekt własny ModularHub w ModularProjects

**Date**: 2026-10-25
**Status**: In Progress

## Summary

ModularHub dostaje własny rodzaj zapytania w ModularProjects: projekt, który zakładamy my sami jako zamawiający, a nie w czyimś imieniu. Producenci widzą od początku, że pyta ModularHub, składają jedną lub kilka wycen (warianty), a my widzimy wszystkie oferty od razu, porównujemy je, wybieramy jedną i zamykamy wybór jednym neutralnym mailem do wszystkich. Do tego dochodzą trzy rzeczy, bez których to nie działa w praktyce: grupy producentów (gotowe po rodzinie i własne listy), język maili zapisany na koncie producenta oraz ekran do zakładania kolejnych kont administratora. Dokładamy to do istniejącego przetargu (spec 0070), nie budujemy drugiego.

## Structure

Spec ma cztery części. Każda wystarcza do budowy osobno, ale wspólna jest migracja bazy, konfiguracja i kolejność budowy opisane w tym pliku.

- [Część A: projekt własny, oferty z wariantami i wybór](0077-czesc-a-projekt-wlasny-i-oferty.md), wspiera decyzję, że ModularHub jest zamawiającym i sam wybiera ofertę (rdzeń, buduje się pierwszy).
- [Część B: grupy producentów](0077-czesc-b-grupy-producentow.md), wspiera decyzję o gotowych podziałach i własnych listach odbiorców zapytania.
- [Część C: język komunikacji producenta](0077-czesc-c-jezyk-producenta.md), wspiera decyzję o mailach do producentów w czterech językach.
- [Część D: konta administratora](0077-czesc-d-konta-admina.md), wspiera decyzję o zakładaniu kolejnych adminów z panelu (funkcja 52 w zakresie produkcji).

## Requirements

Kryteria akceptacji (AC-1 do AC-45) i historyjki użytkownika są w częściach. Podział numerów:

| Część | Kryteria |
|---|---|
| A: projekt własny, oferty z wariantami i wybór | AC-1 do AC-22 oraz AC-44 do AC-45 |
| B: grupy producentów | AC-23 do AC-28 |
| C: język komunikacji producenta | AC-29 do AC-33 |
| D: konta administratora | AC-34 do AC-42 |

**Granice zakresu** (poza tą specyfikacją):
- Umowa, zamówienie i rozliczenia po wyborze. ModularHub nie jest stroną umowy, wybraną ofertę przekazuje dalej poza systemem.
- Osobne maile dla zwycięzcy i pozostałych. Dziś jeden neutralny mail do wszystkich, indywidualne odpowiedzi później.
- Publiczny wpis w ModularProjects (spec 0076) dla zrealizowanego projektu własnego. Zostaje ręcznym krokiem.
- Dwuskładnikowe logowanie dla adminów (funkcja 54) i log przeglądania danych (funkcja 53). Patrz Follow-up, bo przy większej liczbie adminów rośnie ich waga.

## Decision

**Chosen option**: Option 1: projekt własny jako flaga na istniejących tabelach przetargu.

Projekt własny to wiersz `project_request` z `is_platform_owned = true`, a oferty to wiersze `project_quote` z nazwą wariantu. Wspólny silnik przetargu (termin, przypomnienia, załączniki, oferta w jednym formacie, producenci przez wyjątki `include`) zostaje, a zmieniają się tylko bramki, które zakładają zewnętrznego klienta: zgoda, B2B, publikacja podsumowania, limit trzech zapytań i próg trzech domów.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Cross part contract

**Data model (jedna fala zmian w bazie, kilka migracji w kolejności budowy)**. Numery to kolejne wolne numery po `0061` (dziś następny jest `0062`), mogą się przesunąć, jeśli inna funkcja wyprzedzi.

| Tabela | Zmiana | Pola i zasady |
|---|---|---|
| `project_request` | rozszerzenie | `is_platform_owned boolean NOT NULL DEFAULT false`. `title text` null. CHECK: `NOT is_platform_owned OR (title IS NOT NULL AND char_length(btrim(title)) BETWEEN 3 AND 120)`. CHECK liczby domów zmienia się na `unit_count >= 1 AND (is_platform_owned OR unit_count >= 3)`. CHECK zgody doradcy (`project_request_staff_consent`) dopuszcza brak notatki, gdy `is_platform_owned`. `platform_marked_quote_id uuid` null, FK do `project_quote`: tymczasowe oznaczenie admina. Kolumna `selected_quote_id` jest ustawiana dla projektu własnego dopiero przy zakończeniu wyboru, bo cały kod przetargu traktuje jej ustawienie jako "wybór dokonany, koniec ofert" (blokada ofert, przypomnienia, załączniki, lista oczekujących na B2B). |
| `project_quote` | rozszerzenie | `variant_label text` null, CHECK `variant_label IS NULL OR char_length(btrim(variant_label)) BETWEEN 1 AND 60`. Indeks unikalny `project_quote_active_per_request_producer` zastąpiony przez indeks na `(project_request_id, producer_id, COALESCE(lower(btrim(variant_label)), ''))` z tym samym warunkiem `status = 'active'`. Dla zapytań klientów etykieta jest pusta, więc zasada "jedna aktywna oferta na producenta" działa dokładnie jak dziś. Indeksy dla `bulk_product_inquiry` i indeksy ofert `accepted` bez zmian. |
| `project_quote` | wyzwalacz | BEFORE INSERT: dla projektu własnego odrzuca szóstą aktywną ofertę tego samego producenta w tym projekcie, pod `pg_advisory_xact_lock` na parze (projekt, producent), tym samym wzorcem co limit zapytań. |
| funkcja `enforce_bulk_request_email_limit` i wyzwalacze | zmiana | Wiersze `project_request` z `is_platform_owned` są pomijane przy wstawieniu (przed `pg_advisory_xact_lock`, bo wszystkie projekty własne mają ten sam e mail) i przy zliczaniu. Funkcja działa też na `bulk_product_inquiry`, który tej kolumny nie ma, więc odczyt flagi musi być bezpieczny dla obu tabel (zagnieżdżone `IF` po `TG_TABLE_NAME` albo `(to_jsonb(NEW)->>'is_platform_owned')::boolean`; samo `TG_TABLE_NAME = 'project_request' AND NEW.is_platform_owned` nie jest skracane i by się wywaliło). Prostsza alternatywa: odtworzyć wyzwalacze `project_request` z `WHEN (NOT NEW.is_platform_owned)` i dodać filtr tylko w zliczaniu. |
| `producer_group` | nowa | `id uuid`, `name text` (unikalna po `lower(btrim(name))`), `description text` null, `created_by_user_id text` FK `users`, `created_at`, `updated_at`. |
| `producer_group_member` | nowa | `group_id` FK `producer_group` ON DELETE CASCADE, `producer_id` FK `producer`, `added_at`. Klucz główny `(group_id, producer_id)`. |
| `producer` | rozszerzenie | `communication_locale text NOT NULL DEFAULT 'pl'`, CHECK `IN ('pl','en','de','nl')`. |
| audyt: `users`, `pending_registration`, `producer_group` | zmiana funkcji audytu | `users` ma już wyzwalacz audytu na każdą zmianę (migracja 0002), więc nie dodajemy drugiego (dublowałby wpisy). Dla `pending_registration` dochodzi wyzwalacz po INSERT, UPDATE (ponowne wysłanie zmienia `created_at`) i DELETE. Funkcja audytu dostaje wąską listę dozwolonych pól (jak dla `message` w migracji 0048) dla `pending_registration` (bez `payload`, który zawiera imię i telefon) i dla `producer_group` (nazwa grupy nie może być haszowana jak pole `name`). Bez zmian kolumn. |
| `project_request_producer_override` | bez zmian | Odbiorcy projektu własnego to wiersze `include`. Grupy rozwijają się do nich w chwili założenia (zdjęcie stanu). |

**Konfiguracja wspólna**:
- `PLATFORM_CONTACT_NAME`, `PLATFORM_CONTACT_EMAIL`, `PLATFORM_CONTACT_PHONE`: wspólny kontakt ModularHub widoczny dla producenta przy projekcie własnym. Muszą być ustawione na produkcji, na podglądzie i lokalnie (`.env.local`). Brak któregokolwiek blokuje założenie projektu (AC-4). Adres e mail jest normalizowany (małe litery, przycięty) tak jak każdy `contact_email` w tabeli. To osobne zmienne od `OPERATIONS_NOTIFY_EMAIL`, który jest adresem alertów zespołu, nie kontaktem dla producentów.

**Wspólne zasady**:
- Wszystkie zapisy administratora idą przez `withAdminActor` (spec 0064). Wszystkie nowe tabele i zmiany ról mają wyzwalacz audytu.
- Dla zapytań klientów nic się nie zmienia. Każda część ma test, że ścieżka klienta zachowuje się jak przed zmianą.
- Panel admina zostaje po polsku. Wszystko, co widzi producent, ma prawdziwe tłumaczenia w pl, en, de i nl (test zgodności jak w spec 0070 AC-26).

## Build plan

Podejście budowy to Tracer Bullet (z zakresu produkcji): najpierw jeden cienki, prawdziwy wątek przez wszystkie warstwy, potem pogrubianie. Wątek to: admin zakłada projekt własny z ręcznie wybranymi producentami, producent składa wariant, admin widzi i wybiera, zamyka wybór i mail wychodzi. Dopiero na tym wątku dokładamy grupy, język i konta adminów.

1. Migracja A: kolumny `is_platform_owned`, `title`, `variant_label`, nowe CHECK-i, nowy indeks ofert, wyzwalacz limitu pięciu wariantów, zmiana funkcji limitu. Test migracji na kopii dev, w tym że istniejące zapytania i oferty przechodzą nowe ograniczenia. [Część A], satisfies **AC-3**, **AC-5**, **AC-12**, **AC-13**
2. Zmienne `PLATFORM_CONTACT_*` w `.env.local`, na podglądzie i na produkcji, plus odczyt z jednej funkcji z komunikatem błędu. [Część A], satisfies **AC-3**, **AC-4**
3. Wątek A: akcja `createPlatformProject` i formularz, dopasowanie dla projektu własnego, widok producenta (kontakt, pole wariantu, lista i wycofanie wariantów), `submitProjectQuote` z wariantami, widok porównawczy, oznaczenie wybranej oferty, `finishPlatformSelection`, mail końcowy. [Część A], satisfies **AC-1** do **AC-22**, **AC-44**, **AC-45** (szczegóły zadań w części A)
4. Migracja B i część B: grupy producentów (tabele, ekran `/internal/producer-groups`, wybór grup w formularzu projektu). [Część B], satisfies **AC-23** do **AC-28**
5. Migracja C i część C: `producer.communication_locale`, pole w ustawieniach producenta i u admina, przełączenie wszystkich maili do producentów dużych zamówień na ten język. [Część C], satisfies **AC-29** do **AC-33**
6. Migracja D i część D: wyzwalacze audytu na `users` i `pending_registration`, ekran `/internal/admins`, zaproszenie, odebranie roli, ochrona ostatniego admina. [Część D], satisfies **AC-34** do **AC-42**
7. Lista kontrolna wdrożenia (do odhaczenia, nie kryterium do testu): migracje na dev, potem na produkcji ręcznym plikiem SQL z asercjami (wzorzec `drizzle/_promote_*`), ustawienie zmiennych na Vercel, założenie przynajmniej jednego nowego konta admina na produkcji po wdrożeniu części D.

## Migration plan

**Strategy**: dodawanie, bez zastępowania. Wszystkie nowe kolumny mają wartość domyślną lub są puste, więc działająca aplikacja nie zauważa migracji. Jedyna zmiana, która dotyka istniejących danych, to wymiana indeksu ofert i CHECK-a liczby domów. Wymiana indeksu: najpierw utworzyć nowy, potem usunąć stary, w jednej transakcji (plik SQL na produkcję z jawnym `BEGIN` i `COMMIT`). Zmiany CHECK są bezpieczne dla istniejących danych, bo każdy wiersz ma dziś `unit_count >= 3`.

**Phases**:
1. Migracja A na dev, test na kopii danych (istniejące oferty muszą mieścić się w nowym indeksie, bo etykieta wszędzie pusta).
2. Kod części A za konfiguracją (formularz projektu własnego dostępny tylko, gdy ustawione `PLATFORM_CONTACT_*`).
3. Migracje B, C, D osobno, każda razem ze swoim kodem.
4. Produkcja: ten sam ciąg przez plik SQL uruchamiany ręcznie, jak w spec 0070.

**Rollback**: kolumny można zostawić. Powrót do starego indeksu jest bezpieczny tylko, gdy w bazie nie ma projektów własnych z kilkoma wariantami tego samego producenta (inaczej tworzenie starego indeksu się nie uda i trzeba najpierw zamknąć lub zastąpić te oferty). Wyłączenie funkcji robi usunięcie zmiennych `PLATFORM_CONTACT_*` (formularz przestaje działać).

**Risks**: wymiana indeksu na tabeli z żywymi ofertami (krótka blokada, tabela jest mała); pominięty wiersz w funkcji limitu mógłby zepsuć zapytania klientów (stąd test, że klient nadal jest limitowany); rozjazd numerów migracji, jeśli inna funkcja wyprzedzi.

## Consequences

**Positive**:
- Jeden silnik przetargu dla zapytań klientów i własnych, bez drugiego zestawu ekranów, maili i przypomnień.
- ModularHub może prowadzić wiele własnych projektów naraz, z porównaniem wariantów od razu.
- Kolejne konta admina bez ręcznych zmian w bazie.

**Negative / tradeoffs**:
- Flaga w istniejących tabelach znaczy, że kilka miejsc musi pamiętać o rozgałęzieniu ("czy to projekt własny"): dopasowanie, kontakt na tablicy, zmiana indeksu, limit w bazie, przypisanie klienta po zalogowaniu. Każde jest w kryteriach i w testach, ale ktoś, kto doda nową ścieżkę, może to przeoczyć.
- Więcej adminów oznacza większe ryzyko przejęcia konta, a dwuskładnikowe logowanie (funkcja 54) nie jest jeszcze zrobione.
- Wymiana indeksu ofert jest zmianą w sercu przetargu klientów i wymaga starannego testu regresji.

**Neutral**:
- Mail do zespołu o nowej ofercie działa dalej (wspólny kod), z nazwą wariantu.
- Maile do producentów przechodzą z "zawsze po polsku" na język z konta (część C), co zmienia też istniejące zapytania klientów.

## Follow-up

- [ ] Dwuskładnikowe logowanie dla adminów (funkcja 54) przed zaproszeniem więcej niż jednej, dwóch osób. To jest najważniejsza luka tej specyfikacji.
- [ ] Log przeglądania danych (funkcja 53) po zwiększeniu liczby adminów.
- [ ] Osobne maile dla zwycięzcy i pozostałych, gdy będzie wiadomo, jak wygląda przekazanie dalej.
- [ ] Ewentualny automat tworzenia wpisu ModularProjects (spec 0076) z zakończonego projektu własnego.
- [ ] Ponowienie wysyłki nieudanych maili końcowych z ekranu admina i licznik "wysłano X z Y" (wymaga zapisu stanu wysyłki, którego `project_notification_log` nie niesie, bo wpis powstaje przed wysyłką). Dziś tylko Sentry.
- [ ] Ustawić zmienne `PLATFORM_CONTACT_*` na Vercel (produkcja i podgląd) przed pierwszym projektem własnym.
- [ ] Zaktualizować `app/[locale]/internal/AGENTS.md` o nowe ekrany (`/internal/producer-groups`, `/internal/admins`, widok projektu własnego) po budowie (zadanie dla `/sync`).
